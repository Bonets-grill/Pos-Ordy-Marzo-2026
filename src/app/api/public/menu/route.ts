import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    const tableNumber = req.nextUrl.searchParams.get("table");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Get tenant
    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, name, slug, logo_url, currency, locale, tax_rate, tax_included, settings")
      .eq("slug", slug)
      .eq("active", true)
      .single();

    if (tErr || !tenant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const tenantId = tenant.id;

    // 2. Get table (if provided)
    let table = null;
    if (tableNumber) {
      const { data: t } = await supabase
        .from("restaurant_tables")
        .select("id, number, label, capacity")
        .eq("tenant_id", tenantId)
        .eq("number", tableNumber)
        .eq("active", true)
        .single();
      table = t;
    }

    // 3. Get categories
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, name_es, name_en, name_fr, name_de, name_it, icon, color, sort_order")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    // 4. Get menu items
    const { data: items } = await supabase
      .from("menu_items")
      .select("id, category_id, name_es, name_en, name_fr, name_de, name_it, description_es, description_en, description_fr, description_de, description_it, price, image_url, available, allergens, prep_time_minutes, sort_order")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .eq("available", true)
      .order("sort_order", { ascending: true })
      .order("name_es", { ascending: true });

    // 5. Get modifier groups linked to these items
    const itemIds = (items || []).map((i: { id: string }) => i.id);
    let modifierGroups: Record<string, unknown>[] = [];
    let modifiers: Record<string, unknown>[] = [];
    let itemModLinks: { item_id: string; group_id: string }[] = [];

    if (itemIds.length > 0) {
      const { data: links } = await supabase
        .from("menu_item_modifier_groups")
        .select("item_id, group_id")
        .in("item_id", itemIds);
      itemModLinks = (links || []) as { item_id: string; group_id: string }[];

      const groupIds = [...new Set(itemModLinks.map((l) => l.group_id))];
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from("modifier_groups")
          .select("id, name_es, name_en, name_fr, name_de, name_it, min_select, max_select, required, sort_order")
          .in("id", groupIds)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        modifierGroups = (groups || []) as Record<string, unknown>[];

        const { data: mods } = await supabase
          .from("modifiers")
          .select("id, group_id, name_es, name_en, name_fr, name_de, name_it, price_delta, sort_order")
          .in("group_id", groupIds)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        modifiers = (mods || []) as Record<string, unknown>[];
      }
    }

    // 6. Get tables list (for landing page table selection)
    let tables: { number: string; label: string | null }[] = [];
    if (!tableNumber) {
      const { data: tbls } = await supabase
        .from("restaurant_tables")
        .select("number, label")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("number", { ascending: true });
      tables = (tbls || []) as { number: string; label: string | null }[];
    }

    return NextResponse.json({
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url,
        currency: tenant.currency,
        locale: tenant.locale,
        tax_rate: tenant.tax_rate,
        tax_included: tenant.tax_included,
        business_hours: null,
      },
      table,
      tables,
      categories: categories || [],
      items: items || [],
      modifierGroups,
      modifiers,
      itemModLinks,
    });
  } catch (err: unknown) {
    console.error("Public menu error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
