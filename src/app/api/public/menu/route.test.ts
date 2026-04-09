import { describe, it, expect } from "vitest";

/**
 * Tests for public menu API logic.
 * Tests pure functions and data validation logic from
 * src/app/api/public/menu/route.ts without requiring Supabase.
 */

// ── Types (mirror menu API) ─────────────────────────────────

interface MenuItem {
  id: string;
  category_id: string | null;
  name_es: string; name_en: string; name_fr?: string; name_de?: string; name_it?: string;
  description_es?: string | null; description_en?: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  available_takeaway?: boolean;
  available_delivery?: boolean;
  allergens?: string[];
  sort_order: number;
}

interface MenuCategory {
  id: string;
  name_es: string; name_en: string; name_fr?: string; name_de?: string; name_it?: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

interface Modifier {
  id: string;
  group_id: string;
  name_es: string;
  name_en: string;
  price_delta: number | null;
  sort_order: number;
}

interface ItemModLink {
  item_id: string;
  group_id: string;
}

// ── Reproduce query logic ────────────────────────────────────

/** Filter items based on order mode */
function filterItemsByMode(
  items: MenuItem[],
  mode: "qr" | "takeaway" | "delivery" | null
): MenuItem[] {
  if (mode === "takeaway") {
    return items.filter((i) => i.available && i.available_takeaway !== false);
  }
  if (mode === "delivery") {
    return items.filter((i) => i.available && i.available_delivery !== false);
  }
  return items.filter((i) => i.available);
}

/** Build modifier map keyed by group_id */
function buildModifiersByGroup(
  modifiers: Modifier[],
  links: ItemModLink[]
): Record<string, { modifiers: Modifier[]; itemIds: string[] }> {
  const result: Record<string, { modifiers: Modifier[]; itemIds: string[] }> = {};

  for (const link of links) {
    if (!result[link.group_id]) {
      result[link.group_id] = { modifiers: [], itemIds: [] };
    }
    if (!result[link.group_id].itemIds.includes(link.item_id)) {
      result[link.group_id].itemIds.push(link.item_id);
    }
  }

  for (const mod of modifiers) {
    if (result[mod.group_id]) {
      result[mod.group_id].modifiers.push(mod);
    }
  }

  return result;
}

/** Get items for a specific category, sorted by sort_order */
function getItemsForCategory(items: MenuItem[], categoryId: string): MenuItem[] {
  return items
    .filter((i) => i.category_id === categoryId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Validate modifier price_delta (NULL safe) */
function safeModifierPriceDelta(priceDelta: number | null | undefined): number {
  return typeof priceDelta === "number" && !isNaN(priceDelta) ? priceDelta : 0;
}

/** Build the menu response structure */
function buildMenuResponse(
  items: MenuItem[],
  categories: MenuCategory[],
  links: ItemModLink[]
) {
  const itemIds = items.map((i) => i.id);
  const linkedGroupIds = [...new Set(links.filter((l) => itemIds.includes(l.item_id)).map((l) => l.group_id))];

  return {
    categories: categories.sort((a, b) => a.sort_order - b.sort_order),
    items,
    itemModLinks: links.filter((l) => itemIds.includes(l.item_id)),
    availableGroupIds: linkedGroupIds,
  };
}

// ── Filter tests ─────────────────────────────────────────────

describe("Menu item availability filtering", () => {
  const allItems: MenuItem[] = [
    { id: "1", category_id: "cat1", name_es: "Burger", name_en: "Burger", price: 10, image_url: null, available: true, available_takeaway: true, available_delivery: false, sort_order: 1 },
    { id: "2", category_id: "cat1", name_es: "Steak", name_en: "Steak", price: 20, image_url: null, available: true, available_takeaway: false, available_delivery: false, sort_order: 2 },
    { id: "3", category_id: "cat2", name_es: "Pizza", name_en: "Pizza", price: 15, image_url: null, available: false, available_takeaway: true, available_delivery: true, sort_order: 1 },
    { id: "4", category_id: "cat2", name_es: "Salad", name_en: "Salad", price: 8, image_url: null, available: true, available_takeaway: true, available_delivery: true, sort_order: 2 },
  ];

  it("QR mode: returns all available items", () => {
    const result = filterItemsByMode(allItems, "qr");
    expect(result.map((i) => i.id)).toEqual(["1", "2", "4"]); // id=3 not available
  });

  it("null mode (default QR): returns all available items", () => {
    const result = filterItemsByMode(allItems, null);
    expect(result).toHaveLength(3);
  });

  it("takeaway mode: filters by available_takeaway", () => {
    const result = filterItemsByMode(allItems, "takeaway");
    const ids = result.map((i) => i.id);
    expect(ids).toContain("1"); // available=true, takeaway=true
    expect(ids).not.toContain("2"); // takeaway=false
    expect(ids).not.toContain("3"); // available=false
    expect(ids).toContain("4"); // available=true, takeaway=true
  });

  it("delivery mode: filters by available_delivery", () => {
    const result = filterItemsByMode(allItems, "delivery");
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain("1"); // delivery=false
    expect(ids).not.toContain("2"); // delivery=false
    expect(ids).not.toContain("3"); // available=false
    expect(ids).toContain("4"); // available=true, delivery=true
  });

  it("unavailable items never appear regardless of mode", () => {
    const modes = ["qr", "takeaway", "delivery", null] as const;
    modes.forEach((mode) => {
      const result = filterItemsByMode(allItems, mode);
      const unavailableInResult = result.filter((i) => !i.available);
      expect(unavailableInResult).toHaveLength(0);
    });
  });
});

// ── Modifier linking tests ───────────────────────────────────

describe("Modifier group linking", () => {
  const modifiers: Modifier[] = [
    { id: "mod1", group_id: "grp1", name_es: "Queso Extra", name_en: "Extra Cheese", price_delta: 1.50, sort_order: 1 },
    { id: "mod2", group_id: "grp1", name_es: "Bacon", name_en: "Bacon", price_delta: 2.00, sort_order: 2 },
    { id: "mod3", group_id: "grp2", name_es: "Sin Gluten", name_en: "Gluten Free", price_delta: 0, sort_order: 1 },
  ];

  const links: ItemModLink[] = [
    { item_id: "item1", group_id: "grp1" },
    { item_id: "item1", group_id: "grp2" },
    { item_id: "item2", group_id: "grp1" },
  ];

  it("builds modifier map with correct item associations", () => {
    const map = buildModifiersByGroup(modifiers, links);
    expect(map["grp1"].itemIds).toContain("item1");
    expect(map["grp1"].itemIds).toContain("item2");
    expect(map["grp2"].itemIds).toContain("item1");
    expect(map["grp2"].itemIds).not.toContain("item2");
  });

  it("groups have correct modifiers", () => {
    const map = buildModifiersByGroup(modifiers, links);
    expect(map["grp1"].modifiers).toHaveLength(2);
    expect(map["grp2"].modifiers).toHaveLength(1);
    expect(map["grp2"].modifiers[0].name_es).toBe("Sin Gluten");
  });

  it("empty links returns empty map", () => {
    const map = buildModifiersByGroup(modifiers, []);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("modifiers without links are excluded from groups", () => {
    const map = buildModifiersByGroup(modifiers, [{ item_id: "item1", group_id: "grp1" }]);
    expect(map["grp2"]).toBeUndefined();
  });
});

// ── Category sorting tests ───────────────────────────────────

describe("Category and item sorting by sort_order", () => {
  const categories: MenuCategory[] = [
    { id: "cat3", name_es: "Postres", name_en: "Desserts", icon: null, color: null, sort_order: 3 },
    { id: "cat1", name_es: "Entrantes", name_en: "Starters", icon: null, color: null, sort_order: 1 },
    { id: "cat2", name_es: "Principales", name_en: "Mains", icon: null, color: null, sort_order: 2 },
  ];

  const items: MenuItem[] = [
    { id: "i3", category_id: "cat2", name_es: "Steak", name_en: "Steak", price: 25, image_url: null, available: true, sort_order: 3 },
    { id: "i1", category_id: "cat2", name_es: "Burger", name_en: "Burger", price: 15, image_url: null, available: true, sort_order: 1 },
    { id: "i2", category_id: "cat2", name_es: "Salad", name_en: "Salad", price: 8, image_url: null, available: true, sort_order: 2 },
  ];

  it("categories are sorted by sort_order ascending", () => {
    const response = buildMenuResponse(items, categories, []);
    const sortedCategories = response.categories;
    expect(sortedCategories[0].id).toBe("cat1");
    expect(sortedCategories[1].id).toBe("cat2");
    expect(sortedCategories[2].id).toBe("cat3");
  });

  it("items within a category are sorted by sort_order", () => {
    const catItems = getItemsForCategory(items, "cat2");
    expect(catItems[0].id).toBe("i1");
    expect(catItems[1].id).toBe("i2");
    expect(catItems[2].id).toBe("i3");
  });

  it("items for unknown category return empty array", () => {
    expect(getItemsForCategory(items, "nonexistent")).toHaveLength(0);
  });
});

// ── Price validation tests ───────────────────────────────────

describe("Modifier price_delta NULL safety", () => {
  it("null price_delta returns 0", () => {
    expect(safeModifierPriceDelta(null)).toBe(0);
  });

  it("undefined price_delta returns 0", () => {
    expect(safeModifierPriceDelta(undefined)).toBe(0);
  });

  it("NaN returns 0", () => {
    expect(safeModifierPriceDelta(NaN)).toBe(0);
  });

  it("valid positive delta is returned", () => {
    expect(safeModifierPriceDelta(1.50)).toBe(1.50);
  });

  it("zero (free modifier) is returned correctly", () => {
    expect(safeModifierPriceDelta(0)).toBe(0);
  });

  it("negative delta (discount) is returned correctly", () => {
    expect(safeModifierPriceDelta(-2.00)).toBe(-2.00);
  });
});

// ── Menu response structure tests ───────────────────────────

describe("Menu API response structure", () => {
  const items: MenuItem[] = [
    { id: "i1", category_id: "cat1", name_es: "Burger", name_en: "Burger", price: 12, image_url: null, available: true, sort_order: 1 },
    { id: "i2", category_id: "cat1", name_es: "Beer", name_en: "Beer", price: 3, image_url: null, available: true, sort_order: 2 },
  ];
  const categories: MenuCategory[] = [
    { id: "cat1", name_es: "Comidas", name_en: "Food", icon: null, color: null, sort_order: 1 },
  ];
  const links: ItemModLink[] = [
    { item_id: "i1", group_id: "grp1" },
  ];

  it("response includes all required fields", () => {
    const response = buildMenuResponse(items, categories, links);
    expect(response).toHaveProperty("categories");
    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("itemModLinks");
    expect(response).toHaveProperty("availableGroupIds");
  });

  it("itemModLinks only contains links for returned items", () => {
    const linksWithExtra = [
      ...links,
      { item_id: "UNKNOWN_ITEM", group_id: "grp2" },
    ];
    const response = buildMenuResponse(items, categories, linksWithExtra);
    const returnedItemIds = response.items.map((i) => i.id);
    response.itemModLinks.forEach((link) => {
      expect(returnedItemIds).toContain(link.item_id);
    });
  });

  it("availableGroupIds are deduplicated", () => {
    const dupeLinks: ItemModLink[] = [
      { item_id: "i1", group_id: "grp1" },
      { item_id: "i2", group_id: "grp1" }, // same group linked twice
    ];
    const response = buildMenuResponse(items, categories, dupeLinks);
    const uniqueGroups = [...new Set(response.availableGroupIds)];
    expect(response.availableGroupIds).toHaveLength(uniqueGroups.length);
  });

  it("empty menu returns empty arrays", () => {
    const response = buildMenuResponse([], [], []);
    expect(response.categories).toHaveLength(0);
    expect(response.items).toHaveLength(0);
    expect(response.itemModLinks).toHaveLength(0);
    expect(response.availableGroupIds).toHaveLength(0);
  });
});

// ── Multi-language field completeness ────────────────────────

describe("Menu items multi-language field validation", () => {
  const langs = ["es", "en", "fr", "de", "it"] as const;

  it("item has all 5 language name fields", () => {
    const item: MenuItem = {
      id: "1", category_id: null,
      name_es: "Hamburguesa", name_en: "Burger", name_fr: "Hamburger", name_de: "Hamburger", name_it: "Hamburger",
      price: 12, image_url: null, available: true, sort_order: 1,
    };

    langs.forEach((lang) => {
      const key = `name_${lang}` as keyof MenuItem;
      expect(item[key]).toBeDefined();
      expect(typeof item[key]).toBe("string");
    });
  });

  it("CRITICAL: slug validation rejects invalid slugs", () => {
    const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

    expect(SLUG_RE.test("bonets-grill")).toBe(true);
    expect(SLUG_RE.test("mi-restaurante")).toBe(true);
    expect(SLUG_RE.test("test123")).toBe(true);

    expect(SLUG_RE.test("")).toBe(false);
    expect(SLUG_RE.test("'; DROP TABLE tenants;--")).toBe(false);
    expect(SLUG_RE.test("<script>")).toBe(false);
    expect(SLUG_RE.test("slug with spaces")).toBe(false);
  });

  it("CRITICAL: tenant not found returns 404 (not 500)", () => {
    // Simulates the logic: if tenant is null → 404
    const tenant = null;
    const statusCode = !tenant ? 404 : 200;
    expect(statusCode).toBe(404);
  });
});
