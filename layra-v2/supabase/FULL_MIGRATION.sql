-- ============================================================
-- LAYRA v2 — FULL CONSOLIDATED MIGRATION
-- Run this in the SQL Editor of the NEW Supabase project
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- PART 1: FOUNDATION (001)
-- ════════════════════════════════════════════════════════════

drop table if exists public.audit_logs cascade;
drop table if exists public.support_sessions cascade;
drop table if exists public.project_snapshots cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;
drop table if exists public.tenants cascade;

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

-- ════════════════════════════════════════════════════════════
-- PART 2: RLS
-- ════════════════════════════════════════════════════════════

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_snapshots enable row level security;
alter table public.support_sessions enable row level security;
alter table public.audit_logs enable row level security;

-- ════════════════════════════════════════════════════════════
-- PART 3: FUNCTIONS (before policies that use them)
-- ════════════════════════════════════════════════════════════

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Alias (migrations 004/005 reference this name)
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper: get current user's role (bypasses RLS)
create or replace function public.get_my_role()
returns text language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Helper: get current user's tenant_id (bypasses RLS)
create or replace function public.get_my_tenant_id()
returns uuid language sql security definer stable
set search_path = public
as $$
  select tenant_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- ════════════════════════════════════════════════════════════
-- PART 4: RLS POLICIES (using helper functions, no recursion)
-- ════════════════════════════════════════════════════════════

-- PROFILES
create policy "profiles_own" on public.profiles
  for all using (user_id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

create policy "profiles_super_admin" on public.profiles
  for select using (public.get_my_role() = 'super_admin');

create policy "profiles_tenant_admin" on public.profiles
  for select using (
    public.get_my_role() in ('tenant_admin', 'super_admin')
    and tenant_id = public.get_my_tenant_id()
  );

-- TENANTS
create policy "tenants_own" on public.tenants
  for select using (id = public.get_my_tenant_id());

create policy "tenants_super_admin" on public.tenants
  for all using (public.get_my_role() = 'super_admin');

create policy "tenants_insert_auth" on public.tenants
  for insert with check (auth.uid() is not null);

-- PROJECTS
create policy "projects_tenant" on public.projects
  for all using (tenant_id = public.get_my_tenant_id());

create policy "projects_super_admin" on public.projects
  for all using (public.get_my_role() = 'super_admin');

-- SNAPSHOTS
create policy "snapshots_tenant" on public.project_snapshots
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_snapshots.project_id
      and p.tenant_id = public.get_my_tenant_id()
    )
  );

create policy "snapshots_super_admin" on public.project_snapshots
  for all using (public.get_my_role() = 'super_admin');

-- SUPPORT SESSIONS
create policy "sessions_super_admin" on public.support_sessions
  for all using (public.get_my_role() = 'super_admin');

-- AUDIT LOGS
create policy "audit_super_admin" on public.audit_logs
  for select using (public.get_my_role() = 'super_admin');

create policy "audit_tenant_admin" on public.audit_logs
  for select using (
    public.get_my_role() = 'tenant_admin'
    and tenant_id = public.get_my_tenant_id()
  );

create policy "audit_insert" on public.audit_logs
  for insert with check (actor_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- PART 5: ORDERS + PLATFORM SETTINGS (004)
-- ════════════════════════════════════════════════════════════

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  system_id text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount integer not null,
  monthly_fee integer not null default 0,
  stripe_checkout_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;
alter table public.platform_settings enable row level security;

create policy "tenant_orders" on public.orders
  for select using (
    tenant_id = public.get_my_tenant_id()
    or public.get_my_role() = 'super_admin'
  );

create policy "super_admin_manage_orders" on public.orders
  for all using (public.get_my_role() = 'super_admin');

create policy "super_admin_settings" on public.platform_settings
  for all using (public.get_my_role() = 'super_admin');

-- ════════════════════════════════════════════════════════════
-- PART 6: SYSTEM BUILDS (005)
-- ════════════════════════════════════════════════════════════

create table if not exists public.system_builds (
  id uuid primary key default gen_random_uuid(),
  system_id text not null unique,
  messages jsonb not null default '[]',
  generated_files jsonb not null default '{}',
  html_preview text,
  status text not null default 'building' check (status in ('building', 'review', 'ready', 'deployed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.system_builds enable row level security;

create policy "super_admin_builds" on public.system_builds
  for all using (public.get_my_role() = 'super_admin');

-- ════════════════════════════════════════════════════════════
-- PART 7: ALL INDEXES
-- ════════════════════════════════════════════════════════════

create index idx_profiles_user_id on public.profiles(user_id);
create index idx_profiles_tenant_id on public.profiles(tenant_id);
create index idx_projects_tenant_id on public.projects(tenant_id);
create index idx_projects_status on public.projects(status);
create index idx_projects_created_by on public.projects(created_by);
create index idx_snapshots_project_id on public.project_snapshots(project_id);
create index idx_snapshots_created_by on public.project_snapshots(created_by);
create index idx_sessions_project_id on public.support_sessions(project_id);
create index idx_sessions_status on public.support_sessions(status);
create index idx_sessions_admin_id on public.support_sessions(admin_id);
create index idx_audit_tenant_id on public.audit_logs(tenant_id);
create index idx_audit_created_at on public.audit_logs(created_at desc);
create index idx_audit_actor_id on public.audit_logs(actor_id);
create index idx_orders_tenant on public.orders(tenant_id);
create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_system on public.orders(system_id);
create index idx_system_builds_system on public.system_builds(system_id);
create index idx_system_builds_status on public.system_builds(status);

-- ════════════════════════════════════════════════════════════
-- PART 8: TRIGGERS
-- ════════════════════════════════════════════════════════════

create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger set_orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at();

create trigger set_platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.update_updated_at();

create trigger set_system_builds_updated_at before update on public.system_builds
  for each row execute function public.update_updated_at();

-- ════════════════════════════════════════════════════════════
-- DONE — All 8 tables, RLS, policies, indexes, triggers
-- ════════════════════════════════════════════════════════════
