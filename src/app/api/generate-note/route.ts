/**
 * POST /api/generate-note
 * Receives a transcript + context and returns a structured clinical note.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClaudeNoteProvider } from '@/modules/live-integrations/adapters/ClaudeNoteProvider';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const body = await request.json();

    // Validate required fields
    const required = ['sessionId', 'tenantId', 'patientId', 'patientName', 'doctorName', 'transcript', 'template'];
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
    }

    const provider = new ClaudeNoteProvider();
    const note = await provider.generateNote({
      sessionId: body.sessionId,
      tenantId: body.tenantId,
      patientId: body.patientId,
      patientName: body.patientName,
      doctorName: body.doctorName,
      language: body.language ?? 'es-ES',
      consultationMode: body.consultationMode ?? 'general',
      transcript: body.transcript,
      memoryItems: body.memoryItems ?? [],
      template: body.template,
    });

    return NextResponse.json({ ok: true, note });
  } catch (err) {
    console.error('Generate-note error:', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/generate-note',
    method: 'POST',
    configured: !!process.env.ANTHROPIC_API_KEY,
  });
}
