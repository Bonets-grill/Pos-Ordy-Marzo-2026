import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  agentId: string;
  agentName: string;
  brandColor: string;
  greeting: string;
  lang: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Classic WhatsApp doodle wallpaper pattern (the timeless beige one) ──
const WA_DOODLE_WALLPAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3Cstyle%3E.d%7Bfill:%23c9c1b6;opacity:0.45%7D%3C/style%3E%3C/defs%3E%3Crect fill='%23E5DDD5' width='400' height='400'/%3E%3C!-- clocks --%3E%3Ccircle class='d' cx='30' cy='25' r='8'/%3E%3Cline x1='30' y1='25' x2='30' y2='19' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3Cline x1='30' y1='25' x2='34' y2='25' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3Ccircle class='d' cx='320' cy='175' r='8'/%3E%3Cline x1='320' y1='175' x2='320' y2='169' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3Cline x1='320' y1='175' x2='324' y2='175' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3C!-- phones --%3E%3Crect class='d' x='100' y='15' width='12' height='20' rx='2'/%3E%3Crect class='d' x='220' y='300' width='12' height='20' rx='2'/%3E%3C!-- message bubbles --%3E%3Cpath class='d' d='M170 25c0-4 3-7 7-7h18c4 0 7 3 7 7v10c0 4-3 7-7 7h-14l-6 5v-5h-1c-2 0-4-3-4-7v-10z'/%3E%3Cpath class='d' d='M50 170c0-4 3-7 7-7h18c4 0 7 3 7 7v10c0 4-3 7-7 7h-14l-6 5v-5h-1c-2 0-4-3-4-7v-10z'/%3E%3Cpath class='d' d='M280 80c0-4 3-7 7-7h18c4 0 7 3 7 7v10c0 4-3 7-7 7h-14l-6 5v-5h-1c-2 0-4-3-4-7v-10z'/%3E%3C!-- hearts --%3E%3Cpath class='d' d='M250 30c1.5-3 5-4 7-2s2 5 0 8l-7 6-7-6c-2-3-2-6 0-8s5.5-1 7 2z'/%3E%3Cpath class='d' d='M130 280c1.5-3 5-4 7-2s2 5 0 8l-7 6-7-6c-2-3-2-6 0-8s5.5-1 7 2z'/%3E%3C!-- stars --%3E%3Cpath class='d' d='M60 80l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'/%3E%3Cpath class='d' d='M350 260l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'/%3E%3Cpath class='d' d='M190 140l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'/%3E%3C!-- musical notes --%3E%3Ccircle class='d' cx='150' cy='100' r='4'/%3E%3Cline x1='154' y1='100' x2='154' y2='85' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3Ccircle class='d' cx='360' cy='45' r='4'/%3E%3Cline x1='364' y1='45' x2='364' y2='30' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3C!-- camera icons --%3E%3Crect class='d' x='80' y='210' width='18' height='14' rx='2'/%3E%3Ccircle class='d' cx='89' cy='217' r='4'/%3E%3Crect class='d' x='310' y='100' width='18' height='14' rx='2'/%3E%3Ccircle class='d' cx='319' cy='107' r='4'/%3E%3C!-- smiley faces --%3E%3Ccircle class='d' cx='200' cy='220' r='9'/%3E%3Ccircle class='d' cx='40' cy='310' r='9'/%3E%3Ccircle class='d' cx='370' cy='350' r='9'/%3E%3C!-- paper plane --%3E%3Cpath class='d' d='M270 240l-15 5 5-12z'/%3E%3Cpath class='d' d='M120 360l-15 5 5-12z'/%3E%3C!-- lock icons --%3E%3Crect class='d' x='20' y='135' width='10' height='8' rx='1'/%3E%3Cpath d='M22 135v-3a3 3 0 016 0v3' fill='none' stroke='%23c9c1b6' stroke-width='1.3' opacity='0.45'/%3E%3C!-- thumbs up --%3E%3Ccircle class='d' cx='300' cy='320' r='6'/%3E%3Crect class='d' x='297' y='326' width='6' height='5' rx='1'/%3E%3C!-- wifi / signal --%3E%3Cpath class='d' d='M170 340a12 12 0 0120 0' fill='none' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3Cpath class='d' d='M174 345a7 7 0 0112 0' fill='none' stroke='%23c9c1b6' stroke-width='1.5' opacity='0.45'/%3E%3Ccircle class='d' cx='180' cy='350' r='2'/%3E%3C!-- extra scatter --%3E%3Ccircle class='d' cx='240' cy='140' r='3'/%3E%3Ccircle class='d' cx='90' cy='340' r='3'/%3E%3Ccircle class='d' cx='350' cy='140' r='2'/%3E%3Ccircle class='d' cx='140' cy='200' r='2'/%3E%3Crect class='d' x='260' y='370' width='14' height='10' rx='2'/%3E%3Crect class='d' x='20' y='240' width='14' height='10' rx='2'/%3E%3Cpath class='d' d='M330 50h12v3h-12z'/%3E%3Cpath class='d' d='M330 55h8v3h-8z'/%3E%3C/svg%3E")`;

