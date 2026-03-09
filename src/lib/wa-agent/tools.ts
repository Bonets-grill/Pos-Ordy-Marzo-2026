import { SupabaseClient } from "@supabase/supabase-js";
import type { WASession, CartItem } from "./types";
import { loadRestaurantContext, type RestaurantContext } from "./context";

/**
 * Tool definitions for the Claude agent.
 * Each tool is a function that receives supabase client, session, and params.
 * Returns a string result that goes back to Claude as tool output.
 */

export interface ToolResult {
  result: string;
  sessionUpdates?: Partial<Pick<WASession, "state" | "cart" | "pending_order_id" | "customer_name" | "context">>;
}

// Format currency helper
function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

/**
 * GET_MENU: Returns full available menu grouped by category.
 * Always queries DB fresh.
 */
export async function getMenu(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string
): Promise<ToolResult> {
  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  if (ctx.menuItems.length === 0) {
    return { result: "No hay productos disponibles en este momento." };
  }

  // Group by category
  const grouped: Record<string, typeof ctx.menuItems> = {};
  for (const item of ctx.menuItems) {
    if (!grouped[item.category_name]) grouped[item.category_name] = [];
    grouped[item.category_name].push(item);
  }

  let menu = "";
  for (const [cat, items] of Object.entries(grouped)) {
    menu += `\n📋 *${cat}*\n`;
    for (const item of items) {
      menu += `  • ${item.name} — ${fmt(item.price, ctx.tenant.currency)}`;
      if (item.description) menu += `\n    _${item.description}_`;
      if (item.allergens.length > 0) menu += `\n    ⚠️ Alérgenos: ${item.allergens.join(", ")}`;
      menu += "\n";
    }
  }

  return {
    result: `Menú disponible (${ctx.menuItems.length} productos):\n${menu}`,
    sessionUpdates: { state: "browsing_menu" },
  };
}

/**
 * GET_ITEM_DETAILS: Full details for a specific item including modifiers.
 */
export async function getItemDetails(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string,
  itemName: string
): Promise<ToolResult> {
  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  // Fuzzy match by name (case insensitive, partial match)
  const normalized = itemName.toLowerCase().trim();
  const item = ctx.menuItems.find(
    (i) => i.name.toLowerCase().includes(normalized) || normalized.includes(i.name.toLowerCase())
  );

  if (!item) {
    return { result: `No encontré "${itemName}" en el menú. ¿Quieres ver el menú completo?` };
  }

  let details = `*${item.name}* — ${fmt(item.price, ctx.tenant.currency)}\n`;
  if (item.description) details += `${item.description}\n`;
  if (item.allergens.length > 0) details += `⚠️ Alérgenos: ${item.allergens.join(", ")}\n`;
  if (item.prep_time_minutes) details += `⏱️ Tiempo: ~${item.prep_time_minutes} min\n`;

  if (item.modifierGroups.length > 0) {
    details += "\n*Opciones:*\n";
    for (const group of item.modifierGroups) {
      const req = group.required ? " (obligatorio)" : " (opcional)";
      details += `  ${group.name}${req}:\n`;
      for (const mod of group.modifiers) {
        const price = mod.price_delta > 0 ? ` (+${fmt(mod.price_delta, ctx.tenant.currency)})` : mod.price_delta < 0 ? ` (${fmt(mod.price_delta, ctx.tenant.currency)})` : "";
        details += `    - ${mod.name}${price}\n`;
      }
    }
  }

  return { result: details };
}

/**
 * ADD_TO_CART: Add item to session cart. Validates against live DB.
 */
