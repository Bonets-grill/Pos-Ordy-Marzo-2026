"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { createClient } from "@/lib/supabase-browser";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Loader2,
  Save,
  Trash2,
  RefreshCw,
  ShoppingCart,
  CalendarCheck,
  MessageSquare,
  Users,
  Phone,
  Bot,
  Settings2,
  QrCode,
  X,
} from "lucide-react";

interface WAInstanceData {
  id: string;
  provider: string;
  instance_name: string | null;
  phone_number: string | null;
  status: string;
  agent_name: string;
  agent_personality: string;
  agent_language: string;
  agent_instructions: string | null;
  welcome_message: string | null;
  away_message: string | null;
  max_items_per_order: number;
  allow_orders: boolean;
  allow_reservations: boolean;
}

interface SessionRow {
  id: string;
  phone: string;
  customer_name: string | null;
  state: string;
  last_message_at: string;
  cart: unknown[];
}

interface Stats {
  totalSessions: number;
  activeSessions: number;
  messagesToday: number;
  ordersViaWa: number;
}

export default function WhatsAppPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<WAInstanceData | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, activeSessions: 0, messagesToday: 0, ordersViaWa: 0 });
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [messages, setMessages] = useState<{id: string; role: string; content: string; created_at: string}[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Form state
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState("friendly");
  const [agentLang, setAgentLang] = useState("es");
  const [instructions, setInstructions] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [awayMsg, setAwayMsg] = useState("");
  const [allowOrders, setAllowOrders] = useState(true);
  const [allowReservations, setAllowReservations] = useState(true);
  const [maxItems, setMaxItems] = useState(20);

  const loadInstance = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/instance");
      const data = await res.json();
      if (data.instance) {
        const inst = data.instance as WAInstanceData;
        setInstance(inst);
        setQrCode(data.qrCode || null);
        // Populate form
        setAgentName(inst.agent_name);
        setPersonality(inst.agent_personality);
        setAgentLang(inst.agent_language);
        setInstructions(inst.agent_instructions || "");
        setWelcomeMsg(inst.welcome_message || "");
        setAwayMsg(inst.away_message || "");
        setAllowOrders(inst.allow_orders);
        setAllowReservations(inst.allow_reservations);
        setMaxItems(inst.max_items_per_order);
      } else {
        setInstance(null);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadStats = useCallback(async () => {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.user.id)
      .single();
    if (!profile?.tenant_id) return;
    const tenantId = profile.tenant_id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sessionsRes, msgsRes, ordersRes] = await Promise.all([
      supabase
        .from("wa_sessions")
        .select("id, phone, customer_name, state, last_message_at, cart")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false })
        .limit(20),
      supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", today.toISOString()),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("source", "whatsapp"),
    ]);

    const allSessions = (sessionsRes.data || []) as SessionRow[];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const active = allSessions.filter((s) => s.last_message_at > oneHourAgo);

    setSessions(allSessions);
    setStats({
      totalSessions: allSessions.length,
      activeSessions: active.length,
      messagesToday: msgsRes.count || 0,
      ordersViaWa: ordersRes.count || 0,
    });
  }, []);

  useEffect(() => {
    Promise.all([loadInstance(), loadStats()]).finally(() => setLoading(false));
  }, [loadInstance, loadStats]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/whatsapp/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "evolution" }),
      });
      if (res.ok) {
        await loadInstance();
        await loadStats();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/whatsapp/instance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agentName,
          agent_personality: personality,
          agent_language: agentLang,
          agent_instructions: instructions || null,
          welcome_message: welcomeMsg || null,
          away_message: awayMsg || null,
          allow_orders: allowOrders,
          allow_reservations: allowReservations,
          max_items_per_order: maxItems,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInstance(data.instance);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("wa.delete_confirm"))) return;
    setDeleting(true);
    try {
      await fetch("/api/whatsapp/instance", { method: "DELETE" });
      setInstance(null);
      setQrCode(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleReconnect = async () => {
    await loadInstance();
  };

  async function loadConversationMessages(sessionId: string) {
    setLoadingMessages(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("wa_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data || []) as {id: string; role: string; content: string; created_at: string}[]);
    setLoadingMessages(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  // ── No instance — Setup screen ──
  if (!instance) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <MessageCircle size={64} style={{ color: "var(--accent)", margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          {t("wa.title")}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
          {t("wa.no_instance")}
        </p>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: "14px 32px",
            backgroundColor: "#25D366",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: creating ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {creating ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
          {t("wa.setup")}
        </button>
      </div>
    );
  }

  // ── Instance exists — Dashboard ──
  const statusColor = instance.status === "connected" ? "#22c55e" : instance.status === "connecting" ? "#f59e0b" : "#ef4444";
  const statusLabel = instance.status === "connected" ? t("wa.connected") : instance.status === "connecting" ? t("wa.connecting") : t("wa.disconnected");
  const StatusIcon = instance.status === "connected" ? Wifi : instance.status === "connecting" ? Loader2 : WifiOff;

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={28} style={{ color: "#25D366" }} />
            {t("wa.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>{t("wa.subtitle")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusIcon size={16} style={{ color: statusColor }} className={instance.status === "connecting" ? "animate-spin" : ""} />
          <span style={{ color: statusColor, fontWeight: 600, fontSize: 14 }}>{statusLabel}</span>
          {instance.phone_number && (
            <span style={{ color: "var(--text-secondary)", fontSize: 13, marginLeft: 8 }}>
              <Phone size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              +{instance.phone_number}
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { icon: MessageSquare, label: t("wa.messages_today"), value: stats.messagesToday, color: "#3b82f6" },
          { icon: Users, label: t("wa.active_sessions"), value: stats.activeSessions, color: "#22c55e" },
          { icon: ShoppingCart, label: t("wa.orders_via_wa"), value: stats.ordersViaWa, color: "#f97316" },
          { icon: MessageCircle, label: t("wa.conversations"), value: stats.totalSessions, color: "#8b5cf6" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <stat.icon size={18} style={{ color: stat.color }} />
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left: QR + Config */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* QR Code section */}
          {instance.status !== "connected" && (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24,
                textAlign: "center",
              }}
            >
              <QrCode size={24} style={{ color: "var(--accent)", margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
                {t("wa.scan_qr")}
              </h3>
              {qrCode ? (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <img
                    src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="WhatsApp QR"
                    style={{ width: 240, height: 240, borderRadius: 8, backgroundColor: "#fff", padding: 8 }}
                  />
                </div>
              ) : (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
                  QR no disponible. Intenta reconectar.
                </p>
              )}
              <button
                onClick={handleReconnect}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RefreshCw size={14} />
                {t("wa.reconnect")}
              </button>
            </div>
          )}

          {/* Agent configuration */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Bot size={20} style={{ color: "var(--accent)" }} />
              {t("wa.agent_name")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Agent name */}
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  {t("wa.agent_name")}
                </label>
                <input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Personality */}
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  {t("wa.personality")}
                </label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                >
                  <option value="friendly">{t("wa.friendly")}</option>
                  <option value="professional">{t("wa.professional")}</option>
                  <option value="casual">{t("wa.casual")}</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  {t("wa.language")}
                </label>
                <select
                  value={agentLang}
                  onChange={(e) => setAgentLang(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                >
                  <option value="es">Espanol</option>
                  <option value="en">English</option>
                  <option value="fr">Francais</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                </select>
              </div>

              {/* Welcome message */}
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  {t("wa.welcome_msg")}
                </label>
                <textarea
                  value={welcomeMsg}
                  onChange={(e) => setWelcomeMsg(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Away message */}
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  {t("wa.away_msg")}
                </label>
                <textarea
                  value={awayMsg}
                  onChange={(e) => setAwayMsg(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Custom instructions */}
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
                  {t("wa.instructions")}
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder={t("wa.instructions_hint")}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Settings + Conversations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Toggles */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Settings2 size={20} style={{ color: "var(--accent)" }} />
              {t("wa.status")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Allow orders toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShoppingCart size={16} style={{ color: "var(--text-secondary)" }} />
                  <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{t("wa.allow_orders")}</span>
                </div>
                <button
                  onClick={() => setAllowOrders(!allowOrders)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: allowOrders ? "#22c55e" : "var(--bg-secondary)",
                    position: "relative",
                    transition: "background-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "#fff",
                      position: "absolute",
                      top: 3,
                      left: allowOrders ? 25 : 3,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>

              {/* Allow reservations toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarCheck size={16} style={{ color: "var(--text-secondary)" }} />
                  <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{t("wa.allow_reservations")}</span>
                </div>
                <button
                  onClick={() => setAllowReservations(!allowReservations)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: allowReservations ? "#22c55e" : "var(--bg-secondary)",
                    position: "relative",
                    transition: "background-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "#fff",
                      position: "absolute",
                      top: 3,
                      left: allowReservations ? 25 : 3,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>

              {/* Max items */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{t("wa.max_items")}</span>
                <input
                  type="number"
                  value={maxItems}
                  onChange={(e) => setMaxItems(parseInt(e.target.value) || 1)}
                  min={1}
                  max={50}
                  style={{
                    width: 70,
                    padding: "6px 10px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </div>

              {/* Provider info */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("wa.provider")}</span>
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                  {instance.provider === "evolution" ? "Evolution API" : "Meta Cloud API"}
                </span>
              </div>
            </div>
          </div>

          {/* Recent conversations */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              flex: 1,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <MessageSquare size={20} style={{ color: "var(--accent)" }} />
              {t("wa.recent_conversations")}
            </h3>

            {sessions.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: "32px 0" }}>
                {t("wa.no_conversations")}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sessions.slice(0, 10).map((s) => {
                  const ago = getTimeAgo(s.last_message_at);
                  const stateColor = s.state === "ordering" ? "#f97316" : s.state === "browsing_menu" ? "#3b82f6" : "var(--text-secondary)";
                  return (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedSession(s); loadConversationMessages(s.id); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 8px",
                        borderRadius: 8,
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "#25D36620",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Phone size={16} style={{ color: "#25D366" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                            {s.customer_name || `+${s.phone}`}
                          </div>
                          <div style={{ fontSize: 12, color: stateColor }}>{s.state}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{ago}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: "12px 20px",
                backgroundColor: saved ? "#22c55e" : "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background-color 0.2s",
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saved ? t("wa.saved") : t("wa.save")}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "12px 20px",
                backgroundColor: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: deleting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {t("wa.delete")}
            </button>
          </div>
        </div>
      </div>

      {/* Conversation Detail Modal */}
      {selectedSession && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setSelectedSession(null)} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative", width: "min(450px, 90vw)", height: "100vh",
            backgroundColor: "var(--bg-primary)", borderLeft: "1px solid var(--border)",
            display: "flex", flexDirection: "column", zIndex: 201,
          }}>
            {/* Header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {selectedSession.customer_name || `+${selectedSession.phone}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {selectedSession.state} {selectedSession.cart?.length > 0 ? `· ${selectedSession.cart.length} items en carrito` : ""}
                </div>
              </div>
              <button onClick={() => setSelectedSession(null)} style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4,
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingMessages ? (
                <div style={{ textAlign: "center", padding: 32 }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>Sin mensajes</p>
              ) : (
                messages.filter(m => m.role === "user" || m.role === "assistant").map((m) => (
                  <div key={m.id} style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                  }}>
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      backgroundColor: m.role === "user" ? "#25D36630" : "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}>
                      {m.content}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 2,
                      textAlign: m.role === "user" ? "right" : "left",
                      paddingLeft: 4, paddingRight: 4,
                    }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
