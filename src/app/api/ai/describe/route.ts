import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/api-auth";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { ingredients, dishName, lang, existingDescription } = await req.json();

    if (!dishName) {
      return NextResponse.json({ error: "Missing dishName" }, { status: 400 });
    }

    // ingredients is now optional — AI can work from dish name + existing description alone

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const langMap: Record<string, string> = {
      es: "Spanish", en: "English", fr: "French", de: "German", it: "Italian",
    };
    const targetLang = langMap[lang] || "Spanish";

    const client = getClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are the world's best food copywriter, hired by Michelin-star restaurants. Your descriptions make people CRAVE the dish instantly.

DISH NAME: ${dishName}
${ingredients ? `INGREDIENTS: ${ingredients}` : ""}
${existingDescription ? `EXISTING DESCRIPTION (use as reference for accuracy): ${existingDescription}` : ""}

TASK: Generate irresistible menu descriptions + a hyper-detailed image prompt.

DESCRIPTION RULES:
- Write 2 sentences maximum (40-60 words)
- Use sensory language: textures (crispy, creamy, silky, crunchy), temperatures (warm, chilled), flavors (tangy, smoky, caramelized)
- Mention 3-4 key ingredients naturally woven into the prose
- Sound premium but NOT pretentious — approachable luxury
- Do NOT start with the dish name
- Do NOT use generic phrases like "a delicious dish" or "prepared with care"
- Be SPECIFIC to THIS dish — if it's a smash burger, mention the thin crispy-edged patty; if it's ceviche, mention the citrus-cured freshness

IMAGE PROMPT RULES (this is CRITICAL — the image generation depends entirely on this):
- Write an EXTREMELY detailed, specific prompt for DALL-E 3 food photography
- Describe the EXACT visual appearance: how the food looks, layers, toppings visible, sauce drizzle patterns
- Specify cooking style visible in appearance (grilled marks, smashed thin patty, golden fried crust, etc.)
- Mention the plate/bowl type and color
- Describe garnishes precisely (fresh basil leaf on top, sesame seeds, microgreens, etc.)
- Include camera angle (overhead shot, 45-degree angle, close-up macro)
- Be 2-3 sentences, extremely specific
- If the name mentions a specific style (smash, grilled, fried, raw), the image MUST clearly show that style
- NEVER be vague — "a burger" is bad, "a double smash burger with thin crispy-edged beef patties, melted American cheese dripping down the sides, caramelized onions, on a brioche bun" is good

Return ONLY valid JSON (no markdown, no code blocks):
{
  "es": "descripcion en espanol",
  "en": "english description",
  "fr": "description en francais",
  "de": "deutsche Beschreibung",
  "it": "descrizione in italiano",
  "image_prompt": "Extremely detailed DALL-E 3 food photography prompt..."
}`,
        },
      ],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("AI describe error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
