"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, timeAgo } from "@/lib/utils";
import {
  ShoppingCart,
  ChefHat,
  ClipboardList,
  BarChart3,
  Users,
  Star,
  Activity,
} from "lucide-react";

/* ─── Types ─── */

interface DashboardStats {
  today_orders: number;
  today_revenue: number;
  avg_ticket: number;
  tips: number;
  open_orders: number;
  tables_occupied: number;
  loyalty_members: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  restaurant_tables: { number: string } | null;
  status: string;
  total: number;
  created_at: string;
}

interface HourlyData {
  hour: number;
  count: number;
}

interface LoyaltySnapshot {
  enabled: boolean;
  totalMembers: number;
  pointsToday: number;
}

const defaultStats: DashboardStats = {
  today_orders: 0,
  today_revenue: 0,
  avg_ticket: 0,
  tips: 0,
  open_orders: 0,
  tables_occupied: 0,
  loyalty_members: 0,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--warning)",
  confirmed: "var(--info)",
  preparing: "var(--info)",
  ready: "var(--success)",
  delivered: "var(--success)",
  paid: "var(--accent)",
  cancelled: "var(--danger)",
};

/* ─── Pulsing dot keyframes (injected once) ─── */

const PULSE_STYLE_ID = "dash-pulse-style";
function ensurePulseStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes dash-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Component ─── */

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [liveOpenOrders, setLiveOpenOrders] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [occupiedTables, setOccupiedTables] = useState(0);
  const [loyalty, setLoyalty] = useState<LoyaltySnapshot>({ enabled: false, totalMembers: 0, pointsToday: 0 });
  const tenantIdRef = useRef<string | null>(null);

  useEffect(() => {
    ensurePulseStyle();
  }, []);

  /* ─── Initial data load ─── */
  const loadData = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id, name")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return;

      setUserName(profile.name || user.email?.split("@")[0] || "");
      const tenantId = profile.tenant_id;
      tenantIdRef.current = tenantId;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [
        statsRes,
        ordersRes,
        liveRes,
        todayOrdersRes,
        staffRes,
        tablesRes,
        loyaltySettingsRes,
        loyaltyMembersRes,
        loyaltyPointsRes,
      ] = await Promise.all([
        // KPI stats via RPC
        supabase.rpc("pos_dashboard_stats", { p_tenant_id: tenantId }),
        // Recent orders
        supabase
          .from("orders")
          .select("id, order_number, status, total, created_at, restaurant_tables(number)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(10),
        // Live open orders count (confirmed + preparing)
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .in("status", ["confirmed", "preparing"]),
        // Today's orders for hourly timeline
        supabase
          .from("orders")
          .select("created_at")
          .eq("tenant_id", tenantId)
          .gte("created_at", todayISO),
        // Staff on duty
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("active", true),
        // Tables
        supabase
          .from("restaurant_tables")
          .select("id, status")
          .eq("tenant_id", tenantId),
        // Loyalty settings
        supabase
          .from("loyalty_settings")
          .select("enabled")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        // Loyalty members count
        supabase
          .from("loyalty_customers")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        // Loyalty points issued today
        supabase
          .from("loyalty_points_ledger")
          .select("points")
          .eq("tenant_id", tenantId)
          .gt("points", 0)
          .gte("created_at", todayISO),
      ]);

      // KPI stats
      if (statsRes.data) {
        const d = statsRes.data as Record<string, number>;
        setStats({
          ...defaultStats,
          today_orders: d.today_orders ?? 0,
          today_revenue: d.today_revenue ?? 0,
          avg_ticket: d.today_avg_ticket ?? 0,
          tips: d.today_tips ?? 0,
          open_orders: d.open_orders ?? 0,
          tables_occupied: d.tables_occupied ?? 0,
          loyalty_members: d.loyalty_members ?? 0,
        });
      }

      if (ordersRes.data) {
        setRecentOrders(ordersRes.data as unknown as RecentOrder[]);
      }

      // Live open orders
      setLiveOpenOrders(liveRes.count ?? 0);

      // Hourly timeline
      if (todayOrdersRes.data) {
        const hourMap: Record<number, number> = {};
        for (let h = 0; h < 24; h++) hourMap[h] = 0;
        todayOrdersRes.data.forEach((o: { created_at: string }) => {
          const hour = new Date(o.created_at).getHours();
          hourMap[hour] = (hourMap[hour] || 0) + 1;
        });
        const arr: HourlyData[] = Object.entries(hourMap).map(([h, c]) => ({
          hour: parseInt(h),
          count: c,
        }));
        setHourlyData(arr);
      }

      // Staff
      setStaffCount(staffRes.count ?? 0);

      // Tables
      if (tablesRes.data) {
        setTotalTables(tablesRes.data.length);
        setOccupiedTables(
          tablesRes.data.filter((t: { status: string }) => t.status === "occupied").length
        );
      }

      // Loyalty
      const loyaltyEnabled = loyaltySettingsRes.data?.enabled ?? false;
      const totalMembersCount = loyaltyMembersRes.count ?? 0;
      const pointsToday = (loyaltyPointsRes.data ?? []).reduce(
        (sum: number, r: { points: number }) => sum + (r.points || 0),
        0
      );
      setLoyalty({
        enabled: loyaltyEnabled,
        totalMembers: totalMembersCount,
        pointsToday,
      });
    } catch {
      // Keep default placeholder values on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Realtime subscription for live open order count ─── */
  useEffect(() => {
    const tenantId = tenantIdRef.current;
    if (!tenantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("dash-live-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async () => {
          // Re-fetch open orders count
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .in("status", ["confirmed", "preparing"]);
          setLiveOpenOrders(count ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading]); // re-run once loading finishes and tenantId is set

  /* ─── Derived ─── */

  const kpiCards = [
    { key: "dash.today_orders", value: stats.today_orders.toString(), icon: "📦" },
    { key: "dash.today_revenue", value: formatCurrency(stats.today_revenue), icon: "💰" },
    { key: "dash.avg_ticket", value: formatCurrency(stats.avg_ticket), icon: "🎫" },
    { key: "dash.tips", value: formatCurrency(stats.tips), icon: "💵" },
  ];

  const maxHourly = Math.max(...hourlyData.map((h) => h.count), 1);
  const currentHour = new Date().getHours();

  const quickActions = [
    { key: "dash.quick_new_order", href: "/pos", icon: ShoppingCart, color: "var(--accent)" },
    { key: "dash.quick_view_kds", href: "/kds", icon: ChefHat, color: "var(--info)" },
    { key: "dash.quick_check_orders", href: "/orders", icon: ClipboardList, color: "var(--warning)" },
    { key: "dash.quick_view_analytics", href: "/analytics", icon: BarChart3, color: "var(--success)" },
  ];

  const tablePercent = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return (
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Welcome */}
      <h1
        style={{
          color: "var(--text-primary)",
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        {t("dash.welcome")}{userName ? `, ${userName}` : ""}
      </h1>

      {/* KPI Grid - 4 cols desktop, 2 mobile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
        className="max-md:!grid-cols-2"
      >
        {kpiCards.map((card) => (
          <div
            key={card.key}
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
            <span style={{ fontSize: 28 }}>{card.icon}</span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {loading ? "—" : card.value}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              {t(card.key)}
            </span>
          </div>
        ))}
      </div>

      {/* Live Open Orders Counter */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: liveOpenOrders > 0 ? "var(--warning)" : "var(--success)",
            animation: liveOpenOrders > 0 ? "dash-pulse 1.5s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        />
        <Activity size={20} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          {loading ? "—" : liveOpenOrders}
        </span>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {t("dash.live_open_orders")}
        </span>
      </div>

      {/* Quick Actions Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
        className="max-md:!grid-cols-2"
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => router.push(action.href)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = action.color;
                e.currentTarget.style.background = `${action.color}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              <Icon size={24} style={{ color: action.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {t(action.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Middle row: Timeline + Staff + Tables + Loyalty */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
        className="max-md:!grid-cols-1"
      >
        {/* Today's Timeline */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
            gridRow: "span 2",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 16px 0",
            }}
          >
            {t("dash.todays_timeline")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {hourlyData.map((h) => {
              const barWidth = maxHourly > 0 ? (h.count / maxHourly) * 100 : 0;
              const isPast = h.hour < currentHour;
              const isCurrent = h.hour === currentHour;
              return (
                <div
                  key={h.hour}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    opacity: isPast || isCurrent ? 1 : 0.35,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: isCurrent ? 700 : 400,
                      width: 32,
                      textAlign: "right",
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(h.hour).padStart(2, "0")}:00
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 14,
                      background: "var(--bg-secondary)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    {h.count > 0 && (
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: "100%",
                          background: isCurrent ? "var(--accent)" : "var(--info)",
                          borderRadius: 4,
                          transition: "width 0.3s ease",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      width: 20,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {h.count > 0 ? h.count : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff on Duty */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Users size={28} style={{ color: "var(--info)" }} />
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {loading ? "—" : staffCount}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            {t("dash.staff_on_duty")}
          </span>
        </div>

        {/* Table Occupancy */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("dash.table_occupancy")}
          </span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "—" : `${occupiedTables} / ${totalTables}`}
          </span>
          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: 8,
              background: "var(--bg-secondary)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${tablePercent}%`,
                height: "100%",
                background:
                  tablePercent > 80
                    ? "var(--danger)"
                    : tablePercent > 50
                    ? "var(--warning)"
                    : "var(--success)",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {tablePercent}%
          </span>
        </div>

        {/* Loyalty Snapshot */}
        {loyalty.enabled && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              gridColumn: "span 2",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Star size={18} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {t("dash.loyalty_snapshot")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                  {loading ? "—" : loyalty.totalMembers}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {t("dash.loyalty_total_members")}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "var(--success)" }}>
                  {loading ? "—" : loyalty.pointsToday}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {t("dash.loyalty_points_today")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders */}
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
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {t("dash.recent_orders")}
          </h2>
        </div>

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
                  t("dash.col_number"),
                  t("dash.col_table"),
                  t("dash.col_status"),
                  t("dash.col_total"),
                  t("dash.col_time"),
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
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    —
                  </td>
                </tr>
              )}
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {order.order_number}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {order.restaurant_tables?.number || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: `${STATUS_COLORS[order.status] || "var(--text-muted)"}20`,
                        color: STATUS_COLORS[order.status] || "var(--text-muted)",
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(order.total)}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {timeAgo(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
