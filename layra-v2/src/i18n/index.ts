import type { TranslationMap } from "./types";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type Lang,
} from "@/lib/constants";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import de from "./locales/de.json";

const translations: Record<Lang, TranslationMap> = { en, es, fr, it, de };

export function translate(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = translations[lang]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
  if (!params) return value;
  return Object.entries(params).reduce(
    (result, [k, v]) => result.replace(`{${k}}`, String(v)),
    value
  );
}

export function detectLanguage(): Lang {
  const browserLang = navigator.language.split("-")[0] as Lang;
  if (SUPPORTED_LANGUAGES.includes(browserLang)) return browserLang;
  return DEFAULT_LANGUAGE;
}

export function getStoredLanguage(): Lang {
  const stored = localStorage.getItem("layra_lang") as Lang | null;
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
  return detectLanguage();
}

export function storeLanguage(lang: Lang): void {
  localStorage.setItem("layra_lang", lang);
}

export const LANGUAGE_LABELS: Record<Lang, string> = {
  en: "English",
  es: "Espanol",
  fr: "Francais",
  it: "Italiano",
  de: "Deutsch",
};
