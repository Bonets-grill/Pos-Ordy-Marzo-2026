// ============================================================
// PROPOSAL BUILDER — Build structured patch proposals
// ============================================================

import type {
  Proposal,
  ProposalInput,
  RiskAssessment,
  ProposalStatus,
  RollbackPlan,
} from "../types";

/** Build a proposal object from input + risk assessment */
export function buildProposal(params: {
  input: ProposalInput;
  riskAssessment: RiskAssessment;
  tenantId: string;
  createdBy: string;
}): Omit<Proposal, "id" | "created_at" | "updated_at"> {
  const { input, riskAssessment, tenantId, createdBy } = params;

  const rollback_plan: RollbackPlan = input.includes_migration
    ? {
        strategy: "revert_migration",
        steps: [
          "Revert modified files to pre-change state",
          "Apply compensating migration (DROP tables created)",
          "Verify lock integrity",
          "Run tests to confirm no regression",
        ],
        backup_paths: input.target_files,
      }
    : {
        strategy: "revert_files",
        steps: [
          "Restore original file contents from backup",
          "Verify lock integrity",
          "Run tests to confirm no regression",
        ],
        backup_paths: input.target_files,
      };

  const status: ProposalStatus =
    riskAssessment.frozen_zone_violations.length > 0
      ? "rejected"
      : "pending_review";

  return {
    tenant_id: tenantId,
    title: input.title,
    motivation: input.motivation,
    description: input.changes_description,
    files_to_create: [],
    files_to_modify: input.target_files.map((path) => ({
      path,
      diff: "",
      reason: input.changes_description,
    })),
    files_to_delete: [],
    risk_assessment: riskAssessment,
    rollback_plan,
    openai_review: null,
    status,
    created_by: createdBy,
    reviewed_by: null,
  };
}
