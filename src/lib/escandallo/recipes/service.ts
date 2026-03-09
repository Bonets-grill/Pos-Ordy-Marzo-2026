// ============================================================
// ESCANDALLO — Recipes Service
// Module 4: Recipe Builder
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Recipe, RecipeVersion, RecipeIngredient, RecipeSubrecipe,
  ServiceResult, PaginatedResult, ListFilter, UUID, EntityStatus,
  RecipeCategory, UnitOfMeasure,
} from "../core/types";
import { validateRecipe, validateRecipeIngredient } from "../core/validation";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../core/constants";

// ── Types ───────────────────────────────────────────────────

export interface RecipeInput {
  name: string;
  category: RecipeCategory;
  description?: string | null;
  yield_qty: number;
  yield_unit: UnitOfMeasure;
  portions: number;
  sale_price: number;
  target_margin_pct: number;
  image_url?: string | null;
  notes?: string | null;
  status?: EntityStatus;
}

export interface RecipeIngredientInput {
  ingredient_id: string;
  quantity: number;
  unit: UnitOfMeasure;
  waste_pct_override?: number | null;
  notes?: string | null;
  sort_order?: number;
}

export interface RecipeSubrecipeInput {
  child_recipe_id: string;
  quantity: number;
  unit: UnitOfMeasure;
  sort_order?: number;
}

export interface RecipeFilter extends ListFilter {
  category?: RecipeCategory;
  min_sale_price?: number;
  max_sale_price?: number;
}

/** Recipe with its ingredients and subrecipes loaded */
export interface RecipeWithComposition extends Recipe {
  ingredients: (RecipeIngredient & { ingredient_name?: string; ingredient_unit?: string; ingredient_cost?: number; ingredient_waste?: number })[];
  subrecipes: (RecipeSubrecipe & { child_recipe_name?: string })[];
}

// ── Recipe CRUD ─────────────────────────────────────────────

export async function getRecipes(
  supabase: SupabaseClient,
  tenantId: UUID,
  filter?: RecipeFilter,
  page = 1,
  perPage = DEFAULT_PAGE_SIZE
): Promise<ServiceResult<PaginatedResult<Recipe>>> {
  const limit = Math.min(perPage, MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("esc_recipes")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (filter?.status) query = query.eq("status", filter.status);
  else query = query.neq("status", "archived");

  if (filter?.category) query = query.eq("category", filter.category);
  if (filter?.search) query = query.ilike("name", `%${filter.search}%`);
  if (filter?.min_sale_price !== undefined) query = query.gte("sale_price", filter.min_sale_price);
  if (filter?.max_sale_price !== undefined) query = query.lte("sale_price", filter.max_sale_price);

  const sortBy = filter?.sort_by || "name";
  const sortDir = filter?.sort_dir === "desc" ? false : true;
  query = query.order(sortBy, { ascending: sortDir });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { ok: false, error: error.message };

  const total = count ?? 0;
  return {
    ok: true,
    data: { items: data as Recipe[], total, page, per_page: limit, total_pages: Math.ceil(total / limit) },
  };
}

export async function getRecipeById(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<Recipe>> {
  const { data, error } = await supabase
    .from("esc_recipes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Recipe };
}

/** Get recipe with full composition (ingredients + subrecipes) */
export async function getRecipeWithComposition(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<RecipeWithComposition>> {
  const recipeResult = await getRecipeById(supabase, tenantId, id);
  if (!recipeResult.ok || !recipeResult.data) return recipeResult as ServiceResult<RecipeWithComposition>;

  const recipe = recipeResult.data;

  // Load ingredients for current version
  const { data: ingData, error: ingErr } = await supabase
    .from("esc_recipe_ingredients")
    .select("*, esc_ingredients(name, unit, cost_per_unit, waste_pct)")
    .eq("recipe_id", id)
    .eq("recipe_version", recipe.current_version)
    .order("sort_order", { ascending: true });

  if (ingErr) return { ok: false, error: ingErr.message };

  const ingredients = (ingData ?? []).map((ri: Record<string, unknown>) => {
    const ing = ri.esc_ingredients as { name: string; unit: string; cost_per_unit: number; waste_pct: number } | null;
    return {
      ...ri,
      ingredient_name: ing?.name ?? "",
      ingredient_unit: ing?.unit ?? "",
      ingredient_cost: ing?.cost_per_unit ?? 0,
      ingredient_waste: ing?.waste_pct ?? 0,
    };
  });

  // Load subrecipes
  const { data: subData, error: subErr } = await supabase
    .from("esc_recipe_subrecipes")
    .select("*, child:child_recipe_id(name)")
    .eq("parent_recipe_id", id)
    .eq("parent_version", recipe.current_version)
    .order("sort_order", { ascending: true });

  if (subErr) return { ok: false, error: subErr.message };

  const subrecipes = (subData ?? []).map((sr: Record<string, unknown>) => {
    const child = sr.child as { name: string } | null;
    return { ...sr, child_recipe_name: child?.name ?? "" };
  });

  return {
    ok: true,
    data: {
      ...recipe,
      ingredients: ingredients as RecipeWithComposition["ingredients"],
      subrecipes: subrecipes as RecipeWithComposition["subrecipes"],
    },
  };
}

export async function createRecipe(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: RecipeInput,
  userId?: string | null
): Promise<ServiceResult<Recipe>> {
  const validation = validateRecipe({
    name: input.name,
    category: input.category,
    portions: input.portions,
    sale_price: input.sale_price,
    target_margin_pct: input.target_margin_pct,
    yield_qty: input.yield_qty,
  });
  if (!validation.valid) return { ok: false, error: validation.errors.map((e) => e.message).join(", ") };

  const { data, error } = await supabase
    .from("esc_recipes")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      category: input.category,
      description: input.description ?? null,
      yield_qty: input.yield_qty,
      yield_unit: input.yield_unit,
      portions: input.portions,
      sale_price: input.sale_price,
      target_margin_pct: input.target_margin_pct,
      image_url: input.image_url ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "active",
      created_by: userId ?? null,
      current_version: 1,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Recipe already exists", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }

  // Create initial version
  await supabase.from("esc_recipe_versions").insert({
    tenant_id: tenantId,
    recipe_id: (data as Recipe).id,
    version: 1,
    change_notes: "Initial version",
    total_cost: 0,
    cost_per_portion: 0,
    food_cost_pct: 0,
    margin: 0,
    created_by: userId ?? null,
  });

  return { ok: true, data: data as Recipe };
}

export async function updateRecipe(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID,
  input: Partial<RecipeInput>
): Promise<ServiceResult<Recipe>> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.category !== undefined) updates.category = input.category;
  if (input.description !== undefined) updates.description = input.description;
  if (input.yield_qty !== undefined) updates.yield_qty = input.yield_qty;
  if (input.yield_unit !== undefined) updates.yield_unit = input.yield_unit;
  if (input.portions !== undefined) updates.portions = input.portions;
  if (input.sale_price !== undefined) updates.sale_price = input.sale_price;
  if (input.target_margin_pct !== undefined) updates.target_margin_pct = input.target_margin_pct;
  if (input.image_url !== undefined) updates.image_url = input.image_url;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === "archived") updates.archived_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("esc_recipes")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Recipe };
}

