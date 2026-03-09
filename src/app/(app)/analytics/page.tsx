"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Users,
  Star,
  Gift,
  Megaphone,
  Award,
  ShieldAlert,
  Store,
  Percent,
  BarChart3,
  DollarSign,
  Clock,
  XCircle,
  Undo2,
  Trash2,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

type Period = "today" | "week" | "month" | "custom";

interface RawOrder {
  id: string;
  order_number: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total: number;
  payment_method: string | null;
  status: string;
  source: string | null;
  table_id: string | null;
  created_at: string;
}

interface FraudStats {
  cancelledCount: number;
  cancelledTotal: number;
  refundedCount: number;
  refundedTotal: number;
  voidedItems: number;
}

interface SourceBucket {
  source: string;
  total: number;
  count: number;
}

interface SourceTimeBucket {
  hour: number;
  restaurant: number;
  qr: number;
  takeaway: number;
  delivery: number;
}

interface RawOrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  menu_item_id: string | null;
}

interface HourBucket {
  hour: number;
  revenue: number;
}

interface DayBucket {
  day: number;
  orders: number;
}

interface PaymentBucket {
  method: string;
  total: number;
  count: number;
}

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
}

interface CategoryBucket {
  name: string;
  revenue: number;
  count: number;
}

interface LoyaltyStats {
  totalMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  rewardsRedeemedCount: number;
  activeCampaigns: number;
  topRewards: { title: string; count: number }[];
}

/* ── Helpers ──────────────────────────────────────────── */

function getDateRange(period: Period, customFrom?: string, customTo?: string): { since: string; until: string } {
  const now = new Date();
  let since: Date;
  const until = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === "custom" && customFrom && customTo) {
    return {
      since: new Date(customFrom + "T00:00:00").toISOString(),
      until: new Date(customTo + "T23:59:59.999").toISOString(),
    };
  }

  if (period === "today") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    since = new Date(now);
    since.setDate(now.getDate() - (dayOfWeek - 1));
    since.setHours(0, 0, 0, 0);
  } else {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { since: since.toISOString(), until: until.toISOString() };
}

