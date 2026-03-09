-- ============================================================================
-- ESCANDALLO SYSTEM — Complete Database Schema
-- Professional restaurant costing, recipes, suppliers, inventory, alerts
-- Multi-tenant with RLS — uses auth_tenant_id() from foundation migration
-- ============================================================================

-- ============================================================================
-- 1. INGREDIENT CATEGORIES
-- ============================================================================
CREATE TABLE esc_ingredient_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esc_ing_cat_tenant ON esc_ingredient_categories(tenant_id);

ALTER TABLE esc_ingredient_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_ing_cat_tenant ON esc_ingredient_categories
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 2. INGREDIENTS
-- ============================================================================
CREATE TABLE esc_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES esc_ingredient_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  cost_per_unit numeric(12,4) NOT NULL DEFAULT 0,
  waste_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (waste_pct >= 0 AND waste_pct < 100),
  density numeric(10,4), -- g/ml for weight<->volume conversion
  default_supplier_id uuid, -- FK added after suppliers table
  allergens text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_esc_ing_tenant ON esc_ingredients(tenant_id);
CREATE INDEX idx_esc_ing_category ON esc_ingredients(category_id);
CREATE INDEX idx_esc_ing_status ON esc_ingredients(tenant_id, status);
CREATE INDEX idx_esc_ing_name ON esc_ingredients(tenant_id, name);

ALTER TABLE esc_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_ing_tenant ON esc_ingredients
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 3. INGREDIENT PRICE HISTORY
-- ============================================================================
CREATE TABLE esc_ingredient_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES esc_ingredients(id) ON DELETE CASCADE,
  supplier_id uuid, -- FK added after suppliers table
  price numeric(12,4) NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','invoice','import')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esc_price_hist_ing ON esc_ingredient_price_history(ingredient_id);
CREATE INDEX idx_esc_price_hist_tenant ON esc_ingredient_price_history(tenant_id);
CREATE INDEX idx_esc_price_hist_date ON esc_ingredient_price_history(ingredient_id, recorded_at DESC);

ALTER TABLE esc_ingredient_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_price_hist_tenant ON esc_ingredient_price_history
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 4. SUPPLIERS
-- ============================================================================
CREATE TABLE esc_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_esc_sup_tenant ON esc_suppliers(tenant_id);
CREATE INDEX idx_esc_sup_status ON esc_suppliers(tenant_id, status);

ALTER TABLE esc_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_sup_tenant ON esc_suppliers
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- Add FK from ingredients to suppliers now that suppliers table exists
ALTER TABLE esc_ingredients
  ADD CONSTRAINT fk_esc_ing_supplier
  FOREIGN KEY (default_supplier_id) REFERENCES esc_suppliers(id) ON DELETE SET NULL;

ALTER TABLE esc_ingredient_price_history
  ADD CONSTRAINT fk_esc_price_hist_supplier
  FOREIGN KEY (supplier_id) REFERENCES esc_suppliers(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. SUPPLIER-INGREDIENT RELATIONSHIP
-- ============================================================================
CREATE TABLE esc_supplier_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES esc_suppliers(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES esc_ingredients(id) ON DELETE CASCADE,
  supplier_code text,
  price numeric(12,4) NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  min_order_qty numeric(10,2),
  lead_time_days integer,
  last_price_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, supplier_id, ingredient_id)
);

CREATE INDEX idx_esc_sup_ing_tenant ON esc_supplier_ingredients(tenant_id);
CREATE INDEX idx_esc_sup_ing_supplier ON esc_supplier_ingredients(supplier_id);
CREATE INDEX idx_esc_sup_ing_ingredient ON esc_supplier_ingredients(ingredient_id);

ALTER TABLE esc_supplier_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_sup_ing_tenant ON esc_supplier_ingredients
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 6. RECIPES
-- ============================================================================
CREATE TABLE esc_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('starter','main','dessert','side','beverage','sauce','base','bread','other')),
  description text,
  yield_qty numeric(10,3) NOT NULL DEFAULT 1,
  yield_unit text NOT NULL DEFAULT 'portion' CHECK (yield_unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  portions integer NOT NULL DEFAULT 1 CHECK (portions > 0),
  sale_price numeric(10,2) NOT NULL DEFAULT 0,
  target_margin_pct numeric(5,2) NOT NULL DEFAULT 70,
  image_url text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  archived_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_esc_rec_tenant ON esc_recipes(tenant_id);
CREATE INDEX idx_esc_rec_category ON esc_recipes(tenant_id, category);
CREATE INDEX idx_esc_rec_status ON esc_recipes(tenant_id, status);

ALTER TABLE esc_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_rec_tenant ON esc_recipes
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 7. RECIPE VERSIONS (snapshot of recipe at a point in time)
-- ============================================================================
CREATE TABLE esc_recipe_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES esc_recipes(id) ON DELETE CASCADE,
  version integer NOT NULL,
  change_notes text,
  total_cost numeric(12,4) NOT NULL DEFAULT 0,
  cost_per_portion numeric(12,4) NOT NULL DEFAULT 0,
  food_cost_pct numeric(5,2) NOT NULL DEFAULT 0,
  margin numeric(12,4) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, version)
);

