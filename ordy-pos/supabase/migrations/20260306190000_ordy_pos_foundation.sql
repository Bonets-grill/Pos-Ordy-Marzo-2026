-- ============================================================================
-- ORDY POS — COMPLETE DATABASE SCHEMA
-- Multi-tenant SaaS POS for restaurants
-- Tables: tenants, users, menu, orders, payments, KDS, loyalty, analytics
-- ============================================================================

-- ── EXTENSIONS ──
-- gen_random_uuid() is built-in on Supabase (pgcrypto)

-- ── HELPER: get tenant_id from JWT ──
CREATE OR REPLACE FUNCTION auth_tenant_id() RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 1. TENANTS
-- ============================================================================
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  currency text NOT NULL DEFAULT 'EUR',
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  locale text NOT NULL DEFAULT 'es',
  tax_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  tax_included boolean NOT NULL DEFAULT true,
  stripe_account_id text,
  stripe_onboarded boolean NOT NULL DEFAULT false,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  settings jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. USERS (linked to Supabase Auth)
-- ============================================================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin','owner','admin','manager','cashier','waiter','kitchen','staff')),
  pin text, -- 4-digit PIN for POS quick login
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 3. MENU CATEGORIES
-- ============================================================================
CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_es text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  name_fr text NOT NULL DEFAULT '',
  name_de text NOT NULL DEFAULT '',
  name_it text NOT NULL DEFAULT '',
  icon text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_categories_tenant ON menu_categories(tenant_id);

-- ============================================================================
-- 4. MENU ITEMS
-- ============================================================================
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name_es text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  name_fr text NOT NULL DEFAULT '',
  name_de text NOT NULL DEFAULT '',
  name_it text NOT NULL DEFAULT '',
  description_es text DEFAULT '',
  description_en text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost numeric(10,2) DEFAULT 0,
  image_url text,
  tax_rate numeric(5,2), -- override tenant default
  available boolean NOT NULL DEFAULT true,
  track_stock boolean NOT NULL DEFAULT false,
  stock_quantity int DEFAULT 0,
  prep_time_minutes int DEFAULT 10,
  kds_station text, -- which KDS station handles this
  sort_order int NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}',
  allergens text[] DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

-- ============================================================================
-- 5. MODIFIER GROUPS & MODIFIERS
-- ============================================================================
CREATE TABLE modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_es text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  min_select int NOT NULL DEFAULT 0,
  max_select int NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_modifier_groups_tenant ON modifier_groups(tenant_id);

CREATE TABLE modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_es text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_modifiers_group ON modifiers(group_id);

-- Link items to modifier groups
CREATE TABLE menu_item_modifier_groups (
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, group_id)
);

-- ============================================================================
-- 6. RESTAURANT TABLES / ZONES
-- ============================================================================
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  number text NOT NULL,
  label text,
  capacity int NOT NULL DEFAULT 4,
  pos_x int DEFAULT 0,
  pos_y int DEFAULT 0,
  shape text DEFAULT 'square' CHECK (shape IN ('square','round','rectangle')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','cleaning')),
  current_order_id uuid,
  qr_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tables_tenant ON restaurant_tables(tenant_id);

-- ============================================================================
-- 7. ORDERS
-- ============================================================================
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number serial,
  table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  order_type text NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in','takeaway','delivery','qr')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','confirmed','preparing','ready','served','closed','cancelled','refunded')),
  customer_name text,
  customer_phone text,
  customer_notes text,
  -- Financials
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_reason text,
  tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  -- Payment
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','refunded')),
  payment_method text, -- cash, card, mixed
  -- Staff
  created_by uuid REFERENCES users(id),
  served_by uuid REFERENCES users(id),
  -- Loyalty
  loyalty_customer_id uuid,
  loyalty_points_earned int DEFAULT 0,
  loyalty_points_redeemed int DEFAULT 0,
  loyalty_reward_applied text,
  -- Metadata
  source text DEFAULT 'pos' CHECK (source IN ('pos','qr','takeaway','delivery','whatsapp')),
  metadata jsonb DEFAULT '{}',
  -- Timestamps
  confirmed_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_date ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_number ON orders(tenant_id, order_number);

