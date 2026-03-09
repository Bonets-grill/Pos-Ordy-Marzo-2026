-- ============================================================
-- Migration: WhatsApp Agent System
-- Date: 2026-03-09
-- Description: Tables for multi-provider WhatsApp AI agent
--              (Evolution API + Meta Cloud API), conversation
--              sessions, message history, and auto-cleanup.
-- ============================================================

-- 1. wa_instances — per-tenant WhatsApp connection
CREATE TABLE IF NOT EXISTS wa_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('evolution', 'meta')),
  instance_name text,              -- Evolution: instance name
  phone_number text,               -- connected phone number
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'banned')),
  -- Evolution API fields
  evolution_api_url text,          -- Evolution server URL
  evolution_api_key text,          -- Instance API key
  evolution_instance_id text,      -- Instance ID on Evolution
  -- Meta Cloud API fields
  meta_phone_number_id text,       -- Meta phone number ID
  meta_access_token text,          -- Meta permanent access token
  meta_verify_token text,          -- Webhook verification token
  meta_waba_id text,               -- WhatsApp Business Account ID
  -- Agent configuration
  agent_name text DEFAULT 'Asistente',
  agent_personality text DEFAULT 'friendly',  -- friendly, professional, casual
  agent_language text DEFAULT 'es',           -- default response language
  agent_instructions text,                     -- custom instructions per tenant
  welcome_message text,                        -- message on first contact
  away_message text,                           -- message when restaurant closed
  -- Limits
  max_items_per_order int DEFAULT 20,
  allow_orders boolean DEFAULT true,
  allow_reservations boolean DEFAULT false,
  -- Timestamps
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 2. wa_sessions — conversation state per phone per tenant
CREATE TABLE IF NOT EXISTS wa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES wa_instances(id) ON DELETE CASCADE,
  phone text NOT NULL,                -- customer phone (E.164 format)
  customer_name text,                 -- extracted from conversation
  loyalty_customer_id uuid,           -- linked loyalty account (if matched)
  -- Session state
  state text NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'browsing_menu', 'ordering', 'confirming_order', 'checking_status', 'reserving')),
  cart jsonb NOT NULL DEFAULT '[]',   -- current cart items [{menu_item_id, name, qty, unit_price, modifiers, notes}]
  pending_order_id uuid,              -- order being tracked
  context jsonb NOT NULL DEFAULT '{}', -- arbitrary session context
  -- Timestamps
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

-- 3. wa_messages — full message history (conversation memory)
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES wa_sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content text NOT NULL,
  tool_calls jsonb,       -- if assistant used tools
  tool_name text,         -- if role=tool, which tool responded
  wa_message_id text,     -- WhatsApp message ID (for read receipts)
  media_url text,         -- if message has image/audio
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes for performance
CREATE INDEX idx_wa_sessions_phone ON wa_sessions(tenant_id, phone);
CREATE INDEX idx_wa_sessions_last_msg ON wa_sessions(last_message_at DESC);
CREATE INDEX idx_wa_messages_session ON wa_messages(session_id, created_at DESC);
CREATE INDEX idx_wa_messages_tenant ON wa_messages(tenant_id, created_at DESC);
CREATE INDEX idx_wa_instances_status ON wa_instances(status);

-- 5. RLS Policies
ALTER TABLE wa_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

-- Tenant users can manage their own instance
CREATE POLICY wa_instances_tenant ON wa_instances
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY wa_sessions_tenant ON wa_sessions
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY wa_messages_tenant ON wa_messages
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Service role bypasses RLS (for webhook processing)
-- (Supabase service_role already bypasses RLS by default)

-- 6. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_wa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wa_instances_updated_at
  BEFORE UPDATE ON wa_instances
  FOR EACH ROW EXECUTE FUNCTION update_wa_updated_at();

-- 7. Auto-cleanup old sessions (older than 24h of inactivity)
-- Function to clean stale sessions (call via cron or edge function)
CREATE OR REPLACE FUNCTION cleanup_wa_stale_sessions()
RETURNS void AS $$
BEGIN
  -- Reset cart and state for sessions inactive > 24h
  UPDATE wa_sessions
  SET state = 'idle', cart = '[]'::jsonb, context = '{}'::jsonb
  WHERE last_message_at < now() - interval '24 hours'
  AND state != 'idle';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
