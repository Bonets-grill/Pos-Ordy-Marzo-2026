import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/api-auth";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
}

interface ProductInput {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { products } = (await req.json()) as { products: ProductInput[] };

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const productList = products
      .map((p) => `- "${p.name}" (${p.category || "sin categoria"})${p.description ? `: ${p.description}` : ""}`)
      .join("\n");

    const client = getClient();
    let fullText = "";
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `You are a restaurant menu expert. Analyze ALL the products below and generate modifier groups and options that a POS system needs.

PRODUCTS:
${productList}

TASK: Generate modifier groups that make sense for these products. Think about what a customer would customize when ordering.

COMMON MODIFIER GROUPS TO CONSIDER:
- Cooking point (for meats/burgers: rare, medium rare, medium, well done)
- Size options (small, medium, large — if relevant)
- Bread type (for burgers/sandwiches: brioche, classic, whole wheat, lettuce wrap)
- Protein choice (if dishes allow choosing: chicken, beef, shrimp, tofu)
- Extras/Add-ons (extra cheese, bacon, avocado, egg, etc.)
- Sauces (ketchup, mayo, BBQ, ranch, mustard, hot sauce, etc.)
- Side choices (fries, salad, rice, etc.)
- Drink size (if there are beverages)
- Spice level (mild, medium, hot, extra hot)
- Toppings (for pizzas, salads, bowls)
- Removal/Without (no onion, no tomato, etc. — common allergen-friendly)
- Milk type (for coffees: whole, skim, oat, almond)

RULES:
- Only generate groups that ACTUALLY apply to the products listed
- Each group must have at least 2 options
- For each group, specify which product IDs it should be linked to
- price_delta should be 0 for standard options, positive for premium add-ons
- Use SPANISH for all names (this is a Spanish-speaking restaurant system)
- Be practical — don't over-generate. Only groups that a real restaurant would use
- "required" means the customer MUST choose (like cooking point for a steak)
- "single_select" = pick one (cooking point), "multi_select" = pick many (extras/toppings)
- For multi_select, set reasonable min_select (usually 0) and max_select (usually 3-5)
- For single_select, min_select=1 max_select=1 if required, min_select=0 max_select=1 if optional

Return ONLY valid JSON (no markdown, no code blocks):
{
  "groups": [
    {
      "name": "Punto de coccion",
      "type": "single_select",
      "required": true,
      "min_select": 1,
      "max_select": 1,
      "product_ids": ["id1", "id2"],
      "options": [
        { "name": "Poco hecha", "price_delta": 0 },
        { "name": "Al punto", "price_delta": 0 },
        { "name": "Muy hecha", "price_delta": 0 }
      ]
    }
  ]
}`,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullText += event.delta.text;
      }
    }
    fullText = fullText.trim();

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(fullText);
    } catch {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("AI modifiers error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
