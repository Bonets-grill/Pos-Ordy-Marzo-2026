// ============================================================
// SIMULATION DB — Supabase service-role operations
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getServiceKey, TenantProfile, CategorySeed, MenuItemSeed } from "./config";

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(getSupabaseUrl(), getServiceKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

// ── Seed data structures ──────────────────────────────────────

export interface SeededTenant {
  tenantId: string;
  profile: TenantProfile;
  userId: string;
  tables: { id: string; number: string }[];
  menuItems: { id: string; nameEs: string; nameEn: string; price: number; prepTime: number; categoryNameEs: string }[];
  kdsStationId: string;
}

// ── Provision a simulation tenant ─────────────────────────────

export async function provisionTenant(profile: TenantProfile): Promise<SeededTenant> {
  const db = getClient();

  // 1. Create tenant (upsert by slug)
  const { data: tenant, error: tErr } = await db
    .from("tenants")
    .upsert(
      {
        name: profile.name,
        slug: profile.slug,
        currency: profile.currency,
        locale: profile.locale,
        timezone: profile.timezone,
        tax_rate: profile.taxRate,
        tax_included: profile.taxIncluded,
        plan: "pro",
        active: true,
        settings: { simulation: true },
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (tErr || !tenant) throw new Error(`Tenant create failed: ${tErr?.message}`);
  const tenantId = tenant.id;

  // 2. Create a simulation user via auth admin (or reuse)
  const email = `sim-${profile.slug}@ordy-sim.local`;
  let userId: string;

  // Try to find existing user first
  const { data: existingUsers } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    userId = existing.id;
    // Make sure the users table row exists
    await db.from("users").upsert({
      id: userId,
      tenant_id: tenantId,
      email,
      name: `Sim Staff (${profile.name})`,
      role: "owner",
      active: true,
    }, { onConflict: "id" });
  } else {
    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email,
      password: "SimPass2026!",
      email_confirm: true,
      user_metadata: { tenant_id: tenantId },
    });
    if (authErr || !authUser.user) throw new Error(`Auth user create failed: ${authErr?.message}`);
    userId = authUser.user.id;

    await db.from("users").insert({
      id: userId,
      tenant_id: tenantId,
      email,
      name: `Sim Staff (${profile.name})`,
      role: "owner",
      active: true,
    });
  }

  // 3. Create tables
  const tableRows = Array.from({ length: profile.tableCount }, (_, i) => ({
    tenant_id: tenantId,
    number: `${i + 1}`,
    label: `Mesa ${i + 1}`,
    capacity: 4,
    status: "available",
    active: true,
  }));

  // Delete old sim tables for this tenant, then insert fresh
  await db.from("restaurant_tables").delete().eq("tenant_id", tenantId);
  const { data: tables, error: tabErr } = await db
    .from("restaurant_tables")
    .insert(tableRows)
    .select("id, number");
  if (tabErr) throw new Error(`Tables create failed: ${tabErr.message}`);

  // 4. Create KDS station
  await db.from("kds_stations").delete().eq("tenant_id", tenantId);
  const { data: kds, error: kdsErr } = await db
    .from("kds_stations")
    .insert({ tenant_id: tenantId, name: "Kitchen", slug: "kitchen", active: true })
    .select("id")
    .single();
  if (kdsErr) throw new Error(`KDS create failed: ${kdsErr.message}`);

  // 5. Create menu categories + items
  await db.from("order_items").delete().eq("tenant_id", tenantId);
  await db.from("menu_items").delete().eq("tenant_id", tenantId);
  await db.from("menu_categories").delete().eq("tenant_id", tenantId);

  const allItems: SeededTenant["menuItems"] = [];

  for (let ci = 0; ci < profile.menuCategories.length; ci++) {
    const cat = profile.menuCategories[ci];
    const { data: catRow, error: catErr } = await db
      .from("menu_categories")
      .insert({
        tenant_id: tenantId,
        name_es: cat.nameEs,
        name_en: cat.nameEn,
        sort_order: ci,
        active: true,
      })
      .select("id")
      .single();
    if (catErr) throw new Error(`Category create failed: ${catErr.message}`);

    for (let ii = 0; ii < cat.items.length; ii++) {
      const item = cat.items[ii];
      const { data: itemRow, error: itemErr } = await db
        .from("menu_items")
        .insert({
          tenant_id: tenantId,
          category_id: catRow.id,
          name_es: item.nameEs,
          name_en: item.nameEn,
          price: item.price,
          prep_time_minutes: item.prepTime,
          kds_station: "kitchen",
          sort_order: ii,
          available: true,
          active: true,
        })
        .select("id")
        .single();
      if (itemErr) throw new Error(`Item create failed: ${itemErr.message}`);
      allItems.push({
        id: itemRow.id,
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        price: item.price,
        prepTime: item.prepTime,
        categoryNameEs: cat.nameEs,
      });
    }
  }

  return {
    tenantId,
    profile,
    userId,
    tables: tables ?? [],
    menuItems: allItems,
    kdsStationId: kds.id,
  };
}

// ── Cleanup simulation data ───────────────────────────────────

export async function cleanupTenant(tenantId: string) {
  const db = getClient();
  // Delete in dependency order
  await db.from("payments").delete().eq("tenant_id", tenantId);
  await db.from("order_items").delete().eq("tenant_id", tenantId);
  await db.from("orders").delete().eq("tenant_id", tenantId);
  await db.from("restaurant_tables").delete().eq("tenant_id", tenantId);
  await db.from("kds_stations").delete().eq("tenant_id", tenantId);
  await db.from("menu_items").delete().eq("tenant_id", tenantId);
  await db.from("menu_categories").delete().eq("tenant_id", tenantId);
}
