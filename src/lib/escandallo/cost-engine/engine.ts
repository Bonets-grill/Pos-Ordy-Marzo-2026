// ============================================================
// ESCANDALLO — Cost Engine
// Module 5: Cost Engine
// ============================================================
// Pure business logic for cost calculations.
// No UI, no Supabase calls — just math.
// Supabase integration is in service.ts.
// ============================================================

import type {
  RecipeCostBreakdown, IngredientCostDetail, SubrecipeCostDetail,
  RecipeCategory, UnitOfMeasure,
} from "../core/types";
import { convertUnit, applyWaste } from "../core/units";
import { round, roundCost, foodCostPct, grossMargin, marginPct, roundCurrency } from "../core/money";

// ── Input types for the engine ──────────────────────────────

export interface IngredientLine {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  base_unit: UnitOfMeasure;
  waste_pct: number;
  density?: number | null;
}

export interface SubrecipeLine {
  recipe_id: string;
  recipe_name: string;
  quantity: number;
  unit: UnitOfMeasure;
  total_cost: number;      // total cost of the subrecipe itself
  yield_qty: number;        // yield of the subrecipe
  yield_unit: UnitOfMeasure;
}

export interface RecipeParams {
  recipe_id: string;
  recipe_name: string;
  category: RecipeCategory;
  portions: number;
  sale_price: number;
  target_margin_pct: number;
  ingredients: IngredientLine[];
  subrecipes: SubrecipeLine[];
}

// ── Single ingredient cost ──────────────────────────────────

/**
 * Calculate the cost of a single ingredient line in a recipe.
 * Handles unit conversion and waste adjustment.
 */
export function calcIngredientLineCost(line: IngredientLine): number {
  // Convert used quantity to the ingredient's base unit
  const converted = convertUnit(line.quantity, line.unit, line.base_unit, line.density);

  let baseQty: number;
  if (converted !== null) {
    baseQty = converted;
  } else {
    // Fallback: assume same unit if conversion fails
    baseQty = line.quantity;
  }

  // Apply waste: if 10% waste, need 1/(1-0.10) of the quantity
  const adjustedQty = applyWaste(baseQty, line.waste_pct);

  // Cost = adjusted quantity * cost per base unit
  return roundCost(adjustedQty * line.cost_per_unit);
}

// ── Subrecipe cost ──────────────────────────────────────────

/**
 * Calculate the cost of a subrecipe line.
 * Based on the subrecipe's total cost proportional to the quantity used.
 */
export function calcSubrecipeLineCost(line: SubrecipeLine): number {
  if (line.yield_qty <= 0) return 0;

  // Convert requested quantity to the subrecipe's yield unit
  const converted = convertUnit(line.quantity, line.unit, line.yield_unit);
  const qty = converted ?? line.quantity;

  // Cost proportional to yield
  return roundCost((qty / line.yield_qty) * line.total_cost);
}

// ── Full recipe cost breakdown ──────────────────────────────

/**
 * Calculate complete cost breakdown for a recipe.
 * This is the main function of the cost engine.
 */
export function calculateRecipeCost(params: RecipeParams): RecipeCostBreakdown {
  // Calculate each ingredient's cost
  const ingredientDetails: IngredientCostDetail[] = params.ingredients.map((line) => {
    const lineCost = calcIngredientLineCost(line);
    return {
      ingredient_id: line.ingredient_id,
      ingredient_name: line.ingredient_name,
      quantity: line.quantity,
      unit: line.unit,
      cost_per_unit: line.cost_per_unit,
      waste_pct: line.waste_pct,
      line_cost: lineCost,
    };
  });

  // Calculate each subrecipe's cost
  const subrecipeDetails: SubrecipeCostDetail[] = params.subrecipes.map((line) => {
    const lineCost = calcSubrecipeLineCost(line);
    return {
      recipe_id: line.recipe_id,
      recipe_name: line.recipe_name,
      quantity: line.quantity,
      unit: line.unit,
      cost: lineCost,
    };
  });

  // Total cost = sum of ingredients + subrecipes
  const ingredientsCost = ingredientDetails.reduce((sum, d) => sum + d.line_cost, 0);
  const subrecipesCost = subrecipeDetails.reduce((sum, d) => sum + d.cost, 0);
  const totalCost = roundCurrency(ingredientsCost + subrecipesCost);

  // Per portion
  const costPerPortion = params.portions > 0 ? roundCurrency(totalCost / params.portions) : 0;

  // Financial metrics
  const fc = foodCostPct(costPerPortion, params.sale_price);
  const margin = grossMargin(params.sale_price, costPerPortion);
  const mPct = marginPct(params.sale_price, costPerPortion);

  return {
    recipe_id: params.recipe_id,
    recipe_name: params.recipe_name,
    category: params.category,
    portions: params.portions,
    sale_price: params.sale_price,
    total_cost: totalCost,
    cost_per_portion: costPerPortion,
    food_cost_pct: fc,
    margin,
    margin_pct: mPct,
    target_margin_pct: params.target_margin_pct,
    is_profitable: mPct >= params.target_margin_pct,
    ingredients: ingredientDetails,
    subrecipes: subrecipeDetails,
  };
}

// ── Batch calculations ──────────────────────────────────────

/**
 * Calculate costs for multiple recipes at once.
 * Useful for dashboard and analytics.
 */
export function calculateMultipleRecipeCosts(recipes: RecipeParams[]): RecipeCostBreakdown[] {
  return recipes.map(calculateRecipeCost);
}

/**
 * Find the impact of changing an ingredient's price across all recipes.
 * Returns list of affected recipes with before/after costs.
 */
export function priceChangeImpact(
  recipes: RecipeParams[],
  ingredientId: string,
  newCostPerUnit: number
): Array<{
  recipe_id: string;
  recipe_name: string;
  before: RecipeCostBreakdown;
  after: RecipeCostBreakdown;
  cost_delta: number;
  margin_delta: number;
}> {
  return recipes
    .filter((r) => r.ingredients.some((i) => i.ingredient_id === ingredientId))
    .map((r) => {
      const before = calculateRecipeCost(r);

      // Create modified params with new price
      const modifiedIngredients = r.ingredients.map((i) =>
        i.ingredient_id === ingredientId ? { ...i, cost_per_unit: newCostPerUnit } : i
      );
      const after = calculateRecipeCost({ ...r, ingredients: modifiedIngredients });

      return {
        recipe_id: r.recipe_id,
        recipe_name: r.recipe_name,
        before,
        after,
        cost_delta: round(after.total_cost - before.total_cost, 4),
        margin_delta: round(after.margin - before.margin, 4),
      };
    });
}
