"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────── */

type Tab = "dashboard" | "settings" | "customers" | "rewards" | "tiers" | "campaigns";

interface LoyaltySettings {
  id?: string;
  tenant_id: string;
  enabled: boolean;
  points_per_euro: number;
  min_order_amount: number;
  welcome_bonus: number;
  birthday_bonus: number;
  auto_enroll: boolean;
  allow_pos: boolean;
  allow_qr: boolean;
  allow_takeaway: boolean;
}

interface LoyaltyCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  current_points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  visits_count: number;
  total_spent: number;
  loyalty_tiers: { name: string; color: string } | null;
  last_visit_at: string | null;
}

interface LedgerEntry {
  id: string;
  customer_id: string;
  movement_type: string;
  points_delta: number;
  description: string | null;
  created_at: string;
  customer_name?: string;
}

const defaultSettings: Omit<LoyaltySettings, "tenant_id"> = {
  enabled: false,
  points_per_euro: 1,
  min_order_amount: 0,
  welcome_bonus: 0,
  birthday_bonus: 0,
  auto_enroll: true,
  allow_pos: true,
  allow_qr: true,
  allow_takeaway: false,
};

/* ── Shared styles ────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.6rem 0.75rem",
  color: "var(--text-primary)",
  fontSize: "0.9rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
};

const btnPrimary: React.CSSProperties = {
  background: "var(--accent)",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
};

/* ── Component ────────────────────────────────────────── */

