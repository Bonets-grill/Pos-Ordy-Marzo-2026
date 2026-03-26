import { NextRequest, NextResponse } from "next/server";
import { sendToAirtableAsync, getTenantName } from "@/lib/airtable/dispatcher";
import { createServiceClient } from "@/lib/supabase-server";
import { isFeatureEnabled } from "@/lib/safety/feature-flags";
import { createOrderWithItems } from "@/lib/safety/transactions";
import type { OrderPayload, OrderItemPayload } from "@/lib/safety/transactions";
import { createSpanFromContext } from "@/lib/observability/tracing";
import { metrics } from "@/lib/observability/metrics";
import { sanitizeText, sanitizeName, sanitizePhone, isValidUUID } from "@/lib/safety/input-sanitizer";

const TOOLS_SECRET = process.env.DIFY_TOOLS_SECRET || "ordy-dify-tools-2026";

// ─── Supabase client type alias ───
type SupabaseClient = ReturnType<typeof createServiceClient>;

// ─── Shared domain types for cart/session data ───
interface CartModifier {
  id?: string;
  name: string;
  price_delta: number;
}

interface CartItem {
  menu_item_id: string;
  name: string;
  qty: number;
  unit_price: number;
  modifiers: CartModifier[];
  notes?: string;
}

interface WaSession {
  id: string;
  tenant_id: string;
  phone: string;
  state: string;
  cart: CartItem[];
  context: Record<string, unknown>;
  customer_name?: string;
  pending_order_id?: string;
  last_message_at?: string;
}

interface MenuItemRow {
  id: string;
  name_es: string;
  description_es?: string;
  price: number;
  category_id?: string;
  available?: boolean;
  active?: boolean;
  allergens?: string[];
  kds_station?: string;
}

interface CategoryRow {
  id: string;
  name_es: string;
  sort_order: number;
}

interface ModifierGroupRow {
  id: string;
  name_es: string;
  required: boolean;
}

interface ModifierRow {
  id: string;
  name_es: string;
  price_delta: number;
  group_id: string;
  available?: boolean;
}

interface ModifierGroupLink {
  group_id: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
}

interface OrderItemRow {
  name: string;
  quantity: number;
  kds_status: string;
}

interface TenantTaxRow {
  tax_rate: number;
  tax_included: boolean;
  currency: string;
}

interface TenantHoursRow {
  business_hours: Record<string, { open: string; close: string; closed?: boolean; split?: boolean; open2?: string; close2?: string }>;
  timezone: string;
}

interface FuzzyMatchable {
  id: string;
  name_es: string;
}

