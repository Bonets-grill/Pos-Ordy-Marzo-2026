import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { processMessageWithDify } from "@/lib/wa-agent/agent-dify";
import { sendToAirtableAsync, getTenantName } from "@/lib/airtable/dispatcher";
import { getProvider } from "@/lib/wa-agent/provider";
import type { WAInstance, IncomingMessage } from "@/lib/wa-agent/types";
import { MetaProvider } from "@/lib/wa-agent/providers/meta";
import { detectLanguage, NOTIFY_I18N, getLang } from "@/lib/wa-agent/language";
import { createRootSpan, createChildSpan, serializeSpan, spanDuration, createLogger, metrics } from "@/lib/observability";
import { checkRateLimit } from "@/lib/safety/rate-limiter";
import { checkDistributedRateLimit } from "@/lib/safety/redis-rate-limiter";
import { isFeatureEnabled } from "@/lib/safety/feature-flags";
import {
  extractEvolutionEventId,
  extractMetaEventId,
  acquireWebhookLock,
  markWebhookProcessed,
  markWebhookFailed,
  hashPayload,
} from "@/lib/safety/webhook-idempotency";
import { verifyEvolutionSignature, verifyMetaSignature } from "@/lib/safety/webhook-signatures";

// Allow up to 60s for Dify agent processing (Netlify Pro supports this)
export const maxDuration = 60;

/**
 * POST: Receive incoming messages from Evolution API or Meta Cloud API.
 * Evolution sends: { event, instance, data: { key, message, ... } }
 * Meta sends: { object: "whatsapp_business_account", entry: [...] }
 */
