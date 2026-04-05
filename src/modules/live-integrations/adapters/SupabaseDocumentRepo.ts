import type { SupabaseClient } from '@supabase/supabase-js';

export type DocumentType = 'transcript' | 'encounter_note' | 'soap_note' | 'clinical_summary' | 'followup_note';

export interface DocumentEntity {
  id: string;
  tenantId: string;
  documentId: string;
  sessionId: string;
  patientId: string;
  doctorId: string;
  type: DocumentType;
  title: string;
  content: string;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export class SupabaseDocumentRepo {
  readonly name = 'SupabaseDocumentRepo';
  readonly isMock = false;

  constructor(private client: SupabaseClient) {}

  async findById(tenantId: string, documentId: string): Promise<Result<DocumentEntity>> {
    const { data, error } = await this.client
      .from('documents').select('*').eq('tenant_id', tenantId).eq('id', documentId).single();
    if (error) return { ok: false, error: { code: 'NOT_FOUND', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async findBySession(tenantId: string, sessionId: string): Promise<Result<DocumentEntity[]>> {
    const { data, error } = await this.client
      .from('documents').select('*').eq('tenant_id', tenantId).eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: { code: 'QUERY_FAILED', message: error.message } };
    return { ok: true, data: (data ?? []).map(r => this.map(r)) };
  }

  async findByPatient(tenantId: string, patientId: string): Promise<Result<DocumentEntity[]>> {
    const { data, error } = await this.client
      .from('documents').select('*').eq('tenant_id', tenantId).eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, error: { code: 'QUERY_FAILED', message: error.message } };
    return { ok: true, data: (data ?? []).map(r => this.map(r)) };
  }

  async create(input: { tenantId: string; sessionId: string; patientId: string; doctorId: string; type: DocumentType; title: string; content: string }): Promise<Result<DocumentEntity>> {
    const { data, error } = await this.client
      .from('documents')
      .insert({
        tenant_id: input.tenantId,
        session_id: input.sessionId,
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        doc_type: input.type,
        title: input.title,
        content: input.content,
        version: 1,
      })
      .select().single();
    if (error) return { ok: false, error: { code: 'INSERT_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async updateContent(tenantId: string, documentId: string, content: string): Promise<Result<DocumentEntity>> {
    const current = await this.findById(tenantId, documentId);
    if (!current.ok) return current;
    const { data, error } = await this.client
      .from('documents')
      .update({ content, version: current.data.version + 1 })
      .eq('tenant_id', tenantId).eq('id', documentId)
      .select().single();
    if (error) return { ok: false, error: { code: 'UPDATE_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  private map(row: Record<string, unknown>): DocumentEntity {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      documentId: row.id as string,
      sessionId: (row.session_id as string) ?? '',
      patientId: (row.patient_id as string) ?? '',
      doctorId: (row.doctor_id as string) ?? '',
      type: row.doc_type as DocumentType,
      title: (row.title as string) ?? '',
      content: (row.content as string) ?? '',
      version: (row.version as number) ?? 1,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
