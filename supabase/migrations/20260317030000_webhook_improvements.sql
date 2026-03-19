-- ============================================================
-- ORDY POS — Webhook Idempotency Improvements
--
-- 1. Multi-tenant unique constraint: UNIQUE(tenant_id, event_id, source)
--    Reason: Different tenants could receive the same provider event_id.
--    The old UNIQUE(event_id, source) could incorrectly block tenant B
--    if tenant A already processed the same event_id.
--
-- 2. Add processed_at column for processing latency observability.
--
-- 3. Add redis_rate_limiter feature flag for Phase 2.
--
-- Safety:
--   - DROP INDEX CONCURRENTLY not available inside transaction,
--     so we drop the old index normally (fast on small table).
--   - No data deleted. No columns removed. Additive only.
-- ============================================================

-- ─── 1. Replace unique constraint ──────────────────────

-- Drop old constraint (non-tenant-scoped)
DROP INDEX IF EXISTS idx_webhook_events_idempotent;

-- Create new tenant-scoped constraint
CREATE UNIQUE INDEX idx_webhook_events_idempotent
  ON webhook_events(tenant_id, event_id, source);

-- ─── 2. Add processed_at column ────────────────────────

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- ─── 3. Feature flag for Redis rate limiter (Phase 2) ──

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('redis_rate_limiter', false, 'Use distributed Redis rate limiter instead of in-memory. Requires REDIS_URL env var.')
ON CONFLICT (key) DO NOTHING;
