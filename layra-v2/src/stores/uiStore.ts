import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/lib/constants";
import { getStoredLanguage, storeLanguage } from "@/i18n";

type Theme = "light" | "dark" | "system";

interface UIState {
  lang: Lang;
  theme: Theme;
  sidebarOpen: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      lang: getStoredLanguage(),
      theme: "system",
      sidebarOpen: true,
      setLang: (lang) => {
        storeLanguage(lang);
        set({ lang });
      },
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: "layra-ui",
      partialize: (state) => ({
        lang: state.lang,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
