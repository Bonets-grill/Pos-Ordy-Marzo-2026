import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Translate this restaurant/food term from Spanish to English, French, German, and Italian.
Return ONLY JSON: {"en":"...","fr":"...","de":"...","it":"..."}
Brand names stay the same. Use correct culinary terms.
Text: "${text}"`,
    }],
  });

  const out = res.content[0].type === "text" ? res.content[0].text : "";
  try {
    const match = out.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match![0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
