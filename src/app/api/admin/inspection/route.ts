import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { SCENARIO_CATALOG, getCatalogSummary, getScenariosByGroup } from "@/lib/inspection/scenario-registry";
import { getScenarioCountSummary, runScenarios, persistInspectionRun } from "@/lib/inspection/scenario-runner";
import { getDBScanDefinitions, runAllDBScans } from "@/lib/inspection/db-scans";
import { evaluateReleaseGate } from "@/lib/inspection/release-gate";
import { waScenarios } from "@/lib/inspection/scenarios/wa-scenarios";
import { qrScenarios, posScenarios, kdsScenarios, chaosScenarios } from "@/lib/inspection/scenarios/qr-pos-kds-scenarios";
import { dbIntegrityScenarios } from "@/lib/inspection/scenarios/db-integrity-scenarios";
import { seedInspectionTenant, cleanupInspectionTenant } from "@/lib/inspection/fixtures/seed-inspection-tenant";
import type { ScenarioGroup } from "@/lib/inspection/types";

export const maxDuration = 60;

/**
 * GET /api/admin/inspection?action=catalog|history|run&tenant_id=xxx
 *
 * Actions:
 *   - catalog: Return full scenario catalog + DB scan definitions
 *   - history: Return recent inspection runs for a tenant
 *   - summary: Return count summary by group
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

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
    const action = searchParams.get("action") || "catalog";
    const tenantId = searchParams.get("tenant_id");

    switch (action) {
      case "catalog": {
        const groups: Record<string, unknown[]> = {};
        for (const s of SCENARIO_CATALOG) {
          if (!groups[s.group]) groups[s.group] = [];
          groups[s.group].push({
            id: s.id,
            name: s.name,
            severity: s.severity,
            blocks_release: s.blocksRelease,
            tags: s.tags,
          });
        }

        return NextResponse.json({
          scenarios: groups,
          db_scans: getDBScanDefinitions(),
          summary: getCatalogSummary(),
          counts: getScenarioCountSummary(),
        });
      }

      case "summary": {
        return NextResponse.json(getScenarioCountSummary());
      }

      case "history": {
        if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

        const { data: runs } = await supabase
          .from("inspection_runs")
          .select("id, run_type, status, scenarios_total, scenarios_passed, scenarios_failed, scenarios_warned, readiness_score, blockers, started_at, completed_at, triggered_by, environment")
          .eq("tenant_id", tenantId)
          .order("started_at", { ascending: false })
          .limit(20);

        return NextResponse.json({ runs: runs || [] });
      }

      case "run_detail": {
        const runId = searchParams.get("run_id");
        if (!runId) return NextResponse.json({ error: "run_id required" }, { status: 400 });

        const { data: run } = await supabase
          .from("inspection_runs")
          .select("*")
          .eq("id", runId)
          .single();

        if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
        return NextResponse.json({ run });
      }

      case "group": {
        const group = searchParams.get("group") as ScenarioGroup;
        if (!group) return NextResponse.json({ error: "group required" }, { status: 400 });
        return NextResponse.json({ scenarios: getScenariosByGroup(group) });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("Inspection API error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/admin/inspection
 * Run full inspection: seed test tenant → run all scenarios → DB scans → release gate → persist → cleanup.
 *
 * Body: { tenant_id?: string, groups?: ScenarioGroup[], use_inspection_tenant?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

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

    const body = await req.json().catch(() => ({})) as {
      tenant_id?: string;
      groups?: ScenarioGroup[];
      use_inspection_tenant?: boolean;
    };

    let tenantId = body.tenant_id;
    let shouldCleanup = false;

    // If no tenant specified or use_inspection_tenant, create isolated test tenant
    if (!tenantId || body.use_inspection_tenant) {
      const fixture = await seedInspectionTenant(supabase);
      tenantId = fixture.tenantId;
      shouldCleanup = true;
    }

    // Collect all scenario executors
    const allExecutors = [
      ...waScenarios,
      ...qrScenarios,
      ...posScenarios,
      ...kdsScenarios,
      ...dbIntegrityScenarios,
      ...chaosScenarios,
    ];

    // Run scenarios
    const scenarioResults = await runScenarios(allExecutors, supabase, tenantId, {
      groups: body.groups,
      timeout_ms: 10_000,
    });

    // Run DB scans
    const dbScanResults = await runAllDBScans(supabase, tenantId);

    // Evaluate release gate
    const gateResult = evaluateReleaseGate({
      scenario_results: scenarioResults,
      db_scan_results: dbScanResults,
      environment: "inspection",
    });

    // Persist results (to the real tenant if specified, otherwise inspection tenant)
    const persistTenantId = body.tenant_id || tenantId;
    const runId = await persistInspectionRun(
      supabase,
      persistTenantId,
      "full_inspection",
      scenarioResults,
      dbScanResults,
      gateResult,
      user.email || user.id
    );

    // Cleanup inspection tenant if we created one
    if (shouldCleanup) {
      await cleanupInspectionTenant(supabase);
    }

    return NextResponse.json({
      run_id: runId,
      tenant_id: persistTenantId,
      verdict: gateResult.verdict,
      readiness_score: gateResult.readiness_score,
      recommendation: gateResult.recommendation,
      summary: {
        total: gateResult.total_scenarios,
        passed: gateResult.passed,
        failed: gateResult.failed,
        warned: gateResult.warned,
        skipped: gateResult.skipped,
      },
      blockers: gateResult.blockers,
      warnings: gateResult.warnings,
      scenario_results: scenarioResults.map((r) => ({
        id: r.scenario_id,
        name: r.scenario_name,
        group: r.group,
        status: r.status,
        severity: r.severity,
        blocks_release: r.blocks_release,
        duration_ms: r.duration_ms,
        assertions_total: r.assertions.length,
        assertions_passed: r.assertions.filter((a) => a.passed).length,
        error: r.error_message,
      })),
      db_scans: dbScanResults.map((r) => ({
        id: r.scan_id,
        name: r.scan_name,
        status: r.status,
        anomalies: r.count,
        blocks_release: r.blocks_release,
      })),
    });
  } catch (err) {
    console.error("Inspection run error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
