/**
 * SUPER ADMIN API — Multi-tenant restaurant SaaS POS
 * Bypasses RLS via service client. All endpoints require super_admin role.
 *
 * GET  /api/admin?action=dashboard       → Global KPIs + per-tenant summaries with yesterday deltas
 * GET  /api/admin?action=tenant&id=xxx   → Deep drill into one tenant
 * GET  /api/admin?action=recent-orders   → Last 50 orders across all tenants
 * GET  /api/admin?action=all-users       → All users, filterable & paginated
 * GET  /api/admin?action=orders-feed     → Global orders with full filters & pagination
 * GET  /api/admin?action=billing         → Revenue per tenant, plan distribution, MRR
 * GET  /api/admin?action=metrics         → Growth data, top tenants, retention
 * GET  /api/admin?action=audit-log       → Audit log entries, filterable & paginated
 * GET  /api/admin?action=system-config   → System-wide settings
 *
 * POST /api/admin { action: "toggle_tenant", tenant_id, active }
 * POST /api/admin { action: "update_plan", tenant_id, plan }
 * POST /api/admin { action: "update_tenant", tenant_id, ...fields }
 * POST /api/admin { action: "create_tenant", name, slug, plan, currency, tax_rate }
 * POST /api/admin { action: "update_user_role", user_id, role }
 * POST /api/admin { action: "delete_orders", tenant_id }
 * POST /api/admin { action: "clean_demo_data" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient, createServiceClient } from "@/lib/supabase-server";

type Svc = ReturnType<typeof createServiceClient>;
type Row = Record<string, unknown>;

/* ─────────────────────────────────────────────
   Auth guard
───────────────────────────────────────────── */

async function requireSuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("users")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") return null;
  return profile as Row;
}

function ok(data: unknown) {
  return NextResponse.json(data);
}

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function dateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function sumField(rows: Row[], field: string): number {
  return rows.reduce((s, r) => s + ((r[field] as number) || 0), 0);
}

function countBy(rows: Row[], field: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = (r[field] as string) || "unknown";
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 29,
  pro: 79,
  enterprise: 199,
};

/* ─────────────────────────────────────────────
   GET handler
───────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") || "dashboard";
  const svc = createServiceClient();

  switch (action) {
    case "dashboard":
      return ok(await getDashboard(svc));
    case "tenant": {
      const id = sp.get("id");
      if (!id) return err("Missing tenant id");
      return ok(await getTenantDetail(svc, id));
    }
    case "recent-orders":
      return ok(await getRecentOrders(svc));
    case "all-users":
      return ok(await getAllUsers(svc, sp));
    case "orders-feed":
      return ok(await getOrdersFeed(svc, sp));
    case "billing":
      return ok(await getBilling(svc, sp));
    case "metrics":
      return ok(await getMetrics(svc));
    case "audit-log":
      return ok(await getAuditLog(svc, sp));
    case "system-config":
      return ok(await getSystemConfig());
    default:
      return err("Unknown action");
  }
}

/* ─────────────────────────────────────────────
   POST handler
───────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const body = await req.json();
  const svc = createServiceClient();

  switch (body.action) {
    case "toggle_tenant":
      return ok(await postToggleTenant(svc, body));
    case "update_plan":
      return ok(await postUpdatePlan(svc, body));
    case "update_tenant":
      return ok(await postUpdateTenant(svc, body));
    case "create_tenant":
      return ok(await postCreateTenant(svc, body));
    case "update_user_role":
      return ok(await postUpdateUserRole(svc, body));
    case "delete_orders":
      return ok(await postDeleteOrders(svc, body));
    case "impersonate":
      return ok(await postImpersonate(svc, body, admin));
    case "clean_demo_data":
      return ok(await postCleanDemoData(svc));
    default:
      return err("Unknown action");
  }
}

/* ═════════════════════════════════════════════
   GET ACTIONS
═════════════════════════════════════════════ */

/* ── 1. Dashboard ── */

