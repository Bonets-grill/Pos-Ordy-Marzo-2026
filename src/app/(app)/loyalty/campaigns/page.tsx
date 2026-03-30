"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { sendToAirtableFromClient } from "@/lib/airtable/client-dispatcher";
import { useI18n } from "@/lib/i18n-provider";
import { formatDate } from "@/lib/utils";
import Overlay from "@/components/Overlay";

/* ── Types ────────────────────────────────────────────── */

interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  campaign_type: string;
  multiplier: number | null;
  bonus_points: number | null;
  category_id: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

const CAMPAIGN_TYPES = ["double_points", "bonus_points", "happy_hour", "category_boost"];

const blankCampaign = {
  name: "",
  campaign_type: "double_points",
  multiplier: 2 as number | null,
  bonus_points: null as number | null,
  category_id: null as string | null,
  starts_at: "",
  ends_at: "",
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

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)",
  color: "#f87171",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

/* ── Component ────────────────────────────────────────── */

export default function LoyaltyCampaignsPage() {
  const { t } = useI18n();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modal, setModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState(blankCampaign);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  /* ── Load ───────────────────────────────────────────── */

  const loadCampaigns = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("loyalty_campaigns")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: false });
    if (data) setCampaigns(data as Campaign[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tenantId) loadCampaigns();
  }, [tenantId, loadCampaigns]);

  /* ── CRUD ───────────────────────────────────────────── */

  const openCreate = () => {
    setEditCampaign(null);
    setForm({ ...blankCampaign });
    setModal(true);
  };

  const openEdit = (c: Campaign) => {
    setEditCampaign(c);
    setForm({
      name: c.name,
      campaign_type: c.campaign_type,
      multiplier: c.multiplier,
      bonus_points: c.bonus_points,
      category_id: c.category_id,
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
    });
    setModal(true);
  };

  const saveCampaign = async () => {
    if (!tenantId || !form.name || !form.starts_at || !form.ends_at) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      tenant_id: tenantId,
      name: form.name,
      campaign_type: form.campaign_type,
      multiplier: form.multiplier,
      bonus_points: form.bonus_points,
      category_id: form.category_id || null,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
    };
    if (editCampaign) {
      await supabase.from("loyalty_campaigns").update(payload).eq("id", editCampaign.id);
    } else {
      await supabase.from("loyalty_campaigns").insert(payload);
    }
    sendToAirtableFromClient('loyalty_campaigns', {
      'Name': form.name, 'Campaign Type': form.campaign_type,
      'Multiplier': form.multiplier, 'Bonus Points': form.bonus_points,
      'Starts At': form.starts_at, 'Ends At': form.ends_at, 'Active': true,
    });
    setModal(false);
    setSaving(false);
    await loadCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    const supabase = createClient();
    await supabase.from("loyalty_campaigns").delete().eq("id", id);
    setDeleting(null);
    await loadCampaigns();
  };

  /* ── Helpers ────────────────────────────────────────── */

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      double_points: t("loyalty.double_points"),
      bonus_points: t("loyalty.bonus_points"),
      happy_hour: t("loyalty.happy_hour"),
      category_boost: t("loyalty.category_boost"),
    };
    return map[type] || type;
  };

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      double_points: "var(--accent)",
      bonus_points: "var(--success)",
      happy_hour: "var(--warning)",
      category_boost: "#a855f7",
    };
    return map[type] || "var(--text-muted)";
  };

  const campaignStatus = (c: Campaign): { label: string; color: string } => {
    const now = new Date();
    const start = new Date(c.starts_at);
    const end = new Date(c.ends_at);
    if (now < start) return { label: "Upcoming", color: "var(--text-secondary)" };
    if (now > end) return { label: "Ended", color: "var(--danger)" };
    return { label: "Active", color: "var(--success)" };
  };

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/loyalty" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>
            {t("loyalty.title")}
          </a>
          <span style={{ color: "var(--text-muted)" }}>/</span>
          <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, margin: 0 }}>
            {t("loyalty.campaigns")}
          </h1>
        </div>
        <button style={btnPrimary} onClick={openCreate}>
          + {t("loyalty.add_campaign")}
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>...</p>
      )}

      {/* Campaigns list */}
      {!loading && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    t("loyalty.campaign_name"),
                    t("loyalty.campaign_type"),
                    t("loyalty.starts_at"),
                    t("loyalty.ends_at"),
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px 14px", textAlign: "left", color: "var(--text-muted)",
                        fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>--</td></tr>
                )}
                {campaigns.map((c) => {
                  const status = campaignStatus(c);
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                      onClick={() => openEdit(c)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 14px", color: "var(--text-primary)", fontWeight: 600 }}>
                        {c.name}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: `${typeColor(c.campaign_type)}22`,
                            color: typeColor(c.campaign_type),
                          }}
                        >
                          {typeLabel(c.campaign_type)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: 13 }}>
                        {formatDate(c.starts_at)}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: 13 }}>
                        {formatDate(c.ends_at)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: `${status.color}20`,
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{ ...btnSecondary, padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          >
                            {t("menu.edit")}
                          </button>
                          <button
                            style={{ ...btnDanger, padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={(e) => { e.stopPropagation(); setDeleting(c.id); }}
                          >
                            {t("menu.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal ───────────────────────────── */}

      {modal && (
        <Overlay onClose={() => setModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {editCampaign ? t("menu.edit") : t("loyalty.add_campaign")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t("loyalty.campaign_name")} *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Campaign type */}
            <div>
              <label style={labelStyle}>{t("loyalty.campaign_type")}</label>
              <select
                style={inputStyle}
                value={form.campaign_type}
                onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
              >
                {CAMPAIGN_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{typeLabel(ct)}</option>
                ))}
              </select>
            </div>

            {/* Multiplier (for double_points, happy_hour, category_boost) */}
            {["double_points", "happy_hour", "category_boost"].includes(form.campaign_type) && (
              <div>
                <label style={labelStyle}>{t("loyalty.multiplier")}</label>
                <input
                  type="number"
                  step="0.1"
                  style={{ ...inputStyle, maxWidth: 200 }}
                  value={form.multiplier ?? ""}
                  onChange={(e) => setForm({ ...form, multiplier: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            )}

            {/* Bonus points (for bonus_points type) */}
            {form.campaign_type === "bonus_points" && (
              <div>
                <label style={labelStyle}>{t("loyalty.bonus_points")}</label>
                <input
                  type="number"
                  style={{ ...inputStyle, maxWidth: 200 }}
                  value={form.bonus_points ?? ""}
                  onChange={(e) => setForm({ ...form, bonus_points: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
            )}

            {/* Category ID (for category_boost) */}
            {form.campaign_type === "category_boost" && (
              <div>
                <label style={labelStyle}>Category ID</label>
                <input
                  style={inputStyle}
                  value={form.category_id || ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                  placeholder="UUID of menu category"
                />
              </div>
            )}

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("loyalty.starts_at")} *</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("loyalty.ends_at")} *</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, flexWrap: "wrap" }}>
            <div>
              {editCampaign && (
                <button style={btnDanger} onClick={() => { setModal(false); setDeleting(editCampaign.id); }}>
                  {t("menu.delete")}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={btnSecondary} onClick={() => setModal(false)}>{t("menu.cancel")}</button>
              <button style={btnPrimary} onClick={saveCampaign} disabled={saving}>
                {saving ? "..." : t("menu.save")}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ─── Delete confirmation ──────────────────────── */}

      {deleting && (
        <Overlay onClose={() => setDeleting(null)}>
          <p style={{ color: "var(--text-primary)", fontSize: "1rem", marginBottom: 20, marginTop: 0 }}>
            {t("menu.confirm_delete")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button style={btnSecondary} onClick={() => setDeleting(null)}>{t("menu.cancel")}</button>
            <button style={btnDanger} onClick={() => deleteCampaign(deleting)}>{t("menu.delete")}</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
