// ============================================================
// GATE SYSTEM — Aggregate gate checks and decide pass/fail
// ============================================================

import type { GateCheck, GateResult, ValidationResult } from "../types";

/** Aggregate multiple gate checks into an overall result */
export function aggregateGates(gates: GateCheck[]): GateResult {
  if (gates.some((g) => g.result === "fail")) return "fail";
  if (gates.some((g) => g.result === "warn")) return "warn";
  return "pass";
}

/** Create a validation result from gates */
export function createValidationResult(
  phase: string,
  gates: GateCheck[],
  startTime: number
): ValidationResult {
  return {
    phase,
    gates,
    overall: aggregateGates(gates),
    duration_ms: Date.now() - startTime,
  };
}

/** Run the full pre-execution validation pipeline */
export function runPreExecutionGates(params: {
  lockVerifyAllIntact: boolean;
  lockViolations: Array<{ lock_file: string; file: string; status: string }>;
  testsPassed: number;
  testsFailed: number;
  typeErrors: number;
  frozenZoneViolations: number;
  riskScore: number;
  openaiApproval?: string;
}): GateCheck[] {
  const gates: GateCheck[] = [];

  // Gate 1: Lock integrity
  gates.push({
    name: "lock_integrity",
    result: params.lockVerifyAllIntact ? "pass" : "fail",
    message: params.lockVerifyAllIntact
      ? "All lock files intact"
      : `${params.lockViolations.length} lock violation(s)`,
    details: params.lockViolations,
  });

  // Gate 2: Tests pass
  gates.push({
    name: "tests_pass",
    result: params.testsFailed === 0 ? "pass" : "fail",
    message: params.testsFailed === 0
      ? `All ${params.testsPassed} tests passed`
      : `${params.testsFailed} test(s) failed`,
  });

  // Gate 3: Type check
  gates.push({
    name: "type_check",
    result: params.typeErrors === 0 ? "pass" : "fail",
    message: params.typeErrors === 0
      ? "TypeScript: 0 errors"
      : `TypeScript: ${params.typeErrors} error(s)`,
  });

  // Gate 4: No frozen zone violations
  gates.push({
    name: "frozen_zones",
    result: params.frozenZoneViolations === 0 ? "pass" : "fail",
    message: params.frozenZoneViolations === 0
      ? "No frozen zone violations"
      : `${params.frozenZoneViolations} frozen zone violation(s)`,
  });

  // Gate 5: Risk score
  gates.push({
    name: "risk_threshold",
    result: params.riskScore <= 80 ? "pass" : "fail",
    message: `Risk score: ${params.riskScore}/100`,
  });

  // Gate 6: OpenAI review (optional)
  if (params.openaiApproval) {
    gates.push({
      name: "openai_review",
      result: params.openaiApproval === "reject" ? "fail" : "pass",
      message: `OpenAI review: ${params.openaiApproval}`,
    });
  }

  return gates;
}
