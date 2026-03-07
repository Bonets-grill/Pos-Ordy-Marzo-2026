-- ─── SYSTEM BUILDS TABLE ─────────────────────────
-- Persists builder conversations and generated files per system
CREATE TABLE IF NOT EXISTS system_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id text NOT NULL UNIQUE,
  messages jsonb NOT NULL DEFAULT '[]',
  generated_files jsonb NOT NULL DEFAULT '{}',
  html_preview text,
  status text NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'review', 'ready', 'deployed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_builds_system ON system_builds(system_id);
CREATE INDEX IF NOT EXISTS idx_system_builds_status ON system_builds(status);

-- RLS
ALTER TABLE system_builds ENABLE ROW LEVEL SECURITY;

-- Super admin only
CREATE POLICY "super_admin_builds" ON system_builds
  FOR ALL USING (get_my_role() = 'super_admin');

-- Updated_at trigger
CREATE TRIGGER set_system_builds_updated_at
  BEFORE UPDATE ON system_builds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
