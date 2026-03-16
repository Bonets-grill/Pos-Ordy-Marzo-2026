import { describe, it, expect } from "vitest";
import { scoreProposal, riskLevelFromScore, isAutoReject } from "../risk/risk-scorer";
import type { FrozenFile, DependencyNode, ProposalInput } from "../types";

const MOCK_FROZEN: FrozenFile[] = [
  { path: "src/lib/api-auth.ts", lock_source: "flow-lock.sha256", expected_hash: "a", current_hash: "a", is_intact: true },
  { path: "src/lib/utils.ts", lock_source: "flow-lock.sha256", expected_hash: "b", current_hash: "b", is_intact: true },
];

const MOCK_DEPS: DependencyNode[] = [
  { file: "src/lib/api-auth.ts", imports: [], imported_by: ["src/app/api/admin/route.ts"] },
  { file: "src/app/api/admin/route.ts", imports: ["src/lib/api-auth.ts"], imported_by: [] },
  { file: "src/lib/ai-orchestrator/types.ts", imports: [], imported_by: ["src/lib/ai-orchestrator/index.ts"] },
  { file: "src/lib/ai-orchestrator/index.ts", imports: ["src/lib/ai-orchestrator/types.ts"], imported_by: [] },
];

const TEST_FILES = ["src/lib/utils.test.ts", "src/lib/ai-orchestrator/__tests__/risk-scorer.test.ts"];
const API_ROUTES = ["src/app/api/admin/route.ts", "src/app/api/public/menu/route.ts"];

describe("riskLevelFromScore", () => {
  it("returns none for 0-20", () => {
    expect(riskLevelFromScore(0)).toBe("none");
    expect(riskLevelFromScore(20)).toBe("none");
  });
  it("returns low for 21-40", () => {
    expect(riskLevelFromScore(30)).toBe("low");
  });
  it("returns medium for 41-60", () => {
    expect(riskLevelFromScore(50)).toBe("medium");
  });
  it("returns high for 61-80", () => {
    expect(riskLevelFromScore(75)).toBe("high");
  });
  it("returns critical for >80", () => {
    expect(riskLevelFromScore(81)).toBe("critical");
    expect(riskLevelFromScore(100)).toBe("critical");
  });
});

describe("isAutoReject", () => {
  it("returns false for score <= 80", () => {
    expect(isAutoReject(80)).toBe(false);
    expect(isAutoReject(50)).toBe(false);
  });
  it("returns true for score > 80", () => {
    expect(isAutoReject(81)).toBe(true);
  });
});

describe("scoreProposal", () => {
  it("scores a safe proposal with low risk", () => {
    const proposal: ProposalInput = {
      title: "Add new utility",
      motivation: "Need helper function",
      target_files: ["src/lib/ai-orchestrator/types.ts"],
      changes_description: "Add type",
      includes_migration: false,
    };

    const result = scoreProposal({
      proposal,
      frozenFiles: MOCK_FROZEN,
      dependencies: MOCK_DEPS,
      testFiles: TEST_FILES,
      apiRoutes: API_ROUTES,
    });

    expect(result.frozen_zone_violations).toHaveLength(0);
    expect(result.overall_score).toBeLessThan(50);
    expect(result.level).not.toBe("critical");
  });

  it("scores high for frozen zone touch", () => {
    const proposal: ProposalInput = {
      title: "Modify auth",
      motivation: "Change auth logic",
      target_files: ["src/lib/api-auth.ts"],
      changes_description: "Modify auth",
      includes_migration: false,
    };

    const result = scoreProposal({
      proposal,
      frozenFiles: MOCK_FROZEN,
      dependencies: MOCK_DEPS,
      testFiles: TEST_FILES,
      apiRoutes: API_ROUTES,
    });

    expect(result.frozen_zone_violations).toHaveLength(1);
    expect(result.overall_score).toBeGreaterThanOrEqual(30);
  });

  it("scores higher for destructive migrations", () => {
    const proposal: ProposalInput = {
      title: "Drop table",
      motivation: "Cleanup",
      target_files: ["supabase/migrations/new.sql"],
      changes_description: "Drop unused table",
      includes_migration: true,
      migration_type: "destructive",
    };

    const result = scoreProposal({
      proposal,
      frozenFiles: MOCK_FROZEN,
      dependencies: MOCK_DEPS,
      testFiles: TEST_FILES,
      apiRoutes: API_ROUTES,
    });

    const migrationFactor = result.factors.find((f) => f.name === "migration_risk");
    expect(migrationFactor).toBeDefined();
    expect(migrationFactor!.score).toBeGreaterThan(0);
  });

  it("scores higher for API route changes", () => {
    const proposal: ProposalInput = {
      title: "Modify admin API",
      motivation: "Add endpoint",
      target_files: ["src/app/api/admin/route.ts"],
      changes_description: "New action",
      includes_migration: false,
    };

    const result = scoreProposal({
      proposal,
      frozenFiles: MOCK_FROZEN,
      dependencies: MOCK_DEPS,
      testFiles: TEST_FILES,
      apiRoutes: API_ROUTES,
    });

    const apiFactor = result.factors.find((f) => f.name === "api_surface_change");
    expect(apiFactor).toBeDefined();
    expect(apiFactor!.score).toBeGreaterThan(0);
  });
});
