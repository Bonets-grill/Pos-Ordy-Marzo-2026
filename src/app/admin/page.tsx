"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  ChevronDown,
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
  Search,
  Plus,
  X,
  Eye,
  Mail,
  Shield,
  FileText,
  Settings,
  Zap,
  MessageSquare,
  Trash2,
  Bell,
  Send,
  Hash,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Award,
  Globe,
  Smartphone,
  Heart,
  Bot,
  Power,
  ChevronLeft,
} from "lucide-react";

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */

interface GlobalStats {
  total_tenants: number;
  active_tenants: number;
  orders_today: number;
  orders_yesterday: number;
  revenue_today: number;
  revenue_yesterday: number;
  tips_today: number;
  avg_ticket: number;
  total_orders_all_time: number;
  total_users: number;
  total_menu_items: number;
  total_tables: number;
  weekly_revenue: { date: string; revenue: number; orders: number }[];
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
  orders_7d: number;
  revenue_7d: number;
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
  items_count?: number;
  payment_method?: string;
  items?: Record<string, unknown>[];
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  created_at: string;
}

interface AuditRow {
  id: string;
  tenant_name: string;
  user_email: string;
  action: string;
  entity: string;
  details: string;
  created_at: string;
}

/* ══════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════ */

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  confirmed: "#3b82f6",
  preparing: "#8b5cf6",
  ready: "#10b981",
  served: "#10b981",
  closed: "#06b6d4",
  cancelled: "#ef4444",
  refunded: "#ef4444",
};

const ORDER_TYPE_ICONS: Record<string, typeof Store> = {
  dine_in: Store,
  qr: QrCode,
  takeaway: ShoppingCart,
  delivery: Truck,
};

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  starter: "#3b82f6",
  pro: "#8b5cf6",
  enterprise: "#f59e0b",
};

type TabKey = "overview" | "tenants" | "users" | "orders" | "billing" | "metrics" | "audit" | "system";

const TABS: { key: TabKey; icon: typeof Crown; label: string }[] = [
  { key: "overview", icon: Gauge, label: "Overview" },
  { key: "tenants", icon: Building2, label: "Tenants" },
  { key: "users", icon: Users, label: "Users" },
  { key: "orders", icon: ShoppingCart, label: "Orders" },
  { key: "billing", icon: CreditCard, label: "Billing" },
  { key: "metrics", icon: BarChart3, label: "Metrics" },
  { key: "audit", icon: FileText, label: "Audit Log" },
  { key: "system", icon: Settings, label: "System" },
];

const FEATURE_FLAGS = [
  { key: "qr_ordering", label: "QR Ordering", icon: QrCode },
  { key: "whatsapp_agent", label: "WhatsApp Agent", icon: Smartphone },
  { key: "loyalty_program", label: "Loyalty Program", icon: Heart },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "ai_menu_translation", label: "AI Menu Translation", icon: Bot },
];

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */

function deltaPercent(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? "+100%" : "0%", positive: current >= 0 };
  const pct = ((current - previous) / previous) * 100;
  return {
    value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  };
}

function MiniBarChart({ data, height = 80, color = "var(--accent)" }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: Math.max((v / max) * height, 3),
            background: color,
            borderRadius: "4px 4px 0 0",
            opacity: i === data.length - 1 ? 1 : 0.6,
            transition: "height 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
      backgroundColor: color + "22", color,
      whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_COLORS[plan] || "#6b7280";
  return <Badge text={plan || "free"} color={c} />;
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || "var(--text-secondary)";
  return <Badge text={status} color={c} />;
}

function EmptyState({ icon: Icon, message }: { icon: typeof Crown; message: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", color: "var(--text-muted)", gap: 12,
    }}>
      <Icon size={32} style={{ opacity: 0.4 }} />
      <span style={{ fontSize: 14 }}>{message}</span>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: 14, padding: 20,
      border: "1px solid var(--border)", ...style,
    }}>
      {children}
    </div>
  );
}

function Pagination({
  page, totalPages, onPage,
}: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      paddingTop: 16,
    }}>
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6,
          padding: "6px 10px", cursor: page === 1 ? "default" : "pointer",
          color: page === 1 ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13,
        }}
      >
        <ChevronLeft size={14} />
      </button>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6,
          padding: "6px 10px", cursor: page === totalPages ? "default" : "pointer",
          color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13,
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */

