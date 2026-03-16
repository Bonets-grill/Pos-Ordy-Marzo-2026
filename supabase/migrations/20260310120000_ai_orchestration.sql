-- ============================================================================
-- AI ORCHESTRATION — Audit trail + proposal storage
-- Additive only: CREATE TABLE + CREATE INDEX + CREATE POLICY
-- No modifications to existing tables
-- ============================================================================

-- ── AI Proposals ──────────────────────────────────────────────────────────────

CREATE TABLE ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  motivation text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  files_to_create jsonb NOT NULL DEFAULT '[]',
  files_to_modify jsonb NOT NULL DEFAULT '[]',
  files_to_delete jsonb NOT NULL DEFAULT '[]',
  risk_assessment jsonb NOT NULL DEFAULT '{}',
  rollback_plan jsonb NOT NULL DEFAULT '{}',
  openai_review jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','approved','rejected','executing','completed','rolled_back','failed')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_proposals_tenant ON ai_proposals(tenant_id);
CREATE INDEX idx_ai_proposals_status ON ai_proposals(status);

ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_proposals_tenant_isolation"
  ON ai_proposals FOR ALL
  USING (tenant_id = auth_tenant_id());

-- ── AI Orchestration Log ──────────────────────────────────────────────────────

CREATE TABLE ai_orchestration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES ai_proposals(id) ON DELETE SET NULL,
  phase text NOT NULL,
  action text NOT NULL,
  input_summary text NOT NULL DEFAULT '',
  output_summary text NOT NULL DEFAULT '',
  duration_ms int NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_orch_log_tenant ON ai_orchestration_log(tenant_id);
CREATE INDEX idx_ai_orch_log_proposal ON ai_orchestration_log(proposal_id);
CREATE INDEX idx_ai_orch_log_created ON ai_orchestration_log(created_at DESC);

ALTER TABLE ai_orchestration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_orch_log_tenant_isolation"
  ON ai_orchestration_log FOR ALL
  USING (tenant_id = auth_tenant_id());
