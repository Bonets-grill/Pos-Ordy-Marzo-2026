// ============================================================
// ESCANDALLO — Price Simulation & Margin Lab
// Module 7: Simulation
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SimulationRun, SimulationResult, ServiceResult, UUID, UnitOfMeasure,
} from "../core/types";
import {
  calculateRecipeCost, type RecipeParams, type IngredientLine,
} from "../cost-engine/engine";
import { foodCostPct, grossMargin, marginPct, roundCurrency } from "../core/money";

// ── Types ───────────────────────────────────────────────────

export interface SimulatePriceChangeInput {
  recipe_params: RecipeParams;
  new_sale_price: number;
}

export interface SimulateCostChangeInput {
  recipe_params: RecipeParams;
  ingredient_id: string;
  new_cost_per_unit: number;
}

export interface SimulateIngredientSwapInput {
  recipe_params: RecipeParams;
  old_ingredient_id: string;
  new_ingredient: IngredientLine;
}

export interface SimulateQuantityChangeInput {
  recipe_params: RecipeParams;
  ingredient_id: string;
  new_quantity: number;
}

export interface SimulationComparison {
  before: SimulationResult;
  after: SimulationResult;
  delta_cost: number;
  delta_margin: number;
  delta_food_cost_pct: number;
  delta_margin_pct: number;
}

// ── Pure simulation functions (no DB) ───────────────────────

function toSimResult(params: RecipeParams): SimulationResult {
  const bd = calculateRecipeCost(params);
  return {
    total_cost: bd.total_cost,
    cost_per_portion: bd.cost_per_portion,
    food_cost_pct: bd.food_cost_pct,
    margin: bd.margin,
    sale_price: bd.sale_price,
  };
}

/** Simulate changing the sale price */
export function simulatePriceChange(input: SimulatePriceChangeInput): SimulationComparison {
  const before = toSimResult(input.recipe_params);
  const after = toSimResult({ ...input.recipe_params, sale_price: input.new_sale_price });

  return {
    before, after,
    delta_cost: 0, // cost doesn't change with price
    delta_margin: roundCurrency(after.margin - before.margin),
    delta_food_cost_pct: roundCurrency(after.food_cost_pct - before.food_cost_pct),
    delta_margin_pct: roundCurrency((after.margin / after.sale_price * 100) - (before.margin / before.sale_price * 100)),
  };
}

/** Simulate changing an ingredient's cost */
export function simulateCostChange(input: SimulateCostChangeInput): SimulationComparison {
  const before = toSimResult(input.recipe_params);

  const modifiedIngredients = input.recipe_params.ingredients.map((i) =>
    i.ingredient_id === input.ingredient_id
      ? { ...i, cost_per_unit: input.new_cost_per_unit }
      : i
  );

  const after = toSimResult({ ...input.recipe_params, ingredients: modifiedIngredients });

  return {
    before, after,
    delta_cost: roundCurrency(after.total_cost - before.total_cost),
    delta_margin: roundCurrency(after.margin - before.margin),
    delta_food_cost_pct: roundCurrency(after.food_cost_pct - before.food_cost_pct),
    delta_margin_pct: roundCurrency(marginPct(after.sale_price, after.cost_per_portion) - marginPct(before.sale_price, before.cost_per_portion)),
  };
}

/** Simulate swapping one ingredient for another */
export function simulateIngredientSwap(input: SimulateIngredientSwapInput): SimulationComparison {
  const before = toSimResult(input.recipe_params);

  const modifiedIngredients = input.recipe_params.ingredients.map((i) =>
    i.ingredient_id === input.old_ingredient_id ? input.new_ingredient : i
  );

  const after = toSimResult({ ...input.recipe_params, ingredients: modifiedIngredients });

  return {
    before, after,
    delta_cost: roundCurrency(after.total_cost - before.total_cost),
    delta_margin: roundCurrency(after.margin - before.margin),
    delta_food_cost_pct: roundCurrency(after.food_cost_pct - before.food_cost_pct),
    delta_margin_pct: roundCurrency(marginPct(after.sale_price, after.cost_per_portion) - marginPct(before.sale_price, before.cost_per_portion)),
  };
}

/** Simulate changing an ingredient's quantity */
export function simulateQuantityChange(input: SimulateQuantityChangeInput): SimulationComparison {
  const before = toSimResult(input.recipe_params);

  const modifiedIngredients = input.recipe_params.ingredients.map((i) =>
    i.ingredient_id === input.ingredient_id ? { ...i, quantity: input.new_quantity } : i
  );

  const after = toSimResult({ ...input.recipe_params, ingredients: modifiedIngredients });

  return {
    before, after,
    delta_cost: roundCurrency(after.total_cost - before.total_cost),
    delta_margin: roundCurrency(after.margin - before.margin),
    delta_food_cost_pct: roundCurrency(after.food_cost_pct - before.food_cost_pct),
    delta_margin_pct: roundCurrency(marginPct(after.sale_price, after.cost_per_portion) - marginPct(before.sale_price, before.cost_per_portion)),
  };
}

// ── Persist simulation ──────────────────────────────────────

export async function saveSimulationRun(
  supabase: SupabaseClient,
  tenantId: UUID,
  recipeId: UUID,
  simulationType: "price_change" | "cost_change" | "ingredient_swap" | "quantity_change",
  comparison: SimulationComparison,
  parameters: Record<string, unknown>,
  userId?: string | null
): Promise<ServiceResult<SimulationRun>> {
  const { data, error } = await supabase
    .from("esc_simulation_runs")
    .insert({
      tenant_id: tenantId,
      recipe_id: recipeId,
      simulation_type: simulationType,
      parameters,
      result_before: comparison.before,
      result_after: comparison.after,
      created_by: userId ?? null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as SimulationRun };
}
