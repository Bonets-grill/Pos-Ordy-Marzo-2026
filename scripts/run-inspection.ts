/**
 * Run full inspection against a tenant from the command line.
 * Usage: npx tsx scripts/run-inspection.ts [tenant_id]
 */

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://abqyqnmndjczkblwnvga.supabase.co";
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SRK) {
  console.error("SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SRK);

async function main() {
  const tenantId = process.argv[2] || "4c0acda5-853c-44d9-b350-9a7941eb4391";
  console.log(`\n🔍 Running full inspection for tenant: ${tenantId}\n`);

  // Import modules
  const { waScenarios } = await import("../src/lib/inspection/scenarios/wa-scenarios");
  const { qrScenarios, posScenarios, kdsScenarios, chaosScenarios } = await import("../src/lib/inspection/scenarios/qr-pos-kds-scenarios");
  const { dbIntegrityScenarios } = await import("../src/lib/inspection/scenarios/db-integrity-scenarios");
  const { runScenarios } = await import("../src/lib/inspection/scenario-runner");
  const { runAllDBScans } = await import("../src/lib/inspection/db-scans");
  const { evaluateReleaseGate } = await import("../src/lib/inspection/release-gate");

  const allExecutors = [
    ...waScenarios,
    ...qrScenarios,
    ...posScenarios,
    ...kdsScenarios,
    ...dbIntegrityScenarios,
    ...chaosScenarios,
  ];

  console.log(`📋 Scenarios registered: ${allExecutors.length}`);

  // Run scenarios
  console.log("\n⏳ Running scenarios...");
  const scenarioResults = await runScenarios(allExecutors, supabase, tenantId, { timeout_ms: 10000 });

  // Run DB scans
  console.log("⏳ Running DB integrity scans...");
  const dbScanResults = await runAllDBScans(supabase, tenantId);

  // Evaluate release gate
  const gate = evaluateReleaseGate({
    scenario_results: scenarioResults,
    db_scan_results: dbScanResults,
    environment: "production",
  });

  // Output results
  console.log("\n" + "═".repeat(70));
  console.log(`  RELEASE GATE VERDICT: ${gate.verdict}`);
  console.log(`  READINESS SCORE: ${gate.readiness_score}/100`);
  console.log("═".repeat(70));

  console.log(`\n📊 Summary: ${gate.total_scenarios} total | ${gate.passed} pass | ${gate.failed} fail | ${gate.warned} warn | ${gate.skipped} skip`);

  // Group results
  const groups = new Map<string, typeof scenarioResults>();
  for (const r of scenarioResults) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group)!.push(r);
  }

  console.log("\n── SCENARIO RESULTS BY GROUP ──\n");
  for (const [group, results] of groups) {
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail" || r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skip").length;
    console.log(`  ${group.toUpperCase().padEnd(15)} ${passed} pass | ${failed} fail | ${skipped} skip`);

    for (const r of results) {
      const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : r.status === "error" ? "💥" : r.status === "skip" ? "⏭️" : "⚠️";
      const blocker = r.blocks_release ? " [BLOCKER]" : "";
      console.log(`    ${icon} ${r.scenario_id} ${r.scenario_name} (${r.duration_ms}ms)${blocker}`);
      if (r.status === "fail" || r.status === "error") {
        if (r.error_message) console.log(`       Error: ${r.error_message}`);
        for (const a of r.assertions.filter((a) => !a.passed)) {
          console.log(`       ❌ ${a.description} (expected: ${a.expected}, got: ${a.actual})`);
        }
      }
    }
    console.log();
  }

  console.log("── DB INTEGRITY SCANS ──\n");
  for (const r of dbScanResults) {
    const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : "⚠️";
    const blocker = r.blocks_release ? " [BLOCKER]" : "";
    console.log(`  ${icon} ${r.scan_id} ${r.scan_name}: ${r.count} anomalies (${r.duration_ms}ms)${blocker}`);
    for (const a of r.anomalies.slice(0, 3)) {
      console.log(`     → ${a.description}`);
    }
    if (r.anomalies.length > 3) console.log(`     → ... and ${r.anomalies.length - 3} more`);
  }

  if (gate.blockers.length > 0) {
    console.log("\n── RELEASE BLOCKERS ──\n");
    for (const b of gate.blockers) {
      console.log(`  🚫 ${b.source}: ${b.name} [${b.severity}]`);
      console.log(`     ${b.reason}`);
    }
  }

  if (gate.warnings.length > 0) {
    console.log("\n── WARNINGS ──\n");
    for (const w of gate.warnings) {
      console.log(`  ⚠️  ${w}`);
    }
  }

  console.log(`\n📝 ${gate.recommendation}\n`);

  // Persist to DB
  try {
    await supabase.from("inspection_runs").insert({
      tenant_id: tenantId,
      run_type: "full_inspection",
      status: gate.verdict === "BLOCKED" ? "blocked" : gate.verdict === "PASS_WITH_WARNINGS" ? "pass_with_warnings" : "pass",
      scenarios_total: gate.total_scenarios,
      scenarios_passed: gate.passed,
      scenarios_failed: gate.failed,
      scenarios_warned: gate.warned,
      blockers: gate.blockers,
      results: [...scenarioResults, ...dbScanResults],
      summary: gate,
      readiness_score: gate.readiness_score,
      completed_at: new Date().toISOString(),
      triggered_by: "cli-inspection",
      environment: "production",
    });
    console.log("💾 Results persisted to inspection_runs table.");
  } catch (err) {
    console.error("Failed to persist:", (err as Error).message);
  }
}

main().catch(console.error);
