"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, timeAgo } from "@/lib/utils";
import {
  Building2,
  ShoppingCart,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Grid3X3,
  ChevronRight,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Activity,
  CreditCard,
  Truck,
  Store,
  QrCode,
  Clock,
  DollarSign,
  BarChart3,
  Crown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChefHat,
} from "lucide-react";

/* ── Types ── */

interface GlobalStats {
  total_tenants: number;
  active_tenants: number;
  orders_today: number;
  revenue_today: number;
  tips_today: number;
  avg_ticket: number;
  total_orders_all_time: number;
  total_users: number;
  total_menu_items: number;
  total_tables: number;
}

interface TenantStat {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  currency: string;
  created_at: string;
  tax_rate: number;
  orders_today: number;
  revenue_today: number;
  tips_today: number;
  avg_ticket: number;
  users_count: number;
  menu_items_count: number;
  tables_count: number;
  tables_occupied: number;
  order_types: { dine_in: number; takeaway: number; delivery: number };
}

interface TenantDetail {
  tenant: Record<string, unknown>;
  orders: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  menu_items: Record<string, unknown>[];
  users: Record<string, unknown>[];
  tables: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  daily_revenue: { date: string; revenue: number; orders: number }[];
  status_breakdown: Record<string, number>;
  payment_methods: Record<string, number>;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  order_type: string;
  created_at: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  customer_name: string | null;
  tip: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  preparing: "#8b5cf6",
  ready: "#10b981",
  delivered: "#10b981",
  paid: "#06b6d4",
  cancelled: "#ef4444",
};

const ORDER_TYPE_ICONS: Record<string, typeof Store> = {
  dine_in: Store,
  qr: QrCode,
  takeaway: ShoppingCart,
  delivery: Truck,
};

/* ── Component ── */

