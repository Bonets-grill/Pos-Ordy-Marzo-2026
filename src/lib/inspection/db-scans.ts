/**
 * DB Integrity Scan Engine
 *
 * Comprehensive database-level checks for data consistency.
 * Each scan is deterministic — queries DB, counts anomalies, returns structured results.
 * No mutations — read-only.
 */

import type { DBScanResult, DBScanDefinition, DBAnomaly } from "./types";

// ─── Type helper for Supabase client ────────────────────
type SB = {
  from: (table: string) => {
    select: (cols: string, opts?: { count?: string; head?: boolean }) => {
      eq: (col: string, val: unknown) => any;
      neq: (col: string, val: unknown) => any;
      in: (col: string, vals: unknown[]) => any;
      is: (col: string, val: unknown) => any;
      not: (col: string, op: string, val: unknown) => any;
      gte: (col: string, val: unknown) => any;
      lte: (col: string, val: unknown) => any;
      filter: (col: string, op: string, val: unknown) => any;
      limit: (n: number) => any;
      order: (col: string, opts?: { ascending?: boolean }) => any;
      single: () => Promise<{ data: any; error: any }>;
      then: (fn: (r: { data: any; error: any; count?: number }) => void) => Promise<void>;
    } & Promise<{ data: any[]; error: any; count?: number }>;
  };
  rpc: (fn: string, args?: any) => Promise<{ data: any; error: any }>;
};

// ─── Scan Definitions ───────────────────────────────────

const SCAN_DEFINITIONS: DBScanDefinition[] = [
  { id: "DB_001", name: "Orphan orders (no items)", severity: "critical", blocksRelease: true, description: "Non-cancelled orders with zero order_items" },
  { id: "DB_002", name: "Paid orders without payment records", severity: "critical", blocksRelease: true, description: "Orders with payment_status=paid but no payments row" },
  { id: "DB_003", name: "Payment sum mismatch", severity: "critical", blocksRelease: true, description: "Sum of payments != order.total for paid orders" },
  { id: "DB_004", name: "Impossible status combinations", severity: "high", blocksRelease: true, description: "Order status vs item kds_status inconsistencies" },
  { id: "DB_005", name: "Duplicate wa_sessions", severity: "critical", blocksRelease: true, description: "Multiple sessions for same (tenant_id, phone)" },
  { id: "DB_006", name: "Duplicate notifications", severity: "high", blocksRelease: true, description: "Duplicate idempotency_keys in notification_log" },
  { id: "DB_007", name: "Invalid modifier-item combos", severity: "medium", blocksRelease: false, description: "Order items with modifiers not linked to their menu item" },
  { id: "DB_008", name: "Tax/total anomalies", severity: "high", blocksRelease: true, description: "Orders where subtotal + tax - discount + tip != total" },
  { id: "DB_009", name: "Invalid status transition violations", severity: "high", blocksRelease: true, description: "Order state machine violations logged in order_events" },
];

// ─── Individual Scan Implementations ────────────────────

async function scanOrphanOrders(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  // Find non-cancelled orders with no items
  const { data: orders } = await sb
    .from("orders")
    .select("id, order_number, status, created_at")
    .eq("tenant_id", tenantId)
    .not("status", "in", '("cancelled","refunded")');

  if (!orders || orders.length === 0) return [];

  const anomalies: DBAnomaly[] = [];
  // Check in batches of 50
  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50);
    const ids = batch.map((o: any) => o.id);
    const { data: items } = await sb
      .from("order_items")
      .select("order_id")
      .in("order_id", ids);

    const orderIdsWithItems = new Set((items || []).map((i: any) => i.order_id));
    for (const o of batch) {
      if (!orderIdsWithItems.has(o.id)) {
        anomalies.push({
          table: "orders",
          record_id: o.id,
          field: "order_items",
          description: `Order #${o.order_number} (${o.status}) has no order_items`,
          expected: ">= 1 item",
          actual: "0 items",
        });
      }
    }
  }

  return anomalies;
}

