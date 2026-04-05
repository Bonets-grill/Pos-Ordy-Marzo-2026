import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditCategory = 'auth' | 'access' | 'data_read' | 'data_write' | 'data_delete' | 'session' | 'clinical' | 'admin' | 'security' | 'system';

export interface AuditEventRow {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  category: AuditCategory;
  severity: string;
  sensitivity: string;
  retention: string;
  action: string;
  description: string | null;
  patientId: string | null;
  sessionId: string | null;
  moduleId: string | null;
  decision: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class SupabaseAuditRepo {
  readonly name = 'SupabaseAuditRepo';
  readonly isMock = false;

  constructor(private client: SupabaseClient) {}

  async record(input: {
    tenantId: string | null;
    actorUserId: string | null;
    actorEmail: string;
    actorRole: string;
    category: AuditCategory;
    severity?: string;
    sensitivity?: string;
    retention?: string;
    action: string;
    description?: string;
    patientId?: string;
    sessionId?: string;
    moduleId?: string;
    decision?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    const { data, error } = await this.client
      .from('audit_events')
      .insert({
        tenant_id: input.tenantId,
        actor_user_id: input.actorUserId,
        actor_email: input.actorEmail,
        actor_role: input.actorRole,
        category: input.category,
        severity: input.severity ?? 'info',
        sensitivity: input.sensitivity ?? 'internal',
        retention: input.retention ?? 'standard',
        action: input.action,
        description: input.description,
        patient_id: input.patientId,
        session_id: input.sessionId,
        module_id: input.moduleId,
        decision: input.decision,
        metadata: input.metadata ?? {},
      })
      .select('id').single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id as string };
  }

  async query(filter: { tenantId?: string; patientId?: string; sessionId?: string; category?: AuditCategory; limit?: number }): Promise<AuditEventRow[]> {
    let q = this.client.from('audit_events').select('*').order('created_at', { ascending: false });
    if (filter.tenantId) q = q.eq('tenant_id', filter.tenantId);
    if (filter.patientId) q = q.eq('patient_id', filter.patientId);
    if (filter.sessionId) q = q.eq('session_id', filter.sessionId);
    if (filter.category) q = q.eq('category', filter.category);
    if (filter.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []).map(r => this.map(r));
  }

  private map(row: Record<string, unknown>): AuditEventRow {
    return {
      id: row.id as string,
      tenantId: (row.tenant_id as string) ?? null,
      actorUserId: (row.actor_user_id as string) ?? null,
      actorEmail: (row.actor_email as string) ?? null,
      actorRole: (row.actor_role as string) ?? null,
      category: row.category as AuditCategory,
      severity: (row.severity as string) ?? 'info',
      sensitivity: (row.sensitivity as string) ?? 'internal',
      retention: (row.retention as string) ?? 'standard',
      action: row.action as string,
      description: (row.description as string) ?? null,
      patientId: (row.patient_id as string) ?? null,
      sessionId: (row.session_id as string) ?? null,
      moduleId: (row.module_id as string) ?? null,
      decision: (row.decision as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
    };
  }
}
