import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/api-auth";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
}

/** Block SSRF: only allow HTTP(S) URLs to public hosts */
function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    // Block private/internal IPs and localhost
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("172.") ||
      host === "[::1]" ||
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      host === "metadata.google.internal" ||
      host === "169.254.169.254"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

interface ScrapedProduct {
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
}

/**
 * Strategy 1: Extract products from embedded JSON objects in the HTML.
 * Works for SPAs (Next.js, Nuxt, React) that serialize data in the page source.
 * Splits by object boundaries ({\"_id\") and extracts fields per-object to keep alignment.
 */
function extractFromEmbeddedJson(html: string): { products: ScrapedProduct[]; categories: string[] } | null {
  // Unescape: \\\" → \"
  const unescaped = html.replace(/\\"/g, '"');

  // Strategy A: Split by MongoDB-style _id object boundaries
  let parts = unescaped.split('{"_id":"').slice(1);

  // Strategy B: If no _id objects, try splitting by "id": patterns
  if (parts.length < 3) {
    parts = unescaped.split('{"id":"').slice(1);
  }
  if (parts.length < 3) {
    parts = unescaped.split('{"id":').slice(1);
  }

  if (parts.length < 3) return null;

  const products: ScrapedProduct[] = [];
  const catSet = new Set<string>();
  const seen = new Set<string>();

  for (const part of parts) {
    // Only look at a reasonable window (each product object is ~500-1500 chars)
    const window = part.slice(0, 2000);

    // Must have name AND price to be a product
    const nameM = window.match(/"name":"([^"]{2,80})"/);
    const priceM = window.match(/"price":(\d+(?:\.\d+)?)/);
    if (!nameM || !priceM) continue;

    const name = nameM[1];
    const price = parseFloat(priceM[1]);

    // Dedup
    const key = `${name}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Category
    const catM = window.match(/"category(?:Name)?":"([^"]{1,50})"/);
    const category = catM ? catM[1] : null;
    if (category) catSet.add(category);

    // Image URL — must be absolute URL
    const imgM = window.match(/"(?:imageUrl|image_url|image|photo|thumbnail)":"(https?:\/\/[^"]+)"/);
    const image_url = imgM ? imgM[1] : null;

    // Description — grab until next unescaped quote (handle escaped quotes in content)
    const descM = window.match(/"description":"((?:[^"\\]|\\.)*)"/);
    const description = descM ? descM[1].replace(/\\"/g, '"').replace(/\\n/g, " ").slice(0, 150) : null;

    products.push({ name, description, price, category, image_url });
  }

  if (products.length < 3) return null;
  return { products, categories: [...catSet] };
}

/** Strategy 2: AI extraction (fallback for traditional server-rendered HTML) */
async function extractWithAI(html: string, url: string): Promise<{ products: ScrapedProduct[]; categories: string[] }> {
  let cleaned = html;
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/<head[\s\S]*?<\/head>/gi, "");
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  cleaned = cleaned.replace(/\s(?:class|style|data-[a-z-]+|id|role|aria-[a-z-]+|tabindex)="[^"]*"/gi, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/>\s+</g, "><");
  cleaned = cleaned.trim();
  if (cleaned.length > 80000) cleaned = cleaned.slice(0, 80000);

  const client = getClient();
  let fullText = "";
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: `Extract ALL food/drink products from this HTML. Return compact JSON only.
Source: ${url}
Format: {"products":[{"name":"...","description":null,"price":12.5,"category":"...","image_url":"..."}],"categories":["Cat1"]}
Rules: Every product. Numbers only for price. Absolute image URLs. No markdown.
HTML:
${cleaned}`,
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
    }
  }
  fullText = fullText.trim();

  // Parse JSON with multiple strategies
  const candidates = [
    fullText,
    fullText.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/, ""),
  ];
  const bs = fullText.indexOf("{");
  const be = fullText.lastIndexOf("}");
  if (bs !== -1 && be > bs) candidates.push(fullText.slice(bs, be + 1));

  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* next */ }
  }

  // Fix truncated JSON
  if (bs !== -1) {
    let fixable = fullText.slice(bs);
    const last = Math.max(fixable.lastIndexOf("},"), fixable.lastIndexOf("}]"));
    if (last > 0) {
      fixable = fixable.slice(0, last + 1);
      fixable += "]".repeat(Math.max(0, (fixable.match(/\[/g) || []).length - (fixable.match(/]/g) || []).length));
      fixable += "}".repeat(Math.max(0, (fixable.match(/\{/g) || []).length - (fixable.match(/\}/g) || []).length));
      try { return JSON.parse(fixable); } catch { /* continue */ }
    }
  }

  throw new Error("Failed to parse AI response");
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    if (!isUrlSafe(url)) {
      return NextResponse.json({ error: "Invalid or blocked URL" }, { status: 400 });
    }

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es,en;q=0.9",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch URL: ${res.status}` }, { status: 400 });
      }
      html = await res.text();
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
      return NextResponse.json({ error: `Cannot access URL: ${msg}` }, { status: 400 });
    }

    // Strategy 1: Direct JSON extraction (instant, free, aligned)
    const directResult = extractFromEmbeddedJson(html);
    if (directResult && directResult.products.length >= 3) {
      return NextResponse.json({ ...directResult, method: "direct" });
    }

    // Strategy 2: AI extraction (fallback)
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "No products found and ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const aiResult = await extractWithAI(html, url);
    return NextResponse.json({ ...aiResult, method: "ai" });
  } catch (err: unknown) {
    console.error("Scrape error:", err);
    return NextResponse.json({ error: "Service error" }, { status: 500 });
  }
}
