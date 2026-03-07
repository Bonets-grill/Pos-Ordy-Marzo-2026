-- ============================================================
-- FIX: Remove old triggers on auth.users that reference
-- dropped functions/tables from previous schema
-- ============================================================

-- Drop any old trigger that creates profiles automatically
drop trigger if exists on_auth_user_created on auth.users;

-- Drop old functions that may reference removed tables
drop function if exists public.handle_new_user() cascade;
drop function if exists public.create_profile_for_user() cascade;

-- Also clean up old tables from OrdyBuilder that conflict
drop table if exists public.chat_messages cascade;
drop table if exists public.module_locks cascade;
drop table if exists public.regression_runs cascade;
drop table if exists public.incidents cascade;
drop table if exists public.project_files cascade;
drop table if exists public.deployments cascade;
drop table if exists public.module_approvals cascade;
drop table if exists public.ai_usage cascade;
drop table if exists public.modules cascade;
drop table if exists public.users cascade;
