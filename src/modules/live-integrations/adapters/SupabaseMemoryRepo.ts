import type { SupabaseClient } from '@supabase/supabase-js';

export type MemoryItemType = 'allergy' | 'chronic_condition' | 'medication' | 'procedure' | 'family_history' | 'social_history' | 'vital_sign' | 'lab_result' | 'symptom' | 'diagnosis' | 'note';
export type MemorySeverity = 'low' | 'medium' | 'high' | 'critical';
export type MemoryStatus = 'active' | 'resolved' | 'archived';

export interface MemoryItemEntity {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  type: MemoryItemType;
  title: string;
  description: string;
  severity: MemorySeverity;
  status: MemoryStatus;
  tags: string[];
  sourceSessionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export class SupabaseMemoryRepo {
  readonly name = 'SupabaseMemoryRepo';
  readonly isMock = false;

  constructor(private client: SupabaseClient) {}

  async findByPatient(tenantId: string, patientId: string): Promise<Result<MemoryItemEntity[]>> {
    const { data, error } = await this.client
      .from('memory_items').select('*')
      .eq('tenant_id', tenantId).eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: { code: 'QUERY_FAILED', message: error.message } };
    return { ok: true, data: (data ?? []).map(r => this.map(r)) };
  }

  async findById(tenantId: string, id: string): Promise<Result<MemoryItemEntity>> {
    const { data, error } = await this.client
      .from('memory_items').select('*').eq('tenant_id', tenantId).eq('id', id).single();
    if (error) return { ok: false, error: { code: 'NOT_FOUND', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async create(input: { tenantId: string; patientId: string; doctorId: string; type: MemoryItemType; title: string; description: string; severity: MemorySeverity; tags?: string[]; sourceSessionId?: string }): Promise<Result<MemoryItemEntity>> {
    const { data, error } = await this.client
      .from('memory_items')
      .insert({
        tenant_id: input.tenantId,
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        item_type: input.type,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: 'active',
        tags: input.tags ?? [],
        source_session_id: input.sourceSessionId ?? null,
      })
      .select().single();
    if (error) return { ok: false, error: { code: 'INSERT_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async archive(tenantId: string, id: string): Promise<Result<MemoryItemEntity>> {
    const { data, error } = await this.client
      .from('memory_items').update({ status: 'archived' }).eq('tenant_id', tenantId).eq('id', id)
      .select().single();
    if (error) return { ok: false, error: { code: 'UPDATE_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  private map(row: Record<string, unknown>): MemoryItemEntity {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      patientId: row.patient_id as string,
      doctorId: (row.doctor_id as string) ?? '',
      type: row.item_type as MemoryItemType,
      title: row.title as string,
      description: (row.description as string) ?? '',
      severity: (row.severity as MemorySeverity) ?? 'low',
      status: (row.status as MemoryStatus) ?? 'active',
      tags: (row.tags as string[]) ?? [],
      sourceSessionId: (row.source_session_id as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
