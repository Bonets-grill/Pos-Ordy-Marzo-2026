/**
 * SupabaseAuthAdapter — Real authentication using Supabase Auth.
 * Implements the AuthProvider interface shape from locked auth-rbac.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type PlatformRole = 'super_admin' | 'org_admin' | 'doctor' | 'clinician' | 'staff' | 'viewer';

export interface AuthenticatedActor {
  userId: string;
  email: string;
  displayName: string;
  role: PlatformRole;
  tenantId: string | null;
  tenantName: string | null;
  avatarUrl: string | null;
}

export class SupabaseAuthAdapter {
  readonly name = 'SupabaseAuthAdapter';
  readonly isMock = false;

  constructor(private client: SupabaseClient) {}

  async signIn(email: string, password: string): Promise<AuthenticatedActor | null> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    return this.loadActor(data.user.id);
  }

  async signUp(email: string, password: string, displayName: string, tenantId: string | null): Promise<AuthenticatedActor | null> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error || !data.user) return null;

    // Create profile row
    const { error: profileError } = await this.client
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        display_name: displayName,
        role: 'viewer',
        tenant_id: tenantId,
      });
    if (profileError) return null;

    return this.loadActor(data.user.id);
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async getCurrentActor(): Promise<AuthenticatedActor | null> {
    const { data } = await this.client.auth.getUser();
    if (!data.user) return null;
    return this.loadActor(data.user.id);
  }

  async validateToken(tokenId: string): Promise<boolean> {
    const { data, error } = await this.client.auth.getUser(tokenId);
    return !error && !!data.user;
  }

  private async loadActor(userId: string): Promise<AuthenticatedActor | null> {
    const { data: profile, error } = await this.client
      .from('profiles')
      .select('*, tenant:tenants(id, name)')
      .eq('id', userId)
      .single();

    if (error || !profile) return null;

    return {
      userId: profile.id as string,
      email: profile.email as string,
      displayName: (profile.display_name as string) ?? (profile.email as string),
      role: (profile.role as PlatformRole) ?? 'viewer',
      tenantId: (profile.tenant_id as string) ?? null,
      tenantName: ((profile.tenant as { name?: string } | null)?.name) ?? null,
      avatarUrl: (profile.avatar_url as string) ?? null,
    };
  }

  destroy(): void {
    // noop
  }
}
