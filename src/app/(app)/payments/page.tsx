"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Download,
  RotateCcw,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

interface Payment {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  tip: number;
  status: string;
  received_by: string | null;
  created_at: string;
  order_number: string | null;
  receiver_name: string | null;
}

interface Summary {
  total_today: number;
  tips_today: number;
  cash_total: number;
  card_total: number;
  transactions: number;
  refunds_today: number;
}

interface UnpaidOrder {
  id: string;
  order_number: string;
  total: number;
}

/* ── Constants ────────────────────────────────────────── */

const PAGE_SIZE = 20;

const DATE_RANGES = [
  { key: "today", label: "payments.today" },
  { key: "week", label: "payments.this_week" },
  { key: "month", label: "payments.this_month" },
] as const;

const METHOD_FILTERS = [
  { key: "all", label: "common.all" },
  { key: "cash", label: "payments.cash" },
  { key: "card", label: "payments.card" },
] as const;

type DateRange = (typeof DATE_RANGES)[number]["key"];
type MethodFilter = (typeof METHOD_FILTERS)[number]["key"];

/* ── Helpers ──────────────────────────────────────────── */

function getDateFrom(range: DateRange): string {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (range === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
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
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────────── */

export default function PaymentsPage() {
  const { t } = useI18n();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const manualPayingRef = useRef(false);

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_today: 0,
    tips_today: 0,
    cash_total: 0,
    card_total: 0,
    transactions: 0,
    refunds_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Refund modal
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  // Manual payment modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([]);
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualMethod, setManualMethod] = useState("cash");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Resolve tenant
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const dateFrom = getDateFrom(dateRange);

      /* ── Summary (always "today") ── */
      const todayStart = getDateFrom("today");

      const { data: summaryRows } = await supabase
        .from("payments")
        .select("method, amount, tip_amount, status")
        .eq("tenant_id", tenantId)
        .gte("created_at", todayStart);

      if (summaryRows) {
        const completed = summaryRows.filter((r) => r.status !== "refunded" && r.method !== "refund");
        const refunds = summaryRows.filter((r) => r.method === "refund");
        setSummary({
          total_today: completed.reduce((s, r) => s + (r.amount || 0), 0),
          tips_today: completed.reduce((s, r) => s + (r.tip_amount || 0), 0),
          cash_total: completed
            .filter((r) => r.method === "cash")
            .reduce((s, r) => s + (r.amount || 0), 0),
          card_total: completed
            .filter((r) => r.method === "card")
            .reduce((s, r) => s + (r.amount || 0), 0),
          transactions: summaryRows.length,
          refunds_today: refunds.reduce((s, r) => s + Math.abs(r.amount || 0), 0),
        });
      }

      /* ── Payments list (filtered) ── */
      let query = supabase
        .from("payments")
        .select(
          "id, order_id, method, amount, tip_amount, status, received_by, created_at, orders!inner(order_number), users!payments_received_by_fkey(name)",
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .gte("created_at", dateFrom)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (methodFilter !== "all") {
        query = query.eq("method", methodFilter);
      }

      const { data: rows, count } = await query;

      if (rows) {
        setPayments(
          rows.map((r: any) => ({
            id: r.id,
            order_id: r.order_id,
            method: r.method,
            amount: r.amount,
            tip: r.tip_amount ?? 0,
            status: r.status,
            received_by: r.received_by,
            created_at: r.created_at,
            order_number: r.orders?.order_number ?? null,
            receiver_name: r.users?.name ?? null,
          }))
        );
      }
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateRange, methodFilter, page, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [dateRange, methodFilter]);

  /* ── Refund action ── */

  async function handleRefund() {
    if (!refundTarget || !tenantId) return;
    setRefundLoading(true);
    try {
      // Insert refund payment with negative amount
      await supabase.from("payments").insert({
        tenant_id: tenantId,
        order_id: refundTarget.order_id,
        method: "refund",
        amount: -Math.abs(refundTarget.amount),
        tip_amount: 0,
        status: "refunded",
        received_by: userId,
        reference: refundReason || null,
      });

      // Update original payment status
      await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("id", refundTarget.id);

      // Update order status — only allowed from closed due to state machine trigger
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", refundTarget.order_id)
        .single();
      if (currentOrder?.status === "closed") {
        await supabase
          .from("orders")
          .update({ status: "refunded" })
          .eq("id", refundTarget.order_id);
      }

      setRefundTarget(null);
      setRefundReason("");
      fetchData();
    } catch (err) {
      window.alert(`Error inesperado al procesar el reembolso. Inténtalo de nuevo.`);
      console.error("Refund error:", err);
    } finally {
      setRefundLoading(false);
    }
  }

  /* ── Manual payment ── */

  async function openManualModal() {
    if (!tenantId) return;
    setShowManualModal(true);
    setManualOrderId("");
    setManualMethod("cash");
    setManualAmount("");
    setManualNotes("");

    // Fetch unpaid orders
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "preparing", "ready", "served"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Filter to orders without a completed payment
      const orderIds = data.map((o: any) => o.id);
      const { data: paidPayments } = await supabase
        .from("payments")
        .select("order_id")
        .in("order_id", orderIds)
        .neq("status", "refunded");

      const paidOrderIds = new Set((paidPayments || []).map((p: any) => p.order_id));
      setUnpaidOrders(
        data
          .filter((o: any) => !paidOrderIds.has(o.id))
          .map((o: any) => ({
            id: o.id,
            order_number: o.order_number,
            total: o.total || 0,
          }))
      );
    }
  }

  async function handleManualPayment() {
    if (!tenantId || !manualOrderId || !manualAmount) return;
    if (manualPayingRef.current) return;
    manualPayingRef.current = true;

    const parsedAmount = parseFloat(manualAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      window.alert("Payment amount must be a positive number");
      manualPayingRef.current = false;
      return;
    }

    const selectedOrder = unpaidOrders.find((o) => o.id === manualOrderId);
    if (selectedOrder && parsedAmount < selectedOrder.total) {
      window.alert(
        `Payment amount must be at least the order total (${formatCurrency(selectedOrder.total)})`
      );
      manualPayingRef.current = false;
      return;
    }

    setManualLoading(true);
    try {
      await supabase.from("payments").insert({
        tenant_id: tenantId,
        order_id: manualOrderId,
        method: manualMethod,
        amount: parsedAmount,
        tip_amount: 0,
        status: "completed",
        received_by: userId,
        reference: manualNotes || null,
      });

      // Update order status to completed/paid
      await supabase
        .from("orders")
        .update({ status: "closed" })
        .eq("id", manualOrderId);

      setShowManualModal(false);
      fetchData();
    } catch (err) {
      window.alert("Error inesperado al registrar el pago. Inténtalo de nuevo.");
      console.error("Manual payment error:", err);
    } finally {
      manualPayingRef.current = false;
      setManualLoading(false);
    }
  }

  /* ── Export CSV ── */

  function exportCsv() {
    if (payments.length === 0) return;

    const headers = [
      t("payments.date"),
      t("payments.order"),
      t("payments.method"),
      t("payments.amount"),
      t("payments.tip"),
      t("payments.status"),
      t("payments.received_by"),
    ];

    const rows = payments.map((p) => [
      formatDate(p.created_at),
      p.order_number ?? "",
      p.method,
      p.amount.toFixed(2),
      p.tip.toFixed(2),
      p.status,
      p.receiver_name ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /* ── Summary cards config ── */
  const summaryCards = [
    {
      label: "payments.total_today",
      value: formatCurrency(summary.total_today),
      color: "var(--accent)",
    },
    {
      label: "payments.tips_today",
      value: formatCurrency(summary.tips_today),
      color: "var(--warning)",
    },
    {
      label: "payments.cash_total",
      value: formatCurrency(summary.cash_total),
      sub: t("payments.cash"),
      color: "var(--success)",
    },
    {
      label: "payments.card_total",
      value: formatCurrency(summary.card_total),
      sub: t("payments.card"),
      color: "var(--info)",
    },
    {
      label: "payments.refunds_today",
      value: formatCurrency(summary.refunds_today),
      color: "var(--danger)",
    },
    {
      label: "payments.transactions",
      value: summary.transactions.toString(),
      color: "var(--text-primary)",
    },
  ];

  /* ── Method badge helper ── */
  function methodBadge(method: string) {
    if (method === "refund") {
      return { bg: "rgba(239,68,68,0.15)", color: "var(--danger)", label: t("payments.refund") };
    }
    if (method === "cash") {
      return { bg: "rgba(34,197,94,0.15)", color: "var(--success)", label: t("payments.cash") };
    }
    return { bg: "rgba(59,130,246,0.15)", color: "var(--info)", label: t("payments.card") };
  }

  /* ── Render ── */
  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Title + Actions row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            color: "var(--text-primary)",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {t("payments.title")}
        </h1>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Manual payment button */}
          <button
            onClick={openManualModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--accent)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            {t("payments.manual_payment")}
          </button>

          {/* Export CSV button */}
          <button
            onClick={exportCsv}
            disabled={payments.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: payments.length === 0 ? "var(--text-muted)" : "var(--text-primary)",
              fontWeight: 600,
              fontSize: 13,
              cursor: payments.length === 0 ? "not-allowed" : "pointer",
              opacity: payments.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={16} />
            {t("payments.export_csv")}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
        className="max-md:!grid-cols-2"
      >
        {summaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              {t(card.label)}
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: card.color,
                letterSpacing: "-0.02em",
              }}
            >
              {loading ? "..." : card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Date range pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.key}
              onClick={() => setDateRange(dr.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background:
                  dateRange === dr.key ? "var(--accent)" : "var(--bg-card)",
                color:
                  dateRange === dr.key ? "#000" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {t(dr.label)}
            </button>
          ))}
        </div>

        {/* Method pills */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginLeft: 8,
          }}
        >
          {METHOD_FILTERS.map((mf) => (
            <button
              key={mf.key}
              onClick={() => setMethodFilter(mf.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background:
                  methodFilter === mf.key ? "var(--accent)" : "var(--bg-card)",
                color:
                  methodFilter === mf.key ? "#000" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {t(mf.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  "payments.date",
                  "payments.order",
                  "payments.method",
                  "payments.amount",
                  "payments.tip",
                  "payments.status",
                  "payments.received_by",
                  "payments.actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
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
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("common.loading")}
                  </td>
                </tr>
              )}

              {!loading && payments.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("payments.no_payments")}
                  </td>
                </tr>
              )}

              {!loading &&
                payments.map((p) => {
                  const badge = methodBadge(p.method);
                  const canRefund = p.status !== "refunded" && p.method !== "refund" && p.amount > 0;

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      {/* Date */}
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(p.created_at)}
                      </td>

                      {/* Order # */}
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {p.order_number ?? "—"}
                      </td>

                      {/* Method badge */}
                      <td style={{ padding: "12px 16px" }}>
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
                          {badge.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: "12px 16px",
                          color: p.amount < 0 ? "var(--danger)" : "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Tip */}
                      <td
                        style={{
                          padding: "12px 16px",
                          color:
                            p.tip > 0
                              ? "var(--warning)"
                              : "var(--text-muted)",
                          fontWeight: p.tip > 0 ? 600 : 400,
                        }}
                      >
                        {p.tip > 0 ? formatCurrency(p.tip) : "—"}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              p.status === "refunded"
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(34,197,94,0.15)",
                            color:
                              p.status === "refunded"
                                ? "var(--danger)"
                                : "var(--success)",
                          }}
                        >
                          {t(
                            p.status === "refunded"
                              ? "payments.refunded"
                              : "payments.completed"
                          )}
                        </span>
                      </td>

                      {/* Received by */}
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {p.receiver_name ?? "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px" }}>
                        {canRefund && (
                          <button
                            onClick={() => {
                              setRefundTarget(p);
                              setRefundReason("");
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--danger)",
                              background: "rgba(239,68,68,0.1)",
                              color: "var(--danger)",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <RotateCcw size={12} />
                            {t("payments.refund")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              {t("payments.page_of")
                .replace("{page}", String(page + 1))
                .replace("{total}", String(totalPages))}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  background: "var(--bg-card)",
                  color:
                    page === 0
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  opacity: page === 0 ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {t("payments.prev")}
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                  cursor:
                    page >= totalPages - 1 ? "not-allowed" : "pointer",
                  background: "var(--bg-card)",
                  color:
                    page >= totalPages - 1
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  opacity: page >= totalPages - 1 ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {t("payments.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Refund Modal ── */}
      {refundTarget && (
        <ModalBackdrop onClose={() => setRefundTarget(null)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={22} style={{ color: "var(--danger)" }} />
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {t("payments.refund_confirm_title")}
              </h2>
            </div>
            <button
              onClick={() => setRefundTarget(null)}
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

          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {t("payments.refund_confirm_text")}{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              #{refundTarget.order_number}
            </strong>{" "}
            — {formatCurrency(refundTarget.amount)}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("payments.refund_reason")}
            </label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder={t("payments.refund_reason_placeholder")}
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

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => setRefundTarget(null)}
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
              onClick={handleRefund}
              disabled={refundLoading}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--danger)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: refundLoading ? "not-allowed" : "pointer",
                opacity: refundLoading ? 0.6 : 1,
              }}
            >
              {refundLoading ? t("common.loading") : t("payments.confirm_refund")}
            </button>
          </div>
        </ModalBackdrop>
      )}

      {/* ── Manual Payment Modal ── */}
      {showManualModal && (
        <ModalBackdrop onClose={() => setShowManualModal(false)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {t("payments.manual_payment")}
            </h2>
            <button
              onClick={() => setShowManualModal(false)}
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

          {/* Select order */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("payments.select_order")}
            </label>
            <select
              value={manualOrderId}
              onChange={(e) => {
                setManualOrderId(e.target.value);
                const order = unpaidOrders.find((o) => o.id === e.target.value);
                if (order) setManualAmount(order.total.toFixed(2));
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
              }}
            >
              <option value="">{t("payments.select_order_placeholder")}</option>
              {unpaidOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.order_number} — {formatCurrency(o.total)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment method */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("payments.method")}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["cash", "card"].map((m) => (
                <button
                  key={m}
                  onClick={() => setManualMethod(m)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: manualMethod === m ? "var(--accent)" : "var(--border)",
                    background: manualMethod === m ? "var(--accent-soft)" : "var(--bg-secondary)",
                    color: manualMethod === m ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t(`payments.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("payments.amount")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
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

          {/* Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              {t("payments.notes")}
            </label>
            <input
              type="text"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder={t("payments.notes_placeholder")}
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

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowManualModal(false)}
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
              onClick={handleManualPayment}
              disabled={manualLoading || !manualOrderId || !manualAmount}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
                cursor:
                  manualLoading || !manualOrderId || !manualAmount
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  manualLoading || !manualOrderId || !manualAmount ? 0.5 : 1,
              }}
            >
              {manualLoading ? t("common.loading") : t("payments.record_payment")}
            </button>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}