-- ============================================================================
-- 8. ORDER ITEMS
-- ============================================================================
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  modifiers jsonb DEFAULT '[]', -- [{name, price_delta}]
  modifiers_total numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  -- KDS
  kds_station text,
  kds_status text DEFAULT 'pending' CHECK (kds_status IN ('pending','preparing','ready','served')),
  kds_started_at timestamptz,
  kds_ready_at timestamptz,
  -- Meta
  voided boolean NOT NULL DEFAULT false,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_kds ON order_items(tenant_id, kds_station, kds_status);

-- ============================================================================
-- 9. PAYMENTS
-- ============================================================================
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('cash','card','stripe','transfer','other')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','refunded')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  tip_amount numeric(10,2) DEFAULT 0,
  received_by uuid REFERENCES users(id),
  reference text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id, created_at DESC);

-- ============================================================================
-- 10. CASH REGISTER / SHIFTS
-- ============================================================================
CREATE TABLE cash_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES users(id),
  closed_by uuid REFERENCES users(id),
  opening_amount numeric(10,2) NOT NULL DEFAULT 0,
  closing_amount numeric(10,2),
  expected_amount numeric(10,2),
  difference numeric(10,2),
  cash_sales numeric(10,2) DEFAULT 0,
  card_sales numeric(10,2) DEFAULT 0,
  total_sales numeric(10,2) DEFAULT 0,
  total_orders int DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX idx_cash_shifts_tenant ON cash_shifts(tenant_id);

CREATE TABLE cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES cash_shifts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sale','refund','cash_in','cash_out','tip')),
  amount numeric(10,2) NOT NULL,
  description text,
  order_id uuid REFERENCES orders(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. KDS STATIONS
-- ============================================================================
CREATE TABLE kds_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text DEFAULT '#3B82F6',
  categories uuid[] DEFAULT '{}', -- which menu categories route here
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- ============================================================================
-- 12. LOYALTY MODULE
-- ============================================================================
CREATE TABLE loyalty_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  points_per_euro numeric(6,2) NOT NULL DEFAULT 1.00,
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0,
  welcome_bonus int NOT NULL DEFAULT 0,
  birthday_bonus int NOT NULL DEFAULT 0,
  allow_pos boolean NOT NULL DEFAULT true,
  allow_qr boolean NOT NULL DEFAULT true,
  allow_takeaway boolean NOT NULL DEFAULT true,
  auto_enroll boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE loyalty_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text,
  birthday date,
  notes text,
  current_points_balance int NOT NULL DEFAULT 0,
  total_points_earned int NOT NULL DEFAULT 0,
  total_points_redeemed int NOT NULL DEFAULT 0,
  visits_count int NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  current_tier_id uuid,
  last_visit_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);
CREATE INDEX idx_loyalty_customers_tenant ON loyalty_customers(tenant_id);
CREATE INDEX idx_loyalty_customers_phone ON loyalty_customers(tenant_id, phone);

CREATE TABLE loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  icon text DEFAULT 'star',
  min_points int NOT NULL DEFAULT 0,
  points_multiplier numeric(4,2) NOT NULL DEFAULT 1.00,
  perks text[] DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_tiers_tenant ON loyalty_tiers(tenant_id);

CREATE TABLE loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title_es text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  title_fr text NOT NULL DEFAULT '',
  title_de text NOT NULL DEFAULT '',
  title_it text NOT NULL DEFAULT '',
  reward_type text NOT NULL DEFAULT 'discount_fixed' CHECK (reward_type IN ('discount_fixed','discount_percent','free_product','custom')),
  points_cost int NOT NULL DEFAULT 100,
  discount_amount numeric(10,2),
  discount_percent numeric(5,2),
  free_product_name text,
  max_redemptions int,
  current_redemptions int NOT NULL DEFAULT 0,
  min_tier_id uuid REFERENCES loyalty_tiers(id),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_rewards_tenant ON loyalty_rewards(tenant_id);

