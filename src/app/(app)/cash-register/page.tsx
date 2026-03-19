"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DollarSign,
  Clock,
  Plus,
  Minus,
  X,
  Lock,
  Unlock,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Banknote,
  CreditCard,
  Receipt,
  TrendingUp,
  CalendarDays,
  ShoppingCart,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

interface CashShift {
  id: string;
  tenant_id: string;
  opened_by: string;
  closed_by: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  cash_sales: number;
  card_sales: number;
  total_sales: number;
  total_orders: number;
  notes: string | null;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  opener_name?: string;
  closer_name?: string;
}

interface CashMovement {
  id: string;
  shift_id: string;
  type: "sale" | "refund" | "cash_in" | "cash_out" | "tip";
  amount: number;
  description: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
  creator_name?: string;
}

interface ShiftSummary {
  cash_sales: number;
  card_sales: number;
  total_sales: number;
  total_orders: number;
  tips: number;
  cash_in: number;
  cash_out: number;
  refunds: number;
}

interface DailySummary {
  totalRevenue: number;
  totalOrders: number;
  cashTotal: number;
  cardTotal: number;
  tipsTotal: number;
  shiftsOpened: number;
  shiftsClosed: number;
  shifts: {
    id: string;
    opened_at: string;
    closed_at: string | null;
    opening_amount: number;
    closing_amount: number | null;
    difference: number | null;
    total_orders: number;
    total_sales: number;
    status: string;
  }[];
}

/* ── Modal Backdrop ── */

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

