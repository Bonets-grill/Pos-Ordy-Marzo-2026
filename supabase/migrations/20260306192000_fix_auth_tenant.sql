-- Fix auth_tenant_id to lookup from users table instead of JWT claims
CREATE OR REPLACE FUNCTION auth_tenant_id() RETURNS uuid AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
