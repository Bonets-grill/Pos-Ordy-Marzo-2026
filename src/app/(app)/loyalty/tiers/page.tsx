"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { sendToAirtableFromClient } from "@/lib/airtable/client-dispatcher";
import { useI18n } from "@/lib/i18n-provider";
import Overlay from "@/components/Overlay";

/* ── Types ────────────────────────────────────────────── */

interface Tier {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon: string | null;
  min_points: number;
  points_multiplier: number;
  perks: string[];
  sort_order: number;
}

const COLOR_PICKS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#78716c", "#64748b", "#d4af37",
];

const ICON_PICKS = [
  "star", "crown", "diamond", "fire", "heart",
  "shield", "trophy", "medal", "gem", "bolt",
];

const blankTier = {
  name: "",
  color: "#3b82f6",
  icon: "star" as string | null,
  min_points: 0,
  points_multiplier: 1,
  perks: [] as string[],
  sort_order: 0,
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

export default function LoyaltyTiersPage() {
  const { t } = useI18n();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [modal, setModal] = useState(false);
  const [editTier, setEditTier] = useState<Tier | null>(null);
  const [form, setForm] = useState(blankTier);
  const [perksText, setPerksText] = useState("");
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

  const loadTiers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("loyalty_tiers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("min_points", { ascending: true });
    if (data) setTiers(data as Tier[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tenantId) loadTiers();
  }, [tenantId, loadTiers]);

  /* ── CRUD ───────────────────────────────────────────── */

  const openCreate = () => {
    setEditTier(null);
    setForm({ ...blankTier, sort_order: tiers.length });
    setPerksText("");
    setModal(true);
  };

  const openEdit = (tier: Tier) => {
    setEditTier(tier);
    setForm({
      name: tier.name,
      color: tier.color,
      icon: tier.icon,
      min_points: tier.min_points,
      points_multiplier: tier.points_multiplier,
      perks: tier.perks || [],
      sort_order: tier.sort_order,
    });
    setPerksText((tier.perks || []).join(", "));
    setModal(true);
  };

  const saveTier = async () => {
    if (!tenantId || !form.name) return;
    setSaving(true);
    const supabase = createClient();
    const perksArray = perksText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const payload = {
      tenant_id: tenantId,
      name: form.name,
      color: form.color,
      icon: form.icon || null,
      min_points: form.min_points,
      points_multiplier: form.points_multiplier,
      perks: perksArray,
      sort_order: form.sort_order,
    };
    if (editTier) {
      await supabase.from("loyalty_tiers").update(payload).eq("id", editTier.id);
    } else {
      await supabase.from("loyalty_tiers").insert(payload);
    }
    sendToAirtableFromClient('loyalty_tiers', {
      'Name': form.name, 'Color': form.color, 'Icon': form.icon || '',
      'Min Points': form.min_points, 'Points Multiplier': form.points_multiplier,
      'Perks': perksArray.join('|'), 'Sort Order': form.sort_order, 'Active': true,
    });
    setModal(false);
    setSaving(false);
    await loadTiers();
  };

  const deleteTier = async (id: string) => {
    const supabase = createClient();
    await supabase.from("loyalty_tiers").delete().eq("id", id);
    setDeleting(null);
    await loadTiers();
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
            {t("loyalty.tiers")}
          </h1>
        </div>
        <button style={btnPrimary} onClick={openCreate}>
          + {t("loyalty.add_tier")}
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>...</p>
      )}

      {/* Tiers list */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tiers.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>--</p>
          )}
          {tiers.map((tier, index) => (
            <div
              key={tier.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onClick={() => openEdit(tier)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = tier.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              {/* Order number */}
              <span style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 600, minWidth: 20 }}>
                #{index + 1}
              </span>

              {/* Color swatch */}
              <span
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: tier.color, flexShrink: 0,
                  border: "1px solid var(--border)",
                }}
              />

              {/* Icon */}
              {tier.icon && (
                <span style={{ color: tier.color, fontSize: 18, fontWeight: 700, textTransform: "capitalize" }}>
                  {tier.icon}
                </span>
              )}

              {/* Name + min points */}
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1rem" }}>
                  {tier.name}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {t("loyalty.min_points")}: {tier.min_points.toLocaleString()}
                </div>
              </div>

              {/* Multiplier */}
              <div style={{
                padding: "4px 12px", borderRadius: 8,
                background: `${tier.color}22`, color: tier.color,
                fontWeight: 700, fontSize: 14,
              }}>
                x{tier.points_multiplier}
              </div>

              {/* Perks */}
              {(tier.perks || []).length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 300 }}>
                  {tier.perks.map((perk, pi) => (
                    <span
                      key={pi}
                      style={{
                        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                        background: "var(--bg-secondary)", color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {perk}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <button
                style={{ ...btnSecondary, padding: "4px 12px", fontSize: "0.8rem" }}
                onClick={(e) => { e.stopPropagation(); openEdit(tier); }}
              >
                {t("menu.edit")}
              </button>
              <button
                style={{ ...btnDanger, padding: "4px 12px", fontSize: "0.8rem" }}
                onClick={(e) => { e.stopPropagation(); setDeleting(tier.id); }}
              >
                {t("menu.delete")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Modal ───────────────────────────── */}

      {modal && (
        <Overlay onClose={() => setModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {editTier ? t("menu.edit") : t("loyalty.add_tier")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t("loyalty.tier_name")} *</label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Color picker */}
            <div>
              <label style={labelStyle}>{t("loyalty.tier_color")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {COLOR_PICKS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 30, height: 30, borderRadius: 6,
                      background: c,
                      border: form.color === c ? "3px solid var(--accent)" : "2px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div>
              <label style={labelStyle}>Icon</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {ICON_PICKS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm({ ...form, icon: ic })}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 13,
                      border: form.icon === ic ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: form.icon === ic ? "var(--accent)1a" : "var(--bg-secondary)",
                      color: form.icon === ic ? "var(--accent)" : "var(--text-secondary)",
                      cursor: "pointer", fontWeight: 600, textTransform: "capitalize",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Min points */}
            <div>
              <label style={labelStyle}>{t("loyalty.min_points")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={form.min_points}
                onChange={(e) => setForm({ ...form, min_points: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Multiplier */}
            <div>
              <label style={labelStyle}>{t("loyalty.multiplier")}</label>
              <input
                type="number"
                step="0.1"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={form.points_multiplier}
                onChange={(e) => setForm({ ...form, points_multiplier: parseFloat(e.target.value) || 1 })}
              />
            </div>

            {/* Perks (comma separated) */}
            <div>
              <label style={labelStyle}>Perks (comma-separated)</label>
              <input
                style={inputStyle}
                value={perksText}
                onChange={(e) => setPerksText(e.target.value)}
                placeholder="Free delivery, Priority support, VIP access"
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, flexWrap: "wrap" }}>
            <div>
              {editTier && (
                <button style={btnDanger} onClick={() => { setModal(false); setDeleting(editTier.id); }}>
                  {t("menu.delete")}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={btnSecondary} onClick={() => setModal(false)}>{t("menu.cancel")}</button>
              <button style={btnPrimary} onClick={saveTier} disabled={saving}>
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
            <button style={btnDanger} onClick={() => deleteTier(deleting)}>{t("menu.delete")}</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
