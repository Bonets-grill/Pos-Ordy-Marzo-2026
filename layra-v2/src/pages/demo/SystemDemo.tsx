import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { getTemplateConfig } from "@/lib/templates/configs";
import { renderSystemHtml } from "@/lib/templates/engine";
import { Button } from "@/components/ui/button";
import { TEMPLATE_LANGS, type TemplateLang } from "@/lib/templates/i18n";
import type { I18nString } from "@/lib/templates/types";

function getInitialLang(): TemplateLang {
  const stored = localStorage.getItem("layra_lang") as TemplateLang | null;
  if (stored && TEMPLATE_LANGS.includes(stored)) return stored;
  const browser = navigator.language.split("-")[0] as TemplateLang;
  if (TEMPLATE_LANGS.includes(browser)) return browser;
  return "es";
}

function resolveStr(s: I18nString | undefined, lang: TemplateLang): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  return s[lang] || s.es || s.en || "";
}

export function SystemDemo() {
  const { systemId } = useParams<{ systemId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<TemplateLang>(getInitialLang);

  const config = systemId ? getTemplateConfig(systemId) : null;
  const name = config ? resolveStr(config.name, lang) : "";

  const renderDemo = useCallback((l: TemplateLang) => {
    if (!config || !iframeRef.current) return;
    const html = renderSystemHtml(config, l);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    setLoaded(true);
    return () => URL.revokeObjectURL(url);
  }, [config]);

  useEffect(() => {
    renderDemo(lang);
  }, [renderDemo, lang]);

  // Listen for lang switch messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "switchLang" && e.data.lang) {
        const newLang = e.data.lang as TemplateLang;
        setLang(newLang);
        localStorage.setItem("layra_lang", newLang);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const notFoundLabels: Record<TemplateLang, { title: string; desc: string; back: string }> = {
    es: { title: "Sistema no encontrado", desc: `El sistema "${systemId}" no tiene una demo disponible.`, back: "Volver al inicio" },
    en: { title: "System not found", desc: `The system "${systemId}" has no demo available.`, back: "Back to home" },
    fr: { title: "Système introuvable", desc: `Le système "${systemId}" n'a pas de démo disponible.`, back: "Retour à l'accueil" },
    de: { title: "System nicht gefunden", desc: `Das System "${systemId}" hat keine Demo verfügbar.`, back: "Zurück zur Startseite" },
    it: { title: "Sistema non trovato", desc: `Il sistema "${systemId}" non ha una demo disponibile.`, back: "Torna alla home" },
  };

  if (!config) {
    const nf = notFoundLabels[lang];
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{nf.title}</h1>
          <p className="text-muted-foreground">{nf.desc}</p>
          <Button asChild>
            <Link to="/">{nf.back}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Demo toolbar */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Layra
          </Link>
          <div className="h-5 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: config.brandColor }}
            >
              {name.charAt(0)}
            </div>
            <span className="text-sm font-medium text-white">{name}</span>
            <span className="text-xs text-gray-500">— {{ es: "Demo en vivo", en: "Live Demo", fr: "Démo en direct", de: "Live-Demo", it: "Demo dal vivo" }[lang]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Admin: admin@{name.toLowerCase().replace(/\s/g, "")}.io
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-jade-600 hover:bg-jade-700 text-white text-xs h-8"
            asChild
          >
            <Link to={`/checkout/${systemId}`}>
              <ExternalLink className="h-3 w-3" />
              {{ es: "Adquirir Sistema", en: "Get System", fr: "Obtenir le système", de: "System erwerben", it: "Acquista Sistema" }[lang]}
            </Link>
          </Button>
        </div>
      </div>

      {/* iframe */}
      <iframe
        ref={iframeRef}
        className={`flex-1 w-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        title={`Demo: ${name}`}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
