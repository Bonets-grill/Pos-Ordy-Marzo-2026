/**
 * AI ORCHESTRATOR — Proposals CRUD
 *
 * GET  /api/ai/orchestrator/proposals?status=pending_review&limit=20
 * POST /api/ai/orchestrator/proposals { action: "approve" | "reject", proposal_id }
 *
 * Requires super_admin role.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { writeLogEntry } from "@/lib/ai-orchestrator";

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

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const svc = createServiceClient();
  let query = svc
    .from("ai_proposals")
    .select("id, title, status, risk_assessment, openai_review, created_at, updated_at")
    .eq("tenant_id", admin.tenant_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return err(error.message, 500);

  return ok({ proposals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const { action, proposal_id } = await req.json();
  if (!proposal_id) return err("Missing proposal_id");
  if (!["approve", "reject"].includes(action)) return err("Action must be approve or reject");

  const svc = createServiceClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data, error } = await svc
    .from("ai_proposals")
    .update({
      status: newStatus,
      reviewed_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal_id)
    .eq("tenant_id", admin.tenant_id)
    .select("id, status")
    .single();

  if (error) return err(error.message, 500);
  if (!data) return err("Proposal not found", 404);

  await writeLogEntry(svc, {
    tenant_id: admin.tenant_id,
    proposal_id,
    phase: "proposing",
    action: `proposal_${newStatus}`,
    output_summary: `Proposal ${proposal_id} ${newStatus} by ${admin.id}`,
  });

  return ok({ proposal: data });
}