function getPreviousDateRange(period: Period, customFrom?: string, customTo?: string): { since: string; until: string } {
  if (period === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    return {
      since: new Date(prevFrom.getFullYear(), prevFrom.getMonth(), prevFrom.getDate()).toISOString(),
      until: new Date(prevTo.getFullYear(), prevTo.getMonth(), prevTo.getDate(), 23, 59, 59, 999).toISOString(),
    };
  }

  const now = new Date();

  if (period === "today") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return {
      since: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString(),
      until: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString(),
    };
  }

  if (period === "week") {
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (dayOfWeek - 1));
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(thisMonday.getDate() - 7);
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(thisMonday.getDate() - 1);
    prevMonday.setHours(0, 0, 0, 0);
    prevSunday.setHours(23, 59, 59, 999);
    return { since: prevMonday.toISOString(), until: prevSunday.toISOString() };
  }

  // month
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { since: prevMonthStart.toISOString(), until: prevMonthEnd.toISOString() };
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Component ────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [prevOrders, setPrevOrders] = useState<RawOrder[]>([]);
  const [items, setItems] = useState<RawOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats>({
    totalMembers: 0,
    pointsIssued: 0,
    pointsRedeemed: 0,
    rewardsRedeemedCount: 0,
    activeCampaigns: 0,
    topRewards: [],
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBucket[]>([]);
  const [tablesTotal, setTablesTotal] = useState(0);
  const [tablesOccupied, setTablesOccupied] = useState(0);
  const [fraudStats, setFraudStats] = useState<FraudStats>({ cancelledCount: 0, cancelledTotal: 0, refundedCount: 0, refundedTotal: 0, voidedItems: 0 });
  const [allOrdersIncCancelled, setAllOrdersIncCancelled] = useState<RawOrder[]>([]);

  /* ── Fetch data ─────────────────────────────────────── */

  useEffect(() => {
    // Don't fetch for custom period until both dates are set
    if (period === "custom" && (!customFrom || !customTo)) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile?.tenant_id) return;
        const tenantId = profile.tenant_id;

        const { since, until } = getDateRange(period, customFrom, customTo);
        const prev = getPreviousDateRange(period, customFrom, customTo);

        // Fetch current orders, previous orders, order_items in parallel
        const [ordersRes, prevOrdersRes, itemsRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, order_number, subtotal, tax_amount, discount_amount, tip_amount, total, payment_method, status, source, table_id, created_at")
            .eq("tenant_id", tenantId)
            .gte("created_at", since)
            .lte("created_at", until)
            .neq("status", "cancelled")
            .order("created_at", { ascending: true }),
          supabase
            .from("orders")
            .select("id, order_number, subtotal, tax_amount, discount_amount, tip_amount, total, payment_method, status, source, table_id, created_at")
            .eq("tenant_id", tenantId)
            .gte("created_at", prev.since)
            .lte("created_at", prev.until)
            .neq("status", "cancelled"),
          supabase
            .from("order_items")
            .select("name, quantity, unit_price, subtotal, menu_item_id, order_id, orders!inner(tenant_id, created_at, status)")
            .eq("orders.tenant_id", tenantId)
            .gte("orders.created_at", since)
            .lte("orders.created_at", until)
            .neq("orders.status", "cancelled"),
        ]);

        if (cancelled) return;

        setOrders((ordersRes.data as RawOrder[]) || []);
        setPrevOrders((prevOrdersRes.data as RawOrder[]) || []);
        setItems((itemsRes.data as RawOrderItem[]) || []);

        // ── Loyalty analytics ──
        const [membersRes, ledgerRes, campaignsRes, topRewardsRes] = await Promise.all([
          supabase
            .from("loyalty_customers")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
          supabase
            .from("loyalty_points_ledger")
            .select("points_delta, movement_type")
            .eq("tenant_id", tenantId)
            .gte("created_at", since)
            .lte("created_at", until),
          supabase
            .from("loyalty_campaigns")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("active", true)
            .lte("starts_at", new Date().toISOString())
            .gte("ends_at", new Date().toISOString()),
          supabase
            .from("loyalty_points_ledger")
            .select("reward_id, loyalty_rewards(title_en)")
            .eq("tenant_id", tenantId)
            .eq("movement_type", "redeem")
            .gte("created_at", since)
            .lte("created_at", until)
            .not("reward_id", "is", null),
        ]);

        if (cancelled) return;

        const ledgerRows = (ledgerRes.data || []) as { points_delta: number; movement_type: string }[];
        let pointsIssued = 0;
        let pointsRedeemed = 0;
        let rewardsRedeemedCount = 0;
        for (const row of ledgerRows) {
          if (row.points_delta > 0) pointsIssued += row.points_delta;
          if (row.points_delta < 0) pointsRedeemed += Math.abs(row.points_delta);
          if (row.movement_type === "redeem") rewardsRedeemedCount++;
        }

        // Top 5 redeemed rewards
        const rewardCountMap: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of (topRewardsRes.data || []) as any[]) {
          const title = row.loyalty_rewards?.title_en || "Unknown";
          rewardCountMap[title] = (rewardCountMap[title] || 0) + 1;
        }
        const topRewards = Object.entries(rewardCountMap)
          .map(([title, count]) => ({ title, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setLoyaltyStats({
          totalMembers: membersRes.count || 0,
          pointsIssued,
          pointsRedeemed,
          rewardsRedeemedCount,
          activeCampaigns: campaignsRes.count || 0,
          topRewards,
        });

        // ── Category breakdown ──
        // Get menu items with their categories
        const orderItemIds = ((itemsRes.data || []) as RawOrderItem[])
          .map((it) => (it as unknown as { menu_item_id: string | null }).menu_item_id)
          .filter(Boolean) as string[];

        if (orderItemIds.length > 0) {
          const uniqueIds = [...new Set(orderItemIds)];
          const { data: menuItemsData } = await supabase
            .from("menu_items")
            .select("id, category_id, menu_categories(name_en)")
            .eq("tenant_id", tenantId)
            .in("id", uniqueIds);

          if (!cancelled && menuItemsData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const catMap: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const mi of menuItemsData as any[]) {
              catMap[mi.id] = mi.menu_categories?.name_en || "Uncategorized";
            }

            const catRevenue: Record<string, { revenue: number; count: number }> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const it of (itemsRes.data || []) as any[]) {
              const catName = catMap[it.menu_item_id] || "Uncategorized";
              if (!catRevenue[catName]) catRevenue[catName] = { revenue: 0, count: 0 };
              catRevenue[catName].revenue += it.subtotal || it.unit_price * (it.quantity || 0);
              catRevenue[catName].count += it.quantity || 0;
            }

            setCategoryBreakdown(
              Object.entries(catRevenue)
                .map(([name, v]) => ({ name, ...v }))
                .sort((a, b) => b.revenue - a.revenue)
            );
          }
        } else {
          setCategoryBreakdown([]);
        }

        // ── Tables status (real-time) ──
        const [totalTablesRes, occupiedTablesRes] = await Promise.all([
          supabase
            .from("restaurant_tables")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("active", true),
          supabase
            .from("restaurant_tables")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("active", true)
            .eq("status", "occupied"),
        ]);
        if (!cancelled) {
          setTablesTotal(totalTablesRes.count || 0);
          setTablesOccupied(occupiedTablesRes.count || 0);
        }

        // ── Fraud stats (cancelled + refunded orders in period) ──
        const [cancelledRes, refundedRes, voidedRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, total")
            .eq("tenant_id", tenantId)
            .eq("status", "cancelled")
            .gte("created_at", since)
            .lte("created_at", until),
          supabase
            .from("orders")
            .select("id, total")
            .eq("tenant_id", tenantId)
            .eq("status", "refunded")
            .gte("created_at", since)
            .lte("created_at", until),
          supabase
            .from("order_items")
            .select("id, order_id, orders!inner(tenant_id, created_at)", { count: "exact", head: true })
            .eq("orders.tenant_id", tenantId)
            .gte("orders.created_at", since)
            .lte("orders.created_at", until)
            .eq("voided", true),
        ]);
        if (!cancelled) {
          const cancelledOrders = (cancelledRes.data || []) as { id: string; total: number }[];
          const refundedOrders = (refundedRes.data || []) as { id: string; total: number }[];
          setFraudStats({
            cancelledCount: cancelledOrders.length,
            cancelledTotal: cancelledOrders.reduce((s, o) => s + (o.total || 0), 0),
            refundedCount: refundedOrders.length,
            refundedTotal: refundedOrders.reduce((s, o) => s + (o.total || 0), 0),
            voidedItems: voidedRes.count || 0,
          });
        }

        // ── All orders including cancelled (for source breakdown) ──
        const { data: allOrdData } = await supabase
          .from("orders")
          .select("id, order_number, subtotal, tax_amount, discount_amount, tip_amount, total, payment_method, status, source, table_id, created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", since)
          .lte("created_at", until)
          .order("created_at", { ascending: true });
        if (!cancelled) {
          setAllOrdersIncCancelled((allOrdData as RawOrder[]) || []);
        }
      } catch {
        // silently keep empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, customFrom, customTo]);

  /* ── Computed analytics ─────────────────────────────── */

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (o.total || 0), 0), [orders]);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalTips = useMemo(() => orders.reduce((s, o) => s + (o.tip_amount || 0), 0), [orders]);

  // Previous period values for comparison
  const prevTotalRevenue = useMemo(() => prevOrders.reduce((s, o) => s + (o.total || 0), 0), [prevOrders]);
  const prevTotalOrders = prevOrders.length;
  const prevAvgTicket = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
  const prevTotalTips = useMemo(() => prevOrders.reduce((s, o) => s + (o.tip_amount || 0), 0), [prevOrders]);

  // Revenue by hour
  const byHour: HourBucket[] = useMemo(() => {
    const map: Record<number, number> = {};
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      map[h] = (map[h] || 0) + (o.total || 0);
    });
    return Object.entries(map)
      .map(([h, revenue]) => ({ hour: Number(h), revenue }))
      .sort((a, b) => a.hour - b.hour);
  }, [orders]);

  const maxHourRevenue = useMemo(() => Math.max(...byHour.map((b) => b.revenue), 1), [byHour]);

  // Orders by day of week
  const byDay: DayBucket[] = useMemo(() => {
    const map: Record<number, number> = {};
    orders.forEach((o) => {
      const jsDay = new Date(o.created_at).getDay(); // 0=Sun
      const isoDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon
      map[isoDay] = (map[isoDay] || 0) + 1;
    });
    return Array.from({ length: 7 }, (_, i) => ({ day: i, orders: map[i] || 0 }));
  }, [orders]);

  const maxDayOrders = useMemo(() => Math.max(...byDay.map((b) => b.orders), 1), [byDay]);

  // Payment method breakdown
  const byMethod: PaymentBucket[] = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    orders.forEach((o) => {
      const method = o.payment_method || "other";
      if (!map[method]) map[method] = { total: 0, count: 0 };
      map[method].total += o.total || 0;
      map[method].count += 1;
    });
    return Object.entries(map)
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [orders]);

  const totalMethodRevenue = useMemo(() => byMethod.reduce((s, b) => s + b.total, 0), [byMethod]);

  // Top selling items
  const topItems: TopItem[] = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    items.forEach((it) => {
      const key = it.name || "\u2014";
      if (!map[key]) map[key] = { qty: 0, revenue: 0 };
      map[key].qty += it.quantity || 0;
      map[key].revenue += it.subtotal || it.unit_price * (it.quantity || 0);
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [items]);

  // Category breakdown max
  const maxCategoryRevenue = useMemo(
    () => Math.max(...categoryBreakdown.map((c) => c.revenue), 1),
    [categoryBreakdown]
  );

  // ── Financial breakdown ──
  const grossSales = useMemo(() => orders.reduce((s, o) => s + (o.subtotal || 0), 0), [orders]);
  const totalDiscounts = useMemo(() => orders.reduce((s, o) => s + (o.discount_amount || 0), 0), [orders]);
  const totalTaxes = useMemo(() => orders.reduce((s, o) => s + (o.tax_amount || 0), 0), [orders]);
  const taxBase = grossSales - totalDiscounts;
  const netSales = taxBase;

  // ── Revenue by source ──
  const bySource: SourceBucket[] = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    orders.forEach((o) => {
      const src = o.source || "pos";
      if (!map[src]) map[src] = { total: 0, count: 0 };
      map[src].total += o.total || 0;
      map[src].count += 1;
    });
    return Object.entries(map)
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [orders]);

  const totalSourceRevenue = useMemo(() => bySource.reduce((s, b) => s + b.total, 0), [bySource]);

  // ── Revenue by source over time (hourly) ──
  const sourceTimeline: SourceTimeBucket[] = useMemo(() => {
    const map: Record<number, { restaurant: number; qr: number; takeaway: number; delivery: number }> = {};
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      if (!map[h]) map[h] = { restaurant: 0, qr: 0, takeaway: 0, delivery: 0 };
      const src = o.source || "pos";
      if (src === "qr") map[h].qr += o.total || 0;
      else if (src === "takeaway") map[h].takeaway += o.total || 0;
      else if (src === "delivery") map[h].delivery += o.total || 0;
      else map[h].restaurant += o.total || 0;
    });
    return Object.entries(map)
      .map(([h, v]) => ({ hour: Number(h), ...v }))
      .sort((a, b) => a.hour - b.hour);
  }, [orders]);

  const maxSourceTimeline = useMemo(() => {
    let max = 1;
    sourceTimeline.forEach((b) => {
      max = Math.max(max, b.restaurant, b.qr, b.takeaway, b.delivery);
    });
    return max;
  }, [sourceTimeline]);

  // ── Promotions (orders with discounts) ──
  const promoStats = useMemo(() => {
    const discountedOrders = orders.filter((o) => (o.discount_amount || 0) > 0);
    const totalDisc = discountedOrders.reduce((s, o) => s + (o.discount_amount || 0), 0);
    return {
      count: discountedOrders.length,
      total: totalDisc,
      avg: discountedOrders.length > 0 ? totalDisc / discountedOrders.length : 0,
    };
  }, [orders]);

  // ── Open bills (non-closed dine-in orders) ──
  const openBills = useMemo(() => {
    return allOrdersIncCancelled.filter((o) =>
      o.status !== "closed" && o.status !== "cancelled" && o.status !== "refunded" && o.table_id
    );
  }, [allOrdersIncCancelled]);

  const pendingTotal = useMemo(() => openBills.reduce((s, o) => s + (o.total || 0), 0), [openBills]);

  // Source color map
  const SOURCE_COLORS: Record<string, string> = {
    restaurant: "var(--accent)",
    pos: "var(--accent)",
    qr: "#3b82f6",
    takeaway: "#8b5cf6",
    delivery: "#ec4899",
  };

  /* ── CSV Export ─────────────────────────────────────── */

  const handleExportCSV = useCallback(() => {
    const headers = ["date", "order_number", "subtotal", "tax", "discount", "tip", "total", "payment_method", "status"];
    const rows = orders.map((o) => [
      new Date(o.created_at).toISOString().split("T")[0],
      o.order_number ?? "",
      (o.subtotal ?? 0).toFixed(2),
      (o.tax_amount ?? 0).toFixed(2),
      (o.discount_amount ?? 0).toFixed(2),
      (o.tip_amount ?? 0).toFixed(2),
      (o.total ?? 0).toFixed(2),
      o.payment_method || "",
      o.status || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [orders, period]);

  /* ── Change indicator component ─────────────────────── */

  function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
    const change = calcChange(current, previous);
    if (change === null) return null;
    const isPositive = change >= 0;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          fontSize: 12,
          fontWeight: 600,
          color: isPositive ? "var(--success)" : "var(--danger)",
          marginLeft: 6,
        }}
      >
        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  }

  /* ── Styles ─────────────────────────────────────────── */

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  const sectionStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: "16px 20px",
    borderBottom: "1px solid var(--border)",
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
    color: "var(--text-muted)",
    fontWeight: 500,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px",
    color: "var(--text-primary)",
  };

  const loyaltyCardStyle: React.CSSProperties = {
    ...cardStyle,
    gap: 6,
  };

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Header + Period Selector + Export */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
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
          {t("analytics.title")}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Period selector */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 4,
            }}
          >
            {(["today", "week", "month", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.15s",
                  background: period === p ? "var(--accent)" : "transparent",
                  color: period === p ? "#000" : "var(--text-muted)",
                }}
              >
                {t(`analytics.${p}`)}
              </button>
            ))}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={loading || orders.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              cursor: loading || orders.length === 0 ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              opacity: loading || orders.length === 0 ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            <Download size={16} />
            {t("analytics.export_csv")}
          </button>
        </div>
      </div>

      {/* Custom date range inputs */}
      {period === "custom" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <Calendar size={18} style={{ color: "var(--text-muted)" }} />
          <label style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
            {t("analytics.from")}
          </label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <label style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
            {t("analytics.to")}
          </label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      )}

      {/* ── ESTADO — Restaurant Status ─────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <Store size={20} style={{ color: "var(--accent)" }} />
          {t("analytics.status_title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="max-md:!grid-cols-2">
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.tables_occupied")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {loading ? "\u2014" : `${tablesOccupied} / ${tablesTotal}`}
            </span>
            {!loading && tablesTotal > 0 && (
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${(tablesOccupied / tablesTotal) * 100}%`, height: "100%", borderRadius: 3, background: tablesOccupied / tablesTotal > 0.8 ? "var(--danger)" : "var(--success)", transition: "width 0.3s" }} />
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.open_bills")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {loading ? "\u2014" : openBills.length}
            </span>
          </div>
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.pending_total")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {loading ? "\u2014" : formatCurrency(pendingTotal)}
            </span>
          </div>
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.total_bills")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {loading ? "\u2014" : totalOrders}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {!loading && totalOrders > 0 ? `${t("analytics.avg_per_bill")}: ${formatCurrency(avgTicket)}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row — 4 cards with change indicators */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
        className="max-md:!grid-cols-2"
      >
        {[
          {
            label: "analytics.revenue",
            value: formatCurrency(totalRevenue),
            icon: "\uD83D\uDCB0",
            current: totalRevenue,
            previous: prevTotalRevenue,
          },
          {
            label: "analytics.orders_count",
            value: totalOrders.toString(),
            icon: "\uD83D\uDCE6",
            current: totalOrders,
            previous: prevTotalOrders,
          },
          {
            label: "analytics.avg_ticket",
            value: formatCurrency(avgTicket),
            icon: "\uD83C\uDFAB",
            current: avgTicket,
            previous: prevAvgTicket,
          },
          {
            label: "dash.tips",
            value: formatCurrency(totalTips),
            icon: "\uD83D\uDCB5",
            current: totalTips,
            previous: prevTotalTips,
          },
        ].map((card) => (
          <div key={card.label} style={cardStyle}>
            <span style={{ fontSize: 28 }}>{card.icon}</span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {loading ? "\u2014" : card.value}
              </span>
              {!loading && <ChangeIndicator current={card.current} previous={card.previous} />}
            </div>
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
        ))}
      </div>

      {/* Charts grid — 2 columns on desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
        className="max-md:!grid-cols-1"
      >
        {/* Revenue by hour — horizontal bars */}
        <div style={sectionStyle}>
          <h2 style={sectionHeaderStyle}>{t("analytics.by_hour")}</h2>
          <div style={{ padding: 20 }}>
            {loading && (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>
            )}
            {!loading && byHour.length === 0 && (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>
            )}
            {!loading &&
              byHour.map((b) => (
                <div
                  key={b.hour}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      fontSize: 13,
                      color: "var(--text-muted)",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(b.hour).padStart(2, "0")}:00
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(b.revenue / maxHourRevenue) * 100}%`,
                        height: "100%",
                        borderRadius: 6,
                        background: "var(--accent)",
                        transition: "width 0.3s ease",
                        minWidth: b.revenue > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      width: 80,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(b.revenue)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Orders by day of week — vertical bars */}
        <div style={sectionStyle}>
          <h2 style={sectionHeaderStyle}>{t("analytics.by_day")}</h2>
          <div
            style={{
              padding: 20,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              height: 220,
              gap: 8,
            }}
          >
            {loading ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", width: "100%", paddingBottom: 40 }}>
                {"\u2014"}
              </div>
            ) : (
              byDay.map((b) => {
                const pct = maxDayOrders > 0 ? (b.orders / maxDayOrders) * 100 : 0;
                return (
                  <div
                    key={b.day}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                      gap: 6,
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {b.orders}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 48,
                        borderRadius: "6px 6px 0 0",
                        background: "var(--accent)",
                        height: `${Math.max(pct, b.orders > 0 ? 4 : 0)}%`,
                        transition: "height 0.3s ease",
                        minHeight: b.orders > 0 ? 4 : 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {DAY_LABELS[b.day]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Payment method breakdown */}
      <div style={{ ...sectionStyle, marginBottom: 24 }}>
        <h2 style={sectionHeaderStyle}>{t("analytics.by_method")}</h2>
        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>
          )}
          {!loading && byMethod.length === 0 && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>
          )}
          {!loading &&
            byMethod.map((b) => {
              const pct = totalMethodRevenue > 0 ? (b.total / totalMethodRevenue) * 100 : 0;
              return (
                <div key={b.method} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {b.method}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(b.total)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      borderRadius: 6,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 6,
                        background: b.method === "cash" ? "var(--success)" : "var(--accent)",
                        transition: "width 0.3s ease",
                        minWidth: pct > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Category breakdown */}
      <div style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>{t("analytics.category_breakdown")}</h2>
        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>
          )}
          {!loading && categoryBreakdown.length === 0 && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
              {t("analytics.no_data")}
            </div>
          )}
          {!loading &&
            categoryBreakdown.map((cat) => {
              const pct = maxCategoryRevenue > 0 ? (cat.revenue / maxCategoryRevenue) * 100 : 0;
              return (
                <div key={cat.name} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {cat.name}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(cat.revenue)} &middot; {cat.count} {t("analytics.items_sold")}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      borderRadius: 6,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 6,
                        background: "var(--info)",
                        transition: "width 0.3s ease",
                        minWidth: pct > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Top selling items table */}
      <div style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>{t("analytics.top_items")}</h2>
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
                <th style={thStyle}>#</th>
                <th style={thStyle}>{t("analytics.product")}</th>
                <th style={{ ...thStyle, textAlign: "right" }}>{t("analytics.qty")}</th>
                <th style={{ ...thStyle, textAlign: "right" }}>{t("analytics.revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}
                  >
                    {"\u2014"}
                  </td>
                </tr>
              )}
              {!loading && topItems.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}
                  >
                    {"\u2014"}
                  </td>
                </tr>
              )}
              {!loading &&
                topItems.map((item, idx) => (
                  <tr key={item.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: idx < 3 ? "var(--accent)" : "var(--text-muted)",
                        width: 48,
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {item.qty}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Financial Breakdown ─────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <DollarSign size={20} style={{ color: "var(--accent)" }} />
          {t("analytics.financial_title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="max-md:!grid-cols-2">
          {[
            { label: "analytics.gross_sales", value: grossSales, color: "var(--text-primary)" },
            { label: "analytics.total_discounts", value: -totalDiscounts, color: "var(--danger)" },
            { label: "analytics.tax_base", value: taxBase, color: "var(--text-primary)" },
            { label: "analytics.total_taxes", value: totalTaxes, color: "var(--warning)" },
            { label: "analytics.total_tips", value: totalTips, color: "var(--success)" },
            { label: "analytics.net_sales", value: netSales, color: "var(--accent)" },
          ].map((item) => (
            <div key={item.label} style={cardStyle}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t(item.label)}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: item.color, fontVariantNumeric: "tabular-nums" }}>
                {loading ? "\u2014" : formatCurrency(Math.abs(item.value))}
                {item.value < 0 && !loading ? " \u2212" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue by Source — Stacked Bars ─────────── */}
      <div style={{ ...sectionStyle, marginBottom: 24 }}>
        <h2 style={sectionHeaderStyle}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={18} />
            {t("analytics.revenue_by_source")}
          </span>
        </h2>
        <div style={{ padding: 20 }}>
          {loading && <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>}
          {!loading && bySource.length === 0 && <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{t("analytics.no_data")}</div>}
          {!loading && bySource.length > 0 && (
            <>
              {/* Stacked bar */}
              <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
                {bySource.map((b) => {
                  const pct = totalSourceRevenue > 0 ? (b.total / totalSourceRevenue) * 100 : 0;
                  return (
                    <div
                      key={b.source}
                      title={`${b.source}: ${formatCurrency(b.total)} (${pct.toFixed(1)}%)`}
                      style={{
                        width: `${pct}%`,
                        background: SOURCE_COLORS[b.source] || "var(--border)",
                        transition: "width 0.3s ease",
                        minWidth: pct > 0 ? 2 : 0,
                      }}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {bySource.map((b) => {
                  const pct = totalSourceRevenue > 0 ? (b.total / totalSourceRevenue) * 100 : 0;
                  const labelKey = `analytics.source_${b.source === "pos" ? "restaurant" : b.source}`;
                  return (
                    <div key={b.source} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: SOURCE_COLORS[b.source] || "var(--border)" }} />
                      <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                        {t(labelKey)}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {formatCurrency(b.total)} ({pct.toFixed(1)}%) &middot; {b.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Revenue by Source Timeline ─────────── */}
      <div style={{ ...sectionStyle, marginBottom: 24 }}>
        <h2 style={sectionHeaderStyle}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={18} />
            {t("analytics.revenue_source_timeline")}
          </span>
        </h2>
        <div style={{ padding: 20 }}>
          {loading && <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{"\u2014"}</div>}
          {!loading && sourceTimeline.length === 0 && <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>{t("analytics.no_data")}</div>}
          {!loading && sourceTimeline.length > 0 && (
            <div style={{ position: "relative", height: 200 }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                <div key={pct} style={{ position: "absolute", left: 50, right: 0, top: `${(1 - pct) * 100}%`, borderTop: "1px solid var(--border)", opacity: 0.4 }}>
                  <span style={{ position: "absolute", left: -50, top: -8, fontSize: 10, color: "var(--text-muted)", width: 45, textAlign: "right" }}>
                    {formatCurrency(maxSourceTimeline * pct)}
                  </span>
                </div>
              ))}
              {/* Lines for each source */}
              <svg viewBox={`0 0 ${sourceTimeline.length * 40} 200`} style={{ position: "absolute", left: 50, top: 0, width: "calc(100% - 50px)", height: "100%" }} preserveAspectRatio="none">
                {(["restaurant", "qr", "takeaway", "delivery"] as const).map((src) => {
                  const points = sourceTimeline.map((b, i) => {
                    const x = i * 40 + 20;
                    const val = b[src];
                    const y = 200 - (val / maxSourceTimeline) * 200;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <polyline key={src} points={points} fill="none" stroke={SOURCE_COLORS[src] || "var(--border)"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  );
                })}
              </svg>
              {/* X labels */}
              <div style={{ position: "absolute", left: 50, right: 0, bottom: -20, display: "flex", justifyContent: "space-between" }}>
                {sourceTimeline.map((b) => (
                  <span key={b.hour} style={{ fontSize: 10, color: "var(--text-muted)" }}>{String(b.hour).padStart(2, "0")}h</span>
                ))}
              </div>
            </div>
          )}
          {/* Legend */}
          {!loading && sourceTimeline.length > 0 && (
            <div style={{ display: "flex", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
              {[
                { key: "restaurant", label: "analytics.source_restaurant" },
                { key: "qr", label: "analytics.source_qr" },
                { key: "takeaway", label: "analytics.source_takeaway" },
                { key: "delivery", label: "analytics.source_delivery" },
              ].map((src) => (
                <div key={src.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 16, height: 3, borderRadius: 2, background: SOURCE_COLORS[src.key] }} />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(src.label)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Promotions ─────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <Percent size={20} style={{ color: "var(--accent)" }} />
          {t("analytics.promotions_title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="max-md:!grid-cols-1">
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.promos_applied")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : promoStats.count}
            </span>
          </div>
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.total_discounted")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : formatCurrency(promoStats.total)}
            </span>
          </div>
          <div style={cardStyle}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.avg_discount")}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : formatCurrency(promoStats.avg)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Fraud Control ─────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldAlert size={20} style={{ color: "var(--danger)" }} />
          {t("analytics.fraud_title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }} className="max-md:!grid-cols-2">
          <div style={cardStyle}>
            <XCircle size={22} style={{ color: "var(--danger)" }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : fraudStats.cancelledCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.cancelled_orders")}</span>
          </div>
          <div style={cardStyle}>
            <DollarSign size={22} style={{ color: "var(--danger)" }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : formatCurrency(fraudStats.cancelledTotal)}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.cancelled_total")}</span>
          </div>
          <div style={cardStyle}>
            <Undo2 size={22} style={{ color: "var(--warning)" }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : fraudStats.refundedCount}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.refunded_orders")}</span>
          </div>
          <div style={cardStyle}>
            <DollarSign size={22} style={{ color: "var(--warning)" }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--warning)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : formatCurrency(fraudStats.refundedTotal)}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.refunded_total")}</span>
          </div>
          <div style={cardStyle}>
            <Trash2 size={22} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "\u2014" : fraudStats.voidedItems}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{t("analytics.voided_items")}</span>
          </div>
        </div>
      </div>

      {/* ── Loyalty Analytics Section ─────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <h2
          style={{
            color: "var(--text-primary)",
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Star size={22} style={{ color: "var(--accent)" }} />
          {t("analytics.loyalty_title")}
        </h2>
      </div>

      {/* Loyalty KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
        className="max-md:!grid-cols-2"
      >
        <div style={loyaltyCardStyle}>
          <Users size={22} style={{ color: "var(--info)" }} />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "\u2014" : loyaltyStats.totalMembers.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("analytics.loyalty_members")}
          </span>
        </div>

        <div style={loyaltyCardStyle}>
          <TrendingUp size={22} style={{ color: "var(--success)" }} />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "\u2014" : loyaltyStats.pointsIssued.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("analytics.points_issued")}
          </span>
        </div>

        <div style={loyaltyCardStyle}>
          <TrendingDown size={22} style={{ color: "var(--warning)" }} />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "\u2014" : loyaltyStats.pointsRedeemed.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("analytics.points_redeemed")}
          </span>
        </div>

        <div style={loyaltyCardStyle}>
          <Gift size={22} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "\u2014" : loyaltyStats.rewardsRedeemedCount.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("analytics.rewards_redeemed")}
          </span>
        </div>

        <div style={loyaltyCardStyle}>
          <Megaphone size={22} style={{ color: "var(--info)" }} />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "\u2014" : loyaltyStats.activeCampaigns.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("analytics.active_campaigns")}
          </span>
        </div>
      </div>

      {/* Top 5 redeemed rewards */}
      {loyaltyStats.topRewards.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={sectionHeaderStyle}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Award size={18} />
              {t("analytics.top_redeemed_rewards")}
            </span>
          </h2>
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
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>{t("analytics.reward_name")}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{t("analytics.times_redeemed")}</th>
                </tr>
              </thead>
              <tbody>
                {loyaltyStats.topRewards.map((reward, idx) => (
                  <tr key={reward.title} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: idx < 3 ? "var(--accent)" : "var(--text-muted)",
                        width: 48,
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{reward.title}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {reward.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
