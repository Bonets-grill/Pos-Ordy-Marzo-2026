// ============================================================
// AUDIT TRAIL — Write/read entries in ai_orchestration_log
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrchestratorPhase, OrchestrationLogEntry } from "../types";

/** Write an audit log entry */
export async function writeLogEntry(
  supabase: SupabaseClient,
  entry: {
    tenant_id: string;
    proposal_id?: string | null;
    phase: OrchestratorPhase;
    action: string;
    input_summary?: string;
    output_summary?: string;
    duration_ms?: number;
    error?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("ai_orchestration_log")
    .insert({
      tenant_id: entry.tenant_id,
      proposal_id: entry.proposal_id ?? null,
      phase: entry.phase,
      action: entry.action,
      input_summary: entry.input_summary ?? "",
      output_summary: entry.output_summary ?? "",
      duration_ms: entry.duration_ms ?? 0,
      error: entry.error ?? null,
      metadata: entry.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[ai-orchestrator] audit write failed:", error.message);
    return null;
  }

  return data;
}

/** Read log entries for a proposal */
export async function getLogEntries(
  supabase: SupabaseClient,
  params: {
    tenant_id: string;
    proposal_id?: string;
    limit?: number;
  }
): Promise<OrchestrationLogEntry[]> {
  let query = supabase
    .from("ai_orchestration_log")
    .select("*")
    .eq("tenant_id", params.tenant_id)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 50);

  if (params.proposal_id) {
    query = query.eq("proposal_id", params.proposal_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[ai-orchestrator] audit read failed:", error.message);
    return [];
  }

  return (data ?? []) as OrchestrationLogEntry[];
}
