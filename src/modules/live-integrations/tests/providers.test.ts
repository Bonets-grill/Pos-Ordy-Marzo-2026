import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeNoteProvider } from '../adapters/ClaudeNoteProvider';
import { WhisperTranscriptionProvider } from '../adapters/WhisperTranscriptionProvider';

describe('ClaudeNoteProvider', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'test-key-fake'; });
  afterEach(() => { process.env.ANTHROPIC_API_KEY = originalKey; });

  it('requires API key', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new ClaudeNoteProvider()).toThrow('ANTHROPIC_API_KEY');
  });

  it('identifies as real provider', () => {
    const p = new ClaudeNoteProvider('test-key');
    expect(p.isMock).toBe(false);
    expect(p.name).toBe('ClaudeNoteProvider');
  });

  it('isAvailable returns true when key is set', async () => {
    const p = new ClaudeNoteProvider('test-key');
    expect(await p.isAvailable()).toBe(true);
  });

  it('generateNote calls Claude and parses sections', async () => {
    const p = new ClaudeNoteProvider('test-key');
    const fakeResponse = {
      content: [{ type: 'text', text: 'SUMMARY:\nS text\n\nSUBJECTIVE:\nSub text\n\nOBJECTIVE:\nObj text\n\nASSESSMENT:\nAss text\n\nPLAN:\nPlan text\n\nADDITIONAL NOTES:\nAdd text' }],
      usage: { input_tokens: 100, output_tokens: 200 },
    };
    // @ts-expect-error mocking private client
    p.client = { messages: { create: vi.fn().mockResolvedValue(fakeResponse) } };

    const note = await p.generateNote({
      sessionId: 's1', tenantId: 't1', patientId: 'p1',
      patientName: 'Maria', doctorName: 'Garcia', language: 'en-US',
      consultationMode: 'general', transcript: 'Headache for 3 days.',
      template: 'soap',
    });
    expect(note.template).toBe('soap');
    expect(note.title).toBe('SOAP Note');
    expect(note.sections.summary).toContain('S text');
    expect(note.sections.plan).toContain('Plan text');
    expect(note.tokensUsed).toBe(300);
  });

  it('parses Spanish sections', async () => {
    const p = new ClaudeNoteProvider('test-key');
    const fakeResponse = {
      content: [{ type: 'text', text: 'RESUMEN:\nRes texto\n\nSUBJETIVO:\nSub texto\n\nOBJETIVO:\nObj texto\n\nEVALUACION:\nEval texto\n\nPLAN:\nPlan texto\n\nNOTAS ADICIONALES:\nAdd texto' }],
      usage: { input_tokens: 50, output_tokens: 100 },
    };
    // @ts-expect-error mocking private client
    p.client = { messages: { create: vi.fn().mockResolvedValue(fakeResponse) } };

    const note = await p.generateNote({
      sessionId: 's1', tenantId: 't1', patientId: 'p1',
      patientName: 'Maria', doctorName: 'Garcia', language: 'es-ES',
      consultationMode: 'general', transcript: 'Dolor de cabeza.',
      template: 'soap',
    });
    expect(note.sections.summary).toContain('Res texto');
    expect(note.sections.assessment).toContain('Eval texto');
  });
});

describe('WhisperTranscriptionProvider', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = 'test-key-fake'; });
  afterEach(() => { process.env.OPENAI_API_KEY = originalKey; });

  it('requires API key', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => new WhisperTranscriptionProvider()).toThrow('OPENAI_API_KEY');
  });

  it('identifies as real provider', () => {
    const p = new WhisperTranscriptionProvider('test-key');
    expect(p.isMock).toBe(false);
    expect(p.name).toBe('WhisperTranscriptionProvider');
  });

  it('isAvailable returns true when key is set', async () => {
    const p = new WhisperTranscriptionProvider('test-key');
    expect(await p.isAvailable()).toBe(true);
  });

  it('transcribe calls Whisper and parses segments', async () => {
    const p = new WhisperTranscriptionProvider('test-key');
    const fakeResponse = {
      text: 'Patient reports headache.',
      language: 'en',
      duration: 5.2,
      segments: [
        { start: 0, end: 2.5, text: 'Patient reports', avg_logprob: -0.2 },
        { start: 2.5, end: 5.2, text: 'headache.', avg_logprob: -0.3 },
      ],
    };
    // @ts-expect-error mocking private client
    p.client = { audio: { transcriptions: { create: vi.fn().mockResolvedValue(fakeResponse) } } };

    const blob = new Blob(['fake audio'], { type: 'audio/webm' });
    const result = await p.transcribe(blob, 'en-US');
    expect(result.text).toBe('Patient reports headache.');
    expect(result.language).toBe('en');
    expect(result.durationMs).toBe(5200);
    expect(result.segments.length).toBe(2);
    expect(result.confidenceScore).toBeGreaterThan(0);
  });
});
