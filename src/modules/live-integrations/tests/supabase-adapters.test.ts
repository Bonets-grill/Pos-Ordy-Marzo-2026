import { describe, it, expect, vi } from 'vitest';
import { SupabasePatientRepo } from '../adapters/SupabasePatientRepo';
import { SupabaseSessionRepo } from '../adapters/SupabaseSessionRepo';
import { SupabaseDocumentRepo } from '../adapters/SupabaseDocumentRepo';
import { SupabaseMemoryRepo } from '../adapters/SupabaseMemoryRepo';
import { SupabaseAuditRepo } from '../adapters/SupabaseAuditRepo';
import { SupabaseAuthAdapter } from '../adapters/SupabaseAuthAdapter';

// Helper: create a fully chainable mock Supabase client
function makeMockClient(responses: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  const createChain = (tableName: string) => {
    const resp = responses[tableName];
    const obj: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'insert', 'update', 'delete', 'order', 'range', 'limit'];
    for (const m of methods) obj[m] = vi.fn().mockReturnValue(obj);
    obj.single = vi.fn().mockResolvedValue(resp);
    obj.then = (fn: (r: unknown) => unknown) => Promise.resolve(fn(resp));
    return obj;
  };
  return {
    from: vi.fn((table: string) => {
      if (!chain[table]) chain[table] = createChain(table);
      return chain[table];
    }),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn(),
    },
  };
}

describe('SupabasePatientRepo', () => {
  it('findById returns mapped entity', async () => {
    const client = makeMockClient({
      patients: { data: { id: 'u1', tenant_id: 't1', patient_code: 'pid_1', name: 'Maria', date_of_birth: '1990-01-01', gender: 'F', contact_email: null, contact_phone: null, metadata: {}, created_at: '2026-01-01', updated_at: '2026-01-01' }, error: null },
    });
    const repo = new SupabasePatientRepo(client as never);
    const r = await repo.findById('t1', 'pid_1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).toBe('Maria');
  });

  it('findById returns error on not found', async () => {
    const client = makeMockClient({
      patients: { data: null, error: { message: 'not found' } },
    });
    const repo = new SupabasePatientRepo(client as never);
    const r = await repo.findById('t1', 'nope');
    expect(r.ok).toBe(false);
  });

  it('name/isMock flags', () => {
    const client = makeMockClient({});
    const repo = new SupabasePatientRepo(client as never);
    expect(repo.name).toBe('SupabasePatientRepo');
    expect(repo.isMock).toBe(false);
  });
});

describe('SupabaseSessionRepo', () => {
  it('identifies as real provider', () => {
    const repo = new SupabaseSessionRepo(makeMockClient({}) as never);
    expect(repo.isMock).toBe(false);
  });

  it('findById returns session', async () => {
    const client = makeMockClient({
      sessions: { data: { id: 's_uuid', tenant_id: 't1', session_code: 'sid_1', patient_id: 'p1', doctor_id: 'd1', consultation_mode: 'general', language: 'es-ES', status: 'active', started_at: '2026-01-01', ended_at: null, metadata: {}, created_at: '', updated_at: '' }, error: null },
    });
    const repo = new SupabaseSessionRepo(client as never);
    const r = await repo.findById('t1', 'sid_1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.sessionId).toBe('sid_1');
  });
});

describe('SupabaseDocumentRepo', () => {
  it('identifies as real provider', () => {
    const repo = new SupabaseDocumentRepo(makeMockClient({}) as never);
    expect(repo.isMock).toBe(false);
  });
});

describe('SupabaseMemoryRepo', () => {
  it('identifies as real provider', () => {
    const repo = new SupabaseMemoryRepo(makeMockClient({}) as never);
    expect(repo.isMock).toBe(false);
  });
});

describe('SupabaseAuditRepo', () => {
  it('identifies as real provider', () => {
    const repo = new SupabaseAuditRepo(makeMockClient({}) as never);
    expect(repo.isMock).toBe(false);
  });
});

describe('SupabaseAuthAdapter', () => {
  it('identifies as real provider', () => {
    const adapter = new SupabaseAuthAdapter(makeMockClient({}) as never);
    expect(adapter.isMock).toBe(false);
  });

  it('signIn returns null on error', async () => {
    const client = makeMockClient({});
    client.auth.signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'fail' } });
    const adapter = new SupabaseAuthAdapter(client as never);
    const r = await adapter.signIn('wrong@email.com', 'wrong');
    expect(r).toBeNull();
  });
});
