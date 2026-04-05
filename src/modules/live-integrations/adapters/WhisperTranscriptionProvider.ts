/**
 * WhisperTranscriptionProvider — Real audio transcription using OpenAI Whisper API.
 * Implements the transcription provider interface shape from locked voice-engine.
 */

import OpenAI from 'openai';

export interface TranscriptionResult {
  text: string;
  language: string;
  durationMs: number;
  segments: Array<{ start: number; end: number; text: string }>;
  confidenceScore: number;
}

export class WhisperTranscriptionProvider {
  readonly name = 'WhisperTranscriptionProvider';
  readonly isMock = false;
  private client: OpenAI;
  private model = 'whisper-1';

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    this.client = new OpenAI({ apiKey: key });
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Transcribe an audio blob/file.
   * Accepts a File/Blob (browser) or a Node.js readable stream.
   */
  async transcribe(audio: File | Blob, languageHint?: string): Promise<TranscriptionResult> {
    // Convert Blob to File if needed (OpenAI SDK expects File-like)
    const file = audio instanceof File ? audio : new File([audio], 'audio.webm', { type: audio.type || 'audio/webm' });

    const response = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
      language: languageHint ? languageHint.split('-')[0] : undefined, // 'es-ES' -> 'es'
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const verbose = response as unknown as {
      text: string;
      language: string;
      duration: number;
      segments?: Array<{ start: number; end: number; text: string; avg_logprob?: number }>;
    };

    const segments = (verbose.segments ?? []).map(s => ({ start: s.start, end: s.end, text: s.text }));
    const avgLogprob = verbose.segments && verbose.segments.length > 0
      ? verbose.segments.reduce((sum, s) => sum + (s.avg_logprob ?? 0), 0) / verbose.segments.length
      : 0;

    // Convert avg_logprob (typically -1 to 0) to confidence (0 to 1)
    const confidence = Math.max(0, Math.min(1, Math.exp(avgLogprob)));

    return {
      text: verbose.text,
      language: verbose.language ?? languageHint ?? 'unknown',
      durationMs: Math.round((verbose.duration ?? 0) * 1000),
      segments,
      confidenceScore: confidence || 0.85,
    };
  }

  destroy(): void {
    // nothing to cleanup
  }
}
