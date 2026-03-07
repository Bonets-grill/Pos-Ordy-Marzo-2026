import { create } from "zustand";
import type { Tables } from "@/core/supabase/types";

interface TenantState {
  tenant: Tables<"tenants"> | null;
  setTenant: (tenant: Tables<"tenants"> | null) => void;
}

export const useTenantStore = create<TenantState>()((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
}));