CREATE INDEX idx_esc_rec_ver_recipe ON esc_recipe_versions(recipe_id);
CREATE INDEX idx_esc_rec_ver_tenant ON esc_recipe_versions(tenant_id);

ALTER TABLE esc_recipe_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_rec_ver_tenant ON esc_recipe_versions
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 8. RECIPE INGREDIENTS (composition of a recipe version)
-- ============================================================================
CREATE TABLE esc_recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES esc_recipes(id) ON DELETE CASCADE,
  recipe_version integer NOT NULL DEFAULT 1,
  ingredient_id uuid NOT NULL REFERENCES esc_ingredients(id) ON DELETE CASCADE,
  quantity numeric(10,4) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  waste_pct_override numeric(5,2) CHECK (waste_pct_override IS NULL OR (waste_pct_override >= 0 AND waste_pct_override < 100)),
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(recipe_id, recipe_version, ingredient_id)
);

CREATE INDEX idx_esc_rec_ing_recipe ON esc_recipe_ingredients(recipe_id);
CREATE INDEX idx_esc_rec_ing_ingredient ON esc_recipe_ingredients(ingredient_id);

-- No RLS needed — accessed through recipe (which has RLS)
-- But we add it for defense in depth
ALTER TABLE esc_recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_rec_ing_tenant ON esc_recipe_ingredients
  USING (EXISTS (
    SELECT 1 FROM esc_recipes r WHERE r.id = recipe_id AND r.tenant_id = auth_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM esc_recipes r WHERE r.id = recipe_id AND r.tenant_id = auth_tenant_id()
  ));

-- ============================================================================
-- 9. RECIPE SUBRECIPES (recipe within a recipe)
-- ============================================================================
CREATE TABLE esc_recipe_subrecipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_recipe_id uuid NOT NULL REFERENCES esc_recipes(id) ON DELETE CASCADE,
  parent_version integer NOT NULL DEFAULT 1,
  child_recipe_id uuid NOT NULL REFERENCES esc_recipes(id) ON DELETE CASCADE,
  quantity numeric(10,4) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(parent_recipe_id, parent_version, child_recipe_id),
  CHECK (parent_recipe_id != child_recipe_id) -- prevent self-reference
);

CREATE INDEX idx_esc_sub_parent ON esc_recipe_subrecipes(parent_recipe_id);
CREATE INDEX idx_esc_sub_child ON esc_recipe_subrecipes(child_recipe_id);

ALTER TABLE esc_recipe_subrecipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_sub_tenant ON esc_recipe_subrecipes
  USING (EXISTS (
    SELECT 1 FROM esc_recipes r WHERE r.id = parent_recipe_id AND r.tenant_id = auth_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM esc_recipes r WHERE r.id = parent_recipe_id AND r.tenant_id = auth_tenant_id()
  ));

-- ============================================================================
-- 10. INVENTORY ITEMS
-- ============================================================================
CREATE TABLE esc_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES esc_ingredients(id) ON DELETE CASCADE,
  current_stock numeric(12,4) NOT NULL DEFAULT 0,
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  min_stock numeric(12,4) NOT NULL DEFAULT 0,
  max_stock numeric(12,4),
  last_count_at timestamptz,
  last_count_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, ingredient_id)
);

CREATE INDEX idx_esc_inv_tenant ON esc_inventory_items(tenant_id);
CREATE INDEX idx_esc_inv_ingredient ON esc_inventory_items(ingredient_id);

