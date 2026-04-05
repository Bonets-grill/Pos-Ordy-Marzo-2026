/**
 * ClaudeNoteProvider — Real note generation using Anthropic Claude API.
 * Implements the note generation provider interface shape from locked scribe-ai / encounter-note-builder.
 */

import Anthropic from '@anthropic-ai/sdk';

export type NoteTemplate = 'soap' | 'clinical_summary' | 'followup' | 'full_encounter' | 'brief_summary' | 'follow_up';

export interface NoteSections {
  summary: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  additionalNotes: string;
}

export interface NoteGenerationInput {
  sessionId: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  language: string;
  consultationMode: string;
  transcript: string;
  memoryItems?: Array<{ type: string; title: string; severity: string }>;
  template: NoteTemplate;
}

export interface GeneratedNote {
  noteId: string;
  template: NoteTemplate;
  title: string;
  sections: NoteSections;
  rawText: string;
  generatedAt: string;
  tokensUsed: number;
  model: string;
}

export class ClaudeNoteProvider {
  readonly name = 'ClaudeNoteProvider';
  readonly isMock = false;
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    this.client = new Anthropic({ apiKey: key });
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generateNote(input: NoteGenerationInput): Promise<GeneratedNote> {
    const prompt = this.buildPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.systemPrompt(input.language),
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: unknown) => (c as { text: string }).text)
      .join('\n');

    const sections = this.parseSections(text);
    const title = this.getTitleForTemplate(input.template);

    return {
      noteId: `note_${Date.now()}`,
      template: input.template,
      title,
      sections,
      rawText: text,
      generatedAt: new Date().toISOString(),
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: this.model,
    };
  }

  private systemPrompt(language: string): string {
    const isSpanish = language.startsWith('es');
    if (isSpanish) {
      return `Eres un asistente medico clinico experto. Generas notas clinicas estructuradas a partir de transcripciones de consultas medicas. SIEMPRE respondes en espanol. SIEMPRE estructuras la respuesta en estas secciones exactas:

RESUMEN:
[texto]

SUBJETIVO:
[texto]

OBJETIVO:
[texto]

EVALUACION:
[texto]

PLAN:
[texto]

NOTAS ADICIONALES:
[texto]

IMPORTANTE: Esta es una nota clinica DE ASISTENCIA, no un diagnostico definitivo. El medico revisara y editara antes de uso clinico final.`;
    }
    return `You are an expert clinical medical assistant. You generate structured clinical notes from consultation transcripts. ALWAYS respond in English. ALWAYS structure your response in these exact sections:

SUMMARY:
[text]

SUBJECTIVE:
[text]

OBJECTIVE:
[text]

ASSESSMENT:
[text]

PLAN:
[text]

ADDITIONAL NOTES:
[text]

IMPORTANT: This is an ASSISTIVE clinical note, not a definitive diagnosis. The physician will review and edit before final clinical use.`;
  }

  private buildPrompt(input: NoteGenerationInput): string {
    const memorySection = input.memoryItems && input.memoryItems.length > 0
      ? `\n\nKnown patient conditions:\n${input.memoryItems.map(m => `- ${m.type}: ${m.title} (severity: ${m.severity})`).join('\n')}`
      : '';

    const templateInstruction = this.getTemplateInstruction(input.template);

    return `Patient: ${input.patientName}
Doctor: ${input.doctorName}
Consultation mode: ${input.consultationMode}
Date: ${new Date().toISOString()}${memorySection}

${templateInstruction}

Consultation transcript:
"""
${input.transcript}
"""

Generate the structured clinical note now.`;
  }

  private getTemplateInstruction(template: NoteTemplate): string {
    switch (template) {
      case 'soap':
      case 'full_encounter':
        return 'Generate a complete SOAP note with detailed Subjective, Objective, Assessment, and Plan sections.';
      case 'clinical_summary':
      case 'brief_summary':
        return 'Generate a brief clinical summary focused on key findings and plan.';
      case 'followup':
      case 'follow_up':
        return 'Generate a follow-up note focused on progress since last visit and current plan adjustments.';
    }
  }

  private getTitleForTemplate(template: NoteTemplate): string {
    switch (template) {
      case 'soap': case 'full_encounter': return 'SOAP Note';
      case 'clinical_summary': case 'brief_summary': return 'Clinical Summary';
      case 'followup': case 'follow_up': return 'Follow-up Note';
    }
  }

  private parseSections(text: string): NoteSections {
    const extract = (labels: string[]): string => {
      for (const label of labels) {
        const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:SUMMARY|SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN|ADDITIONAL NOTES|RESUMEN|SUBJETIVO|OBJETIVO|EVALUACION|NOTAS ADICIONALES):|$)`, 'i');
        const m = text.match(regex);
        if (m && m[1]) return m[1].trim();
      }
      return '';
    };

    return {
      summary: extract(['SUMMARY', 'RESUMEN']),
      subjective: extract(['SUBJECTIVE', 'SUBJETIVO']),
      objective: extract(['OBJECTIVE', 'OBJETIVO']),
      assessment: extract(['ASSESSMENT', 'EVALUACION', 'EVALUACI[ÓO]N']),
      plan: extract(['PLAN']),
      additionalNotes: extract(['ADDITIONAL NOTES', 'NOTAS ADICIONALES']),
    };
  }

  destroy(): void {
    // nothing to cleanup
  }
}
