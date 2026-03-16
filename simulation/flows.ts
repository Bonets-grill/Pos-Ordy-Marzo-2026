// ============================================================
// SIMULATION FLOWS — Full order lifecycle per tenant
// ============================================================

import { getClient, SeededTenant } from "./db";
import {
  SIM_CONFIG,
  CUSTOMER_NAMES_ES,
  CUSTOMER_NAMES_EN,
  SimLang,
} from "./config";
import { log, incStat, LogCategory } from "./logger";

// ── Helpers ───────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function customerName(lang: SimLang): string {
  return lang === "es" ? pick(CUSTOMER_NAMES_ES) : pick(CUSTOMER_NAMES_EN);
}

// Translation verification: check that item names exist in both languages
function verifyTranslation(
  tenantIdx: number,
  items: SeededTenant["menuItems"],
  lang: SimLang
) {
  for (const item of items) {
    const name = lang === "es" ? item.nameEs : item.nameEn;
    const altName = lang === "es" ? item.nameEn : item.nameEs;
    if (!name || name.trim() === "") {
      log(tenantIdx, "ERROR", `Missing ${lang} translation for item`, { itemId: item.id, altName });
      incStat(tenantIdx, "errors");
    }
  }
  incStat(tenantIdx, "translationChecks");
  log(tenantIdx, "TRANSLATE", `Verified ${items.length} items in [${lang.toUpperCase()}]`, {
    sample: items.slice(0, 2).map((i) => (lang === "es" ? i.nameEs : i.nameEn)),
  });
}

// ── Determine order type ──────────────────────────────────────

type OrderType = "dine_in" | "takeaway" | "delivery" | "qr";

function randomOrderType(): OrderType {
  const r = Math.random();
  if (r < SIM_CONFIG.qrOrderProbability) return "qr";
  if (r < SIM_CONFIG.qrOrderProbability + SIM_CONFIG.takeawayProbability) return "takeaway";
  if (r < SIM_CONFIG.qrOrderProbability + SIM_CONFIG.takeawayProbability + SIM_CONFIG.deliveryProbability) return "delivery";
  return "dine_in";
}

// ── FLOW: Create Order ────────────────────────────────────────

interface CreatedOrder {
  orderId: string;
  orderNumber: number;
  orderType: OrderType;
  total: number;
  itemCount: number;
  tableId: string | null;
  lang: SimLang;
}

async function createOrder(
  tenantIdx: number,
  tenant: SeededTenant,
  lang: SimLang
): Promise<CreatedOrder | null> {
  const db = getClient();
  const orderType = randomOrderType();
  const itemCount = rand(SIM_CONFIG.minItemsPerOrder, SIM_CONFIG.maxItemsPerOrder);
  const selectedItems = pickN(tenant.menuItems, itemCount);
  const name = customerName(lang);

  // Pick a table for dine-in and QR
  let tableId: string | null = null;
  if ((orderType === "dine_in" || orderType === "qr") && tenant.tables.length > 0) {
    tableId = pick(tenant.tables).id;
  }

  // Calculate totals
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const taxAmount = tenant.profile.taxIncluded ? 0 : +(subtotal * tenant.profile.taxRate / 100).toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);

  const source = orderType === "qr" ? "qr" : orderType === "delivery" ? "delivery" : orderType === "takeaway" ? "takeaway" : "pos";

  // Insert order
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      tenant_id: tenant.tenantId,
      table_id: tableId,
      order_type: orderType,
      status: "open",
      customer_name: name,
      subtotal,
      tax_amount: taxAmount,
      total,
      payment_status: "pending",
      source,
      created_by: tenant.userId,
      metadata: orderType === "delivery" ? { delivery_address: `Calle Sim ${rand(1, 99)}` } : {},
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    log(tenantIdx, "ERROR", `Order insert failed: ${orderErr?.message}`);
    incStat(tenantIdx, "errors");
    return null;
  }

  // Insert order items
  const itemRows = selectedItems.map((item) => ({
    order_id: order.id,
    tenant_id: tenant.tenantId,
    menu_item_id: item.id,
    name: lang === "es" ? item.nameEs : item.nameEn,
    quantity: 1,
    unit_price: item.price,
    subtotal: item.price,
    kds_station: "kitchen",
    kds_status: "pending",
  }));

  const { error: itemsErr } = await db.from("order_items").insert(itemRows);
  if (itemsErr) {
    log(tenantIdx, "ERROR", `Order items insert failed: ${itemsErr.message}`);
    incStat(tenantIdx, "errors");
    return null;
  }

  // Update table status for dine-in
  if (tableId) {
    await db
      .from("restaurant_tables")
      .update({ status: "occupied", current_order_id: order.id })
      .eq("id", tableId);
  }

  incStat(tenantIdx, "ordersCreated");
  if (orderType === "qr") incStat(tenantIdx, "qrOrders");

  const itemNames = selectedItems.map((i) => (lang === "es" ? i.nameEs : i.nameEn)).join(", ");
  log(tenantIdx, "ORDER", `#${order.order_number} created [${orderType.toUpperCase()}] ${name} — ${itemCount} items`, {
    total: `${total} ${tenant.profile.currency}`,
    items: itemNames,
    lang: lang.toUpperCase(),
  });

  if (orderType === "qr") {
    log(tenantIdx, "QR", `QR order #${order.order_number} from table ${tenant.tables.find((t) => t.id === tableId)?.number ?? "?"}`, {
      customer: name,
    });
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    orderType,
    total,
    itemCount,
    tableId,
    lang,
  };
}

