// ============================================================
// ISOLATED FLOWS — Full order lifecycle using in-memory DB
// Zero Supabase, zero network, zero env vars
// ============================================================

import {
  db,
  uuid,
  nextOrderNumber,
  SeededTenantInfo,
  DbOrder,
  DbOrderItem,
} from "./mem-db";
import {
  SIM_CONFIG,
  CUSTOMER_NAMES_ES,
  CUSTOMER_NAMES_EN,
  SimLang,
} from "./config";
import { log, incStat } from "./logger";

// ── Event emitter for dashboard SSE ───────────────────────────

export type SimEvent = {
  ts: string;
  tenantIdx: number;
  tenantName: string;
  category: string;
  message: string;
  details?: Record<string, unknown>;
};

type EventListener = (event: SimEvent) => void;
const listeners: EventListener[] = [];

export function onSimEvent(fn: EventListener) {
  listeners.push(fn);
}

function emit(tenantIdx: number, tenantName: string, category: string, message: string, details?: Record<string, unknown>) {
  const event: SimEvent = {
    ts: new Date().toISOString().slice(11, 23),
    tenantIdx,
    tenantName,
    category,
    message,
    details,
  };
  for (const fn of listeners) fn(event);
}

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

function now(): string {
  return new Date().toISOString();
}

// ── Order type selection ──────────────────────────────────────

type OrderType = "dine_in" | "takeaway" | "delivery" | "qr";

function randomOrderType(): OrderType {
  const r = Math.random();
  if (r < SIM_CONFIG.qrOrderProbability) return "qr";
  if (r < SIM_CONFIG.qrOrderProbability + SIM_CONFIG.takeawayProbability) return "takeaway";
  if (r < SIM_CONFIG.qrOrderProbability + SIM_CONFIG.takeawayProbability + SIM_CONFIG.deliveryProbability) return "delivery";
  return "dine_in";
}

// ── Translation verification ──────────────────────────────────

function verifyTranslation(
  tenantIdx: number,
  tenantName: string,
  items: SeededTenantInfo["menuItems"],
  lang: SimLang
) {
  let errors = 0;
  for (const item of items) {
    const name = lang === "es" ? item.nameEs : item.nameEn;
    if (!name || name.trim() === "") {
      errors++;
      log(tenantIdx, "ERROR", `Missing ${lang} translation`, { itemId: item.id });
      incStat(tenantIdx, "errors");
    }
  }
  incStat(tenantIdx, "translationChecks");
  const sample = items.slice(0, 2).map((i) => (lang === "es" ? i.nameEs : i.nameEn));
  log(tenantIdx, "TRANSLATE", `Verified ${items.length} items in [${lang.toUpperCase()}]`, { sample });
  emit(tenantIdx, tenantName, "TRANSLATE", `Verified ${items.length} items [${lang.toUpperCase()}]`, { sample, errors });
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
  customerName: string;
}

