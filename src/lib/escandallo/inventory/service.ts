// ============================================================
// ESCANDALLO — Inventory Consumption Engine
// Module 6: Inventory Consumption
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryItem, InventoryMovement, ServiceResult, UUID, UnitOfMeasure, MovementType,
} from "../core/types";
import { convertUnit } from "../core/units";

// ── Types ───────────────────────────────────────────────────

export interface ConsumeRecipeInput {
  recipe_id: string;
  multiplier: number; // number of portions/times sold
}

export interface StockAdjustment {
  ingredient_id: string;
  quantity: number;
  unit: UnitOfMeasure;
  movement_type: MovementType;
  notes?: string;
}

// ── Stock queries ───────────────────────────────────────────

export async function getInventoryItems(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<(InventoryItem & { ingredient_name?: string; ingredient_unit?: string })[]>> {
  const { data, error } = await supabase
    .from("esc_inventory_items")
    .select("*, esc_ingredients(name, unit)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const items = (data ?? []).map((item: Record<string, unknown>) => {
    const ing = item.esc_ingredients as { name: string; unit: string } | null;
    return { ...item, ingredient_name: ing?.name ?? "", ingredient_unit: ing?.unit ?? "" };
  });

  return { ok: true, data: items as (InventoryItem & { ingredient_name?: string; ingredient_unit?: string })[] };
}

export async function getInventoryMovements(
  supabase: SupabaseClient,
  tenantId: UUID,
  ingredientId?: UUID,
  limit = 50
): Promise<ServiceResult<InventoryMovement[]>> {
  let query = supabase
    .from("esc_inventory_movements")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ingredientId) query = query.eq("ingredient_id", ingredientId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as InventoryMovement[] };
}

// ── Stock management ────────────────────────────────────────

export async function adjustStock(
  supabase: SupabaseClient,
  tenantId: UUID,
  adj: StockAdjustment,
  userId?: string | null
): Promise<ServiceResult<null>> {
  // Determine if this is inbound or outbound
  const isOutbound = ["sale_consumption", "waste"].includes(adj.movement_type);
  const qty = isOutbound ? -Math.abs(adj.quantity) : Math.abs(adj.quantity);

  // Record movement
  const { error: movErr } = await supabase.from("esc_inventory_movements").insert({
    tenant_id: tenantId,
    ingredient_id: adj.ingredient_id,
    movement_type: adj.movement_type,
    quantity: qty,
    unit: adj.unit,
    notes: adj.notes ?? null,
    created_by: userId ?? null,
  });
  if (movErr) return { ok: false, error: movErr.message };

  // Upsert inventory item
  const { data: existing } = await supabase
    .from("esc_inventory_items")
    .select("id, current_stock, unit")
    .eq("tenant_id", tenantId)
    .eq("ingredient_id", adj.ingredient_id)
    .single();

  if (existing) {
    // Convert quantity to inventory unit if needed
    const converted = convertUnit(Math.abs(adj.quantity), adj.unit, existing.unit as UnitOfMeasure);
    const delta = isOutbound ? -(converted ?? Math.abs(adj.quantity)) : (converted ?? Math.abs(adj.quantity));

    await supabase
      .from("esc_inventory_items")
      .update({ current_stock: existing.current_stock + delta })
      .eq("id", existing.id);
  } else {
    await supabase.from("esc_inventory_items").insert({
      tenant_id: tenantId,
      ingredient_id: adj.ingredient_id,
      current_stock: isOutbound ? -Math.abs(adj.quantity) : Math.abs(adj.quantity),
      unit: adj.unit,
      min_stock: 0,
    });
  }

  return { ok: true, data: null };
}

// ── Recipe consumption ──────────────────────────────────────

/**
 * Consume ingredients for a recipe sale.
 * This is the key function for POS integration.
 * Call this when an order is completed to deduct stock.
 */
export async function consumeRecipe(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: ConsumeRecipeInput,
  orderId?: string | null,
  userId?: string | null
): Promise<ServiceResult<{ consumed: number; errors: string[] }>> {
  // Get recipe ingredients
  const { data: recipe } = await supabase
    .from("esc_recipes")
    .select("current_version")
    .eq("id", input.recipe_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!recipe) return { ok: false, error: "Recipe not found" };

  const { data: ingredients, error: ingErr } = await supabase
    .from("esc_recipe_ingredients")
    .select("ingredient_id, quantity, unit")
    .eq("recipe_id", input.recipe_id)
    .eq("recipe_version", recipe.current_version);

  if (ingErr) return { ok: false, error: ingErr.message };

  let consumed = 0;
  const errors: string[] = [];

  for (const ing of (ingredients ?? [])) {
    const totalQty = ing.quantity * input.multiplier;

    const result = await adjustStock(supabase, tenantId, {
      ingredient_id: ing.ingredient_id,
      quantity: totalQty,
      unit: ing.unit as UnitOfMeasure,
      movement_type: "sale_consumption",
      notes: `Recipe sale x${input.multiplier}`,
    }, userId);

    if (result.ok) consumed++;
    else errors.push(`${ing.ingredient_id}: ${result.error}`);
  }

  return { ok: true, data: { consumed, errors } };
}

/**
 * Get low stock items (below min_stock).
 */
export async function getLowStockItems(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<(InventoryItem & { ingredient_name?: string })[]>> {
  const { data, error } = await supabase
    .from("esc_inventory_items")
    .select("*, esc_ingredients(name)")
    .eq("tenant_id", tenantId)
    .filter("current_stock", "lte", "min_stock"); // RPC would be cleaner but this works

  if (error) return { ok: false, error: error.message };

  // Filter in JS since Supabase doesn't support cross-column filters easily
  const items = (data ?? [])
    .filter((item: Record<string, unknown>) => (item.current_stock as number) <= (item.min_stock as number))
    .map((item: Record<string, unknown>) => {
      const ing = item.esc_ingredients as { name: string } | null;
      return { ...item, ingredient_name: ing?.name ?? "" };
    });

  return { ok: true, data: items as (InventoryItem & { ingredient_name?: string })[] };
}
