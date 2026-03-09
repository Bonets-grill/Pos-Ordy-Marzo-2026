// ============================================================
// ESCANDALLO — Cost Engine Service (Supabase integration)
// Module 5: Cost Engine
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RecipeCostBreakdown, CostSnapshot, ServiceResult, UUID, UnitOfMeasure,
} from "../core/types";
import { calculateRecipeCost, type RecipeParams, type IngredientLine, type SubrecipeLine } from "./engine";

/**
 * Load a recipe's full data and calculate its cost breakdown.
 * This is the main orchestrator that fetches from DB and feeds the engine.
 */
export async function calculateRecipeCostFromDB(
  supabase: SupabaseClient,
  tenantId: UUID,
  recipeId: UUID
): Promise<ServiceResult<RecipeCostBreakdown>> {
  // Fetch recipe
  const { data: recipe, error: recErr } = await supabase
    .from("esc_recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("tenant_id", tenantId)
    .single();

  if (recErr || !recipe) return { ok: false, error: recErr?.message ?? "Recipe not found" };

  // Fetch ingredients with their details
  const { data: recIngredients, error: riErr } = await supabase
    .from("esc_recipe_ingredients")
    .select("*, esc_ingredients(id, name, unit, cost_per_unit, waste_pct, density)")
    .eq("recipe_id", recipeId)
    .eq("recipe_version", recipe.current_version);

  if (riErr) return { ok: false, error: riErr.message };

  // Fetch subrecipes
  const { data: recSubrecipes, error: srErr } = await supabase
    .from("esc_recipe_subrecipes")
    .select("*, child:child_recipe_id(id, name, yield_qty, yield_unit)")
    .eq("parent_recipe_id", recipeId)
    .eq("parent_version", recipe.current_version);

  if (srErr) return { ok: false, error: srErr.message };

  // Build ingredient lines
  const ingredients: IngredientLine[] = (recIngredients ?? []).map((ri: Record<string, unknown>) => {
    const ing = ri.esc_ingredients as Record<string, unknown> | null;
    return {
      ingredient_id: (ing?.id as string) ?? "",
      ingredient_name: (ing?.name as string) ?? "",
      quantity: ri.quantity as number,
      unit: ri.unit as UnitOfMeasure,
      cost_per_unit: (ing?.cost_per_unit as number) ?? 0,
      base_unit: (ing?.unit as UnitOfMeasure) ?? ri.unit,
      waste_pct: (ri.waste_pct_override as number) ?? (ing?.waste_pct as number) ?? 0,
      density: (ing?.density as number) ?? null,
    };
  });

  // Build subrecipe lines (recursive cost calculation)
  const subrecipes: SubrecipeLine[] = [];
  for (const sr of (recSubrecipes ?? []) as Record<string, unknown>[]) {
    const child = sr.child as Record<string, unknown> | null;
    if (!child) continue;

    // Recursively calculate subrecipe cost
    const childCostResult = await calculateRecipeCostFromDB(supabase, tenantId, child.id as string);
    const childTotalCost = childCostResult.ok ? childCostResult.data!.total_cost : 0;

    subrecipes.push({
      recipe_id: child.id as string,
      recipe_name: (child.name as string) ?? "",
      quantity: sr.quantity as number,
      unit: sr.unit as UnitOfMeasure,
      total_cost: childTotalCost,
      yield_qty: (child.yield_qty as number) ?? 1,
      yield_unit: (child.yield_unit as UnitOfMeasure) ?? "portion",
    });
  }

  // Calculate
  const params: RecipeParams = {
    recipe_id: recipe.id,
    recipe_name: recipe.name,
    category: recipe.category,
    portions: recipe.portions,
    sale_price: recipe.sale_price,
    target_margin_pct: recipe.target_margin_pct,
    ingredients,
    subrecipes,
  };

  const breakdown = calculateRecipeCost(params);
  return { ok: true, data: breakdown };
}

/**
 * Calculate and save a cost snapshot for a recipe.
 */
export async function saveCostSnapshot(
  supabase: SupabaseClient,
  tenantId: UUID,
  recipeId: UUID,
  reason: "price_change" | "recipe_update" | "manual" | "scheduled" = "manual"
): Promise<ServiceResult<CostSnapshot>> {
  const costResult = await calculateRecipeCostFromDB(supabase, tenantId, recipeId);
  if (!costResult.ok || !costResult.data) return { ok: false, error: costResult.error ?? "Failed to calculate cost" };

  const breakdown = costResult.data;

  // Get current recipe version
  const { data: recipe } = await supabase
    .from("esc_recipes")
    .select("current_version")
    .eq("id", recipeId)
    .single();

  const { data, error } = await supabase
    .from("esc_cost_snapshots")
    .insert({
      tenant_id: tenantId,
      recipe_id: recipeId,
      recipe_version: recipe?.current_version ?? 1,
      total_cost: breakdown.total_cost,
      cost_per_portion: breakdown.cost_per_portion,
      food_cost_pct: breakdown.food_cost_pct,
      margin: breakdown.margin,
      sale_price: breakdown.sale_price,
      snapshot_reason: reason,
      ingredient_costs: breakdown.ingredients,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  // Also update the recipe version with latest costs
  await supabase
    .from("esc_recipe_versions")
    .update({
      total_cost: breakdown.total_cost,
      cost_per_portion: breakdown.cost_per_portion,
      food_cost_pct: breakdown.food_cost_pct,
      margin: breakdown.margin,
    })
    .eq("recipe_id", recipeId)
    .eq("version", recipe?.current_version ?? 1);

  return { ok: true, data: data as CostSnapshot };
}

/**
 * Get cost history (snapshots) for a recipe.
 */
export async function getCostHistory(
  supabase: SupabaseClient,
  tenantId: UUID,
  recipeId: UUID,
  limit = 20
): Promise<ServiceResult<CostSnapshot[]>> {
  const { data, error } = await supabase
    .from("esc_cost_snapshots")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as CostSnapshot[] };
}

/**
 * Recalculate costs for ALL active recipes in a tenant.
 * Called when an ingredient price changes.
 */
export async function recalculateAllRecipes(
  supabase: SupabaseClient,
  tenantId: UUID,
  reason: "price_change" | "scheduled" = "price_change"
): Promise<ServiceResult<{ updated: number; errors: string[] }>> {
  const { data: recipes, error } = await supabase
    .from("esc_recipes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (error) return { ok: false, error: error.message };

  let updated = 0;
  const errors: string[] = [];

  for (const recipe of (recipes ?? [])) {
    const result = await saveCostSnapshot(supabase, tenantId, recipe.id, reason);
    if (result.ok) updated++;
    else errors.push(`Recipe ${recipe.id}: ${result.error}`);
  }

  return { ok: true, data: { updated, errors } };
}