export async function archiveRecipe(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_recipes")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Recipe ingredients ──────────────────────────────────────

export async function addRecipeIngredient(
  supabase: SupabaseClient,
  recipeId: UUID,
  version: number,
  input: RecipeIngredientInput
): Promise<ServiceResult<RecipeIngredient>> {
  const validation = validateRecipeIngredient({
    ingredient_id: input.ingredient_id,
    quantity: input.quantity,
    unit: input.unit,
  });
  if (!validation.valid) return { ok: false, error: validation.errors.map((e) => e.message).join(", ") };

  const { data, error } = await supabase
    .from("esc_recipe_ingredients")
    .insert({
      recipe_id: recipeId,
      recipe_version: version,
      ingredient_id: input.ingredient_id,
      quantity: input.quantity,
      unit: input.unit,
      waste_pct_override: input.waste_pct_override ?? null,
      notes: input.notes ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ingredient already in recipe", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as RecipeIngredient };
}

export async function updateRecipeIngredient(
  supabase: SupabaseClient,
  id: UUID,
  input: Partial<RecipeIngredientInput>
): Promise<ServiceResult<RecipeIngredient>> {
  const updates: Record<string, unknown> = {};
  if (input.quantity !== undefined) updates.quantity = input.quantity;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.waste_pct_override !== undefined) updates.waste_pct_override = input.waste_pct_override;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("esc_recipe_ingredients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as RecipeIngredient };
}

export async function removeRecipeIngredient(
  supabase: SupabaseClient,
  id: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_recipe_ingredients")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Recipe subrecipes ───────────────────────────────────────

export async function addRecipeSubrecipe(
  supabase: SupabaseClient,
  parentRecipeId: UUID,
  parentVersion: number,
  input: RecipeSubrecipeInput
): Promise<ServiceResult<RecipeSubrecipe>> {
  if (parentRecipeId === input.child_recipe_id) {
    return { ok: false, error: "A recipe cannot include itself as a subrecipe" };
  }

  const { data, error } = await supabase
    .from("esc_recipe_subrecipes")
    .insert({
      parent_recipe_id: parentRecipeId,
      parent_version: parentVersion,
      child_recipe_id: input.child_recipe_id,
      quantity: input.quantity,
      unit: input.unit,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Subrecipe already added", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as RecipeSubrecipe };
}

export async function removeRecipeSubrecipe(
  supabase: SupabaseClient,
  id: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_recipe_subrecipes")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Helpers ─────────────────────────────────────────────────

/** Get all active recipes for dropdowns/subrecipe selection */
export async function getActiveRecipes(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<Pick<Recipe, "id" | "name" | "category" | "portions" | "sale_price">[]>> {
  const { data, error } = await supabase
    .from("esc_recipes")
    .select("id, name, category, portions, sale_price")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}
