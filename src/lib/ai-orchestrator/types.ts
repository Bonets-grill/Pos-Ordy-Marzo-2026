// ============================================================
// AI ORCHESTRATOR — Global Types & Interfaces
// ============================================================

// ── Phase & Status enums ─────────────────────────────────────

export type OrchestratorPhase =
  | "idle"
  | "inspecting"
  | "mapping"
  | "risk_scoring"
  | "proposing"
  | "validating"
  | "executing"
  | "verifying"
  | "rolling_back"
  | "completed"
  | "failed";

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type ProposalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "rolled_back"
  | "failed";

export type GateResult = "pass" | "fail" | "warn";

// ── Inspection types ─────────────────────────────────────────

export interface SystemMap {
  generated_at: string;
  file_count: number;
  frozen_files: FrozenFile[];
  lock_files: LockFileInfo[];
  api_routes: string[];
  pages: string[];
  lib_modules: string[];
  test_files: string[];
  migrations: string[];
  dependencies: DependencyNode[];
}

export interface FrozenFile {
  path: string;
  lock_source: string;
  expected_hash: string;
  current_hash: string;
  is_intact: boolean;
}

export interface LockFileInfo {
  path: string;
  file_count: number;
  all_intact: boolean;
}

export interface DependencyNode {
  file: string;
  imports: string[];
  imported_by: string[];
}

export interface InspectionResult {
  file_tree: string[];
  frozen_files: FrozenFile[];
  api_routes: string[];
  pages: string[];
  lib_modules: string[];
  test_files: string[];
  migrations: string[];
}

// ── Risk types ───────────────────────────────────────────────

export interface RiskAssessment {
  overall_score: number;
  level: RiskLevel;
  frozen_zone_violations: FrozenZoneViolation[];
  affected_dependencies: AffectedDependency[];
  test_coverage_risk: TestCoverageRisk;
  factors: RiskFactor[];
}

export interface FrozenZoneViolation {
  file: string;
  lock_source: string;
  severity: "warning" | "blocking";
}

export interface AffectedDependency {
  file: string;
  impact: "direct" | "transitive";
  risk_contribution: number;
}

export interface TestCoverageRisk {
  files_with_tests: number;
  files_without_tests: number;
  affected_test_files: string[];
}

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

// ── Proposal types ───────────────────────────────────────────

export interface ProposalInput {
  title: string;
  motivation: string;
  target_files: string[];
  changes_description: string;
  includes_migration: boolean;
  migration_type?: "additive" | "destructive";
  migration_sql?: string;
}

export interface Proposal {
  id: string;
  tenant_id: string;
  title: string;
  motivation: string;
  description: string;
  files_to_create: FileChange[];
  files_to_modify: FileChange[];
  files_to_delete: string[];
  risk_assessment: RiskAssessment;
  rollback_plan: RollbackPlan;
  openai_review: OpenAIReview | null;
  status: ProposalStatus;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileChange {
  path: string;
  diff: string;
  reason: string;
}

export interface RollbackPlan {
  strategy: "revert_files" | "revert_migration" | "manual";
  steps: string[];
  backup_paths: string[];
}

// ── OpenAI Inspector types ───────────────────────────────────

export interface OpenAIReview {
  risk_assessment: string;
  architecture_concerns: string[];
  regression_risks: string[];
  recommendations: string[];
  approval: "approve" | "needs_changes" | "reject";
  confidence: number;
  model: string;
  reviewed_at: string;
}

// ── Validation types ─────────────────────────────────────────

export interface ValidationResult {
  phase: string;
  gates: GateCheck[];
  overall: GateResult;
  duration_ms: number;
}

export interface GateCheck {
  name: string;
  result: GateResult;
  message: string;
  details?: unknown;
}

export interface TestRunResult {
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  failures: Array<{ test: string; error: string }>;
}

export interface TypeCheckResult {
  errors: number;
  error_details: Array<{ file: string; line: number; message: string }>;
}

export interface LockVerifyResult {
  locks_checked: number;
  all_intact: boolean;
  violations: Array<{ lock_file: string; file: string; status: "changed" | "missing" }>;
}

export interface MigrationCheckResult {
  is_additive: boolean;
  has_drop: boolean;
  has_alter_column: boolean;
  has_delete: boolean;
  tables_affected: string[];
  risk_notes: string[];
}

// ── Orchestrator state ───────────────────────────────────────

export interface OrchestratorState {
  phase: OrchestratorPhase;
  proposal_id: string | null;
  system_map: SystemMap | null;
  risk_assessment: RiskAssessment | null;
  validation_result: ValidationResult | null;
  openai_review: OpenAIReview | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface OrchestratorTransition {
  from: OrchestratorPhase;
  to: OrchestratorPhase;
  guard?: (state: OrchestratorState) => boolean;
}

// ── Audit log ────────────────────────────────────────────────

export interface OrchestrationLogEntry {
  id: string;
  tenant_id: string;
  proposal_id: string | null;
  phase: OrchestratorPhase;
  action: string;
  input_summary: string;
  output_summary: string;
  duration_ms: number;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