CREATE TABLE loyalty_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id),
  movement_type text NOT NULL CHECK (movement_type IN ('earn','redeem','bonus','adjust','reverse','expire')),
  points_delta int NOT NULL,
  balance_after int NOT NULL DEFAULT 0,
  source text DEFAULT 'pos',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_customer ON loyalty_points_ledger(customer_id, created_at DESC);
CREATE INDEX idx_ledger_tenant ON loyalty_points_ledger(tenant_id, created_at DESC);

CREATE TABLE loyalty_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'double_points' CHECK (campaign_type IN ('double_points','bonus_points','happy_hour','category_boost')),
  multiplier numeric(4,2) DEFAULT 2.00,
  bonus_points int DEFAULT 0,
  category_id uuid REFERENCES menu_categories(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_tenant ON loyalty_campaigns(tenant_id);

-- Add FK from loyalty_customers to loyalty_tiers
ALTER TABLE loyalty_customers ADD CONSTRAINT fk_loyalty_tier
  FOREIGN KEY (current_tier_id) REFERENCES loyalty_tiers(id) ON DELETE SET NULL;
-- Add FK from orders to loyalty_customers
ALTER TABLE orders ADD CONSTRAINT fk_order_loyalty_customer
  FOREIGN KEY (loyalty_customer_id) REFERENCES loyalty_customers(id) ON DELETE SET NULL;

-- ============================================================================
-- 13. NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at DESC);

