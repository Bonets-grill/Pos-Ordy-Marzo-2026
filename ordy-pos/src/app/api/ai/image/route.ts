import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuth } from "@/lib/api-auth";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
}

const BACKGROUND_STYLES: Record<string, { setting: string; studio: boolean }> = {
  dark_wood: { setting: "placed on a dark wooden restaurant table, warm ambient lighting, slightly out-of-focus dark background", studio: false },
  marble: { setting: "placed on a white marble counter, bright natural window light, clean light background", studio: false },
  slate: { setting: "placed on a dark slate surface, moody directional lighting, dark background", studio: false },
  rustic: { setting: "placed on a wooden cutting board with parchment paper, warm natural light", studio: false },
  modern: { setting: "on a white round plate, clean bright lighting, plain white background", studio: false },
  garden: { setting: "placed on a light wooden outdoor table, natural sunlight, blurred greenery background", studio: false },
  italian: { setting: "placed on a checkered red-white tablecloth, warm indoor lighting", studio: false },
  asian: { setting: "placed on a dark ceramic plate, minimalist dark setting, subtle warm lighting", studio: false },
  colorful: { setting: "placed on a colorful ceramic plate, bright natural lighting, cheerful background", studio: false },
  transparent: { setting: "ISOLATED on a PURE SOLID WHITE (#FFFFFF) background. Professional studio product photography. Perfectly even lighting from all sides. ABSOLUTELY NO table, NO surface, NO shadows, NO reflections. The food floats on infinite white.", studio: true },
};

function buildPrompt(dishName: string, foodDetails: string, bg: { setting: string; studio: boolean }): string {
  if (bg.studio) {
    // Studio/white background — completely different prompt structure
    return `BACKGROUND: PURE WHITE (#FFFFFF). This is the #1 priority.

Product photo of "${dishName}" for an e-commerce food catalog. ${foodDetails}.

${bg.setting}

STYLE: Clean commercial product photography. Like a food delivery app photo (UberEats, DoorDash). Bright, even studio lighting. Crisp and sharp focus.

MANDATORY:
- Background MUST be 100% pure white — no gradients, no shadows, no surface
- The food is the ONLY element in the image
- Shot from slightly above (30-degree angle)
- No text, no watermarks, no logos, no hands
- ONE serving only
- Food must look real and appetizing`;
  }

  // Restaurant-style photo
  return `${bg.setting}.

A real photograph of "${dishName}" for a casual restaurant menu. ${foodDetails}.

STYLE: Real food photography taken with a good smartphone camera. NOT overly stylized, NOT AI-looking. Looks like an actual photo of real food at a real restaurant.

RULES:
- The food must look REAL and APPETIZING
- Natural imperfections OK — real food isn't perfectly symmetrical
- Realistic portions and proportions
- No text, no watermarks, no logos, no hands visible
- ONE serving of the dish
- Dish details MUST match the description`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { imagePrompt, dishName, backgroundStyle, description } = await req.json();

    if (!dishName) {
      return NextResponse.json({ error: "Missing dishName" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const bg = BACKGROUND_STYLES[backgroundStyle] || BACKGROUND_STYLES.dark_wood;
    const foodDetails = imagePrompt || description || dishName;
    const fullPrompt = buildPrompt(dishName, foodDetails, bg);

    const openai = getClient();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    return NextResponse.json({ url: imageUrl });
  } catch (err: unknown) {
    console.error("AI image error:", err);
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
