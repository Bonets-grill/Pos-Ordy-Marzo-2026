-- ============================================================
-- Migration: Complete features (modifiers, business hours, etc.)
-- Date: 2026-03-06
-- ============================================================

-- ─── Modifier tables already exist in foundation (modifier_groups, modifiers, menu_item_modifier_groups)
-- No need to create them again

-- ─── Menu Item <-> Modifier Group junction (already exists in foundation) ──
-- Foundation schema uses: item_id, group_id as column names
-- Ensure RLS is enabled and policy exists
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "tenant_isolation" ON menu_item_modifier_groups
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM menu_items mi
        WHERE mi.id = item_id AND mi.tenant_id = auth_tenant_id()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Orders: add cancel_reason, notes, loyalty columns ──────
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_customer_id UUID REFERENCES loyalty_customers(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_reward_applied TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Payments: add refund columns ────────────────────────────
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_payment_id UUID REFERENCES payments(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Tenants: add JSONB config columns ──────────────────────
DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS receipt_config JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Users: add active column for staff management ──────────
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─── Order Items: add menu_item_id if missing ───────────────
DO $$ BEGIN
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES menu_items(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