ALTER TABLE esc_inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_inv_tenant ON esc_inventory_items
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 11. INVENTORY MOVEMENTS
-- ============================================================================
CREATE TABLE esc_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES esc_ingredients(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase','sale_consumption','waste','adjustment','transfer','return')),
  quantity numeric(12,4) NOT NULL, -- positive = in, negative = out
  unit text NOT NULL CHECK (unit IN ('kg','g','mg','l','ml','cl','unit','portion','dozen','bunch','slice','sheet')),
  reference_id uuid,
  reference_type text, -- 'order', 'purchase_order', 'count', etc.
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esc_mov_tenant ON esc_inventory_movements(tenant_id);
CREATE INDEX idx_esc_mov_ingredient ON esc_inventory_movements(ingredient_id);
CREATE INDEX idx_esc_mov_type ON esc_inventory_movements(tenant_id, movement_type);
CREATE INDEX idx_esc_mov_date ON esc_inventory_movements(created_at DESC);
CREATE INDEX idx_esc_mov_ref ON esc_inventory_movements(reference_id) WHERE reference_id IS NOT NULL;

ALTER TABLE esc_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_mov_tenant ON esc_inventory_movements
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 12. COST SNAPSHOTS
-- ============================================================================
CREATE TABLE esc_cost_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES esc_recipes(id) ON DELETE CASCADE,
  recipe_version integer NOT NULL,
  total_cost numeric(12,4) NOT NULL,
  cost_per_portion numeric(12,4) NOT NULL,
  food_cost_pct numeric(5,2) NOT NULL,
  margin numeric(12,4) NOT NULL,
  sale_price numeric(10,2) NOT NULL,
  snapshot_reason text NOT NULL DEFAULT 'manual' CHECK (snapshot_reason IN ('price_change','recipe_update','manual','scheduled')),
  ingredient_costs jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esc_snap_tenant ON esc_cost_snapshots(tenant_id);
CREATE INDEX idx_esc_snap_recipe ON esc_cost_snapshots(recipe_id);
CREATE INDEX idx_esc_snap_date ON esc_cost_snapshots(created_at DESC);

ALTER TABLE esc_cost_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_snap_tenant ON esc_cost_snapshots
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 13. COST ALERTS
-- ============================================================================
CREATE TABLE esc_cost_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('price_increase','low_margin','high_food_cost','critical_ingredient','unprofitable_recipe')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  message text NOT NULL,
  recipe_id uuid REFERENCES esc_recipes(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES esc_ingredients(id) ON DELETE CASCADE,
  threshold_value numeric(12,4),
  actual_value numeric(12,4),
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esc_alert_tenant ON esc_cost_alerts(tenant_id);
CREATE INDEX idx_esc_alert_active ON esc_cost_alerts(tenant_id, resolved, acknowledged);
CREATE INDEX idx_esc_alert_recipe ON esc_cost_alerts(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_esc_alert_ingredient ON esc_cost_alerts(ingredient_id) WHERE ingredient_id IS NOT NULL;

ALTER TABLE esc_cost_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_alert_tenant ON esc_cost_alerts
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- 14. SIMULATION RUNS
-- ============================================================================
CREATE TABLE esc_simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES esc_recipes(id) ON DELETE CASCADE,
  simulation_type text NOT NULL CHECK (simulation_type IN ('price_change','cost_change','ingredient_swap','quantity_change')),
  parameters jsonb NOT NULL DEFAULT '{}',
  result_before jsonb NOT NULL DEFAULT '{}',
  result_after jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esc_sim_tenant ON esc_simulation_runs(tenant_id);
CREATE INDEX idx_esc_sim_recipe ON esc_simulation_runs(recipe_id);

ALTER TABLE esc_simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY esc_sim_tenant ON esc_simulation_runs
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ============================================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION esc_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'esc_ingredient_categories',
    'esc_ingredients',
    'esc_ingredient_price_history',
    'esc_suppliers',
    'esc_supplier_ingredients',
    'esc_recipes',
    'esc_recipe_versions',
    'esc_inventory_items',
    'esc_inventory_movements',
    'esc_cost_snapshots',
    'esc_cost_alerts',
    'esc_simulation_runs'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION esc_update_timestamp()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- TRIGGER: auto-record price history when ingredient cost changes
-- ============================================================================
CREATE OR REPLACE FUNCTION esc_ingredient_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    INSERT INTO esc_ingredient_price_history (tenant_id, ingredient_id, price, unit, source)
    VALUES (NEW.tenant_id, NEW.id, NEW.cost_per_unit, NEW.unit, 'manual');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_esc_ingredient_price_change
  AFTER UPDATE ON esc_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION esc_ingredient_price_change();

-- ============================================================================
-- SERVICE ROLE POLICIES (for API routes)
-- ============================================================================
-- Service role bypasses RLS by default in Supabase, no extra policies needed.
