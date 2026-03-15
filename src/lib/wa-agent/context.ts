import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads fresh restaurant context from DB for every agent turn.
 * NEVER caches — ensures agent always has current menu/availability.
 */

export interface WeatherContext {
  description: string;
  temp_c: number;
  feels_like_c: number;
  condition: "hot" | "warm" | "mild" | "cold" | "rainy" | "stormy";
}

export interface RestaurantContext {
  tenant: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    locale: string;
    tax_rate: number;
    tax_included: boolean;
    business_hours: Record<string, unknown> | null;
  };
  isOpen: boolean;
  weather: WeatherContext | null;
  categories: { id: string; name: string }[];
  menuItems: {
    id: string;
    category_id: string;
    category_name: string;
    name: string;
    description: string;
    price: number;
    available: boolean;
    allergens: string[];
    prep_time_minutes: number | null;
    modifierGroups: {
      id: string;
      name: string;
      required: boolean;
      min_select: number;
      max_select: number;
      modifiers: { id: string; name: string; price_delta: number }[];
    }[];
  }[];
  activeTables: { id: string; number: string; label: string | null; status: string }[];
}

export async function loadRestaurantContext(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string = "es"
): Promise<RestaurantContext> {
  const nameCol = `name_${lang}` as string;
  const descCol = `description_${lang}` as string;

  // Parallel queries for speed (+ weather)
  const [tenantRes, catsRes, itemsRes, tablesRes, weather] = await Promise.all([
    supabase.from("tenants")
      .select("id, name, slug, currency, locale, tax_rate, tax_included, business_hours")
      .eq("id", tenantId).single(),
    supabase.from("menu_categories")
      .select("*")
      .eq("tenant_id", tenantId).eq("active", true)
      .order("sort_order"),
    supabase.from("menu_items")
      .select("*")
      .eq("tenant_id", tenantId).eq("active", true)
      .order("sort_order"),
    supabase.from("restaurant_tables")
      .select("id, number, label, status")
      .eq("tenant_id", tenantId).eq("active", true)
      .order("number"),
    fetchWeather(),
  ]);

  const tenant = tenantRes.data!;
  const categories = (catsRes.data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: (c[nameCol] || c.name_es) as string,
  }));

  // Build category lookup
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  // Fetch modifier groups and modifiers for available items
  const availableItems = (itemsRes.data || []).filter((i: Record<string, unknown>) => i.available);
  const itemIds = availableItems.map((i: Record<string, unknown>) => i.id as string);

  const modGroupsByItem: Record<string, RestaurantContext["menuItems"][0]["modifierGroups"]> = {};

  if (itemIds.length > 0) {
    const [linksRes, groupsRes, modsRes] = await Promise.all([
      supabase.from("menu_item_modifier_groups")
        .select("item_id, group_id").in("item_id", itemIds),
      supabase.from("modifier_groups")
        .select("*")
        .eq("tenant_id", tenantId).eq("active", true)
        .order("sort_order"),
      supabase.from("modifiers")
        .select("*")
        .eq("tenant_id", tenantId).eq("active", true)
        .order("sort_order"),
    ]);

    const links = (linksRes.data || []) as { item_id: string; group_id: string }[];
    const groups = (groupsRes.data || []) as Record<string, unknown>[];
    const mods = (modsRes.data || []) as Record<string, unknown>[];

    // Build group lookup with modifiers
    const groupMap = new Map<string, RestaurantContext["menuItems"][0]["modifierGroups"][0]>();
    for (const g of groups) {
      groupMap.set(g.id as string, {
        id: g.id as string,
        name: (g[nameCol] || g.name_es) as string,
        required: g.required as boolean,
        min_select: g.min_select as number,
        max_select: g.max_select as number,
        modifiers: [],
      });
    }
    for (const m of mods) {
      const group = groupMap.get(m.group_id as string);
      if (group) {
        group.modifiers.push({
          id: m.id as string,
          name: (m[nameCol] || m.name_es) as string,
          price_delta: m.price_delta as number,
        });
      }
    }

    // Map groups to items
    for (const link of links) {
      if (!modGroupsByItem[link.item_id]) modGroupsByItem[link.item_id] = [];
      const group = groupMap.get(link.group_id);
      if (group) modGroupsByItem[link.item_id].push(group);
    }
  }

  const menuItems = availableItems.map((i: Record<string, unknown>) => ({
    id: i.id as string,
    category_id: i.category_id as string,
    category_name: catMap.get(i.category_id as string) || "Otros",
    name: (i[nameCol] || i.name_es) as string,
    description: (i[descCol] || i.description_es || "") as string,
    price: i.price as number,
    available: i.available as boolean,
    allergens: (i.allergens || []) as string[],
    prep_time_minutes: i.prep_time_minutes as number | null,
    modifierGroups: modGroupsByItem[i.id as string] || [],
  }));

  // Check if restaurant is currently open
  const isOpen = checkIsOpen(tenant.business_hours);

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      currency: tenant.currency || "EUR",
      locale: tenant.locale || "es",
      tax_rate: tenant.tax_rate || 0,
      tax_included: tenant.tax_included ?? true,
      business_hours: tenant.business_hours,
    },
    isOpen,
    weather,
    categories,
    menuItems,
    activeTables: (tablesRes.data || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      number: t.number as string,
      label: t.label as string | null,
      status: t.status as string,
    })),
  };
}

