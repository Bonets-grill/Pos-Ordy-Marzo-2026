-- ============================================================
-- FRANCHISE SYSTEM SCHEMA
-- Adds franchise/reseller support to Layra
-- ============================================================

-- ────────────────────────────────
-- 1. ADD reseller_admin ROLE
-- ────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'reseller_admin', 'tenant_admin', 'user'));

-- ────────────────────────────────
-- 2. FRANCHISES TABLE
-- ────────────────────────────────
create table public.franchises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tier text not null check (tier in ('starter', 'growth', 'empire')),
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled')),
  brand_name text not null,
  brand_color text not null default '#00e5b8',
  brand_logo_url text,
  royalty_pct numeric(5,2) not null default 22.00,
  investment_amount numeric(10,2) not null,
  max_agents integer not null default 10,
  regions jsonb not null default '[]',
  contact_phone text,
  contact_email text,
  notes text,
  activated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────
-- 3. FRANCHISE CLIENTS (end customers of the reseller)
-- ────────────────────────────────
create table public.franchise_clients (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  agent_id text not null,
  status text not null default 'trial' check (status in ('trial', 'active', 'paused', 'cancelled')),
  monthly_price numeric(10,2) not null default 99.00,
  trial_ends_at timestamptz,
  whatsapp_instance text,
  whatsapp_status text default 'disconnected' check (whatsapp_status in ('connected', 'disconnected', 'qr_pending')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────
-- 4. ROYALTY PAYMENTS (what franchisees owe Layra)
-- ────────────────────────────────
create table public.royalty_payments (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_revenue numeric(10,2) not null default 0,
  royalty_pct numeric(5,2) not null,
  royalty_amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────
-- 5. ENABLE RLS
-- ────────────────────────────────
alter table public.franchises enable row level security;
alter table public.franchise_clients enable row level security;
alter table public.royalty_payments enable row level security;

-- ────────────────────────────────
-- 6. POLICIES
-- ────────────────────────────────

-- FRANCHISES: super_admin sees all
create policy "super_admin_all_franchises" on public.franchises
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- FRANCHISES: reseller sees own
create policy "reseller_own_franchise" on public.franchises
  for select using (owner_id = auth.uid());

-- FRANCHISE_CLIENTS: super_admin sees all
create policy "super_admin_all_clients" on public.franchise_clients
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- FRANCHISE_CLIENTS: reseller manages own clients
create policy "reseller_own_clients" on public.franchise_clients
  for all using (
    exists (
      select 1 from public.franchises
      where franchises.id = franchise_clients.franchise_id
      and franchises.owner_id = auth.uid()
    )
  );

-- ROYALTY_PAYMENTS: super_admin sees all
create policy "super_admin_all_royalties" on public.royalty_payments
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- ROYALTY_PAYMENTS: reseller sees own
create policy "reseller_own_royalties" on public.royalty_payments
  for select using (
    exists (
      select 1 from public.franchises
      where franchises.id = royalty_payments.franchise_id
      and franchises.owner_id = auth.uid()
    )
  );

-- ────────────────────────────────
-- 7. INDEXES
-- ────────────────────────────────
create index idx_franchises_owner on public.franchises(owner_id);
create index idx_franchises_status on public.franchises(status);
create index idx_franchise_clients_franchise on public.franchise_clients(franchise_id);
create index idx_franchise_clients_status on public.franchise_clients(status);
create index idx_royalty_payments_franchise on public.royalty_payments(franchise_id);
create index idx_royalty_payments_status on public.royalty_payments(status);

-- ────────────────────────────────
-- 8. TRIGGERS
-- ────────────────────────────────
create trigger franchises_updated_at before update on public.franchises
  for each row execute function public.handle_updated_at();

create trigger franchise_clients_updated_at before update on public.franchise_clients
  for each row execute function public.handle_updated_at();