async function getDashboard(svc: Svc) {
  const todayISO = startOfDay(new Date());
  const yesterdayStart = daysAgo(1);

  // Parallel fetches
  const [
    { data: tenants },
    { data: ordersToday },
    { data: ordersYesterday },
    { count: totalOrdersAllTime },
    { data: users },
    { data: menuItems },
    { data: tables },
    { data: loyaltyMembers },
  ] = await Promise.all([
    svc.from("tenants").select("id, name, slug, plan, active, currency, created_at, business_hours, tax_rate").order("created_at", { ascending: true }),
    svc.from("orders").select("id, tenant_id, total, status, order_type, created_at, tip").gte("created_at", todayISO),
    svc.from("orders").select("id, tenant_id, total, status, order_type, created_at, tip").gte("created_at", yesterdayStart).lt("created_at", todayISO),
    svc.from("orders").select("id", { count: "exact", head: true }),
    svc.from("users").select("id, tenant_id, role"),
    svc.from("menu_items").select("id, tenant_id"),
    svc.from("restaurant_tables").select("id, tenant_id, status"),
    svc.from("loyalty_customers").select("id", { count: "exact", head: true }),
  ]);

  const allTenants = (tenants || []) as Row[];
  const allToday = (ordersToday || []) as Row[];
  const allYesterday = (ordersYesterday || []) as Row[];
  const allUsers = (users || []) as Row[];
  const allMenuItems = (menuItems || []) as Row[];
  const allTables = (tables || []) as Row[];

  // Per-tenant stats
  const tenantStats = allTenants.map((t) => {
    const tId = t.id as string;
    const tOrders = allToday.filter((o) => o.tenant_id === tId);
    const tOrdersYest = allYesterday.filter((o) => o.tenant_id === tId);
    const tUsers = allUsers.filter((u) => u.tenant_id === tId);
    const tMenu = allMenuItems.filter((m) => m.tenant_id === tId);
    const tTables = allTables.filter((tb) => tb.tenant_id === tId);
    const occupiedTables = tTables.filter((tb) => tb.status === "occupied");

    const validOrders = tOrders.filter((o) => o.status !== "cancelled");
    const validYest = tOrdersYest.filter((o) => o.status !== "cancelled");
    const revenue = sumField(validOrders, "total");
    const revenueYest = sumField(validYest, "total");
    const tips = sumField(tOrders, "tip");
    const paidOrders = validOrders.filter((o) => o.status !== "pending");

    return {
      ...t,
      orders_today: tOrders.length,
      orders_yesterday: tOrdersYest.length,
      revenue_today: revenue,
      revenue_yesterday: revenueYest,
      revenue_delta: revenueYest > 0 ? ((revenue - revenueYest) / revenueYest) * 100 : revenue > 0 ? 100 : 0,
      tips_today: tips,
      avg_ticket: paidOrders.length > 0 ? revenue / paidOrders.length : 0,
      users_count: tUsers.length,
      menu_items_count: tMenu.length,
      tables_count: tTables.length,
      tables_occupied: occupiedTables.length,
      order_types: {
        dine_in: tOrders.filter((o) => o.order_type === "dine_in" || o.order_type === "qr").length,
        takeaway: tOrders.filter((o) => o.order_type === "takeaway").length,
        delivery: tOrders.filter((o) => o.order_type === "delivery").length,
      },
    };
  });

  // Global KPIs
  const validToday = allToday.filter((o) => o.status !== "cancelled");
  const validYesterday = allYesterday.filter((o) => o.status !== "cancelled");
  const globalRevenue = sumField(validToday, "total");
  const globalRevenueYest = sumField(validYesterday, "total");
  const globalTips = sumField(allToday, "tip");
  const globalTipsYest = sumField(allYesterday, "tip");

  return {
    global: {
      total_tenants: allTenants.length,
      active_tenants: allTenants.filter((t) => t.active !== false).length,
      orders_today: allToday.length,
      orders_yesterday: allYesterday.length,
      orders_delta: allYesterday.length > 0 ? ((allToday.length - allYesterday.length) / allYesterday.length) * 100 : allToday.length > 0 ? 100 : 0,
      revenue_today: globalRevenue,
      revenue_yesterday: globalRevenueYest,
      revenue_delta: globalRevenueYest > 0 ? ((globalRevenue - globalRevenueYest) / globalRevenueYest) * 100 : globalRevenue > 0 ? 100 : 0,
      tips_today: globalTips,
      tips_yesterday: globalTipsYest,
      avg_ticket: validToday.length > 0 ? globalRevenue / validToday.length : 0,
      avg_ticket_yesterday: validYesterday.length > 0 ? globalRevenueYest / validYesterday.length : 0,
      total_orders_all_time: totalOrdersAllTime || 0,
      total_users: allUsers.length,
      total_menu_items: allMenuItems.length,
      total_tables: allTables.length,
      total_loyalty_members: loyaltyMembers || 0,
    },
    tenants: tenantStats,
  };
}