function createOrder(
  tenantIdx: number,
  tenant: SeededTenantInfo,
  lang: SimLang
): CreatedOrder | null {
  const orderType = randomOrderType();
  const itemCount = rand(SIM_CONFIG.minItemsPerOrder, SIM_CONFIG.maxItemsPerOrder);
  const selectedItems = pickN(tenant.menuItems, itemCount);
  const name = customerName(lang);

  let tableId: string | null = null;
  if ((orderType === "dine_in" || orderType === "qr") && tenant.tableIds.length > 0) {
    // Find an available table
    const available = db.restaurant_tables.select({ tenant_id: tenant.tenantId, status: "available" as const });
    if (available.length > 0) {
      tableId = pick(available).id;
    } else {
      tableId = pick(tenant.tableIds);
    }
  }

  const subtotal = +selectedItems.reduce((sum, item) => sum + item.price, 0).toFixed(2);
  const taxAmount = tenant.profile.taxIncluded ? 0 : +(subtotal * tenant.profile.taxRate / 100).toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);
  const source = orderType === "qr" ? "qr" : orderType === "delivery" ? "delivery" : orderType === "takeaway" ? "takeaway" : "pos";

  const orderId = uuid();
  const orderNumber = nextOrderNumber();

  const order: DbOrder = {
    id: orderId,
    tenant_id: tenant.tenantId,
    order_number: orderNumber,
    table_id: tableId,
    order_type: orderType,
    status: "open",
    customer_name: name,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: 0,
    tip_amount: 0,
    total,
    payment_status: "pending",
    payment_method: null,
    source: source as DbOrder["source"],
    created_by: tenant.userId,
    confirmed_at: null,
    preparing_at: null,
    ready_at: null,
    served_at: null,
    closed_at: null,
    created_at: now(),
    updated_at: now(),
    metadata: orderType === "delivery" ? { delivery_address: `Calle Sim ${rand(1, 99)}` } : {},
  };

  db.orders.insert(order);

  // Insert items
  for (const item of selectedItems) {
    db.order_items.insert({
      id: uuid(),
      order_id: orderId,
      tenant_id: tenant.tenantId,
      menu_item_id: item.id,
      name: lang === "es" ? item.nameEs : item.nameEn,
      quantity: 1,
      unit_price: item.price,
      subtotal: item.price,
      kds_station: "kitchen",
      kds_status: "pending",
      kds_started_at: null,
      kds_ready_at: null,
    });
  }

  // Update table
  if (tableId) {
    db.restaurant_tables.update({ id: tableId }, { status: "occupied" as const, current_order_id: orderId });
  }

  incStat(tenantIdx, "ordersCreated");
  if (orderType === "qr") incStat(tenantIdx, "qrOrders");

  const itemNames = selectedItems.map((i) => (lang === "es" ? i.nameEs : i.nameEn)).join(", ");
  log(tenantIdx, "ORDER", `#${orderNumber} [${orderType.toUpperCase()}] ${name} — ${itemCount} items`, {
    total: `${total} ${tenant.profile.currency}`,
    lang: lang.toUpperCase(),
  });

  emit(tenantIdx, tenant.profile.name, "ORDER", `#${orderNumber} [${orderType.toUpperCase()}] ${name}`, {
    items: itemNames,
    total,
    currency: tenant.profile.currency,
    lang: lang.toUpperCase(),
    itemCount,
  });

  if (orderType === "qr") {
    const tableNum = db.restaurant_tables.selectOne({ id: tableId! })?.number ?? "?";
    log(tenantIdx, "QR", `QR order #${orderNumber} from table ${tableNum}`, { customer: name });
    emit(tenantIdx, tenant.profile.name, "QR", `QR order #${orderNumber} table ${tableNum}`, { customer: name });
  }

  return { orderId, orderNumber, orderType, total, itemCount, tableId, lang, customerName: name };
}

// ── FLOW: KDS Progression ─────────────────────────────────────

async function progressKDS(
  tenantIdx: number,
  tenant: SeededTenantInfo,
  orderId: string,
  orderNumber: number
) {
  const steps: Array<{
    orderStatus: DbOrder["status"];
    kdsStatus: DbOrderItem["kds_status"];
    label: string;
    tsField: keyof DbOrder;
  }> = [
    { orderStatus: "confirmed", kdsStatus: "pending", label: "CONFIRMED", tsField: "confirmed_at" },
    { orderStatus: "preparing", kdsStatus: "preparing", label: "PREPARING", tsField: "preparing_at" },
    { orderStatus: "ready", kdsStatus: "ready", label: "READY", tsField: "ready_at" },
    { orderStatus: "served", kdsStatus: "served", label: "SERVED", tsField: "served_at" },
  ];

  for (const step of steps) {
    await sleep(SIM_CONFIG.kitchenDelayBaseSec * 1000 + rand(0, 1000));

    db.orders.update({ id: orderId }, {
      status: step.orderStatus,
      [step.tsField]: now(),
      updated_at: now(),
    } as Partial<DbOrder>);

    if (step.kdsStatus !== "pending") {
      const kdsUpdate: Partial<DbOrderItem> = { kds_status: step.kdsStatus };
      if (step.kdsStatus === "preparing") kdsUpdate.kds_started_at = now();
      if (step.kdsStatus === "ready") kdsUpdate.kds_ready_at = now();

      db.order_items.update({ order_id: orderId }, kdsUpdate);
      incStat(tenantIdx, "kdsUpdates");

      log(tenantIdx, "KDS", `#${orderNumber} → ${step.label}`, { kds_status: step.kdsStatus });
      emit(tenantIdx, tenant.profile.name, "KDS", `#${orderNumber} → ${step.label}`, { kds_status: step.kdsStatus });
    } else {
      log(tenantIdx, "STATUS", `#${orderNumber} → ${step.label}`);
      emit(tenantIdx, tenant.profile.name, "STATUS", `#${orderNumber} → ${step.label}`, {});
    }
  }
}

// ── FLOW: Payment ─────────────────────────────────────────────

