import { describe, it, expect } from "vitest";
import { ESC_TRANSLATIONS } from "./i18n";
import { LANGS } from "../translations";
import type { Lang } from "../translations";

/**
 * STRICT ESCANDALLO I18N TEST LAB
 * Enforces complete parity across all 5 languages
 */

const esKeys = Object.keys(ESC_TRANSLATIONS.es);

describe("Escandallo i18n — structural integrity", () => {
  it("has all 5 languages", () => {
    LANGS.forEach((lang) => {
      expect(ESC_TRANSLATIONS[lang]).toBeDefined();
      expect(typeof ESC_TRANSLATIONS[lang]).toBe("object");
    });
  });

  it("Spanish has all expected namespaces", () => {
    const namespaces = ["nav.", "esc.title", "esc.dashboard", "esc.cat.", "esc.ing.", "esc.sup.", "esc.rec.", "esc.cost.", "esc.sim.", "esc.alert.", "esc.health.", "esc.dash.", "esc.inv.", "esc.common."];
    namespaces.forEach((ns) => {
      const found = esKeys.filter((k) => k.startsWith(ns));
      expect(found.length).toBeGreaterThan(0);
    });
  });

  it("has at least 70 translation keys per language", () => {
    LANGS.forEach((lang) => {
      expect(Object.keys(ESC_TRANSLATIONS[lang]).length).toBeGreaterThanOrEqual(70);
    });
  });
});

describe("Escandallo i18n — STRICT key parity", () => {
  LANGS.filter((l) => l !== "es").forEach((lang) => {
    const langKeys = Object.keys(ESC_TRANSLATIONS[lang]);

    it(`[${lang}] has EXACT same keys as Spanish`, () => {
      const missing = esKeys.filter((k) => !(k in ESC_TRANSLATIONS[lang]));
      const extra = langKeys.filter((k) => !(k in ESC_TRANSLATIONS.es));

      if (missing.length > 0) {
        console.error(`[${lang}] MISSING ${missing.length} keys:`, missing);
      }
      if (extra.length > 0) {
        console.error(`[${lang}] EXTRA ${extra.length} keys:`, extra);
      }

      expect(missing).toEqual([]);
      expect(extra).toEqual([]);
    });

    it(`[${lang}] NO empty values`, () => {
      const empty = langKeys.filter((k) => ESC_TRANSLATIONS[lang][k] === "");
      expect(empty).toEqual([]);
    });

    it(`[${lang}] NO untranslated values (identical to Spanish)`, () => {
      // Allow keys that are legitimately the same across languages
      // Words that are legitimately identical across languages
      const ALLOWED_SAME = [
        "esc.cat.base", "esc.cat.dessert", "esc.cat.sauce", "esc.sup.email",
        "esc.cost.food_cost", "esc.cost.food_cost_pct",
        "esc.rec.version", // "Version" is the same in es/en/fr/de
        // Italian shares many cognates with Spanish:
        "esc.ing.category", "esc.sup.phone", "esc.rec.category",
        "esc.alert.high_food_cost", "esc.alert.critical_ingredient",
        "esc.health.critical", "esc.dash.avg_food_cost",
        "esc.inv.min_stock", "esc.inv.consumption",
      ];

      const untranslated = langKeys.filter(
        (k) =>
          ESC_TRANSLATIONS[lang][k] === ESC_TRANSLATIONS.es[k] &&
          !ALLOWED_SAME.includes(k) &&
          ESC_TRANSLATIONS.es[k].length > 3 // skip very short like "€"
      );

      if (untranslated.length > 0) {
        console.warn(
          `[${lang}] Possibly untranslated (${untranslated.length}):`,
          untranslated.map((k) => `${k}: "${ESC_TRANSLATIONS.es[k]}"`)
        );
      }
      // Hard fail: everything must be translated
      expect(untranslated).toEqual([]);
    });
  });
});

describe("Escandallo i18n — category labels complete", () => {
  const categories = [
    "esc.cat.starter", "esc.cat.main", "esc.cat.dessert",
    "esc.cat.side", "esc.cat.beverage", "esc.cat.sauce",
    "esc.cat.base", "esc.cat.bread", "esc.cat.other",
  ];

  LANGS.forEach((lang) => {
    it(`[${lang}] has all 9 recipe categories`, () => {
      categories.forEach((key) => {
        expect(ESC_TRANSLATIONS[lang][key]).toBeDefined();
        expect(ESC_TRANSLATIONS[lang][key].length).toBeGreaterThan(0);
      });
    });
  });
});

describe("Escandallo i18n — alert labels complete", () => {
  const alertKeys = [
    "esc.alert.price_increase", "esc.alert.low_margin",
    "esc.alert.high_food_cost", "esc.alert.critical_ingredient",
    "esc.alert.unprofitable_recipe",
    "esc.alert.acknowledge", "esc.alert.resolve",
    "esc.alert.no_alerts", "esc.alert.active", "esc.alert.resolved",
    "esc.health.good", "esc.health.warning", "esc.health.critical",
  ];

  LANGS.forEach((lang) => {
    it(`[${lang}] has all alert & health labels`, () => {
      const missing = alertKeys.filter((k) => !(k in ESC_TRANSLATIONS[lang]));
      expect(missing).toEqual([]);
    });
  });
});

describe("Escandallo i18n — CRUD action labels complete", () => {
  const crudKeys = [
    "esc.common.save", "esc.common.cancel", "esc.common.delete",
    "esc.common.archive", "esc.common.filter", "esc.common.export",
    "esc.common.no_data", "esc.common.per_unit",
  ];

  LANGS.forEach((lang) => {
    it(`[${lang}] has all CRUD actions`, () => {
      crudKeys.forEach((key) => {
        expect(ESC_TRANSLATIONS[lang][key]).toBeDefined();
      });
    });
  });
});
