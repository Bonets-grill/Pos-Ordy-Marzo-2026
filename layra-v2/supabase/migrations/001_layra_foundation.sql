-- ============================================================
-- LAYRA FOUNDATION SCHEMA
-- Multi-tenant architecture with RLS
-- Tables first, then policies (to avoid forward references)
-- ============================================================

-- ────────────────────────────────
-- DROP OLD TABLES (clean slate)
-- ────────────────────────────────
drop table if exists public.audit_logs cascade;
drop table if exists public.support_sessions cascade;
drop table if exists public.project_snapshots cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;
drop table if exists public.tenants cascade;

-- ────────────────────────────────
-- 1. CREATE ALL TABLES
-- ────────────────────────────────

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'user' check (role in ('super_admin', 'tenant_admin', 'user')),
  display_name text not null,
  avatar_url text,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text not null default '',
  system_type text not null check (system_type in (
    'crm', 'restaurant', 'booking', 'saas_dashboard',
    'agency', 'ecommerce', 'ai_automation'
  )),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  version text not null default '1.0.0',
  settings jsonb not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  data jsonb not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  admin_id uuid not null references auth.users(id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  context jsonb not null default '{}',
  changes_applied jsonb not null default '[]',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid not null,
  metadata jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────
-- 2. ENABLE RLS ON ALL TABLES
-- ────────────────────────────────
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_snapshots enable row level security;
alter table public.support_sessions enable row level security;
alter table public.audit_logs enable row level security;

-- ────────────────────────────────
-- 3. POLICIES (all tables exist now)
-- ────────────────────────────────

-- TENANTS policies
create policy "super_admin_all_tenants" on public.tenants
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

create policy "users_own_tenant" on public.tenants
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.tenant_id = tenants.id
    )
  );

-- Allow authenticated users to insert tenants (for registration)
create policy "auth_insert_tenant" on public.tenants
  for insert with check (auth.uid() is not null);

-- PROFILES policies
create policy "users_own_profile" on public.profiles
  for all using (user_id = auth.uid());

-- Allow authenticated users to insert their own profile (registration)
create policy "auth_insert_profile" on public.profiles
  for insert with check (user_id = auth.uid());

create policy "super_admin_all_profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
      and p.role = 'super_admin'
    )
  );

create policy "tenant_admin_tenant_profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
      and p.tenant_id = profiles.tenant_id
      and p.role in ('tenant_admin', 'super_admin')
    )
  );

-- PROJECTS policies
create policy "tenant_projects" on public.projects
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.tenant_id = projects.tenant_id
    )
  );

create policy "super_admin_all_projects" on public.projects
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- PROJECT_SNAPSHOTS policies
create policy "snapshot_via_project" on public.project_snapshots
  for all using (
    exists (
      select 1 from public.projects p
      join public.profiles pr on pr.tenant_id = p.tenant_id
      where p.id = project_snapshots.project_id
      and pr.user_id = auth.uid()
    )
  );

create policy "super_admin_all_snapshots" on public.project_snapshots
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- SUPPORT_SESSIONS policies
create policy "super_admin_sessions" on public.support_sessions
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- AUDIT_LOGS policies
create policy "super_admin_audit" on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

create policy "tenant_admin_audit" on public.audit_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.tenant_id = audit_logs.tenant_id
      and profiles.role = 'tenant_admin'
    )
  );

create policy "insert_audit" on public.audit_logs
  for insert with check (actor_id = auth.uid());

-- ────────────────────────────────
-- 4. INDEXES
-- ────────────────────────────────
create index idx_profiles_user_id on public.profiles(user_id);
create index idx_profiles_tenant_id on public.profiles(tenant_id);
create index idx_projects_tenant_id on public.projects(tenant_id);
create index idx_projects_status on public.projects(status);
create index idx_snapshots_project_id on public.project_snapshots(project_id);
create index idx_sessions_project_id on public.support_sessions(project_id);
create index idx_sessions_status on public.support_sessions(status);
create index idx_audit_tenant_id on public.audit_logs(tenant_id);
create index idx_audit_created_at on public.audit_logs(created_at desc);

-- ────────────────────────────────
-- 5. UPDATED_AT TRIGGER
-- ────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