function processPayment(
  tenantIdx: number,
  tenant: SeededTenantInfo,
  order: CreatedOrder
) {
  const method: "cash" | "card" = Math.random() > 0.25 ? "card" : "cash";
  const tip = Math.random() > 0.6 ? +(order.total * 0.1).toFixed(2) : 0;

  db.payments.insert({
    id: uuid(),
    tenant_id: tenant.tenantId,
    order_id: order.orderId,
    amount: order.total,
    method,
    status: "completed",
    tip_amount: tip,
    received_by: tenant.userId,
    created_at: now(),
  });

  db.orders.update({ id: order.orderId }, {
    status: "closed" as const,
    payment_status: "paid" as const,
    payment_method: method,
    tip_amount: tip,
    closed_at: now(),
    updated_at: now(),
  });

  if (order.tableId) {
    db.restaurant_tables.update({ id: order.tableId }, {
      status: "available" as const,
      current_order_id: null,
    });
  }

  incStat(tenantIdx, "paymentsProcessed");
  incStat(tenantIdx, "totalRevenue", order.total);

  log(tenantIdx, "PAYMENT", `#${order.orderNumber} PAID [${method.toUpperCase()}] ${order.total} ${tenant.profile.currency}`, {
    tip: tip > 0 ? `+${tip} tip` : "no tip",
  });
  emit(tenantIdx, tenant.profile.name, "PAYMENT", `#${order.orderNumber} PAID [${method.toUpperCase()}]`, {
    amount: order.total,
    currency: tenant.profile.currency,
    tip,
    method,
  });
}

// ── FLOW: Receipt ─────────────────────────────────────────────

function generateReceipt(
  tenantIdx: number,
  tenant: SeededTenantInfo,
  order: CreatedOrder
) {
  const fullOrder = db.orders.selectOne({ id: order.orderId });
  const items = db.order_items.select({ order_id: order.orderId });

  if (!fullOrder) return;

  incStat(tenantIdx, "receiptsGenerated");
  incStat(tenantIdx, "ordersCompleted");

  const itemList = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

  log(tenantIdx, "RECEIPT", `#${order.orderNumber} — ${tenant.profile.name}`, {
    customer: order.customerName,
    items: itemList,
    total: fullOrder.total,
    payment: fullOrder.payment_method,
    status: `${fullOrder.status}/${fullOrder.payment_status}`,
    lang: order.lang.toUpperCase(),
  });

  emit(tenantIdx, tenant.profile.name, "RECEIPT", `#${order.orderNumber} receipt generated`, {
    customer: order.customerName,
    items: itemList,
    subtotal: fullOrder.subtotal,
    tax: fullOrder.tax_amount,
    tip: fullOrder.tip_amount,
    total: fullOrder.total,
    payment: fullOrder.payment_method,
    lang: order.lang.toUpperCase(),
  });
}

// ── Full lifecycle ────────────────────────────────────────────

export async function runOrderLifecycle(
  tenantIdx: number,
  tenant: SeededTenantInfo,
  waveNum: number
): Promise<void> {
  const primaryLang = tenant.profile.locale as SimLang;
  const alternateLang: SimLang = primaryLang === "es" ? "en" : "es";
  const lang: SimLang = waveNum % 2 === 0 ? primaryLang : alternateLang;

  // Verify translations
  const sampleItems = pickN(tenant.menuItems, 3);
  verifyTranslation(tenantIdx, tenant.profile.name, sampleItems, lang);

  // Create order
  const order = createOrder(tenantIdx, tenant, lang);
  if (!order) return;

  // KDS progression
  await progressKDS(tenantIdx, tenant, order.orderId, order.orderNumber);

  // Payment
  processPayment(tenantIdx, tenant, order);

  // Receipt
  generateReceipt(tenantIdx, tenant, order);
}

// ── Run full tenant simulation ────────────────────────────────

export async function runTenantSimulation(
  tenantIdx: number,
  tenant: SeededTenantInfo
): Promise<void> {
  log(tenantIdx, "SETUP", `Starting ${SIM_CONFIG.ordersPerTenant} waves for ${tenant.profile.name}`);
  emit(tenantIdx, tenant.profile.name, "SETUP", `Starting ${SIM_CONFIG.ordersPerTenant} order waves`, {});

  for (let wave = 0; wave < SIM_CONFIG.ordersPerTenant; wave++) {
    await runOrderLifecycle(tenantIdx, tenant, wave);

    if (wave < SIM_CONFIG.ordersPerTenant - 1) {
      await sleep(SIM_CONFIG.orderIntervalSec * 1000 + rand(0, 2000));
    }
  }

  log(tenantIdx, "SETUP", `Completed all waves for ${tenant.profile.name}`);
  emit(tenantIdx, tenant.profile.name, "SETUP", `All ${SIM_CONFIG.ordersPerTenant} orders completed`, {});
}