async function scanPaidWithoutPayments(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  const { data: orders } = await sb
    .from("orders")
    .select("id, order_number, total, payment_status")
    .eq("tenant_id", tenantId)
    .eq("payment_status", "paid");

  if (!orders || orders.length === 0) return [];

  const anomalies: DBAnomaly[] = [];
  const ids = orders.map((o: any) => o.id);
  const { data: payments } = await sb
    .from("payments")
    .select("order_id, amount, status")
    .in("order_id", ids)
    .eq("status", "completed");

  const paymentsByOrder = new Map<string, number>();
  for (const p of (payments || []) as any[]) {
    paymentsByOrder.set(p.order_id, (paymentsByOrder.get(p.order_id) || 0) + p.amount);
  }

  for (const o of orders as any[]) {
    if (!paymentsByOrder.has(o.id)) {
      anomalies.push({
        table: "orders",
        record_id: o.id,
        field: "payment_status",
        description: `Order #${o.order_number} is paid but has no completed payment records`,
        expected: "payment record exists",
        actual: "no payments",
      });
    }
  }

  return anomalies;
}

async function scanPaymentMismatch(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  const { data: orders } = await sb
    .from("orders")
    .select("id, order_number, total, payment_status")
    .eq("tenant_id", tenantId)
    .eq("payment_status", "paid")
    .limit(200);

  if (!orders || orders.length === 0) return [];

  const anomalies: DBAnomaly[] = [];
  const ids = orders.map((o: any) => o.id);
  const { data: payments } = await sb
    .from("payments")
    .select("order_id, amount")
    .in("order_id", ids)
    .eq("status", "completed");

  const sumByOrder = new Map<string, number>();
  for (const p of (payments || []) as any[]) {
    sumByOrder.set(p.order_id, Math.round(((sumByOrder.get(p.order_id) || 0) + p.amount) * 100) / 100);
  }

  for (const o of orders as any[]) {
    const paidSum = sumByOrder.get(o.id) || 0;
    const orderTotal = Math.round(o.total * 100) / 100;
    if (paidSum > 0 && Math.abs(paidSum - orderTotal) > 0.02) {
      anomalies.push({
        table: "payments",
        record_id: o.id,
        field: "amount",
        description: `Order #${o.order_number}: payment sum (${paidSum}) != order total (${orderTotal})`,
        expected: String(orderTotal),
        actual: String(paidSum),
      });
    }
  }

  return anomalies;
}

async function scanImpossibleStatus(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  // Orders marked as "served" but with items still "pending"
  const { data: served } = await sb
    .from("orders")
    .select("id, order_number, status")
    .eq("tenant_id", tenantId)
    .eq("status", "served");

  if (!served || served.length === 0) return [];

  const anomalies: DBAnomaly[] = [];
  const ids = served.map((o: any) => o.id);
  const { data: items } = await sb
    .from("order_items")
    .select("order_id, kds_status, name")
    .in("order_id", ids)
    .eq("kds_status", "pending");

  for (const item of (items || []) as any[]) {
    const order = served.find((o: any) => o.id === item.order_id);
    anomalies.push({
      table: "order_items",
      record_id: item.order_id,
      field: "kds_status",
      description: `Order #${order?.order_number} is "served" but item "${item.name}" is still "pending"`,
      expected: "served or ready",
      actual: "pending",
    });
  }

  return anomalies;
}

async function scanDuplicateSessions(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  const { data: sessions } = await sb
    .from("wa_sessions")
    .select("id, phone, tenant_id")
    .eq("tenant_id", tenantId);

  if (!sessions || sessions.length === 0) return [];

  const phoneCount = new Map<string, number>();
  for (const s of sessions as any[]) {
    phoneCount.set(s.phone, (phoneCount.get(s.phone) || 0) + 1);
  }

  const anomalies: DBAnomaly[] = [];
  for (const [phone, count] of phoneCount) {
    if (count > 1) {
      anomalies.push({
        table: "wa_sessions",
        record_id: phone,
        field: "phone",
        description: `${count} duplicate sessions for phone ${phone}`,
        expected: "1",
        actual: String(count),
      });
    }
  }

  return anomalies;
}

