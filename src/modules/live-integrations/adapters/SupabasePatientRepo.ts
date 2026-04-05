/**
 * SupabasePatientRepo — Real Supabase implementation of PatientRepository.
 * Satisfies the interface shape from locked persistence-api module.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PatientEntity {
  id: string;
  tenantId: string;
  patientId: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  contactEmail: string | null;
  contactPhone: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type Result<T> =
  | { ok: true; data: T; meta?: { totalCount?: number } }
  | { ok: false; error: { code: string; message: string } };

export class SupabasePatientRepo {
  readonly name = 'SupabasePatientRepo';
  readonly isMock = false;

  constructor(private client: SupabaseClient) {}

  async findById(tenantId: string, patientCode: string): Promise<Result<PatientEntity>> {
    const { data, error } = await this.client
      .from('patients')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('patient_code', patientCode)
      .single();
    if (error) return { ok: false, error: { code: 'NOT_FOUND', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  async findAll(tenantId: string, pagination?: { page: number; pageSize: number }): Promise<Result<PatientEntity[]>> {
    let query = this.client.from('patients').select('*', { count: 'exact' }).eq('tenant_id', tenantId);
    if (pagination) {
      const from = (pagination.page - 1) * pagination.pageSize;
      query = query.range(from, from + pagination.pageSize - 1);
    }
    const { data, error, count } = await query;
    if (error) return { ok: false, error: { code: 'QUERY_FAILED', message: error.message } };
    return { ok: true, data: (data ?? []).map(d => this.map(d)), meta: { totalCount: count ?? 0 } };
  }

  async create(input: { tenantId: string; name: string; dateOfBirth: string; gender: string; contactEmail?: string; contactPhone?: string }): Promise<Result<PatientEntity>> {
    const patientCode = `pid_${Date.now()}`;
    const { data, error } = await this.client
      .from('patients')
      .insert({
        tenant_id: input.tenantId,
        patient_code: patientCode,
        name: input.name,
        date_of_birth: input.dateOfBirth,
        gender: input.gender,
        contact_email: input.contactEmail ?? null,
        contact_phone: input.contactPhone ?? null,
      })
      .select()
      .single();
    if (error) return { ok: false, error: { code: 'INSERT_FAILED', message: error.message } };
    return { ok: true, data: this.map(data) };
  }

  private map(row: Record<string, unknown>): PatientEntity {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      patientId: row.patient_code as string,
      name: row.name as string,
      dateOfBirth: (row.date_of_birth as string) ?? '',
      gender: (row.gender as string) ?? '',
      contactEmail: (row.contact_email as string) ?? null,
      contactPhone: (row.contact_phone as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
