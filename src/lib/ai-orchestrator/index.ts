// ============================================================
// AI ORCHESTRATOR — Public API
// ============================================================

// Types
export type {
  OrchestratorPhase,
  RiskLevel,
  ProposalStatus,
  GateResult,
  SystemMap,
  FrozenFile,
  LockFileInfo,
  DependencyNode,
  InspectionResult,
  RiskAssessment,
  FrozenZoneViolation,
  AffectedDependency,
  TestCoverageRisk,
  RiskFactor,
  ProposalInput,
  Proposal,
  FileChange,
  RollbackPlan,
  OpenAIReview,
  ValidationResult,
  GateCheck,
  TestRunResult,
  TypeCheckResult,
  LockVerifyResult,
  MigrationCheckResult,
  OrchestratorState,
  OrchestratorTransition,
  OrchestrationLogEntry,
} from "./types";

// Constants
export { LOCK_FILES, RISK_WEIGHTS, RISK_THRESHOLDS, MAX_ACCEPTABLE_RISK, ORCHESTRATOR_RULES } from "./constants";

// Inspection
export { parseLockFile, checkAllFrozenZones, getFrozenFilePaths } from "./inspection/frozen-zones";
export { inspectRepository } from "./inspection/inspector";
export { generateSystemMap, buildDependencyGraph, extractImports } from "./inspection/system-map";
export { getMigrationFiles, readMigrationContent, extractTablesFromSql } from "./inspection/db-schema";

// Risk
export { scoreProposal, riskLevelFromScore, isAutoReject } from "./risk/risk-scorer";
export { checkFrozenZoneViolations, touchesFrozenZone } from "./risk/frozen-zone-checker";
export { analyzeImpact, maxImpactDepth } from "./risk/dependency-analyzer";

// Proposal
export { buildProposal } from "./proposal/proposal-builder";
export { validateProposalStructure, validateAgainstContracts } from "./proposal/proposal-validator";

// Validation
export { verifyAllLocks } from "./validation/lock-verifier";
export { runTests } from "./validation/test-runner";
export { runTypeCheck } from "./validation/type-checker";
export { checkMigrationSafety } from "./validation/migration-checker";

// OpenAI Inspector
export { requestCodeReview } from "./openai-inspector/inspector-client";

// Orchestrator
export { createInitialState, isValidTransition, transition, transitionToFailed } from "./orchestrator/state-machine";
export { writeLogEntry, getLogEntries } from "./orchestrator/audit-trail";
export { aggregateGates, createValidationResult, runPreExecutionGates } from "./orchestrator/gate-system";
