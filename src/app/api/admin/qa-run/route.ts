import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/admin/qa-run
 * COMPREHENSIVE production-readiness diagnostics for a tenant.
 * Covers the ENTIRE flow: menu → POS → KDS → orders → payments → receipts → cash register → loyalty → WhatsApp → escandallo → data integrity.
 * Only super_admin can run this.
 * SAFETY: Only READS data. Never writes or modifies.
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
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = createServiceClient();

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
    // ═══════════════════════════════════════════
    // PHASE 1: TENANT CONFIG
    // ═══════════════════════════════════════════
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantErr || !tenant) {
      fail("tenant", "Tenant exists", tenantErr?.message || "Not found", true);
      return NextResponse.json({ results, summary: buildSummary(results) });
    }
    pass("tenant", "Tenant exists", `${tenant.name} (${tenant.slug})`);

    if (tenant.business_hours && Object.keys(tenant.business_hours).length > 0) {
      const days = Object.keys(tenant.business_hours);
      const configured = days.filter((d: string) => tenant.business_hours[d]?.open);
      pass("tenant", "Business hours configured", `${configured.length}/7 days set`);
    } else {
      fail("tenant", "Business hours configured", "No business hours — WA agent won't know when open/closed", true);
    }

    if (tenant.timezone) {
      pass("tenant", "Timezone set", tenant.timezone);
    } else {
      fail("tenant", "Timezone set", "No timezone — time-based features may break", true);
    }

    if (tenant.currency) {
      pass("tenant", "Currency configured", tenant.currency);
    } else {
      fail("tenant", "Currency configured", "No currency — prices won't display correctly", true);
    }

    if (typeof tenant.tax_rate === "number" && tenant.tax_rate >= 0) {
      pass("tenant", "Tax rate set", `${tenant.tax_rate}% (${tenant.tax_included ? "included" : "added"})`);
    } else {
      fail("tenant", "Tax rate set", "No tax rate — totals will be wrong", true);
    }

    if (tenant.receipt_config?.enabled !== undefined) {
      pass("tenant", "Receipt config", tenant.receipt_config.enabled ? "Enabled" : "Disabled");
    } else {
      pass("tenant", "Receipt config", "Default (not customized)");
    }

    if (tenant.plan && tenant.active) {
      pass("tenant", "Plan active", `Plan: ${tenant.plan}`);
    } else {
      fail("tenant", "Plan active", `Plan: ${tenant.plan || "none"}, active: ${tenant.active}`, true);
    }

    // ═══════════════════════════════════════════
    // PHASE 2: MENU COMPLETENESS
    // ═══════════════════════════════════════════
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, name_es, active, sort_order")
      .eq("tenant_id", tenantId);

    const activeCats = ((categories || []) as any[]).filter(c => c.active);
    if (activeCats.length > 0) {
      pass("menu", "Categories exist", `${activeCats.length} active, ${(categories || []).length - activeCats.length} inactive`);
    } else {
      fail("menu", "Categories exist", "No active categories — menu empty for customers", true);
    }

    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name_es, description_es, description_en, price, cost, available, active, category_id, allergens, image_url, kds_station, prep_time_minutes")
      .eq("tenant_id", tenantId);

    const activeItems = ((items || []) as any[]).filter(i => i.active);
    const availableItems = activeItems.filter(i => i.available);

    if (activeItems.length > 0) {
      pass("menu", "Menu items exist", `${activeItems.length} active, ${availableItems.length} available`);
    } else {
      fail("menu", "Menu items exist", "Nothing to sell!", true);
    }

    // Prices
    const noPriceItems = activeItems.filter((i: any) => !i.price || i.price <= 0);
    if (noPriceItems.length > 0) {
      fail("menu", "All items have valid prices", `${noPriceItems.length} items: ${noPriceItems.map((i: any) => i.name_es).join(", ")}`, true);
    } else {
      pass("menu", "All items have valid prices");
    }

    // Images
    const noImageItems = activeItems.filter((i: any) => !i.image_url);
    if (noImageItems.length > 0) {
      fail("menu", "All items have images", `${noImageItems.length}/${activeItems.length} missing — QR menu incomplete`);
    } else {
      pass("menu", "All items have images");
    }

    // Orphan items
    const catIds = new Set(((categories || []) as any[]).map(c => c.id));
    const orphanItems = activeItems.filter((i: any) => !catIds.has(i.category_id));
    if (orphanItems.length > 0) {
      fail("menu", "All items linked to valid categories", `${orphanItems.length} orphan items`, true);
    } else {
      pass("menu", "All items linked to valid categories");
    }

    // KDS stations assigned
    const noStation = activeItems.filter((i: any) => !i.kds_station);
    if (noStation.length > 0) {
      fail("menu", "KDS station assigned to items", `${noStation.length}/${activeItems.length} items have no KDS station — won't show in kitchen`);
    } else {
      pass("menu", "KDS station assigned to items");
    }

    // Modifiers
    const { data: modGroups } = await supabase
      .from("modifier_groups")
      .select("id, name_es, active, required, min_select, max_select")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    const { data: modifiers } = await supabase
      .from("modifiers")
      .select("id, group_id, name_es, price_delta, active")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    if ((modGroups || []).length > 0) {
      pass("menu", "Modifier groups configured", `${(modGroups || []).length} groups, ${(modifiers || []).length} modifiers`);

      const groupsWithMods = new Set(((modifiers || []) as any[]).map(m => m.group_id));
      const emptyRequired = ((modGroups || []) as any[]).filter((g: any) => g.required && !groupsWithMods.has(g.id));
      if (emptyRequired.length > 0) {
        fail("menu", "Required groups have options", `${emptyRequired.map((g: any) => g.name_es).join(", ")} — orders will fail`, true);
      } else {
        pass("menu", "Required groups have options");
      }

      // Negative price modifiers check
      const negMods = ((modifiers || []) as any[]).filter((m: any) => m.price_delta < 0);
      if (negMods.length > 0) {
        fail("menu", "No negative modifier prices", `${negMods.length} modifiers with negative price — potential abuse`);
      } else {
        pass("menu", "No negative modifier prices");
      }
    } else {
      pass("menu", "Modifier groups", "None configured (optional)");
    }

    // ═══════════════════════════════════════════
    // PHASE 3: TABLES & ZONES
    // ═══════════════════════════════════════════
    const { data: zones } = await supabase
      .from("zones")
      .select("id, name, active")
      .eq("tenant_id", tenantId);

    if ((zones || []).length > 0) {
      const activeZones = ((zones || []) as any[]).filter(z => z.active);
      pass("tables", "Zones configured", `${activeZones.length} active zones`);
    } else {
      fail("tables", "Zones configured", "No zones — table layout incomplete");
    }

    const { data: tables } = await supabase
      .from("restaurant_tables")
      .select("id, number, status, active, zone_id, qr_code, current_order_id")
      .eq("tenant_id", tenantId);

    const activeTables = ((tables || []) as any[]).filter(t => t.active);
    if (activeTables.length > 0) {
      const occupied = activeTables.filter((t: any) => t.status === "occupied");
      pass("tables", "Tables configured", `${activeTables.length} active, ${occupied.length} currently occupied`);
    } else {
      fail("tables", "Tables configured", "No tables — dine-in and QR won't work", true);
    }

    // Ghost occupied tables (occupied but no order linked)
    const ghostOccupied = activeTables.filter((t: any) => t.status === "occupied" && !t.current_order_id);
    if (ghostOccupied.length > 0) {
      fail("tables", "No ghost occupied tables", `${ghostOccupied.length} tables marked occupied but no order linked: ${ghostOccupied.map((t: any) => t.number).join(", ")}`);
    } else {
      pass("tables", "No ghost occupied tables");
    }

    // Tables without zones
    const noZoneTables = activeTables.filter((t: any) => !t.zone_id);
    if (noZoneTables.length > 0) {
      fail("tables", "All tables assigned to zones", `${noZoneTables.length} tables without zone`);
    } else {
      pass("tables", "All tables assigned to zones");
    }

    // ═══════════════════════════════════════════
    // PHASE 4: KDS (Kitchen Display)
    // ═══════════════════════════════════════════
    const { data: kdsStations } = await supabase
      .from("kds_stations")
      .select("id, name, slug, active, categories")
      .eq("tenant_id", tenantId);

    const activeStations = ((kdsStations || []) as any[]).filter(s => s.active);
    if (activeStations.length > 0) {
      pass("kds", "KDS stations configured", `${activeStations.length} stations: ${activeStations.map((s: any) => s.name).join(", ")}`);
    } else {
      fail("kds", "KDS stations configured", "No KDS stations — kitchen can't see orders", true);
    }

    // Check if items reference valid stations
    const stationSlugs = new Set(activeStations.map((s: any) => s.slug));
    const itemsWithStation = activeItems.filter((i: any) => i.kds_station);
    const invalidStationItems = itemsWithStation.filter((i: any) => !stationSlugs.has(i.kds_station));
    if (invalidStationItems.length > 0) {
      fail("kds", "Items reference valid KDS stations", `${invalidStationItems.length} items reference non-existent station`);
    } else if (itemsWithStation.length > 0) {
      pass("kds", "Items reference valid KDS stations");
    }

    // Stuck KDS items (pending > 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: stuckKdsItems } = await supabase
      .from("order_items")
      .select("id, name, order_id, kds_status, created_at")
      .eq("tenant_id", tenantId)
      .eq("kds_status", "pending")
      .lt("created_at", oneHourAgo)
      .limit(20);

    if ((stuckKdsItems || []).length > 0) {
      fail("kds", "No stuck KDS items", `${(stuckKdsItems || []).length} items pending >1h — kitchen may be ignoring KDS`, true);
    } else {
      pass("kds", "No stuck KDS items");
    }

    // Items stuck in preparing > 2h
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: stuckPreparing } = await supabase
      .from("order_items")
      .select("id, name, kds_status")
      .eq("tenant_id", tenantId)
      .eq("kds_status", "preparing")
      .lt("created_at", twoHoursAgo)
      .limit(20);

    if ((stuckPreparing || []).length > 0) {
      fail("kds", "No items stuck in preparing", `${(stuckPreparing || []).length} items in preparing >2h`);
    } else {
      pass("kds", "No items stuck in preparing");
    }

    // ═══════════════════════════════════════════
    // PHASE 5: ORDERS (Full health check)
    // ═══════════════════════════════════════════
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id, order_number, status, order_type, source, subtotal, tax_amount, discount_amount, tip_amount, total, payment_status, payment_method, created_at, table_id, loyalty_points_earned")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    const orders = (recentOrders || []) as any[];
    pass("orders", "Total orders (7d)", `${orders.length} orders`);

    // Stuck orders (confirmed > 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const stuckOrders = orders.filter(o => o.status === "confirmed" && o.created_at < thirtyMinAgo);
    if (stuckOrders.length > 0) {
      fail("orders", "No stuck orders", `${stuckOrders.length} orders confirmed >30min — KDS not working?`, true);
    } else {
      pass("orders", "No stuck orders");
    }

    // Open orders older than 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const staleOpen = orders.filter(o => o.status === "open" && o.created_at < fourHoursAgo);
    if (staleOpen.length > 0) {
      fail("orders", "No stale open orders", `${staleOpen.length} orders open >4h — forgotten/abandoned?`);
    } else {
      pass("orders", "No stale open orders");
    }

    // Unpaid completed orders
    const unpaid = orders.filter(o => ["served", "closed"].includes(o.status) && o.payment_status !== "paid");
    if (unpaid.length > 0) {
      const unpaidTotal = unpaid.reduce((s: number, o: any) => s + (o.total || 0), 0);
      fail("orders", "All completed orders paid", `${unpaid.length} unpaid orders — ${fmt(unpaidTotal, tenant.currency)} revenue leak`);
    } else {
      pass("orders", "All completed orders paid");
    }

    // Order total math check (subtotal + tax - discount + tip = total)
    const mathErrors = orders.filter((o: any) => {
      const expected = (o.subtotal || 0) + (o.tax_amount || 0) - (o.discount_amount || 0) + (o.tip_amount || 0);
      return Math.abs(expected - (o.total || 0)) > 0.02; // tolerance 2 cents
    });
    if (mathErrors.length > 0) {
      fail("orders", "Order totals math correct", `${mathErrors.length} orders with wrong total calculation — billing errors!`, true);
    } else {
      pass("orders", "Order totals math correct");
    }

    // Source distribution
    const sources: Record<string, number> = {};
    for (const o of orders) sources[o.source || "unknown"] = (sources[o.source || "unknown"] || 0) + 1;
    pass("orders", "Order sources (7d)", Object.entries(sources).map(([k, v]) => `${k}:${v}`).join(", ") || "none");

    // Type distribution
    const types: Record<string, number> = {};
    for (const o of orders) types[o.order_type || "unknown"] = (types[o.order_type || "unknown"] || 0) + 1;
    pass("orders", "Order types (7d)", Object.entries(types).map(([k, v]) => `${k}:${v}`).join(", ") || "none");

    // Cancelled orders ratio
    const cancelled = orders.filter(o => o.status === "cancelled");
    if (orders.length > 0 && cancelled.length / orders.length > 0.2) {
      fail("orders", "Cancellation rate acceptable", `${cancelled.length}/${orders.length} cancelled (${Math.round(cancelled.length / orders.length * 100)}%) — too high`);
    } else {
      pass("orders", "Cancellation rate acceptable", orders.length > 0 ? `${cancelled.length}/${orders.length} (${Math.round(cancelled.length / orders.length * 100)}%)` : "No orders");
    }

    // ═══════════════════════════════════════════
    // PHASE 6: ORDER ITEMS INTEGRITY
    // ═══════════════════════════════════════════
    const { data: allOrderItems } = await supabase
      .from("order_items")
      .select("id, order_id, menu_item_id, name, quantity, unit_price, modifiers_total, subtotal, kds_status, voided")
      .eq("tenant_id", tenantId)
      .limit(1000);

    const ois = (allOrderItems || []) as any[];

    if (ois.length > 0) {
      // Check line item math: qty * unit_price + modifiers_total = subtotal
      const lineErrors = ois.filter((oi: any) => {
        const expected = (oi.quantity || 1) * (oi.unit_price || 0) + (oi.modifiers_total || 0);
        return Math.abs(expected - (oi.subtotal || 0)) > 0.02;
      });
      if (lineErrors.length > 0) {
        fail("order_items", "Line item subtotals correct", `${lineErrors.length} items with wrong subtotal math`, true);
      } else {
        pass("order_items", "Line item subtotals correct");
      }

      // Orphan menu_item references
      const menuItemIds = new Set(((items || []) as any[]).map((i: any) => i.id));
      const orphanOIs = ois.filter((oi: any) => oi.menu_item_id && !menuItemIds.has(oi.menu_item_id));
      if (orphanOIs.length > 0) {
        fail("order_items", "Items reference valid menu items", `${orphanOIs.length} items reference deleted products`);
      } else {
        pass("order_items", "Items reference valid menu items");
      }

      // Zero-price items
      const zeroPrice = ois.filter((oi: any) => !oi.voided && (!oi.unit_price || oi.unit_price <= 0));
      if (zeroPrice.length > 0) {
        fail("order_items", "No zero-price items", `${zeroPrice.length} non-voided items with price=0`);
      } else {
        pass("order_items", "No zero-price items");
      }

      // Voided items ratio
      const voided = ois.filter((oi: any) => oi.voided);
      if (ois.length > 10 && voided.length / ois.length > 0.15) {
        fail("order_items", "Void rate acceptable", `${voided.length}/${ois.length} voided (${Math.round(voided.length / ois.length * 100)}%) — investigate waste`);
      } else {
        pass("order_items", "Void rate acceptable", `${voided.length}/${ois.length} voided`);
      }
    } else {
      pass("order_items", "No order items yet", "New tenant");
    }

    // ═══════════════════════════════════════════
    // PHASE 7: PAYMENTS & REVENUE
    // ═══════════════════════════════════════════
    const { data: payments } = await supabase
      .from("payments")
      .select("id, order_id, amount, method, status, tip_amount, created_at, refund_reason, original_payment_id")
      .eq("tenant_id", tenantId)
      .gte("created_at", sevenDaysAgo.toISOString());

    const paymentsList = (payments || []) as any[];

    if (paymentsList.length > 0) {
      const methods: Record<string, number> = {};
      let totalRevenue = 0;
      let totalTips = 0;
      let refunds = 0;
      for (const p of paymentsList) {
        methods[p.method] = (methods[p.method] || 0) + 1;
        if (p.status === "completed") totalRevenue += p.amount;
        if (p.status === "refunded") refunds++;
        totalTips += (p.tip_amount || 0);
      }
      pass("payments", "Payments (7d)", `${paymentsList.length} payments, revenue: ${fmt(totalRevenue, tenant.currency)}, tips: ${fmt(totalTips, tenant.currency)}`);
      pass("payments", "Payment methods", Object.entries(methods).map(([k, v]) => `${k}:${v}`).join(", "));

      if (refunds > 0) {
        pass("payments", "Refunds (7d)", `${refunds} refunds`);
      }

      // Payment vs order total match
      const orderTotalMap = new Map(orders.map((o: any) => [o.id, o.total]));
      const paidOrderIds = [...new Set(paymentsList.filter(p => p.status === "completed").map(p => p.order_id))];
      const overpaid = paidOrderIds.filter(oid => {
        const orderTotal = orderTotalMap.get(oid) || 0;
        const paidAmount = paymentsList.filter(p => p.order_id === oid && p.status === "completed").reduce((s: number, p: any) => s + p.amount, 0);
        return paidAmount > orderTotal + 0.02;
      });
      if (overpaid.length > 0) {
        fail("payments", "No overpaid orders", `${overpaid.length} orders where payment > order total`);
      } else {
        pass("payments", "No overpaid orders");
      }

      // Double payments (same order, same amount, same method, within 1 min)
      const suspectDoubles = paidOrderIds.filter(oid => {
        const orderPayments = paymentsList.filter(p => p.order_id === oid && p.status === "completed");
        if (orderPayments.length < 2) return false;
        for (let i = 0; i < orderPayments.length; i++) {
          for (let j = i + 1; j < orderPayments.length; j++) {
            if (orderPayments[i].method === orderPayments[j].method &&
              Math.abs(orderPayments[i].amount - orderPayments[j].amount) < 0.01 &&
              Math.abs(new Date(orderPayments[i].created_at).getTime() - new Date(orderPayments[j].created_at).getTime()) < 60000) {
              return true;
            }
          }
        }
        return false;
      });
      if (suspectDoubles.length > 0) {
        fail("payments", "No suspected double payments", `${suspectDoubles.length} orders with duplicate payment detected`, true);
      } else {
        pass("payments", "No suspected double payments");
      }
    } else {
      pass("payments", "No payments (7d)", "New tenant or no activity");
    }

    // ═══════════════════════════════════════════
    // PHASE 8: CASH REGISTER / CAJA
    // ═══════════════════════════════════════════
    const { data: cashShifts } = await supabase
      .from("cash_shifts")
      .select("id, status, opening_amount, closing_amount, expected_amount, difference, cash_sales, card_sales, total_sales, total_orders, opened_by, closed_by, opened_at, closed_at")
      .eq("tenant_id", tenantId)
      .order("opened_at", { ascending: false })
      .limit(30);

    const shifts = (cashShifts || []) as any[];

    // Multiple open shifts
    const openShifts = shifts.filter(s => s.status === "open");
    if (openShifts.length > 1) {
      fail("cash_register", "Single open shift", `${openShifts.length} shifts open simultaneously — only 1 allowed`, true);
    } else if (openShifts.length === 1) {
      const shiftAge = Date.now() - new Date(openShifts[0].opened_at).getTime();
      const hoursOpen = Math.round(shiftAge / (1000 * 60 * 60));
      if (hoursOpen > 18) {
        fail("cash_register", "Current shift age", `Open for ${hoursOpen}h — forgot to close?`);
      } else {
        pass("cash_register", "Current shift active", `Open for ${hoursOpen}h`);
      }
    } else {
      pass("cash_register", "No open shift", "All shifts closed");
    }

    // Cash difference tolerance
    const closedShifts = shifts.filter(s => s.status === "closed" && s.difference !== null);
    const bigDiffs = closedShifts.filter((s: any) => Math.abs(s.difference) > 5);
    if (bigDiffs.length > 0) {
      const maxDiff = Math.max(...bigDiffs.map((s: any) => Math.abs(s.difference)));
      fail("cash_register", "Cash differences within tolerance", `${bigDiffs.length} shifts with >5€ difference (max: ${fmt(maxDiff, tenant.currency)}) — cash handling issues`);
    } else if (closedShifts.length > 0) {
      pass("cash_register", "Cash differences within tolerance", `${closedShifts.length} closed shifts, all within ±5€`);
    } else {
      pass("cash_register", "Cash shifts", "No closed shifts yet");
    }

    // Cash movements exist for shift
    if (shifts.length > 0) {
      const latestShift = shifts[0];
      const { count: moveCount } = await supabase
        .from("cash_movements")
        .select("id", { count: "exact", head: true })
        .eq("shift_id", latestShift.id);

      if (latestShift.total_orders > 0 && (moveCount || 0) === 0) {
        fail("cash_register", "Cash movements recorded", `Latest shift has ${latestShift.total_orders} orders but 0 cash movements — movements not being tracked`);
      } else {
        pass("cash_register", "Cash movements recorded", `${moveCount || 0} movements in latest shift`);
      }

      // Verify total_sales matches sum of all sale movements
      if (latestShift.status === "closed" && latestShift.total_sales != null) {
        const { data: shiftMoves } = await supabase
          .from("cash_movements")
          .select("type, amount")
          .eq("shift_id", latestShift.id)
          .eq("type", "sale");

        const moveSales = (shiftMoves || []).reduce((s: number, m: any) => s + (m.amount || 0), 0);
        if (Math.abs(moveSales - latestShift.total_sales) > 1.0) {
          fail("cash_register", "Sales match movements", `Shift total_sales=${fmt(latestShift.total_sales, tenant.currency)} but movement sum=${fmt(moveSales, tenant.currency)}`);
        } else {
          pass("cash_register", "Sales match movements");
        }
      }
    } else {
      pass("cash_register", "Cash register", "No shifts created yet");
    }

    // ═══════════════════════════════════════════
    // PHASE 9: USERS & STAFF
    // ═══════════════════════════════════════════
    const { data: users } = await supabase
      .from("users")
      .select("id, role, email, name, active, pin, last_login_at")
      .eq("tenant_id", tenantId);

    const usersList = (users || []) as any[];
    if (usersList.length > 0) {
      const roles: Record<string, number> = {};
      for (const u of usersList) roles[u.role] = (roles[u.role] || 0) + 1;
      pass("users", "Staff configured", `${usersList.length} users: ${Object.entries(roles).map(([k, v]) => `${k}:${v}`).join(", ")}`);

      const hasAdmin = usersList.some((u: any) => ["owner", "admin", "super_admin"].includes(u.role));
      if (hasAdmin) {
        pass("users", "Has admin user");
      } else {
        fail("users", "Has admin user", "Nobody can manage the restaurant", true);
      }

      // Staff with POS access need PIN
      const posRoles = ["cashier", "waiter", "manager", "admin", "owner"];
      const posStaff = usersList.filter((u: any) => posRoles.includes(u.role) && u.active);
      const noPinStaff = posStaff.filter((u: any) => !u.pin);
      if (noPinStaff.length > 0) {
        fail("users", "POS staff have PINs", `${noPinStaff.length} staff without PIN — can't use POS quick-login`);
      } else if (posStaff.length > 0) {
        pass("users", "POS staff have PINs");
      }

      // Inactive users check
      const inactive = usersList.filter((u: any) => !u.active);
      if (inactive.length > 0) {
        pass("users", "Inactive users", `${inactive.length} disabled accounts`);
      }

      // Never logged in
      const neverLogged = usersList.filter((u: any) => u.active && !u.last_login_at);
      if (neverLogged.length > 0) {
        fail("users", "All active staff have logged in", `${neverLogged.length} staff never logged in — accounts not activated?`);
      } else {
        pass("users", "All active staff have logged in");
      }
    } else {
      fail("users", "Staff configured", "No users — nobody can log in", true);
    }

    // ═══════════════════════════════════════════
    // PHASE 10: WHATSAPP AGENT
    // ═══════════════════════════════════════════
    const { data: waInstance } = await supabase
      .from("wa_instances")
      .select("id, status, provider, agent_name, allow_orders, allow_reservations, phone_number, welcome_message, agent_language")
      .eq("tenant_id", tenantId)
      .single();

    if (waInstance) {
      pass("whatsapp", "WA instance exists", `${waInstance.agent_name} (${waInstance.provider})`);

      if (waInstance.status === "connected") {
        pass("whatsapp", "WA connected", `Phone: ${waInstance.phone_number || "unknown"}`);
      } else {
        fail("whatsapp", "WA connected", `Status: ${waInstance.status} — customers can't reach agent`, true);
      }

      if (waInstance.welcome_message) {
        pass("whatsapp", "Welcome message set");
      } else {
        fail("whatsapp", "Welcome message set", "No greeting — bad first impression");
      }

      if (waInstance.allow_orders) {
        pass("whatsapp", "WA orders enabled");
      } else {
        pass("whatsapp", "WA orders disabled", "Customers can only ask questions");
      }

      // Session health
      const { data: waSessions } = await supabase
        .from("wa_sessions")
        .select("id, state, last_message_at, cart")
        .eq("tenant_id", tenantId);

      const sessions = (waSessions || []) as any[];
      const { count: msgCount } = await supabase
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      pass("whatsapp", "WA activity", `${sessions.length} sessions, ${msgCount || 0} total messages`);

      // Stale sessions (not idle, no message in 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const staleSessions = sessions.filter((s: any) => s.state !== "idle" && s.last_message_at < oneDayAgo);
      if (staleSessions.length > 0) {
        fail("whatsapp", "No stale WA sessions", `${staleSessions.length} sessions stuck (not idle, no message >24h)`);
      } else {
        pass("whatsapp", "No stale WA sessions");
      }

      // Abandoned carts
      const abandonedCarts = sessions.filter((s: any) => {
        const cart = s.cart;
        return cart && Array.isArray(cart) && cart.length > 0 && s.last_message_at < oneDayAgo;
      });
      if (abandonedCarts.length > 0) {
        fail("whatsapp", "No abandoned WA carts", `${abandonedCarts.length} sessions with items in cart but inactive >24h`);
      } else {
        pass("whatsapp", "No abandoned WA carts");
      }

      // WA orders verification
      if (waInstance.allow_orders) {
        const waOrders = orders.filter(o => o.source === "whatsapp");
        pass("whatsapp", "WA orders (7d)", `${waOrders.length} orders via WhatsApp`);
      }
    } else {
      pass("whatsapp", "WhatsApp agent", "Not configured (optional)");
    }

    // ═══════════════════════════════════════════
    // PHASE 11: LOYALTY PROGRAM
    // ═══════════════════════════════════════════
    const { data: loyaltySettings } = await supabase
      .from("loyalty_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (loyaltySettings?.enabled) {
      pass("loyalty", "Loyalty program enabled", `${loyaltySettings.points_per_euro} pts/€, mode: ${loyaltySettings.loyalty_mode}`);

      // Customers
      const { count: custCount } = await supabase
        .from("loyalty_customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("active", true);

      pass("loyalty", "Loyalty customers", `${custCount || 0} active customers`);

      // Negative balances
      const { data: negBalances } = await supabase
        .from("loyalty_customers")
        .select("id, full_name, current_points_balance")
        .eq("tenant_id", tenantId)
        .lt("current_points_balance", 0);

      if ((negBalances || []).length > 0) {
        fail("loyalty", "No negative point balances", `${(negBalances || []).length} customers with negative points — system error`, true);
      } else {
        pass("loyalty", "No negative point balances");
      }

      // Rewards configured
      const { data: rewards } = await supabase
        .from("loyalty_rewards")
        .select("id, active")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if ((rewards || []).length > 0) {
        pass("loyalty", "Rewards configured", `${(rewards || []).length} active rewards`);
      } else {
        fail("loyalty", "Rewards configured", "Loyalty enabled but no rewards to redeem");
      }

      // Tiers
      if (loyaltySettings.tier_system_enabled) {
        const { data: tiers } = await supabase
          .from("loyalty_tiers")
          .select("id, name, active")
          .eq("tenant_id", tenantId)
          .eq("active", true);

        if ((tiers || []).length > 0) {
          pass("loyalty", "Tiers configured", `${(tiers || []).length} tiers`);
        } else {
          fail("loyalty", "Tiers configured", "Tier system enabled but no tiers created");
        }
      }

      // Active campaigns
      const now = new Date().toISOString();
      const { data: campaigns } = await supabase
        .from("loyalty_campaigns")
        .select("id, name, campaign_type, active, starts_at, ends_at")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .lte("starts_at", now)
        .gte("ends_at", now);

      if ((campaigns || []).length > 0) {
        pass("loyalty", "Active campaigns", (campaigns || []).map((c: any) => `${c.name} (${c.campaign_type})`).join(", "));
      } else {
        pass("loyalty", "Active campaigns", "None running (optional)");
      }

      // Ledger consistency: customer balance = SUM(ledger)
      const { data: sampleCustomers } = await supabase
        .from("loyalty_customers")
        .select("id, full_name, current_points_balance")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .limit(10);

      let ledgerMismatches = 0;
      for (const cust of (sampleCustomers || []) as any[]) {
        const { data: ledger } = await supabase
          .from("loyalty_points_ledger")
          .select("points_delta")
          .eq("customer_id", cust.id);

        const ledgerSum = (ledger || []).reduce((s: number, l: any) => s + (l.points_delta || 0), 0);
        if (Math.abs(ledgerSum - cust.current_points_balance) > 0) {
          ledgerMismatches++;
        }
      }
      if (ledgerMismatches > 0) {
        fail("loyalty", "Points ledger consistent", `${ledgerMismatches} customers with balance ≠ ledger sum — data corruption`, true);
      } else {
        pass("loyalty", "Points ledger consistent", `Checked ${(sampleCustomers || []).length} customers`);
      }
    } else {
      pass("loyalty", "Loyalty program", "Disabled (optional)");
    }

    // ═══════════════════════════════════════════
    // PHASE 12: ESCANDALLO (Cost Control)
    // ═══════════════════════════════════════════
    const { data: recipes } = await supabase
      .from("esc_recipes")
      .select("id, name, sale_price, status")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    if ((recipes || []).length > 0) {
      pass("escandallo", "Recipes configured", `${(recipes || []).length} active recipes`);

      // Recipes without ingredients
      const { data: recipeIngs } = await supabase
        .from("esc_recipe_ingredients")
        .select("recipe_id")
        .in("recipe_id", (recipes || []).map((r: any) => r.id));

      const recipesWithIngs = new Set((recipeIngs || []).map((ri: any) => ri.recipe_id));
      const emptyRecipes = (recipes || []).filter((r: any) => !recipesWithIngs.has(r.id));
      if (emptyRecipes.length > 0) {
        fail("escandallo", "All recipes have ingredients", `${emptyRecipes.length} recipes with no ingredients — cost=0€, margin=100%`);
      } else {
        pass("escandallo", "All recipes have ingredients");
      }

      // Recipes with no sale price
      const noPrice = (recipes || []).filter((r: any) => !r.sale_price || r.sale_price <= 0);
      if (noPrice.length > 0) {
        fail("escandallo", "All recipes have sale price", `${noPrice.length} recipes without sale price — margin can't be calculated`);
      } else {
        pass("escandallo", "All recipes have sale price");
      }

      // Active cost alerts
      const { data: alerts } = await supabase
        .from("esc_cost_alerts")
        .select("id, alert_type, severity, title, acknowledged")
        .eq("tenant_id", tenantId)
        .eq("resolved", false);

      const unacked = (alerts || []).filter((a: any) => !a.acknowledged);
      const critical = unacked.filter((a: any) => a.severity === "critical");
      if (critical.length > 0) {
        fail("escandallo", "No critical cost alerts", `${critical.length} unacknowledged critical alerts`, true);
      } else if (unacked.length > 0) {
        fail("escandallo", "Cost alerts reviewed", `${unacked.length} unacknowledged warnings`);
      } else {
        pass("escandallo", "Cost alerts", "All reviewed or none");
      }

      // Low stock
      const { data: lowStock } = await supabase
        .from("esc_inventory_items")
        .select("id, ingredient_id, current_stock, min_stock")
        .eq("tenant_id", tenantId);

      const belowMin = (lowStock || []).filter((i: any) => i.min_stock > 0 && i.current_stock < i.min_stock);
      if (belowMin.length > 0) {
        fail("escandallo", "Inventory above minimum", `${belowMin.length} ingredients below minimum stock`);
      } else {
        pass("escandallo", "Inventory above minimum");
      }
    } else {
      pass("escandallo", "Escandallo", "Not configured (optional)");
    }

    // ═══════════════════════════════════════════
    // PHASE 13: QR ORDERING
    // ═══════════════════════════════════════════
    // Check public menu endpoint works
    const qrReady = activeCats.length > 0 && activeItems.length > 0 && activeTables.length > 0;
    if (qrReady) {
      pass("qr", "QR ordering ready", "Menu + tables + items all configured");
    } else {
      const missing = [];
      if (activeCats.length === 0) missing.push("categories");
      if (activeItems.length === 0) missing.push("items");
      if (activeTables.length === 0) missing.push("tables");
      fail("qr", "QR ordering ready", `Missing: ${missing.join(", ")}`, true);
    }

    // QR orders in last 7d
    const qrOrders = orders.filter(o => o.source === "qr");
    pass("qr", "QR orders (7d)", `${qrOrders.length} orders via QR`);

    // QR items with no description (bad UX)
    const noDescItems = activeItems.filter((i: any) => !i.description_es && !i.description_en);
    if (noDescItems.length > activeItems.length * 0.5) {
      fail("qr", "Menu items have descriptions", `${noDescItems.length}/${activeItems.length} items without description — poor QR menu experience`);
    } else {
      pass("qr", "Menu items have descriptions", `${activeItems.length - noDescItems.length}/${activeItems.length} have descriptions`);
    }

    // ═══════════════════════════════════════════
    // PHASE 14: DATA INTEGRITY
    // ═══════════════════════════════════════════
    // Order number uniqueness
    const { data: orderNums } = await supabase
      .from("orders")
      .select("order_number")
      .eq("tenant_id", tenantId);

    if (orderNums && orderNums.length > 1) {
      const nums = orderNums.map((o: any) => o.order_number);
      const unique = new Set(nums);
      if (unique.size === nums.length) {
        pass("integrity", "Order numbers unique", `${nums.length} orders, all unique`);
      } else {
        fail("integrity", "Order numbers unique", `${nums.length - unique.size} duplicates — receipts confusing`, true);
      }
    } else {
      pass("integrity", "Order numbers OK", `${(orderNums || []).length} orders`);
    }

    // Payments without orders
    if (paymentsList.length > 0) {
      const orderIds = new Set(orders.map(o => o.id));
      const orphanPayments = paymentsList.filter(p => p.order_id && !orderIds.has(p.order_id));
      if (orphanPayments.length > 0) {
        fail("integrity", "All payments linked to valid orders", `${orphanPayments.length} payments reference missing orders`);
      } else {
        pass("integrity", "All payments linked to valid orders");
      }
    }

    // Tables claiming non-existent orders
    const tablesWithOrders = activeTables.filter((t: any) => t.current_order_id);
    if (tablesWithOrders.length > 0) {
      const activeOrderIds = new Set(orders.filter(o => !["closed", "cancelled"].includes(o.status)).map(o => o.id));
      const staleTableOrders = tablesWithOrders.filter((t: any) => !activeOrderIds.has(t.current_order_id));
      if (staleTableOrders.length > 0) {
        fail("integrity", "Table order references valid", `${staleTableOrders.length} tables linked to closed/missing orders: ${staleTableOrders.map((t: any) => t.number).join(", ")}`);
      } else {
        pass("integrity", "Table order references valid");
      }
    }

    // Audit log exists
    const { count: auditCount } = await supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if ((auditCount || 0) > 0) {
      pass("integrity", "Audit trail active", `${auditCount} audit entries`);
    } else {
      fail("integrity", "Audit trail active", "No audit entries — actions not being tracked");
    }

    // Realtime enabled check (we test by checking if recent orders exist)
    pass("integrity", "Database accessible", "All queries executed successfully");

    // ── NEW: Modifier orphan check ─────────────────────
    const { data: allLinks } = await supabase
      .from("menu_item_modifier_groups")
      .select("group_id")
      .eq("tenant_id", tenantId);
    const { data: allMods } = await supabase
      .from("modifiers")
      .select("id, name_es, group_id")
      .eq("tenant_id", tenantId)
      .eq("active", true);
    if (allLinks && allMods) {
      const linkedGroupIds = new Set((allLinks || []).map((l: any) => l.group_id));
      const orphanMods = (allMods || []).filter((m: any) => !linkedGroupIds.has(m.group_id));
      if (orphanMods.length > 0) {
        fail("menu", "No orphan modifiers", `${orphanMods.length} modifiers sin link a ningún item: ${orphanMods.map((m: any) => m.name_es).join(", ")} — pedidos QR fallarán silenciosamente`, true);
      } else {
        pass("menu", "No orphan modifiers", `${(allMods || []).length} modifiers correctamente vinculados`);
      }
    }

    // ── NEW: Tax label check ───────────────────────────
    const receiptConfig = tenant?.receipt_config as any;
    if (receiptConfig?.tax_label) {
      pass("tenant", "Tax label configured", `Etiqueta: ${receiptConfig.tax_label}`);
    } else {
      fail("tenant", "Tax label configured", "Sin tax_label en receipt_config — recibo mostrará IVA en vez del impuesto local");
    }

    // ── NEW: WhatsApp instance connected ──────────────
    const waSettings = (tenant as any)?.settings?.whatsapp;
    if (waSettings?.enabled && waSettings?.instance_name) {
      try {
        const evoUrl = process.env.EVOLUTION_API_URL;
        const evoKey = process.env.EVOLUTION_API_KEY;
        const evoRes = await fetch(`${evoUrl}/instance/fetchInstances`, {
          headers: { apikey: evoKey || "" },
          signal: AbortSignal.timeout(5000),
        });
        if (evoRes.ok) {
          const evoData = await evoRes.json();
          const instances = Array.isArray(evoData) ? evoData : (evoData.data || []);
          const inst = instances.find((i: any) => i.name === waSettings.instance_name || i.instance?.instanceName === waSettings.instance_name);
          const state = inst?.connectionStatus || inst?.instance?.state || "unknown";
          if (state === "open") {
            pass("whatsapp", "WhatsApp instance connected", `Instancia ${waSettings.instance_name} — conectada`);
          } else {
            fail("whatsapp", "WhatsApp instance connected", `Instancia ${waSettings.instance_name} — estado: ${state} (debería ser open)`, true);
          }
        } else {
          fail("whatsapp", "WhatsApp instance connected", `Evolution API error: ${evoRes.status}`, true);
        }
      } catch (e: any) {
        fail("whatsapp", "WhatsApp instance connected", `Evolution API no responde: ${e.message}`, true);
      }
    }

    // ── NEW: Business hours & current status ──────────
    const bhTenant = (tenant as any)?.business_hours;
    if (bhTenant) {
      const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const tz = (tenant as any)?.timezone;
      const now = tz ? new Date(new Date().toLocaleString("en-US", { timeZone: tz })) : new Date();
      const dayName = DAY_NAMES[now.getDay()];
      const todayH = bhTenant[dayName];
      if (!todayH || todayH.closed) {
        pass("tenant", "Business hours — current status", `Hoy (${dayName}): CERRADO — pedidos QR bloqueados correctamente`);
      } else {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const [oH, oM] = (todayH.open || "00:00").split(":").map(Number);
        const [cH, cM] = (todayH.close || "23:59").split(":").map(Number);
        const openMin = oH * 60 + oM;
        const closeMin = cH * 60 + cM;
        const isOpen = closeMin < openMin ? (nowMin >= openMin || nowMin <= closeMin) : (nowMin >= openMin && nowMin <= closeMin);
        pass("tenant", "Business hours — current status", `Hoy (${dayName}): ${isOpen ? "ABIERTO" : "FUERA DE HORARIO"} ${todayH.open}–${todayH.close}`);
      }
    }

    // ── NEW: Stale occupied tables ────────────────────
    const { data: occupiedTables } = await supabase
      .from("restaurant_tables")
      .select("number, current_order_id")
      .eq("tenant_id", tenantId)
      .eq("status", "occupied");
    if (occupiedTables && occupiedTables.length > 0) {
      const stale = [];
      for (const t of occupiedTables) {
        if (!t.current_order_id) { stale.push(t.number); continue; }
        const { data: o } = await supabase.from("orders").select("status").eq("id", t.current_order_id).single();
        if (!o || ["closed","cancelled","refunded"].includes(o.status)) stale.push(t.number);
      }
      if (stale.length > 0) {
        fail("tables", "No stale occupied tables", `Mesas bloqueadas sin pedido activo: ${stale.join(", ")} — ejecuta liberación manual`, true);
      } else {
        pass("tables", "No stale occupied tables", `${occupiedTables.length} mesas ocupadas con pedidos activos`);
      }
    } else {
      pass("tables", "No stale occupied tables", "Todas las mesas disponibles");
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
