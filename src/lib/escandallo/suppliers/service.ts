// ============================================================
// ESCANDALLO — Suppliers Service
// Module 3: Suppliers & Purchasing Base
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Supplier, SupplierIngredient, ServiceResult, PaginatedResult,
  ListFilter, UUID, EntityStatus, UnitOfMeasure,
} from "../core/types";
import { validateSupplier } from "../core/validation";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../core/constants";

// ── Types ───────────────────────────────────────────────────

export interface SupplierInput {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: EntityStatus;
}

export interface SupplierIngredientInput {
  supplier_id: string;
  ingredient_id: string;
  supplier_code?: string | null;
  price: number;
  unit: UnitOfMeasure;
  min_order_qty?: number | null;
  lead_time_days?: number | null;
  notes?: string | null;
}

export interface SupplierWithCount extends Supplier {
  ingredient_count?: number;
}

// ── Suppliers CRUD ──────────────────────────────────────────

export async function getSuppliers(
  supabase: SupabaseClient,
  tenantId: UUID,
  filter?: ListFilter,
  page = 1,
  perPage = DEFAULT_PAGE_SIZE
): Promise<ServiceResult<PaginatedResult<SupplierWithCount>>> {
  const limit = Math.min(perPage, MAX_PAGE_SIZE);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("esc_suppliers")
    .select("*, esc_supplier_ingredients(id)", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (filter?.status) {
    query = query.eq("status", filter.status);
  } else {
    query = query.neq("status", "archived");
  }

  if (filter?.search) {
    query = query.or(`name.ilike.%${filter.search}%,contact_name.ilike.%${filter.search}%`);
  }

  const sortBy = filter?.sort_by || "name";
  const sortDir = filter?.sort_dir === "desc" ? false : true;
  query = query.order(sortBy, { ascending: sortDir });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { ok: false, error: error.message };

  const items = (data ?? []).map((s: Record<string, unknown>) => {
    const ings = s.esc_supplier_ingredients as unknown[] | null;
    return { ...s, ingredient_count: ings?.length ?? 0 } as SupplierWithCount;
  });

  const total = count ?? 0;
  return {
    ok: true,
    data: { items, total, page, per_page: limit, total_pages: Math.ceil(total / limit) },
  };
}

export async function getSupplierById(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<Supplier>> {
  const { data, error } = await supabase
    .from("esc_suppliers")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Supplier };
}

export async function createSupplier(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: SupplierInput
): Promise<ServiceResult<Supplier>> {
  const validation = validateSupplier({
    name: input.name,
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
  });
  if (!validation.valid) {
    return { ok: false, error: validation.errors.map((e) => e.message).join(", ") };
  }

  const { data, error } = await supabase
    .from("esc_suppliers")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      contact_name: input.contact_name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "active",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Supplier already exists", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as Supplier };
}

export async function updateSupplier(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID,
  input: Partial<SupplierInput>
): Promise<ServiceResult<Supplier>> {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.contact_name !== undefined) updates.contact_name = input.contact_name;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.email !== undefined) updates.email = input.email;
  if (input.address !== undefined) updates.address = input.address;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === "archived") updates.archived_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("esc_suppliers")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Supplier };
}

export async function archiveSupplier(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_suppliers")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Supplier-Ingredient relationships ───────────────────────

export async function getSupplierIngredients(
  supabase: SupabaseClient,
  tenantId: UUID,
  supplierId: UUID
): Promise<ServiceResult<(SupplierIngredient & { ingredient_name?: string })[]>> {
  const { data, error } = await supabase
    .from("esc_supplier_ingredients")
    .select("*, esc_ingredients(name)")
    .eq("tenant_id", tenantId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const items = (data ?? []).map((si: Record<string, unknown>) => {
    const ing = si.esc_ingredients as { name: string } | null;
    return { ...si, ingredient_name: ing?.name ?? "" } as SupplierIngredient & { ingredient_name?: string };
  });

  return { ok: true, data: items };
}

export async function linkIngredientToSupplier(
  supabase: SupabaseClient,
  tenantId: UUID,
  input: SupplierIngredientInput
): Promise<ServiceResult<SupplierIngredient>> {
  const { data, error } = await supabase
    .from("esc_supplier_ingredients")
    .insert({
      tenant_id: tenantId,
      supplier_id: input.supplier_id,
      ingredient_id: input.ingredient_id,
      supplier_code: input.supplier_code ?? null,
      price: input.price,
      unit: input.unit,
      min_order_qty: input.min_order_qty ?? null,
      lead_time_days: input.lead_time_days ?? null,
      last_price_date: new Date().toISOString(),
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ingredient already linked to this supplier", code: "DUPLICATE" };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data as SupplierIngredient };
}

export async function updateSupplierIngredientPrice(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID,
  price: number,
  unit: UnitOfMeasure
): Promise<ServiceResult<SupplierIngredient>> {
  const { data, error } = await supabase
    .from("esc_supplier_ingredients")
    .update({ price, unit, last_price_date: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as SupplierIngredient };
}

export async function unlinkIngredientFromSupplier(
  supabase: SupabaseClient,
  tenantId: UUID,
  id: UUID
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from("esc_supplier_ingredients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// ── Helpers ─────────────────────────────────────────────────

/** Get all active suppliers for dropdowns */
export async function getActiveSuppliers(
  supabase: SupabaseClient,
  tenantId: UUID
): Promise<ServiceResult<Pick<Supplier, "id" | "name">[]>> {
  const { data, error } = await supabase
    .from("esc_suppliers")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

/** Get suppliers for a specific ingredient */
export async function getSuppliersForIngredient(
  supabase: SupabaseClient,
  tenantId: UUID,
  ingredientId: UUID
): Promise<ServiceResult<(SupplierIngredient & { supplier_name?: string })[]>> {
  const { data, error } = await supabase
    .from("esc_supplier_ingredients")
    .select("*, esc_suppliers(name)")
    .eq("tenant_id", tenantId)
    .eq("ingredient_id", ingredientId)
    .order("price", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const items = (data ?? []).map((si: Record<string, unknown>) => {
    const sup = si.esc_suppliers as { name: string } | null;
    return { ...si, supplier_name: sup?.name ?? "" } as SupplierIngredient & { supplier_name?: string };
  });

  return { ok: true, data: items };
}
