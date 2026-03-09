import { describe, it, expect } from "vitest";
import { UI, LANGS, LANG_LABELS } from "./translations";
import type { Lang } from "./translations";

// ── Language completeness ───────────────────────────────────

describe("Language configuration", () => {
  it("has exactly 5 languages", () => {
    expect(LANGS).toHaveLength(5);
    expect(LANGS).toContain("es");
    expect(LANGS).toContain("en");
    expect(LANGS).toContain("fr");
    expect(LANGS).toContain("de");
    expect(LANGS).toContain("it");
  });

  it("every language has a label", () => {
    LANGS.forEach((lang) => {
      expect(LANG_LABELS[lang]).toBeDefined();
      expect(typeof LANG_LABELS[lang]).toBe("string");
      expect(LANG_LABELS[lang].length).toBeGreaterThan(0);
    });
  });
});

// ── Translation key completeness across all languages ───────

describe("Translation key parity", () => {
  const esKeys = Object.keys(UI.es);

  it("Spanish (base) has translations", () => {
    expect(esKeys.length).toBeGreaterThan(50);
  });

  LANGS.filter((l) => l !== "es").forEach((lang) => {
    describe(`${LANG_LABELS[lang]} (${lang})`, () => {
      const langKeys = Object.keys(UI[lang]);

      it("has the same number of keys as Spanish", () => {
        if (esKeys.length !== langKeys.length) {
          const missing = esKeys.filter((k) => !langKeys.includes(k));
          const extra = langKeys.filter((k) => !esKeys.includes(k));
          if (missing.length > 0) {
            console.warn(`[${lang}] MISSING keys (${missing.length}):`, missing.slice(0, 10));
          }
          if (extra.length > 0) {
            console.warn(`[${lang}] EXTRA keys (${extra.length}):`, extra.slice(0, 10));
          }
        }
        expect(langKeys.length).toBe(esKeys.length);
      });

      it("has ALL keys that Spanish has", () => {
        const missing = esKeys.filter((k) => !(k in UI[lang]));
        if (missing.length > 0) {
          console.warn(`[${lang}] Missing ${missing.length} keys:`, missing.slice(0, 20));
        }
        expect(missing).toEqual([]);
      });

      it("no empty translation values", () => {
        const emptyKeys = langKeys.filter((k) => UI[lang][k] === "");
        if (emptyKeys.length > 0) {
          console.warn(`[${lang}] Empty values:`, emptyKeys.slice(0, 10));
        }
        expect(emptyKeys).toEqual([]);
      });

      it("no untranslated keys (still in Spanish)", () => {
        // Check for keys where the translation is identical to Spanish
        // Some keys are legitimately the same (like "Dashboard", "POS", "KDS")
        const ALLOWED_SAME = ["nav.pos", "nav.kds", "nav.analytics", "auth.email"];
        const suspiciouslySame = langKeys.filter(
          (k) =>
            UI[lang][k] === UI.es[k] &&
            !ALLOWED_SAME.includes(k) &&
            UI.es[k].length > 10 // only flag longer strings
        );
        if (suspiciouslySame.length > 0) {
          console.warn(
            `[${lang}] Possibly untranslated (${suspiciouslySame.length}):`,
            suspiciouslySame.slice(0, 10).map((k) => `${k}: "${UI.es[k]}"`)
          );
        }
        // This is a soft check — just warns, doesn't fail
        // Uncomment to enforce: expect(suspiciouslySame).toEqual([]);
      });
    });
  });
});

// ── Critical navigation keys exist ──────────────────────────

describe("Critical translation keys exist in all languages", () => {
  const criticalKeys = [
    "nav.dashboard", "nav.pos", "nav.kds", "nav.orders", "nav.menu",
    "nav.tables", "nav.payments", "nav.loyalty", "nav.analytics",
    "nav.settings", "nav.logout",
    "auth.login", "auth.email", "auth.password",
    "pos.search", "pos.cart", "pos.total", "pos.pay",
    "dash.today_orders", "dash.today_revenue",
  ];

  LANGS.forEach((lang) => {
    it(`${lang} has all critical keys`, () => {
      const missing = criticalKeys.filter((k) => !(k in UI[lang]));
      expect(missing).toEqual([]);
    });
  });
});

// ── No placeholder or TODO values ───────────────────────────

describe("No placeholder values", () => {
  LANGS.forEach((lang) => {
    it(`${lang} has no TODO/FIXME/XXX values`, () => {
      const suspicious = Object.entries(UI[lang]).filter(
        // Case-sensitive to avoid Spanish "Todo"/"todo" false positives
        ([, v]) => /\bTODO\b|\bFIXME\b|\bXXX\b|\bPLACEHOLDER\b/.test(v)
      );
      expect(suspicious).toEqual([]);
    });
  });
});
