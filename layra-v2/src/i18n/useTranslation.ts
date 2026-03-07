import { useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import { translate } from "./index";

export function useTranslation() {
  const lang = useUIStore((s) => s.lang);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang]
  );

  return { t, lang };
}
