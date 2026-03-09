// ============================================================
// ESCANDALLO CORE — Global Types & Interfaces
// Module 1: Core Foundation
// ============================================================
// This file defines ALL types used across the escandallo system.
// No module should define its own DB types — they live here.
// ============================================================

// ── Base types ──────────────────────────────────────────────

export type UUID = string;
export type Timestamp = string; // ISO 8601
export type Currency = "EUR" | "USD" | "GBP" | "MXN";

/** Units of measure supported by the system */
export type UnitOfMeasure =
  | "kg"
  | "g"
  | "mg"
  | "l"
  | "ml"
  | "cl"
  | "unit"
  | "portion"
  | "dozen"
  | "bunch"
  | "slice"
  | "sheet";

/** Unit categories for conversion grouping */
export type UnitCategory = "weight" | "volume" | "countable";

/** Status for most entities */
export type EntityStatus = "active" | "inactive" | "archived";

/** Alert severity levels */
export type AlertSeverity = "info" | "warning" | "critical";

/** Alert types */
export type AlertType =
  | "price_increase"
  | "low_margin"
  | "high_food_cost"
  | "critical_ingredient"
  | "unprofitable_recipe";

/** Recipe categories */
export type RecipeCategory =
  | "starter"
  | "main"
  | "dessert"
  | "side"
  | "beverage"
  | "sauce"
  | "base"
  | "bread"
  | "other";

/** Inventory movement types */
export type MovementType =
  | "purchase"
  | "sale_consumption"
  | "waste"
  | "adjustment"
  | "transfer"
  | "return";

// ── Multi-tenant base ───────────────────────────────────────

