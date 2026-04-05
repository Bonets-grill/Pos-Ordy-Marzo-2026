/**
 * POST /api/transcribe
 * Receives an audio file and returns a Whisper transcription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhisperTranscriptionProvider } from '@/modules/live-integrations/adapters/WhisperTranscriptionProvider';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    const language = (formData.get('language') as string) || 'es-ES';

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
    }

    const provider = new WhisperTranscriptionProvider();
    const result = await provider.transcribe(audio, language);

    return NextResponse.json({
      ok: true,
      text: result.text,
      language: result.language,
      durationMs: result.durationMs,
      segments: result.segments,
      confidenceScore: result.confidenceScore,
    });
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/transcribe',
    method: 'POST',
    configured: !!process.env.OPENAI_API_KEY,
  });
}
