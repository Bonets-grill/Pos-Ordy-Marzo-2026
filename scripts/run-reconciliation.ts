/**
 * Run full reconciliation from CLI.
 * Usage: npx tsx scripts/run-reconciliation.ts [tenant_id] [date]
 */
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SRK) { console.error("SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }

const supabase = createClient(SUPA_URL, SRK);

async function main() {
  const tenantId = process.argv[2] || "4c0acda5-853c-44d9-b350-9a7941eb4391";
  const date = process.argv[3] || new Date().toISOString().split("T")[0];

  console.log(`\n💰 Running full reconciliation for tenant: ${tenantId}, date: ${date}\n`);

  const { runFullReconciliation, generateDailyFinancialSummary } = await import("../src/lib/safety/reconciliation");

  const report = await runFullReconciliation(supabase, tenantId, date);
  const summary = await generateDailyFinancialSummary(supabase, tenantId, date);

  console.log("═".repeat(60));
  console.log(`  RECONCILIATION: ${report.is_clean ? "✅ CLEAN" : "❌ ANOMALIES FOUND"}`);
  console.log(`  Checks: ${report.checks_run} | Anomalies: ${report.anomalies.length} | Duration: ${report.duration_ms}ms`);
  console.log("═".repeat(60));

  if (report.anomalies.length > 0) {
    console.log("\n── ANOMALIES ──\n");
    for (const a of report.anomalies) {
      const icon = a.severity === "critical" ? "🚨" : a.severity === "high" ? "⚠️" : "ℹ️";
      console.log(`  ${icon} [${a.severity.toUpperCase()}] ${a.check}: ${a.description}`);
    }
  }

  console.log("\n── DAILY FINANCIAL SUMMARY ──\n");
  console.log(`  Date:            ${summary.date}`);
  console.log(`  Orders total:    ${summary.orders_total}`);
  console.log(`  Orders paid:     ${summary.orders_paid}`);
  console.log(`  Orders unpaid:   ${summary.orders_unpaid}`);
  console.log(`  Orders cancelled:${summary.orders_cancelled}`);
  console.log(`  Revenue gross:   ${summary.revenue_gross}€`);
  console.log(`  Revenue net:     ${summary.revenue_net}€`);
  console.log(`  Cash:            ${summary.cash_total}€`);
  console.log(`  Card:            ${summary.card_total}€`);
  console.log(`  Tips:            ${summary.tips_total}€`);
  console.log(`  Refunds:         ${summary.refunds_total}€`);
  console.log(`  Avg ticket:      ${summary.average_ticket}€`);
  console.log(`  Payment count:   ${summary.payment_count}`);
  console.log();
}

main().catch(console.error);