async function scanDuplicateNotifications(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  // notification_log has UNIQUE on idempotency_key, so duplicates shouldn't exist
  // But we check for orders with multiple notifications of same type
  const { data: logs } = await sb
    .from("notification_log")
    .select("order_id, notification_type, idempotency_key")
    .eq("tenant_id", tenantId);

  if (!logs || logs.length === 0) return [];

  const keyCount = new Map<string, number>();
  for (const l of logs as any[]) {
    const k = `${l.order_id}:${l.notification_type}`;
    keyCount.set(k, (keyCount.get(k) || 0) + 1);
  }

  const anomalies: DBAnomaly[] = [];
  for (const [key, count] of keyCount) {
    if (count > 1) {
      anomalies.push({
        table: "notification_log",
        record_id: key,
        field: "idempotency_key",
        description: `Duplicate notification: ${key} sent ${count} times`,
        expected: "1",
        actual: String(count),
      });
    }
  }

  return anomalies;
}

async function scanModifierItemCombos(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  // Spot-check recent orders for modifier validity
  const { data: recentItems } = await sb
    .from("order_items")
    .select("id, order_id, menu_item_id, name, modifiers")
    .eq("tenant_id", tenantId)
    .not("menu_item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!recentItems || recentItems.length === 0) return [];

  // Get modifier links for these items
  const itemIds = [...new Set((recentItems as any[]).map((i) => i.menu_item_id).filter(Boolean))];
  if (itemIds.length === 0) return [];

  const { data: links } = await sb
    .from("menu_item_modifier_groups")
    .select("item_id, group_id")
    .in("item_id", itemIds);

  const { data: mods } = await sb
    .from("modifiers")
    .select("id, name_es, group_id")
    .eq("active", true);

  // Build valid modifier names per item
  const groupsByItem = new Map<string, Set<string>>();
  for (const link of (links || []) as any[]) {
    if (!groupsByItem.has(link.item_id)) groupsByItem.set(link.item_id, new Set());
    groupsByItem.get(link.item_id)!.add(link.group_id);
  }

  const modNamesByGroup = new Map<string, Set<string>>();
  for (const m of (mods || []) as any[]) {
    if (!modNamesByGroup.has(m.group_id)) modNamesByGroup.set(m.group_id, new Set());
    modNamesByGroup.get(m.group_id)!.add(m.name_es.toLowerCase());
  }

  const anomalies: DBAnomaly[] = [];
  for (const item of recentItems as any[]) {
    const itemMods: any[] = Array.isArray(item.modifiers) ? item.modifiers : [];
    if (itemMods.length === 0 || !item.menu_item_id) continue;

    const validGroups = groupsByItem.get(item.menu_item_id);
    if (!validGroups) continue;

    const validNames = new Set<string>();
    for (const gid of validGroups) {
      const names = modNamesByGroup.get(gid);
      if (names) names.forEach((n) => validNames.add(n));
    }

    for (const mod of itemMods) {
      const modName = (mod.name || "").toLowerCase();
      if (modName && !validNames.has(modName)) {
        anomalies.push({
          table: "order_items",
          record_id: item.id,
          field: "modifiers",
          description: `Item "${item.name}" has modifier "${mod.name}" not linked to its menu item`,
          expected: "linked modifier",
          actual: mod.name,
        });
      }
    }
  }

  return anomalies;
}

async function scanTaxAnomalies(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  const { data: orders } = await sb
    .from("orders")
    .select("id, order_number, subtotal, tax_amount, discount_amount, tip_amount, total")
    .eq("tenant_id", tenantId)
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!orders || orders.length === 0) return [];

  const anomalies: DBAnomaly[] = [];
  for (const o of orders as any[]) {
    const expected = Math.round((o.subtotal + o.tax_amount - (o.discount_amount || 0) + (o.tip_amount || 0)) * 100) / 100;
    const actual = Math.round(o.total * 100) / 100;
    if (Math.abs(expected - actual) > 0.02) {
      anomalies.push({
        table: "orders",
        record_id: o.id,
        field: "total",
        description: `Order #${o.order_number}: sub(${o.subtotal}) + tax(${o.tax_amount}) - disc(${o.discount_amount || 0}) + tip(${o.tip_amount || 0}) = ${expected}, but total = ${actual}`,
        expected: String(expected),
        actual: String(actual),
      });
    }
  }

  return anomalies;
}

