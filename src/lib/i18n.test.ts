import { describe, it, expect } from "vitest";

/**
 * i18n logic tests for QR menu page.
 * Reproduces localName(), tenantName(), fmtPrice() and
 * multi-language fallback logic from src/app/qr/[slug]/[table]/page.tsx.
 */

// ── Reproduce helper functions from QR page ─────────────────

type Lang = "es" | "en" | "fr" | "de" | "it";
const LANGS: Lang[] = ["es", "en", "fr", "de", "it"];

interface MultiLangItem {
  name_es: string;
  name_en: string;
  name_fr?: string;
  name_de?: string;
  name_it?: string;
}

interface MultiLangDesc {
  description_es?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  description_de?: string | null;
  description_it?: string | null;
}

/** Returns item name in customer language, falls back to es → en */
function localName(item: MultiLangItem, lang: Lang): string {
  const key = `name_${lang}` as keyof MultiLangItem;
  return (item[key] as string) || item.name_es || item.name_en;
}

/** Returns item description in customer language, falls back to es → en → "" */
function localDesc(item: MultiLangDesc, lang: Lang): string {
  const key = `description_${lang}` as keyof MultiLangDesc;
  return (item[key] as string) || item.description_es || item.description_en || "";
}

/** Returns item name in TENANT language (for DB storage) */
function tenantName(item: { name_es: string; name_en: string }, tenantLang: Lang): string {
  const key = `name_${tenantLang}` as keyof typeof item;
  return (item[key] as string) || item.name_es || item.name_en;
}

/** Format currency using es-ES locale */
function fmtPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

// ── localName tests ─────────────────────────────────────────

describe("localName — customer-facing display name", () => {
  const item: MultiLangItem = {
    name_es: "Hamburguesa",
    name_en: "Burger",
    name_fr: "Hamburger",
    name_de: "Hamburger",
    name_it: "Hamburger",
  };

  it("returns Spanish for lang=es", () => {
    expect(localName(item, "es")).toBe("Hamburguesa");
  });

  it("returns English for lang=en", () => {
    expect(localName(item, "en")).toBe("Burger");
  });

  it("returns French for lang=fr", () => {
    expect(localName(item, "fr")).toBe("Hamburger");
  });

  it("returns German for lang=de", () => {
    expect(localName(item, "de")).toBe("Hamburger");
  });

  it("returns Italian for lang=it", () => {
    expect(localName(item, "it")).toBe("Hamburger");
  });

  it("falls back to name_es when lang field is empty string", () => {
    const itemNoDE: MultiLangItem = {
      name_es: "Ensalada",
      name_en: "Salad",
      name_de: "",
    };
    expect(localName(itemNoDE, "de")).toBe("Ensalada");
  });

  it("falls back to name_es when lang field is undefined", () => {
    const itemNoFR: MultiLangItem = {
      name_es: "Ensalada",
      name_en: "Salad",
      name_fr: undefined,
    };
    expect(localName(itemNoFR, "fr")).toBe("Ensalada");
  });

  it("falls back to name_en if name_es is empty", () => {
    const itemNoES: MultiLangItem = {
      name_es: "",
      name_en: "Salad",
      name_de: "",
    };
    expect(localName(itemNoES, "de")).toBe("Salad");
  });

  it("all 5 languages produce non-empty result", () => {
    LANGS.forEach((lang) => {
      expect(localName(item, lang).length).toBeGreaterThan(0);
    });
  });

  it("does NOT return '[object Object]' for any lang", () => {
    LANGS.forEach((lang) => {
      const result = localName(item, lang);
      expect(result).not.toBe("[object Object]");
      expect(typeof result).toBe("string");
    });
  });
});

// ── localDesc tests ─────────────────────────────────────────

