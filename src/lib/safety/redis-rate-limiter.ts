/**
 * Distributed Redis Rate Limiter for WhatsApp webhook spam protection.
 *
 * Uses Redis INCR + EXPIRE pattern for atomic counter per phone.
 * Compatible with Upstash Redis (HTTP-based, serverless-friendly).
 *
 * Key format: wa_rate_limit:{phone}
 * Algorithm: INCR key → if first request, EXPIRE 60s → check count ≤ limit
 *
 * Fallback: If Redis is unavailable (no REDIS_URL, connection error),
 * falls back to the existing in-memory rate limiter transparently.
 *
 * Feature flag: redis_rate_limiter
 *   - true: use Redis (with in-memory fallback on error)
 *   - false: use in-memory only
 *
 * Env vars:
 *   REDIS_URL — Upstash Redis REST URL (e.g., https://xxx.upstash.io)
 *   REDIS_TOKEN — Upstash Redis REST token
 */

import { checkRateLimit as inMemoryCheckRateLimit, getRateLimitStatus as inMemoryGetStatus } from "./rate-limiter";

const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_WINDOW_SECONDS = 60;

/**
 * Get Redis configuration from environment.
 * Returns null if Redis is not configured.
 */
function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

/**
 * Execute a Redis command via Upstash REST API.
 * Returns the result or null on error.
 */
async function redisCommand(config: { url: string; token: string }, args: (string | number)[]): Promise<unknown | null> {
  try {
    const res = await fetch(`${config.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (!res.ok) {
      console.error(`[REDIS-RL] HTTP ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json() as { result?: unknown };
    return data.result ?? null;
  } catch (err) {
    console.error("[REDIS-RL] Connection error:", (err as Error).message);
    return null;
  }
}

/**
 * Check rate limit using Redis.
 *
 * Returns true if the request should be ALLOWED, false if RATE LIMITED.
 *
 * Algorithm (atomic via Redis pipeline):
 *   1. INCR wa_rate_limit:{phone}  → returns new count
 *   2. If count === 1 → EXPIRE key {window}  (first request in window)
 *   3. If count > limit → rate limited
 *
 * If Redis fails at any point, falls back to in-memory limiter.
 */
export async function checkDistributedRateLimit(
  phone: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowSeconds: number = DEFAULT_WINDOW_SECONDS
): Promise<boolean> {
  const config = getRedisConfig();
  if (!config) {
    // No Redis configured — use in-memory fallback
    return inMemoryCheckRateLimit(phone, maxRequests, windowSeconds * 1000);
  }

  try {
    // INCR atomically increments and returns the new value
    const key = `wa_rate_limit:${phone}`;
    const count = await redisCommand(config, ["INCR", key]);

    if (count === null) {
      // Redis error — fall back to in-memory
      return inMemoryCheckRateLimit(phone, maxRequests, windowSeconds * 1000);
    }

    const currentCount = typeof count === "number" ? count : parseInt(String(count), 10);

    // If this is the first request in the window, set TTL
    if (currentCount === 1) {
      await redisCommand(config, ["EXPIRE", key, windowSeconds]);
    }

    return currentCount <= maxRequests;
  } catch (err) {
    console.error("[REDIS-RL] Unexpected error:", (err as Error).message);
    // Fail-open: fall back to in-memory
    return inMemoryCheckRateLimit(phone, maxRequests, windowSeconds * 1000);
  }
}

/**
 * Get rate limit status for observability.
 * Returns current count, remaining quota, and TTL.
 */
export async function getDistributedRateLimitStatus(
  phone: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS
): Promise<{ count: number; remaining: number; ttl_seconds: number } | null> {
  const config = getRedisConfig();
  if (!config) {
    // Use in-memory status
    const memStatus = inMemoryGetStatus(phone);
    if (!memStatus) return null;
    return {
      count: memStatus.count,
      remaining: memStatus.remaining,
      ttl_seconds: Math.ceil(memStatus.reset_ms / 1000),
    };
  }

  try {
    const key = `wa_rate_limit:${phone}`;
    const count = await redisCommand(config, ["GET", key]);
    const ttl = await redisCommand(config, ["TTL", key]);

    if (count === null) return null;

    const currentCount = typeof count === "number" ? count : parseInt(String(count), 10) || 0;
    const currentTtl = typeof ttl === "number" ? ttl : parseInt(String(ttl), 10) || 0;

    return {
      count: currentCount,
      remaining: Math.max(0, maxRequests - currentCount),
      ttl_seconds: Math.max(0, currentTtl),
    };
  } catch {
    return null;
  }
}