export default function LoyaltyPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dashboard data
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [pointsIssued, setPointsIssued] = useState(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState(0);
  const [topCustomers, setTopCustomers] = useState<LoyaltyCustomer[]>([]);
  const [recentActivity, setRecentActivity] = useState<LedgerEntry[]>([]);

  // Settings
  const [settings, setSettings] = useState<Omit<LoyaltySettings, "tenant_id">>(defaultSettings);

  /* ── Init ───────────────────────────────────────────── */

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
    }
    init();
  }, []);

  /* ── Load dashboard data ────────────────────────────── */

  const loadDashboard = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [customersRes, ledgerTodayRes, ledgerEarnRes, ledgerRedeemRes, topRes, recentRes] = await Promise.all([
      supabase
        .from("loyalty_customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabase
        .from("loyalty_points_ledger")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("loyalty_points_ledger")
        .select("points_delta")
        .eq("tenant_id", tenantId)
        .eq("movement_type", "earn"),
      supabase
        .from("loyalty_points_ledger")
        .select("points_delta")
        .eq("tenant_id", tenantId)
        .eq("movement_type", "redeem"),
      supabase
        .from("loyalty_customers")
        .select("id, full_name, phone, current_points_balance, total_points_earned, total_points_redeemed, visits_count, total_spent, last_visit_at, loyalty_tiers(name, color)")
        .eq("tenant_id", tenantId)
        .order("current_points_balance", { ascending: false })
        .limit(10),
      supabase
        .from("loyalty_points_ledger")
        .select("id, customer_id, movement_type, points_delta, description, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setTotalMembers(customersRes.count || 0);
    setActiveToday(ledgerTodayRes.count || 0);
    setPointsIssued(
      (ledgerEarnRes.data || []).reduce((sum, r) => sum + (r.points_delta || 0), 0)
    );
    setRewardsRedeemed(
      (ledgerRedeemRes.data || []).reduce((sum, r) => sum + Math.abs(r.points_delta || 0), 0)
    );
    if (topRes.data) setTopCustomers(topRes.data as unknown as LoyaltyCustomer[]);
    if (recentRes.data) setRecentActivity(recentRes.data as unknown as LedgerEntry[]);
  }, [tenantId]);

  /* ── Load settings ──────────────────────────────────── */

  const loadSettings = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("loyalty_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();
    if (data) {
      setSettings({
        id: data.id,
        enabled: data.enabled ?? false,
        points_per_euro: data.points_per_euro ?? 1,
        min_order_amount: data.min_order_amount ?? 0,
        welcome_bonus: data.welcome_bonus ?? 0,
        birthday_bonus: data.birthday_bonus ?? 0,
        auto_enroll: data.auto_enroll ?? true,
        allow_pos: data.allow_pos ?? true,
        allow_qr: data.allow_qr ?? true,
        allow_takeaway: data.allow_takeaway ?? false,
      });
    }
  }, [tenantId]);

  /* ── Load on tenant change ──────────────────────────── */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!tenantId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([loadDashboard(), loadSettings()]).finally(() => setLoading(false));
  }, [tenantId, loadDashboard, loadSettings]);

  /* ── Save settings ──────────────────────────────────── */

  const saveSettings = async () => {
    if (!tenantId) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...settings, tenant_id: tenantId };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...upsertPayload } = payload as LoyaltySettings & { id?: string };

    if (settings.id) {
      await supabase.from("loyalty_settings").update(upsertPayload).eq("id", settings.id);
    } else {
      await supabase.from("loyalty_settings").upsert(upsertPayload, { onConflict: "tenant_id" });
    }
    setSaving(false);
    await loadSettings();
  };

  /* ── Movement type labels ───────────────────────────── */

  const movementLabel = (type: string) => {
    const map: Record<string, string> = {
      earn: t("loyalty.movement_earn"),
      redeem: t("loyalty.movement_redeem"),
      bonus: t("loyalty.movement_bonus"),
      adjust: t("loyalty.movement_adjust"),
      reverse: t("loyalty.movement_reverse"),
    };
    return map[type] || type;
  };

  const movementColor = (type: string) => {
    const map: Record<string, string> = {
      earn: "var(--success)",
      redeem: "var(--warning)",
      bonus: "var(--accent)",
      adjust: "var(--text-secondary)",
      reverse: "var(--danger)",
    };
    return map[type] || "var(--text-muted)";
  };

  /* ── Tab config ─────────────────────────────────────── */

  const tabs: { key: Tab; label: string; href?: string }[] = [
    { key: "dashboard", label: t("loyalty.title") },
    { key: "settings", label: t("loyalty.settings") },
    { key: "customers", label: t("loyalty.customers"), href: "/loyalty/customers" },
    { key: "rewards", label: t("loyalty.rewards"), href: "/loyalty/rewards" },
    { key: "tiers", label: t("loyalty.tiers"), href: "/loyalty/tiers" },
    { key: "campaigns", label: t("loyalty.campaigns"), href: "/loyalty/campaigns" },
  ];

  /* ── KPI Cards ──────────────────────────────────────── */

  const kpiCards = [
    { label: t("loyalty.customers"), value: totalMembers.toString(), color: "var(--accent)" },
    { label: t("loyalty.visits"), value: activeToday.toString(), color: "var(--success)" },
    { label: t("loyalty.total_points_earned"), value: pointsIssued.toLocaleString(), color: "var(--warning)" },
    { label: t("loyalty.total_points_redeemed"), value: rewardsRedeemed.toLocaleString(), color: "var(--danger)" },
  ];

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Header */}
      <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, margin: "0 0 24px" }}>
        {t("loyalty.title")}
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => {
              if (tb.href) {
                window.location.href = tb.href;
              } else {
                setTab(tb.key);
              }
            }}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: tab === tb.key && !tb.href ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              color: tab === tb.key && !tb.href ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: tab === tb.key && !tb.href ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>...</p>
      )}

      {/* ─── Dashboard Tab ────────────────────────────── */}

      {!loading && tab === "dashboard" && (
        <>
          {/* KPI Grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
            className="max-md:!grid-cols-2"
          >
            {kpiCards.map((card, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 32, fontWeight: 700, color: card.color, letterSpacing: "-0.02em" }}>
                  {card.value}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                  {card.label}
                </span>
              </div>
            ))}
          </div>

          {/* Two-column: Top Customers + Recent Activity */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            className="max-md:!grid-cols-1"
          >
            {/* Top Customers */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  Top {t("loyalty.customers")}
                </h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {[t("loyalty.name"), t("loyalty.points"), t("loyalty.visits"), t("loyalty.total_spent")].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>--</td>
                      </tr>
                    )}
                    {topCustomers.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 600 }}>
                          {c.full_name}
                          {c.loyalty_tiers?.name && (
                            <span
                              style={{
                                marginLeft: 8,
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                background: `${c.loyalty_tiers?.color || "var(--accent)"}22`,
                                color: c.loyalty_tiers?.color || "var(--accent)",
                              }}
                            >
                              {c.loyalty_tiers?.name}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--accent)", fontWeight: 700 }}>
                          {c.current_points_balance.toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                          {c.visits_count}
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 600 }}>
                          {formatCurrency(c.total_spent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  {t("loyalty.history")}
                </h2>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {recentActivity.length === 0 && (
                  <p style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>--</p>
                )}
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "12px 20px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: `${movementColor(entry.movement_type)}20`,
                        color: movementColor(entry.movement_type),
                        flexShrink: 0,
                      }}
                    >
                      {movementLabel(entry.movement_type)}
                    </span>
                    <span style={{ flex: 1, color: "var(--text-secondary)", fontSize: 13 }}>
                      {entry.description || "--"}
                    </span>
                    <span style={{ fontWeight: 700, color: entry.points_delta >= 0 ? "var(--success)" : "var(--danger)", fontSize: 14 }}>
                      {entry.points_delta >= 0 ? "+" : ""}{entry.points_delta}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Settings Tab ─────────────────────────────── */}

      {!loading && tab === "settings" && (
        <div style={{ maxWidth: 600 }}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Enabled toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                style={{ width: 20, height: 20, accentColor: "var(--accent)" }}
              />
              <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1rem" }}>
                {t("loyalty.enabled")}
              </span>
            </label>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }} />

            {/* Points per euro */}
            <div>
              <label style={labelStyle}>{t("loyalty.points_per_euro")}</label>
              <input
                type="number"
                step="0.1"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={settings.points_per_euro}
                onChange={(e) => setSettings({ ...settings, points_per_euro: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Min order amount */}
            <div>
              <label style={labelStyle}>{t("loyalty.min_order")}</label>
              <input
                type="number"
                step="0.01"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={settings.min_order_amount}
                onChange={(e) => setSettings({ ...settings, min_order_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Welcome bonus */}
            <div>
              <label style={labelStyle}>{t("loyalty.welcome_bonus")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={settings.welcome_bonus}
                onChange={(e) => setSettings({ ...settings, welcome_bonus: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Birthday bonus */}
            <div>
              <label style={labelStyle}>{t("loyalty.birthday_bonus")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={settings.birthday_bonus}
                onChange={(e) => setSettings({ ...settings, birthday_bonus: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }} />

            {/* Toggle switches */}
            {([
              { key: "auto_enroll" as const, label: t("loyalty.auto_enroll") },
              { key: "allow_pos" as const, label: t("loyalty.allow_pos") },
              { key: "allow_qr" as const, label: t("loyalty.allow_qr") },
              { key: "allow_takeaway" as const, label: t("loyalty.allow_takeaway") },
            ]).map((item) => (
              <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings[item.key]}
                  onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.label}</span>
              </label>
            ))}

            {/* Save */}
            <div style={{ marginTop: 8 }}>
              <button style={btnPrimary} onClick={saveSettings} disabled={saving}>
                {saving ? "..." : t("menu.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