export default function SuperAdminPage() {
  const { t, lang } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [tenants, setTenants] = useState<TenantStat[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ── Auth check ── */

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      // Check role via API (the API will verify super_admin)
      try {
        const res = await fetch("/api/admin?action=dashboard");
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        setGlobal(data.global);
        setTenants(data.tenants);
        setAuthorized(true);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  /* ── Fetch functions ── */

  const fetchDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin?action=dashboard");
      const data = await res.json();
      setGlobal(data.global);
      setTenants(data.tenants);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    const res = await fetch("/api/admin?action=recent-orders");
    const data = await res.json();
    setRecentOrders(data.orders || []);
  }, []);

  const fetchTenantDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedTenant(id);
    try {
      const res = await fetch(`/api/admin?action=tenant&id=${id}`);
      const data = await res.json();
      setTenantDetail(data);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) fetchRecentOrders();
  }, [authorized, fetchRecentOrders]);

  /* ── Actions ── */

  const toggleTenant = async (tenantId: string, currentActive: boolean) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_tenant", tenant_id: tenantId, active: !currentActive }),
    });
    fetchDashboard();
  };

  /* ── Loading / Unauthorized ── */

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <RefreshCw size={32} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!authorized) return null;

  /* ── Tenant Detail View ── */

  if (selectedTenant && tenantDetail) {
    const td = tenantDetail;
    const tenant = td.tenant;
    const currency = (tenant.currency as string) || "EUR";

    return (
      <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Back button */}
        <button
          onClick={() => { setSelectedTenant(null); setTenantDetail(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, background: "none",
            border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14,
            marginBottom: 20, padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          {t("admin.back_to_dashboard")}
        </button>

        {/* Tenant header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
          flexWrap: "wrap",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent), #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {tenant.name as string}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              {tenant.slug as string} &middot; {t("admin.plan")}: {(tenant.plan as string) || "free"} &middot; {t("admin.tax")}: {((tenant.tax_rate as number) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: t("admin.users"), value: td.users.length, icon: Users },
            { label: t("admin.menu_items"), value: td.menu_items.length, icon: UtensilsCrossed },
            { label: t("admin.categories"), value: td.categories.length, icon: ChefHat },
            { label: t("admin.tables"), value: td.tables.length, icon: Grid3X3 },
            { label: t("admin.orders_7d"), value: td.orders.length, icon: ShoppingCart },
            { label: t("admin.payments_7d"), value: td.payments.length, icon: CreditCard },
          ].map((s, i) => (
            <div key={i} style={{
              background: "var(--bg-card)", borderRadius: 12, padding: 16,
              border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <s.icon size={16} style={{ color: "var(--text-secondary)" }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Daily Revenue Chart (simple bar) */}
        <div style={{
          background: "var(--bg-card)", borderRadius: 12, padding: 20,
          border: "1px solid var(--border)", marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>
            {t("admin.revenue_7d")}
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {td.daily_revenue.map((d, i) => {
              const maxRev = Math.max(...td.daily_revenue.map(x => x.revenue), 1);
              const height = (d.revenue / maxRev) * 100;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    {formatCurrency(d.revenue, currency)}
                  </span>
                  <div style={{
                    width: "100%", maxWidth: 48, height: Math.max(height, 4),
                    background: d.revenue > 0 ? "var(--accent)" : "var(--border)",
                    borderRadius: "6px 6px 0 0", transition: "height 0.3s ease",
                  }} />
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status + Payment breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Status */}
          <div style={{
            background: "var(--bg-card)", borderRadius: 12, padding: 20,
            border: "1px solid var(--border)",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
              {t("admin.order_statuses")}
            </h3>
            {Object.entries(td.status_breakdown).map(([status, count]) => (
              <div key={status} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: STATUS_COLORS[status] || "var(--text-secondary)",
                  }} />
                  <span style={{ fontSize: 13, color: "var(--text-primary)", textTransform: "capitalize" }}>{status}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{count}</span>
              </div>
            ))}
            {Object.keys(td.status_breakdown).length === 0 && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("common.no_results")}</p>
            )}
          </div>

          {/* Payment methods */}
          <div style={{
            background: "var(--bg-card)", borderRadius: 12, padding: 20,
            border: "1px solid var(--border)",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
              {t("admin.payment_methods")}
            </h3>
            {Object.entries(td.payment_methods).map(([method, count]) => (
              <div key={method} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 13, color: "var(--text-primary)", textTransform: "capitalize" }}>{method}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{count}</span>
              </div>
            ))}
            {Object.keys(td.payment_methods).length === 0 && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t("common.no_results")}</p>
            )}
          </div>
        </div>

        {/* Recent orders table */}
        <div style={{
          background: "var(--bg-card)", borderRadius: 12, padding: 20,
          border: "1px solid var(--border)", marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
            {t("admin.recent_orders")} (7d)
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["#", t("admin.customer"), t("admin.type"), t("admin.status"), t("admin.total"), t("admin.time")].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {td.orders.slice(0, 20).map((o: Record<string, unknown>) => {
                  const TypeIcon = ORDER_TYPE_ICONS[(o.order_type as string)] || Store;
                  return (
                    <tr key={o.id as string} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>#{o.order_number as string}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>
                        {(o.customer_name as string) || "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <TypeIcon size={14} style={{ color: "var(--text-secondary)" }} />
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 6,
                          fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                          backgroundColor: (STATUS_COLORS[(o.status as string)] || "var(--text-secondary)") + "22",
                          color: STATUS_COLORS[(o.status as string)] || "var(--text-secondary)",
                        }}>
                          {o.status as string}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                        {formatCurrency((o.total as number) || 0, currency)}
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>
                        {timeAgo(o.created_at as string)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tables grid */}
        <div style={{
          background: "var(--bg-card)", borderRadius: 12, padding: 20,
          border: "1px solid var(--border)", marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
            {t("admin.tables")} ({td.tables.length})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {td.tables.map((table: Record<string, unknown>) => (
              <div key={table.id as string} style={{
                width: 56, height: 56, borderRadius: 10,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600,
                backgroundColor: table.status === "occupied" ? "var(--accent)22" : "var(--bg-secondary)",
                color: table.status === "occupied" ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${table.status === "occupied" ? "var(--accent)" : "var(--border)"}`,
              }}>
                {table.number as string}
                <span style={{ fontSize: 9, fontWeight: 400 }}>{table.capacity as number}p</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users */}
        <div style={{
          background: "var(--bg-card)", borderRadius: 12, padding: 20,
          border: "1px solid var(--border)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
            {t("admin.users")} ({td.users.length})
          </h3>
          {td.users.map((u: Record<string, unknown>) => (
            <div key={u.id as string} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{u.email as string}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                backgroundColor: u.role === "admin" ? "var(--accent)22" : "var(--bg-secondary)",
                color: u.role === "admin" ? "var(--accent)" : "var(--text-secondary)",
                textTransform: "capitalize",
              }}>
                {u.role as string}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Main Dashboard ── */

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 28, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {t("admin.title")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              {t("admin.subtitle")}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={refreshing}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-card)", cursor: "pointer",
            fontSize: 13, color: "var(--text-primary)",
          }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {t("admin.refresh")}
        </button>
      </div>

      {/* Global KPIs */}
      {global && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14, marginBottom: 28,
        }}>
          {[
            { label: t("admin.total_tenants"), value: global.total_tenants, sub: `${global.active_tenants} ${t("common.active").toLowerCase()}`, icon: Building2, color: "#6366f1" },
            { label: t("admin.orders_today"), value: global.orders_today, sub: `${global.total_orders_all_time} ${t("admin.all_time")}`, icon: ShoppingCart, color: "#3b82f6" },
            { label: t("admin.revenue_today"), value: formatCurrency(global.revenue_today), sub: `Avg ${formatCurrency(global.avg_ticket)}`, icon: DollarSign, color: "#10b981" },
            { label: t("admin.tips_today"), value: formatCurrency(global.tips_today), icon: TrendingUp, color: "#f59e0b" },
            { label: t("admin.total_users"), value: global.total_users, icon: Users, color: "#8b5cf6" },
            { label: t("admin.total_tables"), value: global.total_tables, sub: `${global.total_menu_items} items`, icon: Grid3X3, color: "#06b6d4" },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: "var(--bg-card)", borderRadius: 14, padding: 18,
              border: "1px solid var(--border)", position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -8, right: -8,
                width: 56, height: 56, borderRadius: "50%",
                backgroundColor: kpi.color + "15",
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                {kpi.value}
              </div>
              {kpi.sub && (
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{kpi.sub}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tenants Grid */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>
          {t("admin.all_tenants")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              style={{
                background: "var(--bg-card)", borderRadius: 14, padding: 20,
                border: "1px solid var(--border)",
                opacity: tenant.active === false ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {/* Tenant header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      {tenant.name}
                    </h3>
                    {tenant.active === false && (
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        backgroundColor: "#ef444422", color: "#ef4444", fontWeight: 600,
                      }}>
                        {t("common.inactive")}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                    {tenant.slug} &middot; {tenant.plan || "free"} &middot; {tenant.currency}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTenant(tenant.id, tenant.active !== false); }}
                    title={tenant.active !== false ? t("admin.deactivate") : t("admin.activate")}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 4,
                      color: tenant.active !== false ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {tenant.active !== false ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => fetchTenantDetail(tenant.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 4,
                      color: "var(--text-secondary)",
                    }}
                    title={t("admin.view_details")}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Tenant stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("admin.orders_today")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{tenant.orders_today}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("admin.revenue")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                    {formatCurrency(tenant.revenue_today, tenant.currency)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("admin.avg_ticket")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                    {formatCurrency(tenant.avg_ticket, tenant.currency)}
                  </div>
                </div>
              </div>

              {/* Order types bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "var(--bg-secondary)" }}>
                  {tenant.orders_today > 0 && (
                    <>
                      <div style={{ flex: tenant.order_types.dine_in, backgroundColor: "#3b82f6", transition: "flex 0.3s" }} title={`Dine-in: ${tenant.order_types.dine_in}`} />
                      <div style={{ flex: tenant.order_types.takeaway, backgroundColor: "#f59e0b", transition: "flex 0.3s" }} title={`Takeaway: ${tenant.order_types.takeaway}`} />
                      <div style={{ flex: tenant.order_types.delivery, backgroundColor: "#10b981", transition: "flex 0.3s" }} title={`Delivery: ${tenant.order_types.delivery}`} />
                    </>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#3b82f6", marginRight: 3 }} />
                    Dine-in {tenant.order_types.dine_in}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#f59e0b", marginRight: 3 }} />
                    Take {tenant.order_types.takeaway}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10b981", marginRight: 3 }} />
                    Delivery {tenant.order_types.delivery}
                  </span>
                </div>
              </div>

              {/* Bottom row */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                paddingTop: 10, borderTop: "1px solid var(--border)",
                fontSize: 11, color: "var(--text-secondary)",
              }}>
                <span><Users size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />{tenant.users_count} {t("admin.users").toLowerCase()}</span>
                <span><UtensilsCrossed size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />{tenant.menu_items_count} items</span>
                <span><Grid3X3 size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />{tenant.tables_occupied}/{tenant.tables_count} {t("admin.tables").toLowerCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Order Feed */}
      <div style={{
        background: "var(--bg-card)", borderRadius: 14, padding: 20,
        border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} style={{ color: "var(--accent)" }} />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              {t("admin.global_feed")}
            </h2>
          </div>
          <button
            onClick={fetchRecentOrders}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--accent)", fontSize: 12,
            }}
          >
            {t("admin.refresh")}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["#", t("admin.tenant"), t("admin.customer"), t("admin.type"), t("admin.status"), t("admin.total"), t("admin.time")].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => {
                const TypeIcon = ORDER_TYPE_ICONS[o.order_type] || Store;
                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-primary)" }}>
                      #{o.order_number}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{
                        fontSize: 11, padding: "2px 6px", borderRadius: 4,
                        backgroundColor: "var(--accent)15", color: "var(--accent)",
                        fontWeight: 500, whiteSpace: "nowrap",
                      }}>
                        {o.tenant_name}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                      {o.customer_name || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <TypeIcon size={14} style={{ color: "var(--text-secondary)" }} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 6,
                        fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                        backgroundColor: (STATUS_COLORS[o.status] || "var(--text-secondary)") + "22",
                        color: STATUS_COLORS[o.status] || "var(--text-secondary)",
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatCurrency(o.total)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {timeAgo(o.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {recentOrders.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>
            {t("common.no_results")}
          </p>
        )}
      </div>

      {/* Loading overlay for detail */}
      {detailLoading && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "var(--bg-card)", borderRadius: 12, padding: 24,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <RefreshCw size={20} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "var(--text-primary)" }}>{t("admin.loading_tenant")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
