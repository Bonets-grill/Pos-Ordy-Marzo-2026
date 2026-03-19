/**
 * Release Gate Evaluator
 *
 * Evaluates all inspection results and produces a deterministic verdict:
 *   - PASS: All critical checks green, ready for production
 *   - PASS_WITH_WARNINGS: Non-critical issues exist but safe to release
 *   - BLOCKED: Critical failures found, release must not proceed
 *
 * This is the final decision point. No AI judgment — pure policy rules.
 */

import type {
  ReleaseGateInput,
  ReleaseGateOutput,
  ReleaseBlocker,
  ReleaseVerdict,
  ScenarioResult,
  DBScanResult,
} from "./types";

// ─── Policy Rules ───────────────────────────────────────

/**
 * Release is BLOCKED if ANY of these are true:
 */
function evaluateBlockers(input: ReleaseGateInput): ReleaseBlocker[] {
  const blockers: ReleaseBlocker[] = [];

  // 1. Any critical scenario fails
  for (const r of input.scenario_results) {
    if ((r.status === "fail" || r.status === "error") && r.blocks_release) {
      blockers.push({
        source: r.scenario_id,
        name: r.scenario_name,
        severity: r.severity,
        reason: r.error_message || `${r.scenario_name} failed with ${r.assertions.filter((a) => !a.passed).length} assertion failures`,
      });
    }
  }

  // 2. Any DB integrity critical anomaly
  for (const r of input.db_scan_results) {
    if (r.status === "fail" && r.blocks_release) {
      blockers.push({
        source: r.scan_id,
        name: r.scan_name,
        severity: r.severity,
        reason: `${r.count} anomalies found: ${r.anomalies.slice(0, 3).map((a) => a.description).join("; ")}${r.count > 3 ? ` ... and ${r.count - 3} more` : ""}`,
      });
    }
  }

  return blockers;
}

/**
 * Collect warnings (non-blocking issues)
 */
function evaluateWarnings(input: ReleaseGateInput): string[] {
  const warnings: string[] = [];

  for (const r of input.scenario_results) {
    if (r.status === "warn") {
      warnings.push(`${r.scenario_id}: ${r.scenario_name} — warning`);
    }
    if ((r.status === "fail" || r.status === "error") && !r.blocks_release) {
      warnings.push(`${r.scenario_id}: ${r.scenario_name} — failed (non-blocking)`);
    }
  }

  for (const r of input.db_scan_results) {
    if (r.status === "warn" && !r.blocks_release) {
      warnings.push(`${r.scan_id}: ${r.scan_name} — ${r.count} anomalies (non-blocking)`);
    }
  }

  return warnings;
}

/**
 * Calculate readiness score (0-100)
 *
 * Scoring:
 *   - Each passed critical scenario: +3 points
 *   - Each passed high scenario: +2 points
 *   - Each passed medium/low: +1 point
 *   - Each passed DB scan: +3 points
 *   - Each failed: -5 points (critical), -3 (high), -1 (medium/low)
 *   - Each blocker: -10 points
 *   - Normalized to 0-100
 */
function calculateReadinessScore(input: ReleaseGateInput, blockers: ReleaseBlocker[]): number {
  const all: (ScenarioResult | DBScanResult)[] = [...input.scenario_results, ...input.db_scan_results];
  if (all.length === 0) return 0;

  let score = 0;
  let maxScore = 0;

  for (const r of all) {
    const weight = r.severity === "critical" ? 3 : r.severity === "high" ? 2 : 1;
    maxScore += weight;

    if (r.status === "pass") {
      score += weight;
    } else if (r.status === "fail" || r.status === "error") {
      score -= weight; // penalty
    }
    // warn and skip don't affect score
  }

  // Blocker penalty
  score -= blockers.length * 3;

  // Normalize to 0-100
  if (maxScore === 0) return 0;
  const normalized = Math.round((Math.max(0, score) / maxScore) * 100);
  return Math.min(100, Math.max(0, normalized));
}

/**
 * Generate recommendation text
 */
function generateRecommendation(verdict: ReleaseVerdict, blockers: ReleaseBlocker[], warnings: string[], score: number): string {
  if (verdict === "BLOCKED") {
    return `RELEASE BLOCKED — ${blockers.length} blocker(s) must be resolved before release. Score: ${score}/100. Fix: ${blockers.map((b) => b.source).join(", ")}`;
  }

  if (verdict === "PASS_WITH_WARNINGS") {
    return `RELEASE ALLOWED WITH WARNINGS — ${warnings.length} non-critical issue(s). Score: ${score}/100. Review warnings before release.`;
  }

  return `RELEASE APPROVED — All critical checks pass. Score: ${score}/100. Safe to promote to production.`;
}

// ─── Public API ─────────────────────────────────────────

/**
 * Evaluate release readiness based on inspection results.
 * This is the core release gate function.
 */
export function evaluateReleaseGate(input: ReleaseGateInput): ReleaseGateOutput {
  const blockers = evaluateBlockers(input);
  const warnings = evaluateWarnings(input);
  const score = calculateReadinessScore(input, blockers);

  const allResults = [...input.scenario_results, ...input.db_scan_results];
  const passed = allResults.filter((r) => r.status === "pass").length;
  const failed = allResults.filter((r) => r.status === "fail" || r.status === "error").length;
  const warned = allResults.filter((r) => r.status === "warn").length;
  const skipped = allResults.filter((r) => r.status === "skip").length;

  let verdict: ReleaseVerdict;
  if (blockers.length > 0) {
    verdict = "BLOCKED";
  } else if (warnings.length > 0) {
    verdict = "PASS_WITH_WARNINGS";
  } else {
    verdict = "PASS";
  }

  const recommendation = generateRecommendation(verdict, blockers, warnings, score);

  return {
    verdict,
    readiness_score: score,
    total_scenarios: allResults.length,
    passed,
    failed,
    warned,
    skipped,
    blockers,
    warnings,
    recommendation,
    evaluated_at: new Date().toISOString(),
  };
}
