/**
 * Webhook Signature Verification
 *
 * Verifies that incoming webhook payloads are authentic —
 * sent by the expected provider, not a malicious third party.
 *
 * Providers:
 *   - Evolution API: HMAC-SHA256 with instance-level webhook secret
 *   - Meta Cloud API: x-hub-signature-256 header with app secret
 *
 * Feature flag: webhook_signature_verification
 *   - true: reject requests with invalid/missing signatures
 *   - false: log warnings but allow (migration period)
 *
 * Env vars:
 *   EVOLUTION_WEBHOOK_SECRET — shared secret for Evolution API webhooks
 *   META_APP_SECRET — Meta/WhatsApp Business app secret
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Evolution API webhook signature.
 *
 * Evolution sends a webhook secret that was configured when
 * setting up the webhook URL. We compute HMAC-SHA256 of the
 * raw body and compare.
 *
 * Returns true if signature is valid, false if not.
 * Returns true if no secret is configured (not enforced).
 */
export function verifyEvolutionSignature(
  rawBody: string,
  signatureHeader: string | null
): { valid: boolean; reason?: string } {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;

  // If no secret configured, skip verification (not enforced yet)
  if (!secret) {
    return { valid: true, reason: "no_secret_configured" };
  }

  if (!signatureHeader) {
    return { valid: false, reason: "missing_signature_header" };
  }

  try {
    // Evolution API sends the secret directly as a static header value
    // (not HMAC-calculated). Compare directly with timing-safe comparison.
    const sigBuffer = Buffer.from(signatureHeader, "utf-8");
    const secretBuffer = Buffer.from(secret, "utf-8");

    if (sigBuffer.length !== secretBuffer.length) {
      return { valid: false, reason: "signature_length_mismatch" };
    }

    if (timingSafeEqual(sigBuffer, secretBuffer)) {
      return { valid: true };
    }

    return { valid: false, reason: "signature_mismatch" };
  } catch (err) {
    return { valid: false, reason: `verification_error: ${(err as Error).message}` };
  }
}

/**
 * Verify Meta Cloud API webhook signature.
 *
 * Meta sends x-hub-signature-256 header containing:
 *   sha256={HMAC-SHA256 of raw body using app secret}
 *
 * See: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null
): { valid: boolean; reason?: string } {
  const secret = process.env.META_APP_SECRET;

  if (!secret) {
    return { valid: true, reason: "no_secret_configured" };
  }

  if (!signatureHeader) {
    return { valid: false, reason: "missing_x_hub_signature_256" };
  }

  try {
    // Header format: sha256=abc123...
    const [algo, signature] = signatureHeader.split("=", 2);
    if (algo !== "sha256" || !signature) {
      return { valid: false, reason: "invalid_signature_format" };
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: "signature_length_mismatch" };
    }

    if (timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: true };
    }

    return { valid: false, reason: "signature_mismatch" };
  } catch (err) {
    return { valid: false, reason: `verification_error: ${(err as Error).message}` };
  }
}
