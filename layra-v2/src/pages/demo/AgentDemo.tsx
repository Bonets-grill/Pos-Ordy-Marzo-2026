import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { renderSystemHtml } from "@/lib/templates/engine";
import { Button } from "@/components/ui/button";
import { TEMPLATE_LANGS, type TemplateLang } from "@/lib/templates/i18n";
import { getAgentConfig } from "@/lib/agents/configs";
import { getAgentById } from "@/lib/agents/catalog";
import type { I18nString } from "@/lib/templates/types";
import { AgentChat } from "@/components/chat/AgentChat";

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

export function AgentDemo() {
  const { agentId } = useParams<{ agentId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<TemplateLang>(getInitialLang);

  const config = agentId ? getAgentConfig(agentId) : null;
  const catalogAgent = agentId ? getAgentById(agentId) : null;
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
    es: { title: "Agente no encontrado", desc: `El agente "${agentId}" no tiene una demo disponible.`, back: "Volver a agentes" },
    en: { title: "Agent not found", desc: `The agent "${agentId}" has no demo available.`, back: "Back to agents" },
    fr: { title: "Agent introuvable", desc: `L'agent "${agentId}" n'a pas de demo disponible.`, back: "Retour aux agents" },
    de: { title: "Agent nicht gefunden", desc: `Der Agent "${agentId}" hat keine Demo verfügbar.`, back: "Zurück zu Agenten" },
    it: { title: "Agente non trovato", desc: `L'agente "${agentId}" non ha una demo disponibile.`, back: "Torna agli agenti" },
  };

  if (!config) {
    const nf = notFoundLabels[lang];
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{nf.title}</h1>
          <p className="text-muted-foreground">{nf.desc}</p>
          <Button asChild>
            <Link to="/agents">{nf.back}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/agents"
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
              AI
            </div>
            <span className="text-sm font-medium text-white">{name}</span>
            <span className="text-xs text-gray-500">— {{ es: "Demo Agente IA", en: "AI Agent Demo", fr: "Demo Agent IA", de: "KI-Agent Demo", it: "Demo Agente IA" }[lang]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              {{ es: "14 días gratis", en: "14 days free", fr: "14 jours gratuits", de: "14 Tage kostenlos", it: "14 giorni gratis" }[lang]}
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-jade-600 hover:bg-jade-700 text-white text-xs h-8"
            asChild
          >
            <Link to={`/checkout/agent/${agentId}`}>
              <ExternalLink className="h-3 w-3" />
              {{ es: "Activar Agente", en: "Activate Agent", fr: "Activer l'Agent", de: "Agent Aktivieren", it: "Attiva Agente" }[lang]}
            </Link>
          </Button>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        className={`flex-1 w-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        title={`Demo: ${name}`}
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Live AI Chat */}
      {catalogAgent && (
        <AgentChat
          agentId={catalogAgent.id}
          agentName={name}
          brandColor={catalogAgent.brandColor}
          greeting={getAgentGreeting(catalogAgent.id, lang)}
          lang={lang}
        />
      )}
    </div>
  );
}

function getAgentGreeting(agentId: string, lang: string): string {
  const greetings: Record<string, Record<string, string>> = {
    barber_shop: {
      es: "Hola! Bienvenido a la barberia. Puedo ayudarte a agendar una cita, consultar precios o ver horarios disponibles. En que te puedo ayudar?",
      en: "Hey! Welcome to the barber shop. I can help you book an appointment, check prices, or see available times. What can I do for you?",
    },
    hair_salon: {
      es: "Hola! Bienvenida al salon. Estoy aqui para ayudarte con tu proxima cita o recomendarte tratamientos. Que necesitas?",
      en: "Hi! Welcome to the salon. I'm here to help with your next appointment or recommend treatments. What do you need?",
    },
    restaurant_agent: {
      es: "Hola! Bienvenido a nuestro restaurante. Puedo ayudarte con una reserva, mostrarte el menu o tomar tu pedido. Que te apetece?",
      en: "Hi! Welcome to our restaurant. I can help with a reservation, show you our menu, or take your order. What would you like?",
    },
    dentist_agent: {
      es: "Hola! Bienvenido a la clinica dental. Puedo ayudarte a agendar una cita o resolver dudas sobre tratamientos. Como te puedo ayudar?",
      en: "Hi! Welcome to the dental clinic. I can help you schedule an appointment or answer questions. How can I help?",
    },
    auto_mechanic: {
      es: "Hola! Bienvenido al taller. Cuentame que problema tiene tu vehiculo o si necesitas agendar un servicio.",
      en: "Hi! Welcome to the shop. Tell me what's going on with your vehicle or if you need to schedule a service.",
    },
  };

  const agentGreetings = greetings[agentId];
  if (agentGreetings) return agentGreetings[lang] || agentGreetings.es || agentGreetings.en || "";

  // Default greeting
  const defaults: Record<string, string> = {
    es: "Hola! Soy el asistente virtual. En que puedo ayudarte hoy?",
    en: "Hi! I'm the virtual assistant. How can I help you today?",
    fr: "Bonjour! Je suis l'assistant virtuel. Comment puis-je vous aider?",
    de: "Hallo! Ich bin der virtuelle Assistent. Wie kann ich Ihnen helfen?",
    it: "Ciao! Sono l'assistente virtuale. Come posso aiutarti?",
  };
  return defaults[lang] || defaults.es;
}
