-- ─── AUDIT FIX: DB-01/DB-02 — Trigger function name mismatch ───
-- Migrations 004 and 005 reference update_updated_at() but 001 defines handle_updated_at()
-- Create alias function to resolve the mismatch
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── AUDIT FIX: DB-04 — Missing indexes on audit_logs.actor_id ───
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON public.audit_logs(actor_id);

-- ─── AUDIT FIX: DB-05 — Missing index on support_sessions.admin_id ───
CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON public.support_sessions(admin_id);

-- ─── AUDIT FIX: DB-06 — Missing indexes on created_by columns ───
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_by ON public.project_snapshots(created_by);

-- ─── AUDIT FIX: DB-09 — Expand projects.system_type to accept all 35 systems ───
-- Drop the old constraint and add expanded one
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_system_type_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_system_type_check CHECK (
  system_type IN (
    'crm', 'project_management', 'invoicing', 'hr_platform', 'agency_platform',
    'restaurant', 'hotel_booking', 'food_delivery', 'catering',
    'clinic_management', 'gym_fitness', 'salon_spa', 'dental_clinic',
    'lms', 'school_management', 'tutoring',
    'real_estate', 'property_management',
    'booking_system', 'cleaning_service', 'legal_firm', 'auto_repair', 'freelancer_platform',
    'ecommerce', 'pos_system', 'marketplace',
    'saas_dashboard', 'helpdesk', 'ai_automation',
    'accounting', 'expense_tracker',
    'cms', 'social_media_manager', 'podcast_platform', 'event_management'
  )
);

-- ─── AUDIT FIX: M6 — Set search_path on SECURITY DEFINER functions ───
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
$$;
