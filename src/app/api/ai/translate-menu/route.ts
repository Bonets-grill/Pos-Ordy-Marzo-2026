import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const LANGS = ["en", "fr", "de", "it"] as const;
const LANG_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  it: "Italian",
};

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const tenantId = auth.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const client = new Anthropic();

  // 1. Load all menu items
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name_es, name_en, name_fr, name_de, name_it, description_es, description_en, description_fr, description_de, description_it")
    .eq("tenant_id", tenantId);

  // 2. Load all categories
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name_es, name_en, name_fr, name_de, name_it")
    .eq("tenant_id", tenantId);

  // 3. Load all modifier groups
  const { data: modGroups } = await supabase
    .from("modifier_groups")
    .select("id, name_es, name_en, name_fr, name_de, name_it")
    .eq("tenant_id", tenantId);

  // 4. Load all modifiers
  const { data: mods } = await supabase
    .from("modifiers")
    .select("id, group_id, name_es, name_en, name_fr, name_de, name_it")
    .in("group_id", (modGroups || []).map((g: { id: string }) => g.id));

  // Build translation payload - only include items that need translation
  const toTranslate: {
    type: "item" | "category" | "mod_group" | "modifier";
    id: string;
    name_es: string;
    description_es?: string;
    missing_langs: string[];
  }[] = [];

  for (const item of items || []) {
    const missing = LANGS.filter((l) => !item[`name_${l}`]);
    if (missing.length > 0) {
      toTranslate.push({
        type: "item",
        id: item.id,
        name_es: item.name_es,
        description_es: item.description_es || "",
        missing_langs: missing,
      });
    }
  }

  for (const cat of categories || []) {
    const missing = LANGS.filter((l) => !cat[`name_${l}`]);
    if (missing.length > 0) {
      toTranslate.push({
        type: "category",
        id: cat.id,
        name_es: cat.name_es,
        missing_langs: missing,
      });
    }
  }

  for (const g of modGroups || []) {
    const missing = LANGS.filter((l) => !g[`name_${l}`]);
    if (missing.length > 0) {
      toTranslate.push({
        type: "mod_group",
        id: g.id,
        name_es: g.name_es,
        missing_langs: missing,
      });
    }
  }

  for (const m of mods || []) {
    const missing = LANGS.filter((l) => !m[`name_${l}`]);
    if (missing.length > 0) {
      toTranslate.push({
        type: "modifier",
        id: m.id,
        name_es: m.name_es,
        missing_langs: missing,
      });
    }
  }

  if (toTranslate.length === 0) {
    return NextResponse.json({ message: "All translations already exist", translated: 0 });
  }

  // 5. Translate in batches of 10
  const BATCH_SIZE = 10;
  let updated = 0;

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `Translate from Spanish. Return ONLY a JSON array, no markdown fences.
Each object: {"id":"...","type":"...","name_en":"...","name_fr":"...","name_de":"...","name_it":"..."}
If description_es is non-empty, also add description_en, description_fr, description_de, description_it.
Brand names stay same. Use correct culinary terms.

${JSON.stringify(batch)}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) continue;

    let translations: Array<Record<string, string>>;
    try {
      translations = JSON.parse(jsonMatch[0]);
    } catch {
      continue;
    }

    for (const t of translations) {
      const updateData: Record<string, string> = {};
      for (const lang of LANGS) {
        if (t[`name_${lang}`]) updateData[`name_${lang}`] = t[`name_${lang}`];
        if (t[`description_${lang}`]) updateData[`description_${lang}`] = t[`description_${lang}`];
      }

      if (Object.keys(updateData).length === 0) continue;

      let table: string;
      switch (t.type) {
        case "item": table = "menu_items"; break;
        case "category": table = "menu_categories"; break;
        case "mod_group": table = "modifier_groups"; break;
        case "modifier": table = "modifiers"; break;
        default: continue;
      }

      const { error } = await supabase.from(table).update(updateData).eq("id", t.id);
      if (!error) updated++;
      else console.error(`Translation save error [${table}/${t.id}]:`, error.message);
    }
  }

  return NextResponse.json({ message: "Translations saved", translated: updated, total: toTranslate.length });
}
