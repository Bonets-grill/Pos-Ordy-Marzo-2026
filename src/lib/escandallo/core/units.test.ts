import { describe, it, expect } from "vitest";
import {
  getUnitCategory, areUnitsCompatible, convertUnit,
  calculateUnitCost, applyWaste, usableAfterWaste,
  ALL_UNITS, UNITS_BY_CATEGORY, UNIT_LABELS,
} from "./units";

// ── getUnitCategory ─────────────────────────────────────────

describe("getUnitCategory", () => {
  it("classifies weight units", () => {
    expect(getUnitCategory("kg")).toBe("weight");
    expect(getUnitCategory("g")).toBe("weight");
    expect(getUnitCategory("mg")).toBe("weight");
  });

  it("classifies volume units", () => {
    expect(getUnitCategory("l")).toBe("volume");
    expect(getUnitCategory("ml")).toBe("volume");
    expect(getUnitCategory("cl")).toBe("volume");
  });

  it("classifies countable units", () => {
    expect(getUnitCategory("unit")).toBe("countable");
    expect(getUnitCategory("portion")).toBe("countable");
    expect(getUnitCategory("dozen")).toBe("countable");
    expect(getUnitCategory("bunch")).toBe("countable");
    expect(getUnitCategory("slice")).toBe("countable");
    expect(getUnitCategory("sheet")).toBe("countable");
  });
});

// ── areUnitsCompatible ──────────────────────────────────────

describe("areUnitsCompatible", () => {
  it("weight units are compatible", () => {
    expect(areUnitsCompatible("kg", "g")).toBe(true);
    expect(areUnitsCompatible("g", "mg")).toBe(true);
    expect(areUnitsCompatible("kg", "mg")).toBe(true);
  });

  it("volume units are compatible", () => {
    expect(areUnitsCompatible("l", "ml")).toBe(true);
    expect(areUnitsCompatible("ml", "cl")).toBe(true);
  });

  it("weight and volume are NOT compatible without density", () => {
    expect(areUnitsCompatible("kg", "l")).toBe(false);
    expect(areUnitsCompatible("g", "ml")).toBe(false);
  });

  it("countable units are compatible", () => {
    expect(areUnitsCompatible("unit", "dozen")).toBe(true);
    expect(areUnitsCompatible("portion", "slice")).toBe(true);
  });

  it("countable and weight are NOT compatible", () => {
    expect(areUnitsCompatible("unit", "kg")).toBe(false);
  });
});

// ── convertUnit ─────────────────────────────────────────────

describe("convertUnit — same unit", () => {
  it("returns same quantity for identical units", () => {
    expect(convertUnit(5, "kg", "kg")).toBe(5);
    expect(convertUnit(100, "ml", "ml")).toBe(100);
    expect(convertUnit(3, "unit", "unit")).toBe(3);
  });
});

describe("convertUnit — weight conversions", () => {
  it("kg → g", () => {
    expect(convertUnit(1, "kg", "g")).toBe(1000);
    expect(convertUnit(2.5, "kg", "g")).toBe(2500);
  });

  it("g → kg", () => {
    expect(convertUnit(1000, "g", "kg")).toBe(1);
    expect(convertUnit(500, "g", "kg")).toBe(0.5);
  });

  it("kg → mg", () => {
    expect(convertUnit(1, "kg", "mg")).toBe(1000000);
  });

  it("mg → g", () => {
    expect(convertUnit(1000, "mg", "g")).toBe(1);
  });

  it("mg → kg", () => {
    expect(convertUnit(1000000, "mg", "kg")).toBe(1);
  });

  it("g → mg", () => {
    expect(convertUnit(1, "g", "mg")).toBe(1000);
  });
});

