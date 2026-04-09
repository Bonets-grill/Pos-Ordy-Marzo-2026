"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, LANGS, UI } from "./translations";
import { ESC_TRANSLATIONS } from "./escandallo/i18n";

interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; }
const Ctx = createContext<I18nCtx>({ lang: "es", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem("ordy-pos-lang") as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && LANGS.includes(saved)) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("ordy-pos-lang", l); };
  const t = (key: string) => UI[lang]?.[key] || ESC_TRANSLATIONS[lang]?.[key] || UI.es?.[key] || ESC_TRANSLATIONS.es?.[key] || key;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() { return useContext(Ctx); }
