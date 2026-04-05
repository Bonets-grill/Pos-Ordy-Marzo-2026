import { describe, it, expect } from 'vitest';

describe('Live Integrations — Barrel Exports', () => {
  it('adapters barrel exports', async () => {
    const m = await import('../adapters');
    expect(m.SupabasePatientRepo).toBeDefined();
    expect(m.SupabaseSessionRepo).toBeDefined();
    expect(m.SupabaseDocumentRepo).toBeDefined();
    expect(m.SupabaseMemoryRepo).toBeDefined();
    expect(m.SupabaseAuditRepo).toBeDefined();
    expect(m.SupabaseAuthAdapter).toBeDefined();
    expect(m.ClaudeNoteProvider).toBeDefined();
    expect(m.WhisperTranscriptionProvider).toBeDefined();
  });

  it('audio barrel exports', async () => {
    const m = await import('../audio');
    expect(m.MediaRecorderCapture).toBeDefined();
  });

  it('services barrel exports', async () => {
    const m = await import('../services');
    expect(m.LiveModeService).toBeDefined();
  });

  it('main index exports', async () => {
    const m = await import('../index');
    expect(m.SupabasePatientRepo).toBeDefined();
    expect(m.ClaudeNoteProvider).toBeDefined();
    expect(m.WhisperTranscriptionProvider).toBeDefined();
    expect(m.MediaRecorderCapture).toBeDefined();
    expect(m.LiveModeService).toBeDefined();
    expect(m.getSupabaseClient).toBeDefined();
    expect(m.isSupabaseConfigured).toBeDefined();
  });
});
