import { Link } from "react-router-dom";
import { ArrowLeft, Search, Bot, Crown, Sparkles, Wrench } from "lucide-react";
import { useState } from "react";
import { AGENT_CATALOG } from "@/lib/agents/catalog";
import { TEMPLATE_LANGS, type TemplateLang } from "@/lib/templates/i18n";
import type { I18nString } from "@/lib/templates/types";

function getInitialLang(): TemplateLang {
  const stored = localStorage.getItem("layra_lang") as TemplateLang | null;
  if (stored && TEMPLATE_LANGS.includes(stored)) return stored;
  const browser = navigator.language.split("-")[0] as TemplateLang;
  if (TEMPLATE_LANGS.includes(browser)) return browser;
  return "es";
}

function r(s: I18nString | undefined, lang: TemplateLang): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  return s[lang] || s.es || s.en || "";
}

const labels = {
  es: { title: "Agentes IA", subtitle: "Elige tu agente de inteligencia artificial. 14 días de prueba gratis.", search: "Buscar agentes...", all: "Todos", premium: "Premium", basic: "Básicos", custom: "Custom", trial: "14 días gratis", month: "/mes", viewDemo: "Ver Demo", back: "Volver", agents: "agentes" },
  en: { title: "AI Agents", subtitle: "Choose your AI agent. 14-day free trial.", search: "Search agents...", all: "All", premium: "Premium", basic: "Basic", custom: "Custom", trial: "14 days free", month: "/mo", viewDemo: "View Demo", back: "Back", agents: "agents" },
  fr: { title: "Agents IA", subtitle: "Choisissez votre agent IA. 14 jours d'essai gratuit.", search: "Rechercher agents...", all: "Tous", premium: "Premium", basic: "Basiques", custom: "Personnalisé", trial: "14 jours gratuits", month: "/mois", viewDemo: "Voir Démo", back: "Retour", agents: "agents" },
  de: { title: "KI-Agenten", subtitle: "Wählen Sie Ihren KI-Agenten. 14 Tage kostenlos testen.", search: "Agenten suchen...", all: "Alle", premium: "Premium", basic: "Basis", custom: "Individuell", trial: "14 Tage kostenlos", month: "/Mon.", viewDemo: "Demo Ansehen", back: "Zurück", agents: "Agenten" },
  it: { title: "Agenti IA", subtitle: "Scegli il tuo agente IA. 14 giorni di prova gratuita.", search: "Cerca agenti...", all: "Tutti", premium: "Premium", basic: "Base", custom: "Personalizzato", trial: "14 giorni gratis", month: "/mese", viewDemo: "Vedi Demo", back: "Indietro", agents: "agenti" },
};

export function AgentsCatalog() {
  const [lang] = useState<TemplateLang>(getInitialLang);
  const [filter, setFilter] = useState<"all" | "premium" | "basic" | "custom">("all");
  const [search, setSearch] = useState("");
  const t = labels[lang];

  const filtered = AGENT_CATALOG.filter((a) => {
    if (filter !== "all" && a.category !== filter) return false;
    if (search) {
      const name = r(a.name, lang).toLowerCase();
      const desc = r(a.description, lang).toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || desc.includes(q) || a.tags.some((t) => t.includes(q));
    }
    return true;
  });

  const premiumCount = AGENT_CATALOG.filter((a) => a.category === "premium").length;
  const basicCount = AGENT_CATALOG.filter((a) => a.category === "basic").length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t.back}</span>
            </Link>
            <div className="h-5 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#00e5b8]" />
              <span className="font-semibold">{t.title}</span>
              <span className="text-xs text-gray-500">({AGENT_CATALOG.length} {t.agents})</span>
            </div>
          </div>
          <Link to="/" className="text-sm font-medium text-[#00e5b8] hover:underline">
            Layra
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[#00e5b8] to-cyan-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00e5b8] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "premium", "basic", "custom"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filter === f
                    ? "bg-[#00e5b8] text-gray-900"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {f === "premium" && <Crown className="h-3.5 w-3.5" />}
                {f === "basic" && <Wrench className="h-3.5 w-3.5" />}
                {f === "custom" && <Sparkles className="h-3.5 w-3.5" />}
                {t[f]}
                {f === "all" && <span className="text-xs opacity-70">({AGENT_CATALOG.length})</span>}
                {f === "premium" && <span className="text-xs opacity-70">({premiumCount})</span>}
                {f === "basic" && <span className="text-xs opacity-70">({basicCount})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((agent) => (
            <Link
              key={agent.id}
              to={`/demo/agent/${agent.id}`}
              className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ background: agent.brandColor }}
                >
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  {agent.category === "premium" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PREMIUM
                    </span>
                  )}
                  {agent.category === "custom" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00e5b8]/20 text-[#00e5b8] border border-[#00e5b8]/30">
                      CUSTOM
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-sm text-white mb-1.5 group-hover:text-[#00e5b8] transition-colors">
                {r(agent.name, lang)}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">
                {r(agent.description, lang)}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div>
                  <span className="text-lg font-bold text-white">
                    {"\u20AC"}{agent.priceMonthly}
                  </span>
                  <span className="text-xs text-gray-500">{t.month}</span>
                </div>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                  {t.trial}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No agents found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
