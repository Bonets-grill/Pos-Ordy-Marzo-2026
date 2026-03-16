// ============================================================
// PROPOSAL VALIDATOR — Pre-execution contract checks
// ============================================================

import type { Proposal, GateCheck, SystemMap } from "../types";
import { checkFrozenZoneViolations } from "../risk/frozen-zone-checker";
import { checkMigrationSafety } from "../validation/migration-checker";

/** Validate the structural integrity of a proposal */
export function validateProposalStructure(proposal: Proposal): GateCheck[] {
  const gates: GateCheck[] = [];

  // Gate 1: Title and motivation present
  gates.push({
    name: "proposal_has_title",
    result: proposal.title.trim().length > 0 ? "pass" : "fail",
    message: proposal.title.trim().length > 0
      ? "Proposal has a title"
      : "Proposal is missing a title",
  });

  gates.push({
    name: "proposal_has_motivation",
    result: proposal.motivation.trim().length > 0 ? "pass" : "fail",
    message: proposal.motivation.trim().length > 0
      ? "Proposal has motivation"
      : "Proposal is missing motivation",
  });

  // Gate 2: Has at least one change
  const totalChanges =
    proposal.files_to_create.length +
    proposal.files_to_modify.length +
    proposal.files_to_delete.length;
  gates.push({
    name: "proposal_has_changes",
    result: totalChanges > 0 ? "pass" : "fail",
    message: `${totalChanges} file change(s) proposed`,
  });

  // Gate 3: Rollback plan exists
  gates.push({
    name: "rollback_plan_exists",
    result: proposal.rollback_plan.steps.length > 0 ? "pass" : "fail",
    message: proposal.rollback_plan.steps.length > 0
      ? `Rollback plan has ${proposal.rollback_plan.steps.length} step(s)`
      : "No rollback plan defined",
  });

  return gates;
}

/** Validate proposal against system contracts */
export function validateAgainstContracts(
  proposal: Proposal,
  systemMap: SystemMap
): GateCheck[] {
  const gates: GateCheck[] = [];

  // Gate 1: No frozen zone violations
  const allTargetFiles = [
    ...proposal.files_to_modify.map((f) => f.path),
    ...proposal.files_to_delete,
  ];
  const violations = checkFrozenZoneViolations(allTargetFiles, systemMap.frozen_files);
  gates.push({
    name: "frozen_zone_check",
    result: violations.length === 0 ? "pass" : "fail",
    message: violations.length === 0
      ? "No frozen zone violations"
      : `${violations.length} frozen zone violation(s): ${violations.map((v) => v.file).join(", ")}`,
    details: violations,
  });

  // Gate 2: Risk score within threshold
  gates.push({
    name: "risk_score_check",
    result: proposal.risk_assessment.overall_score <= 80 ? "pass" : "fail",
    message: `Risk score: ${proposal.risk_assessment.overall_score}/100 (${proposal.risk_assessment.level})`,
  });

  // Gate 3: OpenAI review (if present) is not "reject"
  if (proposal.openai_review) {
    gates.push({
      name: "openai_review_check",
      result: proposal.openai_review.approval !== "reject" ? "pass" : "fail",
      message: `OpenAI review: ${proposal.openai_review.approval}`,
    });
  }

  return gates;
}
