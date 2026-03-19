/**
 * Runtime feature flag system.
 * Backed by DB (feature_flags table) with in-memory cache (60s TTL).
 * Emergency disable: set env FEATURE_FLAGS_DISABLED=true to disable all flags.
 *
 * Usage:
 *   const enabled = await isFeatureEnabled(supabase, 'wa_transactional_orders');
 *   if (enabled) { ... new behavior ... } else { ... fallback ... }
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface CachedFlag {
  enabled: boolean;
  cached_at: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds
const flagCache = new Map<string, CachedFlag>();

/**
 * Check if all feature flags are disabled via env (emergency kill switch).
 */
function isGloballyDisabled(): boolean {
  return process.env.FEATURE_FLAGS_DISABLED === "true";
}

/**
 * Check if a feature flag is enabled.
 * Returns false if:
 *   - Global disable is active
 *   - Flag doesn't exist in DB
 *   - Flag is explicitly disabled
 *   - DB query fails (safe default = off)
 *
 * @param supabase - Service client (bypasses RLS)
 * @param key - Flag key (e.g., 'wa_transactional_orders')
 * @param tenantId - Optional tenant-scoped flag
 */
export async function isFeatureEnabled(
  supabase: SupabaseClient,
  key: string,
  tenantId?: string
): Promise<boolean> {
  if (isGloballyDisabled()) return false;

  const cacheKey = tenantId ? `${key}:${tenantId}` : key;

  // Check cache
  const cached = flagCache.get(cacheKey);
  if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
    return cached.enabled;
  }

  try {
    // Query DB — try tenant-scoped first, then global
    let query = supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data } = await query.single();

    const enabled = !!(data as { enabled: boolean } | null)?.enabled;

    // Cache result
    flagCache.set(cacheKey, { enabled, cached_at: Date.now() });

    return enabled;
  } catch {
    // On error, check global flag if tenant-scoped failed
    if (tenantId) {
      return isFeatureEnabled(supabase, key);
    }
    // Safe default: disabled
    flagCache.set(cacheKey, { enabled: false, cached_at: Date.now() });
    return false;
  }
}

/**
 * Clear the flag cache (useful for tests or after flag updates).
 */
export function clearFlagCache(): void {
  flagCache.clear();
}
