/**
 * Translation Memory — caches translations in localStorage to avoid repeated AI calls.
 * Key: Spanish text → { en, fr, de, it }
 */

const STORAGE_KEY = "ordy_translate_memory";
type Translations = { en: string; fr: string; de: string; it: string };

function loadMemory(): Record<string, Translations> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMemory(mem: Record<string, Translations>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch { /* quota exceeded — ignore */ }
}

/** Look up cached translation */
export function memoryLookup(esText: string): Translations | null {
  if (!esText.trim()) return null;
  const mem = loadMemory();
  return mem[esText.trim()] || null;
}

/** Store a translation in memory */
export function memoryStore(esText: string, translations: Translations) {
  if (!esText.trim()) return;
  const mem = loadMemory();
  mem[esText.trim()] = translations;
  saveMemory(mem);
}

/** Seed memory from existing data (call on page load with loaded items) */
export function memorySeed(
  items: Array<{
    name_es: string;
    name_en?: string;
    name_fr?: string;
    name_de?: string;
    name_it?: string;
  }>
) {
  const mem = loadMemory();
  let changed = false;
  for (const item of items) {
    const key = item.name_es?.trim();
    if (!key) continue;
    // Only seed if we have at least en + one more
    if (item.name_en && (item.name_fr || item.name_de || item.name_it)) {
      if (!mem[key]) {
        mem[key] = {
          en: item.name_en || "",
          fr: item.name_fr || "",
          de: item.name_de || "",
          it: item.name_it || "",
        };
        changed = true;
      }
    }
  }
  if (changed) saveMemory(mem);
}

/**
 * Translate a single text from Spanish → en/fr/de/it.
 * Checks memory first. If miss, calls the API and caches.
 */
export async function translateText(esText: string): Promise<Translations | null> {
  if (!esText.trim()) return null;

  // 1. Check memory
  const cached = memoryLookup(esText);
  if (cached && cached.en && cached.fr && cached.de && cached.it) return cached;

  // 2. Call lightweight translate API
  try {
    const res = await fetch("/api/ai/translate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: esText }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result: Translations = { en: data.en || "", fr: data.fr || "", de: data.de || "", it: data.it || "" };
    memoryStore(esText, result);
    return result;
  } catch {
    return null;
  }
}
