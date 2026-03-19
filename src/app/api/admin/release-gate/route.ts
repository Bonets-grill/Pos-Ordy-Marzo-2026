import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { runAllDBScans } from "@/lib/inspection/db-scans";
import { evaluateReleaseGate } from "@/lib/inspection/release-gate";
import { persistInspectionRun } from "@/lib/inspection/scenario-runner";
import { getCatalogSummary, SCENARIO_CATALOG } from "@/lib/inspection/scenario-registry";
import type { ReleaseGateInput, ScenarioResult } from "@/lib/inspection/types";

/**
 * GET /api/admin/release-gate?tenant_id=xxx
 * Evaluate release readiness for a tenant.
 * Runs DB scans + evaluates all available scenario results.
 * Returns PASS / PASS_WITH_WARNINGS / BLOCKED verdict.
 *
 * POST /api/admin/release-gate
 * Run full release gate evaluation with DB scans, persist results.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      // Return catalog summary (no execution)
      return NextResponse.json({
        catalog: getCatalogSummary(),
        total_scenarios: SCENARIO_CATALOG.length,
        release_blocking: SCENARIO_CATALOG.filter((s) => s.blocksRelease).length,
        message: "Provide tenant_id to run full evaluation",
      });
    }

    // Run DB scans
    const dbResults = await runAllDBScans(supabase, tenantId);

    // Load latest scenario results from inspection_runs (if any)
    const { data: lastRun } = await supabase
      .from("inspection_runs")
      .select("results")
      .eq("tenant_id", tenantId)
      .eq("run_type", "scenario")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    const scenarioResults: ScenarioResult[] = lastRun?.results
      ? (lastRun.results as ScenarioResult[]).filter((r: any) => "scenario_id" in r)
      : [];

    // Evaluate gate
    const input: ReleaseGateInput = {
      scenario_results: scenarioResults,
      db_scan_results: dbResults,
      environment: "production",
    };

    const verdict = evaluateReleaseGate(input);

    // Persist this evaluation
    await persistInspectionRun(
      supabase,
      tenantId,
      "release_gate",
      scenarioResults,
      dbResults,
      verdict,
      user.email || user.id
    );

    return NextResponse.json({
      tenant_id: tenantId,
      ...verdict,
      db_scan_details: dbResults.map((r) => ({
        id: r.scan_id,
        name: r.scan_name,
        status: r.status,
        anomalies: r.count,
        blocks_release: r.blocks_release,
      })),
      scenario_results_source: scenarioResults.length > 0 ? "last_inspection_run" : "none",
      scenario_count: scenarioResults.length,
    });
  } catch (err) {
    console.error("Release gate error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Same as GET but with explicit body for future scenario execution
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  if (body.tenant_id) url.searchParams.set("tenant_id", body.tenant_id);

  // Reuse GET logic
  const fakeReq = new NextRequest(url, { method: "GET", headers: req.headers });
  return GET(fakeReq);
}