export async function addToCart(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string,
  session: WASession,
  params: { itemName: string; quantity: number; modifierNames?: string[]; notes?: string }
): Promise<ToolResult> {
  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  // Find item
  const normalized = params.itemName.toLowerCase().trim();
  const item = ctx.menuItems.find(
    (i) => i.name.toLowerCase().includes(normalized) || normalized.includes(i.name.toLowerCase())
  );

  if (!item) {
    return { result: `No encontré "${params.itemName}". ¿Quieres ver el menú?` };
  }

  if (!item.available) {
    return { result: `Lo siento, "${item.name}" no está disponible ahora mismo.` };
  }

  // Validate quantity
  const qty = Math.min(Math.max(1, Math.round(params.quantity || 1)), 20);

  // Resolve modifiers
  const resolvedModifiers: CartItem["modifiers"] = [];
  if (params.modifierNames && params.modifierNames.length > 0) {
    for (const modName of params.modifierNames) {
      const normalizedMod = modName.toLowerCase().trim();
      for (const group of item.modifierGroups) {
        const found = group.modifiers.find((m) => m.name.toLowerCase().includes(normalizedMod));
        if (found) {
          resolvedModifiers.push({ id: found.id, name: found.name, price_delta: found.price_delta });
          break;
        }
      }
    }
  }

  const cartItem: CartItem = {
    menu_item_id: item.id,
    name: item.name,
    qty,
    unit_price: item.price,
    modifiers: resolvedModifiers,
    notes: params.notes,
  };

  const newCart = [...(session.cart || []), cartItem];
  const modTotal = resolvedModifiers.reduce((s, m) => s + m.price_delta, 0);
  const itemTotal = (item.price + modTotal) * qty;

  let response = `✅ Añadido: ${qty}x ${item.name}`;
  if (resolvedModifiers.length > 0) {
    response += ` (${resolvedModifiers.map(m => m.name).join(", ")})`;
  }
  response += ` — ${fmt(itemTotal, ctx.tenant.currency)}`;

  // Show cart summary
  const cartTotal = newCart.reduce((s, c) => s + (c.unit_price + c.modifiers.reduce((ms, m) => ms + m.price_delta, 0)) * c.qty, 0);
  response += `\n\n🛒 Carrito: ${newCart.length} item(s) — Total: ${fmt(cartTotal, ctx.tenant.currency)}`;
  response += `\n\n¿Algo más o confirmo el pedido?`;

  return {
    result: response,
    sessionUpdates: { state: "ordering", cart: newCart },
  };
}

/**
 * VIEW_CART: Show current cart contents.
 */
export async function viewCart(
  session: WASession,
  currency: string
): Promise<ToolResult> {
  if (!session.cart || session.cart.length === 0) {
    return { result: "Tu carrito está vacío. ¿Quieres ver el menú?" };
  }

  let response = "🛒 *Tu pedido actual:*\n";
  let total = 0;
  for (const item of session.cart) {
    const modTotal = item.modifiers.reduce((s, m) => s + m.price_delta, 0);
    const lineTotal = (item.unit_price + modTotal) * item.qty;
    total += lineTotal;
    response += `  ${item.qty}x ${item.name}`;
    if (item.modifiers.length > 0) response += ` (${item.modifiers.map(m => m.name).join(", ")})`;
    response += ` — ${fmt(lineTotal, currency)}\n`;
    if (item.notes) response += `    📝 ${item.notes}\n`;
  }
  response += `\n*Total: ${fmt(total, currency)}*`;
  response += `\n\n¿Confirmo el pedido, añado algo más, o quieres quitar algo?`;

  return { result: response };
}

/**
 * REMOVE_FROM_CART: Remove item by name or index.
 */
export async function removeFromCart(
  session: WASession,
  itemName: string,
  currency: string
): Promise<ToolResult> {
  if (!session.cart || session.cart.length === 0) {
    return { result: "Tu carrito ya está vacío." };
  }

  const normalized = itemName.toLowerCase().trim();
  const idx = session.cart.findIndex((c) => c.name.toLowerCase().includes(normalized));
  if (idx === -1) {
    return { result: `No encontré "${itemName}" en tu carrito.` };
  }

  const removed = session.cart[idx];
  const newCart = session.cart.filter((_, i) => i !== idx);
  const total = newCart.reduce((s, c) => s + (c.unit_price + c.modifiers.reduce((ms, m) => ms + m.price_delta, 0)) * c.qty, 0);

  return {
    result: `❌ Eliminado: ${removed.qty}x ${removed.name}\n🛒 Carrito: ${newCart.length} item(s) — Total: ${fmt(total, currency)}`,
    sessionUpdates: { cart: newCart, state: newCart.length > 0 ? "ordering" : "idle" },
  };
}

/**
 * CONFIRM_ORDER: Create order in DB from cart. Uses same validated flow as QR API.
 */
