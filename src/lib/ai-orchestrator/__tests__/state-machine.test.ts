import { describe, it, expect } from "vitest";
import {
  createInitialState,
  isValidTransition,
  transition,
  transitionToFailed,
  getNextPhases,
} from "../orchestrator/state-machine";

describe("createInitialState", () => {
  it("returns idle state with null fields", () => {
    const state = createInitialState();
    expect(state.phase).toBe("idle");
    expect(state.proposal_id).toBeNull();
    expect(state.system_map).toBeNull();
    expect(state.risk_assessment).toBeNull();
    expect(state.error).toBeNull();
    expect(state.completed_at).toBeNull();
  });
});

describe("isValidTransition", () => {
  it("allows idle → inspecting", () => {
    expect(isValidTransition("idle", "inspecting")).toBe(true);
  });
  it("allows inspecting → mapping", () => {
    expect(isValidTransition("inspecting", "mapping")).toBe(true);
  });
  it("allows verifying → rolling_back", () => {
    expect(isValidTransition("verifying", "rolling_back")).toBe(true);
  });
  it("blocks idle → completed (invalid)", () => {
    expect(isValidTransition("idle", "completed")).toBe(false);
  });
  it("blocks completed → idle (invalid)", () => {
    expect(isValidTransition("completed", "idle")).toBe(false);
  });
  it("blocks mapping → executing (skip phases)", () => {
    expect(isValidTransition("mapping", "executing")).toBe(false);
  });
});

describe("getNextPhases", () => {
  it("returns [inspecting] for idle", () => {
    expect(getNextPhases("idle")).toEqual(["inspecting"]);
  });
  it("returns [mapping, failed] for inspecting", () => {
    const next = getNextPhases("inspecting");
    expect(next).toContain("mapping");
    expect(next).toContain("failed");
  });
  it("returns [completed, rolling_back] for verifying", () => {
    const next = getNextPhases("verifying");
    expect(next).toContain("completed");
    expect(next).toContain("rolling_back");
  });
  it("returns empty for completed (terminal)", () => {
    expect(getNextPhases("completed")).toEqual([]);
  });
});

describe("transition", () => {
  it("transitions idle → inspecting successfully", () => {
    const state = createInitialState();
    const result = transition(state, "inspecting");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.phase).toBe("inspecting");
    }
  });

  it("rejects invalid transition", () => {
    const state = createInitialState();
    const result = transition(state, "completed");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid transition");
    }
  });

  it("sets completed_at for terminal states", () => {
    const state = { ...createInitialState(), phase: "rolling_back" as const };
    const result = transition(state, "failed");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.completed_at).not.toBeNull();
    }
  });

  it("blocks proposing when frozen zones are violated", () => {
    const state = {
      ...createInitialState(),
      phase: "risk_scoring" as const,
      risk_assessment: {
        overall_score: 50,
        level: "medium" as const,
        frozen_zone_violations: [{ file: "auth.ts", lock_source: "flow", severity: "blocking" as const }],
        affected_dependencies: [],
        test_coverage_risk: { files_with_tests: 0, files_without_tests: 0, affected_test_files: [] },
        factors: [],
      },
    };
    const result = transition(state, "proposing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("frozen zone");
    }
  });

  it("blocks proposing when risk score exceeds threshold", () => {
    const state = {
      ...createInitialState(),
      phase: "risk_scoring" as const,
      risk_assessment: {
        overall_score: 85,
        level: "critical" as const,
        frozen_zone_violations: [],
        affected_dependencies: [],
        test_coverage_risk: { files_with_tests: 0, files_without_tests: 0, affected_test_files: [] },
        factors: [],
      },
    };
    const result = transition(state, "proposing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("risk score");
    }
  });
});

describe("transitionToFailed", () => {
  it("sets phase to failed with error message", () => {
    const state = createInitialState();
    const failed = transitionToFailed(state, "Something broke");
    expect(failed.phase).toBe("failed");
    expect(failed.error).toBe("Something broke");
    expect(failed.completed_at).not.toBeNull();
  });
});