export interface TenantScoped {
  id: UUID;
  tenant_id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ── Ingredient types ────────────────────────────────────────

export interface IngredientCategory extends TenantScoped {
  name: string;
  description: string | null;
  sort_order: number;
  status: EntityStatus;
}

export interface Ingredient extends TenantScoped {
  category_id: UUID | null;
  name: string;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  waste_pct: number; // 0-100, default percentage of waste/shrinkage
  density: number | null; // g/ml for volume-weight conversions
  default_supplier_id: UUID | null;
  allergens: string[];
  notes: string | null;
  status: EntityStatus;
  archived_at: Timestamp | null;
}

export interface IngredientPriceHistory extends TenantScoped {
  ingredient_id: UUID;
  supplier_id: UUID | null;
  price: number;
  unit: UnitOfMeasure;
  recorded_at: Timestamp;
  source: "manual" | "invoice" | "import";
  notes: string | null;
}

// ── Supplier types ──────────────────────────────────────────

export interface Supplier extends TenantScoped {
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: EntityStatus;
  archived_at: Timestamp | null;
}

export interface SupplierIngredient extends TenantScoped {
  supplier_id: UUID;
  ingredient_id: UUID;
  supplier_code: string | null;
  price: number;
  unit: UnitOfMeasure;
  min_order_qty: number | null;
  lead_time_days: number | null;
  last_price_date: Timestamp | null;
  notes: string | null;
}

// ── Recipe types ────────────────────────────────────────────

export interface Recipe extends TenantScoped {
  name: string;
  category: RecipeCategory;
  description: string | null;
  yield_qty: number; // total quantity produced
  yield_unit: UnitOfMeasure;
  portions: number; // number of servings
  sale_price: number;
  target_margin_pct: number; // desired margin 0-100
  image_url: string | null;
  notes: string | null;
  status: EntityStatus;
  archived_at: Timestamp | null;
  created_by: UUID | null;
  current_version: number;
}

export interface RecipeVersion extends TenantScoped {
  recipe_id: UUID;
  version: number;
  change_notes: string | null;
  total_cost: number;
  cost_per_portion: number;
  food_cost_pct: number;
  margin: number;
  created_by: UUID | null;
}

export interface RecipeIngredient {
  id: UUID;
  recipe_id: UUID;
  recipe_version: number;
  ingredient_id: UUID;
  quantity: number;
  unit: UnitOfMeasure;
  waste_pct_override: number | null; // override ingredient default
  notes: string | null;
  sort_order: number;
}

export interface RecipeSubrecipe {
  id: UUID;
  parent_recipe_id: UUID;
  parent_version: number;
  child_recipe_id: UUID;
  quantity: number;
  unit: UnitOfMeasure;
  sort_order: number;
}

// ── Cost types ──────────────────────────────────────────────

export interface CostSnapshot extends TenantScoped {
  recipe_id: UUID;
  recipe_version: number;
  total_cost: number;
  cost_per_portion: number;
  food_cost_pct: number;
  margin: number;
  sale_price: number;
  snapshot_reason: "price_change" | "recipe_update" | "manual" | "scheduled";
  ingredient_costs: IngredientCostDetail[];
}

export interface IngredientCostDetail {
  ingredient_id: UUID;
  ingredient_name: string;
  quantity: number;
  unit: UnitOfMeasure;
  cost_per_unit: number;
  waste_pct: number;
  line_cost: number;
}

// ── Inventory types ─────────────────────────────────────────

export interface InventoryItem extends TenantScoped {
  ingredient_id: UUID;
  current_stock: number;
  unit: UnitOfMeasure;
  min_stock: number;
  max_stock: number | null;
  last_count_at: Timestamp | null;
  last_count_by: UUID | null;
}

export interface InventoryMovement extends TenantScoped {
  ingredient_id: UUID;
  movement_type: MovementType;
  quantity: number;
  unit: UnitOfMeasure;
  reference_id: UUID | null; // order_id, purchase_id, etc.
  reference_type: string | null;
  notes: string | null;
  created_by: UUID | null;
}

// ── Alert types ─────────────────────────────────────────────

export interface CostAlert extends TenantScoped {
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recipe_id: UUID | null;
  ingredient_id: UUID | null;
  threshold_value: number | null;
  actual_value: number | null;
  acknowledged: boolean;
  acknowledged_by: UUID | null;
  acknowledged_at: Timestamp | null;
  resolved: boolean;
  resolved_at: Timestamp | null;
}

// ── Simulation types ────────────────────────────────────────

export interface SimulationRun extends TenantScoped {
  recipe_id: UUID;
  simulation_type: "price_change" | "cost_change" | "ingredient_swap" | "quantity_change";
  parameters: SimulationParams;
  result_before: SimulationResult;
  result_after: SimulationResult;
  created_by: UUID | null;
}

export interface SimulationParams {
  new_sale_price?: number;
  ingredient_changes?: Array<{
    ingredient_id: UUID;
    new_cost?: number;
    new_quantity?: number;
    replacement_id?: UUID;
  }>;
}

export interface SimulationResult {
  total_cost: number;
  cost_per_portion: number;
  food_cost_pct: number;
  margin: number;
  sale_price: number;
}

// ── Computed/View types (not DB tables) ─────────────────────

export interface RecipeCostBreakdown {
  recipe_id: UUID;
  recipe_name: string;
  category: RecipeCategory;
  portions: number;
  sale_price: number;
  total_cost: number;
  cost_per_portion: number;
  food_cost_pct: number;
  margin: number;
  margin_pct: number;
  target_margin_pct: number;
  is_profitable: boolean;
  ingredients: IngredientCostDetail[];
  subrecipes: SubrecipeCostDetail[];
}

export interface SubrecipeCostDetail {
  recipe_id: UUID;
  recipe_name: string;
  quantity: number;
  unit: UnitOfMeasure;
  cost: number;
}

export interface DashboardKPIs {
  total_recipes: number;
  avg_food_cost_pct: number;
  avg_margin_pct: number;
  total_ingredients: number;
  total_suppliers: number;
  active_alerts: number;
  most_profitable_recipe: { name: string; margin_pct: number } | null;
  least_profitable_recipe: { name: string; margin_pct: number } | null;
  most_expensive_ingredient: { name: string; cost_per_unit: number; unit: UnitOfMeasure } | null;
}

// ── Service contracts ───────────────────────────────────────

/** Standard response wrapper for all escandallo services */
export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/** Pagination params */
export interface PaginationParams {
  page: number;
  per_page: number;
}

/** Paginated response */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Filter for list queries */
export interface ListFilter {
  search?: string;
  status?: EntityStatus;
  category_id?: UUID;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}
