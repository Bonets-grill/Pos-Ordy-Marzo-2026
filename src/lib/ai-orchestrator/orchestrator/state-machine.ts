// ============================================================
// STATE MACHINE — FSM for the orchestration cycle
// ============================================================

import type { OrchestratorPhase, OrchestratorState } from "../types";
import { VALID_TRANSITIONS } from "../constants";

/** Create initial idle state */
export function createInitialState(): OrchestratorState {
  return {
    phase: "idle",
    proposal_id: null,
    system_map: null,
    risk_assessment: null,
    validation_result: null,
    openai_review: null,
    error: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
}

/** Check if a transition is valid */
export function isValidTransition(
  from: OrchestratorPhase,
  to: OrchestratorPhase
): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/** Get all valid next phases from current phase */
export function getNextPhases(current: OrchestratorPhase): OrchestratorPhase[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === current)
    .map((t) => t.to as OrchestratorPhase);
}

/** Transition to a new phase with validation */
export function transition(
  state: OrchestratorState,
  to: OrchestratorPhase,
  updates?: Partial<OrchestratorState>
): { ok: true; state: OrchestratorState } | { ok: false; error: string } {
  if (!isValidTransition(state.phase, to)) {
    return {
      ok: false,
      error: `Invalid transition: ${state.phase} → ${to}. Valid targets: ${getNextPhases(state.phase).join(", ")}`,
    };
  }

  // Apply guards
  if (to === "proposing" && state.risk_assessment) {
    if (state.risk_assessment.frozen_zone_violations.length > 0) {
      return {
        ok: false,
        error: `Cannot proceed to proposing: ${state.risk_assessment.frozen_zone_violations.length} frozen zone violation(s)`,
      };
    }
    if (state.risk_assessment.overall_score > 80) {
      return {
        ok: false,
        error: `Cannot proceed to proposing: risk score ${state.risk_assessment.overall_score} exceeds threshold (80)`,
      };
    }
  }

  if (to === "executing" && state.validation_result) {
    if (state.validation_result.overall === "fail") {
      return {
        ok: false,
        error: "Cannot proceed to executing: validation failed",
      };
    }
  }

  const isTerminal = to === "completed" || to === "failed";

  return {
    ok: true,
    state: {
      ...state,
      ...updates,
      phase: to,
      completed_at: isTerminal ? new Date().toISOString() : state.completed_at,
    },
  };
}

/** Force transition to failed state (always valid from any phase) */
export function transitionToFailed(
  state: OrchestratorState,
  error: string
): OrchestratorState {
  return {
    ...state,
    phase: "failed",
    error,
    completed_at: new Date().toISOString(),
  };
}
