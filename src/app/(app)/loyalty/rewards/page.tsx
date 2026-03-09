"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";

/* ── Types ────────────────────────────────────────────── */

interface Reward {
  id: string;
  tenant_id: string;
  title_es: string;
  title_en: string;
  title_fr: string | null;
  title_de: string | null;
  title_it: string | null;
  reward_type: string;
  points_cost: number;
  discount_amount: number | null;
  discount_percent: number | null;
  free_product_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  redemption_count: number;
}

const REWARD_TYPES = ["discount_fixed", "discount_percent", "free_product", "custom"];

const blankReward = {
  title_es: "",
  title_en: "",
  title_fr: "" as string | null,
  title_de: "" as string | null,
  title_it: "" as string | null,
  reward_type: "discount_fixed",
  points_cost: 100,
  discount_amount: null as number | null,
  discount_percent: null as number | null,
  free_product_name: null as string | null,
  starts_at: "" as string | null,
  ends_at: "" as string | null,
  active: true,
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

export default function LoyaltyRewardsPage() {
  const { t } = useI18n();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [modal, setModal] = useState(false);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [form, setForm] = useState(blankReward);
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

  const loadRewards = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("loyalty_rewards")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("points_cost", { ascending: true });
    if (data) setRewards(data as Reward[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) loadRewards();
  }, [tenantId, loadRewards]);

  /* ── CRUD ───────────────────────────────────────────── */

  const openCreate = () => {
    setEditReward(null);
    setForm({ ...blankReward });
    setModal(true);
  };

  const openEdit = (r: Reward) => {
    setEditReward(r);
    setForm({
      title_es: r.title_es,
      title_en: r.title_en,
      title_fr: r.title_fr,
      title_de: r.title_de,
      title_it: r.title_it,
      reward_type: r.reward_type,
      points_cost: r.points_cost,
      discount_amount: r.discount_amount,
      discount_percent: r.discount_percent,
      free_product_name: r.free_product_name,
      starts_at: r.starts_at || "",
      ends_at: r.ends_at || "",
      active: r.active,
    });
    setModal(true);
  };

  const saveReward = async () => {
    if (!tenantId || !form.title_es || !form.title_en) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      tenant_id: tenantId,
      title_es: form.title_es,
      title_en: form.title_en,
      title_fr: form.title_fr || null,
      title_de: form.title_de || null,
      title_it: form.title_it || null,
      reward_type: form.reward_type,
      points_cost: form.points_cost,
      discount_amount: form.discount_amount,
      discount_percent: form.discount_percent,
      free_product_name: form.free_product_name,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      active: form.active,
    };
    if (editReward) {
      await supabase.from("loyalty_rewards").update(payload).eq("id", editReward.id);
    } else {
      await supabase.from("loyalty_rewards").insert(payload);
    }
    setModal(false);
    setSaving(false);
    await loadRewards();
  };

  const deleteReward = async (id: string) => {
    const supabase = createClient();
    await supabase.from("loyalty_rewards").delete().eq("id", id);
    setDeleting(null);
    await loadRewards();
  };

  const toggleActive = async (r: Reward) => {
    const supabase = createClient();
    await supabase.from("loyalty_rewards").update({ active: !r.active }).eq("id", r.id);
    await loadRewards();
  };

  /* ── Type label + color ─────────────────────────────── */

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      discount_fixed: t("loyalty.discount_fixed"),
      discount_percent: t("loyalty.discount_percent"),
      free_product: t("loyalty.free_product"),
      custom: t("loyalty.custom"),
    };
    return map[type] || type;
  };

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      discount_fixed: "var(--accent)",
      discount_percent: "var(--warning)",
      free_product: "var(--success)",
      custom: "var(--text-secondary)",
    };
    return map[type] || "var(--text-muted)";
  };

  /* ── Overlay ────────────────────────────────────────── */

  const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "1.5rem", width: "100%",
          maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );

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
            {t("loyalty.rewards")}
          </h1>
        </div>
        <button style={btnPrimary} onClick={openCreate}>
          + {t("loyalty.add_reward")}
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>...</p>
      )}

      {/* Rewards Grid */}
      {!loading && (
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
          className="max-lg:!grid-cols-2 max-md:!grid-cols-1"
        >
          {rewards.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40, gridColumn: "1 / -1" }}>--</p>
          )}
          {rewards.map((r) => (
            <div
              key={r.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onClick={() => openEdit(r)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              {/* Title + type badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1rem" }}>
                  {r.title_es}
                </span>
                <span
                  style={{
                    padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: `${typeColor(r.reward_type)}22`,
                    color: typeColor(r.reward_type),
                    flexShrink: 0,
                  }}
                >
                  {typeLabel(r.reward_type)}
                </span>
              </div>

              {/* Points cost */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
                  {r.points_cost.toLocaleString()}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("loyalty.points")}</span>
              </div>

              {/* Redemption count */}
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {r.redemption_count || 0} {t("loyalty.redeem")}
              </span>

              {/* Active toggle */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(r); }}
                  style={{
                    padding: "3px 14px", borderRadius: 999, border: "none",
                    fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                    background: r.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                    color: r.active ? "#22c55e" : "#f87171",
                  }}
                >
                  {r.active ? t("menu.active") : t("common.inactive")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Modal ───────────────────────────── */}

      {modal && (
        <Overlay onClose={() => setModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {editReward ? t("menu.edit") : t("loyalty.add_reward")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* title_es, title_en */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>ES *</label>
                <input style={inputStyle} value={form.title_es} onChange={(e) => setForm({ ...form, title_es: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>EN *</label>
                <input style={inputStyle} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
              </div>
            </div>

            {/* title_fr, title_de, title_it */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>FR</label>
                <input style={inputStyle} value={form.title_fr || ""} onChange={(e) => setForm({ ...form, title_fr: e.target.value || null })} />
              </div>
              <div>
                <label style={labelStyle}>DE</label>
                <input style={inputStyle} value={form.title_de || ""} onChange={(e) => setForm({ ...form, title_de: e.target.value || null })} />
              </div>
              <div>
                <label style={labelStyle}>IT</label>
                <input style={inputStyle} value={form.title_it || ""} onChange={(e) => setForm({ ...form, title_it: e.target.value || null })} />
              </div>
            </div>

            {/* reward_type */}
            <div>
              <label style={labelStyle}>{t("loyalty.reward_type")}</label>
              <select
                style={inputStyle}
                value={form.reward_type}
                onChange={(e) => setForm({ ...form, reward_type: e.target.value })}
              >
                {REWARD_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{typeLabel(rt)}</option>
                ))}
              </select>
            </div>

            {/* points_cost */}
            <div>
              <label style={labelStyle}>{t("loyalty.points_cost")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 200 }}
                value={form.points_cost}
                onChange={(e) => setForm({ ...form, points_cost: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Conditional fields based on type */}
            {form.reward_type === "discount_fixed" && (
              <div>
                <label style={labelStyle}>{t("loyalty.discount_fixed")} (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  style={{ ...inputStyle, maxWidth: 200 }}
                  value={form.discount_amount ?? ""}
                  onChange={(e) => setForm({ ...form, discount_amount: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            )}

            {form.reward_type === "discount_percent" && (
              <div>
                <label style={labelStyle}>{t("loyalty.discount_percent")} (%)</label>
                <input
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  style={{ ...inputStyle, maxWidth: 200 }}
                  value={form.discount_percent ?? ""}
                  onChange={(e) => setForm({ ...form, discount_percent: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            )}

            {form.reward_type === "free_product" && (
              <div>
                <label style={labelStyle}>{t("loyalty.free_product")}</label>
                <input
                  style={inputStyle}
                  value={form.free_product_name || ""}
                  onChange={(e) => setForm({ ...form, free_product_name: e.target.value || null })}
                />
              </div>
            )}

            {/* Date range */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("loyalty.starts_at")}</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.starts_at || ""}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value || null })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("loyalty.ends_at")}</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.ends_at || ""}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value || null })}
                />
              </div>
            </div>

            {/* Active */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              />
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{t("menu.active")}</span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, flexWrap: "wrap" }}>
            <div>
              {editReward && (
                <button style={btnDanger} onClick={() => { setModal(false); setDeleting(editReward.id); }}>
                  {t("menu.delete")}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={btnSecondary} onClick={() => setModal(false)}>{t("menu.cancel")}</button>
              <button style={btnPrimary} onClick={saveReward} disabled={saving}>
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
            <button style={btnDanger} onClick={() => deleteReward(deleting)}>{t("menu.delete")}</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
