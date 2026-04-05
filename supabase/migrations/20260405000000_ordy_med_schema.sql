-- ============================================================
-- ORDY MED AI COPILOT — Production Schema
-- Multi-tenant with RLS tenant isolation
-- ============================================================

-- Extensions

-- ============================================================
-- TENANTS
-- ============================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  plan_id text,
  contact_email text,
  max_users int default 5,
  enabled_modules jsonb default '[]'::jsonb,
  feature_flags jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'viewer' check (role in ('super_admin','org_admin','doctor','clinician','staff','viewer')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PATIENTS
-- ============================================================
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_code text not null,
  name text not null,
  date_of_birth date,
  gender text,
  contact_email text,
  contact_phone text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, patient_code)
);

-- ============================================================
-- SESSIONS
-- ============================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_code text not null,
  patient_id uuid references public.patients(id) on delete set null,
  doctor_id uuid references public.profiles(id) on delete set null,
  consultation_mode text default 'general',
  language text default 'es-ES',
  status text default 'active' check (status in ('active','paused','completed','cancelled')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, session_code)
);

-- ============================================================
-- DOCUMENTS (transcripts, notes)
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  doctor_id uuid references public.profiles(id) on delete set null,
  doc_type text not null check (doc_type in ('transcript','encounter_note','soap_note','clinical_summary','followup_note')),
  title text,
  content text,
  version int default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MEMORY ITEMS
-- ============================================================
create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid references public.profiles(id) on delete set null,
  item_type text not null check (item_type in ('allergy','chronic_condition','medication','procedure','family_history','social_history','vital_sign','lab_result','symptom','diagnosis','note')),
  title text not null,
  description text,
  severity text default 'low' check (severity in ('low','medium','high','critical')),
  status text default 'active' check (status in ('active','resolved','archived')),
  tags text[] default '{}',
  source_session_id uuid references public.sessions(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- AUDIT EVENTS
-- ============================================================
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_role text,
  category text not null check (category in ('auth','access','data_read','data_write','data_delete','session','clinical','admin','security','system')),
  severity text default 'info' check (severity in ('info','warning','critical','alert')),
  sensitivity text default 'internal' check (sensitivity in ('public','internal','confidential','restricted')),
  retention text default 'standard' check (retention in ('transient','short_term','standard','long_term','permanent')),
  action text not null,
  description text,
  patient_id uuid references public.patients(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  module_id text,
  decision text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_patients_tenant on public.patients(tenant_id);
create index if not exists idx_sessions_tenant on public.sessions(tenant_id);
create index if not exists idx_sessions_patient on public.sessions(patient_id);
create index if not exists idx_documents_tenant on public.documents(tenant_id);
create index if not exists idx_documents_session on public.documents(session_id);
create index if not exists idx_documents_patient on public.documents(patient_id);
create index if not exists idx_memory_tenant on public.memory_items(tenant_id);
create index if not exists idx_memory_patient on public.memory_items(patient_id);
create index if not exists idx_audit_tenant on public.audit_events(tenant_id);
create index if not exists idx_audit_patient on public.audit_events(patient_id);
create index if not exists idx_audit_created on public.audit_events(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.sessions enable row level security;
alter table public.documents enable row level security;
alter table public.memory_items enable row level security;
alter table public.audit_events enable row level security;

-- Helper function: get user's tenant_id
create or replace function public.current_tenant_id() returns uuid
  language sql stable
  as $$
    select tenant_id from public.profiles where id = auth.uid()
  $$;

-- Helper function: check if user is super_admin
create or replace function public.is_super_admin() returns boolean
  language sql stable
  as $$
    select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false)
  $$;

-- TENANTS: super_admin sees all, users see their own
create policy "tenants_select" on public.tenants for select
  using (public.is_super_admin() or id = public.current_tenant_id());

-- PROFILES: users see own tenant profiles, super_admin sees all
create policy "profiles_select" on public.profiles for select
  using (public.is_super_admin() or tenant_id = public.current_tenant_id());
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());

-- PATIENTS: tenant-scoped
create policy "patients_tenant_select" on public.patients for select
  using (public.is_super_admin() or tenant_id = public.current_tenant_id());
create policy "patients_tenant_insert" on public.patients for insert
  with check (tenant_id = public.current_tenant_id());
create policy "patients_tenant_update" on public.patients for update
  using (tenant_id = public.current_tenant_id());

-- SESSIONS: tenant-scoped
create policy "sessions_tenant_select" on public.sessions for select
  using (public.is_super_admin() or tenant_id = public.current_tenant_id());
create policy "sessions_tenant_insert" on public.sessions for insert
  with check (tenant_id = public.current_tenant_id());
create policy "sessions_tenant_update" on public.sessions for update
  using (tenant_id = public.current_tenant_id());

-- DOCUMENTS: tenant-scoped
create policy "documents_tenant_select" on public.documents for select
  using (public.is_super_admin() or tenant_id = public.current_tenant_id());
create policy "documents_tenant_insert" on public.documents for insert
  with check (tenant_id = public.current_tenant_id());
create policy "documents_tenant_update" on public.documents for update
  using (tenant_id = public.current_tenant_id());

-- MEMORY ITEMS: tenant-scoped
create policy "memory_tenant_select" on public.memory_items for select
  using (public.is_super_admin() or tenant_id = public.current_tenant_id());
create policy "memory_tenant_insert" on public.memory_items for insert
  with check (tenant_id = public.current_tenant_id());
create policy "memory_tenant_update" on public.memory_items for update
  using (tenant_id = public.current_tenant_id());

-- AUDIT: read-only for tenant members, write via service role only
create policy "audit_tenant_select" on public.audit_events for select
  using (public.is_super_admin() or tenant_id = public.current_tenant_id());

-- Updated_at triggers
create or replace function public.set_updated_at() returns trigger
  language plpgsql as $$
  begin new.updated_at = now(); return new; end;
$$;

create trigger trg_tenants_updated before update on public.tenants for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_patients_updated before update on public.patients for each row execute function public.set_updated_at();
create trigger trg_sessions_updated before update on public.sessions for each row execute function public.set_updated_at();
create trigger trg_documents_updated before update on public.documents for each row execute function public.set_updated_at();
create trigger trg_memory_updated before update on public.memory_items for each row execute function public.set_updated_at();