/**
 * Fetch current weather from OpenWeather API.
 * Returns null silently on failure (weather is optional context).
 */
let _weatherCache: { data: WeatherContext; ts: number } | null = null;
const WEATHER_CACHE_MS = 30 * 60 * 1000; // 30 min

async function fetchWeather(): Promise<WeatherContext | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.RESTAURANT_LAT;
  const lon = process.env.RESTAURANT_LON;
  if (!apiKey || !lat || !lon) return null;

  // Simple in-memory cache (30 min)
  if (_weatherCache && Date.now() - _weatherCache.ts < WEATHER_CACHE_MS) {
    return _weatherCache.data;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const temp = data.main?.temp ?? 20;
    const weatherId = data.weather?.[0]?.id ?? 800;
    const desc = data.weather?.[0]?.description ?? "";

    let condition: WeatherContext["condition"] = "mild";
    if (weatherId >= 200 && weatherId < 300) condition = "stormy";
    else if (weatherId >= 300 && weatherId < 600) condition = "rainy";
    else if (weatherId >= 600 && weatherId < 700) condition = "cold";
    else if (temp >= 30) condition = "hot";
    else if (temp >= 22) condition = "warm";
    else if (temp < 12) condition = "cold";

    const weather: WeatherContext = {
      description: desc,
      temp_c: Math.round(temp),
      feels_like_c: Math.round(data.main?.feels_like ?? temp),
      condition,
    };
    _weatherCache = { data: weather, ts: Date.now() };
    return weather;
  } catch {
    return null;
  }
}

function checkIsOpen(businessHours: Record<string, unknown> | null): boolean {
  if (!businessHours) return true;
  const now = new Date();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = days[now.getDay()];
  const dayData = businessHours[dayKey] as { closed?: boolean; open?: string; close?: string; shifts?: { open: string; close: string }[] } | undefined;
  if (!dayData || dayData.closed) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const shifts = dayData.shifts || [{ open: dayData.open!, close: dayData.close! }];
  return shifts.some((s) => {
    const openMin = parseInt(s.open.split(":")[0]) * 60 + parseInt(s.open.split(":")[1]);
    let closeMin = parseInt(s.close.split(":")[0]) * 60 + parseInt(s.close.split(":")[1]);
    if (closeMin <= openMin) closeMin += 24 * 60;
    return nowMin >= openMin && nowMin <= closeMin;
  });
}
