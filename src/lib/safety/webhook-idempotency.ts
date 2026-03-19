/**
 * Webhook Idempotency Layer
 *
 * Prevents duplicate processing of inbound webhook events.
 * Uses the webhook_events table with UNIQUE(tenant_id, event_id, source) constraint.
 *
 * Pattern:
 *   1. Extract a deterministic event_id from the webhook payload
 *   2. Try INSERT into webhook_events — if conflict, event already processed → skip
 *   3. Process the event
 *   4. Mark as processed (or failed)
 *
 * This is atomic under concurrency: two simultaneous requests with the same
 * event_id will have one succeed at INSERT and the other hit the UNIQUE conflict.
 *
 * Sources:
 *   - Evolution API: key.id is the unique WhatsApp message ID
 *   - Meta Cloud API: messages[].id is the unique message ID
 *   - Stripe: event.id
 *
 * Retention policy (30 days):
 *   Webhook providers (Evolution, Meta) may retry for several days.
 *   Events older than 30 days can be safely pruned by a scheduled job:
 *
 *   DELETE FROM webhook_events WHERE created_at < now() - interval '30 days';
 *
 *   This query is safe to run at any time. It does not affect in-flight processing
 *   because active events are always < 30 days old.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type WebhookSource = "evolution" | "meta" | "stripe" | "dify" | "unknown";

export interface WebhookEventParams {
  source: WebhookSource;
  eventId: string;
  eventType?: string;
  tenantId?: string;
  phone?: string;
  traceId?: string;
  payloadHash?: string;
}

/**
 * Extract a deterministic event ID from an Evolution API webhook payload.
 * Returns null if the event doesn't have a usable ID (e.g., connection updates).
 */
export function extractEvolutionEventId(body: Record<string, unknown>): string | null {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const key = data.key as Record<string, unknown> | undefined;
  if (!key?.id) return null;

  // key.id is the WhatsApp message ID — globally unique
  return String(key.id);
}

/**
 * Extract a deterministic event ID from a Meta Cloud API webhook payload.
 * Returns null if the payload doesn't contain a message.
 */
export function extractMetaEventId(body: Record<string, unknown>): string | null {
  try {
    const entries = body.entry as unknown[] | undefined;
    if (!entries?.length) return null;
    const entry = entries[0] as Record<string, unknown>;
    const changes = entry?.changes as unknown[] | undefined;
    if (!changes?.length) return null;
    const change = changes[0] as Record<string, unknown>;
    const value = change?.value as Record<string, unknown> | undefined;
    const messages = value?.messages as unknown[] | undefined;
    if (!messages?.length) return null;
    const msg = messages[0] as Record<string, unknown>;
    return msg?.id ? String(msg.id) : null;
  } catch {
    return null;
  }
}

/**
 * Generate a simple hash of the payload for content-based dedup.
 * Not cryptographic — just for fingerprinting.
 */
export function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return `h${Math.abs(hash).toString(36)}`;
}

/**
 * Attempt to acquire an idempotency lock for a webhook event.
 *
 * Returns:
 *   - { acquired: true, eventRecordId } if this is a NEW event → proceed with processing
 *   - { acquired: false } if this event was already processed → skip
 *
 * Concurrency safe: uses INSERT with UNIQUE constraint.
 * If two concurrent requests try to process the same event, exactly one will succeed.
 */
export async function acquireWebhookLock(
  supabase: SupabaseClient,
  params: WebhookEventParams
): Promise<{ acquired: boolean; eventRecordId?: string }> {
  const { data, error } = await supabase
    .from("webhook_events")
    .insert({
      source: params.source,
      event_id: params.eventId,
      event_type: params.eventType || null,
      tenant_id: params.tenantId || null,
      phone: params.phone || null,
      trace_id: params.traceId || null,
      payload_hash: params.payloadHash || null,
      status: "processing",
      processing_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation → event already exists
    if (error.code === "23505") {
      return { acquired: false };
    }
    // Other errors → fail-open (allow processing to avoid blocking legitimate events)
    console.error("[WEBHOOK-IDEMPOTENCY] Insert error:", error.code, error.message);
    return { acquired: true };
  }

  return { acquired: true, eventRecordId: data?.id };
}

/**
 * Mark a webhook event as successfully processed.
 */
export async function markWebhookProcessed(
  supabase: SupabaseClient,
  eventId: string,
  source: WebhookSource
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("webhook_events")
    .update({
      status: "processed",
      processing_completed_at: now,
      processed_at: now,
    })
    .eq("event_id", eventId)
    .eq("source", source);
}

/**
 * Mark a webhook event as failed (for retry visibility).
 */
export async function markWebhookFailed(
  supabase: SupabaseClient,
  eventId: string,
  source: WebhookSource,
  errorMessage: string
): Promise<void> {
  await supabase
    .from("webhook_events")
    .update({
      status: "failed",
      processing_completed_at: new Date().toISOString(),
      error_message: errorMessage.substring(0, 500),
    })
    .eq("event_id", eventId)
    .eq("source", source);
}
