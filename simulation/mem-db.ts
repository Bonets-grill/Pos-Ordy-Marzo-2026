// ============================================================
// IN-MEMORY DATABASE — Zero external dependencies
// Mimics Supabase table structure using typed Maps
// No persistence, no disk, no network
// ============================================================

export interface DbTenant {
  id: string;
  name: string;
  slug: string;
  currency: string;
  locale: string;
  timezone: string;
  tax_rate: number;
  tax_included: boolean;
}

export interface DbUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
}

export interface DbMenuCategory {
  id: string;
  tenant_id: string;
  name_es: string;
  name_en: string;
  sort_order: number;
}

export interface DbMenuItem {
  id: string;
  tenant_id: string;
  category_id: string;
  name_es: string;
  name_en: string;
  price: number;
  prep_time_minutes: number;
  kds_station: string;
}

export interface DbTable {
  id: string;
  tenant_id: string;
  number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_id: string | null;
}

export interface DbKdsStation {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
}

export interface DbOrder {
  id: string;
  tenant_id: string;
  order_number: number;
  table_id: string | null;
  order_type: "dine_in" | "takeaway" | "delivery" | "qr";
  status: "open" | "confirmed" | "preparing" | "ready" | "served" | "closed" | "cancelled";
  customer_name: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total: number;
  payment_status: "pending" | "partial" | "paid" | "refunded";
  payment_method: string | null;
  source: "pos" | "qr" | "takeaway" | "delivery";
  created_by: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  tenant_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  kds_station: string;
  kds_status: "pending" | "preparing" | "ready" | "served";
  kds_started_at: string | null;
  kds_ready_at: string | null;
}

export interface DbPayment {
  id: string;
  tenant_id: string;
  order_id: string;
  amount: number;
  method: "cash" | "card";
  status: "completed";
  tip_amount: number;
  received_by: string;
  created_at: string;
}

// ── UUID generator (no crypto import needed) ──────────────────

let _counter = 0;
export function uuid(): string {
  _counter++;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rnd}-${_counter.toString(36).padStart(4, "0")}`;
}

// ── Auto-increment for order numbers ──────────────────────────

let _orderSeq = 1000;
export function nextOrderNumber(): number {
  return _orderSeq++;
}

// ── The in-memory store ───────────────────────────────────────

class MemStore<T extends { id: string }> {
  private rows: T[] = [];

  insert(row: T): T {
    this.rows.push(row);
    return row;
  }

  insertMany(rows: T[]): T[] {
    this.rows.push(...rows);
    return rows;
  }

  select(filter?: Partial<T>): T[] {
    if (!filter) return [...this.rows];
    return this.rows.filter((row) =>
      Object.entries(filter).every(([k, v]) => (row as Record<string, unknown>)[k] === v)
    );
  }

  selectOne(filter: Partial<T>): T | null {
    return this.select(filter)[0] ?? null;
  }

  update(filter: Partial<T>, changes: Partial<T>): number {
    let count = 0;
    for (const row of this.rows) {
      const match = Object.entries(filter).every(
        ([k, v]) => (row as Record<string, unknown>)[k] === v
      );
      if (match) {
        Object.assign(row, changes);
        count++;
      }
    }
    return count;
  }

  count(filter?: Partial<T>): number {
    return filter ? this.select(filter).length : this.rows.length;
  }

  clear(): void {
    this.rows = [];
  }
}

// ── Database instance ─────────────────────────────────────────

export const db = {
  tenants: new MemStore<DbTenant>(),
  users: new MemStore<DbUser>(),
  menu_categories: new MemStore<DbMenuCategory>(),
  menu_items: new MemStore<DbMenuItem>(),
  restaurant_tables: new MemStore<DbTable>(),
  kds_stations: new MemStore<DbKdsStation>(),
  orders: new MemStore<DbOrder>(),
  order_items: new MemStore<DbOrderItem>(),
  payments: new MemStore<DbPayment>(),
};

// ── Seed from config profiles ─────────────────────────────────

import type { TenantProfile } from "./config";

export interface SeededTenantInfo {
  tenantId: string;
  userId: string;
  profile: TenantProfile;
  tableIds: string[];
  menuItems: Array<{
    id: string;
    nameEs: string;
    nameEn: string;
    price: number;
    prepTime: number;
    categoryNameEs: string;
  }>;
}

export function seedTenant(profile: TenantProfile): SeededTenantInfo {
  const tenantId = uuid();
  const userId = uuid();

  db.tenants.insert({
    id: tenantId,
    name: profile.name,
    slug: profile.slug,
    currency: profile.currency,
    locale: profile.locale,
    timezone: profile.timezone,
    tax_rate: profile.taxRate,
    tax_included: profile.taxIncluded,
  });

  db.users.insert({
    id: userId,
    tenant_id: tenantId,
    email: `staff@${profile.slug}.local`,
    name: `Staff (${profile.name})`,
    role: "owner",
  });

  // Tables
  const tableIds: string[] = [];
  for (let i = 0; i < profile.tableCount; i++) {
    const tid = uuid();
    tableIds.push(tid);
    db.restaurant_tables.insert({
      id: tid,
      tenant_id: tenantId,
      number: `${i + 1}`,
      capacity: 4,
      status: "available",
      current_order_id: null,
    });
  }

  // KDS station
  db.kds_stations.insert({
    id: uuid(),
    tenant_id: tenantId,
    name: "Kitchen",
    slug: "kitchen",
  });

  // Menu
  const menuItems: SeededTenantInfo["menuItems"] = [];
  for (let ci = 0; ci < profile.menuCategories.length; ci++) {
    const cat = profile.menuCategories[ci];
    const catId = uuid();
    db.menu_categories.insert({
      id: catId,
      tenant_id: tenantId,
      name_es: cat.nameEs,
      name_en: cat.nameEn,
      sort_order: ci,
    });

    for (const item of cat.items) {
      const itemId = uuid();
      db.menu_items.insert({
        id: itemId,
        tenant_id: tenantId,
        category_id: catId,
        name_es: item.nameEs,
        name_en: item.nameEn,
        price: item.price,
        prep_time_minutes: item.prepTime,
        kds_station: "kitchen",
      });
      menuItems.push({
        id: itemId,
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        price: item.price,
        prepTime: item.prepTime,
        categoryNameEs: cat.nameEs,
      });
    }
  }

  return { tenantId, userId, profile, tableIds, menuItems };
}