/* ── 2. Tenant detail ── */

async function getTenantDetail(svc: Svc, tenantId: string) {
  const { data: tenant } = await svc
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (!tenant) return { error: "Tenant not found" };

  const sevenDaysAgo = daysAgo(7);

  const [
    { data: recentOrders },
    { data: categories },
    { data: items },
    { data: users },
    { data: tables },
    { data: payments },
    { data: cashShifts },
    { count: loyaltyCount },
    { count: kdsCount },
  ] = await Promise.all([
    svc.from("orders")
      .select("id, order_number, total, status, order_type, payment_method, created_at, tip, customer_name")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200),
    svc.from("menu_categories")
      .select("id, name, sort_order")
      .eq("tenant_id", tenantId)
      .order("sort_order"),
    svc.from("menu_items")
      .select("id, name, price, available, category_id")
      .eq("tenant_id", tenantId),
    svc.from("users")
      .select("id, email, role, created_at")
      .eq("tenant_id", tenantId),
    svc.from("restaurant_tables")
      .select("id, number, capacity, status")
      .eq("tenant_id", tenantId)
      .order("number"),
    svc.from("payments")
      .select("id, amount, method, status, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(100),
    svc.from("cash_shifts")
      .select("id, opened_at, closed_at, opening_amount, closing_amount, status")
      .eq("tenant_id", tenantId)
      .order("opened_at", { ascending: false })
      .limit(10),
    svc.from("loyalty_customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    svc.from("kds_stations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  const orders = (recentOrders || []) as Row[];
  const paymentRows = (payments || []) as Row[];

  // Daily revenue chart (7 days)
  const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = dateStr(d);
    const dayOrders = orders.filter((o) => {
      const oDate = (o.created_at as string).split("T")[0];
      return oDate === day && o.status !== "cancelled";
    });
    dailyRevenue.push({
      date: day,
      revenue: sumField(dayOrders, "total"),
      orders: dayOrders.length,
    });
  }

  const statusBreakdown = countBy(orders, "status");
  const paymentMethods = countBy(paymentRows, "method");
  const orderTypes = countBy(orders, "order_type");

  return {
    tenant,
    orders,
    categories: categories || [],
    categories_count: (categories || []).length,
    menu_items: items || [],
    menu_items_count: (items || []).length,
    users: users || [],
    tables: tables || [],
    payments: paymentRows,
    cash_shifts: cashShifts || [],
    daily_revenue: dailyRevenue,
    status_breakdown: statusBreakdown,
    payment_methods: paymentMethods,
    order_types: orderTypes,
    loyalty_members_count: loyaltyCount || 0,
    kds_stations_count: kdsCount || 0,
  };
}

/* ── 3. Recent orders ── */

async function getRecentOrders(svc: Svc) {
  const { data: orders } = await svc
    .from("orders")
    .select("id, order_number, total, status, order_type, created_at, tenant_id, customer_name, tip, payment_method")
    .order("created_at", { ascending: false })
    .limit(50);

  const allOrders = (orders || []) as Row[];
  const tenantIds = [...new Set(allOrders.map((o) => o.tenant_id as string))];

  if (tenantIds.length === 0) return { orders: [] };

  const { data: tenants } = await svc
    .from("tenants")
    .select("id, name, slug")
    .in("id", tenantIds);

  const tenantMap: Record<string, Row> = {};
  for (const t of (tenants || []) as Row[]) {
    tenantMap[t.id as string] = t;
  }

  return {
    orders: allOrders.map((o) => ({
      ...o,
      tenant_name: (tenantMap[o.tenant_id as string]?.name as string) || "Unknown",
      tenant_slug: (tenantMap[o.tenant_id as string]?.slug as string) || "",
    })),
  };
}

/* ── 4. All users ── */

async function getAllUsers(svc: Svc, sp: URLSearchParams) {
  const tenantFilter = sp.get("tenant_id");
  const roleFilter = sp.get("role");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "25", 10)));
  const offset = (page - 1) * limit;

  let query = svc
    .from("users")
    .select("id, email, role, tenant_id, created_at, name", { count: "exact" });

  if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
  if (roleFilter) query = query.eq("role", roleFilter);

  const { data: users, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const allUsers = (users || []) as Row[];
  const tenantIds = [...new Set(allUsers.map((u) => u.tenant_id as string).filter(Boolean))];

  let tenantMap: Record<string, Row> = {};
  if (tenantIds.length > 0) {
    const { data: tenants } = await svc
      .from("tenants")
      .select("id, name, slug")
      .in("id", tenantIds);

    for (const t of (tenants || []) as Row[]) {
      tenantMap[t.id as string] = t;
    }
  }

  return {
    users: allUsers.map((u) => ({
      ...u,
      tenant_name: (tenantMap[u.tenant_id as string]?.name as string) || null,
    })),
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  };
}

