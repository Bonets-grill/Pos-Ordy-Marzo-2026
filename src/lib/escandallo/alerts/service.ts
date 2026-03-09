// ============================================================
// ESCANDALLO — Alerts & Cost Monitoring
// Module 8: Alerts
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CostAlert, ServiceResult, UUID, AlertType, AlertSeverity,
} from "../core/types";
import { ALERT_THRESHOLDS } from "../core/constants";
import { calculateRecipeCostFromDB } from "../cost-engine/service";

// ── Types ───────────────────────────────────────────────────

export interface AlertInput {
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recipe_id?: string | null;
  ingredient_id?: string | null;
  threshold_value?: number | null;
  actual_value?: number | null;
}

// ── Alert queries ───────────────────────────────────────────

export async function getActiveAlerts(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<CostAlert[]>> {
  const { data, error } = await supabase
    .from("esc_cost_alerts")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("resolved", false)
    .order("severity", { ascending: true }) // critical first
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as CostAlert[] };
}

export async function getAllAlerts(
  supabase: SupabaseClient,
  tenantId: UUID,
  limit = 50
): Promise<ServiceResult<CostAlert[]>> {
  const { data, error } = await supabase
    .from("esc_cost_alerts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as CostAlert[] };
}

// ── Alert management ────────────────────────────────────────

export async function createAlert(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: AlertInput
): Promise<ServiceResult<CostAlert>> {
  const { data, error } = await supabase
    .from("esc_cost_alerts")
    .insert({
      tenant_id: tenantId,
      ...input,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as CostAlert };
}

export async function acknowledgeAlert(
  supabase: SupabaseClient,
  tenantId: UUID,
  alertId: UUID,
  userId: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_cost_alerts")
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function resolveAlert(
  supabase: SupabaseClient,
  tenantId: UUID,
  alertId: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_cost_alerts")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Alert generation (scan & create) ────────────────────────

/**
 * Scan all active recipes and generate alerts for cost issues.
 * Call this periodically or after price changes.
 */
export async function scanAndGenerateAlerts(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<{ generated: number }>> {
  // Get all active recipes
  const { data: recipes, error: recErr } = await supabase
    .from("esc_recipes")
    .select("id, name, sale_price, target_margin_pct")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (recErr) return { ok: false, error: recErr.message };

  let generated = 0;

  for (const recipe of (recipes ?? [])) {
    const costResult = await calculateRecipeCostFromDB(supabase, tenantId, recipe.id);
    if (!costResult.ok || !costResult.data) continue;

    const bd = costResult.data;

    // High food cost alert
    if (bd.food_cost_pct > ALERT_THRESHOLDS.FOOD_COST_CRITICAL) {
      await createAlert(supabase, tenantId, {
        alert_type: "high_food_cost",
        severity: "critical",
        title: `Food cost critico: ${recipe.name}`,
        message: `Food cost ${bd.food_cost_pct.toFixed(1)}% supera el umbral critico de ${ALERT_THRESHOLDS.FOOD_COST_CRITICAL}%`,
        recipe_id: recipe.id,
        threshold_value: ALERT_THRESHOLDS.FOOD_COST_CRITICAL,
        actual_value: bd.food_cost_pct,
      });
      generated++;
    } else if (bd.food_cost_pct > ALERT_THRESHOLDS.FOOD_COST_WARNING) {
      await createAlert(supabase, tenantId, {
        alert_type: "high_food_cost",
        severity: "warning",
        title: `Food cost elevado: ${recipe.name}`,
        message: `Food cost ${bd.food_cost_pct.toFixed(1)}% supera el umbral de ${ALERT_THRESHOLDS.FOOD_COST_WARNING}%`,
        recipe_id: recipe.id,
        threshold_value: ALERT_THRESHOLDS.FOOD_COST_WARNING,
        actual_value: bd.food_cost_pct,
      });
      generated++;
    }

    // Low margin alert
    if (bd.margin_pct < ALERT_THRESHOLDS.MARGIN_CRITICAL) {
      await createAlert(supabase, tenantId, {
        alert_type: "low_margin",
        severity: "critical",
        title: `Margen critico: ${recipe.name}`,
        message: `Margen ${bd.margin_pct.toFixed(1)}% por debajo del umbral critico de ${ALERT_THRESHOLDS.MARGIN_CRITICAL}%`,
        recipe_id: recipe.id,
        threshold_value: ALERT_THRESHOLDS.MARGIN_CRITICAL,
        actual_value: bd.margin_pct,
      });
      generated++;
    } else if (bd.margin_pct < ALERT_THRESHOLDS.MARGIN_WARNING) {
      await createAlert(supabase, tenantId, {
        alert_type: "low_margin",
        severity: "warning",
        title: `Margen bajo: ${recipe.name}`,
        message: `Margen ${bd.margin_pct.toFixed(1)}% por debajo del umbral de ${ALERT_THRESHOLDS.MARGIN_WARNING}%`,
        recipe_id: recipe.id,
        threshold_value: ALERT_THRESHOLDS.MARGIN_WARNING,
        actual_value: bd.margin_pct,
      });
      generated++;
    }

    // Unprofitable recipe
    if (!bd.is_profitable) {
      await createAlert(supabase, tenantId, {
        alert_type: "unprofitable_recipe",
        severity: "warning",
        title: `Receta no alcanza margen objetivo: ${recipe.name}`,
        message: `Margen actual ${bd.margin_pct.toFixed(1)}% vs objetivo ${recipe.target_margin_pct}%`,
        recipe_id: recipe.id,
        threshold_value: recipe.target_margin_pct,
        actual_value: bd.margin_pct,
      });
      generated++;
    }
  }

  // Check for ingredient price increases
  const { data: priceChanges } = await supabase
    .from("esc_ingredient_price_history")
    .select("ingredient_id, price, esc_ingredients(name, cost_per_unit)")
    .eq("tenant_id", tenantId)
    .gte("recorded_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // last 7 days
    .order("recorded_at", { ascending: false });

  // Group by ingredient and check for significant increases
  const seen = new Set<string>();
  for (const pc of (priceChanges ?? []) as Record<string, unknown>[]) {
    const ingId = pc.ingredient_id as string;
    if (seen.has(ingId)) continue;
    seen.add(ingId);

    const ing = pc.esc_ingredients as { name: string; cost_per_unit: number } | null;
    if (!ing) continue;

    const increase = ing.cost_per_unit > 0
      ? ((pc.price as number - ing.cost_per_unit) / ing.cost_per_unit) * 100
      : 0;

    if (increase > ALERT_THRESHOLDS.PRICE_INCREASE_CRITICAL) {
      await createAlert(supabase, tenantId, {
        alert_type: "price_increase",
        severity: "critical",
        title: `Subida critica de precio: ${ing.name}`,
        message: `Precio subio ${increase.toFixed(1)}% en los ultimos 7 dias`,
        ingredient_id: ingId,
        threshold_value: ALERT_THRESHOLDS.PRICE_INCREASE_CRITICAL,
        actual_value: increase,
      });
      generated++;
    } else if (increase > ALERT_THRESHOLDS.PRICE_INCREASE_WARNING) {
      await createAlert(supabase, tenantId, {
        alert_type: "price_increase",
        severity: "warning",
        title: `Subida de precio: ${ing.name}`,
        message: `Precio subio ${increase.toFixed(1)}% en los ultimos 7 dias`,
        ingredient_id: ingId,
        threshold_value: ALERT_THRESHOLDS.PRICE_INCREASE_WARNING,
        actual_value: increase,
      });
      generated++;
    }
  }

  return { ok: true, data: { generated } };
}
