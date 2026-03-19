-- ============================================================
-- ORDY POS — Webhook Idempotency Layer
-- Purpose: Prevent duplicate processing of inbound webhook events
-- from Evolution API, Meta Cloud API, or any external source.
--
-- Design:
--   - UNIQUE(event_id, source) ensures atomic duplicate detection
--   - INSERT with ON CONFLICT used as a lock mechanism
--   - status tracks processing lifecycle: received → processed → failed
--   - payload_hash allows detecting same content with different event IDs
--   - TTL: rows older than 7 days can be pruned by cron
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  source text NOT NULL,             -- 'evolution', 'meta', 'stripe', 'dify'
  event_id text NOT NULL,           -- Provider-specific unique event ID
  event_type text,                  -- 'messages.upsert', 'connection.update', etc.
  phone text,                       -- Sender phone (for WA events)
  payload_hash text,                -- SHA-256 of payload for content dedup
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed', 'skipped')),
  trace_id text,                    -- Distributed tracing correlation
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Primary idempotency constraint: same event from same source = skip
CREATE UNIQUE INDEX idx_webhook_events_idempotent
  ON webhook_events(event_id, source);

-- Secondary indexes for queries and cleanup
CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_phone ON webhook_events(phone) WHERE phone IS NOT NULL;

-- RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_service_only" ON webhook_events
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Seed feature flag
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('webhook_idempotency', true, 'Check webhook_events before processing inbound webhooks')
ON CONFLICT (key) DO NOTHING;
