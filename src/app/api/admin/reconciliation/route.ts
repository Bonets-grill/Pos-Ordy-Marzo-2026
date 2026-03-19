import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { runFullReconciliation, generateDailyFinancialSummary } from "@/lib/safety/reconciliation";

/**
 * GET /api/admin/reconciliation?tenant_id=xxx&date=2026-03-16
 * POST /api/admin/reconciliation (for cron: body { secret, tenant_id? })
 *
 * Nightly payment reconciliation job.
 * Verifies: orders.total == sum(payments.amount) for all paid orders.
 * Flags mismatches, orphan payments, and unpaid completed orders.
 * Persists results to inspection_runs.
 */

const CRON_SECRET = process.env.CRON_SECRET || process.env.DIFY_TOOLS_SECRET || "";

interface ReconciliationMismatch {
  order_id: string;
  order_number: number;
  order_total: number;
  payment_sum: number;
  difference: number;
  source: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();

  // Auth: super_admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const dateStr = searchParams.get("date"); // optional: YYYY-MM-DD
  const mode = searchParams.get("mode") || "basic"; // basic | full | summary

  if (mode === "full") {
    // Run all checks: basic mismatch + duplicate + currency + failed + overpayment + daily summary
    const [basicResult, advancedResult] = await Promise.all([
      runReconciliation(supabase, tenantId, dateStr || undefined),
      runFullReconciliation(supabase, tenantId, dateStr || undefined),
    ]);
    return NextResponse.json({
      ...basicResult,
      advanced: advancedResult,
    });
  }

  if (mode === "summary" && dateStr) {
    const summary = await generateDailyFinancialSummary(supabase, tenantId, dateStr);
    return NextResponse.json({ summary });
  }

  return NextResponse.json(await runReconciliation(supabase, tenantId, dateStr || undefined));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { secret?: string; tenant_id?: string };

  const supabase = createServiceClient();

  // Auth: either super_admin session or cron secret
  let authorized = false;
  if (body.secret && body.secret === CRON_SECRET) {
    authorized = true;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (profile?.role === "super_admin") authorized = true;
    }
  }

  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode = (body as Record<string, unknown>).mode as string || "full";

  // If no tenant specified, run for all active tenants
  if (!body.tenant_id) {
    const { data: tenants } = await supabase.from("tenants").select("id, name").eq("active", true);
    const results = [];
    for (const t of (tenants || []) as { id: string; name: string }[]) {
      const basic = await runReconciliation(supabase, t.id);
      const advanced = mode === "full" ? await runFullReconciliation(supabase, t.id) : null;
      results.push({ tenant_id: t.id, tenant_name: t.name, ...basic, advanced });
    }
    return NextResponse.json({ tenants_checked: results.length, results });
  }

  const basic = await runReconciliation(supabase, body.tenant_id);
  const advanced = mode === "full" ? await runFullReconciliation(supabase, body.tenant_id) : null;
  return NextResponse.json({ ...basic, advanced });
}

async function runReconciliation(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  dateStr?: string
) {
  const start = Date.now();

  // Build date filter
  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  if (dateStr) {
    dateFrom = `${dateStr}T00:00:00Z`;
    dateTo = `${dateStr}T23:59:59Z`;
  }

  // 1. Get all paid orders
  let ordersQuery = supabase
    .from("orders")
    .select("id, order_number, total, payment_status, source, created_at")
    .eq("tenant_id", tenantId)
    .eq("payment_status", "paid");

  if (dateFrom) ordersQuery = ordersQuery.gte("created_at", dateFrom);
  if (dateTo) ordersQuery = ordersQuery.lte("created_at", dateTo);

  const { data: orders } = await ordersQuery.order("created_at", { ascending: false }).limit(500);

  if (!orders || orders.length === 0) {
    return { status: "clean", orders_checked: 0, mismatches: [], duration_ms: Date.now() - start };
  }

  // 2. Get all payments for these orders
  const orderIds = orders.map((o: { id: string }) => o.id);
  const { data: payments } = await supabase
    .from("payments")
    .select("order_id, amount, status")
    .in("order_id", orderIds)
    .eq("status", "completed");

  // 3. Sum payments per order
  const paymentSums = new Map<string, number>();
  for (const p of (payments || []) as { order_id: string; amount: number }[]) {
    paymentSums.set(p.order_id, Math.round(((paymentSums.get(p.order_id) || 0) + p.amount) * 100) / 100);
  }

  // 4. Find mismatches
  const mismatches: ReconciliationMismatch[] = [];
  const noPaymentOrders: { order_id: string; order_number: number; total: number }[] = [];

  for (const o of orders as { id: string; order_number: number; total: number; source: string; created_at: string }[]) {
    const paidSum = paymentSums.get(o.id);

    if (paidSum === undefined) {
      noPaymentOrders.push({ order_id: o.id, order_number: o.order_number, total: o.total });
      continue;
    }

    const diff = Math.abs(paidSum - Math.round(o.total * 100) / 100);
    if (diff > 0.02) {
      mismatches.push({
        order_id: o.id,
        order_number: o.order_number,
        order_total: o.total,
        payment_sum: paidSum,
        difference: Math.round(diff * 100) / 100,
        source: o.source,
        created_at: o.created_at,
      });
    }
  }

  const isClean = mismatches.length === 0 && noPaymentOrders.length === 0;

  // 5. Persist result
  await supabase.from("inspection_runs").insert({
    tenant_id: tenantId,
    run_type: "db_scan",
    status: isClean ? "pass" : "blocked",
    scenarios_total: orders.length,
    scenarios_passed: orders.length - mismatches.length - noPaymentOrders.length,
    scenarios_failed: mismatches.length + noPaymentOrders.length,
    scenarios_warned: 0,
    blockers: [
      ...mismatches.map((m) => ({
        source: `order_${m.order_number}`,
        name: `Payment mismatch #${m.order_number}`,
        severity: "critical",
        reason: `Order total ${m.order_total}€ != Payment sum ${m.payment_sum}€ (diff: ${m.difference}€)`,
      })),
      ...noPaymentOrders.map((o) => ({
        source: `order_${o.order_number}`,
        name: `No payment #${o.order_number}`,
        severity: "critical",
        reason: `Paid order ${o.total}€ has no payment records`,
      })),
    ],
    results: [],
    summary: { type: "reconciliation", date: dateStr || "all", mismatches: mismatches.length, no_payment: noPaymentOrders.length },
    readiness_score: isClean ? 100 : Math.max(0, 100 - (mismatches.length + noPaymentOrders.length) * 10),
    completed_at: new Date().toISOString(),
    triggered_by: "reconciliation",
    environment: "production",
  });

  return {
    status: isClean ? "clean" : "mismatches_found",
    orders_checked: orders.length,
    mismatches_count: mismatches.length,
    no_payment_count: noPaymentOrders.length,
    mismatches,
    no_payment_orders: noPaymentOrders,
    total_discrepancy: Math.round(mismatches.reduce((s, m) => s + m.difference, 0) * 100) / 100,
    duration_ms: Date.now() - start,
    reconciled_at: new Date().toISOString(),
  };
}