function elapsedTime(from: string): string {
  const ms = Date.now() - new Date(from).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function movementTypeBadge(type: string) {
  switch (type) {
    case "sale":
      return { bg: "rgba(34,197,94,0.15)", color: "var(--success)" };
    case "refund":
      return { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" };
    case "cash_in":
      return { bg: "rgba(59,130,246,0.15)", color: "var(--info)" };
    case "cash_out":
      return { bg: "rgba(249,115,22,0.15)", color: "var(--warning)" };
    case "tip":
      return { bg: "rgba(168,85,247,0.15)", color: "#a855f7" };
    default:
      return { bg: "rgba(100,100,100,0.15)", color: "var(--text-muted)" };
  }
}

/* ── Component ────────────────────────────────────────── */

export default function CashRegisterPage() {
  const { t } = useI18n();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Active shift
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary>({
    cash_sales: 0,
    card_sales: 0,
    total_sales: 0,
    total_orders: 0,
    tips: 0,
    cash_in: 0,
    cash_out: 0,
    refunds: 0,
  });
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [elapsed, setElapsed] = useState("");

  // Open shift
  const [openingAmount, setOpeningAmount] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  // Close shift modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  // Cash movement modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<"cash_in" | "cash_out">("cash_in");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDesc, setMovementDesc] = useState("");
  const [movementLoading, setMovementLoading] = useState(false);

  // History
  const [activeTab, setActiveTab] = useState<"daily_summary" | "current" | "history">("daily_summary");
  const [historyShifts, setHistoryShifts] = useState<CashShift[]>([]);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [expandedMovements, setExpandedMovements] = useState<CashMovement[]>([]);

  // Daily summary
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    totalRevenue: 0,
    totalOrders: 0,
    cashTotal: 0,
    cardTotal: 0,
    tipsTotal: 0,
    shiftsOpened: 0,
    shiftsClosed: 0,
    shifts: [],
  });
  const [dailyLoading, setDailyLoading] = useState(false);

  // Resolve tenant + user
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
    })();
  }, [supabase]);

  // Elapsed time ticker
  useEffect(() => {
    if (!activeShift) return;
    setElapsed(elapsedTime(activeShift.opened_at));
    const interval = setInterval(() => {
      setElapsed(elapsedTime(activeShift.opened_at));
    }, 60000);
    return () => clearInterval(interval);
  }, [activeShift]);

  /* ── Fetch active shift + summary ── */

  const fetchActiveShift = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // Get open shift
      const { data: shiftRow } = await supabase
        .from("cash_shifts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!shiftRow) {
        setActiveShift(null);
        setSummary({
          cash_sales: 0,
          card_sales: 0,
          total_sales: 0,
          total_orders: 0,
          tips: 0,
          cash_in: 0,
          cash_out: 0,
          refunds: 0,
        });
        setMovements([]);
        setLoading(false);
        return;
      }

      setActiveShift(shiftRow as CashShift);

      // Fetch payments during this shift
      const { data: payments } = await supabase
        .from("payments")
        .select("method, amount, tip_amount, status")
        .eq("tenant_id", tenantId)
        .gte("created_at", shiftRow.opened_at)
        .neq("status", "refunded");

      const completedPayments = (payments || []).filter(
        (p: any) => p.method !== "refund"
      );

      const cashSales = completedPayments
        .filter((p: any) => p.method === "cash")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const cardSales = completedPayments
        .filter((p: any) => p.method === "card")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const otherSales = completedPayments
        .filter((p: any) => p.method !== "cash" && p.method !== "card")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const tips = completedPayments.reduce(
        (s: number, p: any) => s + (p.tip_amount || 0),
        0
      );
      const totalOrders = completedPayments.length;

      // Fetch cash movements for this shift
      const { data: movementRows } = await supabase
        .from("cash_movements")
        .select("*, users!cash_movements_created_by_fkey(name)")
        .eq("shift_id", shiftRow.id)
        .order("created_at", { ascending: false });

      const parsedMovements: CashMovement[] = (movementRows || []).map(
        (m: any) => ({
          id: m.id,
          shift_id: m.shift_id,
          type: m.type,
          amount: m.amount,
          description: m.description,
          order_id: m.order_id,
          created_by: m.created_by,
          created_at: m.created_at,
          creator_name: m.users?.name ?? null,
        })
      );
      setMovements(parsedMovements);

      const cashIn = parsedMovements
        .filter((m) => m.type === "cash_in")
        .reduce((s, m) => s + m.amount, 0);
      const cashOut = parsedMovements
        .filter((m) => m.type === "cash_out")
        .reduce((s, m) => s + Math.abs(m.amount), 0);
      const refunds = parsedMovements
        .filter((m) => m.type === "refund")
        .reduce((s, m) => s + Math.abs(m.amount), 0);

      setSummary({
        cash_sales: cashSales,
        card_sales: cardSales,
        total_sales: cashSales + cardSales + otherSales,
        total_orders: totalOrders,
        tips,
        cash_in: cashIn,
        cash_out: cashOut,
        refunds,
      });
    } catch (err) {
      console.error("fetchShiftData error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  /* ── Fetch history ── */

  const fetchHistory = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("cash_shifts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(50);

    setHistoryShifts((data || []) as CashShift[]);
  }, [tenantId, supabase]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  /* ── Fetch daily summary ── */

  const fetchDailySummary = useCallback(async () => {
    if (!tenantId) return;
    setDailyLoading(true);

    try {
      // Today boundaries (local timezone)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Fetch all shifts that started today
      const { data: todayShifts } = await supabase
        .from("cash_shifts")
        .select("id, opened_at, closed_at, opening_amount, closing_amount, difference, total_orders, total_sales, status, cash_sales, card_sales")
        .eq("tenant_id", tenantId)
        .gte("opened_at", todayStart)
        .lt("opened_at", todayEnd)
        .order("opened_at", { ascending: true });

      const shifts = (todayShifts || []) as any[];

      // Fetch payments for today
      const { data: todayPayments } = await supabase
        .from("payments")
        .select("method, amount, tip_amount, status")
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd)
        .neq("status", "refunded");

      const payments = (todayPayments || []).filter((p: any) => p.method !== "refund");

      const cashTotal = payments
        .filter((p: any) => p.method === "cash")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const cardTotal = payments
        .filter((p: any) => p.method === "card")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const otherTotal = payments
        .filter((p: any) => p.method !== "cash" && p.method !== "card")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const tipsTotal = payments.reduce(
        (s: number, p: any) => s + (p.tip_amount || 0),
        0
      );

      setDailySummary({
        totalRevenue: cashTotal + cardTotal + otherTotal,
        totalOrders: payments.length,
        cashTotal,
        cardTotal,
        tipsTotal,
        shiftsOpened: shifts.length,
        shiftsClosed: shifts.filter((s) => s.status === "closed").length,
        shifts: shifts.map((s) => ({
          id: s.id,
          opened_at: s.opened_at,
          closed_at: s.closed_at,
          opening_amount: s.opening_amount ?? 0,
          closing_amount: s.closing_amount,
          difference: s.difference,
          total_orders: s.total_orders ?? 0,
          total_sales: s.total_sales ?? 0,
          status: s.status,
        })),
      });
    } catch (err) {
      console.error("fetchShiftHistory error:", err);
    } finally {
      setDailyLoading(false);
    }
  }, [tenantId, supabase]);

  useEffect(() => {
    if (activeTab === "daily_summary") fetchDailySummary();
  }, [activeTab, fetchDailySummary]);

  /* ── Open Shift ── */

  async function handleOpenShift() {
    if (!tenantId || !userId) return;
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) return;

    setOpenLoading(true);
    try {
      await supabase.from("cash_shifts").insert({
        tenant_id: tenantId,
        opened_by: userId,
        opening_amount: amount,
        status: "open",
      });
      setOpeningAmount("");
      await fetchActiveShift();
    } catch (err) {
      window.alert(t("cash.error_open_shift"));
      console.error("openShift error:", err);
    } finally {
      setOpenLoading(false);
    }
  }

  /* ── Add Cash Movement ── */

  async function handleAddMovement() {
    if (!activeShift || !tenantId || !userId) return;
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) return;

    setMovementLoading(true);
    try {
      await supabase.from("cash_movements").insert({
        shift_id: activeShift.id,
        tenant_id: tenantId,
        type: movementType,
        amount: movementType === "cash_out" ? -Math.abs(amount) : amount,
        description: movementDesc || null,
        created_by: userId,
      });
      setShowMovementModal(false);
      setMovementAmount("");
      setMovementDesc("");
      await fetchActiveShift();
    } catch (err) {
      window.alert(t("cash.error_movement"));
      console.error("addMovement error:", err);
    } finally {
      setMovementLoading(false);
    }
  }

  /* ── Close Shift ── */

  const expectedCash =
    (activeShift?.opening_amount ?? 0) +
    summary.cash_sales +
    summary.tips +
    summary.cash_in -
    summary.cash_out -
    summary.refunds;

  async function handleCloseShift() {
    if (!activeShift || !tenantId || !userId) return;
    const actual = parseFloat(closingAmount);
    if (isNaN(actual) || actual < 0) return;

    setCloseLoading(true);
    try {
      const difference = actual - expectedCash;

      await supabase
        .from("cash_shifts")
        .update({
          closed_by: userId,
          closing_amount: actual,
          expected_amount: expectedCash,
          difference,
          cash_sales: summary.cash_sales,
          card_sales: summary.card_sales,
          total_sales: summary.total_sales,
          total_orders: summary.total_orders,
          notes: closeNotes || null,
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", activeShift.id);

      setShowCloseModal(false);
      setClosingAmount("");
      setCloseNotes("");
      await fetchActiveShift();
    } catch (err) {
      window.alert(t("cash.error_close_shift"));
      console.error("closeShift error:", err);
    } finally {
      setCloseLoading(false);
    }
  }

  /* ── Expand history shift ── */

  async function toggleExpandShift(shiftId: string) {
    if (expandedShiftId === shiftId) {
      setExpandedShiftId(null);
      setExpandedMovements([]);
      return;
    }
    setExpandedShiftId(shiftId);

    const { data } = await supabase
      .from("cash_movements")
      .select("*, users!cash_movements_created_by_fkey(name)")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: false });

    setExpandedMovements(
      (data || []).map((m: any) => ({
        id: m.id,
        shift_id: m.shift_id,
        type: m.type,
        amount: m.amount,
        description: m.description,
        order_id: m.order_id,
        created_by: m.created_by,
        created_at: m.created_at,
        creator_name: m.users?.name ?? null,
      }))
    );
  }

  /* ── Difference display ── */

  const closingDiff = closingAmount
    ? parseFloat(closingAmount) - expectedCash
    : null;

  /* ── Summary cards config (active shift) ── */

  const summaryCards = [
    {
      label: "cash.cash_sales",
      value: formatCurrency(summary.cash_sales),
      icon: Banknote,
      color: "var(--success)",
    },
    {
      label: "cash.card_sales",
      value: formatCurrency(summary.card_sales),
      icon: CreditCard,
      color: "var(--info)",
    },
    {
      label: "cash.total_sales",
      value: formatCurrency(summary.total_sales),
      icon: TrendingUp,
      color: "var(--accent)",
    },
    {
      label: "cash.total_orders",
      value: summary.total_orders.toString(),
      icon: Receipt,
      color: "var(--text-primary)",
    },
    {
      label: "cash.tips",
      value: formatCurrency(summary.tips),
      icon: DollarSign,
      color: "#a855f7",
    },
    {
      label: "cash.expected",
      value: formatCurrency(expectedCash),
      icon: Lock,
      color: "var(--warning)",
    },
  ];

  /* ── Render ── */

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 16,
        }}
      >
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Title + Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1
          style={{
            color: "var(--text-primary)",
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
          }}
        >
          {t("cash.title")}
        </h1>

        <div style={{ display: "flex", gap: 4 }}>
          {(["daily_summary", "current", "history"] as const).map((tab) => {
            const tabIcon =
              tab === "daily_summary" ? CalendarDays :
              tab === "current" ? DollarSign : History;
            const TabIcon = tabIcon;
            const tabLabel =
              tab === "daily_summary" ? t("cash.daily_summary") :
              tab === "current" ? t("cash.title") : t("cash.history");
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background:
                    activeTab === tab ? "var(--accent)" : "var(--bg-card)",
                  color:
                    activeTab === tab ? "#000" : "var(--text-secondary)",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TabIcon size={14} />
                {tabLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════ DAILY SUMMARY TAB ══════════ */}
      {activeTab === "daily_summary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Header with date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <CalendarDays size={22} style={{ color: "var(--accent)" }} />
            <div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {t("cash.daily_summary")}
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {dailyLoading ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              {t("common.loading")}
            </div>
          ) : (
            <>
              {/* Summary Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 16,
                }}
              >
                {[
                  {
                    label: "cash.daily_revenue",
                    value: formatCurrency(dailySummary.totalRevenue),
                    icon: TrendingUp,
                    color: "var(--accent)",
                  },
                  {
                    label: "cash.daily_orders",
                    value: dailySummary.totalOrders.toString(),
                    icon: ShoppingCart,
                    color: "var(--text-primary)",
                  },
                  {
                    label: "cash.cash_sales",
                    value: formatCurrency(dailySummary.cashTotal),
                    icon: Banknote,
                    color: "var(--success)",
                  },
                  {
                    label: "cash.card_sales",
                    value: formatCurrency(dailySummary.cardTotal),
                    icon: CreditCard,
                    color: "var(--info)",
                  },
                  {
                    label: "cash.tips",
                    value: formatCurrency(dailySummary.tipsTotal),
                    icon: DollarSign,
                    color: "#a855f7",
                  },
                  {
                    label: "cash.daily_shifts",
                    value: `${dailySummary.shiftsClosed} / ${dailySummary.shiftsOpened}`,
                    icon: Lock,
                    color: "var(--warning)",
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Icon size={16} style={{ color: card.color }} />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          {t(card.label)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: card.color,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {card.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Shifts Table */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Clock size={18} style={{ color: "var(--text-muted)" }} />
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {t("cash.daily_shifts_table")}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      background: "var(--bg-secondary)",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    {dailySummary.shifts.length}
                  </span>
                </div>

                {dailySummary.shifts.length === 0 ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 14,
                    }}
                  >
                    {t("cash.no_shifts_today")}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 14,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {[
                            "cash.daily_opened",
                            "cash.daily_closed",
                            "cash.opening_amount",
                            "cash.closing_amount",
                            "cash.difference",
                            "cash.total_orders",
                            "cash.total_sales",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 16px",
                                textAlign: "left",
                                color: "var(--text-muted)",
                                fontWeight: 500,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dailySummary.shifts.map((shift) => {
                          const diff = shift.difference ?? 0;
                          const diffColor =
                            shift.status !== "closed"
                              ? "var(--text-muted)"
                              : Math.abs(diff) < 0.01
                              ? "var(--success)"
                              : "var(--danger)";
                          return (
                            <tr
                              key={shift.id}
                              style={{
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "10px 16px",
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatDate(shift.opened_at, {
                                  timeStyle: "short",
                                })}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {shift.closed_at
                                  ? formatDate(shift.closed_at, {
                                      timeStyle: "short",
                                    })
                                  : (
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: "rgba(34,197,94,0.15)",
                                        color: "var(--success)",
                                      }}
                                    >
                                      {t("cash.daily_open_now")}
                                    </span>
                                  )}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {formatCurrency(shift.opening_amount)}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {shift.closing_amount != null
                                  ? formatCurrency(shift.closing_amount)
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color: diffColor,
                                }}
                              >
                                {shift.status === "closed"
                                  ? `${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                  textAlign: "center",
                                }}
                              >
                                {shift.total_orders}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color: "var(--accent)",
                                }}
                              >
                                {formatCurrency(shift.total_sales)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Total Acumulado row */}
                        <tr
                          style={{
                            borderTop: "2px solid var(--border)",
                            background: "var(--bg-secondary)",
                          }}
                        >
                          <td
                            colSpan={2}
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              fontSize: 14,
                              color: "var(--text-primary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {t("cash.daily_total")}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            {formatCurrency(
                              dailySummary.shifts.reduce(
                                (s, sh) => s + sh.opening_amount,
                                0
                              )
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            {formatCurrency(
                              dailySummary.shifts
                                .filter((sh) => sh.closing_amount != null)
                                .reduce(
                                  (s, sh) => s + (sh.closing_amount ?? 0),
                                  0
                                )
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              color: (() => {
                                const totalDiff = dailySummary.shifts
                                  .filter((sh) => sh.status === "closed")
                                  .reduce(
                                    (s, sh) => s + (sh.difference ?? 0),
                                    0
                                  );
                                return Math.abs(totalDiff) < 0.01
                                  ? "var(--success)"
                                  : "var(--danger)";
                              })(),
                            }}
                          >
                            {(() => {
                              const totalDiff = dailySummary.shifts
                                .filter((sh) => sh.status === "closed")
                                .reduce(
                                  (s, sh) => s + (sh.difference ?? 0),
                                  0
                                );
                              return `${totalDiff >= 0 ? "+" : ""}${formatCurrency(totalDiff)}`;
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              color: "var(--text-primary)",
                              textAlign: "center",
                            }}
                          >
                            {dailySummary.shifts.reduce(
                              (s, sh) => s + sh.total_orders,
                              0
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontWeight: 700,
                              color: "var(--accent)",
                            }}
                          >
                            {formatCurrency(
                              dailySummary.shifts.reduce(
                                (s, sh) => s + sh.total_sales,
                                0
                              )
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ CURRENT TAB ══════════ */}
      {activeTab === "current" && (
        <>
          {/* ── No Active Shift: Open Shift Screen ── */}
          {!activeShift && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                padding: 60,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                maxWidth: 480,
                margin: "60px auto",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Unlock size={36} style={{ color: "var(--success)" }} />
              </div>

              <div style={{ textAlign: "center" }}>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "0 0 8px",
                  }}
                >
                  {t("cash.no_shift")}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    margin: 0,
                  }}
                >
                  {t("cash.open_shift")}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  width: "100%",
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("cash.opening_amount")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    padding: "14px 18px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: 22,
                    fontWeight: 700,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>

              <button
                onClick={handleOpenShift}
                disabled={openLoading || !openingAmount}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--success, #22c55e)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor:
                    openLoading || !openingAmount
                      ? "not-allowed"
                      : "pointer",
                  opacity: openLoading || !openingAmount ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s",
                }}
              >
                <Unlock size={20} />
                {openLoading ? t("common.loading") : t("cash.open_shift")}
              </button>
            </div>
          )}

          {/* ── Active Shift Dashboard ── */}
          {activeShift && (
            <>
              {/* Shift info bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  padding: "12px 20px",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: 12,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "var(--success, #22c55e)",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {t("cash.shift_open_since")}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatDate(activeShift.opened_at)}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}
                  >
                    <Clock size={14} />
                    {elapsed}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("cash.opening_amount")}:{" "}
                  <span style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(activeShift.opening_amount)}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {summaryCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Icon size={16} style={{ color: card.color }} />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          {t(card.label)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: card.color,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {card.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => {
                    setMovementType("cash_in");
                    setMovementAmount("");
                    setMovementDesc("");
                    setShowMovementModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--info, #3b82f6)",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <ArrowDownCircle size={18} />
                  {t("cash.cash_in")}
                </button>

                <button
                  onClick={() => {
                    setMovementType("cash_out");
                    setMovementAmount("");
                    setMovementDesc("");
                    setShowMovementModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--warning, #f59e0b)",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <ArrowUpCircle size={18} />
                  {t("cash.cash_out")}
                </button>

                <div style={{ flex: 1 }} />

                <button
                  onClick={() => {
                    setClosingAmount("");
                    setCloseNotes("");
                    setShowCloseModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 22px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--danger, #ef4444)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <Lock size={16} />
                  {t("cash.close_shift")}
                </button>
              </div>

              {/* Movements Table */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Receipt size={18} style={{ color: "var(--text-muted)" }} />
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {t("cash.movements")}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      background: "var(--bg-secondary)",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    {movements.length}
                  </span>
                </div>

                {movements.length === 0 ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 14,
                    }}
                  >
                    {t("cash.no_movements")}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 14,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {[
                            "cash.type",
                            "cash.amount",
                            "cash.description",
                            "common.time",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 16px",
                                textAlign: "left",
                                color: "var(--text-muted)",
                                fontWeight: 500,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => {
                          const badge = movementTypeBadge(m.type);
                          return (
                            <tr
                              key={m.id}
                              style={{
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              <td style={{ padding: "10px 16px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: badge.bg,
                                    color: badge.color,
                                  }}
                                >
                                  {t(`cash.type_${m.type}`)}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color:
                                    m.amount < 0
                                      ? "var(--danger)"
                                      : "var(--success)",
                                }}
                              >
                                {m.amount >= 0 ? "+" : ""}
                                {formatCurrency(m.amount)}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {m.description || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px 16px",
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatDate(m.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════ HISTORY TAB ══════════ */}
      {activeTab === "history" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {historyShifts.length === 0 && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 14,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            >
              {t("cash.no_history")}
            </div>
          )}

          {historyShifts.map((shift) => {
            const isExpanded = expandedShiftId === shift.id;
            const diff = shift.difference ?? 0;
            const diffColor =
              Math.abs(diff) < 0.01
                ? "var(--success)"
                : "var(--danger)";

            return (
              <div
                key={shift.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Shift header row */}
                <button
                  onClick={() => toggleExpandShift(shift.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Lock
                      size={16}
                      style={{ color: "var(--text-muted)" }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatDate(shift.opened_at, {
                        dateStyle: "medium",
                      })}
                    </span>
                    {shift.closed_at && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        {formatDate(shift.opened_at, {
                          timeStyle: "short",
                        })}{" "}
                        -{" "}
                        {formatDate(shift.closed_at, {
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          display: "block",
                        }}
                      >
                        {t("cash.total_sales")}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--accent)",
                        }}
                      >
                        {formatCurrency(shift.total_sales ?? 0)}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          display: "block",
                        }}
                      >
                        {t("cash.total_orders")}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {shift.total_orders ?? 0}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          display: "block",
                        }}
                      >
                        {t("cash.difference")}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: diffColor,
                        }}
                      >
                        {diff >= 0 ? "+" : ""}
                        {formatCurrency(diff)}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp
                        size={18}
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      <ChevronDown
                        size={18}
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    {/* Breakdown grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(150px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {[
                        {
                          label: "cash.opening_amount",
                          value: formatCurrency(
                            shift.opening_amount ?? 0
                          ),
                        },
                        {
                          label: "cash.closing_amount",
                          value: formatCurrency(
                            shift.closing_amount ?? 0
                          ),
                        },
                        {
                          label: "cash.expected",
                          value: formatCurrency(
                            shift.expected_amount ?? 0
                          ),
                        },
                        {
                          label: "cash.cash_sales",
                          value: formatCurrency(
                            shift.cash_sales ?? 0
                          ),
                        },
                        {
                          label: "cash.card_sales",
                          value: formatCurrency(
                            shift.card_sales ?? 0
                          ),
                        },
                        {
                          label: "cash.total_sales",
                          value: formatCurrency(
                            shift.total_sales ?? 0
                          ),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          style={{
                            background: "var(--bg-secondary)",
                            borderRadius: 8,
                            padding: "10px 14px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              display: "block",
                              marginBottom: 4,
                            }}
                          >
                            {t(item.label)}
                          </span>
                          <span
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {shift.notes && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                          padding: "8px 14px",
                          background: "var(--bg-secondary)",
                          borderRadius: 8,
                        }}
                      >
                        {shift.notes}
                      </div>
                    )}

                    {/* Movement list for this shift */}
                    {expandedMovements.length > 0 && (
                      <div>
                        <h4
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            margin: "0 0 8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t("cash.movements")}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {expandedMovements.map((m) => {
                            const badge = movementTypeBadge(m.type);
                            return (
                              <div
                                key={m.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "8px 12px",
                                  background: "var(--bg-secondary)",
                                  borderRadius: 8,
                                  fontSize: 13,
                                }}
                              >
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: badge.bg,
                                    color: badge.color,
                                  }}
                                >
                                  {t(`cash.type_${m.type}`)}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color:
                                      m.amount < 0
                                        ? "var(--danger)"
                                        : "var(--success)",
                                    minWidth: 70,
                                  }}
                                >
                                  {m.amount >= 0 ? "+" : ""}
                                  {formatCurrency(m.amount)}
                                </span>
                                <span
                                  style={{
                                    flex: 1,
                                    color:
                                      "var(--text-secondary)",
                                  }}
                                >
                                  {m.description || "—"}
                                </span>
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatDate(m.created_at, {
                                    timeStyle: "short",
                                  })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ CLOSE SHIFT MODAL ══════════ */}
      {showCloseModal && (
        <ModalBackdrop onClose={() => setShowCloseModal(false)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <AlertTriangle
                size={22}
                style={{ color: "var(--warning)" }}
              />
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {t("cash.close_shift")}
              </h2>
            </div>
            <button
              onClick={() => setShowCloseModal(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Summary breakdown */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 16,
              background: "var(--bg-secondary)",
              borderRadius: 10,
            }}
          >
            {[
              {
                label: "cash.opening_amount",
                value: activeShift?.opening_amount ?? 0,
              },
              {
                label: "cash.cash_sales",
                value: summary.cash_sales,
                sign: "+",
              },
              { label: "cash.tips", value: summary.tips, sign: "+" },
              {
                label: "cash.cash_in",
                value: summary.cash_in,
                sign: "+",
              },
              {
                label: "cash.cash_out",
                value: summary.cash_out,
                sign: "-",
              },
              {
                label: "cash.refunds",
                value: summary.refunds,
                sign: "-",
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {row.sign ? `${row.sign} ` : ""}
                  {t(row.label)}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {formatCurrency(row.value)}
                </span>
              </div>
            ))}

            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 8,
                marginTop: 4,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {t("cash.expected")}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--accent)",
                }}
              >
                {formatCurrency(expectedCash)}
              </span>
            </div>
          </div>

          {/* Actual cash input */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("cash.actual")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              placeholder="0.00"
              style={{
                padding: "14px 18px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 22,
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
              }}
            />
          </div>

          {/* Difference indicator */}
          {closingDiff !== null && !isNaN(closingDiff) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 10,
                background:
                  Math.abs(closingDiff) < 0.01
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(239,68,68,0.12)",
                border: `1px solid ${
                  Math.abs(closingDiff) < 0.01
                    ? "rgba(34,197,94,0.3)"
                    : "rgba(239,68,68,0.3)"
                }`,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {t("cash.difference")}:
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color:
                    Math.abs(closingDiff) < 0.01
                      ? "var(--success)"
                      : "var(--danger)",
                }}
              >
                {closingDiff >= 0 ? "+" : ""}
                {formatCurrency(closingDiff)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("cash.notes")}
            </label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={3}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setShowCloseModal(false)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleCloseShift}
              disabled={closeLoading || !closingAmount}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--danger, #ef4444)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor:
                  closeLoading || !closingAmount
                    ? "not-allowed"
                    : "pointer",
                opacity: closeLoading || !closingAmount ? 0.5 : 1,
              }}
            >
              {closeLoading
                ? t("common.loading")
                : t("cash.confirm_close")}
            </button>
          </div>
        </ModalBackdrop>
      )}

      {/* ══════════ CASH MOVEMENT MODAL ══════════ */}
      {showMovementModal && (
        <ModalBackdrop onClose={() => setShowMovementModal(false)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              {movementType === "cash_in" ? (
                <ArrowDownCircle
                  size={22}
                  style={{ color: "var(--info, #3b82f6)" }}
                />
              ) : (
                <ArrowUpCircle
                  size={22}
                  style={{ color: "var(--warning, #f59e0b)" }}
                />
              )}
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {t(
                  movementType === "cash_in"
                    ? "cash.cash_in"
                    : "cash.cash_out"
                )}
              </h2>
            </div>
            <button
              onClick={() => setShowMovementModal(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Amount */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("cash.amount")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0.00"
              style={{
                padding: "14px 18px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 22,
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
              }}
            />
          </div>

          {/* Description */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("cash.description")}
            </label>
            <input
              type="text"
              value={movementDesc}
              onChange={(e) => setMovementDesc(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setShowMovementModal(false)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleAddMovement}
              disabled={movementLoading || !movementAmount}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
                cursor:
                  movementLoading || !movementAmount
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  movementLoading || !movementAmount ? 0.5 : 1,
              }}
            >
              {movementLoading
                ? t("common.loading")
                : t("common.confirm")}
            </button>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}
