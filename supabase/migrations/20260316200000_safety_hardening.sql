-- ============================================================
-- ORDY POS — Safety Hardening Migration
-- Purpose: Add tables and functions for production safety:
--   1. notification_log — idempotent notification delivery
--   2. inspection_runs — QA/inspection result persistence
--   3. feature_flags — runtime feature toggles
--   4. create_order_with_items() — transactional order creation
-- ============================================================

-- ─── 1. NOTIFICATION LOG (Idempotency) ─────────────────────

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone text,
  sent_at timestamptz DEFAULT now(),
  response_status text,
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_notification_log_tenant ON notification_log(tenant_id);
CREATE INDEX idx_notification_log_order ON notification_log(order_id);
CREATE INDEX idx_notification_log_key ON notification_log(idempotency_key);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_log_tenant_isolation" ON notification_log
  FOR ALL USING (tenant_id = auth_tenant_id());

-- Service role bypass for webhook/notify handlers
CREATE POLICY "notification_log_service" ON notification_log
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- ─── 2. INSPECTION RUNS (QA Persistence) ───────────────────

CREATE TABLE IF NOT EXISTS inspection_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  run_type text NOT NULL CHECK (run_type IN ('scenario', 'db_scan', 'release_gate', 'full_inspection')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'pass', 'pass_with_warnings', 'blocked', 'error')),
  scenarios_total int DEFAULT 0,
  scenarios_passed int DEFAULT 0,
  scenarios_failed int DEFAULT 0,
  scenarios_warned int DEFAULT 0,
  blockers jsonb DEFAULT '[]',
  results jsonb DEFAULT '[]',
  summary jsonb DEFAULT '{}',
  readiness_score numeric(5,2) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  triggered_by text,
  environment text DEFAULT 'production'
);

CREATE INDEX idx_inspection_runs_tenant ON inspection_runs(tenant_id);
CREATE INDEX idx_inspection_runs_status ON inspection_runs(status);
CREATE INDEX idx_inspection_runs_type ON inspection_runs(run_type);

ALTER TABLE inspection_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspection_runs_tenant_isolation" ON inspection_runs
  FOR ALL USING (tenant_id = auth_tenant_id());

CREATE POLICY "inspection_runs_service" ON inspection_runs
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- ─── 3. FEATURE FLAGS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  scope text DEFAULT 'global' CHECK (scope IN ('global', 'tenant')),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_feature_flags_key_tenant ON feature_flags(key, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_read_all" ON feature_flags
  FOR SELECT USING (true);

CREATE POLICY "feature_flags_write_service" ON feature_flags
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Seed default feature flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('wa_transactional_orders', true, 'Use DB transaction for WhatsApp order+items creation'),
  ('notification_idempotency', true, 'Check notification_log before sending duplicate notifications'),
  ('wa_modifier_validation', true, 'Validate modifier-item links in WhatsApp add_to_cart'),
  ('inspection_enabled', true, 'Enable inspection/QA system'),
  ('observability_logging', false, 'Enable structured JSON logging to console')
ON CONFLICT (key) DO NOTHING;

-- ─── 4. TRANSACTIONAL ORDER CREATION (RPC) ─────────────────
-- Wraps INSERT order + INSERT order_items in a single transaction.
-- If either fails, both are rolled back.

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order jsonb,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_order_number bigint;
  v_item jsonb;
BEGIN
  -- Insert order
  INSERT INTO orders (
    tenant_id, table_id, order_type, status,
    customer_name, customer_phone,
    subtotal, tax_amount, discount_amount, tip_amount, total,
    payment_status, source, metadata, confirmed_at, created_by
  ) VALUES (
    (p_order->>'tenant_id')::uuid,
    NULLIF(p_order->>'table_id', '')::uuid,
    COALESCE(p_order->>'order_type', 'takeaway'),
    COALESCE(p_order->>'status', 'confirmed'),
    p_order->>'customer_name',
    p_order->>'customer_phone',
    COALESCE((p_order->>'subtotal')::numeric, 0),
    COALESCE((p_order->>'tax_amount')::numeric, 0),
    COALESCE((p_order->>'discount_amount')::numeric, 0),
    COALESCE((p_order->>'tip_amount')::numeric, 0),
    COALESCE((p_order->>'total')::numeric, 0),
    COALESCE(p_order->>'payment_status', 'pending'),
    COALESCE(p_order->>'source', 'whatsapp'),
    COALESCE(p_order->'metadata', '{}'::jsonb),
    COALESCE((p_order->>'confirmed_at')::timestamptz, now()),
    NULLIF(p_order->>'created_by', '')::uuid
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Insert all order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, tenant_id, menu_item_id, name, quantity,
      unit_price, modifiers, modifiers_total, subtotal,
      notes, kds_status, kds_station
    ) VALUES (
      v_order_id,
      (v_item->>'tenant_id')::uuid,
      NULLIF(v_item->>'menu_item_id', '')::uuid,
      v_item->>'name',
      COALESCE((v_item->>'quantity')::int, 1),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE(v_item->'modifiers', '[]'::jsonb),
      COALESCE((v_item->>'modifiers_total')::numeric, 0),
      COALESCE((v_item->>'subtotal')::numeric, 0),
      v_item->>'notes',
      COALESCE(v_item->>'kds_status', 'pending'),
      v_item->>'kds_station'
    );
  END LOOP;

  -- Return created order info
  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number
  );

EXCEPTION WHEN OTHERS THEN
  -- Transaction auto-rolls back on exception in PL/pgSQL
  RAISE;
END;
$$;

-- Grant execute to service role (used by API routes)
GRANT EXECUTE ON FUNCTION create_order_with_items(jsonb, jsonb) TO service_role;

-- ─── 5. UNIQUE CONSTRAINT ON wa_sessions (for upsert) ──────
-- Ensures only one session per tenant+phone (prevents race condition)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wa_sessions_tenant_phone_unique'
  ) THEN
    ALTER TABLE wa_sessions ADD CONSTRAINT wa_sessions_tenant_phone_unique
      UNIQUE (tenant_id, phone);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- constraint already exists
END;
$$;