/* ── 5. Orders feed ── */

async function getOrdersFeed(svc: Svc, sp: URLSearchParams) {
  const tenantFilter = sp.get("tenant_id");
  const statusFilter = sp.get("status");
  const orderTypeFilter = sp.get("order_type");
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  let query = svc
    .from("orders")
    .select("id, order_number, total, status, order_type, payment_method, created_at, tenant_id, customer_name, tip, table_number, notes", { count: "exact" });

  if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (orderTypeFilter) query = query.eq("order_type", orderTypeFilter);
  if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
  if (dateTo) {
    const to = new Date(dateTo);
    to.setDate(to.getDate() + 1);
    query = query.lt("created_at", to.toISOString());
  }

  const { data: orders, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const allOrders = (orders || []) as Row[];

  // Fetch order items for these orders
  const orderIds = allOrders.map((o) => o.id as string);
  let orderItemsMap: Record<string, Row[]> = {};

  if (orderIds.length > 0) {
    const { data: orderItems } = await svc
      .from("order_items")
      .select("id, order_id, menu_item_id, name, quantity, unit_price, total_price, notes")
      .in("order_id", orderIds);

    for (const item of (orderItems || []) as Row[]) {
      const oid = item.order_id as string;
      if (!orderItemsMap[oid]) orderItemsMap[oid] = [];
      orderItemsMap[oid].push(item);
    }
  }

  // Tenant names
  const tenantIds = [...new Set(allOrders.map((o) => o.tenant_id as string))];
  let tenantMap: Record<string, Row> = {};
  if (tenantIds.length > 0) {
    const { data: tenants } = await svc
      .from("tenants")
      .select("id, name, slug")
      .in("id", tenantIds);

    for (const t of (tenants || []) as Row[]) {
      tenantMap[t.id as string] = t;
    }
  }

  return {
    orders: allOrders.map((o) => ({
      ...o,
      tenant_name: (tenantMap[o.tenant_id as string]?.name as string) || "Unknown",
      items: orderItemsMap[o.id as string] || [],
    })),
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  };
}

/* ── 6. Billing ── */

async function getBilling(svc: Svc, sp: URLSearchParams) {
  const period = sp.get("period") || "30d";
  let periodDays: number | null = null;
  if (period === "7d") periodDays = 7;
  else if (period === "30d") periodDays = 30;
  else if (period === "90d") periodDays = 90;
  // "all" → null means no date filter

  const { data: tenants } = await svc
    .from("tenants")
    .select("id, name, slug, plan, active, created_at, currency");

  const allTenants = (tenants || []) as Row[];

  // Fetch orders for the period
  let ordersQuery = svc
    .from("orders")
    .select("id, tenant_id, total, status, created_at")
    .neq("status", "cancelled");

  if (periodDays !== null) {
    ordersQuery = ordersQuery.gte("created_at", daysAgo(periodDays));
  }

  const { data: orders } = await ordersQuery;
  const allOrders = (orders || []) as Row[];

  // Revenue per tenant
  const revenueByTenant: Record<string, number> = {};
  const ordersByTenant: Record<string, number> = {};
  for (const o of allOrders) {
    const tid = o.tenant_id as string;
    revenueByTenant[tid] = (revenueByTenant[tid] || 0) + ((o.total as number) || 0);
    ordersByTenant[tid] = (ordersByTenant[tid] || 0) + 1;
  }

  const tenantBilling = allTenants.map((t) => {
    const tid = t.id as string;
    const plan = (t.plan as string) || "free";
    return {
      id: tid,
      name: t.name,
      slug: t.slug,
      plan,
      active: t.active,
      currency: t.currency,
      created_at: t.created_at,
      plan_price: PLAN_PRICES[plan] ?? 0,
      revenue: revenueByTenant[tid] || 0,
      orders: ordersByTenant[tid] || 0,
    };
  });

  // Plan distribution
  const planDistribution = countBy(allTenants, "plan");

  // MRR calculation
  const mrr = allTenants
    .filter((t) => t.active !== false)
    .reduce((sum, t) => {
      const plan = (t.plan as string) || "free";
      return sum + (PLAN_PRICES[plan] ?? 0);
    }, 0);

  const totalRevenue = sumField(allOrders, "total");

  return {
    period,
    period_days: periodDays,
    total_revenue: totalRevenue,
    total_orders: allOrders.length,
    mrr,
    arr: mrr * 12,
    plan_distribution: planDistribution,
    plan_prices: PLAN_PRICES,
    tenants: tenantBilling.sort((a, b) => b.revenue - a.revenue),
  };
}

/* ── 7. Metrics ── */

async function getMetrics(svc: Svc) {
  const now = new Date();

  // New tenants per month (last 12 months)
  const { data: tenants } = await svc
    .from("tenants")
    .select("id, created_at, active")
    .gte("created_at", daysAgo(365));

  const allTenants = (tenants || []) as Row[];

  const tenantsPerMonth: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = allTenants.filter((t) => {
      const created = (t.created_at as string).substring(0, 7);
      return created === monthKey;
    }).length;
    tenantsPerMonth.push({ month: monthKey, count });
  }

  // Orders per week (last 12 weeks)
  const { data: recentOrders } = await svc
    .from("orders")
    .select("id, tenant_id, total, created_at")
    .gte("created_at", daysAgo(84))
    .neq("status", "cancelled");

  const allOrders = (recentOrders || []) as Row[];

  const ordersPerWeek: { week_start: string; orders: number; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekOrders = allOrders.filter((o) => {
      const d = new Date(o.created_at as string);
      return d >= weekStart && d < weekEnd;
    });

    ordersPerWeek.push({
      week_start: dateStr(weekStart),
      orders: weekOrders.length,
      revenue: sumField(weekOrders, "total"),
    });
  }

  // Top 10 tenants by revenue (last 30 days)
  const { data: monthOrders } = await svc
    .from("orders")
    .select("tenant_id, total")
    .gte("created_at", daysAgo(30))
    .neq("status", "cancelled");

  const revenueMap: Record<string, number> = {};
  for (const o of (monthOrders || []) as Row[]) {
    const tid = o.tenant_id as string;
    revenueMap[tid] = (revenueMap[tid] || 0) + ((o.total as number) || 0);
  }

  const { data: allTenantsList } = await svc
    .from("tenants")
    .select("id, name, slug, plan, active");

  const tenantLookup: Record<string, Row> = {};
  for (const t of (allTenantsList || []) as Row[]) {
    tenantLookup[t.id as string] = t;
  }

  const topTenants = Object.entries(revenueMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tid, revenue]) => ({
      tenant_id: tid,
      name: (tenantLookup[tid]?.name as string) || "Unknown",
      slug: (tenantLookup[tid]?.slug as string) || "",
      plan: (tenantLookup[tid]?.plan as string) || "free",
      revenue,
    }));

  // Retention: active in last 30 days vs total
  const activeInLast30d = new Set(
    (monthOrders || []).map((o: Row) => o.tenant_id as string)
  );
  const totalTenantCount = (allTenantsList || []).length;
  const activeTenantCount = activeInLast30d.size;

  return {
    tenants_per_month: tenantsPerMonth,
    orders_per_week: ordersPerWeek,
    top_tenants: topTenants,
    retention: {
      active_last_30d: activeTenantCount,
      total: totalTenantCount,
      rate: totalTenantCount > 0 ? (activeTenantCount / totalTenantCount) * 100 : 0,
    },
  };
}

