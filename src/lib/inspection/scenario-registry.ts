/**
 * Scenario Registry — Central catalog of all inspection scenarios.
 * Each scenario is registered with metadata that determines:
 *   - severity classification
 *   - whether it blocks release
 *   - which group it belongs to
 *
 * Scenario executors are loaded lazily from scenario files.
 */

import type { ScenarioDefinition, ScenarioGroup } from "./types";

// ─── SCENARIO CATALOG ───────────────────────────────────

export const SCENARIO_CATALOG: ScenarioDefinition[] = [
  // ── GROUP A: WHATSAPP ──
  { id: "WA_001", name: "WhatsApp greeting + menu (Spanish)", group: "whatsapp", severity: "high", blocksRelease: true, description: "Agent responds to greeting and can show menu in Spanish", prerequisites: ["tenant_exists", "menu_exists", "wa_instance_exists"], tags: ["language", "menu"] },
  { id: "WA_002", name: "WhatsApp greeting + menu (English)", group: "whatsapp", severity: "medium", blocksRelease: false, description: "Agent responds in English when customer writes in English", prerequisites: ["tenant_exists", "menu_exists"], tags: ["language", "i18n"] },
  { id: "WA_003", name: "Add valid item with modifiers", group: "whatsapp", severity: "critical", blocksRelease: true, description: "add_to_cart succeeds with valid item and valid modifiers", prerequisites: ["tenant_exists", "menu_with_modifiers"], tags: ["cart", "modifiers"] },
  { id: "WA_004", name: "Reject invalid modifier for item", group: "whatsapp", severity: "high", blocksRelease: true, description: "add_to_cart rejects modifiers not linked to the item", prerequisites: ["tenant_exists", "menu_with_modifiers", "wa_modifier_validation_flag"], tags: ["cart", "modifiers", "validation"] },
  { id: "WA_005", name: "Enforce required modifiers", group: "whatsapp", severity: "medium", blocksRelease: false, description: "confirmOrder warns if required modifier groups are missing", prerequisites: ["tenant_exists", "menu_with_required_modifiers"], tags: ["modifiers", "validation"] },
  { id: "WA_006", name: "Full order confirmation creates order + items", group: "whatsapp", severity: "critical", blocksRelease: true, description: "confirm_order creates order and order_items atomically in DB", prerequisites: ["tenant_exists", "session_with_cart"], tags: ["order", "transaction"] },
  { id: "WA_007", name: "Customer pickup confirmation (SÍ)", group: "whatsapp", severity: "high", blocksRelease: true, description: "Pickup confirmation SÍ updates order metadata correctly", prerequisites: ["order_awaiting_confirmation"], tags: ["pickup", "notification"] },
  { id: "WA_008", name: "Duplicate webhook does not duplicate order", group: "whatsapp", severity: "critical", blocksRelease: true, description: "Re-sending the same webhook event does not create duplicate effects", prerequisites: ["tenant_exists"], tags: ["idempotency", "webhook"] },
  { id: "WA_009", name: "Notification retry is idempotent", group: "whatsapp", severity: "critical", blocksRelease: true, description: "Retrying /api/whatsapp/notify does not send duplicate messages", prerequisites: ["order_exists", "notification_idempotency_flag"], tags: ["idempotency", "notification"] },
  { id: "WA_010", name: "Concurrent messages don't corrupt session", group: "whatsapp", severity: "critical", blocksRelease: true, description: "Two simultaneous messages for same phone don't create duplicate sessions", prerequisites: ["tenant_exists", "wa_sessions_unique_constraint"], tags: ["concurrency", "session"] },

  // ── GROUP B: QR ──
  { id: "QR_001", name: "Fetch public menu", group: "qr", severity: "critical", blocksRelease: true, description: "GET /api/public/menu returns valid menu structure", prerequisites: ["tenant_exists", "menu_exists"], tags: ["menu", "public"] },
  { id: "QR_002", name: "Create valid QR order", group: "qr", severity: "critical", blocksRelease: true, description: "POST /api/public/order creates order with server-side price verification", prerequisites: ["tenant_exists", "menu_exists"], tags: ["order", "public"] },
  { id: "QR_003", name: "Reject manipulated price", group: "qr", severity: "critical", blocksRelease: true, description: "Public order API ignores client-side prices and uses DB prices", prerequisites: ["tenant_exists", "menu_exists"], tags: ["security", "price"] },
  { id: "QR_004", name: "Reject invalid modifier-item relation", group: "qr", severity: "high", blocksRelease: true, description: "Public order rejects modifiers not linked to the ordered item", prerequisites: ["tenant_exists", "menu_with_modifiers"], tags: ["modifiers", "validation"] },
  { id: "QR_005", name: "QR order visible in KDS", group: "qr", severity: "high", blocksRelease: true, description: "After QR order creation, order appears in KDS query", prerequisites: ["tenant_exists"], tags: ["order", "kds"] },
  { id: "QR_006", name: "Status polling reflects transitions", group: "qr", severity: "medium", blocksRelease: false, description: "GET /api/public/order?orderId=X returns updated status after transitions", prerequisites: ["order_exists"], tags: ["status", "polling"] },

  // ── GROUP C: POS ──
  { id: "POS_001", name: "Create dine-in order and send to kitchen", group: "pos", severity: "critical", blocksRelease: true, description: "POS dine-in order creates order + items + marks table occupied", prerequisites: ["tenant_exists", "tables_exist"], tags: ["order", "dine_in"] },
  { id: "POS_002", name: "Create takeaway order and charge directly", group: "pos", severity: "critical", blocksRelease: true, description: "POS takeaway creates order + items + payment in one flow", prerequisites: ["tenant_exists"], tags: ["order", "payment", "takeaway"] },
  { id: "POS_003", name: "Cash payment valid", group: "pos", severity: "critical", blocksRelease: true, description: "Cash payment creates correct payment record", prerequisites: ["order_exists"], tags: ["payment", "cash"] },
  { id: "POS_004", name: "Card payment valid", group: "pos", severity: "critical", blocksRelease: true, description: "Card payment creates correct payment record", prerequisites: ["order_exists"], tags: ["payment", "card"] },
  { id: "POS_005", name: "Mixed payment sum validated", group: "pos", severity: "critical", blocksRelease: true, description: "Mixed payment (cash+card) must equal order total", prerequisites: ["order_exists"], tags: ["payment", "mixed", "validation"] },
  { id: "POS_006", name: "Split equal without item duplication", group: "pos", severity: "high", blocksRelease: true, description: "Equal split distributes items proportionally, not duplicated", prerequisites: ["order_with_items"], tags: ["split", "items"] },
  { id: "POS_007", name: "Split tax integrity", group: "pos", severity: "high", blocksRelease: true, description: "Split bill distributes tax proportionally across sub-orders", prerequisites: ["order_with_items"], tags: ["split", "tax"] },
  { id: "POS_008", name: "Load WhatsApp pending order and charge", group: "pos", severity: "high", blocksRelease: true, description: "POS can load a WhatsApp pending order, charge it, and update status", prerequisites: ["wa_order_pending"], tags: ["whatsapp", "payment"] },

  // ── GROUP D: KDS ──
  { id: "KDS_001", name: "Incoming order appears in KDS", group: "kds", severity: "critical", blocksRelease: true, description: "Confirmed order with pending items appears in KDS query", prerequisites: ["order_confirmed"], tags: ["kds", "query"] },
  { id: "KDS_002", name: "Accept order with pickup time", group: "kds", severity: "high", blocksRelease: true, description: "Kitchen accept sets metadata.pickup_status and notifies customer", prerequisites: ["wa_order_confirmed"], tags: ["kds", "whatsapp", "notification"] },
  { id: "KDS_003", name: "Preparing transition valid", group: "kds", severity: "high", blocksRelease: true, description: "pending → preparing transition updates items and order correctly", prerequisites: ["order_confirmed"], tags: ["kds", "status"] },
  { id: "KDS_004", name: "Ready transition valid", group: "kds", severity: "high", blocksRelease: true, description: "preparing → ready transition updates items and order correctly", prerequisites: ["order_preparing"], tags: ["kds", "status"] },
  { id: "KDS_005", name: "Served transition valid", group: "kds", severity: "medium", blocksRelease: false, description: "ready → served transition updates items and order correctly", prerequisites: ["order_ready"], tags: ["kds", "status"] },
  { id: "KDS_006", name: "Impossible transition blocked/flagged", group: "kds", severity: "medium", blocksRelease: false, description: "Status transitions that skip steps are detected", prerequisites: ["order_exists"], tags: ["kds", "validation"] },

  // ── GROUP E: DB INTEGRITY (covered by db-scans, registered here for catalog) ──
  { id: "DB_001", name: "No orphan orders (orders without items)", group: "db_integrity", severity: "critical", blocksRelease: true, description: "Every non-cancelled order has at least one order_item", prerequisites: [], tags: ["integrity", "orders"] },
  { id: "DB_002", name: "Paid orders have payment records", group: "db_integrity", severity: "critical", blocksRelease: true, description: "Orders with payment_status=paid have matching payments", prerequisites: [], tags: ["integrity", "payment"] },
  { id: "DB_003", name: "Payment sum matches order total", group: "db_integrity", severity: "critical", blocksRelease: true, description: "Sum of payments for each order equals order.total", prerequisites: [], tags: ["integrity", "payment", "financial"] },
  { id: "DB_004", name: "No impossible order/item status combos", group: "db_integrity", severity: "high", blocksRelease: true, description: "order.status and order_items.kds_status are consistent", prerequisites: [], tags: ["integrity", "status"] },
  { id: "DB_005", name: "No duplicate wa_sessions per tenant+phone", group: "db_integrity", severity: "critical", blocksRelease: true, description: "Each (tenant_id, phone) has at most one wa_session", prerequisites: [], tags: ["integrity", "session", "whatsapp"] },
  { id: "DB_006", name: "No duplicate notifications", group: "db_integrity", severity: "high", blocksRelease: true, description: "notification_log has no duplicate idempotency_keys", prerequisites: [], tags: ["integrity", "notification"] },
  { id: "DB_007", name: "No invalid modifier-item combinations", group: "db_integrity", severity: "medium", blocksRelease: false, description: "order_items.modifiers reference valid modifier groups for the item", prerequisites: [], tags: ["integrity", "modifiers"] },
  { id: "DB_008", name: "No tax anomalies in orders", group: "db_integrity", severity: "high", blocksRelease: true, description: "order.subtotal + tax - discount + tip = total (within tolerance)", prerequisites: [], tags: ["integrity", "financial", "tax"] },
  { id: "DB_009", name: "No invalid status transition violations", group: "db_integrity", severity: "high", blocksRelease: true, description: "No order_events with event_type=invalid_transition_blocked", prerequisites: [], tags: ["integrity", "state_machine"] },

  // ── GROUP F: CHAOS / FAILURE ──
  { id: "CH_001", name: "Dify timeout handling", group: "chaos", severity: "medium", blocksRelease: false, description: "When Dify times out, customer receives a friendly error message", prerequisites: ["wa_instance_exists"], tags: ["chaos", "timeout"] },
  { id: "CH_002", name: "Evolution duplicate webhook delivery", group: "chaos", severity: "high", blocksRelease: true, description: "Same webhook event processed twice does not duplicate orders", prerequisites: ["tenant_exists"], tags: ["chaos", "idempotency"] },
  { id: "CH_003", name: "Transient DB failure on order creation", group: "chaos", severity: "medium", blocksRelease: false, description: "If DB fails during order creation, no orphan data remains", prerequisites: ["wa_transactional_orders_flag"], tags: ["chaos", "transaction"] },
  { id: "CH_004", name: "Delayed notification handling", group: "chaos", severity: "low", blocksRelease: false, description: "If notification send is slow, system doesn't block", prerequisites: [], tags: ["chaos", "notification"] },
  { id: "CH_005", name: "Partial downstream failure", group: "chaos", severity: "medium", blocksRelease: false, description: "If table update fails after order creation, order still valid", prerequisites: [], tags: ["chaos", "partial_failure"] },
  { id: "CH_006", name: "Concurrent order mutation attempt", group: "chaos", severity: "high", blocksRelease: true, description: "Two concurrent attempts to modify same order don't corrupt state", prerequisites: [], tags: ["chaos", "concurrency"] },
];

