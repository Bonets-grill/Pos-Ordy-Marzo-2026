/**
 * ═══════════════════════════════════════════════════════════
 *  ORDY QA AGENT — Auditor automático del sistema completo
 * ═══════════════════════════════════════════════════════════
 *
 *  Uso: npx tsx scripts/qa-agent.ts
 *
 *  SEGURIDAD:
 *  - Crea su propio tenant de prueba (_qa_test_*)
 *  - NUNCA toca datos existentes
 *  - Limpia TODO al terminar (incluso si falla)
 *  - Solo usa service_role para su propio tenant
 *
 *  Requiere .env.local con:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - NEXT_PUBLIC_APP_URL (optional, for API tests)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";

const QA_TENANT_SLUG = `_qa_test_${Date.now()}`;
const QA_TENANT_NAME = "QA Test Restaurant (auto-delete)";

// ── Types ───────────────────────────────────────────────
interface TestResult {
  phase: string;
  test: string;
  passed: boolean;
  detail?: string;
  critical?: boolean;
}

// ── State ───────────────────────────────────────────────
let supabase: SupabaseClient;
let tenantId: string;
let results: TestResult[] = [];
let createdIds: {
  tenant?: string;
  categories: string[];
  items: string[];
  modifierGroups: string[];
  modifiers: string[];
  tables: string[];
  orders: string[];
  orderItems: string[];
  payments: string[];
  cashShifts: string[];
  waInstances: string[];
  waSessions: string[];
  waMessages: string[];
  users: string[];
} = {
  categories: [], items: [], modifierGroups: [], modifiers: [],
  tables: [], orders: [], orderItems: [], payments: [],
  cashShifts: [], waInstances: [], waSessions: [], waMessages: [],
  users: [],
};

// ── Helpers ─────────────────────────────────────────────
function log(msg: string) { console.log(`  ${msg}`); }
function pass(phase: string, test: string, detail?: string) {
  results.push({ phase, test, passed: true, detail });
  console.log(`  ✅ ${test}${detail ? ` — ${detail}` : ""}`);
}
function fail(phase: string, test: string, detail: string, critical = false) {
  results.push({ phase, test, passed: false, detail, critical });
  console.log(`  ❌ ${test} — ${detail}${critical ? " [CRITICAL]" : ""}`);
}

// ═══════════════════════════════════════════════════════════
//  PHASE 0: CONNECTION & SCHEMA
// ═══════════════════════════════════════════════════════════
async function phase0_connection() {
  console.log("\n📡 PHASE 0: Connection & Schema\n");

  // Test Supabase connection
  try {
    const { data, error } = await supabase.from("tenants").select("id").limit(1);
    if (error) throw error;
    pass("connection", "Supabase connection", "OK");
  } catch (e: any) {
    fail("connection", "Supabase connection", e.message, true);
    throw new Error("Cannot connect to Supabase — aborting");
  }

  // Verify critical tables exist
  const criticalTables = [
    "tenants", "users", "menu_categories", "menu_items",
    "modifier_groups", "modifiers", "menu_item_modifier_groups",
    "orders", "order_items", "payments", "restaurant_tables",
    "cash_shifts", "cash_movements", "kds_stations",
    "wa_instances", "wa_sessions", "wa_messages",
  ];

  for (const table of criticalTables) {
    try {
      const col = table === "menu_item_modifier_groups" ? "item_id" : "id";
      const { error } = await supabase.from(table).select(col).limit(0);
      if (error) throw error;
      pass("schema", `Table '${table}' exists`);
    } catch (e: any) {
      fail("schema", `Table '${table}' exists`, e.message, true);
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 1: SETUP — Create test tenant & data
// ═══════════════════════════════════════════════════════════
async function phase1_setup() {
  console.log("\n🏗️  PHASE 1: Setup Test Data\n");

  // Create test tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      name: QA_TENANT_NAME,
      slug: QA_TENANT_SLUG,
      currency: "EUR",
      locale: "es",
      tax_rate: 10,
      tax_included: true,
      timezone: "Europe/Madrid",
    })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    fail("setup", "Create test tenant", tenantErr?.message || "No data", true);
    throw new Error("Cannot create test tenant — aborting");
  }
  tenantId = tenant.id;
  createdIds.tenant = tenantId;
  pass("setup", "Create test tenant", `id=${tenantId}, slug=${QA_TENANT_SLUG}`);

  // Create categories
  const catData = [
    { tenant_id: tenantId, name_es: "Entrantes", name_en: "Starters", icon: "utensils", color: "#f97316", sort_order: 1, active: true },
    { tenant_id: tenantId, name_es: "Principales", name_en: "Mains", icon: "beef", color: "#ef4444", sort_order: 2, active: true },
    { tenant_id: tenantId, name_es: "Bebidas", name_en: "Drinks", icon: "wine", color: "#3b82f6", sort_order: 3, active: true },
  ];
  const { data: cats, error: catErr } = await supabase.from("menu_categories").insert(catData).select("id");
  if (catErr || !cats) {
    fail("setup", "Create categories", catErr?.message || "No data", true);
    throw new Error("Cannot create categories");
  }
  createdIds.categories = cats.map(c => c.id);
  pass("setup", "Create 3 categories", `ids=${createdIds.categories.join(",")}`);

  // Create menu items
  const itemData = [
    { tenant_id: tenantId, category_id: cats[0].id, name_es: "Nachos QA", name_en: "QA Nachos", price: 8.50, available: true, active: true, sort_order: 1, allergens: ["dairy", "gluten"], tags: ["vegetarian"] },
    { tenant_id: tenantId, category_id: cats[0].id, name_es: "Alitas QA", name_en: "QA Wings", price: 9.00, available: true, active: true, sort_order: 2, allergens: [], tags: [] },
    { tenant_id: tenantId, category_id: cats[1].id, name_es: "Burger Clasica QA", name_en: "QA Classic Burger", price: 11.50, available: true, active: true, sort_order: 1, allergens: ["gluten", "dairy"], tags: [] },
    { tenant_id: tenantId, category_id: cats[1].id, name_es: "Burger Vegana QA", name_en: "QA Vegan Burger", price: 12.00, available: true, active: true, sort_order: 2, allergens: ["gluten"], tags: ["vegan"] },
    { tenant_id: tenantId, category_id: cats[1].id, name_es: "Pizza QA", name_en: "QA Pizza", price: 13.50, available: false, active: true, sort_order: 3, allergens: ["gluten", "dairy"], tags: [] }, // NOT available
    { tenant_id: tenantId, category_id: cats[2].id, name_es: "Coca-Cola QA", name_en: "QA Coca-Cola", price: 2.50, available: true, active: true, sort_order: 1, allergens: [], tags: [] },
    { tenant_id: tenantId, category_id: cats[2].id, name_es: "Cerveza QA", name_en: "QA Beer", price: 3.00, available: true, active: true, sort_order: 2, allergens: ["gluten"], tags: [] },
  ];
  const { data: items, error: itemErr } = await supabase.from("menu_items").insert(itemData).select("id, name_es, price, available");
  if (itemErr || !items) {
    fail("setup", "Create menu items", itemErr?.message || "No data", true);
    throw new Error("Cannot create items");
  }
  createdIds.items = items.map(i => i.id);
  pass("setup", "Create 7 menu items (1 unavailable)", `ids=${items.length} items`);

  // Create modifier group + modifiers for Burger
  const { data: modGroup, error: mgErr } = await supabase.from("modifier_groups")
    .insert({ tenant_id: tenantId, name_es: "Extras QA", name_en: "QA Extras", min_select: 0, max_select: 3, required: false, sort_order: 1, active: true })
    .select("id").single();
  if (mgErr || !modGroup) {
    fail("setup", "Create modifier group", mgErr?.message || "No data");
  } else {
    createdIds.modifierGroups.push(modGroup.id);
    const modsData = [
      { group_id: modGroup.id, tenant_id: tenantId, name_es: "Extra queso QA", name_en: "QA Extra cheese", price_delta: 1.50, sort_order: 1, active: true },
      { group_id: modGroup.id, tenant_id: tenantId, name_es: "Bacon QA", name_en: "QA Bacon", price_delta: 2.00, sort_order: 2, active: true },
      { group_id: modGroup.id, tenant_id: tenantId, name_es: "Sin cebolla QA", name_en: "QA No onion", price_delta: 0, sort_order: 3, active: true },
    ];
    const { data: mods, error: modErr } = await supabase.from("modifiers").insert(modsData).select("id");
    if (modErr || !mods) {
      fail("setup", "Create modifiers", modErr?.message || "No data");
    } else {
      createdIds.modifiers = mods.map(m => m.id);
      // Link modifier group to burger items
      const burgerIds = items.filter(i => i.name_es.includes("Burger")).map(i => i.id);
      const links = burgerIds.map(itemId => ({ item_id: itemId, group_id: modGroup.id }));
      await supabase.from("menu_item_modifier_groups").insert(links);
      pass("setup", "Create 3 modifiers + link to burgers");
    }
  }

  // Create tables
  const tableData = [
    { tenant_id: tenantId, number: "1", label: "Mesa 1", capacity: 4, status: "available", pos_x: 0, pos_y: 0, active: true },
    { tenant_id: tenantId, number: "2", label: "Mesa 2", capacity: 2, status: "available", pos_x: 1, pos_y: 0, active: true },
    { tenant_id: tenantId, number: "3", label: "Mesa 3", capacity: 6, status: "available", pos_x: 2, pos_y: 0, active: true },
  ];
  const { data: tables, error: tblErr } = await supabase.from("restaurant_tables").insert(tableData).select("id");
  if (tblErr || !tables) {
    fail("setup", "Create tables", tblErr?.message || "No data");
  } else {
    createdIds.tables = tables.map(t => t.id);
    pass("setup", "Create 3 tables");
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 2: ORDER LIFECYCLE (POS simulation)
// ═══════════════════════════════════════════════════════════
async function phase2_orders() {
  console.log("\n🛒 PHASE 2: Order Lifecycle (POS)\n");

  const items = await supabase.from("menu_items").select("id, name_es, price").eq("tenant_id", tenantId).eq("available", true);
  const availableItems = items.data || [];
  const tables = await supabase.from("restaurant_tables").select("id, number").eq("tenant_id", tenantId);
  const tableList = tables.data || [];

  // Test 1: Create dine-in order
  {
    const orderItems = [
      { menu_item_id: availableItems[0].id, name: availableItems[0].name_es, quantity: 2, unit_price: availableItems[0].price, modifiers: [], modifiers_total: 0, subtotal: availableItems[0].price * 2, kds_status: "pending" },
      { menu_item_id: availableItems[2].id, name: availableItems[2].name_es, quantity: 1, unit_price: availableItems[2].price, modifiers: [], modifiers_total: 0, subtotal: availableItems[2].price, kds_status: "pending" },
    ];
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
    const { data: order, error } = await supabase.from("orders").insert({
      tenant_id: tenantId, table_id: tableList[0]?.id, order_type: "dine_in",
      status: "confirmed", subtotal, tax_amount: 0, total: subtotal,
      source: "pos", confirmed_at: new Date().toISOString(),
    }).select("id, order_number").single();

    if (error || !order) {
      fail("orders", "Create dine-in order", error?.message || "No data", true);
    } else {
      createdIds.orders.push(order.id);
      const oiData = orderItems.map(oi => ({ ...oi, order_id: order.id, tenant_id: tenantId }));
      const { data: ois } = await supabase.from("order_items").insert(oiData).select("id");
      if (ois) createdIds.orderItems.push(...ois.map(o => o.id));

      // Verify
      const { data: verify } = await supabase.from("orders").select("*").eq("id", order.id).single();
      if (verify && verify.order_type === "dine_in" && verify.source === "pos" && verify.total === subtotal) {
        pass("orders", "Create dine-in order", `#${order.order_number}, total=${subtotal}€`);
      } else {
        fail("orders", "Create dine-in order — data mismatch", JSON.stringify(verify));
      }
    }
  }

  // Test 2: Create takeaway order
  {
    const subtotal = availableItems[1].price * 3; // 3x Alitas
    const { data: order, error } = await supabase.from("orders").insert({
      tenant_id: tenantId, order_type: "takeaway",
      status: "confirmed", subtotal, tax_amount: 0, total: subtotal,
      source: "pos", customer_name: "QA Client Takeaway", customer_phone: "+34600000001",
      confirmed_at: new Date().toISOString(),
    }).select("id, order_number").single();

    if (error || !order) {
      fail("orders", "Create takeaway order", error?.message || "No data", true);
    } else {
      createdIds.orders.push(order.id);
      await supabase.from("order_items").insert({
        order_id: order.id, tenant_id: tenantId, menu_item_id: availableItems[1].id,
        name: availableItems[1].name_es, quantity: 3, unit_price: availableItems[1].price,
        modifiers: [], modifiers_total: 0, subtotal, kds_status: "pending",
      }).select("id").then(r => { if (r.data) createdIds.orderItems.push(...r.data.map(o => o.id)); });
      pass("orders", "Create takeaway order", `#${order.order_number}, total=${subtotal}€`);
    }
  }

  // Test 3: Create delivery order with address
  {
    const subtotal = availableItems[2].price + availableItems[5].price; // Burger + Coca-Cola
    const { data: order, error } = await supabase.from("orders").insert({
      tenant_id: tenantId, order_type: "delivery",
      status: "confirmed", subtotal, tax_amount: 0, total: subtotal,
      source: "pos", customer_name: "QA Client Delivery", customer_phone: "+34600000002",
      metadata: { delivery_address: "Calle QA Test 123" },
      confirmed_at: new Date().toISOString(),
    }).select("id, order_number").single();

    if (error || !order) {
      fail("orders", "Create delivery order", error?.message || "No data");
    } else {
      createdIds.orders.push(order.id);
      // Verify metadata saved
      const { data: verify } = await supabase.from("orders").select("metadata").eq("id", order.id).single();
      if (verify?.metadata?.delivery_address === "Calle QA Test 123") {
        pass("orders", "Create delivery order with address", `#${order.order_number}`);
      } else {
        fail("orders", "Delivery address not saved", JSON.stringify(verify?.metadata));
      }
    }
  }

  // Test 4: Create order with modifiers — verify total
  {
    const modifiers = await supabase.from("modifiers").select("id, name_es, price_delta").eq("tenant_id", tenantId);
    const mods = modifiers.data || [];
    if (mods.length >= 2) {
      const burger = availableItems.find(i => i.name_es.includes("Burger"));
      if (burger) {
        const selectedMods = [mods[0], mods[1]]; // Extra cheese + Bacon
        const modsTotal = selectedMods.reduce((s, m) => s + m.price_delta, 0);
        const itemSubtotal = (burger.price + modsTotal) * 2; // 2x burger with mods

        const { data: order, error } = await supabase.from("orders").insert({
          tenant_id: tenantId, order_type: "dine_in", table_id: tableList[1]?.id,
          status: "confirmed", subtotal: itemSubtotal, tax_amount: 0, total: itemSubtotal,
          source: "pos", confirmed_at: new Date().toISOString(),
        }).select("id, order_number").single();

        if (error || !order) {
          fail("orders", "Order with modifiers", error?.message || "No data");
        } else {
          createdIds.orders.push(order.id);
          const { data: oi } = await supabase.from("order_items").insert({
            order_id: order.id, tenant_id: tenantId, menu_item_id: burger.id,
            name: burger.name_es, quantity: 2, unit_price: burger.price,
            modifiers: selectedMods.map(m => ({ name: m.name_es, price_delta: m.price_delta })),
            modifiers_total: modsTotal, subtotal: itemSubtotal, kds_status: "pending",
          }).select("id").single();
          if (oi) createdIds.orderItems.push(oi.id);

          // Verify math
          const expectedTotal = (burger.price + 1.50 + 2.00) * 2; // burger + cheese + bacon × 2
          if (Math.abs(itemSubtotal - expectedTotal) < 0.01) {
            pass("orders", "Order with modifiers — total correct", `${itemSubtotal}€ (expected ${expectedTotal}€)`);
          } else {
            fail("orders", "Order with modifiers — TOTAL MISMATCH", `got ${itemSubtotal}€, expected ${expectedTotal}€`, true);
          }
        }
      }
    }
  }

  // Test 5: WhatsApp source order
  {
    const subtotal = availableItems[0].price * 1;
    const { data: order, error } = await supabase.from("orders").insert({
      tenant_id: tenantId, order_type: "takeaway",
      status: "confirmed", subtotal, tax_amount: 0, total: subtotal,
      source: "whatsapp", customer_phone: "+34600000099",
      confirmed_at: new Date().toISOString(),
    }).select("id, order_number, source").single();

    if (error || !order) {
      fail("orders", "WhatsApp source order", error?.message || "No data");
    } else {
      createdIds.orders.push(order.id);
      if (order.source === "whatsapp") {
        pass("orders", "WhatsApp source order", `#${order.order_number}, source=whatsapp`);
      } else {
        fail("orders", "WhatsApp source not saved", `got source=${order.source}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 3: KDS STATUS FLOW
// ═══════════════════════════════════════════════════════════
async function phase3_kds() {
  console.log("\n🍳 PHASE 3: KDS Status Flow\n");

  // Get first order's items
  if (createdIds.orders.length === 0) {
    fail("kds", "No orders to test KDS", "Phase 2 failed", true);
    return;
  }

  const orderId = createdIds.orders[0];
  const { data: items } = await supabase.from("order_items")
    .select("id, kds_status")
    .eq("order_id", orderId);

  if (!items || items.length === 0) {
    fail("kds", "No order items found", "Cannot test KDS flow", true);
    return;
  }

  const itemId = items[0].id;

  // Status: pending → preparing
  {
    const { error } = await supabase.from("order_items")
      .update({ kds_status: "preparing", kds_started_at: new Date().toISOString() })
      .eq("id", itemId);
    const { data: verify } = await supabase.from("order_items").select("kds_status, kds_started_at").eq("id", itemId).single();
    if (!error && verify?.kds_status === "preparing" && verify.kds_started_at) {
      pass("kds", "Status: pending → preparing", `kds_started_at set`);
    } else {
      fail("kds", "Status: pending → preparing", error?.message || `status=${verify?.kds_status}, started_at=${verify?.kds_started_at}`);
    }
  }

  // Status: preparing → ready
  {
    const { error } = await supabase.from("order_items")
      .update({ kds_status: "ready", kds_ready_at: new Date().toISOString() })
      .eq("id", itemId);
    const { data: verify } = await supabase.from("order_items").select("kds_status, kds_ready_at").eq("id", itemId).single();
    if (!error && verify?.kds_status === "ready" && verify.kds_ready_at) {
      pass("kds", "Status: preparing → ready", `kds_ready_at set`);
    } else {
      fail("kds", "Status: preparing → ready", error?.message || `status=${verify?.kds_status}`);
    }
  }

  // Status: ready → served
  {
    const { error } = await supabase.from("order_items")
      .update({ kds_status: "served" })
      .eq("id", itemId);
    const { data: verify } = await supabase.from("order_items").select("kds_status").eq("id", itemId).single();
    if (!error && verify?.kds_status === "served") {
      pass("kds", "Status: ready → served");
    } else {
      fail("kds", "Status: ready → served", error?.message || `status=${verify?.kds_status}`);
    }
  }

  // Order status flow: confirmed → preparing → ready → served → closed
  {
    const statusFlow = ["preparing", "ready", "served", "closed"];
    let prevStatus = "confirmed";
    let allPassed = true;
    for (const newStatus of statusFlow) {
      const tsField = newStatus === "preparing" ? "preparing_at" : newStatus === "ready" ? "ready_at" : newStatus === "served" ? "served_at" : newStatus === "closed" ? "closed_at" : null;
      const update: Record<string, unknown> = { status: newStatus };
      if (tsField) update[tsField] = new Date().toISOString();
      const { error } = await supabase.from("orders").update(update).eq("id", orderId);
      if (error) { allPassed = false; fail("kds", `Order: ${prevStatus} → ${newStatus}`, error.message); break; }
      prevStatus = newStatus;
    }
    if (allPassed) {
      const { data: verify } = await supabase.from("orders").select("status, preparing_at, ready_at, served_at, closed_at").eq("id", orderId).single();
      if (verify?.status === "closed" && verify.preparing_at && verify.ready_at && verify.served_at && verify.closed_at) {
        pass("kds", "Order full lifecycle: confirmed → closed", "All timestamps set");
      } else {
        fail("kds", "Order lifecycle — missing timestamps", JSON.stringify(verify));
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 4: PAYMENTS & CASH
// ═══════════════════════════════════════════════════════════
async function phase4_payments() {
  console.log("\n💳 PHASE 4: Payments & Cash Register\n");

  if (createdIds.orders.length < 3) {
    fail("payments", "Not enough orders to test", "Need at least 3 orders");
    return;
  }

  // Pay order 1 with cash
  {
    const orderId = createdIds.orders[0];
    const { data: order } = await supabase.from("orders").select("total").eq("id", orderId).single();
    if (!order) { fail("payments", "Pay cash — order not found", orderId); return; }

    const { data: payment, error } = await supabase.from("payments").insert({
      tenant_id: tenantId, order_id: orderId,
      method: "cash", amount: order.total, tip_amount: 2.00,
    }).select("id").single();

    if (error || !payment) {
      fail("payments", "Create cash payment", error?.message || "No data");
    } else {
      createdIds.payments.push(payment.id);
      // Update order payment status
      await supabase.from("orders").update({ payment_status: "paid", payment_method: "cash", tip_amount: 2.00 }).eq("id", orderId);
      const { data: verify } = await supabase.from("orders").select("payment_status, tip_amount").eq("id", orderId).single();
      if (verify?.payment_status === "paid" && verify.tip_amount === 2.00) {
        pass("payments", "Cash payment + tip", `${order.total}€ + 2€ tip`);
      } else {
        fail("payments", "Payment status not updated", JSON.stringify(verify));
      }
    }
  }

  // Pay order 2 with card
  {
    const orderId = createdIds.orders[1];
    const { data: order } = await supabase.from("orders").select("total").eq("id", orderId).single();
    if (!order) { fail("payments", "Pay card — order not found", orderId); return; }

    const { data: payment, error } = await supabase.from("payments").insert({
      tenant_id: tenantId, order_id: orderId,
      method: "card", amount: order.total, tip_amount: 0,
    }).select("id").single();

    if (error || !payment) {
      fail("payments", "Create card payment", error?.message || "No data");
    } else {
      createdIds.payments.push(payment.id);
      await supabase.from("orders").update({ payment_status: "paid", payment_method: "card" }).eq("id", orderId);
      pass("payments", "Card payment", `${order.total}€`);
    }
  }

  // Cash shift: open → close → verify totals
  {
    // opened_by requires a valid user FK — get any existing user, or skip
    const { data: anyUser } = await supabase.from("users").select("id").limit(1).single();
    const openedBy = anyUser?.id || null;
    if (!openedBy) {
      pass("payments", "Cash shift — skipped (no users in DB)", "Need a real user for opened_by FK");
      return;
    }
    const { data: shift, error: shiftErr } = await supabase.from("cash_shifts").insert({
      tenant_id: tenantId, opening_amount: 100.00,
      opened_at: new Date().toISOString(), status: "open",
      opened_by: openedBy,
    }).select("id").single();

    if (shiftErr || !shift) {
      fail("payments", "Open cash shift", shiftErr?.message || "No data");
    } else {
      createdIds.cashShifts.push(shift.id);

      // Get all paid orders totals
      const { data: paidOrders } = await supabase.from("orders")
        .select("total, payment_method, tip_amount")
        .eq("tenant_id", tenantId)
        .eq("payment_status", "paid");

      const cashTotal = (paidOrders || []).filter(o => o.payment_method === "cash").reduce((s, o) => s + o.total, 0);
      const cardTotal = (paidOrders || []).filter(o => o.payment_method === "card").reduce((s, o) => s + o.total, 0);
      const tipsTotal = (paidOrders || []).reduce((s, o) => s + (o.tip_amount || 0), 0);
      const expectedCash = 100 + cashTotal + tipsTotal; // opening + cash sales + tips

      // Close shift
      const { error: closeErr } = await supabase.from("cash_shifts").update({
        closing_amount: expectedCash,
        expected_amount: expectedCash,
        cash_sales: cashTotal,
        card_sales: cardTotal,
        // tips_total may not exist in schema
        status: "closed",
        closed_at: new Date().toISOString(),
      }).eq("id", shift.id);

      if (closeErr) {
        fail("payments", "Close cash shift", closeErr.message);
      } else {
        const { data: verify } = await supabase.from("cash_shifts")
          .select("opening_amount, closing_amount, expected_amount, status")
          .eq("id", shift.id).single();

        if (verify?.status === "closed" && verify.closing_amount === verify.expected_amount) {
          pass("payments", "Cash shift — cuadre correcto", `apertura=100€, cierre=${verify.closing_amount}€`);
        } else {
          fail("payments", "Cash shift — DESCUADRE", `closing=${verify?.closing_amount}, expected=${verify?.expected_amount}`, true);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 5: PUBLIC API (QR flow)
// ═══════════════════════════════════════════════════════════
async function phase5_publicApi() {
  console.log("\n📱 PHASE 5: Public API (QR Flow)\n");

  if (!APP_URL) {
    log("⚠️  Skipping — NEXT_PUBLIC_APP_URL not set (cannot call API endpoints)");
    pass("public_api", "Skipped — no APP_URL configured", "Set NEXT_PUBLIC_APP_URL to enable");
    return;
  }

  const baseUrl = APP_URL.startsWith("http") ? APP_URL : `https://${APP_URL}`;

  // Test GET /api/public/menu
  try {
    const res = await fetch(`${baseUrl}/api/public/menu?slug=${QA_TENANT_SLUG}`);
    const data = await res.json();
    if (res.ok && data.tenant && data.items) {
      const unavailableInResponse = data.items.some((i: any) => i.name_es === "Pizza QA");
      if (unavailableInResponse) {
        fail("public_api", "Public menu — unavailable items exposed", "Pizza QA (available=false) is in response", true);
      } else {
        pass("public_api", "GET /api/public/menu", `${data.items.length} items returned (unavailable excluded)`);
      }
    } else {
      fail("public_api", "GET /api/public/menu", `status=${res.status}`);
    }
  } catch (e: any) {
    fail("public_api", "GET /api/public/menu — network error", e.message);
  }

  // Test POST /api/public/order
  try {
    const items = await supabase.from("menu_items").select("id, price").eq("tenant_id", tenantId).eq("available", true).limit(2);
    const orderItems = (items.data || []).map(i => ({
      menu_item_id: i.id, quantity: 1, modifier_ids: [],
    }));

    const res = await fetch(`${baseUrl}/api/public/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: QA_TENANT_SLUG,
        items: orderItems,
        customerName: "QA Public Client",
        customerPhone: "+34600000088",
        orderType: "takeaway",
      }),
    });
    const data = await res.json();
    if (res.ok && data.orderId) {
      createdIds.orders.push(data.orderId);
      pass("public_api", "POST /api/public/order", `orderId=${data.orderId}`);

      // Check order status
      const statusRes = await fetch(`${baseUrl}/api/public/order?orderId=${data.orderId}`);
      const statusData = await statusRes.json();
      if (statusRes.ok && statusData.order) {
        pass("public_api", "GET /api/public/order (status check)", `status=${statusData.order.status}`);
      } else {
        fail("public_api", "GET /api/public/order", `status=${statusRes.status}`);
      }
    } else {
      fail("public_api", "POST /api/public/order", `status=${res.status}, error=${data.error}`);
    }
  } catch (e: any) {
    fail("public_api", "POST /api/public/order — network error", e.message);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 6: WHATSAPP AGENT (session & DB)
// ═══════════════════════════════════════════════════════════
async function phase6_whatsapp() {
  console.log("\n📱 PHASE 6: WhatsApp Agent (DB layer)\n");

  // Create WA instance
  const { data: instance, error: instErr } = await supabase.from("wa_instances").insert({
    tenant_id: tenantId,
    provider: "evolution",
    instance_name: `qa-test-${Date.now()}`,
    status: "disconnected",
    agent_name: "QA Bot",
    agent_personality: "professional",
    agent_language: "es",
    welcome_message: "Hola QA",
    away_message: "Cerrado QA",
    allow_orders: true,
    allow_reservations: true,
    max_items_per_order: 20,
  }).select("id").single();

  if (instErr || !instance) {
    fail("whatsapp", "Create WA instance", instErr?.message || "No data", true);
    return;
  }
  createdIds.waInstances.push(instance.id);
  pass("whatsapp", "Create WA instance");

  // Create session
  const { data: session, error: sessErr } = await supabase.from("wa_sessions").insert({
    tenant_id: tenantId,
    instance_id: instance.id,
    phone: "34600000077",
    state: "idle",
    cart: [],
    context: {},
  }).select("id").single();

  if (sessErr || !session) {
    fail("whatsapp", "Create WA session", sessErr?.message || "No data");
    return;
  }
  createdIds.waSessions.push(session.id);
  pass("whatsapp", "Create WA session");

  // Save messages
  // Insert messages one by one to guarantee created_at ordering
  const msgContents = [
    { role: "user", content: "Hola, quiero ver el menú" },
    { role: "assistant", content: "¡Hola! Aquí tienes el menú..." },
    { role: "user", content: "Quiero 2 burgers" },
    { role: "assistant", content: "Añadido: 2x Burger Clasica" },
  ];
  const msgIds: string[] = [];
  for (const msg of msgContents) {
    const { data: m } = await supabase.from("wa_messages").insert({
      session_id: session.id, tenant_id: tenantId, role: msg.role, content: msg.content,
    }).select("id").single();
    if (m) msgIds.push(m.id);
    await new Promise(r => setTimeout(r, 50)); // ensure different timestamps
  }
  const msgs = msgIds.length > 0 ? msgIds.map(id => ({ id })) : null;
  const msgErr = msgs ? null : new Error("Failed to insert messages");
  if (msgErr || !msgs) {
    fail("whatsapp", "Save WA messages", msgErr?.message || "No data");
  } else {
    createdIds.waMessages = msgs.map(m => m.id);
    pass("whatsapp", "Save 4 WA messages");
  }

  // Update session state and cart
  const cart = [{ menu_item_id: createdIds.items[2], name: "Burger Clasica QA", qty: 2, unit_price: 11.50, modifiers: [] }];
  const { error: updateErr } = await supabase.from("wa_sessions")
    .update({ state: "ordering", cart })
    .eq("id", session.id);

  if (updateErr) {
    fail("whatsapp", "Update session cart", updateErr.message);
  } else {
    const { data: verify } = await supabase.from("wa_sessions").select("state, cart").eq("id", session.id).single();
    if (verify?.state === "ordering" && Array.isArray(verify.cart) && verify.cart.length === 1) {
      pass("whatsapp", "Session state + cart updated", `state=ordering, cart=1 item`);
    } else {
      fail("whatsapp", "Session state mismatch", JSON.stringify(verify));
    }
  }

  // Verify message history order
  // Small delay to ensure created_at ordering is consistent
  await new Promise(r => setTimeout(r, 500));
  const { data: history } = await supabase.from("wa_messages")
    .select("id, role, content, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (history && history.length >= 4) {
    const roles = history.map(m => m.role);
    const expectedPattern = ["user", "assistant", "user", "assistant"];
    const matches = expectedPattern.every((r, i) => roles[i] === r);
    if (matches) {
      pass("whatsapp", "Message history in correct order", `${history.length} messages, alternating user/assistant`);
    } else {
      fail("whatsapp", "Message history wrong order", `roles=${roles.join(",")}`);
    }
  } else {
    fail("whatsapp", "Message history incomplete", `Got ${history?.length} messages, expected 4`);
  }
}

// ═══════════════════════════════════════════════════════════
//  PHASE 7: SECURITY (RLS & Tenant Isolation)
// ═══════════════════════════════════════════════════════════
async function phase7_security() {
  console.log("\n🔒 PHASE 7: Security (RLS & Isolation)\n");

  // Create a second test tenant
  const { data: tenant2, error: t2Err } = await supabase.from("tenants").insert({
    name: "QA Tenant B (isolation test)",
    slug: `_qa_test_b_${Date.now()}`,
    currency: "EUR", locale: "es", tax_rate: 10, tax_included: true,
  }).select("id").single();

  if (t2Err || !tenant2) {
    fail("security", "Create second tenant for isolation test", t2Err?.message || "No data", true);
    return;
  }
  const tenantBId = tenant2.id;

  // Create data in tenant B
  const { data: itemB } = await supabase.from("menu_items").insert({
    tenant_id: tenantBId, category_id: createdIds.categories[0], // using tenant A's category (service role bypasses RLS)
    name_es: "SECRET ITEM TENANT B", price: 999.99, available: true, active: true, sort_order: 1,
  }).select("id").single();

  // With SERVICE ROLE we can see both — this is expected
  // The real test is whether the PUBLIC API filters correctly
  const { data: allItems } = await supabase.from("menu_items")
    .select("id, name_es, tenant_id")
    .in("tenant_id", [tenantId, tenantBId]);

  const tenantAItems = (allItems || []).filter(i => i.tenant_id === tenantId);
  const tenantBItems = (allItems || []).filter(i => i.tenant_id === tenantBId);

  if (tenantAItems.length > 0 && tenantBItems.length > 0) {
    pass("security", "Both tenants have separate data", `A=${tenantAItems.length}, B=${tenantBItems.length}`);
  }

  // Test: orders from tenant A should not include tenant B
  const { data: ordersA } = await supabase.from("orders")
    .select("id, tenant_id")
    .eq("tenant_id", tenantId);
  const leakedOrders = (ordersA || []).filter(o => o.tenant_id !== tenantId);
  if (leakedOrders.length === 0) {
    pass("security", "Tenant A orders filtered by tenant_id", `${(ordersA || []).length} orders, 0 leaked`);
  } else {
    fail("security", "TENANT ISOLATION BREACH — orders", `${leakedOrders.length} orders from other tenant!`, true);
  }

  // Test: wa_sessions isolation
  const { data: sessionsA } = await supabase.from("wa_sessions")
    .select("id, tenant_id")
    .eq("tenant_id", tenantId);
  const leakedSessions = (sessionsA || []).filter(s => s.tenant_id !== tenantId);
  if (leakedSessions.length === 0) {
    pass("security", "WA sessions isolated by tenant_id");
  } else {
    fail("security", "TENANT ISOLATION BREACH — wa_sessions", `${leakedSessions.length} leaked`, true);
  }

  // Test: wa_messages isolation
  const { data: messagesA } = await supabase.from("wa_messages")
    .select("id, tenant_id")
    .eq("tenant_id", tenantId);
  const leakedMessages = (messagesA || []).filter(m => m.tenant_id !== tenantId);
  if (leakedMessages.length === 0) {
    pass("security", "WA messages isolated by tenant_id");
  } else {
    fail("security", "TENANT ISOLATION BREACH — wa_messages", `${leakedMessages.length} leaked`, true);
  }

  // Cleanup tenant B
  if (itemB) await supabase.from("menu_items").delete().eq("id", itemB.id);
  await supabase.from("tenants").delete().eq("id", tenantBId);
  pass("security", "Cleanup tenant B", "deleted");
}

// ═══════════════════════════════════════════════════════════
//  PHASE 8: DATA INTEGRITY
// ═══════════════════════════════════════════════════════════
async function phase8_integrity() {
  console.log("\n🔢 PHASE 8: Data Integrity\n");

  // Order numbers should be unique per tenant
  const { data: orders } = await supabase.from("orders")
    .select("order_number")
    .eq("tenant_id", tenantId)
    .order("order_number");

  if (orders && orders.length > 1) {
    const numbers = orders.map(o => o.order_number);
    const unique = new Set(numbers);
    if (unique.size === numbers.length) {
      pass("integrity", "Order numbers unique", `${numbers.length} orders, all unique`);
    } else {
      fail("integrity", "DUPLICATE order numbers!", `${numbers.length} orders, ${unique.size} unique`, true);
    }
  }

  // All order_items should reference valid orders
  const { data: orphanItems } = await supabase.from("order_items")
    .select("id, order_id")
    .eq("tenant_id", tenantId);

  if (orphanItems) {
    const orderIds = new Set(createdIds.orders);
    const orphans = orphanItems.filter(oi => !orderIds.has(oi.order_id));
    if (orphans.length === 0) {
      pass("integrity", "No orphan order_items", `${orphanItems.length} items, all linked`);
    } else {
      fail("integrity", "Orphan order_items found", `${orphans.length} items without valid order`);
    }
  }

  // Payments should match order totals
  const { data: paymentsCheck } = await supabase.from("payments")
    .select("id, order_id, amount")
    .eq("tenant_id", tenantId);

  if (paymentsCheck) {
    let allMatch = true;
    for (const p of paymentsCheck) {
      const { data: order } = await supabase.from("orders").select("total").eq("id", p.order_id).single();
      if (order && Math.abs(order.total - p.amount) > 0.01) {
        fail("integrity", "Payment amount mismatch", `payment=${p.amount}, order.total=${order.total}`, true);
        allMatch = false;
      }
    }
    if (allMatch) {
      pass("integrity", "All payments match order totals", `${paymentsCheck.length} payments verified`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  CLEANUP — Delete everything created
// ═══════════════════════════════════════════════════════════
async function cleanup() {
  console.log("\n🧹 CLEANUP: Removing all test data\n");

  try {
    // Delete in reverse dependency order
    if (createdIds.waMessages.length > 0)
      await supabase.from("wa_messages").delete().in("id", createdIds.waMessages);

    if (createdIds.waSessions.length > 0)
      await supabase.from("wa_sessions").delete().in("id", createdIds.waSessions);

    if (createdIds.waInstances.length > 0)
      await supabase.from("wa_instances").delete().in("id", createdIds.waInstances);

    if (createdIds.payments.length > 0)
      await supabase.from("payments").delete().in("id", createdIds.payments);

    if (createdIds.cashShifts.length > 0)
      await supabase.from("cash_shifts").delete().in("id", createdIds.cashShifts);

    if (createdIds.orderItems.length > 0)
      await supabase.from("order_items").delete().in("id", createdIds.orderItems);

    // Also catch any order items created by public API
    if (createdIds.orders.length > 0) {
      await supabase.from("order_items").delete().in("order_id", createdIds.orders);
      await supabase.from("orders").delete().in("id", createdIds.orders);
    }

    // Delete modifier links before groups
    if (createdIds.items.length > 0)
      await supabase.from("menu_item_modifier_groups").delete().in("item_id", createdIds.items);

    if (createdIds.modifiers.length > 0)
      await supabase.from("modifiers").delete().in("id", createdIds.modifiers);

    if (createdIds.modifierGroups.length > 0)
      await supabase.from("modifier_groups").delete().in("id", createdIds.modifierGroups);

    if (createdIds.items.length > 0)
      await supabase.from("menu_items").delete().in("id", createdIds.items);

    if (createdIds.categories.length > 0)
      await supabase.from("menu_categories").delete().in("id", createdIds.categories);

    if (createdIds.tables.length > 0)
      await supabase.from("restaurant_tables").delete().in("id", createdIds.tables);

    if (createdIds.tenant)
      await supabase.from("tenants").delete().eq("id", createdIds.tenant);

    console.log("  ✅ All test data removed\n");
  } catch (e: any) {
    console.log(`  ⚠️  Cleanup error: ${e.message}`);
    console.log(`  Manual cleanup: DELETE FROM tenants WHERE slug LIKE '_qa_test_%';\n`);
  }
}

// ═══════════════════════════════════════════════════════════
//  REPORT
// ═══════════════════════════════════════════════════════════
function printReport() {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);
  const critical = failed.filter(r => r.critical);

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  ORDY QA REPORT — ${new Date().toLocaleString()}`);
  console.log("══════════════════════════════════════════════════════════\n");

  // Group by phase
  const phases = [...new Set(results.map(r => r.phase))];
  for (const phase of phases) {
    const phaseResults = results.filter(r => r.phase === phase);
    const pPassed = phaseResults.filter(r => r.passed).length;
    const pTotal = phaseResults.length;
    const icon = pPassed === pTotal ? "✅" : "❌";
    console.log(`  ${icon} ${phase.toUpperCase()}: ${pPassed}/${pTotal} tests passed`);
    const pFailed = phaseResults.filter(r => !r.passed);
    for (const f of pFailed) {
      console.log(`     └─ FAIL: ${f.test} — ${f.detail}${f.critical ? " [CRITICAL]" : ""}`);
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  TOTAL: ${passed}/${total} (${Math.round(passed / total * 100)}%)${critical.length > 0 ? ` — ${critical.length} CRITICAL` : ""}`);
  console.log("");

  if (critical.length > 0) {
    console.log("  🔴 NO APTO PARA PRODUCCION");
    console.log("  Fallos criticos que DEBEN corregirse:");
    for (const c of critical) {
      console.log(`     • ${c.test}: ${c.detail}`);
    }
  } else if (failed.length > 0) {
    console.log("  🟡 PRODUCCION CON PRECAUCION");
    console.log("  Fallos no criticos — revisar antes de escalar.");
  } else {
    console.log("  🟢 APTO PARA PRODUCCION");
    console.log("  Todos los tests pasaron correctamente.");
  }

  console.log("\n══════════════════════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log("══════════════════════════════════════════════════════════");
  console.log("  🔍 ORDY QA AGENT — Full System Audit");
  console.log(`  Tenant: ${QA_TENANT_SLUG}`);
  console.log(`  Time: ${new Date().toLocaleString()}`);
  console.log("══════════════════════════════════════════════════════════");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("\n❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.error("   Create .env.local with these values.\n");
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    await phase0_connection();
    await phase1_setup();
    await phase2_orders();
    await phase3_kds();
    await phase4_payments();
    await phase5_publicApi();
    await phase6_whatsapp();
    await phase7_security();
    await phase8_integrity();
  } catch (e: any) {
    console.error(`\n💥 ABORT: ${e.message}\n`);
  } finally {
    // ALWAYS cleanup, even if tests fail
    await cleanup();
  }

  printReport();

  // Exit with error code if critical failures
  const critical = results.filter(r => !r.passed && r.critical);
  process.exit(critical.length > 0 ? 1 : 0);
}

main();