-- ============================================================================
-- 14. AUDIT LOG
-- ============================================================================
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so we just need policies for authenticated users
-- Tenant-scoped read/write for all tables
CREATE POLICY "tenant_isolation" ON tenants FOR ALL USING (id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON users FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON menu_categories FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON menu_items FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON modifier_groups FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON modifiers FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON zones FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON restaurant_tables FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON orders FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON order_items FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON payments FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON cash_shifts FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON cash_movements FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON kds_stations FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON loyalty_settings FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON loyalty_customers FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON loyalty_tiers FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON loyalty_rewards FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON loyalty_points_ledger FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON loyalty_campaigns FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON notifications FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON audit_log FOR ALL USING (tenant_id = auth_tenant_id());

-- Public read for QR ordering (menu only)
CREATE POLICY "public_menu_read" ON menu_categories FOR SELECT USING (active = true);
CREATE POLICY "public_menu_read" ON menu_items FOR SELECT USING (active = true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Recalculate order totals
CREATE OR REPLACE FUNCTION recalculate_order_totals(p_order_id uuid)
RETURNS void AS $$
DECLARE
  v_subtotal numeric;
  v_tax_rate numeric;
  v_tax numeric;
  v_total numeric;
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM orders WHERE id = p_order_id;
  SELECT COALESCE(tax_rate, 10) INTO v_tax_rate FROM tenants WHERE id = v_tenant_id;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
  FROM order_items WHERE order_id = p_order_id AND voided = false;

  v_tax := ROUND(v_subtotal * v_tax_rate / 100, 2);
  v_total := v_subtotal + v_tax;

  UPDATE orders SET
    subtotal = v_subtotal,
    tax_amount = v_tax,
    total = v_total - discount_amount + tip_amount,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loyalty: earn points
CREATE OR REPLACE FUNCTION loyalty_earn_points(
  p_tenant_id uuid, p_customer_id uuid, p_order_id uuid,
  p_order_subtotal numeric, p_source text DEFAULT 'pos'
) RETURNS int AS $$
DECLARE
  v_settings loyalty_settings%ROWTYPE;
  v_multiplier numeric := 1.0;
  v_tier_mult numeric := 1.0;
  v_points int;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings WHERE tenant_id = p_tenant_id;
  IF NOT FOUND OR NOT v_settings.enabled THEN RETURN 0; END IF;
  IF p_order_subtotal < v_settings.min_order_amount THEN RETURN 0; END IF;

  -- Check active campaigns
  SELECT COALESCE(MAX(multiplier), 1.0) INTO v_multiplier
  FROM loyalty_campaigns
  WHERE tenant_id = p_tenant_id AND active = true
    AND campaign_type = 'double_points'
    AND now() BETWEEN starts_at AND ends_at;

  -- Tier multiplier
  SELECT COALESCE(lt.points_multiplier, 1.0) INTO v_tier_mult
  FROM loyalty_customers lc
  LEFT JOIN loyalty_tiers lt ON lt.id = lc.current_tier_id
  WHERE lc.id = p_customer_id;

  v_points := FLOOR(p_order_subtotal * v_settings.points_per_euro * v_multiplier * v_tier_mult);
  IF v_points <= 0 THEN RETURN 0; END IF;

  -- Update customer
  UPDATE loyalty_customers SET
    current_points_balance = current_points_balance + v_points,
    total_points_earned = total_points_earned + v_points,
    visits_count = visits_count + 1,
    total_spent = total_spent + p_order_subtotal,
    last_visit_at = now(),
    updated_at = now()
  WHERE id = p_customer_id;

  -- Ledger entry
  INSERT INTO loyalty_points_ledger (tenant_id, customer_id, order_id, movement_type, points_delta, balance_after, source, description)
  SELECT p_tenant_id, p_customer_id, p_order_id, 'earn', v_points,
    current_points_balance, p_source, 'Puntos por pedido'
  FROM loyalty_customers WHERE id = p_customer_id;

  -- Update order
  UPDATE orders SET loyalty_points_earned = v_points WHERE id = p_order_id;

  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loyalty: redeem reward
CREATE OR REPLACE FUNCTION loyalty_redeem_reward(
  p_tenant_id uuid, p_customer_id uuid, p_reward_id uuid, p_order_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_reward loyalty_rewards%ROWTYPE;
  v_customer loyalty_customers%ROWTYPE;
  v_discount numeric := 0;
BEGIN
  SELECT * INTO v_reward FROM loyalty_rewards WHERE id = p_reward_id AND tenant_id = p_tenant_id AND active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reward not found'); END IF;

  SELECT * INTO v_customer FROM loyalty_customers WHERE id = p_customer_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Customer not found'); END IF;

  IF v_customer.current_points_balance < v_reward.points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  -- Deduct points
  UPDATE loyalty_customers SET
    current_points_balance = current_points_balance - v_reward.points_cost,
    total_points_redeemed = total_points_redeemed + v_reward.points_cost,
    updated_at = now()
  WHERE id = p_customer_id;

  -- Ledger
  INSERT INTO loyalty_points_ledger (tenant_id, customer_id, order_id, movement_type, points_delta, balance_after, source, description)
  SELECT p_tenant_id, p_customer_id, p_order_id, 'redeem', -v_reward.points_cost,
    current_points_balance, 'pos', v_reward.title_es
  FROM loyalty_customers WHERE id = p_customer_id;

  -- Increment redemptions
  UPDATE loyalty_rewards SET current_redemptions = current_redemptions + 1 WHERE id = p_reward_id;

  -- Calculate discount
  IF v_reward.reward_type = 'discount_fixed' THEN v_discount := COALESCE(v_reward.discount_amount, 0);
  ELSIF v_reward.reward_type = 'discount_percent' THEN v_discount := COALESCE(v_reward.discount_percent, 0);
  END IF;

  -- Apply to order if provided
  IF p_order_id IS NOT NULL THEN
    IF v_reward.reward_type = 'discount_fixed' THEN
      UPDATE orders SET discount_amount = discount_amount + v_discount, loyalty_reward_applied = v_reward.title_es, loyalty_points_redeemed = v_reward.points_cost WHERE id = p_order_id;
    ELSIF v_reward.reward_type = 'discount_percent' THEN
      UPDATE orders SET discount_amount = discount_amount + ROUND(subtotal * v_discount / 100, 2), loyalty_reward_applied = v_reward.title_es, loyalty_points_redeemed = v_reward.points_cost WHERE id = p_order_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'points_deducted', v_reward.points_cost, 'discount', v_discount, 'reward_type', v_reward.reward_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loyalty: recalculate tier
CREATE OR REPLACE FUNCTION loyalty_recalculate_tier(p_tenant_id uuid, p_customer_id uuid)
RETURNS void AS $$
DECLARE
  v_points int;
  v_tier_id uuid;
BEGIN
  SELECT total_points_earned INTO v_points FROM loyalty_customers WHERE id = p_customer_id;

  SELECT id INTO v_tier_id FROM loyalty_tiers
  WHERE tenant_id = p_tenant_id AND active = true AND min_points <= v_points
  ORDER BY min_points DESC LIMIT 1;

  UPDATE loyalty_customers SET current_tier_id = v_tier_id, updated_at = now() WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loyalty: find or create customer
CREATE OR REPLACE FUNCTION loyalty_find_or_create_customer(
  p_tenant_id uuid, p_phone text, p_name text DEFAULT ''
) RETURNS uuid AS $$
DECLARE
  v_customer_id uuid;
  v_settings loyalty_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings FROM loyalty_settings WHERE tenant_id = p_tenant_id;
  IF NOT FOUND OR NOT v_settings.enabled THEN RETURN NULL; END IF;

  SELECT id INTO v_customer_id FROM loyalty_customers
  WHERE tenant_id = p_tenant_id AND phone = p_phone;

  IF v_customer_id IS NOT NULL THEN RETURN v_customer_id; END IF;

  IF NOT v_settings.auto_enroll THEN RETURN NULL; END IF;

  INSERT INTO loyalty_customers (tenant_id, full_name, phone, current_points_balance)
  VALUES (p_tenant_id, p_name, p_phone, v_settings.welcome_bonus)
  RETURNING id INTO v_customer_id;

  IF v_settings.welcome_bonus > 0 THEN
    INSERT INTO loyalty_points_ledger (tenant_id, customer_id, movement_type, points_delta, balance_after, source, description)
    VALUES (p_tenant_id, v_customer_id, 'bonus', v_settings.welcome_bonus, v_settings.welcome_bonus, 'system', 'Bono de bienvenida');
  END IF;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard analytics
CREATE OR REPLACE FUNCTION pos_dashboard_stats(p_tenant_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'today_orders', (SELECT COUNT(*) FROM orders WHERE tenant_id = p_tenant_id AND created_at::date = p_date AND status NOT IN ('cancelled')),
    'today_revenue', (SELECT COALESCE(SUM(total), 0) FROM orders WHERE tenant_id = p_tenant_id AND created_at::date = p_date AND status NOT IN ('cancelled','refunded')),
    'today_avg_ticket', (SELECT COALESCE(AVG(total), 0) FROM orders WHERE tenant_id = p_tenant_id AND created_at::date = p_date AND status NOT IN ('cancelled','refunded')),
    'today_tips', (SELECT COALESCE(SUM(tip_amount), 0) FROM orders WHERE tenant_id = p_tenant_id AND created_at::date = p_date),
    'open_orders', (SELECT COUNT(*) FROM orders WHERE tenant_id = p_tenant_id AND status IN ('open','confirmed','preparing','ready')),
    'tables_occupied', (SELECT COUNT(*) FROM restaurant_tables WHERE tenant_id = p_tenant_id AND status = 'occupied'),
    'tables_total', (SELECT COUNT(*) FROM restaurant_tables WHERE tenant_id = p_tenant_id AND active = true),
    'loyalty_members', (SELECT COUNT(*) FROM loyalty_customers WHERE tenant_id = p_tenant_id AND active = true)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON loyalty_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON loyalty_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
