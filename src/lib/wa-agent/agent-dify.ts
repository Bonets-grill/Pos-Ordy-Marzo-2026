/**
 * Dify-powered WhatsApp agent.
 * Uses Dify for conversation + our local DB for menu context.
 * Conversation IDs are persisted in wa_sessions.context (not in-memory).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { WAInstance, IncomingMessage } from "./types";
import { getOrCreateSession, saveMessage } from "./sessions";
import { buildDifyInputs } from "./dify-context";
import { getLang, NOTIFY_I18N, AGENT_ERRORS } from "./language";

const DIFY_API_URL = process.env.DIFY_API_URL || "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY || "";

/**
 * Process an incoming WhatsApp message using Dify.
 */
export async function processMessageWithDify(
  supabase: SupabaseClient,
  instance: WAInstance,
  message: IncomingMessage
): Promise<string> {
  const tenantId = instance.tenant_id;

  // 1. Get or create session
  const session = await getOrCreateSession(supabase, tenantId, instance.id, message.from);

  // 1b. Store span context in session for distributed tracing
  // This allows tool calls (separate HTTP requests) to create child spans
  if (message.trace_id) {
    const ctx = (session.context || {}) as Record<string, unknown>;
    const spanChanged = ctx.trace_id !== message.trace_id || ctx.span_id !== message.span_id;
    if (spanChanged) {
      await supabase
        .from("wa_sessions")
        .update({
          context: {
            ...ctx,
            trace_id: message.trace_id,
            span_id: message.span_id || null,
            parent_span_id: message.parent_span_id || null,
          },
        })
        .eq("id", session.id);
    }
  }

  // 2. Save incoming message
  await saveMessage(supabase, {
    session_id: session.id,
    tenant_id: tenantId,
    role: "user",
    content: message.text,
    wa_message_id: message.wa_message_id,
  });

  // 3. Build FULL restaurant context for Dify inputs (fresh from DB every message)
  // This gives the agent all menu/pricing/hours data UPFRONT for smart conversation.
  // Tools handle ACTIONS (add_to_cart, confirm_order), inputs handle KNOWLEDGE.
  let inputs: Record<string, string>;
  try {
    inputs = await buildDifyInputs(supabase, tenantId);
  } catch (err) {
    console.error("[DIFY] Failed to build inputs:", (err as Error).message);
    const errLang = getLang((session.context || {}) as Record<string, unknown>);
    return AGENT_ERRORS[errLang].buildInputsFailed();
  }

  inputs.customer_phone = message.from;
  if (session.customer_name) {
    inputs.customer_name = session.customer_name;
  }

  // Load returning customer context
  if (session.customer_name) {
    const { data: lastOrder } = await supabase
      .from("orders")
      .select("order_number, total, created_at, id")
      .eq("tenant_id", tenantId)
      .eq("customer_phone", message.from)
      .eq("source", "whatsapp")
      .in("status", ["served", "closed", "ready"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastOrder) {
      const { data: lastItems } = await supabase
        .from("order_items")
        .select("name, quantity, modifiers")
        .eq("order_id", (lastOrder as Record<string, unknown>).id || "");

      if (lastItems && lastItems.length > 0) {
        const itemsSummary = lastItems.map((i: Record<string, unknown>) => {
          const mods = Array.isArray(i.modifiers) ? (i.modifiers as { name: string }[]).map(m => m.name).join(", ") : "";
          return `${i.quantity}x ${i.name}${mods ? ` (${mods})` : ""}`;
        }).join(", ");
        inputs.customer_context = `CLIENTE RECURRENTE: ${session.customer_name}. Su último pedido fue: ${itemsSummary}.`;
      }
    }
  }

  // 4. Get Dify conversation ID from session context (persisted in DB)
  const ctx = (session.context || {}) as Record<string, unknown>;
  const conversationId = (ctx.dify_conversation_id as string) || null;

  // Pass client detected language to Dify — overrides the default 'español' from buildDifyInputs
  const detectedLang = (ctx.detected_language as string) || 'es';
  const langLabels: Record<string, string> = {
    es: 'español', en: 'english', fr: 'français', de: 'deutsch', it: 'italiano',
  };
  inputs.language = langLabels[detectedLang] || 'español';

  // 5. Call Dify
  try {
    const body: Record<string, unknown> = {
      inputs,
      query: message.text,
      response_mode: "streaming",
      user: message.from,
    };
    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const resp = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[DIFY] API error:", resp.status, errText);

      // If conversation_id is invalid (expired), clear it and retry without it
      if (resp.status === 404 || resp.status === 400) {
        if (conversationId) {
          console.log("[DIFY] Clearing stale conversation_id, retrying...");
          await supabase
            .from("wa_sessions")
            .update({ context: { ...ctx, dify_conversation_id: null } })
            .eq("id", session.id);

          // Retry without conversation_id
          const retryBody = { ...body };
          delete retryBody.conversation_id;
          const retryResp = await fetch(`${DIFY_API_URL}/chat-messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${DIFY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(retryBody),
          });

          if (retryResp.ok) {
            return await parseDifyResponse(supabase, session, tenantId, ctx, retryResp);
          }
        }
      }

      return `¡Ups! Problema técnico (${resp.status}). Intenta de nuevo.`;
    }

    return await parseDifyResponse(supabase, session, tenantId, ctx, resp);

  } catch (err) {
    console.error("[DIFY] Request failed:", (err as Error).message);
    const errLang = getLang(ctx);
    return AGENT_ERRORS[errLang].connectionError();
  }
}

/**
 * Parse Dify SSE response, save conversation_id to DB, save message.
 */
async function parseDifyResponse(
  supabase: SupabaseClient,
  session: { id: string },
  tenantId: string,
  ctx: Record<string, unknown>,
  resp: Response
): Promise<string> {
  const text = await resp.text();
  let fullAnswer = "";
  let convId: string | null = null;

  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const json = JSON.parse(line.slice(6));
      if (json.event === "agent_message" || json.event === "message") {
        fullAnswer += json.answer || "";
      }
      if (json.conversation_id) {
        convId = json.conversation_id;
      }
    } catch {
      // skip malformed lines
    }
  }

  if (!fullAnswer) {
    console.error("[DIFY] Empty answer. Raw:", text.substring(0, 500));
    return AGENT_ERRORS[getLang(ctx)].emptyResponse();
  }

  // Persist conversation ID to DB so it survives serverless cold starts
  if (convId && convId !== ctx.dify_conversation_id) {
    await supabase
      .from("wa_sessions")
      .update({ context: { ...ctx, dify_conversation_id: convId } })
      .eq("id", session.id);
  }

  // Save assistant response
  await saveMessage(supabase, {
    session_id: session.id,
    tenant_id: tenantId,
    role: "assistant",
    content: fullAnswer,
  });

  return fullAnswer;
}