// ── WhatsApp floating button icon ──
function WaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── WhatsApp 2025 exact SVG icons ──

function DoubleCheck() {
  return (
    <svg viewBox="0 0 16 11" width="16" height="11" fill="#53bdeb">
      <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 00-.659.003.46.46 0 00-.003.653l2.378 2.479a.478.478 0 00.347.149.47.47 0 00.35-.161l6.542-8.067a.46.46 0 00-.069-.673z" />
      <path d="M14.757.653a.457.457 0 00-.305-.102.493.493 0 00-.38.178l-6.19 7.636-1.165-1.214-.86 1.06 1.69 1.762a.478.478 0 00.347.149.47.47 0 00.35-.161l6.543-8.067a.46.46 0 00-.07-.673z" />
    </svg>
  );
}

// Video call icon (header)
function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#aebac1">
      <path d="M16.4 4H3.6A1.6 1.6 0 002 5.6v10.8A1.6 1.6 0 003.6 18h12.8a1.6 1.6 0 001.6-1.6v-3.36l4 3.36V5.6l-4 3.36V5.6A1.6 1.6 0 0016.4 4z" />
    </svg>
  );
}

// Phone call icon (header)
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#aebac1">
      <path d="M19.077 14.89l-2.786-1.357a1.25 1.25 0 00-1.477.293l-1.076 1.182a.64.64 0 01-.758.128c-1.423-.7-3.3-2.399-4.124-3.74a.64.64 0 01.072-.773l1.095-1.175a1.25 1.25 0 00.176-1.49L8.67 5.3a1.25 1.25 0 00-1.643-.513l-1.345.656A2.68 2.68 0 004.3 7.7c-.184 2.497 1.086 5.606 3.475 8.03 2.39 2.425 5.462 3.752 7.96 3.63a2.68 2.68 0 002.295-1.34l.69-1.324a1.25 1.25 0 00-.644-1.806z" />
    </svg>
  );
}

// Back arrow
function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
      <path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z" />
    </svg>
  );
}

// Plus icon (WhatsApp 2025 bottom left)
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="#8696a0">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

// Smiley/sticker icon (inside input)
function SmileyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#8696a0">
      <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.694 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1.108-4.137c2.403.55 3.94-.023 4.567-1.237a.403.403 0 00-.36-.58H8.9a.403.403 0 00-.36.58c.627 1.214 2.164 1.787 4.567 1.237h-2.215z" />
    </svg>
  );
}

// Camera icon (bottom bar)
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#8696a0">
      <path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z" />
      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
    </svg>
  );
}

// Mic icon
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#8696a0">
      <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.238 6.002s-6.238-2.471-6.238-6.002H4.761c0 3.884 3.06 7.12 6.852 7.591v3.178h.774v-3.178c3.791-.471 6.852-3.708 6.852-7.591h-1.002z" />
    </svg>
  );
}

// Send icon
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
      <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
    </svg>
  );
}