export async function POST(req: NextRequest) {
  try {
    // Read raw body for signature verification, then parse as JSON
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const supabase = createServiceClient();

    // Webhook signature verification — active when EVOLUTION_WEBHOOK_SECRET is set
    const sigVerifyEnabled = true;
    if (sigVerifyEnabled) {
      if (body.object === "whatsapp_business_account") {
        const sig = req.headers.get("x-hub-signature-256");
        const result = verifyMetaSignature(rawBody, sig);
        if (!result.valid) {
          console.error(`[WEBHOOK] Meta signature invalid: ${result.reason}`);
          metrics.errorsTotal.inc({ source: "webhook", type: "signature_invalid" });
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      } else if (body.event || body.instance) {
        const sig = req.headers.get("x-evolution-signature") || req.headers.get("x-webhook-signature");
        const result = verifyEvolutionSignature(rawBody, sig);
        if (!result.valid && result.reason !== "no_secret_configured") {
          console.error(`[WEBHOOK] Evolution signature invalid: ${result.reason}`);
          metrics.errorsTotal.inc({ source: "webhook", type: "signature_invalid" });
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      }
    }

    // Detect provider from payload shape
    if (body.object === "whatsapp_business_account") {
      // ── META CLOUD API ──
      return handleMetaWebhook(supabase, body);
    } else if (body.event || body.instance) {
      // ── EVOLUTION API ──
      return handleEvolutionWebhook(supabase, body);
    }

    return NextResponse.json({ status: "ignored" });
  } catch (err) {
    console.error("Webhook error:", err);
    metrics.errorsTotal.inc({ source: "webhook", type: "unhandled" });
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

/**
 * GET: Meta webhook verification (hub.challenge).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const instanceId = params.get("instance_id");

  if (!instanceId) {
    return new NextResponse("Missing instance_id", { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("meta_verify_token")
    .eq("id", instanceId)
    .eq("provider", "meta")
    .single();

  if (!instance?.meta_verify_token) {
    return new NextResponse("Instance not found", { status: 404 });
  }

  const meta = new MetaProvider();
  const challenge = meta.verifyWebhook(params, instance.meta_verify_token);

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// ── Evolution API handler ──

async function handleEvolutionWebhook(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const event = body.event as string;
  const instanceName = (body.instance as string) || (body.instanceName as string);

  // Only process text messages
  if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
    // Handle connection updates
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = (body.data as Record<string, unknown>)?.state as string;
      if (instanceName && state) {
        const status = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
        await supabase
          .from("wa_instances")
          .update({
            status,
            ...(status === "connected" ? { connected_at: new Date().toISOString() } : {})
          })
          .eq("instance_name", instanceName)
          .eq("provider", "evolution");
      }
    }
    return NextResponse.json({ status: "ok" });
  }

  // Parse message
  const data = body.data as Record<string, unknown>;
  const key = data.key as Record<string, unknown>;
  const messageObj = data.message as Record<string, unknown>;

  // Skip messages sent by us
  if (key?.fromMe) {
    return NextResponse.json({ status: "ok" });
  }

  const remoteJid = key?.remoteJid as string;
  if (!remoteJid || remoteJid.includes("@g.us")) {
    // Skip group messages
    return NextResponse.json({ status: "ok" });
  }

  // Extract phone number — handle @lid format (new WhatsApp addressing mode)
  const effectiveJid = remoteJid.includes("@lid") && key?.remoteJidAlt
    ? (key.remoteJidAlt as string)
    : remoteJid;
  const phone = effectiveJid.replace("@s.whatsapp.net", "").replace("@lid", "");

  // Rate limiting: prevent WhatsApp spam (20 msgs/min per phone)
  // Uses distributed Redis limiter if feature flag enabled, otherwise in-memory
  const useRedisLimiter = await isFeatureEnabled(supabase, "redis_rate_limiter");
  const rateLimitAllowed = useRedisLimiter
    ? await checkDistributedRateLimit(phone)
    : checkRateLimit(phone);
  if (!rateLimitAllowed) {
    console.log(`[WEBHOOK] Rate limited: ${phone} (${useRedisLimiter ? "redis" : "memory"})`);
    metrics.webhooksRateLimited.inc({ source: "evolution" });
    return NextResponse.json({ status: "ok" }); // silent drop
  }

  // Extract text content
  let text = "";
  if (messageObj?.conversation) {
    text = messageObj.conversation as string;
  } else if (messageObj?.extendedTextMessage) {
    text = (messageObj.extendedTextMessage as Record<string, unknown>).text as string;
  }

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ status: "ok" }); // skip non-text (images, etc.)
  }

  // Find the instance
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("*")
    .eq("instance_name", instanceName)
    .eq("provider", "evolution")
    .single();

  if (!instance) {
    console.error("Instance not found:", instanceName);
    return NextResponse.json({ status: "instance_not_found" }, { status: 404 });
  }

  const tenantId = instance.tenant_id;

  // Webhook idempotency: prevent duplicate processing of retried events
  // Placed after instance lookup so tenant_id is available for the UNIQUE constraint
  const webhookIdempotencyEnabled = await isFeatureEnabled(supabase, "webhook_idempotency");
  const eventId = extractEvolutionEventId(body);
  if (webhookIdempotencyEnabled && eventId) {
    const { acquired } = await acquireWebhookLock(supabase, {
      source: "evolution",
      eventId,
      eventType: event,
      tenantId,
      phone,
      payloadHash: hashPayload(body),
    });
    if (!acquired) {
      console.log(`[WEBHOOK] Duplicate event skipped: ${eventId} tenant: ${tenantId}`);
      metrics.webhooksDuplicate.inc({ source: "evolution" });
      return NextResponse.json({ status: "ok" });
    }
  }

  // Detect and store client language on each message
  const detectedLang = detectLanguage(text.trim());
  const { data: langSession } = await supabase
    .from("wa_sessions")
    .select("id, context")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .single();
  if (langSession) {
    const ctx = (langSession.context || {}) as Record<string, unknown>;
    if (ctx.detected_language !== detectedLang) {
      await supabase
        .from("wa_sessions")
        .update({ context: { ...ctx, detected_language: detectedLang } })
        .eq("id", langSession.id);
    }
  }

  // Check if this is a pickup confirmation response (SÍ/NO) — handle without AI
  const intercepted = await handlePickupConfirmation(supabase, tenantId, phone, text.trim(), instance as WAInstance);
  if (intercepted) {
    return NextResponse.json({ status: "ok" });
  }

  // Distributed tracing: create root span for this webhook request
  const rootSpan = createRootSpan("webhook_received", "whatsapp", tenantId);
  const log = createLogger(rootSpan);
  metrics.webhooksReceived.inc({ source: "evolution" });
  metrics.activeWebhooks.inc({ source: "evolution" });
  log.info("webhook_received", `WA message from ${phone}: ${text.trim().substring(0, 50)}`);

  // Airtable: registrar mensaje WhatsApp entrante (multi-tenant)
  getTenantName(tenantId).then(tenantName => {
    sendToAirtableAsync('whatsapp_messages', {
      'Phone': phone,
      'Message': text.trim().substring(0, 500),
      'Detected Language': detectedLang || 'es',
      'Instance Name': instanceName || '',
      'Provider': 'evolution',
      'Is New Customer': !langSession,
      'Tenant Name': tenantName,
      'Timestamp': new Date().toISOString(),
    })
  })

  const incomingMessage: IncomingMessage = {
    from: phone,
    text: text.trim(),
    wa_message_id: key?.id as string || "",
    timestamp: Date.now(),
    trace_id: rootSpan.trace_id,
    span_id: rootSpan.span_id,
    parent_span_id: rootSpan.parent_span_id,
  };

  // Create child span for agent execution
  const agentSpan = createChildSpan(rootSpan, "agent_execution");
  const response = await processMessageWithDify(supabase, instance as WAInstance, incomingMessage);
  const agentMs = spanDuration(agentSpan);
  metrics.agentLatency.observe(agentMs, { provider: "dify" });
  log.info("agent_called", `Dify response: ${response.substring(0, 80)}`, { latency_ms: agentMs });

  const provider = getProvider("evolution");
  try {
    await provider.sendMessage({
      to: phone,
      text: response,
      instance: instance as WAInstance,
    });
  } catch (sendErr) {
    console.error("[WEBHOOK] Failed to send WA message:", (sendErr as Error).message);
    metrics.errorsTotal.inc({ source: "webhook", type: "send_failed" });
  }
  const totalMs = spanDuration(rootSpan);
  metrics.webhookLatency.observe(totalMs, { source: "evolution" });
  metrics.notificationsSent.inc({ source: "evolution" });
  metrics.activeWebhooks.dec({ source: "evolution" });
  log.info("notification_sent", `Response sent to ${phone}`, { latency_ms: totalMs });

  // Mark webhook event as processed
  if (webhookIdempotencyEnabled && eventId) {
    await markWebhookProcessed(supabase, eventId, "evolution");
  }

  return NextResponse.json({ status: "ok" });
}

// ── Meta Cloud API handler ──

async function handleMetaWebhook(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const meta = new MetaProvider();
  const parsed = meta.parseWebhook(body);

  if (!parsed) {
    return NextResponse.json({ status: "ok" }); // not a text message
  }

  // Find instance by Meta phone number ID
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("*")
    .eq("meta_phone_number_id", parsed.phoneId)
    .eq("provider", "meta")
    .single();

  if (!instance) {
    console.error("Meta instance not found for phone:", parsed.phoneId);
    return NextResponse.json({ status: "instance_not_found" }, { status: 404 });
  }

  // Webhook idempotency: prevent duplicate processing
  // Placed after instance lookup so tenant_id is available for the UNIQUE constraint
  const metaIdempotencyEnabled = await isFeatureEnabled(supabase, "webhook_idempotency");
  const metaEventId = extractMetaEventId(body) || parsed.wa_message_id;
  if (metaIdempotencyEnabled && metaEventId) {
    const { acquired } = await acquireWebhookLock(supabase, {
      source: "meta",
      eventId: metaEventId,
      eventType: "message",
      tenantId: instance.tenant_id,
      phone: parsed.from,
      payloadHash: hashPayload(body),
    });
    if (!acquired) {
      console.log(`[WEBHOOK] Duplicate Meta event skipped: ${metaEventId} tenant: ${instance.tenant_id}`);
      return NextResponse.json({ status: "ok" });
    }
  }

  // Mark as read
  await meta.markAsRead(instance as WAInstance, parsed.wa_message_id);

  // Check pickup confirmation intercept
  const intercepted = await handlePickupConfirmation(supabase, instance.tenant_id, parsed.from, parsed.text, instance as WAInstance);
  if (intercepted) {
    if (metaIdempotencyEnabled && metaEventId) await markWebhookProcessed(supabase, metaEventId, "meta");
    return NextResponse.json({ status: "ok" });
  }

  // Airtable: registrar mensaje WhatsApp entrante Meta (multi-tenant)
  getTenantName(instance.tenant_id).then(tenantName => {
    sendToAirtableAsync('whatsapp_messages', {
      'Phone': parsed.from,
      'Message': parsed.text.substring(0, 500),
      'Detected Language': detectLanguage(parsed.text) || 'es',
      'Instance Name': instance.instance_name || '',
      'Provider': 'meta',
      'Is New Customer': false,
      'Tenant Name': tenantName,
      'Timestamp': new Date().toISOString(),
    })
  })

  // Process with agent
  const incomingMessage: IncomingMessage = {
    from: parsed.from,
    text: parsed.text,
    wa_message_id: parsed.wa_message_id,
    timestamp: parsed.timestamp,
  };

  const response = await processMessageWithDify(supabase, instance as WAInstance, incomingMessage);

  const provider = getProvider("meta");
  await provider.sendMessage({
    to: parsed.from,
    text: response,
    instance: instance as WAInstance,
  });

  if (metaIdempotencyEnabled && metaEventId) await markWebhookProcessed(supabase, metaEventId, "meta");

  return NextResponse.json({ status: "ok" });
}

// ── Pickup Confirmation Interceptor ──
// Handles SÍ/NO responses when session is awaiting_pickup_confirmation
// Also checks order metadata as fallback (in case session state wasn't set)
// Returns true if intercepted, false to continue to AI agent

async function handlePickupConfirmation(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  phone: string,
  text: string,
  instance: WAInstance
): Promise<boolean> {
  try {
    const { saveMessage } = await import("@/lib/wa-agent/sessions");

    // 1. Find session
    const { data: session } = await supabase
      .from("wa_sessions")
      .select("id, state, pending_order_id, customer_name, context")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .single();

    if (!session) return false;

    // 2. Determine if we should intercept
    let orderId: string | null = null;

    if (session.state === "awaiting_pickup_confirmation" && session.pending_order_id) {
      // Primary path: session state is correct
      orderId = session.pending_order_id;
    } else {
      // Fallback: check orders table for an order awaiting customer confirmation
      const { data: pendingOrder } = await supabase
        .from("orders")
        .select("id, metadata")
        .eq("tenant_id", tenantId)
        .eq("customer_phone", phone)
        .eq("source", "whatsapp")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (pendingOrder) {
        const meta = (pendingOrder.metadata || {}) as Record<string, unknown>;
        if (meta.pickup_status === "awaiting_confirmation") {
          orderId = pendingOrder.id;
          console.log("[INTERCEPT] Fallback matched order:", orderId);
          // Fix session state for future calls
          await supabase
            .from("wa_sessions")
            .update({ state: "awaiting_pickup_confirmation", pending_order_id: orderId })
            .eq("id", session.id);
        }
      }
    }

    if (!orderId) return false;

    // 3. Parse yes/no
    const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isYes = /^(si|yes|ja|oui|ok|vale|claro|perfecto|genial|bueno|confirmo|confirmar|dale|1)$/i.test(normalized);
    const isNo = /^(no|nein|non|cancelar|cancela|cancel|2)$/i.test(normalized);

    // Get language
    const lang = getLang(session.context as Record<string, unknown> | null);
    const t = NOTIFY_I18N[lang];

    if (!isYes && !isNo) {
      // Not a clear yes/no — send reminder
      const provider = getProvider(instance.provider as "evolution" | "meta");
      const remindMsg = t.pickup_remind();
      await provider.sendMessage({ to: phone, text: remindMsg, instance });
      await saveMessage(supabase, { session_id: session.id, tenant_id: tenantId, role: "user", content: text });
      await saveMessage(supabase, { session_id: session.id, tenant_id: tenantId, role: "assistant", content: remindMsg });
      return true;
    }

    // 4. Get the order
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, total, metadata")
      .eq("id", orderId)
      .single();

    if (!order) return false;

    const provider = getProvider(instance.provider as "evolution" | "meta");
    const name = order.customer_name || "";
    const num = String(order.order_number);

    await saveMessage(supabase, { session_id: session.id, tenant_id: tenantId, role: "user", content: text });

    if (isYes) {
      // Customer confirmed pickup time
      const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "customer_confirmed" };
      await supabase.from("orders").update({ metadata }).eq("id", order.id);
      await supabase.from("wa_sessions").update({ state: "idle" }).eq("id", session.id);

      const pickupMins = (order.metadata as Record<string, unknown>)?.pickup_minutes || "?";
      const msg = t.pickup_confirm_yes(name, num, pickupMins as number);

      await provider.sendMessage({ to: phone, text: msg, instance });
      await saveMessage(supabase, { session_id: session.id, tenant_id: tenantId, role: "assistant", content: msg });
    } else {
      // Customer rejected — cancel order
      const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "customer_cancelled" };
      await supabase.from("orders").update({ status: "cancelled", metadata, cancelled_at: new Date().toISOString() }).eq("id", order.id);
      await supabase.from("order_items").update({ kds_status: "served" }).eq("order_id", order.id);
      await supabase.from("wa_sessions").update({ state: "idle", pending_order_id: null, cart: [] }).eq("id", session.id);

      const msg = t.pickup_confirm_no(name, num);

      await provider.sendMessage({ to: phone, text: msg, instance });
      await saveMessage(supabase, { session_id: session.id, tenant_id: tenantId, role: "assistant", content: msg });
    }

    return true;
  } catch (err) {
    console.error("[INTERCEPT] Error:", (err as Error).message);
    return false;
  }
}
