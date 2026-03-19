/**
 * Scenario Runner — Executes inspection scenarios and collects results.
 *
 * Features:
 * - Runs scenarios sequentially or by group
 * - Timeout protection per scenario
 * - Result collection with structured evidence
 * - Persistence to inspection_runs table
 * - Error isolation (one scenario failure doesn't stop others)
 */

import type {
  ScenarioResult,
  ScenarioExecutor,
  ScenarioContext,
  ScenarioGroup,
  DBScanResult,
  InspectionRun,
  RunType,
} from "./types";
import { SCENARIO_CATALOG } from "./scenario-registry";
import { generateTraceId } from "@/lib/observability/trace";

const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds per scenario

// ─── Run a single scenario with timeout ─────────────────

async function runSingleScenario(
  executor: ScenarioExecutor,
  ctx: ScenarioContext
): Promise<ScenarioResult> {
  const start = Date.now();
  const def = executor.definition;

  try {
    const result = await Promise.race([
      executor.execute(ctx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Scenario ${def.id} timed out after ${ctx.timeout_ms}ms`)), ctx.timeout_ms)
      ),
    ]);
    return { ...result, duration_ms: Date.now() - start };
  } catch (err) {
    return {
      scenario_id: def.id,
      scenario_name: def.name,
      group: def.group,
      status: "error",
      severity: def.severity,
      blocks_release: def.blocksRelease,
      assertions: [],
      duration_ms: Date.now() - start,
      error_message: (err as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Run multiple scenarios ─────────────────────────────

export interface RunOptions {
  groups?: ScenarioGroup[];
  scenarioIds?: string[];
  tags?: string[];
  timeout_ms?: number;
}

export async function runScenarios(
  executors: ScenarioExecutor[],
  supabase: unknown,
  tenantId: string,
  options: RunOptions = {}
): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  const timeout = options.timeout_ms || DEFAULT_TIMEOUT_MS;
  const traceId = generateTraceId();

  // Filter executors based on options
  let filtered = executors;
  if (options.groups && options.groups.length > 0) {
    filtered = filtered.filter((e) => options.groups!.includes(e.definition.group));
  }
  if (options.scenarioIds && options.scenarioIds.length > 0) {
    filtered = filtered.filter((e) => options.scenarioIds!.includes(e.definition.id));
  }
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((e) =>
      e.definition.tags.some((t) => options.tags!.includes(t))
    );
  }

  const ctx: ScenarioContext = {
    supabase,
    tenantId,
    traceId,
    timeout_ms: timeout,
  };

  // Run sequentially (scenarios may depend on DB state from previous ones)
  for (const executor of filtered) {
    const result = await runSingleScenario(executor, ctx);
    results.push(result);
  }

  return results;
}

// ─── Persist inspection run ─────────────────────────────

export async function persistInspectionRun(
  supabase: unknown,
  tenantId: string,
  runType: RunType,
  scenarioResults: ScenarioResult[],
  dbScanResults: DBScanResult[],
  summary: InspectionRun["summary"],
  triggeredBy: string
): Promise<string> {
  const sb = supabase as { from: (t: string) => { insert: (d: unknown) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null }> } } } };

  const allResults = [...scenarioResults, ...dbScanResults];
  const passed = scenarioResults.filter((r) => r.status === "pass").length + dbScanResults.filter((r) => r.status === "pass").length;
  const failed = scenarioResults.filter((r) => r.status === "fail" || r.status === "error").length + dbScanResults.filter((r) => r.status === "fail").length;
  const warned = scenarioResults.filter((r) => r.status === "warn").length + dbScanResults.filter((r) => r.status === "warn").length;

  const blockers = allResults
    .filter((r) => (r.status === "fail" || r.status === "error") && r.blocks_release)
    .map((r) => ({
      source: "scenario_id" in r ? r.scenario_id : r.scan_id,
      name: "scenario_name" in r ? r.scenario_name : r.scan_name,
      severity: r.severity,
      reason: "error_message" in r && r.error_message ? r.error_message : `${r.status}: failed assertions`,
    }));

  const { data } = await sb
    .from("inspection_runs")
    .insert({
      tenant_id: tenantId,
      run_type: runType,
      status: summary?.verdict === "BLOCKED" ? "blocked" : summary?.verdict === "PASS_WITH_WARNINGS" ? "pass_with_warnings" : summary?.verdict === "PASS" ? "pass" : "error",
      scenarios_total: allResults.length,
      scenarios_passed: passed,
      scenarios_failed: failed,
      scenarios_warned: warned,
      blockers,
      results: allResults,
      summary,
      readiness_score: summary?.readiness_score || 0,
      started_at: allResults[0]?.timestamp || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();

  return data?.id || "unknown";
}

// ─── Get scenario count summary ─────────────────────────

export function getScenarioCountSummary(): {
  total: number;
  by_group: Record<string, number>;
  release_blocking: number;
  critical: number;
} {
  const byGroup: Record<string, number> = {};
  let blocking = 0;
  let critical = 0;

  for (const s of SCENARIO_CATALOG) {
    byGroup[s.group] = (byGroup[s.group] || 0) + 1;
    if (s.blocksRelease) blocking++;
    if (s.severity === "critical") critical++;
  }

  return {
    total: SCENARIO_CATALOG.length,
    by_group: byGroup,
    release_blocking: blocking,
    critical,
  };
}
