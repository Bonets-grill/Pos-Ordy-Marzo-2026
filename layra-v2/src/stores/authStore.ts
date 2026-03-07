import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import type { Tables } from "@/core/supabase/types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Tables<"profiles"> | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Tables<"profiles"> | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, session: null, profile: null, loading: false }),
}));