export async function confirmOrder(
  supabase: SupabaseClient,
  session: WASession,
  tenantId: string,
  lang: string,
  tableNumber?: string
): Promise<ToolResult> {
  if (!session.cart || session.cart.length === 0) {
    return { result: "No tienes nada en el carrito. ¿Quieres ver el menú?" };
  }

  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  // Re-validate all items against CURRENT DB state
  for (const cartItem of session.cart) {
    const dbItem = ctx.menuItems.find((m) => m.id === cartItem.menu_item_id);
    if (!dbItem) {
      return {
        result: `⚠️ "${cartItem.name}" ya no está disponible. Lo he quitado del carrito.`,
        sessionUpdates: { cart: session.cart.filter((c) => c.menu_item_id !== cartItem.menu_item_id) },
      };
    }
    // Update price from DB (in case it changed)
    cartItem.unit_price = dbItem.price;
  }

  // Calculate totals from DB prices
  const subtotal = session.cart.reduce((s, c) => {
    const modTotal = c.modifiers.reduce((ms, m) => ms + m.price_delta, 0);
    return s + (c.unit_price + modTotal) * c.qty;
  }, 0);

  const taxAmount = ctx.tenant.tax_included ? 0 : Math.round(subtotal * (ctx.tenant.tax_rate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Resolve table if provided
  let tableId: string | null = null;
  if (tableNumber) {
    const table = ctx.activeTables.find((t) => t.number === tableNumber);
    tableId = table?.id || null;
  }

  // Create order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenantId,
      table_id: tableId,
      order_type: "whatsapp",
      status: "confirmed",
      customer_name: session.customer_name || null,
      customer_phone: session.phone,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: taxAmount,
      total,
      source: "whatsapp",
      metadata: { wa_session_id: session.id, customer_lang: lang },
      confirmed_at: new Date().toISOString(),
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return { result: "❌ Error al crear el pedido. Intenta de nuevo en un momento." };
  }

  // Create order items
  const orderItems = session.cart.map((c) => ({
    order_id: order.id,
    tenant_id: tenantId,
    menu_item_id: c.menu_item_id,
    name: c.name,
    quantity: c.qty,
    unit_price: c.unit_price,
    modifiers: c.modifiers.map((m) => ({ name: m.name, price_delta: m.price_delta })),
    modifiers_total: c.modifiers.reduce((s, m) => s + m.price_delta, 0),
    subtotal: Math.round((c.unit_price + c.modifiers.reduce((s, m) => s + m.price_delta, 0)) * c.qty * 100) / 100,
    notes: c.notes || null,
    kds_status: "pending",
  }));

  await supabase.from("order_items").insert(orderItems);

  // Update table if applicable
  if (tableId) {
    await supabase.from("restaurant_tables")
      .update({ status: "occupied", current_order_id: order.id })
      .eq("id", tableId);
  }

  return {
    result: `✅ *Pedido #${order.order_number} confirmado!*\n\n` +
      `Total: ${fmt(total, ctx.tenant.currency)}\n` +
      `Puedes preguntarme "¿cómo va mi pedido?" para ver el estado.`,
    sessionUpdates: {
      state: "idle",
      cart: [],
      pending_order_id: order.id,
    },
  };
}

/**
 * CHECK_ORDER_STATUS: Check status of current or specific order.
 */
export async function checkOrderStatus(
  supabase: SupabaseClient,
  session: WASession,
  tenantId: string
): Promise<ToolResult> {
  const orderId = session.pending_order_id;
  if (!orderId) {
    return { result: "No tienes un pedido activo. ¿Quieres hacer uno?" };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, confirmed_at, preparing_at, ready_at")
    .eq("id", orderId)
    .single();

  if (!order) {
    return { result: "No encontré tu pedido. Es posible que ya se haya completado." };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("name, quantity, kds_status")
    .eq("order_id", orderId)
    .eq("voided", false);

  const statusEmoji: Record<string, string> = {
    confirmed: "📝 Confirmado",
    preparing: "👨‍🍳 Preparando",
    ready: "✅ Listo",
    served: "🍽️ Servido",
    completed: "✅ Completado",
    cancelled: "❌ Cancelado",
  };

  let response = `*Pedido #${order.order_number}*\n`;
  response += `Estado: ${statusEmoji[order.status] || order.status}\n\n`;

  if (items && items.length > 0) {
    for (const item of items as { name: string; quantity: number; kds_status: string }[]) {
      const itemEmoji = item.kds_status === "done" ? "✅" : item.kds_status === "preparing" ? "🔥" : "⏳";
      response += `  ${itemEmoji} ${item.quantity}x ${item.name}\n`;
    }
  }

  return { result: response };
}

/**
 * CHECK_BUSINESS_HOURS: Return current hours and open/closed status.
 */
export async function checkBusinessHours(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string
): Promise<ToolResult> {
  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  const status = ctx.isOpen ? "🟢 *Abierto ahora*" : "🔴 *Cerrado ahora*";
  let response = `${status}\n\n`;

  if (ctx.tenant.business_hours) {
    const dayNames: Record<string, string> = {
      mon: "Lunes", tue: "Martes", wed: "Miércoles", thu: "Jueves",
      fri: "Viernes", sat: "Sábado", sun: "Domingo",
    };
    for (const [key, label] of Object.entries(dayNames)) {
      const day = ctx.tenant.business_hours[key] as { closed?: boolean; open?: string; close?: string; shifts?: { open: string; close: string }[] } | undefined;
      if (!day || day.closed) {
        response += `  ${label}: Cerrado\n`;
      } else if (day.shifts) {
        const times = day.shifts.map((s) => `${s.open}-${s.close}`).join(", ");
        response += `  ${label}: ${times}\n`;
      } else {
        response += `  ${label}: ${day.open}-${day.close}\n`;
      }
    }
  } else {
    response += "No tenemos horarios configurados — consulta directamente.";
  }

  return { result: response };
}

/**
 * CHECK_ALLERGENS: Check allergens for a specific item.
 */
export async function checkAllergens(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string,
  itemName: string
): Promise<ToolResult> {
  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  const normalized = itemName.toLowerCase().trim();
  const item = ctx.menuItems.find(
    (i) => i.name.toLowerCase().includes(normalized) || normalized.includes(i.name.toLowerCase())
  );

  if (!item) {
    return { result: `No encontré "${itemName}" en el menú.` };
  }

  if (item.allergens.length === 0) {
    return { result: `*${item.name}*: No tiene alérgenos registrados. Consulta con el restaurante para estar seguro.` };
  }

  return { result: `*${item.name}*\n⚠️ Alérgenos: ${item.allergens.join(", ")}` };
}

// Tool definitions for Claude's tool_use format
export const TOOL_DEFINITIONS = [
  {
    name: "get_menu",
    description: "Get the full available menu with prices, grouped by category. Always use this to show the menu — never make up items or prices.",
    input_schema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
  {
    name: "get_item_details",
    description: "Get detailed info about a specific menu item including modifiers, allergens, and prep time.",
    input_schema: {
      type: "object" as const,
      properties: { item_name: { type: "string", description: "Name or partial name of the menu item" } },
      required: ["item_name"],
    },
  },
  {
    name: "add_to_cart",
    description: "Add a menu item to the customer's cart. Always confirm the item exists in the menu first.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_name: { type: "string", description: "Name of the menu item to add" },
        quantity: { type: "number", description: "How many to add (default 1)" },
        modifier_names: { type: "array", items: { type: "string" }, description: "List of modifier/option names to apply" },
        notes: { type: "string", description: "Special instructions for this item" },
      },
      required: ["item_name"],
    },
  },
  {
    name: "view_cart",
    description: "Show the customer their current cart with items and total.",
    input_schema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
  {
    name: "remove_from_cart",
    description: "Remove an item from the cart by name.",
    input_schema: {
      type: "object" as const,
      properties: { item_name: { type: "string", description: "Name of the item to remove" } },
      required: ["item_name"],
    },
  },
  {
    name: "confirm_order",
    description: "Confirm and place the order. Only use when the customer explicitly confirms they want to order.",
    input_schema: {
      type: "object" as const,
      properties: { table_number: { type: "string", description: "Table number if dining in" } },
      required: [] as string[],
    },
  },
  {
    name: "check_order_status",
    description: "Check the preparation status of the customer's current order.",
    input_schema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
  {
    name: "check_business_hours",
    description: "Show the restaurant's business hours and whether it's currently open.",
    input_schema: { type: "object" as const, properties: {}, required: [] as string[] },
  },
  {
    name: "check_allergens",
    description: "Check allergen information for a specific menu item.",
    input_schema: {
      type: "object" as const,
      properties: { item_name: { type: "string", description: "Name of the item to check" } },
      required: ["item_name"],
    },
  },
];