/* ── 8. Audit log ── */

async function getAuditLog(svc: Svc, sp: URLSearchParams) {
  const tenantFilter = sp.get("tenant_id");
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  try {
    let query = svc
      .from("audit_log")
      .select("*", { count: "exact" });

    if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
    if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      query = query.lt("created_at", to.toISOString());
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Table might not exist
      return { entries: [], total: 0, page, limit, total_pages: 0, note: "audit_log table not available" };
    }

    return {
      entries: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    };
  } catch {
    return { entries: [], total: 0, page, limit, total_pages: 0, note: "audit_log table not available" };
  }
}

/* ── 9. System config ── */

async function getSystemConfig() {
  return {
    plans: PLAN_PRICES,
    supported_currencies: ["EUR", "USD", "GBP", "MXN", "BRL", "ARS", "COP"],
    supported_languages: ["es", "en", "fr", "de", "it"],
    order_types: ["dine_in", "takeaway", "delivery", "qr"],
    order_statuses: ["pending", "confirmed", "preparing", "ready", "served", "completed", "cancelled"],
    payment_methods: ["cash", "card", "bizum", "transfer", "other"],
    user_roles: ["super_admin", "admin", "manager", "waiter", "kitchen", "cashier"],
    features: {
      loyalty: true,
      kds: true,
      qr_ordering: true,
      escandallo: true,
      multi_language: true,
      analytics: true,
    },
    limits: {
      free: { menu_items: 30, users: 2, tables: 10 },
      starter: { menu_items: 100, users: 5, tables: 30 },
      pro: { menu_items: -1, users: 20, tables: -1 },
      enterprise: { menu_items: -1, users: -1, tables: -1 },
    },
  };
}