describe("convertUnit — volume conversions", () => {
  it("l → ml", () => {
    expect(convertUnit(1, "l", "ml")).toBe(1000);
    expect(convertUnit(0.5, "l", "ml")).toBe(500);
  });

  it("ml → l", () => {
    expect(convertUnit(1000, "ml", "l")).toBe(1);
  });

  it("l → cl", () => {
    expect(convertUnit(1, "l", "cl")).toBe(100);
  });

  it("cl → ml", () => {
    expect(convertUnit(10, "cl", "ml")).toBe(100);
  });

  it("cl → l", () => {
    expect(convertUnit(100, "cl", "l")).toBe(1);
  });
});

describe("convertUnit — countable conversions", () => {
  it("dozen → unit", () => {
    expect(convertUnit(1, "dozen", "unit")).toBe(12);
    expect(convertUnit(2, "dozen", "unit")).toBe(24);
  });

  it("unit → dozen", () => {
    expect(convertUnit(12, "unit", "dozen")).toBe(1);
    expect(convertUnit(6, "unit", "dozen")).toBe(0.5);
  });

  it("bunch → unit (1:1 ratio)", () => {
    expect(convertUnit(5, "bunch", "unit")).toBe(5);
  });

  it("slice → unit (1:1 ratio)", () => {
    expect(convertUnit(8, "slice", "unit")).toBe(8);
  });

  it("portion → unit (1:1 ratio)", () => {
    expect(convertUnit(3, "portion", "unit")).toBe(3);
  });
});

describe("convertUnit — cross-category with density", () => {
  // Water: density = 1 g/ml
  it("kg → l with water density (1 g/ml)", () => {
    // 1 kg = 1000g → 1000g / 1 (density) = 1000ml = 1L
    expect(convertUnit(1, "kg", "l", 1)).toBe(1);
  });

  it("l → kg with water density", () => {
    // 1L = 1000ml → 1000ml * 1 = 1000g = 1kg
    expect(convertUnit(1, "l", "kg", 1)).toBe(1);
  });

  // Olive oil: density = 0.92 g/ml
  it("kg → l with olive oil density (0.92)", () => {
    // 1kg = 1000g → 1000g / 0.92 ≈ 1086.96ml ≈ 1.087L
    const result = convertUnit(1, "kg", "l", 0.92);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(1.087, 2);
  });

  it("l → kg with olive oil density", () => {
    // 1L = 1000ml → 1000ml * 0.92 = 920g = 0.92kg
    expect(convertUnit(1, "l", "kg", 0.92)).toBe(0.92);
  });

  // Honey: density = 1.42 g/ml
  it("g → ml with honey density (1.42)", () => {
    // 100g / 1.42 ≈ 70.42ml
    const result = convertUnit(100, "g", "ml", 1.42);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(70.42, 1);
  });

  it("ml → g with honey density", () => {
    // 100ml * 1.42 = 142g
    expect(convertUnit(100, "ml", "g", 1.42)).toBe(142);
  });

  it("cl → kg with density", () => {
    // 10cl = 100ml → 100ml * 1 = 100g = 0.1kg
    expect(convertUnit(10, "cl", "kg", 1)).toBe(0.1);
  });
});

describe("convertUnit — incompatible conversions", () => {
  it("returns null for weight → volume without density", () => {
    expect(convertUnit(1, "kg", "l")).toBeNull();
    expect(convertUnit(100, "g", "ml")).toBeNull();
  });

  it("returns null for volume → weight without density", () => {
    expect(convertUnit(1, "l", "kg")).toBeNull();
  });

  it("returns null for countable → weight", () => {
    expect(convertUnit(5, "unit", "kg")).toBeNull();
    expect(convertUnit(5, "unit", "kg", 1)).toBeNull(); // density irrelevant
  });

  it("returns null for countable → volume", () => {
    expect(convertUnit(5, "unit", "ml")).toBeNull();
  });

  it("returns null for weight → countable", () => {
    expect(convertUnit(1, "kg", "unit")).toBeNull();
  });
});

// ── calculateUnitCost ───────────────────────────────────────