async function scanStatusTransitionViolations(sb: SB, tenantId: string): Promise<DBAnomaly[]> {
  const { data: violations } = await sb
    .from("order_events")
    .select("id, order_id, event_type, status_before, status_after, metadata, created_at")
    .eq("tenant_id", tenantId)
    .eq("event_type", "invalid_transition_blocked")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!violations?.length) return [];

  return (violations as any[]).map((v) => ({
    table: "order_events",
    record_id: v.order_id || v.id,
    field: "status",
    description: `Invalid transition: ${v.status_before} → ${v.status_after} (order ${(v.metadata as any)?.order_number || "?"})`,
    expected: `Valid transition from ${v.status_before}`,
    actual: `${v.status_before} → ${v.status_after}`,
  }));
}

// ─── Scanner Map ────────────────────────────────────────

const SCANNERS: Record<string, (sb: SB, tid: string) => Promise<DBAnomaly[]>> = {
  DB_001: scanOrphanOrders,
  DB_002: scanPaidWithoutPayments,
  DB_003: scanPaymentMismatch,
  DB_004: scanImpossibleStatus,
  DB_005: scanDuplicateSessions,
  DB_006: scanDuplicateNotifications,
  DB_007: scanModifierItemCombos,
  DB_008: scanTaxAnomalies,
  DB_009: scanStatusTransitionViolations,
};

// ─── Public API ─────────────────────────────────────────

export async function runAllDBScans(supabase: unknown, tenantId: string): Promise<DBScanResult[]> {
  const sb = supabase as SB;
  const results: DBScanResult[] = [];

  for (const def of SCAN_DEFINITIONS) {
    const scanner = SCANNERS[def.id];
    if (!scanner) continue;

    const start = Date.now();
    try {
      const anomalies = await scanner(sb, tenantId);
      results.push({
        scan_id: def.id,
        scan_name: def.name,
        status: anomalies.length === 0 ? "pass" : def.severity === "critical" ? "fail" : "warn",
        severity: def.severity,
        blocks_release: def.blocksRelease && anomalies.length > 0,
        count: anomalies.length,
        anomalies,
        duration_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        scan_id: def.id,
        scan_name: def.name,
        status: "error",
        severity: def.severity,
        blocks_release: false,
        count: 0,
        anomalies: [],
        duration_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

export async function runSingleDBScan(supabase: unknown, tenantId: string, scanId: string): Promise<DBScanResult | null> {
  const def = SCAN_DEFINITIONS.find((d) => d.id === scanId);
  const scanner = SCANNERS[scanId];
  if (!def || !scanner) return null;

  const start = Date.now();
  const anomalies = await scanner(supabase as SB, tenantId);

  return {
    scan_id: def.id,
    scan_name: def.name,
    status: anomalies.length === 0 ? "pass" : def.severity === "critical" ? "fail" : "warn",
    severity: def.severity,
    blocks_release: def.blocksRelease && anomalies.length > 0,
    count: anomalies.length,
    anomalies,
    duration_ms: Date.now() - start,
    timestamp: new Date().toISOString(),
  };
}

export function getDBScanDefinitions(): DBScanDefinition[] {
  return SCAN_DEFINITIONS;
}