/* ═════════════════════════════════════════════
   POST ACTIONS
═════════════════════════════════════════════ */

/* ── 1. Toggle tenant active/inactive ── */

async function postToggleTenant(svc: Svc, body: Row) {
  const { tenant_id, active } = body;
  if (!tenant_id) return { error: "Missing tenant_id" };
  if (typeof active !== "boolean") return { error: "active must be a boolean" };

  const { error } = await svc
    .from("tenants")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", tenant_id);

  if (error) return { error: error.message };
  return { ok: true, tenant_id, active };
}

/* ── 2. Update tenant plan ── */

async function postUpdatePlan(svc: Svc, body: Row) {
  const { tenant_id, plan } = body;
  if (!tenant_id) return { error: "Missing tenant_id" };
  if (!plan || !PLAN_PRICES.hasOwnProperty(plan as string)) {
    return { error: `Invalid plan. Must be one of: ${Object.keys(PLAN_PRICES).join(", ")}` };
  }

  const { error } = await svc
    .from("tenants")
    .update({ plan, updated_at: new Date().toISOString() })
    .eq("id", tenant_id);

  if (error) return { error: error.message };
  return { ok: true, tenant_id, plan };
}

/* ── 3. Update tenant (partial) ── */

async function postUpdateTenant(svc: Svc, body: Row) {
  const { tenant_id, action: _action, ...fields } = body;
  if (!tenant_id) return { error: "Missing tenant_id" };

  // Only allow known safe fields
  const allowedFields = [
    "name", "slug", "plan", "active", "currency", "tax_rate",
    "business_hours", "logo_url", "address", "phone", "email",
    "timezone", "max_tables", "settings",
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(fields)) {
    if (allowedFields.includes(key)) {
      updates[key] = fields[key];
    }
  }

  if (Object.keys(updates).length <= 1) {
    return { error: "No valid fields to update" };
  }

  const { error } = await svc
    .from("tenants")
    .update(updates)
    .eq("id", tenant_id);

  if (error) return { error: error.message };
  return { ok: true, tenant_id, updated_fields: Object.keys(updates).filter((k) => k !== "updated_at") };
}

