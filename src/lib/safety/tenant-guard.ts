/**
 * Tenant Isolation Guard
 *
 * Defense-in-depth: verifies that a user belongs to the tenant
 * they're trying to access, independent of RLS policies.
 *
 * Use cases:
 *   - API routes that accept tenant_id in the request body
 *   - Admin actions that operate on specific tenants
 *   - Preventing IDOR (Insecure Direct Object Reference) attacks
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify that a user belongs to a specific tenant.
 * Returns true if the user has access to the tenant.
 *
 * Super admins have access to all tenants.
 */
export async function assertTenantAccess(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: user } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", userId)
    .single();

  if (!user) {
    return { allowed: false, reason: "user_not_found" };
  }

  // Super admins can access any tenant
  if (user.role === "super_admin") {
    return { allowed: true };
  }

  // Regular users must belong to the tenant
  if (user.tenant_id !== tenantId) {
    return { allowed: false, reason: `tenant_mismatch: user belongs to ${user.tenant_id}, requested ${tenantId}` };
  }

  return { allowed: true };
}