export function AgentChat({ agentId, agentName, brandColor, greeting, lang }: AgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`demo_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0 && greeting) {
      setMessages([{ id: "greeting", role: "assistant", content: greeting, timestamp: new Date() }]);
    }
  }, [isOpen, greeting, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", content: text, timestamp: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, sessionId, message: text, lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { id: `a_${Date.now()}`, role: "assistant", content: data.response || "...", timestamp: new Date() }]);
    } catch {
      const err: Record<string, string> = { es: "Error de conexion. Intenta de nuevo.", en: "Connection error. Try again." };
      setMessages((prev) => [...prev, { id: `e_${Date.now()}`, role: "assistant", content: err[lang] || err.en, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, agentId, sessionId, lang]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const placeholders: Record<string, string> = {
    es: "Mensaje", en: "Message", fr: "Message",
    de: "Nachricht", it: "Messaggio",
  };

  // ── WhatsApp floating button ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 h-[60px] w-[60px] rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: "#25D366", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
      >
        <WaIcon className="h-[34px] w-[34px]" />
      </button>
    );
  }

  // ── Full WhatsApp 2025 chat (light mode, classic wallpaper) ──
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden"
      style={{
        width: 400,
        maxWidth: "calc(100vw - 2rem)",
        height: 600,
        maxHeight: "calc(100vh - 5rem)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {/* ── Header: WhatsApp teal #008069 ── */}
      <div
        className="flex items-center gap-2 px-2 shrink-0"
        style={{ background: "#008069", height: 56 }}
      >
        {/* Back arrow */}
        <button onClick={() => setIsOpen(false)} className="p-1 -ml-0.5 flex items-center">
          <BackArrow />
        </button>

        {/* Profile pic */}
        <div
          className="h-[38px] w-[38px] rounded-full flex items-center justify-center text-white font-semibold text-[15px] shrink-0"
          style={{ background: brandColor }}
        >
          {agentName.charAt(0).toUpperCase()}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0 ml-1">
          <div className="flex items-center gap-1">
            <span className="text-[16.5px] font-medium text-white truncate leading-tight">
              {agentName}
            </span>
            {/* Verified badge */}
            <svg viewBox="0 0 18 18" width="16" height="16" className="shrink-0">
              <circle cx="9" cy="9" r="9" fill="#00a884" />
              <path d="M7.5 12.3L4.2 9l1.05-1.05L7.5 10.2l5.25-5.25L13.8 6l-6.3 6.3z" fill="white" />
            </svg>
          </div>
          <div className="text-[13px] text-[#b3d9d2] leading-tight">
            {
              { es: "en linea", en: "online", fr: "en ligne", de: "online", it: "online" }[lang] || "online"
            }
          </div>
        </div>

        {/* Video call + Phone call icons (like real WhatsApp 2025) */}
        <div className="flex items-center gap-3 ml-auto">
          <button className="p-1"><VideoIcon /></button>
          <button className="p-1"><PhoneIcon /></button>
        </div>
      </div>

      {/* ── Chat body: classic WhatsApp doodle wallpaper ── */}
      <div
        className="flex-1 overflow-y-auto px-[5%] py-1"
        style={{
          backgroundImage: WA_DOODLE_WALLPAPER,
          backgroundRepeat: "repeat",
          backgroundSize: "400px 400px",
        }}
      >
        {/* E2E encryption notice */}
        <div className="flex justify-center my-3">
          <span
            className="text-[11.5px] px-3 py-[5px] rounded-[6px] text-center leading-[15px]"
            style={{ background: "#fdf4c5", color: "#54656f" }}
          >
            {
              {
                es: "Los mensajes estan cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos.",
                en: "Messages are end-to-end encrypted. No one outside of this chat can read them.",
                fr: "Les messages sont chiffres de bout en bout.",
                de: "Nachrichten sind Ende-zu-Ende-verschlusselt.",
                it: "I messaggi sono crittografati end-to-end.",
              }[lang] || "Messages are end-to-end encrypted."
            }
          </span>
        </div>

        {/* Date pill */}
        <div className="flex justify-center mb-2">
          <span
            className="text-[12px] px-3 py-[5px] rounded-[7px] font-medium"
            style={{ background: "rgba(255,255,255,0.9)", color: "#54656f", boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)" }}
          >
            {new Date().toLocaleDateString(
              lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : lang === "it" ? "it-IT" : "en-US",
              { day: "numeric", month: "long", year: "numeric" }
            ).toUpperCase()}
          </span>
        </div>

        {/* Messages */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex mb-[3px] ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className="relative max-w-[80%] px-[9px] pt-[6px] pb-[8px]"
                style={{
                  background: isUser ? "#D9FDD3" : "#FFFFFF",
                  borderRadius: isUser
                    ? "7.5px 0px 7.5px 7.5px"
                    : "0px 7.5px 7.5px 7.5px",
                  boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
                }}
              >
                {/* Message tail (triangle) */}
                <div
                  className="absolute top-0"
                  style={{
                    [isUser ? "right" : "left"]: -8,
                    width: 0,
                    height: 0,
                    borderTop: `8px solid ${isUser ? "#D9FDD3" : "#FFFFFF"}`,
                    borderRight: isUser ? "none" : "8px solid transparent",
                    borderLeft: isUser ? "8px solid transparent" : "none",
                  }}
                />
                <div
                  className="whitespace-pre-wrap break-words"
                  style={{ fontSize: "14.2px", lineHeight: "19px", color: "#111b21" }}
                >
                  {msg.content}
                  {/* Inline timestamp + checkmarks */}
                  <span className="inline-flex items-center gap-[3px] ml-2 align-bottom float-right mt-[4px]">
                    <span style={{ fontSize: "11px", color: "#667781", lineHeight: 1 }}>
                      {formatTime(msg.timestamp)}
                    </span>
                    {isUser && <DoubleCheck />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start mb-[3px]">
            <div
              className="relative px-3 py-[10px]"
              style={{
                background: "#FFFFFF",
                borderRadius: "0 7.5px 7.5px 7.5px",
                boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
              }}
            >
              <div
                className="absolute top-0 left-[-8px]"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "8px solid #FFFFFF",
                  borderRight: "8px solid transparent",
                }}
              />
              <div className="flex gap-[5px] items-center h-[14px]">
                <span className="block h-[7px] w-[7px] rounded-full animate-bounce" style={{ background: "#8696a0", animationDelay: "0ms", animationDuration: "600ms" }} />
                <span className="block h-[7px] w-[7px] rounded-full animate-bounce" style={{ background: "#8696a0", animationDelay: "200ms", animationDuration: "600ms" }} />
                <span className="block h-[7px] w-[7px] rounded-full animate-bounce" style={{ background: "#8696a0", animationDelay: "400ms", animationDuration: "600ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Bottom input bar: exact WhatsApp 2025 layout ── */}
      {/* Layout: [+] [input with smiley] [camera] [mic/send] */}
      <div
        className="flex items-end gap-[6px] px-[8px] py-[6px] shrink-0"
        style={{ background: "#F0F2F5" }}
      >
        {/* Plus button */}
        <button className="h-[42px] w-[42px] flex items-center justify-center shrink-0">
          <PlusIcon />
        </button>

        {/* Text input with smiley inside right side */}
        <div
          className="flex items-center flex-1 rounded-[21px] px-2 min-h-[42px]"
          style={{ background: "#FFFFFF" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[lang] || placeholders.en}
            disabled={loading}
            className="flex-1 py-[9px] px-1.5 text-[15px] bg-transparent outline-none disabled:opacity-50"
            style={{ color: "#111b21", caretColor: "#00a884" }}
          />
          <button className="p-1 shrink-0"><SmileyIcon /></button>
        </div>

        {/* Camera */}
        {!input.trim() && (
          <button className="h-[42px] w-[42px] flex items-center justify-center shrink-0">
            <CameraIcon />
          </button>
        )}

        {/* Send or Mic */}
        <button
          onClick={input.trim() ? sendMessage : undefined}
          className="h-[42px] w-[42px] rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: input.trim() ? "#00a884" : "transparent" }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#8696a0" }} />
          ) : input.trim() ? (
            <SendIcon />
          ) : (
            <MicIcon />
          )}
        </button>
      </div>
    </div>
  );
}
