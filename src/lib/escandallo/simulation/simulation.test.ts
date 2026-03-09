import { describe, it, expect } from "vitest";
import {
  simulatePriceChange, simulateCostChange,
  simulateIngredientSwap, simulateQuantityChange,
} from "./service";
import type { RecipeParams, IngredientLine } from "../cost-engine/engine";

// ── Helpers ─────────────────────────────────────────────────

function makeIngredient(overrides: Partial<IngredientLine> = {}): IngredientLine {
  return {
    ingredient_id: "ing-1",
    ingredient_name: "Tomate",
    quantity: 1,
    unit: "kg",
    cost_per_unit: 2,
    base_unit: "kg",
    waste_pct: 0,
    density: null,
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<RecipeParams> = {}): RecipeParams {
  return {
    recipe_id: "rec-1",
    recipe_name: "Burger",
    category: "main",
    portions: 1,
    sale_price: 10,
    target_margin_pct: 70,
    ingredients: [makeIngredient({ cost_per_unit: 3, quantity: 1 })],
    subrecipes: [],
    ...overrides,
  };
}

// ── simulatePriceChange ─────────────────────────────────────

describe("simulatePriceChange", () => {
  it("increasing price improves margin", () => {
    const result = simulatePriceChange({
      recipe_params: makeRecipe(),
      new_sale_price: 15,
    });
    expect(result.delta_cost).toBe(0);
    expect(result.delta_margin).toBeGreaterThan(0);
    expect(result.after.sale_price).toBe(15);
    expect(result.before.sale_price).toBe(10);
    expect(result.after.food_cost_pct).toBeLessThan(result.before.food_cost_pct);
  });

  it("decreasing price worsens margin", () => {
    const result = simulatePriceChange({
      recipe_params: makeRecipe(),
      new_sale_price: 5,
    });
    expect(result.delta_margin).toBeLessThan(0);
    expect(result.after.food_cost_pct).toBeGreaterThan(result.before.food_cost_pct);
  });

  it("same price = zero delta", () => {
    const result = simulatePriceChange({
      recipe_params: makeRecipe(),
      new_sale_price: 10,
    });
    expect(result.delta_cost).toBe(0);
    expect(result.delta_margin).toBe(0);
    expect(result.delta_food_cost_pct).toBe(0);
  });

  it("cost stays unchanged in price simulation", () => {
    const result = simulatePriceChange({
      recipe_params: makeRecipe(),
      new_sale_price: 20,
    });
    expect(result.before.total_cost).toBe(result.after.total_cost);
    expect(result.before.cost_per_portion).toBe(result.after.cost_per_portion);
  });

  it("zero price edge case", () => {
    const result = simulatePriceChange({
      recipe_params: makeRecipe(),
      new_sale_price: 0,
    });
    expect(result.after.sale_price).toBe(0);
    expect(result.after.margin).toBeLessThan(0);
  });
});

// ── simulateCostChange ──────────────────────────────────────

describe("simulateCostChange", () => {
  it("ingredient price increase raises cost", () => {
    const result = simulateCostChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_cost_per_unit: 6, // double
    });
    expect(result.delta_cost).toBeGreaterThan(0);
    expect(result.delta_margin).toBeLessThan(0);
    expect(result.after.total_cost).toBeGreaterThan(result.before.total_cost);
  });

  it("ingredient price decrease lowers cost", () => {
    const result = simulateCostChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_cost_per_unit: 1,
    });
    expect(result.delta_cost).toBeLessThan(0);
    expect(result.delta_margin).toBeGreaterThan(0);
  });

  it("non-existent ingredient changes nothing", () => {
    const result = simulateCostChange({
      recipe_params: makeRecipe(),
      ingredient_id: "non-existent",
      new_cost_per_unit: 999,
    });
    expect(result.delta_cost).toBe(0);
    expect(result.delta_margin).toBe(0);
  });

  it("zero cost makes recipe free", () => {
    const result = simulateCostChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_cost_per_unit: 0,
    });
    expect(result.after.total_cost).toBe(0);
    expect(result.after.food_cost_pct).toBe(0);
    expect(result.after.margin).toBe(10); // full sale price
  });
});

// ── simulateIngredientSwap ──────────────────────────────────

describe("simulateIngredientSwap", () => {
  it("swapping for cheaper ingredient improves margin", () => {
    const cheapIngredient = makeIngredient({
      ingredient_id: "ing-cheap",
      ingredient_name: "Tomate Conserva",
      cost_per_unit: 1,
      quantity: 1,
    });
    const result = simulateIngredientSwap({
      recipe_params: makeRecipe(),
      old_ingredient_id: "ing-1",
      new_ingredient: cheapIngredient,
    });
    expect(result.delta_cost).toBeLessThan(0);
    expect(result.delta_margin).toBeGreaterThan(0);
  });

  it("swapping for premium ingredient worsens margin", () => {
    const premiumIngredient = makeIngredient({
      ingredient_id: "ing-premium",
      ingredient_name: "Tomate Raf",
      cost_per_unit: 8,
      quantity: 1,
    });
    const result = simulateIngredientSwap({
      recipe_params: makeRecipe(),
      old_ingredient_id: "ing-1",
      new_ingredient: premiumIngredient,
    });
    expect(result.delta_cost).toBeGreaterThan(0);
    expect(result.delta_margin).toBeLessThan(0);
  });

  it("swap preserves sale price", () => {
    const result = simulateIngredientSwap({
      recipe_params: makeRecipe(),
      old_ingredient_id: "ing-1",
      new_ingredient: makeIngredient({ ingredient_id: "new", cost_per_unit: 5 }),
    });
    expect(result.before.sale_price).toBe(result.after.sale_price);
  });
});

