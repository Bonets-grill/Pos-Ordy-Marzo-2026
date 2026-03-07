import type { Lang } from "@/lib/constants";

export type TranslationKey = string;
export type TranslationMap = Record<string, string>;
export type Translations = Record<Lang, TranslationMap>;

export interface I18nContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
