import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";

export function PWAPrompt() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setShow(true);
      });
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-card p-4 shadow-lg">
      <p className="text-sm">{t("pwa.updateAvailable")}</p>
      <Button size="sm" onClick={() => window.location.reload()}>
        {t("pwa.update")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
        {t("pwa.dismiss")}
      </Button>
    </div>
  );
}
