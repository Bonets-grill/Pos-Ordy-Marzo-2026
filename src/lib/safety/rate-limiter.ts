/**
 * In-memory rate limiter for WhatsApp webhook spam protection.
 *
 * Tracks message count per phone number with configurable window.
 * Uses Map with periodic cleanup of expired entries.
 *
 * Design:
 *   - 20 messages per minute per phone (default)
 *   - Returns 200 OK to webhook but skips processing (don't reveal to spammer)
 *   - Entries auto-expire after window passes
 *   - Periodic cleanup every 5 minutes to prevent memory leak
 */

interface RateBucket {
  count: number;
  window_start: number;
}

const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

const buckets = new Map<string, RateBucket>();
let lastCleanup = Date.now();

/**
 * Check if a phone number is rate limited.
 * Returns true if the request should be ALLOWED, false if RATE LIMITED.
 */
export function checkRateLimit(
  phone: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();

  // Periodic cleanup of expired entries
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.window_start > windowMs * 2) {
        buckets.delete(key);
      }
    }
    lastCleanup = now;
  }

  const bucket = buckets.get(phone);

  if (!bucket || now - bucket.window_start > windowMs) {
    // New window
    buckets.set(phone, { count: 1, window_start: now });
    return true;
  }

  if (bucket.count >= maxRequests) {
    // Rate limited
    return false;
  }

  // Increment
  bucket.count++;
  return true;
}

/**
 * Get current rate limit status for a phone (for observability).
 */
export function getRateLimitStatus(phone: string): { count: number; remaining: number; reset_ms: number } | null {
  const bucket = buckets.get(phone);
  if (!bucket) return null;

  const elapsed = Date.now() - bucket.window_start;
  if (elapsed > DEFAULT_WINDOW_MS) return null;

  return {
    count: bucket.count,
    remaining: Math.max(0, DEFAULT_MAX_REQUESTS - bucket.count),
    reset_ms: DEFAULT_WINDOW_MS - elapsed,
  };
}

/**
 * Clear rate limit for a phone (for testing).
 */
export function clearRateLimit(phone?: string): void {
  if (phone) {
    buckets.delete(phone);
  } else {
    buckets.clear();
  }
}