describe("localDesc — item description with fallback", () => {
  const item: MultiLangDesc = {
    description_es: "Descripción en español",
    description_en: "English description",
    description_fr: "Description en français",
    description_de: "Beschreibung auf Deutsch",
    description_it: "Descrizione in italiano",
  };

  it("returns correct lang description", () => {
    expect(localDesc(item, "es")).toBe("Descripción en español");
    expect(localDesc(item, "en")).toBe("English description");
    expect(localDesc(item, "de")).toBe("Beschreibung auf Deutsch");
  });

  it("falls back to description_es when lang desc is null", () => {
    const itemNullDE: MultiLangDesc = {
      description_es: "Descripción",
      description_en: "Description",
      description_de: null,
    };
    expect(localDesc(itemNullDE, "de")).toBe("Descripción");
  });

  it("falls back to description_en if es is also null", () => {
    const item: MultiLangDesc = {
      description_es: null,
      description_en: "English only",
      description_de: null,
    };
    expect(localDesc(item, "de")).toBe("English only");
  });

  it("returns empty string if all descriptions are null/undefined", () => {
    const itemEmpty: MultiLangDesc = {
      description_es: null,
      description_en: null,
      description_de: null,
    };
    expect(localDesc(itemEmpty, "de")).toBe("");
  });
});

// ── tenantName tests ────────────────────────────────────────

