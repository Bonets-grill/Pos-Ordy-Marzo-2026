/**
 * Builds restaurant context as text inputs for Dify.
 * Generates comprehensive menu + business info.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export async function buildDifyInputs(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Record<string, string>> {
  // 1. Tenant info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, currency, tax_rate, tax_included, settings, business_hours")
    .eq("id", tenantId)
    .single();

  if (!tenant) return { business_name: "Restaurante", menu: "No disponible", language: "español", business_hours: "No configurado", business_address: "No configurada" };

  // 2. Categories
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name_es, sort_order")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");

  // 3. Menu items
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name_es, description_es, price, category_id, available, allergens")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");

  // 4. Modifier groups + modifiers
  const { data: modGroups } = await supabase
    .from("modifier_groups")
    .select("id, name_es, min_select, max_select, required")
    .eq("tenant_id", tenantId);

  const { data: modifiers } = await supabase
    .from("modifiers")
    .select("id, name_es, price_delta, group_id, active")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const { data: itemModLinks } = await supabase
    .from("menu_item_modifier_groups")
    .select("item_id, group_id");

  // Build lookup maps
  const modGroupMap = new Map((modGroups || []).map(g => [g.id, g]));
  const modsByGroup = new Map<string, typeof modifiers>();
  for (const m of modifiers || []) {
    const list = modsByGroup.get(m.group_id) || [];
    list.push(m);
    modsByGroup.set(m.group_id, list);
  }
  const linksByItem = new Map<string, string[]>();
  for (const link of itemModLinks || []) {
    const list = linksByItem.get(link.item_id) || [];
    list.push(link.group_id);
    linksByItem.set(link.item_id, list);
  }

  // Group items by category
  const itemsByCat = new Map<string, typeof items>();
  for (const item of items || []) {
    if (!item.available) continue;
    const list = itemsByCat.get(item.category_id) || [];
    list.push(item);
    itemsByCat.set(item.category_id, list);
  }

  // Build menu text
  const currency = tenant.currency === "EUR" ? "€" : tenant.currency === "USD" ? "$" : tenant.currency;
  let menuText = `MENÚ COMPLETO DE ${(tenant.name || "").toUpperCase()}\nMoneda: ${currency} | Impuestos: ${tenant.tax_included ? "incluidos" : tenant.tax_rate + "% adicional"}\n`;

  for (const cat of categories || []) {
    const catItems = itemsByCat.get(cat.id) || [];
    if (catItems.length === 0) continue;

    menuText += `\n📂 ${cat.name_es}\n`;
    for (const item of catItems) {
      menuText += `  • ${item.name_es} — ${item.price.toFixed(2)}${currency}`;
      if (item.description_es) menuText += ` (${item.description_es})`;
      if (item.allergens?.length) menuText += ` [Alérgenos: ${item.allergens.join(", ")}]`;
      menuText += "\n";

      // Modifiers
      const groupIds = linksByItem.get(item.id) || [];
      for (const gid of groupIds) {
        const group = modGroupMap.get(gid);
        const mods = modsByGroup.get(gid) || [];
        if (group && mods.length > 0) {
          const req = group.required ? "(obligatorio)" : "(opcional)";
          menuText += `    ↳ ${group.name_es} ${req}: `;
          menuText += mods.map(m => `${m.name_es}${m.price_delta > 0 ? ` +${m.price_delta.toFixed(2)}${currency}` : ""}`).join(", ");
          menuText += "\n";
        }
      }
    }
  }

  // Business hours
  let hoursText = "No configurado";
  if (tenant.business_hours) {
    const bh = tenant.business_hours as Record<string, { open?: string; close?: string; open2?: string; close2?: string; split?: boolean; closed?: boolean }>;
    const dayNames: Record<string, string> = {
      monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
      thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo"
    };
    hoursText = Object.entries(bh)
      .map(([day, h]) => {
        if (h.closed) return `${dayNames[day] || day}: CERRADO`;
        const t1 = h.open && h.close ? `${h.open}-${h.close}` : null;
        const t2 = h.split && h.open2 && h.close2 ? `${h.open2}-${h.close2}` : null;
        return `${dayNames[day] || day}: ${[t1, t2].filter(Boolean).join(" y ")}`;
      })
      .join(" | ");
  }

  // Order modes from settings
  const settings = (tenant.settings || {}) as Record<string, unknown>;
  const orderModes = (settings.order_modes || {}) as Record<string, boolean>;
  const allowedModes: string[] = [];
  if (orderModes.takeaway) allowedModes.push("Para recoger (takeaway)");
  if (orderModes.dine_in) allowedModes.push("En mesa (dine_in)");
  if (orderModes.delivery) allowedModes.push("Delivery");
  const orderModesText = allowedModes.length > 0
    ? `MODOS DE PEDIDO DISPONIBLES: ${allowedModes.join(", ")}. SOLO ofrece estos modos. Si solo hay uno, NO preguntes — usa ese directamente.`
    : "SOLO pedidos para recoger (takeaway).";

  // Business address from settings
  const businessAddress = (settings.address as string) || "Icod de los Vinos, Tenerife";

  return {
    business_name: tenant.name || "Restaurante",
    business_address: businessAddress,
    business_hours: hoursText,
    menu: menuText,
    language: "español",
    order_modes: orderModesText,
  };
}
