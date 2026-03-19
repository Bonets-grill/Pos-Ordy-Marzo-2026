-- ============================================================
-- ORDY POS — Order State Machine Protection
--
-- Enforces valid status transitions at the database level.
-- This is defense-in-depth: even if application code has a bug,
-- the DB will reject invalid transitions.
--
-- Feature flag controlled:
--   When feature_flags.key='order_state_machine' is disabled,
--   the trigger logs violations but does NOT block them.
--   When enabled, the trigger RAISES EXCEPTION on invalid transitions.
--
-- This ensures safe rollout: enable in staging first, then production.
-- ============================================================

-- ─── Feature flag ──────────────────────────────────────

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('order_state_machine', true, 'Enforce valid order status transitions at DB level. Disable to allow any transition (logs only).')
ON CONFLICT (key) DO NOTHING;

-- ─── Order status transition validator ─────────────────

CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed text[];
  v_flag_enabled boolean;
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  v_allowed := CASE OLD.status
    WHEN 'open'       THEN ARRAY['confirmed', 'cancelled']
    WHEN 'confirmed'  THEN ARRAY['preparing', 'ready', 'served', 'closed', 'cancelled']
    WHEN 'preparing'  THEN ARRAY['ready', 'cancelled']
    WHEN 'ready'      THEN ARRAY['served', 'cancelled']
    WHEN 'served'     THEN ARRAY['closed']
    WHEN 'closed'     THEN ARRAY['refunded']
    WHEN 'cancelled'  THEN ARRAY[]::text[]
    WHEN 'refunded'   THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;

  -- Check if transition is valid
  IF NOT (NEW.status = ANY(v_allowed)) THEN
    -- Log the violation to order_events
    INSERT INTO order_events (
      order_id, tenant_id, event_type,
      status_before, status_after,
      actor, actor_type, source, metadata
    ) VALUES (
      NEW.id, NEW.tenant_id, 'invalid_transition_blocked',
      OLD.status, NEW.status,
      'system', 'system', COALESCE(NEW.source, 'unknown'),
      jsonb_build_object(
        'violation', format('%s → %s', OLD.status, NEW.status),
        'allowed', array_to_json(v_allowed),
        'order_number', NEW.order_number
      )
    );

    -- Check if enforcement is enabled
    SELECT COALESCE(
      (SELECT enabled FROM feature_flags WHERE key = 'order_state_machine' AND tenant_id IS NULL LIMIT 1),
      true  -- default: enabled
    ) INTO v_flag_enabled;

    IF v_flag_enabled THEN
      RAISE EXCEPTION 'Invalid order status transition: % → %. Allowed: %',
        OLD.status, NEW.status, array_to_string(v_allowed, ', ')
        USING ERRCODE = 'check_violation';
    END IF;

    -- If flag disabled: allow but log (violation already logged above)
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_status ON orders;

CREATE TRIGGER trg_validate_order_status
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_status_transition();

-- ─── KDS item status transition validator ──────────────

CREATE OR REPLACE FUNCTION validate_kds_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed text[];
  v_flag_enabled boolean;
BEGIN
  -- Skip if kds_status hasn't changed
  IF OLD.kds_status IS NOT DISTINCT FROM NEW.kds_status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  v_allowed := CASE OLD.kds_status
    WHEN 'pending'    THEN ARRAY['preparing', 'ready', 'served']
    WHEN 'preparing'  THEN ARRAY['ready', 'served']
    WHEN 'ready'      THEN ARRAY['served']
    WHEN 'served'     THEN ARRAY['pending', 'preparing']  -- recall support
    ELSE ARRAY[]::text[]
  END;

  -- Check if transition is valid
  IF NOT (NEW.kds_status = ANY(v_allowed)) THEN
    -- Check if enforcement is enabled
    SELECT COALESCE(
      (SELECT enabled FROM feature_flags WHERE key = 'order_state_machine' AND tenant_id IS NULL LIMIT 1),
      true
    ) INTO v_flag_enabled;

    IF v_flag_enabled THEN
      RAISE EXCEPTION 'Invalid KDS status transition: % → %. Allowed: %',
        OLD.kds_status, NEW.kds_status, array_to_string(v_allowed, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_kds_status ON order_items;

CREATE TRIGGER trg_validate_kds_status
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_kds_status_transition();
