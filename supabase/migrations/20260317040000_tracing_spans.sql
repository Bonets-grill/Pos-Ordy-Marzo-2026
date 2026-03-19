-- ============================================================
-- ORDY POS — Distributed Tracing Spans
-- Add span_id and parent_span_id to order_events for
-- full request timeline reconstruction.
--
-- These are additive nullable columns. Existing rows are unaffected.
-- No data migration needed.
-- ============================================================

ALTER TABLE order_events
  ADD COLUMN IF NOT EXISTS span_id text,
  ADD COLUMN IF NOT EXISTS parent_span_id text;

-- Index for span-based queries
CREATE INDEX IF NOT EXISTS idx_order_events_span
  ON order_events(span_id) WHERE span_id IS NOT NULL;

-- Update the log_order_event RPC to accept span fields
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
  p_metadata jsonb DEFAULT '{}',
  p_span_id text DEFAULT NULL,
  p_parent_span_id text DEFAULT NULL
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
    actor, actor_type, trace_id, source, metadata,
    span_id, parent_span_id
  ) VALUES (
    p_order_id, p_tenant_id, p_event_type,
    p_status_before, p_status_after,
    p_actor, p_actor_type, p_trace_id, p_source, p_metadata,
    p_span_id, p_parent_span_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_order_event(uuid, uuid, text, text, text, text, text, text, text, jsonb, text, text) TO service_role;