describe("tenantName — stored in tenant's language for KDS/DB", () => {
  const item: MultiLangItem = {
    name_es: "Hamburguesa Premium",
    name_en: "Premium Burger",
    name_fr: "Hamburger Premium",
    name_de: "Premium Hamburger",
    name_it: "Hamburger Premium",
  };

  it("returns Spanish name for Spanish tenant (locale=es)", () => {
    expect(tenantName(item, "es")).toBe("Hamburguesa Premium");
  });

  it("returns English name for English tenant (locale=en)", () => {
    expect(tenantName(item, "en")).toBe("Premium Burger");
  });

  it("falls back to name_es when tenant lang field is empty", () => {
    const minItem = { name_es: "Burger", name_en: "Burger EN" };
    // Only name_es and name_en exist on this type, so tenantLang=fr falls to name_es
    expect(tenantName(minItem, "fr" as Lang)).toBe("Burger");
  });

  it("falls back to name_en if name_es is also empty", () => {
    const itemNoES = { name_es: "", name_en: "Fallback" };
    expect(tenantName(itemNoES, "de" as Lang)).toBe("Fallback");
  });

  it("CRITICAL: tenant locale defaults to 'es' when undefined", () => {
    // The QR page uses: (tenant.locale || "es") as Lang
    const tenantLocale: string | null | undefined = null;
    const effectiveLang = (tenantLocale || "es") as Lang;
    expect(effectiveLang).toBe("es");
    expect(tenantName(item, effectiveLang)).toBe("Hamburguesa Premium");
  });

  it("CRITICAL: German customer order stored in Spanish (tenant language)", () => {
    // Customer selects language DE, but order is stored in ES (tenant locale)
    const customerLang: Lang = "de";
    const tenantLang: Lang = (null || "es") as Lang; // tenant.locale is null → defaults to "es"

    const customerDisplay = localName(item, customerLang);
    const storedName = tenantName(item, tenantLang);

    expect(customerDisplay).toBe("Premium Hamburger"); // What customer sees (DE)
    expect(storedName).toBe("Hamburguesa Premium");    // What KDS sees (ES)
    expect(customerDisplay).not.toBe(storedName);     // They are different languages
  });

  it("all 5 languages return non-empty for complete items", () => {
    LANGS.forEach((lang) => {
      const result = tenantName(item, lang);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ── fmtPrice tests ──────────────────────────────────────────

describe("fmtPrice — currency formatting in es-ES locale", () => {
  it("formats EUR correctly", () => {
    const result = fmtPrice(12.50, "EUR");
    expect(result).toContain("12,50");
    expect(result).toContain("€");
  });

  it("formats USD correctly", () => {
    const result = fmtPrice(10.00, "USD");
    expect(result).toContain("10,00");
    expect(result).toContain("$");
  });

  it("formats zero", () => {
    const result = fmtPrice(0, "EUR");
    expect(result).toContain("0,00");
  });

  it("formats large amounts", () => {
    const result = fmtPrice(1234.99, "EUR");
    expect(result).toContain("1234,99");
  });

  it("modifier price deltas: positive", () => {
    const result = fmtPrice(1.50, "EUR");
    expect(result).toContain("1,50");
  });

  it("modifier price deltas: negative (discount)", () => {
    const result = fmtPrice(-2.00, "EUR");
    expect(result).toContain("2,00");
  });
});

// ── Multi-language order flow tests ─────────────────────────

describe("Multi-language order flow — QR to KDS", () => {
  const burgerItem: MultiLangItem = {
    name_es: "Hamburguesa con Queso",
    name_en: "Cheeseburger",
    name_fr: "Hamburger au Fromage",
    name_de: "Käseburger",
    name_it: "Hamburger al Formaggio",
  };

  const cheeseModifier: MultiLangItem = {
    name_es: "Queso Extra",
    name_en: "Extra Cheese",
    name_fr: "Fromage Supplémentaire",
    name_de: "Extrakäse",
    name_it: "Formaggio Extra",
  };

  it("French customer sees French names", () => {
    expect(localName(burgerItem, "fr")).toBe("Hamburger au Fromage");
    expect(localName(cheeseModifier, "fr")).toBe("Fromage Supplémentaire");
  });

  it("Italian customer sees Italian names", () => {
    expect(localName(burgerItem, "it")).toBe("Hamburger al Formaggio");
  });

  it("Order stored in Spanish (tenant=es) regardless of customer language", () => {
    const tenantLang: Lang = "es";
    const customerLangs: Lang[] = ["en", "fr", "de", "it"];

    customerLangs.forEach((customerLang) => {
      const displayName = localName(burgerItem, customerLang);
      const storedName = tenantName(burgerItem, tenantLang);

      // Customer sees their language
      expect(displayName).not.toBe(burgerItem.name_es);

      // KDS always sees Spanish
      expect(storedName).toBe("Hamburguesa con Queso");
    });
  });

  it("Missing translation falls back gracefully without crashing", () => {
    const partialItem: MultiLangItem = {
      name_es: "Producto Solo Español",
      name_en: "",
      name_de: "",
      name_fr: "",
      name_it: "",
    };

    // All langs should fall back to Spanish without throwing
    LANGS.forEach((lang) => {
      expect(() => localName(partialItem, lang)).not.toThrow();
      const result = localName(partialItem, lang);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ── Idempotency key validation ───────────────────────────────

describe("Idempotency key validation (prevents duplicate orders)", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function isValidIdempotencyKey(key: unknown): boolean {
    return typeof key === "string" && UUID_RE.test(key);
  }

  it("valid UUIDs are accepted", () => {
    expect(isValidIdempotencyKey("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidIdempotencyKey("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("non-UUID strings are rejected", () => {
    expect(isValidIdempotencyKey("not-a-uuid")).toBe(false);
    expect(isValidIdempotencyKey("123")).toBe(false);
    expect(isValidIdempotencyKey("")).toBe(false);
  });

  it("null/undefined are rejected", () => {
    expect(isValidIdempotencyKey(null)).toBe(false);
    expect(isValidIdempotencyKey(undefined)).toBe(false);
  });

  it("injection attempts are rejected", () => {
    expect(isValidIdempotencyKey("'; DROP TABLE orders; --")).toBe(false);
    expect(isValidIdempotencyKey("<script>alert(1)</script>")).toBe(false);
  });
});

// ── Modifier price edge cases ────────────────────────────────

describe("Modifier price_delta edge cases", () => {
  function safeModifierPrice(priceDelta: unknown): number {
    const n = Number(priceDelta);
    return isNaN(n) ? 0 : n;
  }

  it("handles null price_delta (returns 0)", () => {
    expect(safeModifierPrice(null)).toBe(0);
  });

  it("handles undefined price_delta (returns 0)", () => {
    expect(safeModifierPrice(undefined)).toBe(0);
  });

  it("handles string price_delta", () => {
    expect(safeModifierPrice("1.50")).toBe(1.50);
  });

  it("handles zero price (free modifier)", () => {
    expect(safeModifierPrice(0)).toBe(0);
  });

  it("handles negative price_delta (discount modifier)", () => {
    expect(safeModifierPrice(-2.00)).toBe(-2.00);
  });

  it("handles NaN string (returns 0)", () => {
    expect(safeModifierPrice("abc")).toBe(0);
  });
});
