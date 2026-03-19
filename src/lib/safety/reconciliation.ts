/**
 * Payment Reconciliation Engine
 *
 * Enterprise-grade financial integrity checks.
 * Each function performs a specific anomaly detection scan
 * and returns structured results for the inspection system.
 *
 * Checks:
 *   1. Duplicate payments — same order, same amount, same method within 60s
 *   2. Currency mismatch — tenant currency vs payment metadata
 *   3. Daily financial summary — cash/card/tips/refunds breakdown
 *   4. Failed payment anomalies — orders with only failed payments
 *   5. Overpayment detection — payment sum exceeds order total
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────

export type AnomalySeverity = "critical" | "high" | "medium" | "low";

export interface ReconciliationAnomaly {
  check: string;
  severity: AnomalySeverity;
  order_id?: string;
  order_number?: number;
  description: string;
  expected?: string;
  actual?: string;
  amount?: number;
}

export interface DailyFinancialSummary {
  date: string;
  tenant_id: string;
  orders_total: number;
  orders_paid: number;
  orders_unpaid: number;
  orders_cancelled: number;
  orders_refunded: number;
  revenue_gross: number;
  revenue_net: number;       // gross - refunds
  cash_total: number;
  card_total: number;
  other_total: number;
  tips_total: number;
  refunds_total: number;
  average_ticket: number;
  payment_count: number;
}

export interface ReconciliationReport {
  tenant_id: string;
  date_range: { from: string; to: string } | null;
  checks_run: number;
  anomalies: ReconciliationAnomaly[];
  summary: DailyFinancialSummary | null;
  is_clean: boolean;
  critical_count: number;
  high_count: number;
  duration_ms: number;
  reconciled_at: string;
}

// ─── 1. Duplicate Payment Detection ────────────────────

/**
 * Detect duplicate payments: same order_id, same amount, same method,
 * created within 60 seconds of each other.
 */
