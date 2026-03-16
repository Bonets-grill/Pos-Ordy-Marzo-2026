/**
 * AI ORCHESTRATOR — Main endpoint
 *
 * POST /api/ai/orchestrator { action: "inspect" | "propose" | "validate" | "status" }
 * GET  /api/ai/orchestrator → current state + recent logs
 *
 * Requires super_admin role.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import {
  inspectRepository,
  generateSystemMap,
  scoreProposal,
  buildProposal,
  verifyAllLocks,
  createInitialState,
  transition,
  transitionToFailed,
  writeLogEntry,
  getLogEntries,
  requestCodeReview,
  runPreExecutionGates,
  createValidationResult,
} from "@/lib/ai-orchestrator";
import type { ProposalInput, OrchestratorState } from "@/lib/ai-orchestrator";

const REPO_ROOT = process.cwd();

function ok(data: unknown) {
  return NextResponse.json(data);
}

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("users")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") return null;
  return profile as { id: string; role: string; tenant_id: string };
}

// In-memory state (per-instance, resets on redeploy)
let currentState: OrchestratorState = createInitialState();

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const svc = createServiceClient();
  const logs = await getLogEntries(svc, {
    tenant_id: admin.tenant_id,
    limit: 20,
  });

  return ok({ state: currentState, recent_logs: logs });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const body = await req.json();
  const { action } = body;
  const svc = createServiceClient();

  switch (action) {
    case "inspect":
      return handleInspect(svc, admin);
    case "propose":
      return handlePropose(svc, admin, body);
    case "validate":
      return handleValidate(svc, admin, body);
    case "review":
      return handleReview(svc, admin, body);
    case "reset":
      currentState = createInitialState();
      return ok({ state: currentState, message: "State reset to idle" });
    default:
      return err(`Unknown action: ${action}`);
  }
}

async function handleInspect(
  svc: ReturnType<typeof createServiceClient>,
  admin: { id: string; tenant_id: string }
) {
  const start = Date.now();

  // Transition: idle → inspecting
  let result = transition(currentState, "inspecting");
  if (!result.ok) return err(result.error);
  currentState = result.state;

  try {
    const inspection = await inspectRepository(REPO_ROOT);

    // Transition: inspecting → mapping
    result = transition(currentState, "mapping");
    if (!result.ok) {
      currentState = transitionToFailed(currentState, result.error);
      return err(result.error);
    }
    currentState = result.state;

    const systemMap = await generateSystemMap(inspection, REPO_ROOT);

    currentState = { ...currentState, system_map: systemMap };

    await writeLogEntry(svc, {
      tenant_id: admin.tenant_id,
      phase: "mapping",
      action: "inspect_complete",
      output_summary: `${systemMap.file_count} files, ${systemMap.frozen_files.length} frozen, ${systemMap.api_routes.length} API routes`,
      duration_ms: Date.now() - start,
    });

    return ok({
      state: currentState,
      system_map: {
        file_count: systemMap.file_count,
        frozen_files_count: systemMap.frozen_files.length,
        frozen_intact: systemMap.frozen_files.filter((f) => f.is_intact).length,
        api_routes: systemMap.api_routes,
        pages: systemMap.pages,
        test_files: systemMap.test_files,
        migrations: systemMap.migrations,
        lock_files: systemMap.lock_files,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    currentState = transitionToFailed(currentState, msg);
    await writeLogEntry(svc, {
      tenant_id: admin.tenant_id,
      phase: currentState.phase,
      action: "inspect_failed",
      error: msg,
      duration_ms: Date.now() - start,
    });
    return err(msg, 500);
  }
}

async function handlePropose(
  svc: ReturnType<typeof createServiceClient>,
  admin: { id: string; tenant_id: string },
  body: { proposal: ProposalInput }
) {
  if (!body.proposal) return err("Missing proposal input");
  if (!currentState.system_map) return err("Must run inspect first");

  const start = Date.now();

  // Transition: mapping → risk_scoring
  let result = transition(currentState, "risk_scoring");
  if (!result.ok) return err(result.error);
  currentState = result.state;

  const map = currentState.system_map!;
  const riskAssessment = scoreProposal({
    proposal: body.proposal,
    frozenFiles: map.frozen_files,
    dependencies: map.dependencies,
    testFiles: map.test_files,
    apiRoutes: map.api_routes,
  });

  currentState = { ...currentState, risk_assessment: riskAssessment };

  // Transition: risk_scoring → proposing (guarded)
  result = transition(currentState, "proposing");
  if (!result.ok) {
    currentState = transitionToFailed(currentState, result.error);
    await writeLogEntry(svc, {
      tenant_id: admin.tenant_id,
      phase: "risk_scoring",
      action: "proposal_blocked",
      output_summary: result.error,
      duration_ms: Date.now() - start,
      metadata: { risk_assessment: riskAssessment },
    });
    return ok({
      state: currentState,
      risk_assessment: riskAssessment,
      blocked: true,
      reason: result.error,
    });
  }
  currentState = result.state;

  const proposal = buildProposal({
    input: body.proposal,
    riskAssessment,
    tenantId: admin.tenant_id,
    createdBy: admin.id,
  });

  // Save to DB
  const { data: saved, error: saveErr } = await svc
    .from("ai_proposals")
    .insert(proposal)
    .select("id")
    .single();

  if (saveErr) return err(`Failed to save proposal: ${saveErr.message}`, 500);

  currentState = { ...currentState, proposal_id: saved.id };

  await writeLogEntry(svc, {
    tenant_id: admin.tenant_id,
    proposal_id: saved.id,
    phase: "proposing",
    action: "proposal_created",
    output_summary: `Risk: ${riskAssessment.overall_score}/100 (${riskAssessment.level})`,
    duration_ms: Date.now() - start,
  });

  return ok({
    state: currentState,
    proposal_id: saved.id,
    risk_assessment: riskAssessment,
  });
}

async function handleValidate(
  svc: ReturnType<typeof createServiceClient>,
  admin: { id: string; tenant_id: string },
  body: { proposal_id?: string }
) {
  const proposalId = body.proposal_id ?? currentState.proposal_id;
  if (!proposalId) return err("No proposal to validate");

  const start = Date.now();

  // Run lock verification
  const lockResult = await verifyAllLocks(REPO_ROOT);

  // Build gate checks (without running tests/typecheck on Vercel)
  const gates = runPreExecutionGates({
    lockVerifyAllIntact: lockResult.all_intact,
    lockViolations: lockResult.violations,
    testsPassed: -1, // Skip on serverless
    testsFailed: 0,
    typeErrors: 0,
    frozenZoneViolations: currentState.risk_assessment?.frozen_zone_violations.length ?? 0,
    riskScore: currentState.risk_assessment?.overall_score ?? 0,
    openaiApproval: currentState.openai_review?.approval,
  });

  const validationResult = createValidationResult("pre_execution", gates, start);
  currentState = { ...currentState, validation_result: validationResult };

  await writeLogEntry(svc, {
    tenant_id: admin.tenant_id,
    proposal_id: proposalId,
    phase: "validating",
    action: "validation_complete",
    output_summary: `Overall: ${validationResult.overall}, ${gates.length} gates checked`,
    duration_ms: validationResult.duration_ms,
    metadata: { gates },
  });

  return ok({ state: currentState, validation_result: validationResult });
}

async function handleReview(
  svc: ReturnType<typeof createServiceClient>,
  admin: { id: string; tenant_id: string },
  body: { proposal_id?: string; diff?: string }
) {
  if (!currentState.system_map) return err("Must run inspect first");
  if (!body.diff) return err("Missing diff for review");

  const proposalId = body.proposal_id ?? currentState.proposal_id;
  const start = Date.now();

  const smap = currentState.system_map!;
  const review = await requestCodeReview({
    proposalTitle: `Proposal ${proposalId ?? "draft"}`,
    diff: body.diff,
    fileCount: smap.file_count,
    frozenFiles: smap.frozen_files.map((f) => f.path),
    apiRoutes: smap.api_routes,
    testFiles: smap.test_files,
    migrations: smap.migrations,
  });

  currentState = { ...currentState, openai_review: review };

  // Update proposal in DB if exists
  if (proposalId) {
    await svc
      .from("ai_proposals")
      .update({ openai_review: review })
      .eq("id", proposalId);
  }

  await writeLogEntry(svc, {
    tenant_id: admin.tenant_id,
    proposal_id: proposalId ?? null,
    phase: "proposing",
    action: "openai_review",
    output_summary: `Approval: ${review.approval}, Confidence: ${review.confidence}`,
    duration_ms: Date.now() - start,
    metadata: { review },
  });

  return ok({ state: currentState, openai_review: review });
}
