/**
 * SUPER ADMIN API — Bypasses RLS via service client
 *
 * GET /api/admin?action=dashboard  → Global stats + all tenants
 * GET /api/admin?action=tenant&id=xxx → Single tenant deep drill
 * POST /api/admin { action, ... }  → Mutations (toggle tenant, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";

function createServiceClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/* ── Auth guard: must be super_admin ── */

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
  return profile;
}

/* ── GET handler ── */

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const action = req.nextUrl.searchParams.get("action") || "dashboard";
  const svc = createServiceClient();

  if (action === "dashboard") {
    return NextResponse.json(await getDashboard(svc));
  }

  if (action === "tenant") {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
    return NextResponse.json(await getTenantDetail(svc, id));
  }

  if (action === "recent-orders") {
    return NextResponse.json(await getRecentOrders(svc));
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/* ── POST handler ── */

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const svc = createServiceClient();

  if (body.action === "toggle_tenant") {
    const { tenant_id, active } = body;
    const { error } = await svc
      .from("tenants")
      .update({ active })
      .eq("id", tenant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_plan") {
    const { tenant_id, plan } = body;
    const { error } = await svc
      .from("tenants")
      .update({ plan })
      .eq("id", tenant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/* ── Dashboard data ── */

async function getDashboard(svc: ReturnType<typeof createServiceClient>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // All tenants
  const { data: tenants } = await svc
    .from("tenants")
    .select("id, name, slug, plan, active, currency, created_at, business_hours, tax_rate")
    .order("created_at", { ascending: true });

  // All orders today (cross-tenant)
  const { data: ordersToday } = await svc
    .from("orders")
    .select("id, tenant_id, total, status, order_type, created_at, tip")
    .gte("created_at", todayISO);

  // All orders total (for lifetime stats)
  const { count: totalOrdersAllTime } = await svc
    .from("orders")
    .select("id", { count: "exact", head: true });

  // Users count per tenant
  const { data: users } = await svc
    .from("users")
    .select("id, tenant_id, role");

  // Menu items count per tenant
  const { data: menuItems } = await svc
    .from("menu_items")
    .select("id, tenant_id");

  // Tables count per tenant
  const { data: tables } = await svc
    .from("restaurant_tables")
    .select("id, tenant_id, status");

  // Build per-tenant stats
  const tenantStats = (tenants || []).map((t: Record<string, unknown>) => {
    const tOrders = (ordersToday || []).filter((o: Record<string, unknown>) => o.tenant_id === t.id);
    const tUsers = (users || []).filter((u: Record<string, unknown>) => u.tenant_id === t.id);
    const tMenu = (menuItems || []).filter((m: Record<string, unknown>) => m.tenant_id === t.id);
    const tTables = (tables || []).filter((tb: Record<string, unknown>) => tb.tenant_id === t.id);
    const occupiedTables = tTables.filter((tb: Record<string, unknown>) => tb.status === "occupied");

    const revenue = tOrders
      .filter((o: Record<string, unknown>) => o.status !== "cancelled")
      .reduce((sum: number, o: Record<string, unknown>) => sum + ((o.total as number) || 0), 0);

    const tips = tOrders.reduce((sum: number, o: Record<string, unknown>) => sum + ((o.tip as number) || 0), 0);

    const paidOrders = tOrders.filter((o: Record<string, unknown>) =>
      o.status !== "cancelled" && o.status !== "pending"
    );

    return {
      ...t,
      orders_today: tOrders.length,
      revenue_today: revenue,
      tips_today: tips,
      avg_ticket: paidOrders.length > 0 ? revenue / paidOrders.length : 0,
      users_count: tUsers.length,
      menu_items_count: tMenu.length,
      tables_count: tTables.length,
      tables_occupied: occupiedTables.length,
      order_types: {
        dine_in: tOrders.filter((o: Record<string, unknown>) => o.order_type === "dine_in" || o.order_type === "qr").length,
        takeaway: tOrders.filter((o: Record<string, unknown>) => o.order_type === "takeaway").length,
        delivery: tOrders.filter((o: Record<string, unknown>) => o.order_type === "delivery").length,
      },
    };
  });

  // Global KPIs
  const allValidOrders = (ordersToday || []).filter((o: Record<string, unknown>) => o.status !== "cancelled");
  const globalRevenue = allValidOrders.reduce((s: number, o: Record<string, unknown>) => s + ((o.total as number) || 0), 0);
  const globalTips = (ordersToday || []).reduce((s: number, o: Record<string, unknown>) => s + ((o.tip as number) || 0), 0);

  return {
    global: {
      total_tenants: (tenants || []).length,
      active_tenants: (tenants || []).filter((t: Record<string, unknown>) => t.active !== false).length,
      orders_today: (ordersToday || []).length,
      revenue_today: globalRevenue,
      tips_today: globalTips,
      avg_ticket: allValidOrders.length > 0 ? globalRevenue / allValidOrders.length : 0,
      total_orders_all_time: totalOrdersAllTime || 0,
      total_users: (users || []).length,
      total_menu_items: (menuItems || []).length,
      total_tables: (tables || []).length,
    },
    tenants: tenantStats,
  };
}

/* ── Tenant deep drill ── */

async function getTenantDetail(svc: ReturnType<typeof createServiceClient>, tenantId: string) {
  // Tenant info
  const { data: tenant } = await svc
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (!tenant) return { error: "Tenant not found" };

  // Last 7 days orders
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentOrders } = await svc
    .from("orders")
    .select("id, order_number, total, status, order_type, payment_method, created_at, tip, customer_name")
    .eq("tenant_id", tenantId)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  // Menu categories
  const { data: categories } = await svc
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order");

  // Menu items
  const { data: items } = await svc
    .from("menu_items")
    .select("id, name, price, available, category_id")
    .eq("tenant_id", tenantId);

  // Users
  const { data: users } = await svc
    .from("users")
    .select("id, email, role, created_at")
    .eq("tenant_id", tenantId);

  // Tables
  const { data: tables } = await svc
    .from("restaurant_tables")
    .select("id, number, capacity, status")
    .eq("tenant_id", tenantId)
    .order("number");

  // Payments last 7 days
  const { data: payments } = await svc
    .from("payments")
    .select("id, amount, method, status, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  // Daily revenue for last 7 days
  const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split("T")[0];
    const dayOrders = (recentOrders || []).filter((o: Record<string, unknown>) => {
      const oDate = (o.created_at as string).split("T")[0];
      return oDate === dayStr && o.status !== "cancelled";
    });
    dailyRevenue.push({
      date: dayStr,
      revenue: dayOrders.reduce((s: number, o: Record<string, unknown>) => s + ((o.total as number) || 0), 0),
      orders: dayOrders.length,
    });
  }

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const o of (recentOrders || [])) {
    const s = (o as Record<string, unknown>).status as string;
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
  }

  // Payment method breakdown
  const paymentMethods: Record<string, number> = {};
  for (const p of (payments || [])) {
    const m = (p as Record<string, unknown>).method as string;
    paymentMethods[m] = (paymentMethods[m] || 0) + 1;
  }

  return {
    tenant,
    orders: recentOrders || [],
    categories: categories || [],
    menu_items: items || [],
    users: users || [],
    tables: tables || [],
    payments: payments || [],
    daily_revenue: dailyRevenue,
    status_breakdown: statusBreakdown,
    payment_methods: paymentMethods,
  };
}

/* ── Recent orders across all tenants ── */

async function getRecentOrders(svc: ReturnType<typeof createServiceClient>) {
  const { data: orders } = await svc
    .from("orders")
    .select("id, order_number, total, status, order_type, created_at, tenant_id, customer_name, tip")
    .order("created_at", { ascending: false })
    .limit(30);

  // Get tenant names
  const tenantIds = [...new Set((orders || []).map((o: Record<string, unknown>) => o.tenant_id))];
  const { data: tenants } = await svc
    .from("tenants")
    .select("id, name, slug")
    .in("id", tenantIds);

  const tenantMap: Record<string, { name: string; slug: string }> = {};
  for (const t of (tenants || [])) {
    tenantMap[(t as Record<string, unknown>).id as string] = {
      name: (t as Record<string, unknown>).name as string,
      slug: (t as Record<string, unknown>).slug as string,
    };
  }

  return {
    orders: (orders || []).map((o: Record<string, unknown>) => ({
      ...o,
      tenant_name: tenantMap[o.tenant_id as string]?.name || "Unknown",
      tenant_slug: tenantMap[o.tenant_id as string]?.slug || "",
    })),
  };
}
