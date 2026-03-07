import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { renderSystemHtml } from "@/lib/templates/engine";
import { Button } from "@/components/ui/button";
import { TEMPLATE_LANGS, type TemplateLang } from "@/lib/templates/i18n";
import { getAgentConfig, type RealDashboardData } from "@/lib/agents/configs";
import { getAgentById } from "@/lib/agents/catalog";
import type { I18nString } from "@/lib/templates/types";
import { AgentChat } from "@/components/chat/AgentChat";
import type { ChatActivity } from "@/components/chat/AgentChat";
import { translate } from "@/i18n/index";
import type { Lang } from "@/lib/constants";
import { supabase } from "@/core/supabase/client";

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

  const [realData, setRealData] = useState<RealDashboardData | undefined>(undefined);
  const catalogAgent = agentId ? getAgentById(agentId) : null;
  const config = agentId ? getAgentConfig(agentId, realData) : null;
  const name = config ? resolveStr(config.name, lang) : "";
  const t = (key: string, params?: Record<string, string | number>) => translate(lang as Lang, key, params);

  // Fetch real bookings data
  useEffect(() => {
    if (!agentId) return;
    async function fetchReal() {
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);

      const [todayRes, weekRes, recentRes] = await Promise.all([
        supabase.from("bookings").select("status").eq("agent_id", agentId!).eq("booking_date", today),
        supabase.from("bookings").select("status").eq("agent_id", agentId!).gte("booking_date", weekStartStr).lte("booking_date", weekEndStr),
        supabase.from("bookings").select("client_name, service, channel, status, time_start, booking_date").eq("agent_id", agentId!).order("created_at", { ascending: false }).limit(15),
      ]);

      const todayBookings = todayRes.data ?? [];
      const weekBookings = weekRes.data ?? [];
      const recent = recentRes.data ?? [];

      setRealData({
        todayBookings: todayBookings.length,
        weekBookings: weekBookings.length,
        confirmedToday: todayBookings.filter(b => b.status === "confirmed").length,
        noShowsToday: todayBookings.filter(b => b.status === "no_show").length,
        activityRows: recent.map(b => ({
          event: `${b.client_name} — ${b.service} (${b.booking_date} ${(b.time_start || "").slice(0, 5)})`,
          channel: b.channel === "whatsapp" ? "WhatsApp" : "Web",
          result: b.status === "confirmed" ? "Confirmada" : b.status === "cancelled" ? "Cancelada" : b.status === "no_show" ? "No asistio" : "Completada",
          time: (b.time_start || "").slice(0, 5),
        })),
      });
    }
    fetchReal();
  }, [agentId]);

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

  // Activity injection into iframe — only inject meaningful events (not every message)
  const handleActivity = useCallback((activity: ChatActivity) => {
    if (!iframeRef.current?.contentWindow) return;
    // Only inject completions, not "active conversation" noise
    if (activity.result === "En Progreso") return;
    iframeRef.current.contentWindow.postMessage({
      type: "newActivity",
      activity,
    }, "*");
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{t("demo.agentNotFound")}</h1>
          <p className="text-muted-foreground">{t("demo.agentNotFoundDesc", { agentId: agentId || "" })}</p>
          <Button asChild>
            <Link to="/agents">{t("demo.backToAgents")}</Link>
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
            <span className="text-xs text-gray-500">{"\u2014"} {t("demo.agentDemoLabel")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("demo.trialFree")}
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-jade-600 hover:bg-jade-700 text-white text-xs h-8"
            asChild
          >
            <Link to={`/checkout/agent/${agentId}`}>
              <ExternalLink className="h-3 w-3" />
              {t("demo.activateAgent")}
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

      {/* Live AI Chat with QR inside */}
      {catalogAgent && (
        <AgentChat
          agentId={catalogAgent.id}
          agentName={name}
          brandColor={catalogAgent.brandColor}
          greeting={getAgentGreeting(catalogAgent.id, lang)}
          lang={lang}
          onActivity={handleActivity}
        />
      )}
    </div>
  );
}

function getAgentGreeting(agentId: string, lang: string): string {
  const key = `greeting.${agentId}`;
  const result = translate(lang as Lang, key);
  // If translate returns the key itself, it means no specific greeting exists — use default
  if (result === key) {
    return translate(lang as Lang, "greeting.default");
  }
  return result;
}
