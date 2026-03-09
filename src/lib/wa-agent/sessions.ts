import { SupabaseClient } from "@supabase/supabase-js";
import type { WASession, WAMessage } from "./types";

const MAX_HISTORY = 20; // last 20 messages for context window

/**
 * Get or create a session for this phone + tenant.
 */
export async function getOrCreateSession(
  supabase: SupabaseClient,
  tenantId: string,
  instanceId: string,
  phone: string
): Promise<WASession> {
  // Try to get existing session
  const { data: existing } = await supabase
    .from("wa_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .single();

  if (existing) {
    // Update last_message_at
    await supabase
      .from("wa_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing as WASession;
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from("wa_sessions")
    .insert({
      tenant_id: tenantId,
      instance_id: instanceId,
      phone,
      state: "idle",
      cart: [],
      context: {},
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return newSession as WASession;
}

/**
 * Load recent message history for conversation memory.
 */
export async function loadMessageHistory(
  supabase: SupabaseClient,
  sessionId: string
): Promise<WAMessage[]> {
  const { data } = await supabase
    .from("wa_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  return ((data || []) as WAMessage[]).reverse();
}

/**
 * Save a message to history.
 */
export async function saveMessage(
  supabase: SupabaseClient,
  params: {
    session_id: string;
    tenant_id: string;
    role: WAMessage["role"];
    content: string;
    tool_calls?: unknown;
    tool_name?: string;
    wa_message_id?: string;
  }
): Promise<void> {
  await supabase.from("wa_messages").insert({
    session_id: params.session_id,
    tenant_id: params.tenant_id,
    role: params.role,
    content: params.content,
    tool_calls: params.tool_calls || null,
    tool_name: params.tool_name || null,
    wa_message_id: params.wa_message_id || null,
  });
}

/**
 * Update session state and cart.
 */
export async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  updates: Partial<Pick<WASession, "state" | "cart" | "pending_order_id" | "customer_name" | "loyalty_customer_id" | "context">>
): Promise<void> {
  await supabase
    .from("wa_sessions")
    .update({ ...updates, last_message_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Clear cart and reset session to idle.
 */
export async function resetSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  await supabase
    .from("wa_sessions")
    .update({
      state: "idle",
      cart: [],
      pending_order_id: null,
      context: {},
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}
