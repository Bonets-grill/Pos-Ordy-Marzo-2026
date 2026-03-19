/**
 * Idempotency layer for notifications and webhook processing.
 * Uses notification_log table with unique idempotency_key.
 * Prevents duplicate WhatsApp messages to customers on retries.
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generate a deterministic idempotency key for a notification.
 * Key format: {order_id}:{notification_type}
 * This ensures the same notification for the same order is never sent twice.
 */
export function generateNotificationKey(orderId: string, notificationType: string): string {
  return `${orderId}:${notificationType}`;
}

/**
 * Check if a notification has already been sent.
 * Returns true if the notification should be SKIPPED (already sent).
 */
export async function isNotificationSent(
  supabase: SupabaseClient,
  idempotencyKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .single();

  return !!data;
}

/**
 * Record a sent notification for idempotency.
 */
export async function recordNotification(
  supabase: SupabaseClient,
  params: {
    idempotencyKey: string;
    orderId: string;
    notificationType: string;
    tenantId: string;
    phone: string;
    responseStatus?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("notification_log").upsert(
    {
      idempotency_key: params.idempotencyKey,
      order_id: params.orderId,
      notification_type: params.notificationType,
      tenant_id: params.tenantId,
      phone: params.phone,
      response_status: params.responseStatus || "sent",
      metadata: params.metadata || {},
    },
    { onConflict: "idempotency_key" }
  );
}

/**
 * Check-and-record in one call. Returns true if notification should PROCEED.
 * Returns false if already sent (skip).
 */
export async function acquireNotificationLock(
  supabase: SupabaseClient,
  params: {
    orderId: string;
    notificationType: string;
    tenantId: string;
    phone: string;
  }
): Promise<boolean> {
  const key = generateNotificationKey(params.orderId, params.notificationType);

  // Try to insert — if conflict, it was already sent
  const { error } = await supabase.from("notification_log").insert({
    idempotency_key: key,
    order_id: params.orderId,
    notification_type: params.notificationType,
    tenant_id: params.tenantId,
    phone: params.phone,
    response_status: "pending",
  });

  if (error) {
    // unique constraint violation = already sent
    if (error.code === "23505") return false;
    // other errors — allow sending (fail-open for notifications)
    console.error("[IDEMPOTENCY] Insert error:", error.message);
    return true;
  }

  return true;
}

/**
 * Mark a pending notification as completed.
 */
export async function markNotificationSent(
  supabase: SupabaseClient,
  orderId: string,
  notificationType: string
): Promise<void> {
  const key = generateNotificationKey(orderId, notificationType);
  await supabase
    .from("notification_log")
    .update({ response_status: "sent", sent_at: new Date().toISOString() })
    .eq("idempotency_key", key);
}