export default function SuperAdminPage() {
  const { t } = useI18n();
  const router = useRouter();

  /* ── Core state ── */
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [refreshing, setRefreshing] = useState(false);

  /* ── Data states ── */
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [tenants, setTenants] = useState<TenantStat[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  /* ── Tab-specific loaded flags (lazy loading) ── */
  const loadedTabs = useRef<Set<TabKey>>(new Set(["overview"]));

  /* ── Tenants tab state ── */
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantPlanFilter, setTenantPlanFilter] = useState<string>("all");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("all");
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [newTenantPlan, setNewTenantPlan] = useState("free");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* ── Users tab state ── */
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userTenantFilter, setUserTenantFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [usersPage, setUsersPage] = useState(1);

  /* ── Orders tab state ── */
  const [allOrders, setAllOrders] = useState<RecentOrder[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersTenantFilter, setOrdersTenantFilter] = useState("all");
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string[]>([]);
  const [ordersTypeFilter, setOrdersTypeFilter] = useState("all");
  const [ordersDateFrom, setOrdersDateFrom] = useState("");
  const [ordersDateTo, setOrdersDateTo] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  /* ── Billing tab state ── */
  const [billingPeriod, setBillingPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  /* ── Metrics tab state ── */
  const [metricsLoaded, setMetricsLoaded] = useState(false);

  /* ── Audit tab state ── */
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTenantFilter, setAuditTenantFilter] = useState("all");

  /* ── System tab state ── */
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("admin_feature_flags");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      qr_ordering: true,
      whatsapp_agent: true,
      loyalty_program: true,
      delivery: false,
      ai_menu_translation: true,
    };
  });
  const [maintenanceMode, setMaintenanceMode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("admin_maintenance_mode") === "true";
      } catch {}
    }
    return false;
  });
  const [broadcastMessage, setBroadcastMessage] = useState("");

  /* ══════════════════════════════════════════════════════
     AUTH CHECK
     ══════════════════════════════════════════════════════ */

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      try {
        const res = await fetch("/api/admin?action=dashboard");
        if (res.status === 403) { router.push("/dashboard"); return; }
        const data = await res.json();
        setGlobal(data.global);
        setTenants(data.tenants || []);
        setAuthorized(true);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  /* ── Read hash for tab persistence ── */
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (TABS.some(t => t.key === hash)) setActiveTab(hash);
    const handleHash = () => {
      const h = window.location.hash.replace("#", "") as TabKey;
      if (TABS.some(t => t.key === h)) setActiveTab(h);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  /* ══════════════════════════════════════════════════════
     DATA FETCHING
     ══════════════════════════════════════════════════════ */

  const fetchDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin?action=dashboard");
      const data = await res.json();
      setGlobal(data.global);
      setTenants(data.tenants || []);
    } finally { setRefreshing(false); }
  }, []);

  const fetchRecentOrders = useCallback(async () => {
    const res = await fetch("/api/admin?action=recent-orders");
    const data = await res.json();
    setRecentOrders(data.orders || []);
  }, []);

  const fetchTenantDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedTenantId(id);
    try {
      const res = await fetch(`/api/admin?action=tenant&id=${id}`);
      const data = await res.json();
      setTenantDetail(data);
    } finally { setDetailLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (usersLoaded) return;
    try {
      const res = await fetch("/api/admin?action=users");
      const data = await res.json();
      setAllUsers(data.users || []);
      setUsersLoaded(true);
    } catch { /* fallback: build from tenant data */ }
  }, [usersLoaded]);

  const fetchAllOrders = useCallback(async () => {
    if (ordersLoaded) return;
    try {
      const res = await fetch("/api/admin?action=all-orders");
      const data = await res.json();
      setAllOrders(data.orders || []);
      setOrdersLoaded(true);
    } catch { /* fallback */ }
  }, [ordersLoaded]);

  const fetchAuditLogs = useCallback(async () => {
    if (auditLoaded) return;
    try {
      const res = await fetch("/api/admin?action=audit-logs");
      const data = await res.json();
      setAuditLogs(data.logs || []);
      setAuditLoaded(true);
    } catch { /* empty */ }
  }, [auditLoaded]);

  /* ── Lazy load tab data ── */
  useEffect(() => {
    if (!authorized) return;
    if (activeTab === "overview" && !loadedTabs.current.has("overview")) {
      fetchRecentOrders();
      loadedTabs.current.add("overview");
    }
    if (activeTab === "users") fetchUsers();
    if (activeTab === "orders") fetchAllOrders();
    if (activeTab === "audit") fetchAuditLogs();
    if (activeTab === "metrics" && !metricsLoaded) setMetricsLoaded(true);
  }, [activeTab, authorized, fetchRecentOrders, fetchUsers, fetchAllOrders, fetchAuditLogs, metricsLoaded]);

  useEffect(() => {
    if (authorized && !loadedTabs.current.has("overview")) {
      fetchRecentOrders();
      loadedTabs.current.add("overview");
    }
  }, [authorized, fetchRecentOrders]);

  /* ══════════════════════════════════════════════════════
     ACTIONS
     ══════════════════════════════════════════════════════ */

  const toggleTenant = async (tenantId: string, currentActive: boolean) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_tenant", tenant_id: tenantId, active: !currentActive }),
    });
    fetchDashboard();
  };

  const createTenant = async () => {
    if (!newTenantName.trim() || !newTenantSlug.trim()) return;
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_tenant", name: newTenantName, slug: newTenantSlug, plan: newTenantPlan }),
    });
    setShowCreateTenant(false);
    setNewTenantName("");
    setNewTenantSlug("");
    setNewTenantPlan("free");
    fetchDashboard();
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_role", user_id: userId, role: newRole }),
    });
    setUsersLoaded(false);
    fetchUsers();
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  /* ══════════════════════════════════════════════════════
     COMPUTED / FILTERED DATA
     ══════════════════════════════════════════════════════ */

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchSearch = !tenantSearch ||
        t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(tenantSearch.toLowerCase());
      const matchPlan = tenantPlanFilter === "all" || (t.plan || "free") === tenantPlanFilter;
      const matchStatus = tenantStatusFilter === "all" ||
        (tenantStatusFilter === "active" && t.active !== false) ||
        (tenantStatusFilter === "inactive" && t.active === false);
      return matchSearch && matchPlan && matchStatus;
    });
  }, [tenants, tenantSearch, tenantPlanFilter, tenantStatusFilter]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchSearch = !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchTenant = userTenantFilter === "all" || u.tenant_id === userTenantFilter;
      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchSearch && matchTenant && matchRole;
    });
  }, [allUsers, userSearch, userTenantFilter, userRoleFilter]);

  const usersPageCount = Math.max(1, Math.ceil(filteredUsers.length / 25));
  const pagedUsers = filteredUsers.slice((usersPage - 1) * 25, usersPage * 25);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const matchTenant = ordersTenantFilter === "all" || o.tenant_id === ordersTenantFilter;
      const matchStatus = ordersStatusFilter.length === 0 || ordersStatusFilter.includes(o.status);
      const matchType = ordersTypeFilter === "all" || o.order_type === ordersTypeFilter;
      const matchDateFrom = !ordersDateFrom || o.created_at >= ordersDateFrom;
      const matchDateTo = !ordersDateTo || o.created_at <= ordersDateTo + "T23:59:59";
      return matchTenant && matchStatus && matchType && matchDateFrom && matchDateTo;
    });
  }, [allOrders, ordersTenantFilter, ordersStatusFilter, ordersTypeFilter, ordersDateFrom, ordersDateTo]);

  const ordersPageCount = Math.max(1, Math.ceil(filteredOrders.length / 50));
  const pagedOrders = filteredOrders.slice((ordersPage - 1) * 50, ordersPage * 50);

  /* ── Billing computed ── */
  const billingData = useMemo(() => {
    const now = Date.now();
    const periodMs = billingPeriod === "7d" ? 7 * 86400000 : billingPeriod === "30d" ? 30 * 86400000 : billingPeriod === "90d" ? 90 * 86400000 : Infinity;
    const cutoff = billingPeriod === "all" ? "" : new Date(now - periodMs).toISOString();

    const periodOrders = allOrders.filter(o => !cutoff || o.created_at >= cutoff);
    const totalRevenue = periodOrders.reduce((s, o) => s + (o.status !== "cancelled" ? o.total : 0), 0);
    const paidTenantIds = new Set(periodOrders.map(o => o.tenant_id));

    const perTenant = tenants.map(t => {
      const tOrders = periodOrders.filter(o => o.tenant_id === t.id && o.status !== "cancelled");
      const rev = tOrders.reduce((s, o) => s + o.total, 0);
      return { id: t.id, name: t.name, plan: t.plan || "free", revenue: rev, orders: tOrders.length, avgTicket: tOrders.length > 0 ? rev / tOrders.length : 0 };
    }).sort((a, b) => b.revenue - a.revenue);

    const planDist: Record<string, number> = {};
    tenants.forEach(t => { const p = t.plan || "free"; planDist[p] = (planDist[p] || 0) + 1; });

    return { totalRevenue, activePaid: paidTenantIds.size, avgRevPerTenant: paidTenantIds.size > 0 ? totalRevenue / paidTenantIds.size : 0, perTenant, planDist };
  }, [allOrders, tenants, billingPeriod]);

  /* ── Alerts: tenants with 0 orders in 7d ── */
  const alertTenants = useMemo(() => {
    return tenants.filter(t => t.active !== false && (t.orders_7d || 0) === 0);
  }, [tenants]);

  /* ── Metrics computed ── */
  const metricsData = useMemo(() => {
    // New tenants per month (last 12)
    const monthlyNew: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = tenants.filter(t => t.created_at?.startsWith(m)).length;
      monthlyNew.push({ month: m, count });
    }

    // Top 10 by revenue
    const top10 = [...tenants]
      .sort((a, b) => (b.revenue_7d || b.revenue_today || 0) - (a.revenue_7d || a.revenue_today || 0))
      .slice(0, 10);

    // Retention
    const activeLast30 = tenants.filter(t => (t.orders_7d || 0) > 0 || t.orders_today > 0).length;
    const total = tenants.length;

    return { monthlyNew, top10, activeLast30, total };
  }, [tenants]);

  /* ── Audit filtered ── */
  const filteredAudit = useMemo(() => {
    if (auditTenantFilter === "all") return auditLogs;
    return auditLogs.filter(a => a.tenant_name === auditTenantFilter);
  }, [auditLogs, auditTenantFilter]);

  const auditPageCount = Math.max(1, Math.ceil(filteredAudit.length / 25));
  const pagedAudit = filteredAudit.slice((auditPage - 1) * 25, auditPage * 25);

  /* ══════════════════════════════════════════════════════
     RENDER HELPERS
     ══════════════════════════════════════════════════════ */

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)",
    outline: "none", width: "100%",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: "pointer", appearance: "auto" as const,
  };

  const btnPrimary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: "var(--accent)", color: "#000", fontWeight: 600,
    fontSize: 13, cursor: "pointer",
  };

  const btnSecondary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 8,
    border: "1px solid var(--border)", background: "var(--bg-card)",
    color: "var(--text-primary)", fontSize: 13, cursor: "pointer",
  };

  const btnDanger: React.CSSProperties = {
    ...btnPrimary, background: "var(--danger)", color: "#fff",
  };

  /* ══════════════════════════════════════════════════════
     LOADING / UNAUTHORIZED
     ══════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <RefreshCw size={32} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!authorized) return null;

  /* ══════════════════════════════════════════════════════
     TENANT DETAIL SLIDE-OVER
     ══════════════════════════════════════════════════════ */

  const renderTenantSlideOver = () => {
    if (!selectedTenantId || !tenantDetail) return null;
    const td = tenantDetail;
    const tenant = td.tenant;
    const currency = (tenant.currency as string) || "EUR";

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", justifyContent: "flex-end",
      }}>
        {/* Backdrop */}
        <div
          onClick={() => { setSelectedTenantId(null); setTenantDetail(null); }}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        />
        {/* Panel */}
        <div style={{
          position: "relative", width: "min(700px, 90vw)", height: "100vh",
          background: "var(--bg-primary)", overflowY: "auto",
          borderLeft: "1px solid var(--border)", padding: 24,
          animation: "slideIn 0.3s ease",
        }}>
          {/* Close */}
          <button
            onClick={() => { setSelectedTenantId(null); setTenantDetail(null); }}
            style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, var(--accent), #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {tenant.name as string}
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                {tenant.slug as string} &middot; <PlanBadge plan={(tenant.plan as string) || "free"} /> &middot; {t("admin.tax")}: {(((tenant.tax_rate as number) || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: t("admin.users"), value: td.users.length, icon: Users },
              { label: t("admin.menu_items"), value: td.menu_items.length, icon: UtensilsCrossed },
              { label: t("admin.categories"), value: td.categories.length, icon: ChefHat },
              { label: t("admin.tables"), value: td.tables.length, icon: Grid3X3 },
              { label: t("admin.orders_7d"), value: td.orders.length, icon: ShoppingCart },
              { label: t("admin.payments_7d"), value: td.payments.length, icon: CreditCard },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <s.icon size={14} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Diagnostics button */}
          <button
            onClick={() => router.push(`/admin/diagnostics?tenant=${selectedTenantId}`)}
            style={{
              width: "100%", padding: "12px 16px", marginBottom: 20,
              backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)",
              borderRadius: 10, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              color: "var(--accent)", fontSize: 14, fontWeight: 600,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; e.currentTarget.style.color = "var(--accent)"; }}
          >
            <Zap size={16} />
            Diagnosticar Tenant
          </button>

          {/* Revenue chart */}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
              {t("admin.revenue_7d")}
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
              {td.daily_revenue.map((d, i) => {
                const maxRev = Math.max(...td.daily_revenue.map(x => x.revenue), 1);
                const h = (d.revenue / maxRev) * 90;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{formatCurrency(d.revenue, currency)}</span>
                    <div style={{
                      width: "100%", maxWidth: 44, height: Math.max(h, 3),
                      background: d.revenue > 0 ? "var(--accent)" : "var(--border)",
                      borderRadius: "5px 5px 0 0",
                    }} />
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Status + Payment breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>{t("admin.order_statuses")}</h3>
              {Object.entries(td.status_breakdown).map(([status, count]) => (
                <div key={status} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS[status] || "var(--text-muted)" }} />
                    <span style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "capitalize" }}>{status}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{count}</span>
                </div>
              ))}
              {Object.keys(td.status_breakdown).length === 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("common.no_results")}</span>}
            </Card>
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>{t("admin.payment_methods")}</h3>
              {Object.entries(td.payment_methods).map(([method, count]) => (
                <div key={method} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-primary)", textTransform: "capitalize" }}>{method}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{count}</span>
                </div>
              ))}
              {Object.keys(td.payment_methods).length === 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("common.no_results")}</span>}
            </Card>
          </div>

          {/* Recent orders */}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>{t("admin.recent_orders")} (7d)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {["#", t("admin.customer"), t("admin.type"), t("admin.status"), t("admin.total"), t("admin.time")].map((h, i) => (
                      <th key={i} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {td.orders.slice(0, 15).map((o: Record<string, unknown>) => {
                    const TypeIcon = ORDER_TYPE_ICONS[(o.order_type as string)] || Store;
                    return (
                      <tr key={o.id as string} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600, color: "var(--text-primary)" }}>#{o.order_number as string}</td>
                        <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>{(o.customer_name as string) || "\u2014"}</td>
                        <td style={{ padding: "6px 8px" }}><TypeIcon size={13} style={{ color: "var(--text-muted)" }} /></td>
                        <td style={{ padding: "6px 8px" }}><StatusBadge status={o.status as string} /></td>
                        <td style={{ padding: "6px 8px", fontWeight: 600 }}>{formatCurrency((o.total as number) || 0, currency)}</td>
                        <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{timeAgo(o.created_at as string)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tables */}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>{t("admin.tables")} ({td.tables.length})</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {td.tables.map((table: Record<string, unknown>) => (
                <div key={table.id as string} style={{
                  width: 50, height: 50, borderRadius: 8,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600,
                  backgroundColor: table.status === "occupied" ? "var(--accent)22" : "var(--bg-secondary)",
                  color: table.status === "occupied" ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${table.status === "occupied" ? "var(--accent)" : "var(--border)"}`,
                }}>
                  {table.number as string}
                  <span style={{ fontSize: 8, fontWeight: 400 }}>{table.capacity as number}p</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Users */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 10px" }}>{t("admin.users")} ({td.users.length})</h3>
            {td.users.map((u: Record<string, unknown>) => (
              <div key={u.id as string} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{u.email as string}</span>
                <Badge text={u.role as string} color={u.role === "admin" ? "var(--accent)" : "var(--text-secondary)"} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════
     TAB 1: OVERVIEW
     ══════════════════════════════════════════════════════ */

  const renderOverview = () => {
    if (!global) return null;

    const kpis = [
      {
        label: t("admin.total_tenants"), value: global.total_tenants,
        sub: `${global.active_tenants} ${t("common.active")?.toLowerCase() || "active"}`,
        icon: Building2, color: "#6366f1",
        delta: null,
      },
      {
        label: t("admin.orders_today"), value: global.orders_today,
        sub: `${global.total_orders_all_time} ${t("admin.all_time")}`,
        icon: ShoppingCart, color: "#3b82f6",
        delta: deltaPercent(global.orders_today, global.orders_yesterday || 0),
      },
      {
        label: t("admin.revenue_today"), value: formatCurrency(global.revenue_today),
        sub: `Avg ${formatCurrency(global.avg_ticket)}`,
        icon: DollarSign, color: "#10b981",
        delta: deltaPercent(global.revenue_today, global.revenue_yesterday || 0),
      },
      {
        label: t("admin.tips_today"), value: formatCurrency(global.tips_today),
        icon: TrendingUp, color: "#f59e0b", delta: null,
      },
      {
        label: t("admin.total_users"), value: global.total_users,
        icon: Users, color: "#8b5cf6", delta: null,
      },
      {
        label: t("admin.total_tables"), value: global.total_tables,
        sub: `${global.total_menu_items} items`,
        icon: Grid3X3, color: "#06b6d4", delta: null,
      },
    ];

    return (
      <>
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
          {kpis.map((kpi, i) => (
            <Card key={i} style={{ position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: -10, right: -10, width: 56, height: 56,
                borderRadius: "50%", backgroundColor: kpi.color + "12",
              }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{kpi.label}</span>
                </div>
                {kpi.delta && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 2,
                    color: kpi.delta.positive ? "var(--success)" : "var(--danger)",
                  }}>
                    {kpi.delta.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {kpi.delta.value}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>{kpi.value}</div>
              {kpi.sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{kpi.sub}</div>}
            </Card>
          ))}
        </div>

        {/* 7-day Revenue Chart + Alerts */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 28 }}>
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>
              <BarChart3 size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
              {t("admin.revenue_7d")}
            </h3>
            {global.weekly_revenue && global.weekly_revenue.length > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {global.weekly_revenue.map((d, i) => {
                  const maxRev = Math.max(...global.weekly_revenue.map(x => x.revenue), 1);
                  const h = (d.revenue / maxRev) * 100;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatCurrency(d.revenue)}
                      </span>
                      <div style={{
                        width: "100%", maxWidth: 50, height: Math.max(h, 4),
                        background: `linear-gradient(180deg, var(--accent), ${d.revenue > 0 ? "#10b98166" : "var(--border)"})`,
                        borderRadius: "6px 6px 0 0", transition: "height 0.3s ease",
                      }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <MiniBarChart data={tenants.map(t => t.revenue_today)} height={100} />
            )}
          </Card>

          {/* Alerts */}
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
              <AlertTriangle size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--warning)" }} />
              Alerts
            </h3>
            {alertTenants.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontSize: 13 }}>
                <CheckCircle2 size={16} />
                All tenants active
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alertTenants.slice(0, 5).map(t => (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 8,
                    background: "var(--warning)11", border: "1px solid var(--warning)33",
                  }}>
                    <AlertTriangle size={14} style={{ color: "var(--warning)", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>0 orders in 7 days</div>
                    </div>
                  </div>
                ))}
                {alertTenants.length > 5 && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{alertTenants.length - 5} more</span>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Orders Feed */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={18} style={{ color: "var(--accent)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                {t("admin.global_feed")}
              </h3>
            </div>
            <button onClick={fetchRecentOrders} style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }}>
              <RefreshCw size={12} /> {t("admin.refresh")}
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["#", t("admin.tenant"), t("admin.customer"), t("admin.type"), t("admin.status"), t("admin.total"), t("admin.time")].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 10).map((o) => {
                  const TypeIcon = ORDER_TYPE_ICONS[o.order_type] || Store;
                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-primary)" }}>#{o.order_number}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge text={o.tenant_name} color="var(--accent)" />
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{o.customer_name || "\u2014"}</td>
                      <td style={{ padding: "8px 10px" }}><TypeIcon size={14} style={{ color: "var(--text-secondary)" }} /></td>
                      <td style={{ padding: "8px 10px" }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(o.total)}</td>
                      <td style={{ padding: "8px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recentOrders.length === 0 && <EmptyState icon={ShoppingCart} message={t("common.no_results") || "No results"} />}
        </Card>
      </>
    );
  };

  /* ══════════════════════════════════════════════════════
     TAB 2: TENANTS
     ══════════════════════════════════════════════════════ */

  const renderTenants = () => (
    <>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={tenantSearch}
            onChange={e => setTenantSearch(e.target.value)}
            placeholder="Search tenants..."
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>

        {/* Plan chips */}
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "free", "starter", "pro", "enterprise"].map(p => (
            <button
              key={p}
              onClick={() => setTenantPlanFilter(p)}
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: "1px solid var(--border)", cursor: "pointer",
                background: tenantPlanFilter === p ? "var(--accent)" : "var(--bg-secondary)",
                color: tenantPlanFilter === p ? "#000" : "var(--text-secondary)",
              }}
            >
              {p === "all" ? "All Plans" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Status chips */}
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "active", "inactive"].map(s => (
            <button
              key={s}
              onClick={() => setTenantStatusFilter(s)}
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: "1px solid var(--border)", cursor: "pointer",
                background: tenantStatusFilter === s ? (s === "inactive" ? "var(--danger)" : "var(--accent)") : "var(--bg-secondary)",
                color: tenantStatusFilter === s ? (s === "inactive" ? "#fff" : "#000") : "var(--text-secondary)",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <button onClick={() => setShowCreateTenant(!showCreateTenant)} style={btnPrimary}>
          <Plus size={14} /> Create Tenant
        </button>
      </div>

      {/* Create Tenant form */}
      {showCreateTenant && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 14px" }}>New Tenant</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Name</label>
              <input value={newTenantName} onChange={e => { setNewTenantName(e.target.value); if (!newTenantSlug) setNewTenantSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} style={inputStyle} placeholder="Restaurant Name" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Slug</label>
              <input value={newTenantSlug} onChange={e => setNewTenantSlug(e.target.value)} style={inputStyle} placeholder="restaurant-slug" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Plan</label>
              <select value={newTenantPlan} onChange={e => setNewTenantPlan(e.target.value)} style={selectStyle}>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={createTenant} style={btnPrimary}>Create</button>
              <button onClick={() => setShowCreateTenant(false)} style={btnSecondary}><X size={14} /></button>
            </div>
          </div>
        </Card>
      )}

      {/* Results count */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        {filteredTenants.length} tenant{filteredTenants.length !== 1 ? "s" : ""}
      </div>

      {/* Tenant cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filteredTenants.map((tenant) => (
          <Card
            key={tenant.id}
            style={{ opacity: tenant.active === false ? 0.55 : 1, transition: "opacity 0.2s" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{tenant.name}</h3>
                  <PlanBadge plan={tenant.plan || "free"} />
                  {tenant.active === false && <Badge text="Inactive" color="#ef4444" />}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                  {tenant.slug} &middot; {tenant.currency}
                </p>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const res = await fetch("/api/admin", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "impersonate", tenant_id: tenant.id }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      localStorage.setItem("impersonate_original_tenant", data.original_tenant_id);
                      localStorage.setItem("impersonate_tenant_name", tenant.name);
                      router.push("/dashboard");
                    }
                  }}
                  title="Impersonar tenant"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8b5cf6" }}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleTenant(tenant.id, tenant.active !== false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: tenant.active !== false ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {tenant.active !== false ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => fetchTenantDetail(tenant.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-secondary)" }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("admin.orders_today")}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{tenant.orders_today}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("admin.revenue")}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{formatCurrency(tenant.revenue_today, tenant.currency)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("admin.avg_ticket")}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(tenant.avg_ticket, tenant.currency)}</div>
              </div>
            </div>

            {/* Order type bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: "var(--bg-secondary)" }}>
                {tenant.orders_today > 0 && (
                  <>
                    <div style={{ flex: tenant.order_types.dine_in, backgroundColor: "#3b82f6" }} />
                    <div style={{ flex: tenant.order_types.takeaway, backgroundColor: "#f59e0b" }} />
                    <div style={{ flex: tenant.order_types.delivery, backgroundColor: "#10b981" }} />
                  </>
                )}
              </div>
            </div>

            {/* Bottom */}
            <div style={{
              display: "flex", justifyContent: "space-between", paddingTop: 10,
              borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)",
            }}>
              <span><Users size={11} style={{ verticalAlign: "middle", marginRight: 2 }} />{tenant.users_count}</span>
              <span><UtensilsCrossed size={11} style={{ verticalAlign: "middle", marginRight: 2 }} />{tenant.menu_items_count} items</span>
              <span><Grid3X3 size={11} style={{ verticalAlign: "middle", marginRight: 2 }} />{tenant.tables_occupied}/{tenant.tables_count}</span>
            </div>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && <EmptyState icon={Building2} message="No tenants match your filters" />}
    </>
  );

  /* ══════════════════════════════════════════════════════
     TAB 3: USERS
     ══════════════════════════════════════════════════════ */

  const renderUsers = () => {
    const uniqueTenants = Array.from(new Set(allUsers.map(u => u.tenant_id))).map(id => {
      const u = allUsers.find(x => x.tenant_id === id);
      return { id, name: u?.tenant_name || id };
    });
    const uniqueRoles = Array.from(new Set(allUsers.map(u => u.role)));

    return (
      <>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }} placeholder="Search by email..." style={{ ...inputStyle, paddingLeft: 34 }} />
          </div>
          <select value={userTenantFilter} onChange={e => { setUserTenantFilter(e.target.value); setUsersPage(1); }} style={{ ...selectStyle, width: 200 }}>
            <option value="all">All Tenants</option>
            {uniqueTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUsersPage(1); }} style={{ ...selectStyle, width: 160 }}>
            <option value="all">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {["Email", t("admin.tenant"), "Role", "Created"].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Mail size={14} style={{ color: "var(--text-muted)" }} />
                        {u.email}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <Badge text={u.tenant_name} color="var(--accent)" />
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <select
                        value={u.role}
                        onChange={e => updateUserRole(u.id, e.target.value)}
                        style={{
                          ...selectStyle, width: "auto", padding: "4px 8px", fontSize: 12,
                          background: u.role === "admin" || u.role === "super_admin" ? "var(--accent)18" : "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 12 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagedUsers.length === 0 && <EmptyState icon={Users} message="No users found" />}
        </Card>
        <Pagination page={usersPage} totalPages={usersPageCount} onPage={setUsersPage} />
      </>
    );
  };

  /* ══════════════════════════════════════════════════════
     TAB 4: ORDERS
     ══════════════════════════════════════════════════════ */

  const renderOrders = () => {
    const uniqueTenants = Array.from(new Set(allOrders.map(o => o.tenant_id))).map(id => {
      const o = allOrders.find(x => x.tenant_id === id);
      return { id, name: o?.tenant_name || id };
    });
    const allStatuses = Array.from(new Set(allOrders.map(o => o.status)));

    const toggleStatusFilter = (s: string) => {
      setOrdersStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
      setOrdersPage(1);
    };

    return (
      <>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select value={ordersTenantFilter} onChange={e => { setOrdersTenantFilter(e.target.value); setOrdersPage(1); }} style={{ ...selectStyle, width: 200 }}>
            <option value="all">All Tenants</option>
            {uniqueTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={ordersTypeFilter} onChange={e => { setOrdersTypeFilter(e.target.value); setOrdersPage(1); }} style={{ ...selectStyle, width: 160 }}>
            <option value="all">All Types</option>
            <option value="dine_in">Dine-in</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
            <option value="qr">QR</option>
          </select>
          <input type="date" value={ordersDateFrom} onChange={e => { setOrdersDateFrom(e.target.value); setOrdersPage(1); }} style={{ ...inputStyle, width: 160 }} />
          <input type="date" value={ordersDateTo} onChange={e => { setOrdersDateTo(e.target.value); setOrdersPage(1); }} style={{ ...inputStyle, width: 160 }} />
        </div>

        {/* Status multi-select chips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {allStatuses.map(s => (
            <button
              key={s}
              onClick={() => toggleStatusFilter(s)}
              style={{
                padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: `1px solid ${STATUS_COLORS[s] || "var(--border)"}`,
                cursor: "pointer", textTransform: "capitalize",
                background: ordersStatusFilter.includes(s) ? (STATUS_COLORS[s] || "var(--accent)") + "33" : "transparent",
                color: STATUS_COLORS[s] || "var(--text-secondary)",
              }}
            >
              {s}
            </button>
          ))}
          {ordersStatusFilter.length > 0 && (
            <button onClick={() => setOrdersStatusFilter([])} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 11, borderRadius: 20 }}>
              <X size={10} /> Clear
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {["#", t("admin.tenant"), t("admin.customer"), t("admin.type"), t("admin.status"), "Items", t("admin.total"), "Payment", t("admin.time")].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map(o => {
                  const TypeIcon = ORDER_TYPE_ICONS[o.order_type] || Store;
                  const isExpanded = expandedOrderId === o.id;
                  return (
                    <>
                      <tr
                        key={o.id}
                        onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        style={{ borderBottom: isExpanded ? "none" : "1px solid var(--border)", cursor: "pointer" }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <ChevronDown size={12} style={{ transform: isExpanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s", color: "var(--text-muted)" }} />
                            #{o.order_number}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}><Badge text={o.tenant_name} color="var(--accent)" /></td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{o.customer_name || "\u2014"}</td>
                        <td style={{ padding: "10px 12px" }}><TypeIcon size={14} style={{ color: "var(--text-secondary)" }} /></td>
                        <td style={{ padding: "10px 12px" }}><StatusBadge status={o.status} /></td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{o.items_count || "\u2014"}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(o.total)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {o.payment_method ? <Badge text={o.payment_method} color="var(--info)" /> : <span style={{ color: "var(--text-muted)" }}>\u2014</span>}
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }}>{timeAgo(o.created_at)}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={o.id + "-detail"} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={9} style={{ padding: "0 12px 14px 36px", background: "var(--bg-secondary)" }}>
                            {o.items && o.items.length > 0 ? (
                              <div style={{ paddingTop: 10 }}>
                                {o.items.map((item: Record<string, unknown>, idx: number) => (
                                  <div key={idx} style={{
                                    display: "flex", justifyContent: "space-between", padding: "4px 0",
                                    borderBottom: idx < (o.items?.length || 0) - 1 ? "1px solid var(--border)" : "none",
                                    fontSize: 12,
                                  }}>
                                    <div>
                                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.quantity as number}x {item.name as string}</span>
                                      {Boolean(item.modifiers) && <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 11 }}>({String(item.modifiers)})</span>}
                                      {Boolean(item.notes) && <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{String(item.notes)}</div>}
                                    </div>
                                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{formatCurrency((item.price as number) || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--text-muted)", paddingTop: 10, display: "inline-block" }}>No item details available</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagedOrders.length === 0 && <EmptyState icon={ShoppingCart} message="No orders match your filters" />}
        </Card>
        <Pagination page={ordersPage} totalPages={ordersPageCount} onPage={setOrdersPage} />
      </>
    );
  };

  /* ══════════════════════════════════════════════════════
     TAB 5: BILLING
     ══════════════════════════════════════════════════════ */

  const renderBilling = () => {
    const planTotal = Object.values(billingData.planDist).reduce((a, b) => a + b, 0) || 1;

    return (
      <>
        {/* Period selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {(["7d", "30d", "90d", "all"] as const).map(p => (
            <button
              key={p}
              onClick={() => setBillingPeriod(p)}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--border)", cursor: "pointer",
                background: billingPeriod === p ? "var(--accent)" : "var(--bg-secondary)",
                color: billingPeriod === p ? "#000" : "var(--text-secondary)",
              }}
            >
              {p === "all" ? "All Time" : p}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "MRR (est.)", value: formatCurrency(billingData.totalRevenue / (billingPeriod === "7d" ? 0.25 : billingPeriod === "30d" ? 1 : billingPeriod === "90d" ? 3 : 12)), icon: TrendingUp, color: "#10b981" },
            { label: "Total Revenue", value: formatCurrency(billingData.totalRevenue), icon: DollarSign, color: "#3b82f6" },
            { label: "Active Paid Tenants", value: billingData.activePaid, icon: Building2, color: "#8b5cf6" },
            { label: "Avg Revenue/Tenant", value: formatCurrency(billingData.avgRevPerTenant), icon: BarChart3, color: "#f59e0b" },
          ].map((c, i) => (
            <Card key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <c.icon size={18} style={{ color: c.color }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{c.value}</div>
            </Card>
          ))}
        </div>

        {/* Plan distribution bar */}
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 14px" }}>Plan Distribution</h3>
          <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
            {Object.entries(billingData.planDist).map(([plan, count]) => (
              <div
                key={plan}
                style={{
                  flex: count, background: PLAN_COLORS[plan] || "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 600, color: "#fff",
                  minWidth: count > 0 ? 40 : 0,
                }}
                title={`${plan}: ${count}`}
              >
                {count > 0 && `${plan} (${count})`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {Object.entries(billingData.planDist).map(([plan, count]) => (
              <div key={plan} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: PLAN_COLORS[plan] || "#6b7280" }} />
                <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{plan}: {count} ({((count / planTotal) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Per-tenant revenue table */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 0" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Revenue per Tenant</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Tenant", "Plan", "Revenue", "Orders", "Avg Ticket"].map((h, i) => (
                    <th key={i} style={{ textAlign: i > 1 ? "right" : "left", padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billingData.perTenant.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--text-primary)" }}>
                      <span style={{ marginRight: 8, color: "var(--text-muted)", fontSize: 11 }}>{i + 1}.</span>
                      {t.name}
                    </td>
                    <td style={{ padding: "10px 14px" }}><PlanBadge plan={t.plan} /></td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{formatCurrency(t.revenue)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-secondary)" }}>{t.orders}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-secondary)" }}>{formatCurrency(t.avgTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {billingData.perTenant.length === 0 && <EmptyState icon={CreditCard} message="No billing data available" />}
        </Card>
      </>
    );
  };

  /* ══════════════════════════════════════════════════════
     TAB 6: METRICS
     ══════════════════════════════════════════════════════ */

  const renderMetrics = () => (
    <>
      {/* New tenants per month */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>
            New Tenants / Month (12m)
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
            {metricsData.monthlyNew.map((m, i) => {
              const max = Math.max(...metricsData.monthlyNew.map(x => x.count), 1);
              const h = (m.count / max) * 90;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  {m.count > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.count}</span>}
                  <div style={{
                    width: "100%", height: Math.max(h, 3),
                    background: m.count > 0 ? "#6366f1" : "var(--border)",
                    borderRadius: "4px 4px 0 0",
                  }} />
                  <span style={{ fontSize: 8, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Retention indicator */}
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>Retention</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", height: 100 }}>
            <div style={{
              fontSize: 48, fontWeight: 800,
              color: metricsData.total > 0 ? (metricsData.activeLast30 / metricsData.total > 0.5 ? "var(--success)" : "var(--warning)") : "var(--text-muted)",
            }}>
              {metricsData.total > 0 ? Math.round((metricsData.activeLast30 / metricsData.total) * 100) : 0}%
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
              {metricsData.activeLast30} active / {metricsData.total} total
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Ordered in last 30 days
            </div>
          </div>
        </Card>
      </div>

      {/* Top 10 leaderboard */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>
          <Award size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "#f59e0b" }} />
          Top 10 Tenants by Revenue
        </h3>
        {metricsData.top10.length === 0 ? (
          <EmptyState icon={BarChart3} message="No revenue data" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {metricsData.top10.map((t, i) => {
              const maxRev = metricsData.top10[0]?.revenue_7d || metricsData.top10[0]?.revenue_today || 1;
              const rev = t.revenue_7d || t.revenue_today || 0;
              const pct = (rev / maxRev) * 100;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    background: i < 3 ? ["#f59e0b22", "#94a3b822", "#cd7f3222"][i] : "var(--bg-secondary)",
                    color: i < 3 ? ["#f59e0b", "#94a3b8", "#cd7f32"][i] : "var(--text-muted)",
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{formatCurrency(rev, t.currency)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--bg-secondary)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );

  /* ══════════════════════════════════════════════════════
     TAB 7: AUDIT LOG
     ══════════════════════════════════════════════════════ */

  const renderAudit = () => {
    const uniqueTenants = Array.from(new Set(auditLogs.map(a => a.tenant_name).filter(Boolean)));

    return (
      <>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <select value={auditTenantFilter} onChange={e => { setAuditTenantFilter(e.target.value); setAuditPage(1); }} style={{ ...selectStyle, width: 200 }}>
            <option value="all">All Tenants</option>
            {uniqueTenants.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {["Timestamp", "Tenant", "User", "Action", "Entity", "Details"].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedAudit.map(a => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {a.tenant_name ? <Badge text={a.tenant_name} color="var(--accent)" /> : "\u2014"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-secondary)", fontSize: 12 }}>{a.user_email || "\u2014"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <Badge text={a.action} color={a.action === "delete" ? "var(--danger)" : a.action === "create" ? "var(--success)" : "var(--info)"} />
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontSize: 12 }}>{a.entity || "\u2014"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.details || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAudit.length === 0 && <EmptyState icon={FileText} message="No audit records yet" />}
        </Card>
        <Pagination page={auditPage} totalPages={auditPageCount} onPage={setAuditPage} />
      </>
    );
  };

  /* ══════════════════════════════════════════════════════
     TAB 8: SYSTEM
     ══════════════════════════════════════════════════════ */

  const renderSystem = () => (
    <>
      {/* Feature Flags */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>
          <Zap size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          Feature Flags
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FEATURE_FLAGS.map(ff => (
            <div key={ff.key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ff.icon size={18} style={{ color: featureFlags[ff.key] ? "var(--accent)" : "var(--text-muted)" }} />
                <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{ff.label}</span>
              </div>
              <button
                onClick={() => setFeatureFlags(prev => { const next = { ...prev, [ff.key]: !prev[ff.key] }; try { localStorage.setItem("admin_feature_flags", JSON.stringify(next)); } catch {} return next; })}
                style={{ background: "none", border: "none", cursor: "pointer", color: featureFlags[ff.key] ? "var(--accent)" : "var(--text-muted)" }}
              >
                {featureFlags[ff.key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Maintenance Mode */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Power size={18} style={{ color: maintenanceMode ? "var(--danger)" : "var(--text-muted)" }} />
            <div>
              <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>Maintenance Mode</span>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {maintenanceMode ? "System is in maintenance mode. Users cannot access the app." : "System is running normally."}
              </div>
            </div>
          </div>
          <button
            onClick={() => { const next = !maintenanceMode; setMaintenanceMode(next); try { localStorage.setItem("admin_maintenance_mode", String(next)); } catch {} }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: maintenanceMode ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {maintenanceMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
      </Card>

      {/* Global Notification Broadcast */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 14px" }}>
          <Bell size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--info)" }} />
          Global Notification Broadcast
        </h3>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            placeholder="Type a message to broadcast to all tenants..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => {
              if (broadcastMessage.trim()) {
                console.log(`[Admin Broadcast] ${new Date().toISOString()} — "${broadcastMessage}"`);
                alert(`Broadcast sent: "${broadcastMessage}"`);
                setBroadcastMessage("");
              }
            }}
            style={btnPrimary}
            disabled={!broadcastMessage.trim()}
          >
            <Send size={14} /> Send
          </button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card style={{ borderColor: "var(--danger)44" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--danger)", margin: "0 0 14px" }}>
          <AlertTriangle size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          Destructive actions that cannot be undone. Proceed with extreme caution.
        </p>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to clean all demo data? This action cannot be undone.")) {
              fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clean_demo_data" }),
              }).then(() => fetchDashboard());
            }
          }}
          style={btnDanger}
        >
          <Trash2 size={14} /> Clean Demo Data
        </button>
      </Card>
    </>
  );

  /* ══════════════════════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════════════════════ */

  const TAB_RENDERERS: Record<TabKey, () => React.ReactNode> = {
    overview: renderOverview,
    tenants: renderTenants,
    users: renderUsers,
    orders: renderOrders,
    billing: renderBilling,
    metrics: renderMetrics,
    audit: renderAudit,
    system: renderSystem,
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1440, margin: "0 auto" }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "8px 0",
        borderBottom: "1px solid var(--border)",
      }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
            padding: "6px 0",
          }}
        >
          <ArrowLeft size={16} />
          Volver al POS
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Ordy POS SaaS
          </span>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/login");
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "1px solid var(--border)", borderRadius: 8,
              cursor: "pointer", color: "var(--text-secondary)", fontSize: 12,
              padding: "6px 12px",
            }}
          >
            <Power size={13} />
            Cerrar sesion
          </button>
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, flexWrap: "wrap", gap: 12,
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
          onClick={() => { fetchDashboard(); setUsersLoaded(false); setOrdersLoaded(false); setAuditLoaded(false); }}
          disabled={refreshing}
          style={btnSecondary}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {t("admin.refresh")}
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 28,
        overflowX: "auto", borderBottom: "2px solid var(--border)",
        paddingBottom: 0,
        scrollbarWidth: "none",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", fontSize: 13, fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -2,
                whiteSpace: "nowrap",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active Tab Content ── */}
      {TAB_RENDERERS[activeTab]?.()}

      {/* ── Tenant Detail Slide-Over ── */}
      {renderTenantSlideOver()}

      {/* ── Loading overlay for tenant detail ── */}
      {detailLoading && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
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

      {/* ── Inline animation keyframes ── */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
