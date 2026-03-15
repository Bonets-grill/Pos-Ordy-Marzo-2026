import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/admin/qa-run
 * Run QA diagnostics on a specific tenant.
 * Only super_admin can run this.
 *
 * Body: { tenantId: string }
 *
 * SAFETY: Only READS data from the target tenant. Never writes or modifies.
 */

interface TestResult {
  phase: string;
  test: string;
  passed: boolean;
  detail?: string;
  critical?: boolean;
}

function fmt(n: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);
}

export async function POST(req: NextRequest) {
  // Auth check — super_admin only
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = createServiceClient();

  // Verify super_admin role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { tenantId } = await req.json();
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const results: TestResult[] = [];
  const pass = (phase: string, test: string, detail?: string) => {
    results.push({ phase, test, passed: true, detail });
  };
  const fail = (phase: string, test: string, detail: string, critical = false) => {
    results.push({ phase, test, passed: false, detail, critical });
  };

  try {
    // ── PHASE 1: Tenant exists ──
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name, slug, currency, tax_rate, tax_included, business_hours, timezone")
      .eq("id", tenantId)
      .single();

    if (tenantErr || !tenant) {
      fail("tenant", "Tenant exists", tenantErr?.message || "Not found", true);
      return NextResponse.json({ results, summary: buildSummary(results) });
    }
    pass("tenant", "Tenant exists", `${tenant.name} (${tenant.slug})`);

    if (tenant.business_hours) {
      pass("tenant", "Business hours configured");
    } else {
      fail("tenant", "Business hours configured", "No business hours set — agent won't know when restaurant is open/closed");
    }

    if (tenant.timezone) {
      pass("tenant", "Timezone set", tenant.timezone);
    } else {
      fail("tenant", "Timezone not set", "Defaults may be wrong");
    }

    // ── PHASE 2: Menu ──
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, name_es, active")
      .eq("tenant_id", tenantId);

    const activeCats = ((categories || []) as any[]).filter(c => c.active);
    if (activeCats.length > 0) {
      pass("menu", "Categories exist", `${activeCats.length} active, ${(categories || []).length - activeCats.length} inactive`);
    } else {
      fail("menu", "No active categories", "Menu will be empty for customers", true);
    }

    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name_es, price, available, active, category_id, allergens, image_url")
      .eq("tenant_id", tenantId);

    const activeItems = ((items || []) as any[]).filter(i => i.active);
    const availableItems = activeItems.filter(i => i.available);

    if (activeItems.length > 0) {
      pass("menu", "Menu items exist", `${activeItems.length} active, ${availableItems.length} available`);
    } else {
      fail("menu", "No active menu items", "Nothing to sell!", true);
    }

    // Check for items without prices
    const noPriceItems = activeItems.filter((i: any) => !i.price || i.price <= 0);
    if (noPriceItems.length > 0) {
      fail("menu", "Items with invalid price", `${noPriceItems.length} items: ${noPriceItems.map((i: any) => i.name_es).join(", ")}`, true);
    } else {
      pass("menu", "All items have valid prices");
    }

    // Check for items without images
    const noImageItems = activeItems.filter((i: any) => !i.image_url);
    if (noImageItems.length > 0) {
      fail("menu", "Items without images", `${noImageItems.length}/${activeItems.length} items have no image — QR menu will look incomplete`);
    } else {
      pass("menu", "All items have images");
    }

    // Check orphan items (category doesn't exist)
    const catIds = new Set(((categories || []) as any[]).map(c => c.id));
    const orphanItems = activeItems.filter((i: any) => !catIds.has(i.category_id));
    if (orphanItems.length > 0) {
      fail("menu", "Orphan items (invalid category)", `${orphanItems.length} items linked to non-existent categories`, true);
    } else {
      pass("menu", "All items linked to valid categories");
    }

    // Modifiers check
    const { data: modGroups } = await supabase
      .from("modifier_groups")
      .select("id, name_es, active, required")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    const { data: modifiers } = await supabase
      .from("modifiers")
      .select("id, group_id, name_es, price_delta, active")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    if ((modGroups || []).length > 0) {
      pass("menu", "Modifier groups configured", `${(modGroups || []).length} groups, ${(modifiers || []).length} modifiers`);

      // Check required groups with no modifiers
      const groupsWithMods = new Set(((modifiers || []) as any[]).map(m => m.group_id));
      const emptyRequired = ((modGroups || []) as any[]).filter(g => g.required && !groupsWithMods.has(g.id));
      if (emptyRequired.length > 0) {
        fail("menu", "Required modifier groups with no options", `${emptyRequired.map((g: any) => g.name_es).join(", ")} — orders will fail`, true);
      }
    } else {
      pass("menu", "No modifier groups (optional)", "Modifiers are optional — not an error");
    }

    // ── PHASE 3: Tables ──
    const { data: tables } = await supabase
      .from("restaurant_tables")
      .select("id, number, status, active")
      .eq("tenant_id", tenantId);

    const activeTables = ((tables || []) as any[]).filter(t => t.active);
    if (activeTables.length > 0) {
      const occupied = activeTables.filter((t: any) => t.status === "occupied");
      pass("tables", "Tables configured", `${activeTables.length} active, ${occupied.length} occupied`);
    } else {
      fail("tables", "No tables configured", "Dine-in orders and QR won't work");
    }

    // ── PHASE 4: Orders health ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: recentOrders, count: totalOrders } = await supabase
      .from("orders")
      .select("id, status, order_type, source, total, payment_status, created_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    pass("orders", "Total orders (7d)", `${(recentOrders || []).length} orders`);

    // Check for stuck orders (confirmed but not preparing after 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const stuckOrders = ((recentOrders || []) as any[]).filter(
      (o: any) => o.status === "confirmed" && o.created_at < thirtyMinAgo
    );
    if (stuckOrders.length > 0) {
      fail("orders", "Stuck orders (confirmed >30min)", `${stuckOrders.length} orders stuck — KDS may not be working`, true);
    } else {
      pass("orders", "No stuck orders");
    }

    // Check for unpaid completed orders
    const unpaid = ((recentOrders || []) as any[]).filter(
      (o: any) => ["served", "closed"].includes(o.status) && o.payment_status !== "paid"
    );
    if (unpaid.length > 0) {
      fail("orders", "Unpaid completed orders", `${unpaid.length} orders served/closed but not paid — revenue leak`);
    } else {
      pass("orders", "All completed orders are paid");
    }

    // Source distribution
    const sources: Record<string, number> = {};
    for (const o of recentOrders || []) {
      sources[o.source || "unknown"] = (sources[o.source || "unknown"] || 0) + 1;
    }
    pass("orders", "Order sources (7d)", Object.entries(sources).map(([k, v]) => `${k}:${v}`).join(", ") || "none");

    // ── PHASE 5: Payments ──
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, method, order_id")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo.toISOString());

    if ((payments || []).length > 0) {
      const methods: Record<string, number> = {};
      let totalRevenue = 0;
      for (const p of payments || []) {
        methods[p.method] = (methods[p.method] || 0) + 1;
        totalRevenue += p.amount;
      }
      pass("payments", "Payments (7d)", `${(payments || []).length} payments, ${fmt(totalRevenue, tenant.currency)}`);
      pass("payments", "Payment methods", Object.entries(methods).map(([k, v]) => `${k}:${v}`).join(", "));
    } else {
      pass("payments", "No payments (7d)", "May be normal for new tenant");
    }

    // ── PHASE 6: Users & Auth ──
    const { data: users } = await supabase
      .from("users")
      .select("id, role, email")
      .eq("tenant_id", tenantId);

    if ((users || []).length > 0) {
      const roles: Record<string, number> = {};
      for (const u of users || []) {
        roles[u.role] = (roles[u.role] || 0) + 1;
      }
      pass("users", "Staff configured", `${(users || []).length} users: ${Object.entries(roles).map(([k, v]) => `${k}:${v}`).join(", ")}`);

      const hasAdmin = ((users || []) as any[]).some((u: any) => ["owner", "admin", "super_admin"].includes(u.role));
      if (hasAdmin) {
        pass("users", "Has admin user");
      } else {
        fail("users", "No admin user", "Nobody can manage the restaurant", true);
      }
    } else {
      fail("users", "No users configured", "Nobody can log in", true);
    }

    // ── PHASE 7: WhatsApp Agent ──
    const { data: waInstance } = await supabase
      .from("wa_instances")
      .select("id, status, provider, agent_name, allow_orders, allow_reservations, phone_number")
      .eq("tenant_id", tenantId)
      .single();

    if (waInstance) {
      pass("whatsapp", "WA instance exists", `${waInstance.agent_name} (${waInstance.provider})`);

      if (waInstance.status === "connected") {
        pass("whatsapp", "WA connected", `phone: ${waInstance.phone_number || "unknown"}`);
      } else {
        fail("whatsapp", "WA not connected", `status: ${waInstance.status} — customers can't reach the agent`);
      }

      if (waInstance.allow_orders) pass("whatsapp", "Orders enabled via WA");
      else pass("whatsapp", "Orders disabled via WA", "Customers can only ask questions");

      // Check sessions and messages
      const { count: sessionCount } = await supabase
        .from("wa_sessions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      const { count: msgCount } = await supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      pass("whatsapp", "WA stats", `${sessionCount || 0} sessions, ${msgCount || 0} total messages`);
    } else {
      pass("whatsapp", "No WA instance", "WhatsApp agent not configured (optional)");
    }

    // ── PHASE 8: Data integrity ──
    // Check order numbers uniqueness
    const { data: orderNums } = await supabase
      .from("orders")
      .select("order_number")
      .eq("tenant_id", tenantId)
      .order("order_number");

    if (orderNums && orderNums.length > 1) {
      const nums = orderNums.map((o: any) => o.order_number);
      const unique = new Set(nums);
      if (unique.size === nums.length) {
        pass("integrity", "Order numbers unique", `${nums.length} orders, all unique`);
      } else {
        fail("integrity", "DUPLICATE order numbers", `${nums.length} orders, ${unique.size} unique — receipts will be confusing`, true);
      }
    } else {
      pass("integrity", "Order numbers OK", `${(orderNums || []).length} orders`);
    }

    // Check for orphan order_items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, order_id, menu_item_id")
      .eq("tenant_id", tenantId)
      .limit(500);

    if (orderItems && orderItems.length > 0) {
      const orderIdSet = new Set(((recentOrders || []) as any[]).map((o: any) => o.id));
      // Check a sample for invalid menu_item references
      const sampleItems = orderItems.slice(0, 50);
      const menuItemIds = new Set(((items || []) as any[]).map((i: any) => i.id));
      const invalidRefs = sampleItems.filter((oi: any) => !menuItemIds.has(oi.menu_item_id));
      if (invalidRefs.length > 0) {
        fail("integrity", "Order items reference deleted menu items", `${invalidRefs.length} items — historical data still OK but shows deleted products`);
      } else {
        pass("integrity", "Order items reference valid menu items");
      }
    }

  } catch (e: any) {
    fail("system", "Unexpected error", e.message, true);
  }

  return NextResponse.json({
    results,
    summary: buildSummary(results),
  });
}

function buildSummary(results: TestResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);
  const critical = failed.filter(r => r.critical);

  const phases = [...new Set(results.map(r => r.phase))];
  const phaseResults = phases.map(phase => {
    const pr = results.filter(r => r.phase === phase);
    return {
      phase,
      passed: pr.filter(r => r.passed).length,
      total: pr.length,
      failures: pr.filter(r => !r.passed).map(r => ({ test: r.test, detail: r.detail, critical: r.critical })),
    };
  });

  let verdict: "green" | "yellow" | "red" = "green";
  if (critical.length > 0) verdict = "red";
  else if (failed.length > 0) verdict = "yellow";

  return {
    total,
    passed,
    failed: failed.length,
    critical: critical.length,
    percentage: Math.round((passed / total) * 100),
    verdict,
    phases: phaseResults,
  };
}
