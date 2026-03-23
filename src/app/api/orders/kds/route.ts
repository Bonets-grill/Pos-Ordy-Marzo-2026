import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";
import { sendToAirtableAsync, getTenantName } from "@/lib/airtable/dispatcher";

/**
 * PATCH /api/orders/kds
 * Actualiza kds_status de items de una order.
 * Transiciones: pending → preparing → ready → served
 *
 * Body: { order_id, item_ids?, kds_status }
 *
 * GET /api/orders/kds?order_id=xxx
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_KDS_STATUSES = ["preparing", "ready", "served"] as const;
type KdsStatus = typeof VALID_KDS_STATUSES[number];

interface KdsItem { id: string; kds_status: string; name: string; }
interface KdsItemStatus { kds_status: string; }
interface Payment { amount: unknown; }

const ALLOWED_TRANSITIONS: Record<string, KdsStatus[]> = {
  pending:   ["preparing"],
  preparing: ["ready"],
  ready:     ["served"],
  served:    [],
};

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const svc = createServiceClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { order_id, item_ids, kds_status } = body as Record<string, unknown>;

  if (!order_id || !UUID_RE.test(order_id as string))
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });

  if (!kds_status || !VALID_KDS_STATUSES.includes(kds_status as KdsStatus))
    return NextResponse.json({ error: `Invalid kds_status. Valid: ${VALID_KDS_STATUSES.join(", ")}` }, { status: 400 });

  if (item_ids !== undefined) {
    if (!Array.isArray(item_ids) || item_ids.length === 0)
      return NextResponse.json({ error: "item_ids must be non-empty array if provided" }, { status: 400 });
    for (const id of item_ids as string[]) {
      if (!UUID_RE.test(id))
        return NextResponse.json({ error: `Invalid item_id: ${id}` }, { status: 400 });
    }
  }

  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, total, tenant_id")
    .eq("id", order_id as string)
    .eq("tenant_id", tenantId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "cancelled")
    return NextResponse.json({ error: "Cannot update KDS for cancelled order" }, { status: 400 });

  let itemQuery = svc
    .from("order_items")
    .select("id, kds_status, name")
    .eq("order_id", order_id as string)
    .eq("tenant_id", tenantId);

  if (Array.isArray(item_ids) && item_ids.length > 0) {
    itemQuery = itemQuery.in("id", item_ids as string[]);
  }

  const { data: items } = await itemQuery;
  if (!items || items.length === 0)
    return NextResponse.json({ error: "No items found" }, { status: 404 });

  const invalidTransitions: string[] = [];
  for (const item of items as KdsItem[]) {
    const allowed = ALLOWED_TRANSITIONS[item.kds_status] || [];
    if (!allowed.includes(kds_status as KdsStatus)) {
      invalidTransitions.push(`"${item.name}": ${item.kds_status} → ${kds_status} (not allowed)`);
    }
  }

  if (invalidTransitions.length > 0) {
    return NextResponse.json({
      error: "Invalid KDS transitions",
      invalid: invalidTransitions,
      hint: "Valid transitions: pending→preparing→ready→served",
    }, { status: 400 });
  }

  const itemIdsToUpdate = (items as KdsItem[]).map((i: KdsItem) => i.id);
  const { error: updateErr } = await svc
    .from("order_items")
    .update({ kds_status: kds_status as string })
    .in("id", itemIdsToUpdate)
    .eq("tenant_id", tenantId);

  if (updateErr)
    return NextResponse.json({ error: "Failed to update items", details: updateErr.message }, { status: 500 });

  const { data: allItems } = await svc
    .from("order_items")
    .select("kds_status")
    .eq("order_id", order_id as string)
    .eq("tenant_id", tenantId);

  const allStatuses: string[] = (allItems || [] as KdsItemStatus[]).map((i: KdsItemStatus) => i.kds_status ?? "");
  const allReady  = allStatuses.every((s: string) => ["ready", "served"].includes(s));
  const allServed = allStatuses.every((s: string) => s === "served");
  const anyActive = allStatuses.some((s: string) => s === "preparing");

  let orderStatusUpdate: string | null = null;

  if (allServed && order.status !== "closed") {
    const { data: pays } = await svc
      .from("payments")
      .select("amount")
      .eq("order_id", order_id as string)
      .eq("status", "completed");
    const totalPaid = (pays || [] as Payment[]).reduce((s: number, p: Payment) => s + Number(p.amount), 0);
    if (totalPaid >= Number(order.total) - 0.01) {
      await svc.from("orders").update({ status: "closed", served_at: new Date().toISOString() }).eq("id", order_id as string);
      orderStatusUpdate = "closed";
    } else {
      await svc.from("orders").update({ status: "ready" }).eq("id", order_id as string);
      orderStatusUpdate = "ready";
    }
  } else if (allReady && !allServed && order.status !== "ready") {
    await svc.from("orders").update({ status: "ready" }).eq("id", order_id as string);
    orderStatusUpdate = "ready";
  } else if (anyActive && order.status === "confirmed") {
    await svc.from("orders").update({ status: "preparing" }).eq("id", order_id as string);
    orderStatusUpdate = "preparing";
  }

  // Airtable: registrar eventos KDS (multi-tenant)
  getTenantName(tenantId).then(tenantName => {
    for (const item of items as KdsItem[]) {
      sendToAirtableAsync('kds_events', {
        'Order Number': order.order_number,
        'Item Name': item.name,
        'KDS Station': '',
        'Previous Status': item.kds_status,
        'New Status': kds_status as string,
        'Staff': '',
        'Time In Status Min': 0,
        'Tenant Name': tenantName,
        'Timestamp': new Date().toISOString(),
      })
    }
  })

  return NextResponse.json({
    updated_items:       itemIdsToUpdate.length,
    kds_status,
    order_id:            order_id as string,
    order_number:        order.order_number,
    order_status:        orderStatusUpdate || order.status,
    order_status_changed: !!orderStatusUpdate,
    all_items_ready:     allReady,
    all_items_served:    allServed,
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const svc = createServiceClient();
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId || !UUID_RE.test(orderId))
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });

  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status")
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { data: items } = await svc
    .from("order_items")
    .select("id, name, quantity, kds_status, kds_station, notes, modifiers")
    .eq("order_id", orderId)
    .eq("tenant_id", tenantId)
    .order("kds_status", { ascending: true });

  const typedItems = (items || []) as KdsItem[];
  const summary = {
    pending:   typedItems.filter((i: KdsItem) => i.kds_status === "pending").length,
    preparing: typedItems.filter((i: KdsItem) => i.kds_status === "preparing").length,
    ready:     typedItems.filter((i: KdsItem) => i.kds_status === "ready").length,
    served:    typedItems.filter((i: KdsItem) => i.kds_status === "served").length,
  };

  return NextResponse.json({
    order_id:     orderId,
    order_number: order.order_number,
    order_status: order.status,
    items:        items || [],
    summary,
    all_served:   summary.pending === 0 && summary.preparing === 0 && summary.ready === 0,
  });
}