export async function detectDuplicatePayments(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ReconciliationAnomaly[]> {
  let query = supabase
    .from("payments")
    .select("id, order_id, amount, method, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("order_id")
    .order("created_at");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: payments } = await query.limit(1000);
  if (!payments?.length) return [];

  const anomalies: ReconciliationAnomaly[] = [];

  // Group by order_id
  const byOrder = new Map<string, typeof payments>();
  for (const p of payments as any[]) {
    if (!byOrder.has(p.order_id)) byOrder.set(p.order_id, []);
    byOrder.get(p.order_id)!.push(p);
  }

  for (const [orderId, orderPayments] of byOrder) {
    if (orderPayments.length < 2) continue;

    // Check for duplicates: same amount + same method + within 60s
    for (let i = 0; i < orderPayments.length; i++) {
      for (let j = i + 1; j < orderPayments.length; j++) {
        const a = orderPayments[i];
        const b = orderPayments[j];
        if (a.amount === b.amount && a.method === b.method) {
          const timeDiff = Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          if (timeDiff < 60_000) { // within 60 seconds
            anomalies.push({
              check: "duplicate_payment",
              severity: "critical",
              order_id: orderId,
              description: `Duplicate ${a.method} payment of ${a.amount}€ on same order within ${Math.round(timeDiff / 1000)}s`,
              expected: "1 payment",
              actual: `2 payments (${a.id.substring(0, 8)}, ${b.id.substring(0, 8)})`,
              amount: a.amount,
            });
          }
        }
      }
    }
  }

  return anomalies;
}

// ─── 2. Currency Mismatch Detection ────────────────────

/**
 * Detect orders where the tenant's configured currency doesn't match
 * payment metadata currency (if present).
 * Also flags orders with suspicious totals (negative, zero on paid).
 */
export async function detectCurrencyAnomalies(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ReconciliationAnomaly[]> {
  // Get tenant currency
  const { data: tenant } = await supabase
    .from("tenants")
    .select("currency")
    .eq("id", tenantId)
    .single();

  const tenantCurrency = (tenant?.currency || "EUR").toUpperCase();

  let query = supabase
    .from("orders")
    .select("id, order_number, total, payment_status, metadata")
    .eq("tenant_id", tenantId)
    .eq("payment_status", "paid");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: orders } = await query.limit(500);
  if (!orders?.length) return [];

  const anomalies: ReconciliationAnomaly[] = [];

  for (const o of orders as any[]) {
    // Check for zero or negative totals on paid orders
    if (o.total <= 0) {
      anomalies.push({
        check: "zero_total_paid",
        severity: "high",
        order_id: o.id,
        order_number: o.order_number,
        description: `Paid order #${o.order_number} has total ${o.total}€`,
        expected: "> 0",
        actual: String(o.total),
        amount: o.total,
      });
    }

    // Check metadata for currency mismatch (Stripe payments store currency)
    const meta = (o.metadata || {}) as Record<string, unknown>;
    if (meta.currency && String(meta.currency).toUpperCase() !== tenantCurrency) {
      anomalies.push({
        check: "currency_mismatch",
        severity: "critical",
        order_id: o.id,
        order_number: o.order_number,
        description: `Order #${o.order_number} has currency ${meta.currency} but tenant uses ${tenantCurrency}`,
        expected: tenantCurrency,
        actual: String(meta.currency),
      });
    }
  }

  return anomalies;
}

// ─── 3. Daily Financial Summary ────────────────────────

/**
 * Generate a comprehensive daily financial summary.
 */
export async function generateDailyFinancialSummary(
  supabase: SupabaseClient,
  tenantId: string,
  date: string  // YYYY-MM-DD
): Promise<DailyFinancialSummary> {
  const dateFrom = `${date}T00:00:00Z`;
  const dateTo = `${date}T23:59:59Z`;

  // Orders for the day
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, payment_status")
    .eq("tenant_id", tenantId)
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  const allOrders = (orders || []) as { id: string; total: number; status: string; payment_status: string }[];

  // Payments for the day
  const { data: payments } = await supabase
    .from("payments")
    .select("id, order_id, amount, method, tip_amount, status")
    .eq("tenant_id", tenantId)
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  const allPayments = (payments || []) as { id: string; order_id: string; amount: number; method: string; tip_amount: number; status: string }[];

  const completedPayments = allPayments.filter((p) => p.status === "completed");
  const refundedPayments = allPayments.filter((p) => p.status === "refunded");

  const cashTotal = completedPayments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const cardTotal = completedPayments.filter((p) => p.method === "card" || p.method === "stripe").reduce((s, p) => s + p.amount, 0);
  const otherTotal = completedPayments.filter((p) => !["cash", "card", "stripe"].includes(p.method)).reduce((s, p) => s + p.amount, 0);
  const tipsTotal = completedPayments.reduce((s, p) => s + (p.tip_amount || 0), 0);
  const refundsTotal = refundedPayments.reduce((s, p) => s + Math.abs(p.amount), 0);

  const revenueGross = Math.round((cashTotal + cardTotal + otherTotal) * 100) / 100;
  const revenueNet = Math.round((revenueGross - refundsTotal) * 100) / 100;
  const paidOrders = allOrders.filter((o) => o.payment_status === "paid");

  return {
    date,
    tenant_id: tenantId,
    orders_total: allOrders.length,
    orders_paid: paidOrders.length,
    orders_unpaid: allOrders.filter((o) => o.payment_status === "pending" && !["cancelled", "refunded"].includes(o.status)).length,
    orders_cancelled: allOrders.filter((o) => o.status === "cancelled").length,
    orders_refunded: allOrders.filter((o) => o.status === "refunded").length,
    revenue_gross: revenueGross,
    revenue_net: revenueNet,
    cash_total: Math.round(cashTotal * 100) / 100,
    card_total: Math.round(cardTotal * 100) / 100,
    other_total: Math.round(otherTotal * 100) / 100,
    tips_total: Math.round(tipsTotal * 100) / 100,
    refunds_total: Math.round(refundsTotal * 100) / 100,
    average_ticket: paidOrders.length > 0 ? Math.round((revenueGross / paidOrders.length) * 100) / 100 : 0,
    payment_count: completedPayments.length,
  };
}

// ─── 4. Failed Payment Anomalies ───────────────────────

/**
 * Detect orders that have ONLY failed payments — never successfully paid
 * but might still be in an active status (not cancelled).
 */
export async function detectFailedPaymentAnomalies(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ReconciliationAnomaly[]> {
  // Find orders with at least one failed payment
  let payQuery = supabase
    .from("payments")
    .select("order_id, status")
    .eq("tenant_id", tenantId)
    .eq("status", "failed");

  if (dateFrom) payQuery = payQuery.gte("created_at", dateFrom);
  if (dateTo) payQuery = payQuery.lte("created_at", dateTo);

  const { data: failedPayments } = await payQuery.limit(200);
  if (!failedPayments?.length) return [];

  const failedOrderIds = [...new Set((failedPayments as any[]).map((p) => p.order_id))];

  // Check if these orders have any completed payments
  const { data: completedPayments } = await supabase
    .from("payments")
    .select("order_id")
    .in("order_id", failedOrderIds)
    .eq("status", "completed");

  const ordersWithSuccess = new Set((completedPayments || []).map((p: any) => p.order_id));

  // Orders with ONLY failed payments (no completed)
  const onlyFailedOrderIds = failedOrderIds.filter((id) => !ordersWithSuccess.has(id));
  if (onlyFailedOrderIds.length === 0) return [];

  // Get order details
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total, status, payment_status")
    .in("id", onlyFailedOrderIds)
    .not("status", "in", '("cancelled","refunded")');

  const anomalies: ReconciliationAnomaly[] = [];
  for (const o of (orders || []) as any[]) {
    anomalies.push({
      check: "failed_payment_only",
      severity: "high",
      order_id: o.id,
      order_number: o.order_number,
      description: `Order #${o.order_number} (${o.status}) has only failed payments — never successfully paid`,
      expected: "at least 1 completed payment",
      actual: `0 completed, status=${o.status}, payment_status=${o.payment_status}`,
      amount: o.total,
    });
  }

  return anomalies;
}

// ─── 5. Overpayment Detection ──────────────────────────

/**
 * Detect orders where payment sum significantly exceeds order total.
 * Tolerance: 0.50€ (for rounding and tip differences).
 */
export async function detectOverpayments(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ReconciliationAnomaly[]> {
  let query = supabase
    .from("orders")
    .select("id, order_number, total, payment_status")
    .eq("tenant_id", tenantId)
    .eq("payment_status", "paid");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: orders } = await query.limit(500);
  if (!orders?.length) return [];

  const orderIds = (orders as any[]).map((o) => o.id);
  const { data: payments } = await supabase
    .from("payments")
    .select("order_id, amount")
    .in("order_id", orderIds)
    .eq("status", "completed");

  const sums = new Map<string, number>();
  for (const p of (payments || []) as any[]) {
    sums.set(p.order_id, Math.round(((sums.get(p.order_id) || 0) + p.amount) * 100) / 100);
  }

  const anomalies: ReconciliationAnomaly[] = [];
  for (const o of orders as any[]) {
    const paid = sums.get(o.id) || 0;
    const overpay = Math.round((paid - o.total) * 100) / 100;
    if (overpay > 0.50) {
      anomalies.push({
        check: "overpayment",
        severity: "medium",
        order_id: o.id,
        order_number: o.order_number,
        description: `Order #${o.order_number} overpaid by ${overpay}€ (total: ${o.total}€, paid: ${paid}€)`,
        expected: String(o.total),
        actual: String(paid),
        amount: overpay,
      });
    }
  }

  return anomalies;
}

// ─── Full Reconciliation Runner ────────────────────────

/**
 * Run all reconciliation checks and return a comprehensive report.
 */
export async function runFullReconciliation(
  supabase: SupabaseClient,
  tenantId: string,
  dateStr?: string
): Promise<ReconciliationReport> {
  const start = Date.now();
  const dateFrom = dateStr ? `${dateStr}T00:00:00Z` : undefined;
  const dateTo = dateStr ? `${dateStr}T23:59:59Z` : undefined;

  // Run all checks in parallel
  const [duplicates, currency, failed, overpayments] = await Promise.all([
    detectDuplicatePayments(supabase, tenantId, dateFrom, dateTo),
    detectCurrencyAnomalies(supabase, tenantId, dateFrom, dateTo),
    detectFailedPaymentAnomalies(supabase, tenantId, dateFrom, dateTo),
    detectOverpayments(supabase, tenantId, dateFrom, dateTo),
  ]);

  const allAnomalies = [...duplicates, ...currency, ...failed, ...overpayments];

  // Generate daily summary if date provided
  let summary: DailyFinancialSummary | null = null;
  if (dateStr) {
    summary = await generateDailyFinancialSummary(supabase, tenantId, dateStr);
  }

  const criticalCount = allAnomalies.filter((a) => a.severity === "critical").length;
  const highCount = allAnomalies.filter((a) => a.severity === "high").length;

  return {
    tenant_id: tenantId,
    date_range: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null,
    checks_run: 4,
    anomalies: allAnomalies,
    summary,
    is_clean: allAnomalies.length === 0,
    critical_count: criticalCount,
    high_count: highCount,
    duration_ms: Date.now() - start,
    reconciled_at: new Date().toISOString(),
  };
}
