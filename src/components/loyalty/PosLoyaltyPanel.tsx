"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/utils";
import { Search, X, Plus, Gift, Star, User, ChevronRight } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface LoyaltyCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  current_points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  visits_count: number;
  total_spent: number;
  loyalty_tiers: { name: string; color: string } | null;
}

interface LoyaltyReward {
  id: string;
  title_es: string;
  points_cost: number;
  reward_type: string;
  discount_amount: number | null;
  discount_percent: number | null;
  free_product_name: string | null;
  active: boolean;
}

/* ── Props ─────────────────────────────────────────────── */

interface PosLoyaltyPanelProps {
  tenantId: string;
  onCustomerSelect: (customer: { id: string; name: string; points: number } | null) => void;
  onRewardSelect: (reward: { id: string; title: string; type: string; discount_amount?: number; discount_percent?: number } | null) => void;
  orderTotal: number;
}

/* ── Component ─────────────────────────────────────────── */

export default function PosLoyaltyPanel({
  tenantId,
  onCustomerSelect,
  onRewardSelect,
  orderTotal,
}: PosLoyaltyPanelProps) {
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── State ───────────────────────────────────────────── */
  const [mode, setMode] = useState<"search" | "selected" | "create">("search");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<LoyaltyCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick create form
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [creating, setCreating] = useState(false);

  /* ── Debounced search ────────────────────────────────── */

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      setError(null);
      try {
        const q = query.trim();
        const { data, error: err } = await supabase
          .from("loyalty_customers")
          .select("id, full_name, phone, email, current_points_balance, total_points_earned, total_points_redeemed, visits_count, total_spent, loyalty_tiers(name, color)")
          .eq("tenant_id", tenantId)
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
          .order("current_points_balance", { ascending: false })
          .limit(8);
        if (err) throw err;
        setResults((data as unknown as LoyaltyCustomer[]) || []);
      } catch {
        setError("Error searching");
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [supabase, tenantId]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* ── Load rewards when customer selected ─────────────── */

  const loadRewards = useCallback(async () => {
    setLoadingRewards(true);
    try {
      const { data } = await supabase
        .from("loyalty_rewards")
        .select("id, title_es, points_cost, reward_type, discount_amount, discount_percent, free_product_name, active")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("points_cost", { ascending: true });
      setRewards((data as LoyaltyReward[]) || []);
    } catch {
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  }, [supabase, tenantId]);

  /* ── Select customer ─────────────────────────────────── */

  const selectCustomer = useCallback(
    (customer: LoyaltyCustomer) => {
      setSelectedCustomer(customer);
      setMode("selected");
      setSearch("");
      setResults([]);
      setSelectedReward(null);
      onCustomerSelect({
        id: customer.id,
        name: customer.full_name,
        points: customer.current_points_balance,
      });
      onRewardSelect(null);
      loadRewards();
    },
    [onCustomerSelect, onRewardSelect, loadRewards]
  );

  /* ── Clear customer ──────────────────────────────────── */

  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setSelectedReward(null);
    setMode("search");
    setSearch("");
    setResults([]);
    setRewards([]);
    onCustomerSelect(null);
    onRewardSelect(null);
  }, [onCustomerSelect, onRewardSelect]);

  /* ── Select reward ───────────────────────────────────── */

  const handleRewardSelect = useCallback(
    (reward: LoyaltyReward) => {
      if (!selectedCustomer) return;
      if (selectedCustomer.current_points_balance < reward.points_cost) return;

      if (selectedReward?.id === reward.id) {
        // Deselect
        setSelectedReward(null);
        onRewardSelect(null);
        return;
      }

      setSelectedReward(reward);
      onRewardSelect({
        id: reward.id,
        title: reward.title_es,
        type: reward.reward_type,
        discount_amount: reward.discount_amount ?? undefined,
        discount_percent: reward.discount_percent ?? undefined,
      });
    },
    [selectedCustomer, selectedReward, onRewardSelect]
  );

  /* ── Quick create customer ───────────────────────────── */

  const handleCreate = useCallback(async () => {
    if (!createName.trim() || !createPhone.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("loyalty_customers")
        .insert({
          tenant_id: tenantId,
          full_name: createName.trim(),
          phone: createPhone.trim(),
          current_points_balance: 0,
          total_points_earned: 0,
          total_points_redeemed: 0,
          visits_count: 0,
          total_spent: 0,
        })
        .select("id, full_name, phone, email, current_points_balance, total_points_earned, total_points_redeemed, visits_count, total_spent")
        .single();

      if (err) throw err;
      if (data) {
        const newCustomer: LoyaltyCustomer = {
          ...data,
          loyalty_tiers: null,
        } as LoyaltyCustomer;
        setCreateName("");
        setCreatePhone("");
        selectCustomer(newCustomer);
      }
    } catch {
      setError("Error creating customer");
    } finally {
      setCreating(false);
    }
  }, [createName, createPhone, supabase, tenantId, selectCustomer]);

  /* ── Available rewards (affordable) ──────────────────── */

  const availableRewards = useMemo(() => {
    if (!selectedCustomer) return [];
    return rewards.filter(
      (r) => r.points_cost <= selectedCustomer.current_points_balance
    );
  }, [rewards, selectedCustomer]);

  const unaffordableRewards = useMemo(() => {
    if (!selectedCustomer) return [];
    return rewards.filter(
      (r) => r.points_cost > selectedCustomer.current_points_balance
    );
  }, [rewards, selectedCustomer]);

  /* ── Reward type label ───────────────────────────────── */

  const rewardTypeLabel = (r: LoyaltyReward): string => {
    switch (r.reward_type) {
      case "discount_fixed":
        return r.discount_amount ? formatCurrency(r.discount_amount) : t("loyalty.discount_fixed");
      case "discount_percent":
        return r.discount_percent ? `${r.discount_percent}%` : t("loyalty.discount_percent");
      case "free_product":
        return r.free_product_name || t("loyalty.free_product");
      default:
        return t("loyalty.custom");
    }
  };

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        maxWidth: 320,
        width: "100%",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Star size={15} style={{ color: "var(--accent)" }} />
          <span
            style={{
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {t("nav.loyalty")}
          </span>
        </div>
        {mode === "selected" && (
          <button
            onClick={clearCustomer}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "2px 6px",
            }}
          >
            {t("pos.clear")}
          </button>
        )}
        {mode === "create" && (
          <button
            onClick={() => setMode("search")}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ═══ ERROR ═══ */}
      {error && (
        <div
          style={{
            padding: "6px 14px",
            background: "rgba(239,68,68,0.1)",
            color: "var(--danger)",
            fontSize: "0.78rem",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {/* ═══ SEARCH MODE ═══ */}
      {mode === "search" && (
        <div style={{ padding: 10 }}>
          {/* Search input */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder={t("loyalty.search_customer")}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px 8px 32px",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setResults([]);
                }}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Searching indicator */}
          {searching && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.78rem",
                padding: "12px 0",
              }}
            >
              ...
            </div>
          )}

          {/* Search results */}
          {!searching && results.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s",
                    width: "100%",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border)")
                  }
                >
                  <User
                    size={14}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.full_name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.72rem",
                      }}
                    >
                      {c.phone || c.email || "--"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--accent)",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                      }}
                    >
                      {c.current_points_balance.toLocaleString()}
                    </span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.68rem",
                      }}
                    >
                      {t("loyalty.points")}
                    </span>
                  </div>
                  <ChevronRight
                    size={13}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!searching && search.trim().length >= 2 && results.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.78rem",
                padding: "10px 0",
              }}
            >
              --
            </div>
          )}

          {/* Quick create button */}
          <button
            onClick={() => {
              setMode("create");
              setSearch("");
              setResults([]);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              marginTop: 6,
              padding: "8px 10px",
              background: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: 8,
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Plus size={13} />
            {t("loyalty.add_customer")}
          </button>
        </div>
      )}

      {/* ═══ CREATE MODE ═══ */}
      {mode === "create" && (
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {t("loyalty.add_customer")}
          </div>
          <input
            type="text"
            placeholder={`${t("loyalty.name")} *`}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <input
            type="tel"
            placeholder={`${t("loyalty.phone")} *`}
            value={createPhone}
            onChange={(e) => setCreatePhone(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                setMode("search");
                setCreateName("");
                setCreatePhone("");
              }}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("menu.cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim() || !createPhone.trim()}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                background:
                  creating || !createName.trim() || !createPhone.trim()
                    ? "var(--border)"
                    : "var(--accent)",
                color:
                  creating || !createName.trim() || !createPhone.trim()
                    ? "var(--text-secondary)"
                    : "#000",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor:
                  creating || !createName.trim() || !createPhone.trim()
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  creating || !createName.trim() || !createPhone.trim()
                    ? 0.6
                    : 1,
                transition: "all 0.15s",
              }}
            >
              {creating ? "..." : t("menu.save")}
            </button>
          </div>
        </div>
      )}

      {/* ═══ SELECTED MODE — CUSTOMER BADGE ═══ */}
      {mode === "selected" && selectedCustomer && (
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Customer info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "var(--bg-secondary)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <User size={18} style={{ color: "#000" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedCustomer.full_name}
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                {selectedCustomer.phone || selectedCustomer.email || "--"}
              </div>
            </div>
            {/* Tier badge */}
            {selectedCustomer.loyalty_tiers?.name && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  background: `${selectedCustomer.loyalty_tiers.color || "var(--accent)"}22`,
                  color: selectedCustomer.loyalty_tiers.color || "var(--accent)",
                  flexShrink: 0,
                }}
              >
                {selectedCustomer.loyalty_tiers.name}
              </span>
            )}
          </div>

          {/* Points balance — prominent */}
          <div
            style={{
              textAlign: "center",
              padding: "12px 10px",
              background: "rgba(249,115,22,0.08)",
              borderRadius: 10,
              border: "1px solid rgba(249,115,22,0.2)",
            }}
          >
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--accent)",
                lineHeight: 1.1,
              }}
            >
              {selectedCustomer.current_points_balance.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginTop: 2,
              }}
            >
              {t("loyalty.points")} {t("loyalty.balance").toLowerCase()}
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                background: "var(--bg-secondary)",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {selectedCustomer.visits_count}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                }}
              >
                {t("loyalty.visits")}
              </div>
            </div>
            <div
              style={{
                padding: "8px 10px",
                background: "var(--bg-secondary)",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {formatCurrency(selectedCustomer.total_spent)}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                }}
              >
                {t("loyalty.total_spent")}
              </div>
            </div>
          </div>

          {/* ═══ REWARDS ═══ */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Gift size={13} style={{ color: "var(--text-secondary)" }} />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("loyalty.rewards")}
              </span>
            </div>

            {loadingRewards && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  padding: "8px 0",
                }}
              >
                ...
              </div>
            )}

            {!loadingRewards && rewards.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  padding: "8px 0",
                }}
              >
                --
              </div>
            )}

            {!loadingRewards && rewards.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  maxHeight: 180,
                  overflowY: "auto",
                }}
              >
                {/* Available rewards */}
                {availableRewards.map((r) => {
                  const isSelected = selectedReward?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRewardSelect(r)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: isSelected
                          ? "rgba(249,115,22,0.15)"
                          : "var(--bg-secondary)",
                        border: isSelected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        borderRadius: 8,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                        width: "100%",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.borderColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <Gift
                        size={13}
                        style={{
                          color: isSelected
                            ? "var(--accent)"
                            : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.title_es}
                        </div>
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.68rem",
                          }}
                        >
                          {rewardTypeLabel(r)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--accent)",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                          }}
                        >
                          {r.points_cost}
                        </span>
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.62rem",
                          }}
                        >
                          {t("loyalty.points")}
                        </span>
                      </div>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "var(--accent)",
                            flexShrink: 0,
                          }}
                        >
                          {t("loyalty.redeem")}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Unaffordable rewards (dimmed) */}
                {unaffordableRewards.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      opacity: 0.4,
                      width: "100%",
                    }}
                  >
                    <Gift
                      size={13}
                      style={{ color: "var(--text-muted)", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.title_es}
                      </div>
                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.68rem",
                        }}
                      >
                        {rewardTypeLabel(r)}
                      </div>
                    </div>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        flexShrink: 0,
                      }}
                    >
                      {r.points_cost} {t("loyalty.points")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