/**
 * POST /api/whatsapp/tools
 * Dify external tool endpoint. Handles all agent actions.
 * Body: { tool, tenant_id, phone, ...params }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    if (auth !== TOOLS_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tool, tenant_id, phone } = body as {
      tool: string;
      tenant_id: string;
      phone: string;
      item_name?: string;
      quantity?: number;
      modifier_names?: string[];
      notes?: string;
      name?: string;
      table_number?: string;
    };

    if (!tool || !tenant_id || !phone) {
      return NextResponse.json({ error: "tool, tenant_id, phone required" }, { status: 400 });
    }

    // Input validation: tenant_id must be valid UUID
    if (!isValidUUID(tenant_id)) {
      return NextResponse.json({ error: "Invalid tenant_id format" }, { status: 400 });
    }

    // Input sanitization: clean all text fields from Dify
    if (body.item_name) body.item_name = sanitizeText(body.item_name, 200);
    if (body.notes) body.notes = sanitizeText(body.notes, 500);
    if (body.name) body.name = sanitizeName(body.name);
    body.phone = sanitizePhone(phone) || phone;

    const supabase = createServiceClient();

    // Distributed tracing: create a child span for this tool call
    // Retrieve parent span context from the session (stored by agent-dify.ts)
    const { data: traceSession } = await supabase
      .from("wa_sessions")
      .select("context")
      .eq("tenant_id", tenant_id)
      .eq("phone", phone)
      .single();

    const sessionCtx = (traceSession?.context || {}) as Record<string, unknown>;
    const _toolSpan = sessionCtx.trace_id
      ? createSpanFromContext(
          sessionCtx.trace_id as string,
          (sessionCtx.span_id as string) || null,
          `tool.${tool}`,
          "whatsapp",
          tenant_id
        )
      : null;

    // Metrics: record tool call + measure latency
    const toolStart = Date.now();
    metrics.toolCalls.inc({ tool });

    switch (tool) {
      case "get_restaurant_info":
        return NextResponse.json(await getRestaurantInfo(supabase, tenant_id));

      case "get_menu":
        return NextResponse.json(await getMenu(supabase, tenant_id));

      case "get_item_details":
        return NextResponse.json(await getItemDetails(supabase, tenant_id, body.item_name));

      case "add_to_cart": {
        // Accept modifier_names as array or comma-separated string
        let mods: string[] = [];
        if (Array.isArray(body.modifier_names)) {
          mods = body.modifier_names;
        } else if (typeof body.modifier_names === "string" && body.modifier_names.trim()) {
          mods = body.modifier_names.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        return NextResponse.json(await addToCart(supabase, tenant_id, phone, body.item_name, body.quantity || 1, mods, body.notes));
      }

      case "view_cart":
        return NextResponse.json(await viewCart(supabase, tenant_id, phone));

      case "remove_from_cart":
        return NextResponse.json(await removeFromCart(supabase, tenant_id, phone, body.item_name));

      case "set_customer_name":
        return NextResponse.json(await setCustomerName(supabase, tenant_id, phone, body.name));

      case "confirm_order":
        return NextResponse.json(await confirmOrder(supabase, tenant_id, phone, body.table_number));

      case "check_order_status":
        return NextResponse.json(await checkOrderStatus(supabase, tenant_id, phone));

      case "check_business_hours":
        return NextResponse.json(await checkBusinessHours(supabase, tenant_id));

      case "check_allergens":
        return NextResponse.json(await checkAllergens(supabase, tenant_id, body.item_name));

      case "cancel_order":
        return NextResponse.json(await cancelOrder(supabase, tenant_id, phone));

      // ── RESERVATION TOOLS ──
      case "check_availability":
        return NextResponse.json(await checkAvailability(supabase, tenant_id, body.date as string, body.time as string, body.party_size as number));

      case "make_reservation":
        return NextResponse.json(await makeReservation(supabase, tenant_id, phone, body.name as string, body.date as string, body.time as string, body.party_size as number, body.notes as string));

      case "cancel_reservation":
        return NextResponse.json(await cancelReservation(supabase, tenant_id, phone));

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err) {
    metrics.errorsTotal.inc({ source: "tools" });
    console.error("[TOOLS]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Helper: get or create session ───
async function getSession(supabase: SupabaseClient, tenantId: string, phone: string): Promise<WaSession | null> {
  const { data: existing } = await supabase
    .from("wa_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .single();

  if (existing) return existing as WaSession;

  // Find default instance
  const { data: inst } = await supabase
    .from("wa_instances")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  const { data: newSession } = await supabase
    .from("wa_sessions")
    .insert({
      tenant_id: tenantId,
      instance_id: (inst as { id: string } | null)?.id || tenantId,
      phone,
      state: "idle",
      cart: [],
      context: {},
    })
    .select("*")
    .single();

  return (newSession as WaSession) || null;
}

// ─── Helper: strip emojis from text ───
function stripEmojis(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u200D\uFE0F]/gu, "").trim();
}

// ─── Helper: fuzzy match item name ───
function fuzzyMatch(items: FuzzyMatchable[], query: string): FuzzyMatchable | null {
  const q = stripEmojis(query.toLowerCase().trim());
  // Exact match (with and without emojis)
  const exact = items.find((i: FuzzyMatchable) => stripEmojis(i.name_es.toLowerCase()) === q);
  if (exact) return exact;
  // Partial match (strip emojis for comparison)
  const partial = items.find((i: FuzzyMatchable) => {
    const name = stripEmojis(i.name_es.toLowerCase());
    return name.includes(q) || q.includes(name);
  });
  return partial || null;
}

// ─── Helper: fuzzy match modifier name ───
// More aggressive matching: checks word overlap, not just substring
function fuzzyMatchModifier(mods: ModifierRow[], query: string): ModifierRow | null {
  const q = query.toLowerCase().trim();

  // 1. Exact match
  const exact = mods.find((m) => m.name_es.toLowerCase() === q);
  if (exact) return exact;

  // 2. Substring match (either direction)
  const sub = mods.find((m) =>
    m.name_es.toLowerCase().includes(q) || q.includes(m.name_es.toLowerCase())
  );
  if (sub) return sub;

  // 3. Word overlap scoring — "extra queso cheddar" matches "loncha queso cheddar" (2 words overlap)
  const qWords = q.split(/\s+/).filter((w) => w.length > 2); // ignore tiny words
  let bestScore = 0;
  let bestMod: ModifierRow | null = null;

  for (const m of mods) {
    const mWords = m.name_es.toLowerCase().split(/\s+/);
    let score = 0;
    for (const qw of qWords) {
      if (mWords.some((mw) => mw.includes(qw) || qw.includes(mw))) {
        score++;
      }
    }
    // Need at least 2 matching words, or 1 if query is single word
    const threshold = qWords.length === 1 ? 1 : 2;
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestMod = m;
    }
  }

  return bestMod;
}

// ─── TOOL: get_menu ───
// ─── TOOL: get_restaurant_info ───
// Returns ALL restaurant configuration — the single source of truth for the agent.
// Called by Dify at the start of each conversation to get fresh data.
async function getRestaurantInfo(supabase: SupabaseClient, tenantId: string) {
  // Tenant config
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, currency, timezone, locale, tax_rate, tax_included, business_hours, settings")
    .eq("id", tenantId)
    .single();

  if (!tenant) return { result: "error", message: "Restaurant not found" };

  const settings = (tenant.settings || {}) as Record<string, unknown>;
  const orderModes = (settings.order_modes || {}) as Record<string, boolean>;

  // Business hours formatted
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames: Record<string, string> = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };
  const hours = (tenant.business_hours || {}) as Record<string, { open?: string; close?: string; closed?: boolean }>;
  const businessHours = days.map((d) => {
    const h = hours[d];
    if (!h || h.closed) return { day: dayNames[d], open: null, close: null, closed: true };
    return { day: dayNames[d], open: h.open, close: h.close, closed: false };
  });

  // Tables + zones for capacity
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("number, capacity")
    .eq("tenant_id", tenantId);

  const totalCapacity = (tables || []).reduce((s: number, t: { capacity: number }) => s + (t.capacity || 0), 0);

  // Reservation settings
  const { data: resSettings } = await supabase
    .from("reservation_settings")
    .select("enabled, slot_duration_minutes, max_party_size, advance_booking_days, min_advance_hours, cancellation_policy")
    .eq("tenant_id", tenantId)
    .single();

  return {
    result: "success",
    restaurant: {
      name: tenant.name,
      currency: tenant.currency,
      timezone: tenant.timezone,
      tax_rate: tenant.tax_rate,
      tax_included: tenant.tax_included,
      address: settings.address || settings.google_maps_url || "",
    },
    business_hours: businessHours,
    order_modes: {
      dine_in: orderModes.dine_in !== false,
      takeaway: orderModes.takeaway !== false,
      delivery: orderModes.delivery === true,
    },
    capacity: {
      tables: (tables || []).length,
      total_seats: totalCapacity,
    },
    reservations: resSettings ? {
      enabled: resSettings.enabled,
      max_party_size: resSettings.max_party_size,
      slot_duration_minutes: resSettings.slot_duration_minutes,
      advance_booking_days: resSettings.advance_booking_days,
      cancellation_policy: resSettings.cancellation_policy,
    } : { enabled: false },
  };
}

// ─── TOOL: get_menu ───
async function getMenu(supabase: SupabaseClient, tenantId: string) {
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name_es, sort_order")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name_es, price, category_id, available, allergens")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .eq("available", true)
    .order("sort_order");

  const menu: { category: string; items: { name: string; price: number; allergens: string[] }[] }[] = [];

  for (const cat of (categories || []) as CategoryRow[]) {
    const catItems = ((items || []) as MenuItemRow[]).filter((i: MenuItemRow) => i.category_id === cat.id);
    if (catItems.length === 0) continue;
    menu.push({
      category: cat.name_es,
      items: catItems.map((i: MenuItemRow) => ({
        name: i.name_es,
        price: i.price,
        allergens: i.allergens || [],
      })),
    });
  }

  return { result: "success", menu };
}

// ─── TOOL: get_item_details ───
async function getItemDetails(supabase: SupabaseClient, tenantId: string, itemName: string) {
  if (!itemName) return { result: "error", message: "item_name is required" };

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name_es, description_es, price, allergens, available")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const typedItems = (items || []) as MenuItemRow[];
  const item = fuzzyMatch(typedItems, itemName);
  if (!item) return { result: "not_found", message: `No encontré "${itemName}" en el menú` };

  const fullItem = typedItems.find((i: MenuItemRow) => i.id === item.id)!;

  // Get modifiers
  const { data: links } = await supabase
    .from("menu_item_modifier_groups")
    .select("group_id")
    .eq("item_id", item.id);

  const groupIds = ((links || []) as ModifierGroupLink[]).map((l: ModifierGroupLink) => l.group_id);
  let modifierGroups: { name: string; required: boolean; options: { name: string; price_delta: number }[] }[] = [];

  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from("modifier_groups")
      .select("id, name_es, required")
      .in("id", groupIds);

    const { data: mods } = await supabase
      .from("modifiers")
      .select("name_es, price_delta, group_id")
      .in("group_id", groupIds)
      .eq("active", true);

    const typedGroups = (groups || []) as ModifierGroupRow[];
    const typedMods = (mods || []) as ModifierRow[];

    modifierGroups = typedGroups.map((g: ModifierGroupRow) => ({
      name: g.name_es,
      required: g.required,
      options: typedMods.filter((m: ModifierRow) => m.group_id === g.id).map((m: ModifierRow) => ({
        name: m.name_es,
        price_delta: m.price_delta,
      })),
    }));
  }

  return {
    result: "success",
    item: {
      name: fullItem.name_es,
      price: fullItem.price,
      description: fullItem.description_es || "Sin descripción",
      allergens: fullItem.allergens || [],
      available: fullItem.available,
      modifier_groups: modifierGroups,
    },
  };
}

// ─── TOOL: add_to_cart ───
async function addToCart(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
  itemName: string,
  quantity: number,
  modifierNames: string[],
  notes?: string
) {
  if (!itemName) return { result: "error", message: "item_name is required" };
  if (quantity < 1 || quantity > 20) return { result: "error", message: "quantity must be 1-20" };

  const session = await getSession(supabase, tenantId, phone);
  if (!session) return { result: "error", message: "Could not get session" };

  // Find item
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name_es, price, available")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const typedItems = (items || []) as MenuItemRow[];
  const item = fuzzyMatch(typedItems, itemName);
  if (!item) return { result: "not_found", message: `No encontré "${itemName}" en el menú` };
  const fullItem = typedItems.find((i: MenuItemRow) => i.id === item.id)!;
  if (!fullItem.available) return { result: "unavailable", message: `"${fullItem.name_es}" no está disponible ahora` };

  // Resolve modifiers
  const resolvedMods: { id: string; name: string; price_delta: number }[] = [];
  if (modifierNames.length > 0) {
    const { data: links } = await supabase
      .from("menu_item_modifier_groups")
      .select("group_id")
      .eq("item_id", item.id);

    const groupIds = ((links || []) as ModifierGroupLink[]).map((l: ModifierGroupLink) => l.group_id);
    if (groupIds.length > 0) {
      const { data: mods } = await supabase
        .from("modifiers")
        .select("id, name_es, price_delta, group_id")
        .in("group_id", groupIds)
        .eq("active", true);

      const typedMods = (mods || []) as ModifierRow[];

      // Validate modifiers belong to this item's groups
      const modValidationEnabled = await isFeatureEnabled(supabase, "wa_modifier_validation");
      const unresolvedMods: string[] = [];

      for (const modName of modifierNames) {
        const found = fuzzyMatchModifier(typedMods, modName);
        if (found) {
          resolvedMods.push({ id: found.id, name: found.name_es, price_delta: found.price_delta });
        } else if (modValidationEnabled) {
          unresolvedMods.push(modName);
        }
      }

      if (modValidationEnabled && unresolvedMods.length > 0) {
        const availableNames = typedMods.map((m: ModifierRow) => m.name_es).join(", ");
        return {
          result: "invalid_modifiers",
          message: `No encontré estos modificadores para "${fullItem.name_es}": ${unresolvedMods.join(", ")}. Disponibles: ${availableNames}`,
        };
      }
    }
  }

  // Add to cart
  const cart: CartItem[] = [...(session.cart || [])];
  const modsTotal = resolvedMods.reduce((s: number, m: CartModifier) => s + m.price_delta, 0);

  cart.push({
    menu_item_id: item.id,
    name: fullItem.name_es,
    qty: quantity,
    unit_price: fullItem.price,
    modifiers: resolvedMods,
    ...(notes ? { notes } : {}),
  });

  await supabase
    .from("wa_sessions")
    .update({ cart, state: "ordering", last_message_at: new Date().toISOString() })
    .eq("id", session.id);

  const lineTotal = (fullItem.price + modsTotal) * quantity;
  const cartTotal = cart.reduce((s: number, c: CartItem) => s + (c.unit_price + (c.modifiers || []).reduce((ms: number, m: CartModifier) => ms + m.price_delta, 0)) * c.qty, 0);

  return {
    result: "added",
    item_name: fullItem.name_es,
    quantity,
    unit_price: fullItem.price,
    modifiers: resolvedMods.map((m: CartModifier) => `${m.name} (+${m.price_delta.toFixed(2)}€)`),
    line_total: lineTotal,
    cart_total: cartTotal,
    cart_items: cart.length,
  };
}

// ─── TOOL: view_cart ───
async function viewCart(supabase: SupabaseClient, tenantId: string, phone: string) {
  const session = await getSession(supabase, tenantId, phone);
  if (!session) return { result: "error", message: "No session" };

  const cart: CartItem[] = session.cart || [];
  if (cart.length === 0) return { result: "empty", message: "El carrito está vacío" };

  const items = cart.map((c: CartItem) => {
    const modsTotal = (c.modifiers || []).reduce((s: number, m: CartModifier) => s + m.price_delta, 0);
    return {
      name: c.name,
      quantity: c.qty,
      unit_price: c.unit_price,
      modifiers: (c.modifiers || []).map((m: CartModifier) => `${m.name} (+${m.price_delta.toFixed(2)}€)`),
      notes: c.notes || null,
      line_total: (c.unit_price + modsTotal) * c.qty,
    };
  });

  const total = items.reduce((s: number, i: { line_total: number }) => s + i.line_total, 0);

  return { result: "success", items, total, customer_name: session.customer_name };
}

// ─── TOOL: remove_from_cart ───
async function removeFromCart(supabase: SupabaseClient, tenantId: string, phone: string, itemName: string) {
  if (!itemName) return { result: "error", message: "item_name is required" };

  const session = await getSession(supabase, tenantId, phone);
  if (!session) return { result: "error", message: "No session" };

  const cart: CartItem[] = [...(session.cart || [])];
  const q = itemName.toLowerCase().trim();
  const idx = cart.findIndex((c: CartItem) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));

  if (idx === -1) return { result: "not_found", message: `"${itemName}" no está en el carrito` };

  const removed = cart.splice(idx, 1)[0];
  await supabase
    .from("wa_sessions")
    .update({ cart, state: cart.length === 0 ? "idle" : "ordering", last_message_at: new Date().toISOString() })
    .eq("id", session.id);

  const total = cart.reduce((s: number, c: CartItem) =>
    s + (c.unit_price + (c.modifiers || []).reduce((ms: number, m: CartModifier) => ms + m.price_delta, 0)) * c.qty, 0);

  return { result: "removed", removed_item: removed.name, cart_items: cart.length, cart_total: total };
}

// ─── TOOL: set_customer_name ───
async function setCustomerName(supabase: SupabaseClient, tenantId: string, phone: string, name: string) {
  if (!name?.trim()) return { result: "error", message: "name is required" };

  const session = await getSession(supabase, tenantId, phone);
  if (!session) return { result: "error", message: "No session" };

  await supabase
    .from("wa_sessions")
    .update({ customer_name: name.trim(), last_message_at: new Date().toISOString() })
    .eq("id", session.id);

  return { result: "saved", customer_name: name.trim() };
}

// ─── TOOL: confirm_order ───
async function confirmOrder(supabase: SupabaseClient, tenantId: string, phone: string, tableNumber?: string) {
  const session = await getSession(supabase, tenantId, phone);
  if (!session) return { result: "error", message: "No session" };

  const cart: CartItem[] = session.cart || [];
  if (cart.length === 0) return { result: "error", message: "El carrito está vacío. Añade productos primero." };
  if (!session.customer_name) return { result: "error", message: "Necesito el nombre del cliente primero. Usa set_customer_name." };

  // Block orders when restaurant is closed
  const hoursCheck = await checkBusinessHours(supabase, tenantId);
  if (hoursCheck.is_open === false) {
    return { result: "closed", message: "Lo sentimos, el restaurante está cerrado en este momento. No podemos procesar el pedido." };
  }

  // Get tenant tax config
  const { data: tenant } = await supabase
    .from("tenants")
    .select("tax_rate, tax_included, currency")
    .eq("id", tenantId)
    .single();

  const typedTenant = tenant as TenantTaxRow | null;

  // Re-verify prices from DB
  const itemIds = cart.map((c: CartItem) => c.menu_item_id);
  const { data: freshItems } = await supabase
    .from("menu_items")
    .select("id, price, kds_station")
    .in("id", itemIds);

  const priceMap = new Map(
    ((freshItems || []) as MenuItemRow[]).map((i: MenuItemRow) => [i.id, i] as [string, MenuItemRow])
  );

  // Calculate totals with fresh prices
  let subtotal = 0;
  const orderItems = cart.map((c: CartItem) => {
    const fresh = priceMap.get(c.menu_item_id);
    const unitPrice = fresh?.price || c.unit_price;
    const modsTotal = (c.modifiers || []).reduce((s: number, m: CartModifier) => s + m.price_delta, 0);
    const lineTotal = Math.round((unitPrice + modsTotal) * c.qty * 100) / 100;
    subtotal += lineTotal;

    return {
      tenant_id: tenantId,
      menu_item_id: c.menu_item_id,
      name: c.name,
      quantity: c.qty,
      unit_price: unitPrice,
      modifiers: (c.modifiers || []).map((m: CartModifier) => ({ name: m.name, price_delta: m.price_delta })),
      modifiers_total: modsTotal,
      subtotal: lineTotal,
      notes: c.notes || null,
      kds_status: "pending",
      kds_station: fresh?.kds_station || "cocina",
    };
  });

  // Tax calculation
  const taxRate = typedTenant?.tax_rate || 0;
  const taxIncluded = typedTenant?.tax_included ?? true;
  const taxAmount = taxIncluded ? 0 : Math.round(subtotal * taxRate) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Resolve table if provided
  let tableId: string | null = null;
  if (tableNumber) {
    const { data: table } = await supabase
      .from("restaurant_tables")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("number", parseInt(tableNumber))
      .single();
    tableId = (table as { id: string } | null)?.id || null;
  }

  // Create order + items (transactional if feature flag enabled)
  let typedOrder: OrderRow | null = null;

  const useTransaction = await isFeatureEnabled(supabase, "wa_transactional_orders");

  if (useTransaction) {
    // SAFE PATH: Single transaction — if items fail, order rolls back
    try {
      const txOrder: OrderPayload = {
        tenant_id: tenantId,
        table_id: tableId,
        order_type: tableNumber ? "dine_in" : "takeaway",
        status: "confirmed",
        customer_name: session.customer_name,
        customer_phone: phone,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        tip_amount: 0,
        total,
        payment_status: "pending",
        source: "whatsapp",
        metadata: { wa_session_id: session.id, trace_id: ((session.context || {}) as Record<string, unknown>).trace_id || null, span_id: ((session.context || {}) as Record<string, unknown>).span_id || null, parent_span_id: ((session.context || {}) as Record<string, unknown>).parent_span_id || null },
        confirmed_at: new Date().toISOString(),
      };
      const txItems: OrderItemPayload[] = orderItems.map((i: typeof orderItems[number]) => ({
        tenant_id: i.tenant_id,
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        modifiers: i.modifiers,
        modifiers_total: i.modifiers_total,
        subtotal: i.subtotal,
        notes: i.notes,
        kds_status: i.kds_status,
        kds_station: i.kds_station,
      }));

      const result = await createOrderWithItems(supabase, txOrder, txItems);
      typedOrder = { id: result.id, order_number: String(result.order_number), status: "confirmed", total };
    } catch (err) {
      console.error("[TOOLS] Transactional order creation failed:", (err as Error).message);
      return { result: "error", message: "Error al crear el pedido. Intenta de nuevo." };
    }
  } else {
    // LEGACY PATH: Separate inserts (kept as fallback)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        table_id: tableId,
        order_type: tableNumber ? "dine_in" : "takeaway",
        status: "confirmed",
        customer_name: session.customer_name,
        customer_phone: phone,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        tip_amount: 0,
        total,
        payment_status: "pending",
        source: "whatsapp",
        metadata: { wa_session_id: session.id, trace_id: ((session.context || {}) as Record<string, unknown>).trace_id || null, span_id: ((session.context || {}) as Record<string, unknown>).span_id || null, parent_span_id: ((session.context || {}) as Record<string, unknown>).parent_span_id || null },
        confirmed_at: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();

    typedOrder = order as OrderRow | null;

    if (orderError || !typedOrder) {
      console.error("[TOOLS] Order creation failed:", orderError);
      return { result: "error", message: "Error al crear el pedido. Intenta de nuevo." };
    }

    const itemsWithOrderId = orderItems.map((i: typeof orderItems[number]) => ({ ...i, order_id: typedOrder!.id }));
    await supabase.from("order_items").insert(itemsWithOrderId);
  }

  if (!typedOrder) {
    return { result: "error", message: "Error al crear el pedido." };
  }

  // Update table if needed
  if (tableId) {
    await supabase
      .from("restaurant_tables")
      .update({ status: "occupied", current_order_id: typedOrder.id })
      .eq("id", tableId);
  }

  // Clear session cart
  await supabase
    .from("wa_sessions")
    .update({ cart: [], state: "idle", pending_order_id: typedOrder.id, last_message_at: new Date().toISOString() })
    .eq("id", session.id);

  // Metrics: order created
  metrics.ordersCreated.inc({ source: "whatsapp" });

  // Airtable: registrar orden WhatsApp (multi-tenant)
  getTenantName(tenantId).then(tenantName => {
    sendToAirtableAsync('orders', {
      'Order Number': typedOrder!.order_number,
      'Status': 'confirmed',
      'Source': 'whatsapp',
      'Order Type': tableId ? 'dine_in' : 'takeaway',
      'Total': total,
      'Items Count': cart.length,
      'Customer Name': session.customer_name || '',
      'Customer Phone': phone || '',
      'Order ID': typedOrder!.id,
      'Tenant Name': tenantName,
      'Timestamp': new Date().toISOString(),
    })
  })

  return {
    result: "confirmed",
    order_number: typedOrder.order_number,
    total,
    items_count: cart.length,
    customer_name: session.customer_name,
    message: `Pedido #${typedOrder.order_number} enviado — ${total.toFixed(2)}€. Cocina debe aceptar el pedido primero. El cliente recibirá una notificación cuando cocina acepte. NO digas que el pedido ya está en cocina. Dile al cliente que su pedido ha sido enviado y que le avisarás por este chat cuando cocina lo acepte.`,
  };
}

// ─── TOOL: check_order_status ───
async function checkOrderStatus(supabase: SupabaseClient, tenantId: string, phone: string) {
  const session = await getSession(supabase, tenantId, phone);
  if (!session?.pending_order_id) return { result: "no_order", message: "No tienes ningún pedido activo" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total")
    .eq("id", session.pending_order_id)
    .single();

  const typedOrder = order as OrderRow | null;
  if (!typedOrder) return { result: "not_found", message: "Pedido no encontrado" };

  const { data: items } = await supabase
    .from("order_items")
    .select("name, quantity, kds_status")
    .eq("order_id", typedOrder.id);

  const statusMap: Record<string, string> = {
    pending: "⏳ Pendiente",
    preparing: "🔥 Preparando",
    ready: "✅ Listo",
    served: "🍽️ Servido",
    done: "✅ Listo",
  };

  return {
    result: "success",
    order_number: typedOrder.order_number,
    status: typedOrder.status,
    total: typedOrder.total,
    items: ((items || []) as OrderItemRow[]).map((i: OrderItemRow) => ({
      name: i.name,
      quantity: i.quantity,
      status: statusMap[i.kds_status] || i.kds_status,
    })),
  };
}

// ─── TOOL: check_business_hours ───
async function checkBusinessHours(supabase: SupabaseClient, tenantId: string) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_hours, timezone")
    .eq("id", tenantId)
    .single();

  const typedTenant = tenant as TenantHoursRow | null;
  if (!typedTenant?.business_hours) return { result: "not_configured", message: "Horarios no configurados" };

  const bh = typedTenant.business_hours;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayNames: Record<string, string> = {
    monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
    thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo"
  };

  // Use tenant timezone (default: Atlantic/Canary for Canary Islands)
  const tz = typedTenant.timezone || "Atlantic/Canary";
  const nowStr = new Date().toLocaleString("en-US", { timeZone: tz });
  const now = new Date(nowStr);
  const dayKey = days[now.getDay()];
  const todayH = bh[dayKey];

  let isOpen = false;
  if (todayH?.closed) {
    isOpen = false;
  } else if (todayH) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    // First shift
    if (todayH.open && todayH.close) {
      const [oH, oM] = todayH.open.split(":").map(Number);
      const [cH, cM] = todayH.close.split(":").map(Number);
      const openMin = oH * 60 + oM;
      const closeMin = cH * 60 + cM;
      if (openMin !== closeMin) {
        isOpen = closeMin < openMin
          ? (nowMin >= openMin || nowMin <= closeMin)
          : (nowMin >= openMin && nowMin <= closeMin);
      }
    }
    // Second shift (split hours)
    if (!isOpen && todayH.split && todayH.open2 && todayH.close2) {
      const [o2H, o2M] = todayH.open2.split(":").map(Number);
      const [c2H, c2M] = todayH.close2.split(":").map(Number);
      const open2Min = o2H * 60 + o2M;
      const close2Min = c2H * 60 + c2M;
      isOpen = close2Min < open2Min
        ? (nowMin >= open2Min || nowMin <= close2Min)
        : (nowMin >= open2Min && nowMin <= close2Min);
    }
  }

  const schedule = Object.entries(bh).map(([day, h]: [string, { open: string; close: string; closed?: boolean }]) => ({
    day: dayNames[day] || day,
    hours: h.closed ? "Cerrado" : `${h.open} - ${h.close}`,
  }));

  return { result: "success", is_open: isOpen, today: dayNames[dayKey], schedule };
}

// ─── TOOL: cancel_order ───
async function cancelOrder(supabase: SupabaseClient, tenantId: string, phone: string) {
  const session = await getSession(supabase, tenantId, phone);
  if (!session?.pending_order_id) return { result: "no_order", message: "No tienes ningún pedido activo para cancelar" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, metadata")
    .eq("id", session.pending_order_id)
    .single();

  if (!order) return { result: "not_found", message: "Pedido no encontrado" };

  // Only allow cancellation if not already preparing or beyond
  if (["preparing", "ready", "served", "closed"].includes(order.status)) {
    return { result: "too_late", message: `El pedido #${order.order_number} ya está en preparación y no se puede cancelar. Contacta directamente con el restaurante.` };
  }

  // Cancel order
  const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "customer_cancelled_via_agent" };
  await supabase
    .from("orders")
    .update({ status: "cancelled", metadata, cancelled_at: new Date().toISOString() })
    .eq("id", order.id);

  // Remove from KDS
  await supabase
    .from("order_items")
    .update({ kds_status: "served" })
    .eq("order_id", order.id);

  // Reset session
  await supabase
    .from("wa_sessions")
    .update({ state: "idle", pending_order_id: null, cart: [] })
    .eq("id", session.id);

  return {
    result: "cancelled",
    order_number: order.order_number,
    message: `Pedido #${order.order_number} cancelado correctamente.`,
  };
}

// ─── TOOL: check_allergens ───
async function checkAllergens(supabase: SupabaseClient, tenantId: string, itemName: string) {
  if (!itemName) return { result: "error", message: "item_name is required" };

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name_es, allergens")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const typedItems = (items || []) as MenuItemRow[];
  const item = fuzzyMatch(typedItems, itemName);
  if (!item) return { result: "not_found", message: `No encontré "${itemName}"` };

  const full = typedItems.find((i: MenuItemRow) => i.id === item.id)!;
  return {
    result: "success",
    item_name: full.name_es,
    allergens: full.allergens?.length ? full.allergens : ["Ninguno registrado"],
  };
}

// ═══════════════════════════════════════════════════════════
// RESERVATION TOOLS
// ═══════════════════════════════════════════════════════════

// ─── TOOL: check_availability ───
async function checkAvailability(supabase: SupabaseClient, tenantId: string, date: string, time: string, partySize: number) {
  if (!date || !time || !partySize) {
    return { result: "error", message: "Se necesita fecha (YYYY-MM-DD), hora (HH:MM) y número de personas." };
  }

  // Get reservation settings
  const { data: settings } = await supabase
    .from("reservation_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (!settings || !settings.enabled) {
    return { result: "disabled", message: "Este restaurante no acepta reservas en este momento." };
  }

  if (partySize > settings.max_party_size) {
    return { result: "error", message: `El tamaño máximo de grupo es ${settings.max_party_size} personas.` };
  }

  // Check if date is blocked
  const blockedDates = (settings.blocked_dates || []) as string[];
  if (blockedDates.includes(date)) {
    return { result: "blocked", message: `El restaurante está cerrado el ${date}.` };
  }

  // Calculate end time
  const [hh, mm] = time.split(":").map(Number);
  const startMinutes = hh * 60 + mm;
  const endMinutes = startMinutes + settings.slot_duration_minutes;
  const endHH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
  const endMM = String(endMinutes % 60).padStart(2, "0");
  const endTime = `${endHH}:${endMM}`;

  // Get all tables that can fit the party
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("id, number, capacity, zone_id")
    .eq("tenant_id", tenantId)
    .gte("capacity", partySize)
    .order("capacity"); // prefer smallest table that fits

  if (!tables || tables.length === 0) {
    return { result: "no_tables", message: `No hay mesas para ${partySize} personas.` };
  }

  // Get existing reservations for that date that overlap
  const { data: existing } = await supabase
    .from("reservations")
    .select("table_id, reservation_time, end_time")
    .eq("tenant_id", tenantId)
    .eq("reservation_date", date)
    .in("status", ["pending", "confirmed", "seated"])
    .in("table_id", tables.map((t: any) => t.id));

  // Find tables that are free at the requested time
  const busyTableIds = new Set<string>();
  for (const res of (existing || []) as any[]) {
    // Check time overlap
    const resStart = res.reservation_time.substring(0, 5);
    const resEnd = res.end_time.substring(0, 5);
    if (time < resEnd && endTime > resStart) {
      busyTableIds.add(res.table_id);
    }
  }

  const availableTables = (tables as any[]).filter((t) => !busyTableIds.has(t.id));

  if (availableTables.length === 0) {
    // Suggest alternative times
    const alternatives: string[] = [];
    for (let offset = -60; offset <= 120; offset += 30) {
      if (offset === 0) continue;
      const altMinutes = startMinutes + offset;
      if (altMinutes < 0 || altMinutes > 23 * 60) continue;
      const altHH = String(Math.floor(altMinutes / 60)).padStart(2, "0");
      const altMM = String(altMinutes % 60).padStart(2, "0");
      const altTime = `${altHH}:${altMM}`;
      const altEnd = `${String(Math.floor((altMinutes + settings.slot_duration_minutes) / 60)).padStart(2, "0")}:${String((altMinutes + settings.slot_duration_minutes) % 60).padStart(2, "0")}`;

      // Quick check if any table is free at this alternative time
      const altBusy = new Set<string>();
      for (const res of (existing || []) as any[]) {
        const resStart = res.reservation_time.substring(0, 5);
        const resEnd = res.end_time.substring(0, 5);
        if (altTime < resEnd && altEnd > resStart) {
          altBusy.add(res.table_id);
        }
      }
      if ((tables as any[]).some((t) => !altBusy.has(t.id))) {
        alternatives.push(altTime);
      }
      if (alternatives.length >= 3) break;
    }

    return {
      result: "full",
      message: `No hay disponibilidad para ${partySize} personas a las ${time} el ${date}.`,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      suggestion: alternatives.length > 0 ? `Horarios alternativos disponibles: ${alternatives.join(", ")}` : "No hay horarios alternativos cercanos.",
    };
  }

  return {
    result: "available",
    date,
    time,
    end_time: endTime,
    party_size: partySize,
    available_tables: availableTables.length,
    message: `Hay disponibilidad para ${partySize} personas a las ${time} el ${date}. ¿Confirmo la reserva?`,
  };
}

// ─── TOOL: make_reservation ───
async function makeReservation(
  supabase: SupabaseClient, tenantId: string, phone: string,
  customerName: string, date: string, time: string, partySize: number, notes?: string
) {
  if (!customerName || !date || !time || !partySize) {
    return { result: "error", message: "Se necesita nombre, fecha, hora y número de personas." };
  }

  // Verify availability first
  const availability = await checkAvailability(supabase, tenantId, date, time, partySize);
  if (availability.result !== "available") {
    return availability; // forward the no-availability response
  }

  // Get settings for slot duration
  const { data: settings } = await supabase
    .from("reservation_settings")
    .select("slot_duration_minutes, auto_confirm, confirmation_message")
    .eq("tenant_id", tenantId)
    .single();

  const slotDuration = settings?.slot_duration_minutes || 90;
  const autoConfirm = settings?.auto_confirm !== false;

  // Calculate end time
  const [hh, mm] = time.split(":").map(Number);
  const endMinutes = hh * 60 + mm + slotDuration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  // Find best available table (smallest that fits)
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("id, number, capacity")
    .eq("tenant_id", tenantId)
    .gte("capacity", partySize)
    .order("capacity")
    .limit(20);

  const { data: existing } = await supabase
    .from("reservations")
    .select("table_id, reservation_time, end_time")
    .eq("tenant_id", tenantId)
    .eq("reservation_date", date)
    .in("status", ["pending", "confirmed", "seated"])
    .in("table_id", (tables || []).map((t: any) => t.id));

  const busyTableIds = new Set<string>();
  for (const res of (existing || []) as any[]) {
    const resStart = res.reservation_time.substring(0, 5);
    const resEnd = res.end_time.substring(0, 5);
    if (time < resEnd && endTime > resStart) {
      busyTableIds.add(res.table_id);
    }
  }

  const bestTable = (tables as any[])?.find((t) => !busyTableIds.has(t.id));
  if (!bestTable) {
    return { result: "error", message: "La disponibilidad cambió. No hay mesa libre. Intenta otro horario." };
  }

  // Create reservation
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: tenantId,
      table_id: bestTable.id,
      customer_name: customerName,
      customer_phone: phone,
      party_size: partySize,
      reservation_date: date,
      reservation_time: time,
      end_time: endTime,
      status: autoConfirm ? "confirmed" : "pending",
      source: "whatsapp",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) {
    // Handle double-booking race condition
    if (error.code === "23505") {
      return { result: "conflict", message: "Esa mesa acaba de ser reservada. Intenta otro horario." };
    }
    console.error("[TOOLS] Reservation failed:", error);
    return { result: "error", message: "Error al crear la reserva. Intenta de nuevo." };
  }

  // Airtable: registrar reserva (multi-tenant)
  getTenantName(tenantId).then(tenantName => {
    sendToAirtableAsync('reservations', {
      'Customer Name': customerName,
      'Customer Phone': phone,
      'Date': date,
      'Time': time,
      'Party Size': partySize,
      'Status': autoConfirm ? 'confirmed' : 'pending',
      'Notes': notes || '',
      'Reservation ID': reservation?.id || '',
      'Tenant Name': tenantName,
      'Timestamp': new Date().toISOString(),
    })
  })

  return {
    result: "reserved",
    reservation_id: reservation?.id,
    date,
    time,
    end_time: endTime,
    party_size: partySize,
    table_number: bestTable.number,
    status: autoConfirm ? "confirmed" : "pending",
    message: autoConfirm
      ? `¡Reserva confirmada! 🎉 Mesa ${bestTable.number} para ${partySize} personas el ${date} a las ${time}. ${settings?.confirmation_message || ""}`
      : `Reserva registrada. El restaurante la confirmará pronto. Mesa ${bestTable.number} para ${partySize} personas el ${date} a las ${time}.`,
  };
}

// ─── TOOL: cancel_reservation ───
async function cancelReservation(supabase: SupabaseClient, tenantId: string, phone: string) {
  // Find the most recent active reservation for this phone
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, reservation_date, reservation_time, party_size, table_id, status")
    .eq("tenant_id", tenantId)
    .eq("customer_phone", phone)
    .in("status", ["pending", "confirmed"])
    .order("reservation_date", { ascending: false })
    .limit(1)
    .single();

  if (!reservation) {
    return { result: "not_found", message: "No encontré reservas activas para tu número." };
  }

  await supabase
    .from("reservations")
    .update({ status: "cancelled", cancellation_reason: "Cancelado por el cliente vía WhatsApp" })
    .eq("id", reservation.id);

  return {
    result: "cancelled",
    date: reservation.reservation_date,
    time: reservation.reservation_time,
    message: `Tu reserva del ${reservation.reservation_date} a las ${String(reservation.reservation_time).substring(0, 5)} ha sido cancelada.`,
  };
}
