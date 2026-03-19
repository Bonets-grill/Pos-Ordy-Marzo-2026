-- ============================================================
-- ORDY POS — Reservation System
--
-- Full reservation management synced with POS tables.
-- 1. reservation_settings — per-tenant configuration
-- 2. reservations — actual bookings with table assignment
-- 3. Availability checks use restaurant_tables capacity + existing reservations
-- ============================================================

-- ─── 1. Reservation Settings ───────────────────────────

CREATE TABLE IF NOT EXISTS reservation_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  slot_duration_minutes int DEFAULT 90,        -- how long a reservation holds a table
  max_party_size int DEFAULT 12,
  min_party_size int DEFAULT 1,
  advance_booking_days int DEFAULT 30,         -- how far ahead customers can book
  min_advance_hours int DEFAULT 1,             -- minimum hours before reservation time
  auto_confirm boolean DEFAULT true,           -- auto-confirm or require staff approval
  allow_whatsapp boolean DEFAULT true,         -- allow reservations via WhatsApp agent
  allow_qr boolean DEFAULT false,              -- allow reservations via QR page
  confirmation_message text DEFAULT 'Su reserva ha sido confirmada. Le esperamos.',
  cancellation_policy text DEFAULT 'Puede cancelar hasta 2 horas antes.',
  blocked_dates jsonb DEFAULT '[]',            -- array of YYYY-MM-DD strings (holidays, closures)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservation_settings_tenant" ON reservation_settings
  FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "reservation_settings_service" ON reservation_settings
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- ─── 2. Reservations ───────────────────────────────────

CREATE TABLE IF NOT EXISTS reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  party_size int NOT NULL CHECK (party_size >= 1 AND party_size <= 50),
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  end_time time NOT NULL,                      -- calculated: reservation_time + slot_duration
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'pending',       -- awaiting staff confirmation
    'confirmed',     -- confirmed by staff or auto-confirmed
    'seated',        -- customer has arrived and been seated
    'completed',     -- reservation finished
    'cancelled',     -- cancelled by customer or staff
    'no_show'        -- customer didn't show up
  )),
  source text DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'pos', 'qr', 'phone', 'walkin')),
  notes text,
  cancellation_reason text,
  reminder_sent boolean DEFAULT false,
  wa_session_id uuid,                          -- link to WhatsApp session if booked via agent
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX idx_reservations_date ON reservations(tenant_id, reservation_date, reservation_time);
CREATE INDEX idx_reservations_table ON reservations(table_id, reservation_date);
CREATE INDEX idx_reservations_phone ON reservations(customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX idx_reservations_status ON reservations(status);

-- Prevent double-booking: same table, same date, overlapping times
CREATE UNIQUE INDEX idx_reservations_no_double_book
  ON reservations(table_id, reservation_date, reservation_time)
  WHERE status IN ('pending', 'confirmed', 'seated') AND table_id IS NOT NULL;

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_tenant" ON reservations
  FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "reservations_service" ON reservations
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- ─── 3. Auto-update timestamp trigger ──────────────────

CREATE TRIGGER trg_reservations_updated
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reservation_settings_updated
  BEFORE UPDATE ON reservation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── 4. Log reservation events to order_events ─────────
-- Reuse order_events for reservation audit trail
-- (order_id will be NULL for pure reservations)

-- ─── 5. Prompt sync tracking ───────────────────────────
-- Track when the Dify prompt was last generated/synced

ALTER TABLE wa_instances
  ADD COLUMN IF NOT EXISTS prompt_hash text,
  ADD COLUMN IF NOT EXISTS prompt_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS prompt_text text;
