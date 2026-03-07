import { useCallback } from "react";
import { supabase } from "@/core/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import type { LoginCredentials, RegisterData } from "./types";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const tenant = useTenantStore((s) => s.tenant);

  const login = useCallback(async ({ email, password }: LoginCredentials) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const register = useCallback(
    async ({ email, password, displayName, orgName }: RegisterData) => {
      // Registration goes through server (service key, auto-confirm, atomic)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, orgName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Auto-login after successful registration
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isSuperAdmin = profile?.role === "super_admin";
  const isTenantAdmin = profile?.role === "tenant_admin";

  return {
    user,
    profile,
    tenant,
    loading,
    login,
    register,
    logout,
    isSuperAdmin,
    isTenantAdmin,
  };
}
