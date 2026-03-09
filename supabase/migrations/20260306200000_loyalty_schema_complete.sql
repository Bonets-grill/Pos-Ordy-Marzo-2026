-- Migration: Complete loyalty schema (add missing columns + new tables)
-- Date: 2026-03-06

BEGIN;

-- ============================================================
-- 1. ALTER TABLE loyalty_settings — add missing columns
-- ============================================================
ALTER TABLE loyalty_settings
  ADD COLUMN IF NOT EXISTS loyalty_mode text NOT NULL DEFAULT 'points'
    CHECK (loyalty_mode IN ('points','visits','hybrid')),
  ADD COLUMN IF NOT EXISTS exclude_tips boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_from_qr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_create_from_takeaway boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthday_bonus_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_bonus_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier_system_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reward_redemption_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS expiration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiration_days int;

-- ============================================================
-- 2. ALTER TABLE loyalty_customers — add missing columns
-- ============================================================
ALTER TABLE loyalty_customers
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    CHECK (source IN ('pos','qr','takeaway','manual','import'));

-- ============================================================
-- 3. ALTER TABLE loyalty_points_ledger — add missing columns
-- ============================================================
ALTER TABLE loyalty_points_ledger
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reward_id uuid REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 4. ALTER TABLE loyalty_tiers — add missing columns
-- ============================================================
ALTER TABLE loyalty_tiers
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_spend numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- ============================================================
-- 5. CREATE TABLE loyalty_customer_rewards
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_customer_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','redeemed','expired','canceled')),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  expires_at timestamptz,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customer_rewards_customer
  ON loyalty_customer_rewards(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_rewards_tenant
  ON loyalty_customer_rewards(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ledger_payment
  ON loyalty_points_ledger(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tiers_slug
  ON loyalty_tiers(tenant_id, slug);

-- ============================================================
-- 7. RLS on loyalty_customer_rewards
-- ============================================================
ALTER TABLE loyalty_customer_rewards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'loyalty_customer_rewards'
      AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation"
      ON loyalty_customer_rewards
      FOR ALL
      USING (tenant_id = auth_tenant_id());
  END IF;
END
$$;

-- ============================================================
-- 8. updated_at trigger for loyalty_customer_rewards
-- ============================================================

-- Create the trigger function if it doesn't already exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_loyalty_customer_rewards_updated_at'
  ) THEN
    CREATE TRIGGER trg_loyalty_customer_rewards_updated_at
      BEFORE UPDATE ON loyalty_customer_rewards
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

COMMIT;