describe("calculateUnitCost", () => {
  it("calculates cost in same unit", () => {
    // 500g of an ingredient that costs 10€/kg → 0.5kg * 10 = 5€
    expect(calculateUnitCost(10, "kg", 500, "g")).toBe(5);
  });

  it("calculates cost across units", () => {
    // 2L of something that costs 5€/kg, density=1
    // 2L = 2000ml → 2000g = 2kg → 2 * 5 = 10€
    expect(calculateUnitCost(5, "kg", 2, "l", 1)).toBe(10);
  });

  it("returns null for incompatible units", () => {
    expect(calculateUnitCost(10, "kg", 5, "unit")).toBeNull();
  });

  it("handles same unit", () => {
    expect(calculateUnitCost(3, "kg", 2, "kg")).toBe(6);
  });

  it("handles cl → kg cost", () => {
    // 50cl of milk (density=1.03) at 0.90€/kg
    // 50cl = 500ml → 500*1.03 = 515g = 0.515kg → 0.515 * 0.90 = 0.4635€
    const result = calculateUnitCost(0.90, "kg", 50, "cl", 1.03);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.4635, 2);
  });
});

// ── applyWaste ──────────────────────────────────────────────

describe("applyWaste", () => {
  it("increases quantity to account for waste", () => {
    // 10% waste → need 1/(1-0.10) = 1.111x
    expect(applyWaste(1, 10)).toBeCloseTo(1.1111, 3);
    expect(applyWaste(100, 10)).toBeCloseTo(111.111, 2);
  });

  it("20% waste", () => {
    expect(applyWaste(1, 20)).toBeCloseTo(1.25, 4);
  });

  it("50% waste", () => {
    expect(applyWaste(1, 50)).toBe(2);
  });

  it("0% waste returns same quantity", () => {
    expect(applyWaste(100, 0)).toBe(100);
  });

  it("negative waste returns same quantity", () => {
    expect(applyWaste(100, -5)).toBe(100);
  });

  it("100% waste returns same quantity (edge case — division by zero guard)", () => {
    expect(applyWaste(100, 100)).toBe(100);
  });

  it(">100% waste returns same quantity", () => {
    expect(applyWaste(100, 150)).toBe(100);
  });
});

// ── usableAfterWaste ────────────────────────────────────────

describe("usableAfterWaste", () => {
  it("calculates usable quantity after waste", () => {
    expect(usableAfterWaste(100, 10)).toBe(90);
    expect(usableAfterWaste(100, 20)).toBe(80);
    expect(usableAfterWaste(100, 50)).toBe(50);
  });

  it("0% waste returns same quantity", () => {
    expect(usableAfterWaste(100, 0)).toBe(100);
  });

  it("100% waste returns same quantity (edge case guard)", () => {
    expect(usableAfterWaste(100, 100)).toBe(100);
  });

  it("roundtrips with applyWaste", () => {
    const original = 100;
    const wastePct = 15;
    const needed = applyWaste(original, wastePct);
    const usable = usableAfterWaste(needed, wastePct);
    expect(usable).toBeCloseTo(original, 10);
  });
});

// ── Constants & completeness ────────────────────────────────

describe("ALL_UNITS completeness", () => {
  it("has 12 units", () => {
    expect(ALL_UNITS).toHaveLength(12);
  });

  it("every unit has a label", () => {
    ALL_UNITS.forEach((u) => {
      expect(UNIT_LABELS[u]).toBeDefined();
      expect(typeof UNIT_LABELS[u]).toBe("string");
    });
  });

  it("every unit belongs to a category", () => {
    ALL_UNITS.forEach((u) => {
      const cat = getUnitCategory(u);
      expect(["weight", "volume", "countable"]).toContain(cat);
    });
  });

  it("UNITS_BY_CATEGORY covers all units", () => {
    const allFromCategories = [
      ...UNITS_BY_CATEGORY.weight,
      ...UNITS_BY_CATEGORY.volume,
      ...UNITS_BY_CATEGORY.countable,
    ];
    expect(allFromCategories.sort()).toEqual([...ALL_UNITS].sort());
  });
});
