import type { SupabaseClient } from '@supabase/supabase-js';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface SessionEntity {
  id: string;
  tenantId: string;
  sessionId: string;
  patientId: string;
  doctorId: string;
  consultationMode: string;
  language: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export class SupabaseSessionRepo {
  readonly name = 'SupabaseSessionRepo';
  readonly isMock = false;

  constructor(private client: SupabaseClient) {}

  async findById(tenantId: string, sessionCode: string): Promise<Result<SessionEntity>> {
    const { data, error } = await this.client
      .from('sessions').select('*').eq('tenant_id', tenantId).eq('session_code', sessionCode).single();
    if (error) return { ok: false, error: { code: 'NOT_FOUND', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async findByPatient(tenantId: string, patientUuid: string): Promise<Result<SessionEntity[]>> {
    const { data, error } = await this.client
      .from('sessions').select('*').eq('tenant_id', tenantId).eq('patient_id', patientUuid)
      .order('started_at', { ascending: false });
    if (error) return { ok: false, error: { code: 'QUERY_FAILED', message: error.message } };
    return { ok: true, data: (data ?? []).map(r => this.map(r)) };
  }

  async create(input: { tenantId: string; patientId: string; doctorId: string; consultationMode: string; language: string }): Promise<Result<SessionEntity>> {
    const sessionCode = `sid_${Date.now()}`;
    const { data, error } = await this.client
      .from('sessions')
      .insert({
        tenant_id: input.tenantId,
        session_code: sessionCode,
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        consultation_mode: input.consultationMode,
        language: input.language,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select().single();
    if (error) return { ok: false, error: { code: 'INSERT_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async updateStatus(tenantId: string, sessionCode: string, status: SessionStatus): Promise<Result<SessionEntity>> {
    const update: Record<string, unknown> = { status };
    if (status === 'completed' || status === 'cancelled') update.ended_at = new Date().toISOString();
    const { data, error } = await this.client
      .from('sessions').update(update).eq('tenant_id', tenantId).eq('session_code', sessionCode).select().single();
    if (error) return { ok: false, error: { code: 'UPDATE_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  private map(row: Record<string, unknown>): SessionEntity {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      sessionId: row.session_code as string,
      patientId: (row.patient_id as string) ?? '',
      doctorId: (row.doctor_id as string) ?? '',
      consultationMode: (row.consultation_mode as string) ?? 'general',
      language: (row.language as string) ?? 'es-ES',
      status: (row.status as SessionStatus) ?? 'active',
      startedAt: row.started_at as string,
      endedAt: (row.ended_at as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