// ── simulateQuantityChange ──────────────────────────────────

describe("simulateQuantityChange", () => {
  it("increasing quantity raises cost", () => {
    const result = simulateQuantityChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_quantity: 2, // double
    });
    expect(result.delta_cost).toBeGreaterThan(0);
    expect(result.after.total_cost).toBeCloseTo(6, 1); // 2kg * 3€/kg
  });

  it("decreasing quantity lowers cost", () => {
    const result = simulateQuantityChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_quantity: 0.5,
    });
    expect(result.delta_cost).toBeLessThan(0);
    expect(result.after.total_cost).toBeCloseTo(1.5, 1); // 0.5kg * 3€/kg
  });

  it("zero quantity makes ingredient free", () => {
    const result = simulateQuantityChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_quantity: 0,
    });
    expect(result.after.total_cost).toBe(0);
  });

  it("non-existent ingredient changes nothing", () => {
    const result = simulateQuantityChange({
      recipe_params: makeRecipe(),
      ingredient_id: "non-existent",
      new_quantity: 999,
    });
    expect(result.delta_cost).toBe(0);
  });
});

// ── Cross-simulation consistency ────────────────────────────

describe("Simulation consistency", () => {
  it("delta_margin = after.margin - before.margin", () => {
    const result = simulateCostChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_cost_per_unit: 5,
    });
    expect(result.delta_margin).toBeCloseTo(result.after.margin - result.before.margin, 1);
  });

  it("delta_cost = after.total_cost - before.total_cost", () => {
    const result = simulateQuantityChange({
      recipe_params: makeRecipe(),
      ingredient_id: "ing-1",
      new_quantity: 3,
    });
    expect(result.delta_cost).toBeCloseTo(result.after.total_cost - result.before.total_cost, 1);
  });

  it("before values are identical across sim types for same recipe", () => {
    const recipe = makeRecipe();
    const r1 = simulatePriceChange({ recipe_params: recipe, new_sale_price: 20 });
    const r2 = simulateCostChange({ recipe_params: recipe, ingredient_id: "ing-1", new_cost_per_unit: 5 });
    const r3 = simulateQuantityChange({ recipe_params: recipe, ingredient_id: "ing-1", new_quantity: 2 });

    expect(r1.before.total_cost).toBe(r2.before.total_cost);
    expect(r2.before.total_cost).toBe(r3.before.total_cost);
    expect(r1.before.margin).toBe(r2.before.margin);
    expect(r1.before.food_cost_pct).toBe(r2.before.food_cost_pct);
  });
});

// ── Real restaurant scenario ────────────────────────────────

describe("Real scenario: supplier raises beef price 20%", () => {
  const burger = makeRecipe({
    recipe_name: "Burger Premium",
    portions: 1,
    sale_price: 14.50,
    target_margin_pct: 65,
    ingredients: [
      makeIngredient({ ingredient_id: "beef", ingredient_name: "Carne", quantity: 200, unit: "g", base_unit: "kg", cost_per_unit: 12, waste_pct: 5 }),
      makeIngredient({ ingredient_id: "bun", ingredient_name: "Pan", quantity: 1, unit: "unit", base_unit: "unit", cost_per_unit: 0.45, waste_pct: 0 }),
      makeIngredient({ ingredient_id: "cheese", ingredient_name: "Queso", quantity: 40, unit: "g", base_unit: "kg", cost_per_unit: 14, waste_pct: 2 }),
    ],
  });

  it("shows cost increase impact", () => {
    const result = simulateCostChange({
      recipe_params: burger,
      ingredient_id: "beef",
      new_cost_per_unit: 14.40, // +20%
    });
    expect(result.delta_cost).toBeGreaterThan(0);
    expect(result.after.food_cost_pct).toBeGreaterThan(result.before.food_cost_pct);
  });

  it("shows how much to raise price to maintain margin", () => {
    const beforeResult = simulateCostChange({
      recipe_params: burger,
      ingredient_id: "beef",
      new_cost_per_unit: 14.40,
    });

    // Now simulate raising the sale price to recover margin
    const newRecipe = { ...burger, ingredients: burger.ingredients.map(i => i.ingredient_id === "beef" ? { ...i, cost_per_unit: 14.40 } : i) };
    const priceResult = simulatePriceChange({
      recipe_params: newRecipe,
      new_sale_price: 16, // raise from 14.50 to 16
    });
    expect(priceResult.after.margin).toBeGreaterThan(beforeResult.after.margin);
  });

  it("shows ingredient swap alternative", () => {
    const cheaperBeef = makeIngredient({
      ingredient_id: "beef-alt",
      ingredient_name: "Carne Nacional",
      quantity: 200, unit: "g", base_unit: "kg",
      cost_per_unit: 9, // cheaper alternative
      waste_pct: 8, // slightly more waste
    });
    const result = simulateIngredientSwap({
      recipe_params: burger,
      old_ingredient_id: "beef",
      new_ingredient: cheaperBeef,
    });
    expect(result.delta_cost).toBeLessThan(0); // cheaper overall
    expect(result.after.margin).toBeGreaterThan(result.before.margin);
  });

  it("shows quantity reduction option", () => {
    const result = simulateQuantityChange({
      recipe_params: burger,
      ingredient_id: "beef",
      new_quantity: 180, // reduce from 200g to 180g
    });
    expect(result.delta_cost).toBeLessThan(0);
  });
});
