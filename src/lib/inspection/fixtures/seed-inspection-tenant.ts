/**
 * Inspection Tenant Seeder
 *
 * Creates an isolated test tenant with all required data for scenario execution.
 * The tenant slug is "__inspection__" — never used for real business.
 * Includes cleanup to remove all test data after inspection.
 */

const INSPECTION_TENANT_SLUG = "__ordy_inspection__";
const INSPECTION_TENANT_NAME = "[INSPECTION] Test Restaurant";

type SB = { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export interface InspectionFixture {
  tenantId: string;
  categoryId: string;
  itemIds: string[];
  modifierGroupId: string;
  modifierIds: string[];
  tableId: string;
  zoneId: string;
}

/**
 * Seed a test tenant with menu, tables, modifiers.
 * Returns fixture IDs for scenario use.
 */
export async function seedInspectionTenant(supabase: unknown): Promise<InspectionFixture> {
  const sb = supabase as SB;

  // Clean up any previous inspection data
  await cleanupInspectionTenant(supabase);

  // 1. Create tenant
  const { data: tenant } = await sb
    .from("tenants")
    .insert({
      name: INSPECTION_TENANT_NAME,
      slug: INSPECTION_TENANT_SLUG,
      currency: "EUR",
      timezone: "Europe/Madrid",
      locale: "es",
      tax_rate: 10,
      tax_included: true,
      active: true,
      settings: {
        order_modes: { dine_in: true, takeaway: true, delivery: false },
      },
      business_hours: {
        monday: { open: "08:00", close: "23:00" },
        tuesday: { open: "08:00", close: "23:00" },
        wednesday: { open: "08:00", close: "23:00" },
        thursday: { open: "08:00", close: "23:00" },
        friday: { open: "08:00", close: "23:00" },
        saturday: { open: "09:00", close: "00:00" },
        sunday: { open: "09:00", close: "22:00" },
      },
    })
    .select("id")
    .single();

  const tenantId = tenant!.id;

  // 2. Create zone
  const { data: zone } = await sb
    .from("zones")
    .insert({ tenant_id: tenantId, name: "Test Zone", color: "#FF6600", position: 0 })
    .select("id")
    .single();

  // 3. Create table
  const { data: table } = await sb
    .from("restaurant_tables")
    .insert({
      tenant_id: tenantId,
      zone_id: zone!.id,
      number: "T-01",
      capacity: 4,
      shape: "square",
      status: "available",
    })
    .select("id")
    .single();

  // 4. Create category
  const { data: cat } = await sb
    .from("menu_categories")
    .insert({
      tenant_id: tenantId,
      name_es: "Platos Test",
      name_en: "Test Dishes",
      sort_order: 0,
      active: true,
    })
    .select("id")
    .single();

  // 5. Create menu items
  const itemData = [
    { name_es: "Hamburguesa Test", name_en: "Test Burger", price: 12.50, available: true },
    { name_es: "Ensalada Test", name_en: "Test Salad", price: 8.00, available: true },
    { name_es: "Refresco Test", name_en: "Test Soda", price: 2.50, available: true },
  ];

  const { data: items } = await sb
    .from("menu_items")
    .insert(
      itemData.map((i) => ({
        tenant_id: tenantId,
        category_id: cat!.id,
        ...i,
        active: true,
        kds_station: "cocina",
      }))
    )
    .select("id");

  const itemIds = (items || []).map((i: { id: string }) => i.id);

  // 6. Create modifier group (required: cooking point)
  const { data: modGroup } = await sb
    .from("modifier_groups")
    .insert({
      tenant_id: tenantId,
      name_es: "Punto de cocción",
      name_en: "Cooking point",
      required: true,
      min_select: 1,
      max_select: 1,
      sort_order: 0,
    })
    .select("id")
    .single();

  // 7. Create modifiers
  const { data: mods } = await sb
    .from("modifiers")
    .insert([
      { group_id: modGroup!.id, tenant_id: tenantId, name_es: "Poco hecho", name_en: "Rare", price_delta: 0, sort_order: 0 },
      { group_id: modGroup!.id, tenant_id: tenantId, name_es: "Al punto", name_en: "Medium", price_delta: 0, sort_order: 1 },
      { group_id: modGroup!.id, tenant_id: tenantId, name_es: "Muy hecho", name_en: "Well done", price_delta: 0, sort_order: 2 },
      { group_id: modGroup!.id, tenant_id: tenantId, name_es: "Extra queso", name_en: "Extra cheese", price_delta: 1.50, sort_order: 3 },
    ])
    .select("id");

  const modifierIds = (mods || []).map((m: { id: string }) => m.id);

  // 8. Link modifier group to burger item only (not salad)
  if (itemIds.length > 0) {
    await sb.from("menu_item_modifier_groups").insert({
      item_id: itemIds[0], // burger only
      group_id: modGroup!.id,
    });
  }

  // 9. Create KDS station
  await sb.from("kds_stations").insert({
    tenant_id: tenantId,
    name: "Cocina Test",
    slug: "cocina",
    active: true,
  });

  return {
    tenantId,
    categoryId: cat!.id,
    itemIds,
    modifierGroupId: modGroup!.id,
    modifierIds,
    tableId: table!.id,
    zoneId: zone!.id,
  };
}

/**
 * Clean up all inspection tenant data.
 */
export async function cleanupInspectionTenant(supabase: unknown): Promise<void> {
  const sb = supabase as SB;

  // Find inspection tenant
  const { data: tenant } = await sb
    .from("tenants")
    .select("id")
    .eq("slug", INSPECTION_TENANT_SLUG)
    .single();

  if (!tenant) return;

  const tid = tenant.id;

  // Delete in dependency order (children first)
  await sb.from("notification_log").delete().eq("tenant_id", tid);
  await sb.from("wa_messages").delete().eq("tenant_id", tid);
  await sb.from("wa_sessions").delete().eq("tenant_id", tid);
  await sb.from("wa_instances").delete().eq("tenant_id", tid);
  await sb.from("inspection_runs").delete().eq("tenant_id", tid);
  await sb.from("order_items").delete().eq("tenant_id", tid);
  await sb.from("payments").delete().eq("tenant_id", tid);
  await sb.from("orders").delete().eq("tenant_id", tid);
  await sb.from("cash_movements").delete().eq("tenant_id", tid);
  await sb.from("cash_shifts").delete().eq("tenant_id", tid);
  await sb.from("menu_item_modifier_groups").delete().in(
    "item_id",
    (await sb.from("menu_items").select("id").eq("tenant_id", tid)).data?.map((i: any) => i.id) || []
  );
  await sb.from("modifiers").delete().eq("tenant_id", tid);
  await sb.from("modifier_groups").delete().eq("tenant_id", tid);
  await sb.from("menu_items").delete().eq("tenant_id", tid);
  await sb.from("menu_categories").delete().eq("tenant_id", tid);
  await sb.from("kds_stations").delete().eq("tenant_id", tid);
  await sb.from("restaurant_tables").delete().eq("tenant_id", tid);
  await sb.from("zones").delete().eq("tenant_id", tid);
  await sb.from("tenants").delete().eq("id", tid);
}

export { INSPECTION_TENANT_SLUG };
