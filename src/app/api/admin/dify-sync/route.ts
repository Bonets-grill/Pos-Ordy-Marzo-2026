import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { generateAgentPrompt, syncPromptToDify, checkPromptSyncNeeded } from "@/lib/wa-agent/dify-sync";

/**
 * GET /api/admin/dify-sync?tenant_id=xxx
 * Check if prompt sync is needed + show current vs generated prompt.
 *
 * POST /api/admin/dify-sync
 * Regenerate prompt and sync to Dify (or store for manual paste).
 * Body: { tenant_id }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantId = new URL(req.url).searchParams.get("tenant_id");
    if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

    // Check if sync needed
    const syncCheck = await checkPromptSyncNeeded(supabase, tenantId);

    // Generate full prompt for preview
    const result = await generateAgentPrompt(supabase, tenantId);

    // Get stored prompt
    const { data: instance } = await supabase
      .from("wa_instances")
      .select("prompt_text, prompt_hash, prompt_synced_at")
      .eq("tenant_id", tenantId)
      .single();

    return NextResponse.json({
      sync_needed: syncCheck.needed,
      current_hash: syncCheck.current_hash,
      new_hash: syncCheck.new_hash,
      prompt_preview: result.prompt.substring(0, 500) + "...",
      prompt_length: result.prompt.length,
      variables: result.variables,
      tools_count: result.tools_schema.includes("check_availability") ? 14 : 11,
      generated_at: result.generated_at,
      last_synced_at: instance?.prompt_synced_at || null,
      stored_hash: instance?.prompt_hash || null,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const tenantId = body.tenant_id;
    if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

    // Generate prompt from current DB state
    const result = await generateAgentPrompt(supabase, tenantId);

    // Sync to Dify (push via API or store locally)
    const syncResult = await syncPromptToDify(supabase, tenantId, result);

    return NextResponse.json({
      prompt_generated: true,
      prompt_hash: result.hash,
      prompt_changed: result.changed,
      prompt_length: result.prompt.length,
      variables: result.variables,
      tools_schema_length: result.tools_schema.length,
      sync: syncResult,
      // Include full prompt + tools schema for manual Dify paste
      full_prompt: result.prompt,
      full_tools_schema: result.tools_schema,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
