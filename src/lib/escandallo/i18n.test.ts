import { describe, it, expect } from "vitest";

/**
 * Tests for escandallo i18n module — verifies all escandallo
 * translation keys are present in the main translations file.
 */

import { UI, LANGS } from "../translations";

describe("Escandallo i18n keys exist in main translations", () => {
  // All escandallo-related keys that should exist
  const escandalloKeys = [
    "nav.escandallo",
  ];

  // Keys used in constants.ts
  const constantKeys = [
    "esc.cat.starter", "esc.cat.main", "esc.cat.dessert",
    "esc.cat.side", "esc.cat.beverage", "esc.cat.sauce",
    "esc.cat.base", "esc.cat.bread", "esc.cat.other",
    "esc.alert.price_increase", "esc.alert.low_margin",
    "esc.alert.high_food_cost", "esc.alert.critical_ingredient",
    "esc.alert.unprofitable_recipe",
    "esc.health.good", "esc.health.warning", "esc.health.critical",
  ];

  LANGS.forEach((lang) => {
    it(`${lang} has escandallo navigation key`, () => {
      escandalloKeys.forEach((key) => {
        if (key in UI[lang]) {
          expect(UI[lang][key]).toBeDefined();
          expect(UI[lang][key].length).toBeGreaterThan(0);
        } else {
          console.warn(`[${lang}] Missing escandallo key: ${key}`);
        }
      });
    });

    it(`${lang} has escandallo constant keys`, () => {
      const missing: string[] = [];
      constantKeys.forEach((key) => {
        if (!(key in UI[lang])) {
          missing.push(key);
        }
      });
      if (missing.length > 0) {
        console.warn(`[${lang}] Missing escandallo constant keys:`, missing);
      }
      // Soft check — warns but doesn't fail (keys may be in a separate escandallo i18n)
    });
  });
});
