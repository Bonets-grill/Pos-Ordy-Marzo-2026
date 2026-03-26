import { NextRequest, NextResponse } from "next/server";
import { isOpenNow } from "@/lib/business-hours";
import { createServiceClient } from "@/lib/supabase-server";
import { sendToAirtableAsync, getTenantName } from "@/lib/airtable/dispatcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  modifier_ids?: string[];
  modifiers?: { name: string; price_delta: number }[];
  notes?: string;
}

interface ValidatedItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  modifiers: { name: string; price_delta: number }[];
  modifiers_total: number;
  subtotal: number;
  notes: string | null;
  kds_station: string | null;
}

// ---------------------------------------------------------------------------
// Rate limiter — simple in-memory per-IP, 10 orders / 60s
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(ip);
  }
}, 120_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const VALID_ORDER_TYPES = new Set(["qr", "delivery", "takeaway"]);

function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function sanitize(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// POST — create order (public, no auth)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many orders. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      tenantSlug, tableNumber, customerLang, customerName,
      customerPhone, customerNotes, orderType, deliveryAddress,
      items, idempotencyKey,
    } = body as {
      tenantSlug: unknown; tableNumber?: unknown; customerLang?: unknown;
      customerName?: unknown; customerPhone?: unknown; customerNotes?: unknown;
      orderType?: unknown; deliveryAddress?: unknown; items: unknown; idempotencyKey?: unknown;
    };

    const safeIdempotencyKey =
      typeof idempotencyKey === "string" && UUID_RE.test(idempotencyKey)
        ? idempotencyKey : null;

    if (typeof tenantSlug !== "string" || !SLUG_RE.test(tenantSlug) || tenantSlug.length > 100) {
      return NextResponse.json({ error: "Invalid tenant slug" }, { status: 400 });
    }

    if (orderType !== undefined && orderType !== null) {
      if (typeof orderType !== "string" || !VALID_ORDER_TYPES.has(orderType)) {
        return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
      }
    }
    const safeOrderType: string =
      typeof orderType === "string" && VALID_ORDER_TYPES.has(orderType) ? orderType : "qr";

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing items" }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ error: "Too many items (max 50)" }, { status: 400 });
    }

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Invalid item" }, { status: 400 });
      }
      if (!isUUID(item.menu_item_id)) {
        return NextResponse.json({ error: "Invalid menu_item_id" }, { status: 400 });
      }
      if (
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 50
      ) {
        return NextResponse.json({ error: "Invalid quantity (must be 1-50)" }, { status: 400 });
      }
      if (item.modifier_ids !== undefined) {
        if (!Array.isArray(item.modifier_ids) || item.modifier_ids.length > 20) {
          return NextResponse.json({ error: "Invalid modifier_ids" }, { status: 400 });
        }
        for (const mid of item.modifier_ids) {
          if (!isUUID(mid)) {
            return NextResponse.json({ error: "Invalid modifier id" }, { status: 400 });
          }
        }
      }
    }

    const safeName = sanitize(customerName, 100);
    const safePhone = sanitize(customerPhone, 30);
    const safeCustomerNotes = sanitize(customerNotes, 500);
    const safeDeliveryAddress = sanitize(deliveryAddress, 300);
    const safeLang = sanitize(customerLang, 5) || "es";
    const safeTableNumber = typeof tableNumber === "string" ? sanitize(tableNumber, 20) : undefined;

    const supabase = createServiceClient();

    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, tax_rate, tax_included, locale, currency, business_hours, timezone")
      .eq("slug", tenantSlug)
      .eq("active", true)
      .single();
    if (!tenant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Block orders when restaurant is closed
    const bh = (tenant as any).business_hours;
    const tz = (tenant as any).timezone;
    if (bh && !isOpenNow(bh, tz)) {
      return NextResponse.json({ error: "Restaurant is currently closed" }, { status: 503 });
    }

    // Block orders when cash register is closed
    const { data: openShift } = await supabase
      .from("cash_shifts")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("status", "open")
      .single();
    if (!openShift) {
      return NextResponse.json({ error: "Cash register is closed" }, { status: 503 });
    }

    const tenantId = tenant.id;
    const tenantLang: string = (tenant.locale || "es").slice(0, 2);

    // 1b. Idempotency check
    if (safeIdempotencyKey) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("tenant_id", tenantId)
        .eq("idempotency_key", safeIdempotencyKey)
        .single();
      if (existingOrder) {
        return NextResponse.json({
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          idempotent: true,
        });
      }
    }

    // 2. Resolve table
    let tableId: string | null = null;
    if (safeTableNumber) {
      const { data: table } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("number", safeTableNumber)
        .eq("active", true)
        .single();
      tableId = table?.id || null;
    }

    // 3. Fetch menu items
    const menuItemIds = [...new Set((items as OrderItemInput[]).map((i) => i.menu_item_id))];

    const { data: dbMenuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, name_es, name_en, name_fr, name_de, name_it, price, available, active, available_takeaway, available_delivery, kds_station, tenant_id")
      .in("id", menuItemIds)
      .eq("tenant_id", tenantId);

    if (menuErr) {
      console.error("Menu fetch error:", menuErr.message);
      return NextResponse.json({ error: "Failed to validate menu items" }, { status: 500 });
    }

    const menuMap = new Map<string, (typeof dbMenuItems)[number]>();
    for (const mi of dbMenuItems || []) menuMap.set(mi.id, mi);

    for (const item of items as OrderItemInput[]) {
      const dbItem = menuMap.get(item.menu_item_id);
      if (!dbItem) {
        return NextResponse.json({ error: `Menu item not found: ${item.menu_item_id}` }, { status: 400 });
      }
      if (!dbItem.active || !dbItem.available) {
        return NextResponse.json({ error: `Item not available: ${item.menu_item_id}` }, { status: 400 });
      }
    }

    // 4. Fetch modifiers and links
    const allModifierIds = new Set<string>();
    for (const item of items as OrderItemInput[]) {
      if (item.modifier_ids) {
        for (const mid of item.modifier_ids) allModifierIds.add(mid);
      }
    }

    const modifierMap = new Map<string, {
      id: string; group_id: string; name_es: string; name_en: string;
      price_delta: number; active: boolean;
    }>();

    if (allModifierIds.size > 0) {
      const { data: dbModifiers, error: modErr } = await supabase
        .from("modifiers")
        .select("id, group_id, name_es, name_en, price_delta, active, tenant_id")
        .in("id", [...allModifierIds])
        .eq("tenant_id", tenantId);

      if (modErr) {
        console.error("Modifiers fetch error:", modErr.message);
        return NextResponse.json({ error: "Failed to validate modifiers" }, { status: 500 });
      }

      for (const mod of dbModifiers || []) modifierMap.set(mod.id, mod);
    }

    const { data: itemModLinks } = await supabase
      .from("menu_item_modifier_groups")
      .select("item_id, group_id")
      .in("item_id", menuItemIds);

    const validLinks = new Set<string>();
    for (const link of itemModLinks || []) {
      validLinks.add(`${link.item_id}:${link.group_id}`);
    }

    // 5. Build validated items — DEFENSIVE: skip invalid modifiers instead of rejecting
    const nameKey = `name_${tenantLang}` as "name_es" | "name_en" | "name_fr" | "name_de" | "name_it";

    const validatedItems: ValidatedItem[] = [];

    for (const item of items as OrderItemInput[]) {
      const dbItem = menuMap.get(item.menu_item_id)!;
      const unitPrice = Number(dbItem.price);

      const resolvedModifiers: { name: string; price_delta: number }[] = [];
      let modifiersTotal = 0;

      if (item.modifier_ids && item.modifier_ids.length > 0) {
        for (const mid of item.modifier_ids) {
          const dbMod = modifierMap.get(mid);

          // DEFENSIVE: skip modifiers not found, inactive, or with broken links
          // instead of rejecting the entire order
          if (!dbMod) {
            console.warn(`Modifier not found: ${mid} — skipping`);
            continue;
          }
          if (!dbMod.active) {
            console.warn(`Modifier inactive: ${mid} — skipping`);
            continue;
          }
          if (!validLinks.has(`${item.menu_item_id}:${dbMod.group_id}`)) {
            console.warn(`Modifier ${mid} has no link to item ${item.menu_item_id} — skipping`);
            continue;
          }

          const modPrice = Number(dbMod.price_delta);
          const modName = (dbMod as Record<string, unknown>)[nameKey] as string || dbMod.name_es || dbMod.name_en;
          resolvedModifiers.push({ name: modName, price_delta: modPrice });
          modifiersTotal += modPrice;
        }
      }

      const safeNotes = sanitize(item.notes, 300);
      const itemSubtotal = round2((unitPrice + modifiersTotal) * item.quantity);
      const itemName = (dbItem as Record<string, unknown>)[nameKey] as string || dbItem.name_es || dbItem.name_en;

      validatedItems.push({
        menu_item_id: item.menu_item_id,
        name: itemName,
        quantity: item.quantity,
        unit_price: unitPrice,
        modifiers: resolvedModifiers,
        modifiers_total: round2(modifiersTotal),
        subtotal: itemSubtotal,
        notes: safeNotes || null,
        kds_station: dbItem.kds_station || null,
      });
    }

    // 6. Calculate totals
    const subtotal = round2(validatedItems.reduce((sum, i) => sum + i.subtotal, 0));
    const taxAmount = tenant.tax_included
      ? 0
      : round2(subtotal * (tenant.tax_rate / 100));
    const total = round2(subtotal + taxAmount);

    // 7. Create order
    const source = safeOrderType === "delivery" ? "delivery" : safeOrderType === "takeaway" ? "takeaway" : "qr";

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        table_id: tableId,
        order_type: safeOrderType,
        status: "confirmed",
        customer_name: safeName || null,
        customer_phone: safePhone || null,
        customer_notes: safeCustomerNotes || null,
        subtotal,
        tax_amount: taxAmount,
        total,
        source,
        idempotency_key: safeIdempotencyKey || null,
        metadata: {
          customer_lang: safeLang,
          ...(safeDeliveryAddress ? { delivery_address: safeDeliveryAddress } : {}),
        },
        confirmed_at: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      console.error("Order create error:", orderErr?.message);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 8. Create order items
    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      tenant_id: tenantId,
      menu_item_id: item.menu_item_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      modifiers: item.modifiers,
      modifiers_total: item.modifiers_total,
      subtotal: item.subtotal,
      notes: item.notes,
      kds_station: item.kds_station,
      kds_status: "pending",
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) {
      console.error("Order items error:", itemsErr.message);
    }

    // 9. Update table status
    if (tableId) {
      await supabase
        .from("restaurant_tables")
        .update({ status: "occupied", current_order_id: order.id })
        .eq("id", tableId);
    }

    // Airtable: registrar orden pública (QR/WhatsApp/takeaway/delivery, multi-tenant)
    getTenantName(tenantId).then(tenantName => {
      sendToAirtableAsync('orders', {
        'Order Number': order.order_number,
        'Status': 'confirmed',
        'Source': source,
        'Order Type': safeOrderType,
        'Total': total,
        'Items Count': validatedItems.length,
        'Customer Name': safeName || '',
        'Customer Phone': safePhone || '',
        'Order ID': order.id,
        'Tenant Name': tenantName,
        'Timestamp': new Date().toISOString(),
      })
      for (const item of validatedItems) {
        sendToAirtableAsync('order_items', {
          'Order ID': order.id,
          'Order Number': order.order_number,
          'Item Name': item.name,
          'Menu Item ID': item.menu_item_id,
          'Quantity': item.quantity,
          'Unit Price': item.unit_price,
          'Modifiers': JSON.stringify(item.modifiers),
          'Modifiers Total': item.modifiers_total,
          'Subtotal': item.subtotal,
          'Notes': item.notes || '',
          'KDS Station': item.kds_station || '',
          'KDS Status': 'pending',
          'Voided': false,
          'Tenant Name': tenantName,
          'Timestamp': new Date().toISOString(),
        })
      }
    })

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err: unknown) {
    console.error("Public order error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — check order status
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");

  if (!orderId || !UUID_RE.test(orderId)) {
    return NextResponse.json({ error: "Invalid or missing orderId" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, confirmed_at, preparing_at, ready_at, served_at")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, name, kds_status")
    .eq("order_id", orderId)
    .eq("voided", false);

  return NextResponse.json({ order, items: items || [] });
}
