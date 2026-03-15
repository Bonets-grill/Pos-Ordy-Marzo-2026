-- ============================================================
-- Migration: Ads system + Freemium plan tiers
-- Date: 2026-03-15
-- ============================================================

-- ── 1. Ad Banners ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_ads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  link_url    text,
  alt_text    text NOT NULL DEFAULT '',
  position    text NOT NULL DEFAULT 'top' CHECK (position IN ('top', 'mid', 'bottom')),
  active      boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  -- Tracking
  impressions bigint NOT NULL DEFAULT 0,
  clicks      bigint NOT NULL DEFAULT 0,
  -- Billing
  sponsor_name text,
  monthly_fee  numeric(8,2) DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users manage own ads"
  ON menu_ads FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Public read for QR menu (no auth needed)
CREATE POLICY "Public can view active ads"
  ON menu_ads FOR SELECT
  USING (active = true);

CREATE INDEX idx_menu_ads_tenant ON menu_ads(tenant_id, active);

-- ── 2. Plan / Tier system ──────────────────────────────────
-- Add plan column to tenants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan text NOT NULL DEFAULT 'free'
      CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'));
  END IF;
END $$;

-- Plan limits stored as jsonb for flexibility
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan_limits'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan_limits jsonb NOT NULL DEFAULT '{
      "max_orders_month": 50,
      "max_menu_items": 20,
      "max_wa_messages_month": 100,
      "ads_enabled": false,
      "analytics_enabled": false,
      "predictive_analytics": false,
      "upselling_enabled": false,
      "weather_context": false,
      "campaigns_enabled": false
    }'::jsonb;
  END IF;
END $$;

-- Plan expiry
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan_expires_at'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan_expires_at timestamptz;
  END IF;
END $$;

-- Stripe subscription reference
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;

-- ── 3. Usage tracking for freemium limits ──────────────────
CREATE TABLE IF NOT EXISTS usage_counters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month       text NOT NULL, -- '2026-03'
  orders      int NOT NULL DEFAULT 0,
  wa_messages int NOT NULL DEFAULT 0,
  ad_impressions bigint NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, month)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant sees own usage"
  ON usage_counters FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Service role can update (from webhooks/API routes)
CREATE POLICY "Service role updates usage"
  ON usage_counters FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 4. Predictive analytics: daily aggregates ─────────────
CREATE TABLE IF NOT EXISTS analytics_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date            date NOT NULL,
  total_revenue   numeric(12,2) NOT NULL DEFAULT 0,
  total_orders    int NOT NULL DEFAULT 0,
  avg_ticket      numeric(8,2) NOT NULL DEFAULT 0,
  top_items       jsonb DEFAULT '[]',       -- [{name, qty, revenue}]
  source_breakdown jsonb DEFAULT '{}',      -- {qr: X, whatsapp: Y, ...}
  hourly_revenue  jsonb DEFAULT '[]',       -- [{hour, revenue, orders}]
  weather_snapshot jsonb,                   -- {temp, condition, description}
  day_of_week     int,                      -- 0=Sun, 6=Sat
  UNIQUE(tenant_id, date)
);

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant sees own analytics"
  ON analytics_daily FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role manages analytics"
  ON analytics_daily FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_analytics_daily_tenant_date ON analytics_daily(tenant_id, date DESC);
