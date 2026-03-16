/**
 * AI ORCHESTRATOR — Proposal history (read-only)
 *
 * GET /api/ai/orchestrator/history?status=approved&limit=50
 *
 * Returns: proposal_id, title, risk_score, status, created_at
 *
 * Requires super_admin role.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";

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
  const status = searchParams.get("status") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const svc = createServiceClient();
  let query = svc
    .from("ai_proposals")
    .select("id, title, risk_assessment, status, created_at")
    .eq("tenant_id", admin.tenant_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return err(error.message, 500);

  // Flatten risk_assessment.overall_score → risk_score
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals = (data ?? []).map((row: any) => ({
    proposal_id: row.id,
    title: row.title,
    risk_score: (row.risk_assessment as { overall_score?: number })?.overall_score ?? null,
    status: row.status,
    created_at: row.created_at,
  }));

  return ok({ proposals, count: proposals.length });
}
