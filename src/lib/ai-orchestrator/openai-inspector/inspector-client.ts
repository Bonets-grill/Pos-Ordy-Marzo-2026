// ============================================================
// OPENAI INSPECTOR CLIENT — Send diffs to OpenAI for review
// ============================================================

import OpenAI from "openai";
import type { OpenAIReview } from "../types";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  summarizeSystemMap,
} from "./prompt-templates";

const MODEL = "gpt-4o";

/** Request a code review from OpenAI */
export async function requestCodeReview(params: {
  proposalTitle: string;
  diff: string;
  fileCount: number;
  frozenFiles: string[];
  apiRoutes: string[];
  testFiles: string[];
  migrations: string[];
}): Promise<OpenAIReview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      risk_assessment: "OpenAI API key not configured — review skipped",
      architecture_concerns: [],
      regression_risks: [],
      recommendations: ["Configure OPENAI_API_KEY to enable AI code review"],
      approval: "needs_changes",
      confidence: 0,
      model: "none",
      reviewed_at: new Date().toISOString(),
    };
  }

  const openai = new OpenAI({ apiKey });

  const systemMapSummary = summarizeSystemMap({
    fileCount: params.fileCount,
    frozenCount: params.frozenFiles.length,
    apiRoutes: params.apiRoutes,
    testFiles: params.testFiles,
    migrations: params.migrations,
  });

  const userPrompt = buildReviewUserPrompt({
    proposalTitle: params.proposalTitle,
    diff: params.diff,
    systemMapSummary,
    frozenFiles: params.frozenFiles,
    existingTestFiles: params.testFiles,
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildReviewSystemPrompt() },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content);
    return {
      risk_assessment: parsed.risk_assessment ?? "Unable to parse",
      architecture_concerns: parsed.architecture_concerns ?? [],
      regression_risks: parsed.regression_risks ?? [],
      recommendations: parsed.recommendations ?? [],
      approval: parsed.approval ?? "needs_changes",
      confidence: parsed.confidence ?? 0,
      model: MODEL,
      reviewed_at: new Date().toISOString(),
    };
  } catch {
    return {
      risk_assessment: "Failed to parse OpenAI response",
      architecture_concerns: [],
      regression_risks: [],
      recommendations: ["Review response manually: " + content.slice(0, 200)],
      approval: "needs_changes",
      confidence: 0,
      model: MODEL,
      reviewed_at: new Date().toISOString(),
    };
  }
}
