-- ============================================================
-- ORDY POS — Security Hardening
-- Feature flag for webhook signature verification.
-- ============================================================

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('webhook_signature_verification', false, 'Verify HMAC signatures on incoming webhooks. Requires EVOLUTION_WEBHOOK_SECRET and/or META_APP_SECRET env vars.')
ON CONFLICT (key) DO NOTHING;
