import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/orders/[id]/close
 *
 * Cierra una order de forma segura:
 * - Verifica que la order pertenece al tenant del usuario
 * - Verifica que el total pagado >= total de la order
 * - Libera la mesa si hay
 * - Marca todos los items como served
 *
 * Body:
 * {
 *   order_id: string (UUID)
 *   force?: boolean  // solo super_admin — cerrar aunque falte pago
 *   reason?: string  // motivo si se fuerza
 * }
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function round2(n: number) { return Math.round(n * 100) / 100; }

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user, tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const svc = createServiceClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { order_id, force = false, reason } = body as Record<string, unknown>;

  // 2. Validar inputs
  if (!order_id || !UUID_RE.test(order_id as string))
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });

  // 3. Leer order
  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, total, tenant_id, table_id, source")
    .eq("id", order_id as string)
    .eq("tenant_id", tenantId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Cannot close a cancelled order" }, { status: 400 });
  if (order.status === "closed") return NextResponse.json({ error: "Order already closed" }, { status: 400 });

  // 4. Calcular total pagado
  const { data: payments } = await svc
    .from("payments")
    .select("amount")
    .eq("order_id", order_id as string)
    .eq("status", "completed");

  const totalPaid = round2(
    (payments || []).reduce((s: number, p: {amount: unknown}) => s + Number(p.amount), 0)
  );
  const orderTotal = round2(Number(order.total));
  const deficit = round2(orderTotal - totalPaid);

  // 5. Bloquear cierre sin pago (a menos que sea force por super_admin)
  if (deficit > 0.01 && !force) {
    return NextResponse.json({
      error: "Cannot close order: unpaid balance",
      order_total: orderTotal,
      total_paid: totalPaid,
      deficit,
      hint: "Register payment first via POST /api/orders/pay, or use force=true (super_admin only)",
    }, { status: 400 });
  }

  // 6. Si force=true verificar que es super_admin
  if (force) {
    const { data: profile } = await svc
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["super_admin", "admin"].includes(profile.role as string)) {
      return NextResponse.json({ error: "force=true requires admin role" }, { status: 403 });
    }
  }

  // 7. Cerrar order
  const closePayload: Record<string, unknown> = {
    status: "closed",
    payment_status: totalPaid >= orderTotal ? "paid" : "partial",
    served_at: new Date().toISOString(),
  };
  if (force && reason) {
    closePayload.metadata = { force_close: true, reason, closed_by: user.id, closed_at: new Date().toISOString() };
  }

  const { error: closeErr } = await svc
    .from("orders")
    .update(closePayload)
    .eq("id", order_id as string)
    .eq("tenant_id", tenantId);

  if (closeErr) {
    return NextResponse.json({ error: "Failed to close order", details: closeErr.message }, { status: 500 });
  }

  // 8. Liberar mesa
  if (order.table_id) {
    await svc
      .from("restaurant_tables")
      .update({ status: "available", current_order_id: null })
      .eq("id", order.table_id);
  }

  // 9. Marcar items pendientes como served
  await svc
    .from("order_items")
    .update({ kds_status: "served" })
    .eq("order_id", order_id as string)
    .in("kds_status", ["pending", "preparing", "ready"]);

  return NextResponse.json({
    success: true,
    order_id: order_id as string,
    order_number: order.order_number,
    status: "closed",
    total_paid: totalPaid,
    order_total: orderTotal,
    deficit: Math.max(0, deficit),
    table_released: !!order.table_id,
    forced: !!force,
  });
}
