// ============================================================
// ESCANDALLO CORE — Unit of Measure Utilities
// Module 1: Core Foundation
// ============================================================

import type { UnitOfMeasure, UnitCategory } from "./types";

/** Map each unit to its category */
const UNIT_CATEGORIES: Record<UnitOfMeasure, UnitCategory> = {
  kg: "weight",
  g: "weight",
  mg: "weight",
  l: "volume",
  ml: "volume",
  cl: "volume",
  unit: "countable",
  portion: "countable",
  dozen: "countable",
  bunch: "countable",
  slice: "countable",
  sheet: "countable",
};

/** Conversion factors to the base unit of each category (g for weight, ml for volume) */
const TO_BASE: Record<string, number> = {
  // Weight → grams
  kg: 1000,
  g: 1,
  mg: 0.001,
  // Volume → milliliters
  l: 1000,
  ml: 1,
  cl: 10,
  // Countable → unit
  unit: 1,
  portion: 1,
  dozen: 12,
  bunch: 1,
  slice: 1,
  sheet: 1,
};

/** Human-readable labels */
export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  kg: "kg",
  g: "g",
  mg: "mg",
  l: "L",
  ml: "mL",
  cl: "cL",
  unit: "ud",
  portion: "rac",
  dozen: "doc",
  bunch: "man",
  slice: "lon",
  sheet: "lam",
};

/** All available units */
export const ALL_UNITS: UnitOfMeasure[] = [
  "kg", "g", "mg", "l", "ml", "cl",
  "unit", "portion", "dozen", "bunch", "slice", "sheet",
];

/** Units grouped by category */
export const UNITS_BY_CATEGORY: Record<UnitCategory, UnitOfMeasure[]> = {
  weight: ["kg", "g", "mg"],
  volume: ["l", "ml", "cl"],
  countable: ["unit", "portion", "dozen", "bunch", "slice", "sheet"],
};

/** Get the category of a unit */
export function getUnitCategory(unit: UnitOfMeasure): UnitCategory {
  return UNIT_CATEGORIES[unit];
}

/** Check if two units are in the same category (can be converted directly) */
export function areUnitsCompatible(from: UnitOfMeasure, to: UnitOfMeasure): boolean {
  return UNIT_CATEGORIES[from] === UNIT_CATEGORIES[to];
}

/**
 * Convert a quantity from one unit to another within the same category.
 * For cross-category conversions (weight ↔ volume), density must be provided.
 *
 * @param qty - The quantity to convert
 * @param from - Source unit
 * @param to - Target unit
 * @param density - Optional density in g/ml for weight↔volume conversions
 * @returns Converted quantity, or null if conversion is not possible
 */
export function convertUnit(
  qty: number,
  from: UnitOfMeasure,
  to: UnitOfMeasure,
  density?: number | null
): number | null {
  if (from === to) return qty;

  const catFrom = UNIT_CATEGORIES[from];
  const catTo = UNIT_CATEGORIES[to];

  // Same category — direct conversion
  if (catFrom === catTo) {
    const baseQty = qty * TO_BASE[from];
    return baseQty / TO_BASE[to];
  }

  // Weight ↔ Volume requires density
  if (
    density != null &&
    ((catFrom === "weight" && catTo === "volume") ||
      (catFrom === "volume" && catTo === "weight"))
  ) {
    if (catFrom === "weight" && catTo === "volume") {
      // grams → ml: ml = g / density
      const grams = qty * TO_BASE[from];
      const ml = grams / density;
      return ml / TO_BASE[to];
    }
    // ml → grams: g = ml * density
    const ml = qty * TO_BASE[from];
    const grams = ml * density;
    return grams / TO_BASE[to];
  }

  // Incompatible
  return null;
}

/**
 * Calculate the cost of a quantity in a given unit,
 * based on cost_per_unit in the ingredient's base unit.
 */
export function calculateUnitCost(
  costPerUnit: number,
  baseUnit: UnitOfMeasure,
  quantity: number,
  usedUnit: UnitOfMeasure,
  density?: number | null
): number | null {
  const converted = convertUnit(quantity, usedUnit, baseUnit, density);
  if (converted === null) return null;
  return converted * costPerUnit;
}

/**
 * Apply waste/shrinkage percentage.
 * If an ingredient has 10% waste, you need 1/(1-0.10) = 1.111x the quantity.
 */
export function applyWaste(quantity: number, wastePct: number): number {
  if (wastePct <= 0 || wastePct >= 100) return quantity;
  return quantity / (1 - wastePct / 100);
}

/**
 * Get the usable quantity after waste.
 */
export function usableAfterWaste(quantity: number, wastePct: number): number {
  if (wastePct <= 0 || wastePct >= 100) return quantity;
  return quantity * (1 - wastePct / 100);
}
