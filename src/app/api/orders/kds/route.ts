import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

/**
 * PATCH /api/orders/kds
 *
 * Actualiza el kds_status de uno o varios items de una order.
 * Replica el flujo de kds/page.tsx.
 *
 * Transiciones válidas:
 *   pending → preparing → ready → served
 *
 * Cuando todos los items de una order pasan a "ready",
 * la order se actualiza a status="ready" automáticamente.
 *
 * Cuando todos los items pasan a "served",
 * la order se actualiza a status="closed" si ya está pagada,
 * o permanece en "ready" si no.
 *
 * Body:
 * {
 *   order_id: string        // UUID de la order
 *   item_ids?: string[]     // UUIDs de items específicos (opcional — si no, aplica a todos)
 *   kds_status: "preparing" | "ready" | "served"
 * }
 *
 * GET /api/orders/kds?order_id=xxx
 * Devuelve items de la order con su kds_status actual.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_KDS_STATUSES = ["preparing", "ready", "served"] as const;
type KdsStatus = typeof VALID_KDS_STATUSES[number];

// Transiciones permitidas
const ALLOWED_TRANSITIONS: Record<string, KdsStatus[]> = {
  pending:    ["preparing"],
  preparing:  ["ready"],
  ready:      ["served"],
  served:     [], // terminal
};

export async function PATCH(req: NextRequest) {
  // 1. Auth
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const svc = createServiceClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { order_id, item_ids, kds_status } = body as Record<string, unknown>;

  // 2. Validar inputs
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

  // 3. Verificar que la order existe y pertenece al tenant
  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, total, tenant_id")
    .eq("id", order_id as string)
    .eq("tenant_id", tenantId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (["cancelled"].includes(order.status))
    return NextResponse.json({ error: "Cannot update KDS for cancelled order" }, { status: 400 });

  // 4. Obtener items a actualizar
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

  // 5. Validar transiciones
  const invalidTransitions: string[] = [];
  for (const item of items) {
    const allowed = ALLOWED_TRANSITIONS[item.kds_status] || [];
    if (!allowed.includes(kds_status as KdsStatus)) {
      invalidTransitions.push(`"${item.name}": ${item.kds_status} → ${kds_status} (not allowed)`);
    }
  }

  if (invalidTransitions.length > 0) {
    return NextResponse.json({
      error: "Invalid KDS transitions",
      invalid: invalidTransitions,
      hint: `Valid transitions: pending→preparing→ready→served`,
    }, { status: 400 });
  }

  // 6. Actualizar items
  const itemIdsToUpdate = items.map(i => i.id);
  const { error: updateErr } = await svc
    .from("order_items")
    .update({ kds_status: kds_status as string })
    .in("id", itemIdsToUpdate)
    .eq("tenant_id", tenantId);

  if (updateErr)
    return NextResponse.json({ error: "Failed to update items", details: updateErr.message }, { status: 500 });

  // 7. Verificar estado global de la order tras el update
  const { data: allItems } = await svc
    .from("order_items")
    .select("kds_status")
    .eq("order_id", order_id as string)
    .eq("tenant_id", tenantId);

  const allStatuses = (allItems || []).map(i => i.kds_status);
  const allReady    = allStatuses.every(s => ["ready", "served"].includes(s));
  const allServed   = allStatuses.every(s => s === "served");
  const anyActive   = allStatuses.some(s => s === "preparing");

  let orderStatusUpdate: string | null = null;

  if (allServed && order.status !== "closed") {
    // Verificar si ya está pagada
    const { data: pays } = await svc
      .from("payments")
      .select("amount")
      .eq("order_id", order_id as string)
      .eq("status", "completed");
    const totalPaid = (pays || []).reduce((s, p) => s + Number(p.amount), 0);

    if (totalPaid >= Number(order.total) - 0.01) {
      // Pagada y servida → cerrar
      await svc.from("orders").update({ status: "closed", served_at: new Date().toISOString() }).eq("id", order_id as string);
      orderStatusUpdate = "closed";
    } else {
      // Servida pero sin pago → marcar ready para que caja la cobre
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

  return NextResponse.json({
    updated_items:    itemIdsToUpdate.length,
    kds_status:       kds_status,
    order_id:         order_id as string,
    order_number:     order.order_number,
    order_status:     orderStatusUpdate || order.status,
    order_status_changed: !!orderStatusUpdate,
    all_items_ready:  allReady,
    all_items_served: allServed,
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

  // Verificar que la order pertenece al tenant
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

  const summary = {
    pending:    (items || []).filter(i => i.kds_status === "pending").length,
    preparing:  (items || []).filter(i => i.kds_status === "preparing").length,
    ready:      (items || []).filter(i => i.kds_status === "ready").length,
    served:     (items || []).filter(i => i.kds_status === "served").length,
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