/* ── 4. Create tenant ── */

async function postCreateTenant(svc: Svc, body: Row) {
  const { name, slug, plan, currency, tax_rate } = body;

  if (!name || !slug) return { error: "name and slug are required" };

  // Check slug uniqueness
  const { data: existing } = await svc
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return { error: "Slug already taken" };

  const { data: tenant, error } = await svc
    .from("tenants")
    .insert({
      name,
      slug,
      plan: plan || "free",
      currency: currency || "EUR",
      tax_rate: tax_rate ?? 10,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { ok: true, tenant };
}

/* ── 5. Update user role ── */

async function postUpdateUserRole(svc: Svc, body: Row) {
  const { user_id, role } = body;
  if (!user_id) return { error: "Missing user_id" };

  const validRoles = ["super_admin", "admin", "manager", "waiter", "kitchen", "cashier"];
  if (!role || !validRoles.includes(role as string)) {
    return { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` };
  }

  const { error } = await svc
    .from("users")
    .update({ role })
    .eq("id", user_id);

  if (error) return { error: error.message };
  return { ok: true, user_id, role };
}

/* ── 6. Delete orders (tenant cleanup) ── */

async function postDeleteOrders(svc: Svc, body: Row) {
  const { tenant_id } = body;
  if (!tenant_id) return { error: "Missing tenant_id" };

  // Delete order items first (FK constraint)
  const { data: orders } = await svc
    .from("orders")
    .select("id")
    .eq("tenant_id", tenant_id);

  const orderIds = ((orders || []) as Row[]).map((o) => o.id as string);

  if (orderIds.length > 0) {
    await svc
      .from("order_items")
      .delete()
      .in("order_id", orderIds);
  }

  // Delete the orders
  const { error, count } = await svc
    .from("orders")
    .delete({ count: "exact" })
    .eq("tenant_id", tenant_id);

  if (error) return { error: error.message };
  return { ok: true, tenant_id, deleted_orders: count || 0 };
}

/* ── 7. Impersonate tenant ── */

async function postImpersonate(svc: Svc, body: Row, admin: Row) {
  const { tenant_id } = body;
  if (!tenant_id) return { error: "Missing tenant_id" };

  // Save original tenant_id so caller can store it
  const originalTenantId = admin.tenant_id as string;

  const { error } = await svc
    .from("users")
    .update({ tenant_id })
    .eq("id", admin.id);

  if (error) return { error: error.message };
  return { ok: true, original_tenant_id: originalTenantId, tenant_id };
}

/* ── 8. Clean demo data ── */

async function postCleanDemoData(svc: Svc) {
  // Delete in order respecting FK constraints
  await svc.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("cash_movements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("cash_shifts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  return { ok: true, message: "Demo data cleaned" };
}
