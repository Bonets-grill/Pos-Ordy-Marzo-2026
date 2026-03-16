// ============================================================
// RISK SCORER — Score proposed changes 0-100
// ============================================================

import type {
  RiskAssessment,
  RiskFactor,
  RiskLevel,
  FrozenFile,
  DependencyNode,
  ProposalInput,
  TestCoverageRisk,
} from "../types";
import { RISK_WEIGHTS, RISK_THRESHOLDS, MAX_ACCEPTABLE_RISK } from "../constants";
import { checkFrozenZoneViolations } from "./frozen-zone-checker";
import { analyzeImpact } from "./dependency-analyzer";

/** Determine risk level from numeric score */
export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.none) return "none";
  if (score <= RISK_THRESHOLDS.low) return "low";
  if (score <= RISK_THRESHOLDS.medium) return "medium";
  if (score <= RISK_THRESHOLDS.high) return "high";
  return "critical";
}

/** Check if a score exceeds the auto-reject threshold */
export function isAutoReject(score: number): boolean {
  return score > MAX_ACCEPTABLE_RISK;
}

/** Score a proposal against the system map */
export function scoreProposal(params: {
  proposal: ProposalInput;
  frozenFiles: FrozenFile[];
  dependencies: DependencyNode[];
  testFiles: string[];
  apiRoutes: string[];
}): RiskAssessment {
  const { proposal, frozenFiles, dependencies, testFiles, apiRoutes } = params;
  const factors: RiskFactor[] = [];

  // 1. Frozen zone proximity (weight: 30)
  const violations = checkFrozenZoneViolations(proposal.target_files, frozenFiles);
  const frozenScore = violations.length > 0 ? 100 : 0;
  factors.push({
    name: "frozen_zone_proximity",
    score: Math.round(frozenScore * (RISK_WEIGHTS.frozen_zone_proximity / 100)),
    description: violations.length > 0
      ? `${violations.length} frozen file(s) would be modified`
      : "No frozen files affected",
  });

  // 2. File count changed (weight: 10)
  const fileCount = proposal.target_files.length;
  const fileCountScore = Math.min(100, fileCount * 10); // 10 files = max
  factors.push({
    name: "file_count_changed",
    score: Math.round(fileCountScore * (RISK_WEIGHTS.file_count_changed / 100)),
    description: `${fileCount} file(s) targeted`,
  });

  // 3. Import depth (weight: 15)
  const affected = analyzeImpact(proposal.target_files, dependencies);
  const depthScore = Math.min(100, affected.length * 5); // 20 affected = max
  factors.push({
    name: "import_depth",
    score: Math.round(depthScore * (RISK_WEIGHTS.import_depth / 100)),
    description: `${affected.length} file(s) transitively affected`,
  });

  // 4. Test coverage (weight: 15)
  const testFileSet = new Set(testFiles);
  const targetTestFiles: string[] = [];
  let filesWithTests = 0;
  let filesWithoutTests = 0;
  for (const file of proposal.target_files) {
    const testPath = file.replace(/\.ts(x)?$/, ".test.ts");
    if (testFileSet.has(testPath)) {
      filesWithTests++;
      targetTestFiles.push(testPath);
    } else {
      filesWithoutTests++;
    }
  }
  const coverageScore = fileCount > 0
    ? Math.round((filesWithoutTests / fileCount) * 100)
    : 0;
  factors.push({
    name: "test_coverage",
    score: Math.round(coverageScore * (RISK_WEIGHTS.test_coverage / 100)),
    description: `${filesWithTests}/${fileCount} files have corresponding tests`,
  });

  // 5. Migration risk (weight: 15)
  let migrationScore = 0;
  if (proposal.includes_migration) {
    migrationScore = proposal.migration_type === "destructive" ? 100 : 50;
  }
  factors.push({
    name: "migration_risk",
    score: Math.round(migrationScore * (RISK_WEIGHTS.migration_risk / 100)),
    description: proposal.includes_migration
      ? `Migration type: ${proposal.migration_type ?? "unknown"}`
      : "No migration included",
  });

  // 6. API surface change (weight: 15)
  const apiRouteSet = new Set(apiRoutes);
  const touchedApis = proposal.target_files.filter((f) => apiRouteSet.has(f));
  const apiScore = touchedApis.length > 0 ? Math.min(100, touchedApis.length * 50) : 0;
  factors.push({
    name: "api_surface_change",
    score: Math.round(apiScore * (RISK_WEIGHTS.api_surface_change / 100)),
    description: touchedApis.length > 0
      ? `${touchedApis.length} API route(s) modified`
      : "No API routes affected",
  });

  // Overall score
  const overall_score = factors.reduce((sum, f) => sum + f.score, 0);

  const testCoverageRisk: TestCoverageRisk = {
    files_with_tests: filesWithTests,
    files_without_tests: filesWithoutTests,
    affected_test_files: targetTestFiles,
  };

  return {
    overall_score,
    level: riskLevelFromScore(overall_score),
    frozen_zone_violations: violations,
    affected_dependencies: affected,
    test_coverage_risk: testCoverageRisk,
    factors,
  };
}
