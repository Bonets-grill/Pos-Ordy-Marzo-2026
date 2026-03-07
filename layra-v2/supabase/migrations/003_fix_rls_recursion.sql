-- ============================================================
-- FIX: RLS infinite recursion on profiles table
-- Solution: use SECURITY DEFINER functions to check role
-- without triggering RLS policies on the profiles table itself
-- ============================================================

-- Helper function: get current user's role (bypasses RLS)
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Helper function: get current user's tenant_id (bypasses RLS)
create or replace function public.get_my_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- ────────────────────────────────
-- DROP ALL OLD POLICIES
-- ────────────────────────────────

-- Profiles
drop policy if exists "users_own_profile" on public.profiles;
drop policy if exists "auth_insert_profile" on public.profiles;
drop policy if exists "super_admin_all_profiles" on public.profiles;
drop policy if exists "tenant_admin_tenant_profiles" on public.profiles;

-- Tenants
drop policy if exists "super_admin_all_tenants" on public.tenants;
drop policy if exists "users_own_tenant" on public.tenants;
drop policy if exists "auth_insert_tenant" on public.tenants;

-- Projects
drop policy if exists "tenant_projects" on public.projects;
drop policy if exists "super_admin_all_projects" on public.projects;

-- Snapshots
drop policy if exists "snapshot_via_project" on public.project_snapshots;
drop policy if exists "super_admin_all_snapshots" on public.project_snapshots;

-- Sessions
drop policy if exists "super_admin_sessions" on public.support_sessions;

-- Audit
drop policy if exists "super_admin_audit" on public.audit_logs;
drop policy if exists "tenant_admin_audit" on public.audit_logs;
drop policy if exists "insert_audit" on public.audit_logs;

-- ────────────────────────────────
-- RECREATE POLICIES (no recursion)
-- ────────────────────────────────

-- PROFILES: users see own profile; super admin sees all
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

-- TENANTS: users see own tenant; super admin sees all
create policy "tenants_own" on public.tenants
  for select using (id = public.get_my_tenant_id());

create policy "tenants_super_admin" on public.tenants
  for all using (public.get_my_role() = 'super_admin');

create policy "tenants_insert_auth" on public.tenants
  for insert with check (auth.uid() is not null);

-- PROJECTS: tenant isolation + super admin
create policy "projects_tenant" on public.projects
  for all using (tenant_id = public.get_my_tenant_id());

create policy "projects_super_admin" on public.projects
  for all using (public.get_my_role() = 'super_admin');

-- SNAPSHOTS: via project tenant + super admin
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

-- SUPPORT SESSIONS: super admin only
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
