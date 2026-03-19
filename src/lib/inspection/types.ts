/**
 * ORDY Inspection System — Core Type Definitions
 *
 * These types define the inspection/QA/release-gate system.
 * All types are pure — no runtime dependencies.
 */

// ─── Severity & Classification ──────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ScenarioGroup =
  | "whatsapp"
  | "qr"
  | "pos"
  | "kds"
  | "db_integrity"
  | "chaos"
  | "payment"
  | "notification"
  | "language"
  | "session";

export type ScenarioStatus = "pass" | "fail" | "warn" | "skip" | "error";

export type ReleaseVerdict = "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED";

export type RunType = "scenario" | "db_scan" | "release_gate" | "full_inspection";

// ─── Assertions ─────────────────────────────────────────

export interface AssertionResult {
  passed: boolean;
  description: string;
  expected?: unknown;
  actual?: unknown;
  severity: Severity;
}

// ─── Scenarios ──────────────────────────────────────────

export interface ScenarioDefinition {
  id: string;                    // e.g., "WA_001"
  name: string;                  // Human-readable name
  group: ScenarioGroup;
  severity: Severity;            // Impact if this fails
  blocksRelease: boolean;        // If true, failure = release blocked
  description: string;           // What this scenario validates
  prerequisites: string[];       // What must be true before running
  tags: string[];                // For filtering (e.g., "payment", "idempotency")
}

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  group: ScenarioGroup;
  status: ScenarioStatus;
  severity: Severity;
  blocks_release: boolean;
  assertions: AssertionResult[];
  duration_ms: number;
  error_message?: string;
  evidence?: Record<string, unknown>;  // Structured proof
  timestamp: string;
}

// ─── Scenario Executor ──────────────────────────────────

export interface ScenarioExecutor {
  definition: ScenarioDefinition;
  execute: (ctx: ScenarioContext) => Promise<ScenarioResult>;
}

export interface ScenarioContext {
  supabase: unknown;  // SupabaseClient (typed as unknown to avoid coupling)
  tenantId: string;
  traceId: string;
  timeout_ms: number;
}

// ─── DB Scans ───────────────────────────────────────────

export interface DBScanDefinition {
  id: string;                    // e.g., "DB_001"
  name: string;
  severity: Severity;
  blocksRelease: boolean;
  description: string;
}

export interface DBScanResult {
  scan_id: string;
  scan_name: string;
  status: ScenarioStatus;
  severity: Severity;
  blocks_release: boolean;
  count: number;                 // Number of anomalies found
  anomalies: DBAnomaly[];
  duration_ms: number;
  timestamp: string;
}

export interface DBAnomaly {
  table: string;
  record_id: string;
  field: string;
  description: string;
  expected?: string;
  actual?: string;
}

// ─── Release Gate ───────────────────────────────────────

export interface ReleaseGateInput {
  scenario_results: ScenarioResult[];
  db_scan_results: DBScanResult[];
  environment: string;
}

export interface ReleaseGateOutput {
  verdict: ReleaseVerdict;
  readiness_score: number;       // 0-100
  total_scenarios: number;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  blockers: ReleaseBlocker[];
  warnings: string[];
  recommendation: string;
  evaluated_at: string;
}

export interface ReleaseBlocker {
  source: string;                // scenario_id or scan_id
  name: string;
  severity: Severity;
  reason: string;
}

// ─── Inspection Run (persisted) ─────────────────────────

export interface InspectionRun {
  id: string;
  tenant_id: string;
  run_type: RunType;
  status: string;
  scenarios_total: number;
  scenarios_passed: number;
  scenarios_failed: number;
  scenarios_warned: number;
  blockers: ReleaseBlocker[];
  results: (ScenarioResult | DBScanResult)[];
  summary: ReleaseGateOutput | null;
  readiness_score: number;
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
  environment: string;
}
