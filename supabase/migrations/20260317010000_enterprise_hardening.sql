-- ============================================================
-- ORDY POS — Enterprise Hardening Migration
-- 1. order_events — full event audit log for timeline reconstruction
-- 2. Auto-trigger on orders status change
-- 3. Helper function for manual event logging
-- ============================================================

-- ─── 1. ORDER EVENTS (Audit Timeline) ──────────────────

CREATE TABLE IF NOT EXISTS order_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  -- Common event_types:
  --   order_created, status_changed, payment_created, payment_refunded,
  --   item_added, item_removed, item_voided, table_assigned, table_freed,
  --   wa_notification_sent, wa_pickup_confirmed, wa_pickup_rejected,
  --   kds_accepted, kds_rejected, kds_preparing, kds_ready, kds_served
  status_before text,
  status_after text,
  actor text,           -- user_id, 'system', 'webhook', 'cron', 'customer'
  actor_type text DEFAULT 'system' CHECK (actor_type IN ('user', 'system', 'customer', 'webhook', 'cron', 'agent')),
  trace_id text,        -- distributed tracing correlation ID
  source text,          -- 'pos', 'kds', 'whatsapp', 'qr', 'api', 'cron'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_order_events_order ON order_events(order_id);
CREATE INDEX idx_order_events_tenant ON order_events(tenant_id);
CREATE INDEX idx_order_events_type ON order_events(event_type);
CREATE INDEX idx_order_events_trace ON order_events(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX idx_order_events_created ON order_events(created_at);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_events_tenant_isolation" ON order_events
  FOR ALL USING (tenant_id = auth_tenant_id());

CREATE POLICY "order_events_service" ON order_events
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- ─── 2. AUTO-TRIGGER: Log status changes on orders ─────

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_events (
      order_id, tenant_id, event_type,
      status_before, status_after,
      actor, actor_type, source, metadata
    ) VALUES (
      NEW.id, NEW.tenant_id, 'status_changed',
      OLD.status, NEW.status,
      'system', 'system', COALESCE(NEW.source, 'unknown'),
      jsonb_build_object(
        'payment_status', NEW.payment_status,
        'total', NEW.total,
        'customer_name', NEW.customer_name
      )
    );
  END IF;

  -- Log payment status changes too
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO order_events (
      order_id, tenant_id, event_type,
      status_before, status_after,
      actor, actor_type, source, metadata
    ) VALUES (
      NEW.id, NEW.tenant_id, 'payment_status_changed',
      OLD.payment_status, NEW.payment_status,
      'system', 'system', COALESCE(NEW.source, 'unknown'),
      jsonb_build_object('total', NEW.total)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists to allow re-creation
DROP TRIGGER IF EXISTS trg_order_status_change ON orders;

CREATE TRIGGER trg_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- ─── 3. AUTO-TRIGGER: Log order creation ────────────────

CREATE OR REPLACE FUNCTION log_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO order_events (
    order_id, tenant_id, event_type,
    status_before, status_after,
    actor, actor_type, source, metadata
  ) VALUES (
    NEW.id, NEW.tenant_id, 'order_created',
    NULL, NEW.status,
    COALESCE(NEW.created_by::text, 'system'),
    CASE WHEN NEW.source = 'whatsapp' THEN 'agent' WHEN NEW.source = 'qr' THEN 'customer' ELSE 'user' END,
    COALESCE(NEW.source, 'pos'),
    jsonb_build_object(
      'order_type', NEW.order_type,
      'total', NEW.total,
      'customer_name', NEW.customer_name,
      'customer_phone', NEW.customer_phone
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_created ON orders;

CREATE TRIGGER trg_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_created();

-- ─── 4. Helper: Manual event logging RPC ────────────────

CREATE OR REPLACE FUNCTION log_order_event(
  p_order_id uuid,
  p_tenant_id uuid,
  p_event_type text,
  p_status_before text DEFAULT NULL,
  p_status_after text DEFAULT NULL,
  p_actor text DEFAULT 'system',
  p_actor_type text DEFAULT 'system',
  p_trace_id text DEFAULT NULL,
  p_source text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO order_events (
    order_id, tenant_id, event_type,
    status_before, status_after,
    actor, actor_type, trace_id, source, metadata
  ) VALUES (
    p_order_id, p_tenant_id, p_event_type,
    p_status_before, p_status_after,
    p_actor, p_actor_type, p_trace_id, p_source, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_order_event(uuid, uuid, text, text, text, text, text, text, text, jsonb) TO service_role;
