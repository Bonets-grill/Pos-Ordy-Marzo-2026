"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Loader2, Bell, Check, Eye, RefreshCw, AlertTriangle } from "lucide-react";
import type { CostAlert } from "@/lib/escandallo/core/types";
import { getActiveAlerts, getAllAlerts, acknowledgeAlert, resolveAlert, scanAndGenerateAlerts } from "@/lib/escandallo/alerts/service";
import { ALERT_SEVERITY_COLORS, ALERT_TYPE_LABELS } from "@/lib/escandallo/core/constants";

const btnPrimary: React.CSSProperties = { background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 0.8rem", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" };
const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };

type Tab = "active" | "all";

export default function AlertsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (u) setTenantId(u.tenant_id);
    })();
  }, [supabase]);

  const loadAlerts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const result = tab === "active"
      ? await getActiveAlerts(supabase, tenantId)
      : await getAllAlerts(supabase, tenantId);
    if (result.ok && result.data) setAlerts(result.data);
    setLoading(false);
  }, [supabase, tenantId, tab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAlerts();
  }, [loadAlerts]);

  const handleScan = async () => {
    if (!tenantId) return;
    setScanning(true);
    await scanAndGenerateAlerts(supabase, tenantId);
    await loadAlerts();
    setScanning(false);
  };

  const handleAcknowledge = async (id: string) => {
    if (!tenantId || !userId) return;
    await acknowledgeAlert(supabase, tenantId, id, userId);
    await loadAlerts();
  };

  const handleResolve = async (id: string) => {
    if (!tenantId) return;
    await resolveAlert(supabase, tenantId, id);
    await loadAlerts();
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("esc.alert.title")}</h1>
        <button style={{ ...btnPrimary, opacity: scanning ? 0.6 : 1 }} onClick={handleScan} disabled={scanning}>
          <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: "middle", animation: scanning ? "spin 1s linear infinite" : "none" }} />
          Escanear
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {([
          { value: "active" as Tab, label: t("esc.alert.active") },
          { value: "all" as Tab, label: t("common.all") },
        ]).map(({ value, label }) => (
          <button key={value} onClick={() => setTab(value)}
            style={{
              ...btnSecondary, fontSize: 13,
              background: tab === value ? "var(--accent)1a" : "transparent",
              color: tab === value ? "var(--accent)" : "var(--text-secondary)",
              borderColor: tab === value ? "var(--accent)" : "var(--border)",
            }}>
            {label} {value === "active" && `(${alerts.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <Bell size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ fontSize: 16, color: "var(--text-muted)", margin: 0 }}>{t("esc.alert.no_alerts")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((alert) => (
            <div key={alert.id} style={{
              ...cardStyle, padding: 16, display: "flex", alignItems: "flex-start", gap: 12,
              borderLeftWidth: 4, borderLeftStyle: "solid",
              borderLeftColor: ALERT_SEVERITY_COLORS[alert.severity],
              opacity: alert.resolved ? 0.6 : 1,
            }}>
              <AlertTriangle size={20} style={{ color: ALERT_SEVERITY_COLORS[alert.severity], flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{alert.title}</span>
                  <span style={{
                    padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    background: ALERT_SEVERITY_COLORS[alert.severity] + "22",
                    color: ALERT_SEVERITY_COLORS[alert.severity],
                  }}>
                    {alert.severity}
                  </span>
                  <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                    {t(ALERT_TYPE_LABELS[alert.alert_type])}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{alert.message}</p>
                {alert.threshold_value != null && alert.actual_value != null && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Umbral: {alert.threshold_value.toFixed(1)}% | Actual: {alert.actual_value.toFixed(1)}%
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {new Date(alert.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {!alert.resolved && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {!alert.acknowledged && (
                    <button onClick={() => handleAcknowledge(alert.id)} title={t("esc.alert.acknowledge")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                      <Eye size={16} />
                    </button>
                  )}
                  <button onClick={() => handleResolve(alert.id)} title={t("esc.alert.resolve")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--success)", padding: 4 }}>
                    <Check size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
