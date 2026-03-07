-- ─── FIX: Create update_updated_at() alias before triggers need it ───
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── ORDERS TABLE ─────────────────────────────────
-- Tracks system purchases by customers
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  system_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  amount integer NOT NULL, -- purchase price in cents
  monthly_fee integer NOT NULL DEFAULT 0, -- monthly fee in cents
  stripe_checkout_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── PLATFORM SETTINGS TABLE ─────────────────────
-- Stores platform-wide settings (Stripe keys, etc.)
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_system ON orders(system_id);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Orders: users see their own tenant's orders, super_admin sees all
CREATE POLICY "tenant_orders" ON orders
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    OR get_my_role() = 'super_admin'
  );

CREATE POLICY "super_admin_manage_orders" ON orders
  FOR ALL USING (get_my_role() = 'super_admin');

-- Platform settings: super_admin only
CREATE POLICY "super_admin_settings" ON platform_settings
  FOR ALL USING (get_my_role() = 'super_admin');

-- Updated_at trigger
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
