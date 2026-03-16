// ============================================================
// AI ORCHESTRATOR — Constants & Configuration
// ============================================================

/** Lock files to check for frozen zones */
export const LOCK_FILES = [
  "flow-lock.sha256",
  "pos-flow-lock.sha256",
  "ESCANDALLO_FULL_LOCK.sha256",
  "ESCANDALLO_MODULE1_LOCK.sha256",
  "ESCANDALLO_MODULE2_LOCK.sha256",
  "ESCANDALLO_MODULE3_LOCK.sha256",
  "ESCANDALLO_MODULE4_LOCK.sha256",
] as const;

/** Risk scoring weights (must sum to 100) */
export const RISK_WEIGHTS = {
  frozen_zone_proximity: 30,
  file_count_changed: 10,
  import_depth: 15,
  test_coverage: 15,
  migration_risk: 15,
  api_surface_change: 15,
} as const;

/** Risk level thresholds */
export const RISK_THRESHOLDS = {
  none: 20,
  low: 40,
  medium: 60,
  high: 80,
  // > 80 = critical (auto-reject)
} as const;

/** Max risk score before auto-rejection */
export const MAX_ACCEPTABLE_RISK = 80;

/** SQL patterns that indicate destructive migrations */
export const DANGEROUS_SQL_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bALTER\s+COLUMN\s+.*\bTYPE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bDROP\s+INDEX\b/i,
  /\bDROP\s+FUNCTION\b/i,
  /\bDROP\s+POLICY\b/i,
] as const;

/** Safe SQL patterns (additive only) */
export const SAFE_SQL_PATTERNS = [
  /\bCREATE\s+TABLE\b/i,
  /\bCREATE\s+INDEX\b/i,
  /\bCREATE\s+POLICY\b/i,
  /\bCREATE\s+FUNCTION\b/i,
  /\bALTER\s+TABLE\s+.*\bADD\s+COLUMN\b/i,
  /\bALTER\s+TABLE\s+.*\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i,
] as const;

/** File patterns for categorization */
export const FILE_PATTERNS = {
  api_route: /^src\/app\/api\/.*\/route\.ts$/,
  page: /^src\/app\/.*\/page\.tsx$/,
  lib_module: /^src\/lib\/.*\.ts(x)?$/,
  test_file: /\.test\.ts(x)?$/,
  migration: /^supabase\/migrations\/.*\.sql$/,
  component: /^src\/components\/.*\.tsx$/,
} as const;

// ============================================================
// PERMANENT ORCHESTRATION RULES — Non-negotiable
// ============================================================
// These rules are enforced at every level of the orchestrator.
// They cannot be overridden by any actor (Claude, OpenAI, or admin UI).
//
// RULE 1: All proposals must run in DRY_RUN mode first.
//         No proposal may skip the inspect → risk_score → validate cycle.
//
// RULE 2: Any proposal touching frozen zones is automatically rejected.
//         The frozen-zone-checker gate is non-negotiable and cannot be bypassed.
//
// RULE 3: All proposals must be written to ai_proposals before validation.
//         No in-memory-only proposals are allowed past the proposing phase.
//
// RULE 4: Every state transition must be logged in ai_orchestration_log.
//         Silent transitions are forbidden. All phases produce audit entries.
//
// RULE 5: No automatic code application is allowed.
//         Proposals require explicit super_admin approval via POST /proposals { action: "approve" }.
//         The "executing" phase is gated behind proposal.status === "approved".
// ============================================================

export const ORCHESTRATOR_RULES = {
  DRY_RUN_REQUIRED: true,
  FROZEN_ZONE_AUTO_REJECT: true,
  PROPOSAL_MUST_PERSIST_BEFORE_VALIDATION: true,
  ALL_TRANSITIONS_MUST_LOG: true,
  EXPLICIT_APPROVAL_REQUIRED: true,
} as const;

/** Valid state machine transitions */
export const VALID_TRANSITIONS: Array<{ from: string; to: string }> = [
  { from: "idle", to: "inspecting" },
  { from: "inspecting", to: "mapping" },
  { from: "inspecting", to: "failed" },
  { from: "mapping", to: "risk_scoring" },
  { from: "mapping", to: "failed" },
  { from: "risk_scoring", to: "proposing" },
  { from: "risk_scoring", to: "failed" },
  { from: "proposing", to: "validating" },
  { from: "proposing", to: "failed" },
  { from: "validating", to: "executing" },
  { from: "validating", to: "failed" },
  { from: "executing", to: "verifying" },
  { from: "executing", to: "failed" },
  { from: "verifying", to: "completed" },
  { from: "verifying", to: "rolling_back" },
  { from: "rolling_back", to: "failed" },
];