// ── FLOW: Progress through KDS statuses ───────────────────────

async function progressKDS(tenantIdx: number, tenant: SeededTenant, orderId: string, orderNumber: number) {
  const db = getClient();
  const transitions: Array<{ orderStatus: string; kdsStatus: string; label: string; timestamp: string }> = [
    { orderStatus: "confirmed", kdsStatus: "pending", label: "CONFIRMED", timestamp: "confirmed_at" },
    { orderStatus: "preparing", kdsStatus: "preparing", label: "PREPARING", timestamp: "preparing_at" },
    { orderStatus: "ready", kdsStatus: "ready", label: "READY", timestamp: "ready_at" },
    { orderStatus: "served", kdsStatus: "served", label: "SERVED", timestamp: "served_at" },
  ];

  for (const step of transitions) {
    await sleep(SIM_CONFIG.kitchenDelayBaseSec * 1000 + rand(0, 1000));

    // Update order status
    const { error: statusErr } = await db
      .from("orders")
      .update({
        status: step.orderStatus,
        [step.timestamp]: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (statusErr) {
      log(tenantIdx, "ERROR", `Status update failed: ${statusErr.message}`, { orderId, step: step.label });
      incStat(tenantIdx, "errors");
      return;
    }

    // Update KDS item statuses
    if (step.kdsStatus !== "pending") {
      const kdsUpdate: Record<string, unknown> = { kds_status: step.kdsStatus };
      if (step.kdsStatus === "preparing") kdsUpdate.kds_started_at = new Date().toISOString();
      if (step.kdsStatus === "ready") kdsUpdate.kds_ready_at = new Date().toISOString();

      await db
        .from("order_items")
        .update(kdsUpdate)
        .eq("order_id", orderId);

      incStat(tenantIdx, "kdsUpdates");
      log(tenantIdx, "KDS", `#${orderNumber} → ${step.label}`, { kds_status: step.kdsStatus });
    } else {
      log(tenantIdx, "STATUS", `#${orderNumber} → ${step.label}`);
    }
  }
}

// ── FLOW: Process Payment ─────────────────────────────────────

async function processPayment(
  tenantIdx: number,
  tenant: SeededTenant,
  order: CreatedOrder
) {
  const db = getClient();
  const method = pick(["cash", "card", "card", "card"] as const); // 75% card
  const tip = Math.random() > 0.6 ? +(order.total * 0.1).toFixed(2) : 0;

  // Insert payment record
  const { error: payErr } = await db.from("payments").insert({
    tenant_id: tenant.tenantId,
    order_id: order.orderId,
    amount: order.total,
    method,
    status: "completed",
    tip_amount: tip,
    received_by: tenant.userId,
  });

  if (payErr) {
    log(tenantIdx, "ERROR", `Payment insert failed: ${payErr.message}`);
    incStat(tenantIdx, "errors");
    return;
  }

  // Update order to closed + paid
  const { error: closeErr } = await db
    .from("orders")
    .update({
      status: "closed",
      payment_status: "paid",
      payment_method: method,
      tip_amount: tip,
      closed_at: new Date().toISOString(),
    })
    .eq("id", order.orderId);

  if (closeErr) {
    log(tenantIdx, "ERROR", `Order close failed: ${closeErr.message}`);
    incStat(tenantIdx, "errors");
    return;
  }

  // Release table
  if (order.tableId) {
    await db
      .from("restaurant_tables")
      .update({ status: "available", current_order_id: null })
      .eq("id", order.tableId);
  }

  incStat(tenantIdx, "paymentsProcessed");
  incStat(tenantIdx, "totalRevenue", order.total);

  log(tenantIdx, "PAYMENT", `#${order.orderNumber} PAID [${method.toUpperCase()}] ${order.total} ${tenant.profile.currency}`, {
    tip: tip > 0 ? `+${tip} tip` : "no tip",
  });
}

// ── FLOW: Generate Receipt ────────────────────────────────────

async function generateReceipt(
  tenantIdx: number,
  tenant: SeededTenant,
  order: CreatedOrder
) {
  const db = getClient();

  // Read back the completed order with items (simulates receipt generation)
  const { data: fullOrder, error: readErr } = await db
    .from("orders")
    .select(`
      id, order_number, order_type, status, payment_status, payment_method,
      customer_name, subtotal, tax_amount, discount_amount, tip_amount, total,
      created_at, closed_at,
      order_items(name, quantity, unit_price, subtotal)
    `)
    .eq("id", order.orderId)
    .single();

  if (readErr || !fullOrder) {
    log(tenantIdx, "ERROR", `Receipt read failed: ${readErr?.message}`);
    incStat(tenantIdx, "errors");
    return;
  }

  incStat(tenantIdx, "receiptsGenerated");
  incStat(tenantIdx, "ordersCompleted");

  const items = (fullOrder as any).order_items ?? [];
  const itemList = items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ");

  log(tenantIdx, "RECEIPT", `#${fullOrder.order_number} — ${tenant.profile.name}`, {
    customer: fullOrder.customer_name,
    items: itemList,
    subtotal: fullOrder.subtotal,
    tax: fullOrder.tax_amount,
    tip: fullOrder.tip_amount,
    total: fullOrder.total,
    payment: fullOrder.payment_method,
    status: `${fullOrder.status}/${fullOrder.payment_status}`,
    lang: order.lang.toUpperCase(),
  });
}

// ── FLOW: Full Order Lifecycle ────────────────────────────────

export async function runOrderLifecycle(
  tenantIdx: number,
  tenant: SeededTenant,
  waveNum: number
): Promise<void> {
  // Alternate language each wave: even=tenant locale, odd=alternate
  const primaryLang = tenant.profile.locale;
  const alternateLang: SimLang = primaryLang === "es" ? "en" : "es";
  const lang: SimLang = waveNum % 2 === 0 ? primaryLang : alternateLang;

  // 1. Verify translations for selected items
  const sampleItems = pickN(tenant.menuItems, 3);
  verifyTranslation(tenantIdx, sampleItems, lang);

  // 2. Create order
  const order = await createOrder(tenantIdx, tenant, lang);
  if (!order) return;

  // 3. Progress through KDS
  await progressKDS(tenantIdx, tenant, order.orderId, order.orderNumber);

  // 4. Process payment
  await processPayment(tenantIdx, tenant, order);

  // 5. Generate receipt
  await generateReceipt(tenantIdx, tenant, order);
}

// ── Run full tenant simulation ────────────────────────────────

export async function runTenantSimulation(
  tenantIdx: number,
  tenant: SeededTenant
): Promise<void> {
  log(tenantIdx, "SETUP", `Starting ${SIM_CONFIG.ordersPerTenant} order waves for ${tenant.profile.name}`);

  for (let wave = 0; wave < SIM_CONFIG.ordersPerTenant; wave++) {
    await runOrderLifecycle(tenantIdx, tenant, wave);

    // Stagger between waves
    if (wave < SIM_CONFIG.ordersPerTenant - 1) {
      await sleep(SIM_CONFIG.orderIntervalSec * 1000 + rand(0, 2000));
    }
  }

  log(tenantIdx, "SETUP", `Completed all waves for ${tenant.profile.name}`);
}
