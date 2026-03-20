import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ORDER_TYPES = new Set(["dine_in", "takeaway", "delivery"]);
const VALID_STATUSES = new Set(["confirmed", "preparing", "ready", "closed", "cancelled"]);

interface DbMenuItem { id: string; active: boolean; available: boolean; }
interface OrderItemInput {
  menu_item_id: string; name: string; quantity: number; unit_price: number;
  modifiers?: { name: string; price_delta: number }[]; modifiers_total?: number;
  notes?: string; kds_station?: string;
}

function r2(n: number) { return Math.round(n * 100) / 100; }

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const svc = createServiceClient();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { order_type, table_id, customer_name, customer_phone, customer_notes,
    discount_amount = 0, tip_amount = 0, delivery_address,
    loyalty_customer_id, loyalty_reward_applied, items, idempotency_key } = body as Record<string, unknown>;

  if (!order_type || !VALID_ORDER_TYPES.has(order_type as string))
    return NextResponse.json({ error: `Invalid order_type. Valid: ${[...VALID_ORDER_TYPES].join(", ")}` }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "items required and must be non-empty array" }, { status: 400 });
  if (items.length > 100)
    return NextResponse.json({ error: "Too many items (max 100)" }, { status: 400 });

  for (const item of items as Record<string, unknown>[]) {
    if (!item.menu_item_id || !UUID_RE.test(item.menu_item_id as string))
      return NextResponse.json({ error: `Invalid menu_item_id: ${item.menu_item_id}` }, { status: 400 });
    if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 100)
      return NextResponse.json({ error: "quantity must be between 1-100" }, { status: 400 });
    if (typeof item.unit_price !== "number" || item.unit_price < 0)
      return NextResponse.json({ error: "unit_price must be >= 0" }, { status: 400 });
    if (!item.name || typeof item.name !== "string")
      return NextResponse.json({ error: "item name required" }, { status: 400 });
  }

  if (table_id && !UUID_RE.test(table_id as string))
    return NextResponse.json({ error: "Invalid table_id" }, { status: 400 });

  const safeIdemKey = typeof idempotency_key === "string" && UUID_RE.test(idempotency_key) ? idempotency_key : null;
  if (safeIdemKey) {
    const { data: existing } = await svc.from("orders").select("id, order_number, status, total")
      .eq("tenant_id", tenantId).eq("idempotency_key", safeIdemKey).single();
    if (existing) return NextResponse.json({ order_id: existing.id, order_number: existing.order_number, status: existing.status, total: existing.total, idempotent: true });
  }

  const menuItemIds = [...new Set((items as OrderItemInput[]).map((i: OrderItemInput) => i.menu_item_id))];
  const { data: dbItems } = await svc.from("menu_items").select("id, active, available")
    .in("id", menuItemIds).eq("tenant_id", tenantId);

  const dbItemMap = new Map<string, DbMenuItem>((dbItems || []).map((i: DbMenuItem) => [i.id, i]));
  for (const id of menuItemIds) {
    if (!dbItemMap.has(id)) return NextResponse.json({ error: `Menu item not found: ${id}` }, { status: 400 });
    if (!dbItemMap.get(id)!.active) return NextResponse.json({ error: `Menu item is inactive: ${id}` }, { status: 400 });
  }

  if (table_id) {
    const { data: table } = await svc.from("restaurant_tables").select("id").eq("id", table_id as string).eq("tenant_id", tenantId).single();
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 400 });
  }

  const validatedItems = (items as OrderItemInput[]).map((item: OrderItemInput) => {
    const unitPrice = r2(Number(item.unit_price));
    const modTotal  = r2(Number(item.modifiers_total || 0));
    const qty       = Number(item.quantity);
    return {
      menu_item_id: item.menu_item_id, name: String(item.name), quantity: qty,
      unit_price: unitPrice, modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
      modifiers_total: modTotal, subtotal: r2((unitPrice + modTotal) * qty),
      notes: item.notes ? String(item.notes).slice(0, 300) : null,
      kds_station: item.kds_station ? String(item.kds_station) : null,
    };
  });

  const subtotal    = r2(validatedItems.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0));
  const discountAmt = r2(Number(discount_amount || 0));
  const tipAmt      = r2(Number(tip_amount || 0));

  const { data: tenant } = await svc.from("tenants").select("tax_rate, tax_included").eq("id", tenantId).single();
  const taxRate = (tenant as { tax_rate: number; tax_included: boolean } | null)?.tax_rate || 0;
  const taxIncl = (tenant as { tax_rate: number; tax_included: boolean } | null)?.tax_included || false;
  const taxAmt  = taxIncl ? 0 : r2((subtotal - discountAmt) * taxRate / 100);
  const total   = r2(subtotal - discountAmt + taxAmt + tipAmt);

  if (total < 0) return NextResponse.json({ error: "Total cannot be negative" }, { status: 400 });

  const source = (order_type as string) === "delivery" ? "delivery" : (order_type as string) === "takeaway" ? "takeaway" : "pos";

  const { data: order, error: orderErr } = await svc.from("orders").insert({
    tenant_id: tenantId, table_id: (table_id as string) || null,
    order_type: order_type as string,
    customer_name: customer_name ? String(customer_name).slice(0, 100) : null,
    customer_phone: customer_phone ? String(customer_phone).slice(0, 30) : null,
    customer_notes: customer_notes ? String(customer_notes).slice(0, 500) : null,
    loyalty_customer_id: loyalty_customer_id || null,
    loyalty_reward_applied: loyalty_reward_applied || null,
    subtotal, tax_amount: taxAmt, discount_amount: discountAmt, tip_amount: tipAmt, total,
    status: "confirmed", source, received_by: user.id,
    idempotency_key: safeIdemKey || null, confirmed_at: new Date().toISOString(),
    metadata: delivery_address ? { delivery_address: String(delivery_address).slice(0, 300) } : null,
  }).select("id, order_number").single();

  if (orderErr || !order)
    return NextResponse.json({ error: "Failed to create order", details: orderErr?.message }, { status: 500 });

  const orderItems = validatedItems.map((item: typeof validatedItems[number]) => ({
    order_id: order.id, tenant_id: tenantId, menu_item_id: item.menu_item_id,
    name: item.name, quantity: item.quantity, unit_price: item.unit_price,
    modifiers: item.modifiers, modifiers_total: item.modifiers_total,
    subtotal: item.subtotal, notes: item.notes, kds_station: item.kds_station, kds_status: "pending",
  }));

  const { error: itemsErr } = await svc.from("order_items").insert(orderItems);
  if (itemsErr) console.error("[POST /api/orders] items error:", itemsErr.message);

  if (order_type === "dine_in" && table_id) {
    await svc.from("restaurant_tables").update({ status: "occupied", current_order_id: order.id })
      .eq("id", table_id as string).eq("tenant_id", tenantId);
  }

  return NextResponse.json({
    order_id: order.id, order_number: order.order_number, status: "confirmed",
    subtotal, tax_amount: taxAmt, discount_amount: discountAmt, tip_amount: tipAmt, total,
    items_count: orderItems.length, source, table_occupied: order_type === "dine_in" && !!table_id,
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const svc = createServiceClient();
  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const limit   = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const source  = searchParams.get("source");
  const orderId = searchParams.get("id");

  if (orderId) {
    if (!UUID_RE.test(orderId)) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    const { data: order } = await svc.from("orders").select("*, order_items(*)").eq("id", orderId).eq("tenant_id", tenantId).single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  }

  let query = svc.from("orders")
    .select("id, order_number, status, total, source, order_type, customer_name, confirmed_at, table_id")
    .eq("tenant_id", tenantId).order("confirmed_at", { ascending: false }).limit(limit);

  if (status && VALID_STATUSES.has(status)) query = query.eq("status", status);
  if (source) query = query.eq("source", source);

  const { data: orders, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: orders || [], count: orders?.length || 0 });
}
