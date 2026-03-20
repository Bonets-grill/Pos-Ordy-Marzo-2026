import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/orders/[id]/pay
 *
 * Registra un pago para una order. Idempotente y seguro:
 * - Valida que la order existe y pertenece al tenant del usuario
 * - Valida que el monto cubre el total pendiente
 * - Bloquea pagos duplicados (no se puede pagar más del total)
 * - Opcionalmente cierra la order si total_paid >= total
 * - Soporta pagos parciales y mixtos (cash + card)
 *
 * Body:
 * {
 *   order_id: string (UUID)
 *   method: "cash" | "card" | "mixed"
 *   amount: number           // total a pagar (o suma de cash+card si mixed)
 *   tip_amount?: number
 *   auto_close?: boolean     // cerrar order si queda saldada (default: true)
 *   // Solo si method === "mixed":
 *   cash_amount?: number
 *   card_amount?: number
 *   idempotency_key?: string // UUID — evita doble submit
 * }
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_METHODS = new Set(["cash", "card", "mixed", "online", "voucher"]);

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

  const {
    order_id, method, amount, tip_amount = 0,
    auto_close = true, cash_amount, card_amount,
    idempotency_key,
  } = body as Record<string, unknown>;

  // 2. Validar inputs
  if (!order_id || !UUID_RE.test(order_id as string))
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });
  if (!method || !VALID_METHODS.has(method as string))
    return NextResponse.json({ error: `Invalid method. Valid: ${[...VALID_METHODS].join(", ")}` }, { status: 400 });
  if (typeof amount !== "number" || amount <= 0)
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  if (method === "mixed") {
    const c = Number(cash_amount || 0);
    const k = Number(card_amount || 0);
    if (round2(c + k) !== round2(amount as number))
      return NextResponse.json({ error: `cash_amount (${c}) + card_amount (${k}) must equal amount (${amount})` }, { status: 400 });
  }

  // 3. Idempotencia — si ya existe un pago con esta key, devolver el existente
  const safeIdemKey = typeof idempotency_key === "string" && UUID_RE.test(idempotency_key)
    ? idempotency_key : null;
  if (safeIdemKey) {
    const { data: existing } = await svc
      .from("payments")
      .select("id, amount, method, status, created_at")
      .eq("tenant_id", tenantId)
      .eq("idempotency_key", safeIdemKey)
      .limit(1)
      .single();
    if (existing) {
      return NextResponse.json({ payment: existing, idempotent: true });
    }
  }

  // 4. Leer order — verificar que existe y pertenece al tenant
  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, total, subtotal, tenant_id, table_id")
    .eq("id", order_id as string)
    .eq("tenant_id", tenantId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Cannot pay a cancelled order" }, { status: 400 });
  if (order.status === "closed") return NextResponse.json({ error: "Order already closed" }, { status: 400 });

  // 5. Calcular cuánto se ha pagado ya
  const { data: existingPayments } = await svc
    .from("payments")
    .select("amount, status")
    .eq("order_id", order_id as string)
    .eq("status", "completed");

  const alreadyPaid = round2(
    (existingPayments || []).reduce((s: number, p: {amount: unknown}) => s + Number(p.amount), 0)
  );
  const orderTotal = round2(Number(order.total));
  const pendingAmount = round2(orderTotal - alreadyPaid);

  if (pendingAmount <= 0) {
    return NextResponse.json({
      error: "Order already fully paid",
      already_paid: alreadyPaid,
      order_total: orderTotal,
    }, { status: 400 });
  }

  // 6. Validar que el monto no supera el pendiente (tolerancia de 1 céntimo)
  const payAmount = round2(amount as number);
  if (payAmount > round2(pendingAmount + 0.01)) {
    return NextResponse.json({
      error: `Amount (${payAmount}) exceeds pending balance (${pendingAmount})`,
      already_paid: alreadyPaid,
      order_total: orderTotal,
      pending: pendingAmount,
    }, { status: 400 });
  }

  // 7. Insertar payment(s)
  const tipAmt = round2(Number(tip_amount || 0));
  const insertedPayments: { id: string; method: string; amount: number }[] = [];

  if (method === "mixed") {
    const cashAmt = round2(Number(cash_amount || 0));
    const cardAmt = round2(Number(card_amount || 0));

    const { data: pay1, error: e1 } = await svc.from("payments").insert({
      tenant_id: tenantId,
      order_id: order_id as string,
      method: "cash",
      amount: cashAmt,
      tip_amount: 0,
      status: "completed",
      received_by: user.id,
      ...(safeIdemKey ? { idempotency_key: `${safeIdemKey}_cash` } : {}),
    }).select("id, method, amount").single();

    const { data: pay2, error: e2 } = await svc.from("payments").insert({
      tenant_id: tenantId,
      order_id: order_id as string,
      method: "card",
      amount: cardAmt,
      tip_amount: tipAmt,
      status: "completed",
      received_by: user.id,
      ...(safeIdemKey ? { idempotency_key: `${safeIdemKey}_card` } : {}),
    }).select("id, method, amount").single();

    if (e1 || e2 || !pay1 || !pay2) {
      return NextResponse.json({ error: "Failed to insert mixed payments", details: e1?.message || e2?.message }, { status: 500 });
    }
    insertedPayments.push(pay1, pay2);
  } else {
    const { data: pay, error: payErr } = await svc.from("payments").insert({
      tenant_id: tenantId,
      order_id: order_id as string,
      method: method as string,
      amount: payAmount,
      tip_amount: tipAmt,
      status: "completed",
      received_by: user.id,
      ...(safeIdemKey ? { idempotency_key: safeIdemKey } : {}),
    }).select("id, method, amount").single();

    if (payErr || !pay) {
      return NextResponse.json({ error: "Failed to insert payment", details: payErr?.message }, { status: 500 });
    }
    insertedPayments.push(pay);
  }

  // 8. Calcular nuevo total pagado
  const newTotalPaid = round2(alreadyPaid + payAmount);
  const fullyPaid = newTotalPaid >= round2(orderTotal - 0.01);

  // 9. Auto-close si está saldado
  let orderClosed = false;
  if (auto_close && fullyPaid) {
    const { error: closeErr } = await svc
      .from("orders")
      .update({
        status: "closed",
        payment_status: "paid",
        served_at: new Date().toISOString(),
      })
      .eq("id", order_id as string)
      .eq("tenant_id", tenantId);

    if (!closeErr) {
      orderClosed = true;
      // Liberar mesa si hay
      if (order.table_id) {
        await svc
          .from("restaurant_tables")
          .update({ status: "available", current_order_id: null })
          .eq("id", order.table_id);
      }
    }
  }

  return NextResponse.json({
    payments: insertedPayments,
    order_id: order_id as string,
    order_number: order.order_number,
    amount_paid: payAmount,
    total_paid: newTotalPaid,
    order_total: orderTotal,
    pending: round2(orderTotal - newTotalPaid),
    fully_paid: fullyPaid,
    order_closed: orderClosed,
  });
}
