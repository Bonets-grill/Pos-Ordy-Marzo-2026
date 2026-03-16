// ============================================================
// PROMPT TEMPLATES — Structured prompts for OpenAI code review
// ============================================================

/** Build the system prompt for code review */
export function buildReviewSystemPrompt(): string {
  return `You are a senior software architect reviewing code changes for a production multi-tenant restaurant POS SaaS system.

Your role is to:
1. Identify regression risks (what could break)
2. Check architectural consistency with existing patterns
3. Flag security concerns (RLS bypasses, missing auth, injection risks)
4. Evaluate if frozen/locked files are inadvertently affected
5. Assess migration safety

You must respond with valid JSON matching this schema:
{
  "risk_assessment": "brief overall risk summary",
  "architecture_concerns": ["concern1", "concern2"],
  "regression_risks": ["risk1", "risk2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "approval": "approve" | "needs_changes" | "reject",
  "confidence": 0.0-1.0
}

Be conservative. When in doubt, flag as "needs_changes" rather than "approve".`;
}

/** Build the user prompt with context */
export function buildReviewUserPrompt(params: {
  proposalTitle: string;
  diff: string;
  systemMapSummary: string;
  frozenFiles: string[];
  existingTestFiles: string[];
}): string {
  const { proposalTitle, diff, systemMapSummary, frozenFiles, existingTestFiles } = params;

  return `## Proposal: ${proposalTitle}

## System Context
${systemMapSummary}

## Frozen Files (MUST NOT be modified)
${frozenFiles.length > 0 ? frozenFiles.map((f) => `- ${f}`).join("\n") : "None listed"}

## Existing Test Files
${existingTestFiles.length > 0 ? existingTestFiles.map((f) => `- ${f}`).join("\n") : "None"}

## Changes (diff)
\`\`\`
${diff}
\`\`\`

Analyze these changes and respond with the JSON review.`;
}

/** Generate a compact summary of the system map for the prompt */
export function summarizeSystemMap(params: {
  fileCount: number;
  frozenCount: number;
  apiRoutes: string[];
  testFiles: string[];
  migrations: string[];
}): string {
  return [
    `Total files: ${params.fileCount}`,
    `Frozen files: ${params.frozenCount}`,
    `API routes: ${params.apiRoutes.length} (${params.apiRoutes.slice(0, 5).join(", ")}${params.apiRoutes.length > 5 ? "..." : ""})`,
    `Test files: ${params.testFiles.length}`,
    `DB migrations: ${params.migrations.length}`,
    `Stack: Next.js 16, React 19, Supabase (RLS), TypeScript strict`,
    `Multi-tenant: All tables have tenant_id + RLS policies`,
  ].join("\n");
}
