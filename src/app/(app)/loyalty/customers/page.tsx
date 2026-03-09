"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────── */

interface LoyaltyCustomer {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  current_points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  visits_count: number;
  total_spent: number;
  loyalty_tiers: { name: string; color: string } | null;
  last_visit_at: string | null;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  movement_type: string;
  points_delta: number;
  description: string | null;
  created_at: string;
}

interface Reward {
  id: string;
  title_es: string;
  points_cost: number;
  reward_type: string;
  active: boolean;
}

const blankCustomer = {
  full_name: "",
  phone: "",
  email: "",
  birthday: "",
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

export default function LoyaltyCustomersPage() {
  const { t } = useI18n();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState(blankCustomer);

  // Detail drawer
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([]);

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

  /* ── Load customers ─────────────────────────────────── */

  const loadCustomers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("loyalty_customers")
      .select("*, loyalty_tiers(name, color)", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("current_points_balance", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
    }

    const { data, count } = await query;
    if (data) setCustomers(data as unknown as LoyaltyCustomer[]);
    setTotalCount(count || 0);
    setLoading(false);
  }, [tenantId, page, search]);

  useEffect(() => {
    if (tenantId) loadCustomers();
  }, [tenantId, loadCustomers]);

  /* ── Add customer ───────────────────────────────────── */

  const addCustomer = async () => {
    if (!tenantId || !addForm.full_name) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("loyalty_customers").insert({
      tenant_id: tenantId,
      full_name: addForm.full_name,
      phone: addForm.phone || null,
      email: addForm.email || null,
      birthday: addForm.birthday || null,
      current_points_balance: 0,
      total_points_earned: 0,
      total_points_redeemed: 0,
      visits_count: 0,
      total_spent: 0,
    });
    setSaving(false);
    setAddModal(false);
    setAddForm(blankCustomer);
    await loadCustomers();
  };

  /* ── Open detail drawer ─────────────────────────────── */

  const openDetail = async (customer: LoyaltyCustomer) => {
    setSelectedCustomer(customer);
    setAdjustPoints(0);
    setAdjustReason("");
    const supabase = createClient();

    const [ledgerRes, rewardsRes] = await Promise.all([
      supabase
        .from("loyalty_points_ledger")
        .select("id, movement_type, points_delta, description, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("loyalty_rewards")
        .select("id, title_es, points_cost, reward_type, active")
        .eq("tenant_id", tenantId!)
        .eq("active", true),
    ]);

    if (ledgerRes.data) setLedger(ledgerRes.data as LedgerEntry[]);
    if (rewardsRes.data) setRewards(rewardsRes.data as Reward[]);
  };

  /* ── Manual adjust ──────────────────────────────────── */

  const doAdjust = async (direction: "add" | "deduct") => {
    if (!selectedCustomer || !tenantId || adjustPoints <= 0) return;
    setSaving(true);
    const supabase = createClient();
    const pts = direction === "add" ? adjustPoints : -adjustPoints;

    await supabase.from("loyalty_points_ledger").insert({
      tenant_id: tenantId,
      customer_id: selectedCustomer.id,
      movement_type: "adjust",
      points_delta: pts,
      description: adjustReason || (direction === "add" ? t("loyalty.add_points") : t("loyalty.deduct_points")),
    });

    // Update balance
    await supabase
      .from("loyalty_customers")
      .update({ current_points_balance: selectedCustomer.current_points_balance + pts })
      .eq("id", selectedCustomer.id);

    setSaving(false);
    setAdjustPoints(0);
    setAdjustReason("");

    // Refresh
    const { data } = await supabase
      .from("loyalty_customers")
      .select("*, loyalty_tiers(name, color)")
      .eq("id", selectedCustomer.id)
      .single();
    if (data) setSelectedCustomer(data as unknown as LoyaltyCustomer);

    const { data: newLedger } = await supabase
      .from("loyalty_points_ledger")
      .select("id, movement_type, points_delta, description, created_at")
      .eq("customer_id", selectedCustomer.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (newLedger) setLedger(newLedger as LedgerEntry[]);
    await loadCustomers();
  };

  /* ── Redeem reward ──────────────────────────────────── */

  const redeemReward = async (reward: Reward) => {
    if (!selectedCustomer || !tenantId) return;
    if (selectedCustomer.current_points_balance < reward.points_cost) return;
    setSaving(true);
    const supabase = createClient();

    await supabase.from("loyalty_points_ledger").insert({
      tenant_id: tenantId,
      customer_id: selectedCustomer.id,
      movement_type: "redeem",
      points_delta: -reward.points_cost,
      description: reward.title_es,
    });

    await supabase
      .from("loyalty_customers")
      .update({
        current_points_balance: selectedCustomer.current_points_balance - reward.points_cost,
        total_points_redeemed: selectedCustomer.total_points_redeemed + reward.points_cost,
      })
      .eq("id", selectedCustomer.id);

    setSaving(false);

    // Refresh
    const { data } = await supabase
      .from("loyalty_customers")
      .select("*, loyalty_tiers(name, color)")
      .eq("id", selectedCustomer.id)
      .single();
    if (data) setSelectedCustomer(data as unknown as LoyaltyCustomer);

    const { data: newLedger } = await supabase
      .from("loyalty_points_ledger")
      .select("id, movement_type, points_delta, description, created_at")
      .eq("customer_id", selectedCustomer.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (newLedger) setLedger(newLedger as LedgerEntry[]);
    await loadCustomers();
  };

  /* ── Helpers ────────────────────────────────────────── */

  const movementColor = (type: string) => {
    const map: Record<string, string> = {
      earn: "var(--success)", redeem: "var(--warning)", bonus: "var(--accent)",
      adjust: "var(--text-secondary)", reverse: "var(--danger)",
    };
    return map[type] || "var(--text-muted)";
  };

  const movementLabel = (type: string) => {
    const map: Record<string, string> = {
      earn: t("loyalty.movement_earn"), redeem: t("loyalty.movement_redeem"),
      bonus: t("loyalty.movement_bonus"), adjust: t("loyalty.movement_adjust"),
      reverse: t("loyalty.movement_reverse"),
    };
    return map[type] || type;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
          maxWidth: 540, maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );

  /* ── Drawer ─────────────────────────────────────────── */

  const Drawer = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", justifyContent: "flex-end", zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", borderLeft: "1px solid var(--border)",
          width: "100%", maxWidth: 520, height: "100%",
          overflowY: "auto", padding: "1.5rem",
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
            {t("loyalty.customers")}
          </h1>
        </div>
        <button style={btnPrimary} onClick={() => { setAddForm(blankCustomer); setAddModal(true); }}>
          + {t("loyalty.add_customer")}
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          style={{ ...inputStyle, maxWidth: 360 }}
          placeholder={t("loyalty.search_customer")}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  t("loyalty.name"),
                  t("loyalty.phone"),
                  t("loyalty.balance"),
                  t("loyalty.visits"),
                  t("loyalty.total_spent"),
                  t("loyalty.tier"),
                  t("loyalty.last_visit"),
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
              {loading && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>...</td></tr>
              )}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>--</td></tr>
              )}
              {customers.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                  onClick={() => openDetail(c)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 14px", color: "var(--text-primary)", fontWeight: 600 }}>
                    {c.full_name}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                    {c.phone || "--"}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--accent)", fontWeight: 700 }}>
                    {c.current_points_balance.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                    {c.visits_count}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--text-primary)", fontWeight: 600 }}>
                    {formatCurrency(c.total_spent)}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {c.loyalty_tiers?.name ? (
                      <span
                        style={{
                          padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                          background: `${c.loyalty_tiers?.color || "var(--accent)"}22`,
                          color: c.loyalty_tiers?.color || "var(--accent)",
                        }}
                      >
                        {c.loyalty_tiers?.name}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>--</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 13 }}>
                    {c.last_visit_at ? timeAgo(c.last_visit_at) : "--"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button
                      style={{ ...btnSecondary, padding: "4px 12px", fontSize: "0.8rem" }}
                      onClick={(e) => { e.stopPropagation(); openDetail(c); }}
                    >
                      {t("menu.edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <button
            style={{ ...btnSecondary, padding: "6px 16px" }}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            &larr;
          </button>
          <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {page + 1} / {totalPages}
          </span>
          <button
            style={{ ...btnSecondary, padding: "6px 16px" }}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            &rarr;
          </button>
        </div>
      )}

      {/* ─── Add Customer Modal ───────────────────────── */}

      {addModal && (
        <Overlay onClose={() => setAddModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {t("loyalty.add_customer")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("loyalty.name")} *</label>
              <input style={inputStyle} value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>{t("loyalty.phone")}</label>
              <input style={inputStyle} value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>{t("loyalty.email")}</label>
              <input type="email" style={inputStyle} value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>{t("loyalty.birthday")}</label>
              <input type="date" style={inputStyle} value={addForm.birthday} onChange={(e) => setAddForm({ ...addForm, birthday: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button style={btnSecondary} onClick={() => setAddModal(false)}>{t("menu.cancel")}</button>
            <button style={btnPrimary} onClick={addCustomer} disabled={saving}>
              {saving ? "..." : t("menu.save")}
            </button>
          </div>
        </Overlay>
      )}

      {/* ─── Customer Detail Drawer ───────────────────── */}

      {selectedCustomer && (
        <Drawer onClose={() => setSelectedCustomer(null)}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
              {selectedCustomer.full_name}
            </h2>
            <button
              onClick={() => setSelectedCustomer(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer" }}
            >
              x
            </button>
          </div>

          {/* Points summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: t("loyalty.balance"), value: selectedCustomer.current_points_balance.toLocaleString(), color: "var(--accent)" },
              { label: t("loyalty.total_points_earned"), value: selectedCustomer.total_points_earned.toLocaleString(), color: "var(--success)" },
              { label: t("loyalty.total_points_redeemed"), value: selectedCustomer.total_points_redeemed.toLocaleString(), color: "var(--warning)" },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-secondary)", borderRadius: 10, padding: 14,
                  display: "flex", flexDirection: "column", gap: 4,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>{card.label}</span>
              </div>
            ))}
          </div>

          {/* Info row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, fontSize: 13, color: "var(--text-secondary)" }}>
            <span>{t("loyalty.phone")}: {selectedCustomer.phone || "--"}</span>
            <span>{t("loyalty.email")}: {selectedCustomer.email || "--"}</span>
            <span>{t("loyalty.visits")}: {selectedCustomer.visits_count}</span>
            <span>{t("loyalty.total_spent")}: {formatCurrency(selectedCustomer.total_spent)}</span>
            {selectedCustomer.loyalty_tiers?.name && (
              <span
                style={{
                  padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: `${selectedCustomer.loyalty_tiers?.color || "var(--accent)"}22`,
                  color: selectedCustomer.loyalty_tiers?.color || "var(--accent)",
                }}
              >
                {selectedCustomer.loyalty_tiers?.name}
              </span>
            )}
          </div>

          {/* Manual adjust */}
          <div style={{
            background: "var(--bg-secondary)", borderRadius: 10, padding: 16, marginBottom: 20,
          }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
              {t("loyalty.manual_adjust")}
            </h3>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 80 }}>
                <label style={labelStyle}>{t("loyalty.points")}</label>
                <input
                  type="number"
                  min={0}
                  style={inputStyle}
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                />
              </div>
              <div style={{ flex: 2, minWidth: 120 }}>
                <label style={labelStyle}>{t("loyalty.reason")}</label>
                <input
                  style={inputStyle}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
              <button
                style={{ ...btnPrimary, padding: "0.6rem 1rem", fontSize: "0.8rem" }}
                onClick={() => doAdjust("add")}
                disabled={saving || adjustPoints <= 0}
              >
                + {t("loyalty.add_points")}
              </button>
              <button
                style={{ ...btnDanger, padding: "0.6rem 1rem", fontSize: "0.8rem" }}
                onClick={() => doAdjust("deduct")}
                disabled={saving || adjustPoints <= 0}
              >
                - {t("loyalty.deduct_points")}
              </button>
            </div>
          </div>

          {/* Redeem rewards */}
          {rewards.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
                {t("loyalty.redeem")}
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {rewards.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => redeemReward(r)}
                    disabled={saving || selectedCustomer.current_points_balance < r.points_cost}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: selectedCustomer.current_points_balance >= r.points_cost ? "var(--bg-secondary)" : "var(--bg-card)",
                      color: selectedCustomer.current_points_balance >= r.points_cost ? "var(--text-primary)" : "var(--text-muted)",
                      cursor: selectedCustomer.current_points_balance >= r.points_cost ? "pointer" : "not-allowed",
                      fontSize: 13,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      opacity: selectedCustomer.current_points_balance >= r.points_cost ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.title_es}</span>
                    <span style={{ fontSize: 11, color: "var(--accent)" }}>{r.points_cost} {t("loyalty.points")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ledger history */}
          <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
            {t("loyalty.history")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {ledger.length === 0 && (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>--</p>
            )}
            {ledger.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "10px 0", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span
                  style={{
                    padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: `${movementColor(entry.movement_type)}20`,
                    color: movementColor(entry.movement_type),
                    flexShrink: 0,
                  }}
                >
                  {movementLabel(entry.movement_type)}
                </span>
                <span style={{ flex: 1, color: "var(--text-secondary)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.description || "--"}
                </span>
                <span style={{ fontWeight: 700, color: entry.points_delta >= 0 ? "var(--success)" : "var(--danger)", fontSize: 14, flexShrink: 0 }}>
                  {entry.points_delta >= 0 ? "+" : ""}{entry.points_delta}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>
                  {timeAgo(entry.created_at)}
                </span>
              </div>
            ))}
          </div>
        </Drawer>
      )}
    </div>
  );
}
