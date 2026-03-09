// ============================================================
// ESCANDALLO — Integration Layer
// Module 10: Integration
// ============================================================
// This module coordinates all escandallo modules without coupling.
// It provides high-level orchestration functions and
// integration points for POS, inventory, and future AI.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult, UUID, RecipeCostBreakdown } from "../core/types";
import { calculateRecipeCostFromDB, saveCostSnapshot, recalculateAllRecipes } from "../cost-engine/service";
import { consumeRecipe } from "../inventory/service";
import { scanAndGenerateAlerts } from "../alerts/service";

// ── POS Integration Points ──────────────────────────────────

/**
 * Called when a POS order is completed.
 * Deducts ingredients from inventory based on recipe composition.
 *
 * Usage from POS:
 *   import { onOrderCompleted } from '@/lib/escandallo/integration';
 *   await onOrderCompleted(supabase, tenantId, [
 *     { recipe_id: 'uuid', multiplier: 2 }, // 2 portions sold
 *   ], orderId, userId);
 */
export async function onOrderCompleted(
  supabase: SupabaseClient,
  tenantId: UUID,
  items: Array<{ recipe_id: string; multiplier: number }>,
  orderId?: string,
  userId?: string
): Promise<ServiceResult<{ consumed: number; errors: string[] }>> {
  let totalConsumed = 0;
  const allErrors: string[] = [];

  for (const item of items) {
    const result = await consumeRecipe(supabase, tenantId, item, orderId, userId);
    if (result.ok && result.data) {
      totalConsumed += result.data.consumed;
      allErrors.push(...result.data.errors);
    } else {
      allErrors.push(`Recipe ${item.recipe_id}: ${result.error}`);
    }
  }

  return { ok: true, data: { consumed: totalConsumed, errors: allErrors } };
}

/**
 * Called when an ingredient price is updated.
 * Recalculates all affected recipes and generates alerts.
 */
export async function onIngredientPriceChanged(
  supabase: SupabaseClient,
  tenantId: UUID,
  ingredientId: UUID
): Promise<ServiceResult<{ recipes_updated: number; alerts_generated: number }>> {
  // Recalculate all recipes that use this ingredient
  const recalcResult = await recalculateAllRecipes(supabase, tenantId, "price_change");
  const recipesUpdated = recalcResult.ok ? recalcResult.data?.updated ?? 0 : 0;

  // Scan for new alerts
  const alertResult = await scanAndGenerateAlerts(supabase, tenantId);
  const alertsGenerated = alertResult.ok ? alertResult.data?.generated ?? 0 : 0;

  return {
    ok: true,
    data: { recipes_updated: recipesUpdated, alerts_generated: alertsGenerated },
  };
}

/**
 * Full system recalculation.
 * Call periodically (daily) or after bulk changes.
 */
export async function fullSystemRecalculation(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<{ recipes: number; alerts: number }>> {
  const recalcResult = await recalculateAllRecipes(supabase, tenantId, "scheduled");
  const alertResult = await scanAndGenerateAlerts(supabase, tenantId);

  return {
    ok: true,
    data: {
      recipes: recalcResult.ok ? recalcResult.data?.updated ?? 0 : 0,
      alerts: alertResult.ok ? alertResult.data?.generated ?? 0 : 0,
    },
  };
}

// ── Future Integration Contracts ────────────────────────────

/**
 * AI Integration contract.
 * Future AI layer should implement these functions.
 *
 * Suggested capabilities:
 *   - suggestIdealPrice(recipeId): Calculate optimal sale price
 *   - detectUnprofitableRecipes(tenantId): Find recipes to remove
 *   - recommendIngredientSubstitution(ingredientId): Find cheaper alternatives
 *   - optimizeMargin(recipeId): Suggest quantity/ingredient changes
 *   - predictCostTrends(tenantId): Forecast future costs
 */
export interface AIIntegrationContract {
  suggestIdealPrice: (supabase: SupabaseClient, tenantId: UUID, recipeId: UUID) => Promise<ServiceResult<{ suggested_price: number; reasoning: string }>>;
  detectUnprofitableRecipes: (supabase: SupabaseClient, tenantId: UUID) => Promise<ServiceResult<Array<{ recipe_id: UUID; recommendation: string }>>>;
  recommendSubstitution: (supabase: SupabaseClient, tenantId: UUID, ingredientId: UUID) => Promise<ServiceResult<Array<{ ingredient_id: UUID; name: string; savings: number }>>>;
}

/**
 * Purchasing Integration contract.
 * Future purchasing module should implement these.
 */
export interface PurchasingIntegrationContract {
  createPurchaseOrder: (supabase: SupabaseClient, tenantId: UUID, supplierId: UUID, items: Array<{ ingredient_id: UUID; quantity: number; unit: string }>) => Promise<ServiceResult<{ order_id: UUID }>>;
  receivePurchaseOrder: (supabase: SupabaseClient, tenantId: UUID, orderId: UUID) => Promise<ServiceResult<null>>;
}

// ── Menu Item Linking ───────────────────────────────────────

/**
 * Get the escandallo recipe linked to a POS menu item.
 * This bridges the gap between menu_items.cost and the full escandallo.
 *
 * Future: Link menu_items to esc_recipes via a junction table or field.
 * For now, recipes match by name convention.
 */
export async function getRecipeCostForMenuItem(
  supabase: SupabaseClient,
  tenantId: UUID,
  menuItemName: string
): Promise<ServiceResult<RecipeCostBreakdown | null>> {
  // Try to find a recipe with matching name
  const { data, error } = await supabase
    .from("esc_recipes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .ilike("name", menuItemName)
    .limit(1)
    .single();

  if (error || !data) return { ok: true, data: null }; // No match is not an error

  return await calculateRecipeCostFromDB(supabase, tenantId, data.id);
}
