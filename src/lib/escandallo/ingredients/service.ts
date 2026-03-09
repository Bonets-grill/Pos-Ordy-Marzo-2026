// ============================================================
// ESCANDALLO — Ingredients Service
// Module 2: Ingredients Management
// ============================================================
// CRUD + price history + filters for ingredient catalog.
// All queries scoped to tenant via RLS.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Ingredient,
  IngredientCategory,
  IngredientPriceHistory,
  ServiceResult,
  PaginatedResult,
  ListFilter,
  UUID,
  EntityStatus,
  UnitOfMeasure,
} from "../core/types";
import { validateIngredient } from "../core/validation";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../core/constants";

// ── Types ───────────────────────────────────────────────────

export interface IngredientInput {
  name: string;
  category_id?: string | null;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  waste_pct?: number;
  density?: number | null;
  default_supplier_id?: string | null;
  allergens?: string[];
  notes?: string | null;
  status?: EntityStatus;
}

export interface CategoryInput {
  name: string;
  description?: string | null;
  sort_order?: number;
  status?: EntityStatus;
}

export interface IngredientFilter extends ListFilter {
  category_id?: UUID;
  supplier_id?: UUID;
  min_cost?: number;
  max_cost?: number;
  allergen?: string;
}

// ── Categories ──────────────────────────────────────────────

export async function getCategories(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<IngredientCategory[]>> {
  const { data, error } = await supabase
    .from("esc_ingredient_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as IngredientCategory[] };
}

export async function createCategory(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: CategoryInput
): Promise<ServiceResult<IngredientCategory>> {
  if (!input.name || input.name.trim().length < 2) {
    return { ok: false, error: "Category name must be at least 2 characters" };
  }

  const { data, error } = await supabase
    .from("esc_ingredient_categories")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      description: input.description ?? null,
      sort_order: input.sort_order ?? 0,
      status: input.status ?? "active",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Category already exists", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as IngredientCategory };
}

export async function updateCategory(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID,
  input: Partial<CategoryInput>
): Promise<ServiceResult<IngredientCategory>> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await supabase
    .from("esc_ingredient_categories")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as IngredientCategory };
}