// ─── HELPERS ────────────────────────────────────────────

export function getScenariosByGroup(group: ScenarioGroup): ScenarioDefinition[] {
  return SCENARIO_CATALOG.filter((s) => s.group === group);
}

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_CATALOG.find((s) => s.id === id);
}

export function getReleaseBlockingScenarios(): ScenarioDefinition[] {
  return SCENARIO_CATALOG.filter((s) => s.blocksRelease);
}

export function getScenariosByTag(tag: string): ScenarioDefinition[] {
  return SCENARIO_CATALOG.filter((s) => s.tags.includes(tag));
}

export function getAllGroups(): ScenarioGroup[] {
  return [...new Set(SCENARIO_CATALOG.map((s) => s.group))];
}

export function getCatalogSummary(): Record<ScenarioGroup, { total: number; critical: number; blocking: number }> {
  const summary: Record<string, { total: number; critical: number; blocking: number }> = {};
  for (const s of SCENARIO_CATALOG) {
    if (!summary[s.group]) summary[s.group] = { total: 0, critical: 0, blocking: 0 };
    summary[s.group].total++;
    if (s.severity === "critical") summary[s.group].critical++;
    if (s.blocksRelease) summary[s.group].blocking++;
  }
  return summary as Record<ScenarioGroup, { total: number; critical: number; blocking: number }>;
}