export async function deleteCategory(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<null>> {
  // Soft delete — set status to archived
  const { error } = await supabase
    .from("esc_ingredient_categories")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Ingredients ─────────────────────────────────────────────

export async function getIngredients(
  supabase: SupabaseClient,
  tenantId: UUID,
  filter?: IngredientFilter,
  page = 1,
  perPage = DEFAULT_PAGE_SIZE
): Promise<ServiceResult<PaginatedResult<Ingredient>>> {
  const limit = Math.min(perPage, MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("esc_ingredients")
    .select("*, esc_ingredient_categories(name)", { count: "exact" })
    .eq("tenant_id", tenantId);

  // Filters
  if (filter?.status) {
    query = query.eq("status", filter.status);
  } else {
    query = query.neq("status", "archived");
  }

  if (filter?.category_id) {
    query = query.eq("category_id", filter.category_id);
  }

  if (filter?.search) {
    query = query.ilike("name", `%${filter.search}%`);
  }

  if (filter?.min_cost !== undefined) {
    query = query.gte("cost_per_unit", filter.min_cost);
  }
  if (filter?.max_cost !== undefined) {
    query = query.lte("cost_per_unit", filter.max_cost);
  }

  if (filter?.allergen) {
    query = query.contains("allergens", [filter.allergen]);
  }

  // Sorting
  const sortBy = filter?.sort_by || "name";
  const sortDir = filter?.sort_dir === "desc" ? false : true;
  query = query.order(sortBy, { ascending: sortDir });

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return { ok: false, error: error.message };

  const total = count ?? 0;
  return {
    ok: true,
    data: {
      items: data as Ingredient[],
      total,
      page,
      per_page: limit,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function getIngredientById(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<Ingredient>> {
  const { data, error } = await supabase
    .from("esc_ingredients")
    .select("*, esc_ingredient_categories(name)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Ingredient };
}

export async function createIngredient(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: IngredientInput
): Promise<ServiceResult<Ingredient>> {
  const validation = validateIngredient({
    name: input.name,
    unit: input.unit,
    cost_per_unit: input.cost_per_unit,
    waste_pct: input.waste_pct,
    status: input.status,
  });

  if (!validation.valid) {
    return { ok: false, error: validation.errors.map((e) => e.message).join(", ") };
  }

  const { data, error } = await supabase
    .from("esc_ingredients")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      category_id: input.category_id ?? null,
      unit: input.unit,
      cost_per_unit: input.cost_per_unit,
      waste_pct: input.waste_pct ?? 0,
      density: input.density ?? null,
      default_supplier_id: input.default_supplier_id ?? null,
      allergens: input.allergens ?? [],
      notes: input.notes ?? null,
      status: input.status ?? "active",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ingredient already exists", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }

  // Record initial price in history
  await supabase.from("esc_ingredient_price_history").insert({
    tenant_id: tenantId,
    ingredient_id: (data as Ingredient).id,
    price: input.cost_per_unit,
    unit: input.unit,
    source: "manual",
    notes: "Initial price",
  });

  return { ok: true, data: data as Ingredient };
}

export async function updateIngredient(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID,
  input: Partial<IngredientInput>
): Promise<ServiceResult<Ingredient>> {
  if (input.name !== undefined || input.unit !== undefined || input.cost_per_unit !== undefined) {
    const validation = validateIngredient({
      name: input.name,
      unit: input.unit,
      cost_per_unit: input.cost_per_unit,
      waste_pct: input.waste_pct,
      status: input.status,
    });
    // Only check fields that are actually being updated
    const relevantErrors = validation.errors.filter((e) => {
      if (e.field === "name" && input.name === undefined) return false;
      if (e.field === "unit" && input.unit === undefined) return false;
      return true;
    });
    if (relevantErrors.length > 0) {
      return { ok: false, error: relevantErrors.map((e) => e.message).join(", ") };
    }
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.cost_per_unit !== undefined) updates.cost_per_unit = input.cost_per_unit;
  if (input.waste_pct !== undefined) updates.waste_pct = input.waste_pct;
  if (input.density !== undefined) updates.density = input.density;
  if (input.default_supplier_id !== undefined) updates.default_supplier_id = input.default_supplier_id;
  if (input.allergens !== undefined) updates.allergens = input.allergens;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === "archived") updates.archived_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("esc_ingredients")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  // Price history is auto-recorded by DB trigger when cost_per_unit changes

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Ingredient };
}

export async function archiveIngredient(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_ingredients")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Price History ───────────────────────────────────────────

export async function getPriceHistory(
  supabase: SupabaseClient,
  tenantId: UUID,
  ingredientId: UUID,
  limit = 50
): Promise<ServiceResult<IngredientPriceHistory[]>> {
  const { data, error } = await supabase
    .from("esc_ingredient_price_history")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("ingredient_id", ingredientId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as IngredientPriceHistory[] };
}

export async function addPriceRecord(
  supabase: SupabaseClient,
  tenantId: UUID,
  ingredientId: UUID,
  price: number,
  unit: UnitOfMeasure,
  supplierId?: UUID | null,
  source: "manual" | "invoice" | "import" = "manual",
  notes?: string | null
): Promise<ServiceResult<IngredientPriceHistory>> {
  const { data, error } = await supabase
    .from("esc_ingredient_price_history")
    .insert({
      tenant_id: tenantId,
      ingredient_id: ingredientId,
      supplier_id: supplierId ?? null,
      price,
      unit,
      source,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  // Also update the ingredient's current cost
  await supabase
    .from("esc_ingredients")
    .update({ cost_per_unit: price })
    .eq("id", ingredientId)
    .eq("tenant_id", tenantId);

  return { ok: true, data: data as IngredientPriceHistory };
}

// ── Bulk operations ─────────────────────────────────────────

export async function getIngredientsByIds(
  supabase: SupabaseClient,
  tenantId: UUID,
  ids: UUID[]
): Promise<ServiceResult<Ingredient[]>> {
  if (ids.length === 0) return { ok: true, data: [] };

  const { data, error } = await supabase
    .from("esc_ingredients")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("id", ids);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Ingredient[] };
}

/** Get all active ingredients (for dropdowns/selectors) */
export async function getActiveIngredients(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<Pick<Ingredient, "id" | "name" | "unit" | "cost_per_unit" | "waste_pct">[]>> {
  const { data, error } = await supabase
    .from("esc_ingredients")
    .select("id, name, unit, cost_per_unit, waste_pct")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}
