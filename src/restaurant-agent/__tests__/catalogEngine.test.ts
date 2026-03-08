import { describe, it, expect } from "vitest";
import { CatalogEngine } from "../engines/catalogEngine";
import { MenuCatalog } from "../foundation/contracts";

const testCatalog: MenuCatalog = {
  catalogVersion: "v1",
  source: "json",
  confidence: 1,
  categories: [
    { id: "c1", name: "Platos" },
    { id: "c2", name: "Bebidas" },
  ],
  products: [
    {
      productId: "p1",
      categoryId: "c1",
      name: "Hamburguesa Clásica",
      description: "Con queso y lechuga",
      allergens: ["gluten", "lácteos"],
      tags: ["popular"],
      available: true,
      price: 10,
      currency: "EUR",
      requiredModifiers: [],
      optionalModifiers: [],
    },
    {
      productId: "p2",
      categoryId: "c1",
      name: "Hamburguesa Vegana",
      description: "",
      allergens: ["gluten"],
      tags: ["vegano"],
      available: true,
      price: 12,
      currency: "EUR",
      requiredModifiers: [],
      optionalModifiers: [],
    },
    {
      productId: "p3",
      categoryId: "c2",
      name: "Coca-Cola",
      description: "",
      allergens: [],
      tags: [],
      available: false,
      price: 3,
      currency: "EUR",
      requiredModifiers: [],
      optionalModifiers: [],
    },
  ],
  modifiers: [],
  publishedAt: new Date().toISOString(),
  reviewRequired: false,
};

describe("CatalogEngine", () => {
  const catalog = new CatalogEngine(testCatalog);

  it("retorna versión del catálogo", () => {
    expect(catalog.getCatalogVersion()).toBe("v1");
  });

  it("busca producto por ID", () => {
    const p = catalog.getProduct("p1");
    expect(p).not.toBeNull();
    expect(p!.name).toBe("Hamburguesa Clásica");
  });

  it("retorna null para producto inexistente", () => {
    expect(catalog.getProduct("p999")).toBeNull();
  });

  it("busca por nombre parcial", () => {
    const results = catalog.searchByName("hamburguesa");
    expect(results).toHaveLength(2);
  });

  it("búsqueda case-insensitive", () => {
    const results = catalog.searchByName("COCA");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Coca-Cola");
  });

  it("valida producto disponible", () => {
    expect(catalog.validateProduct("p1")).toEqual({ ok: true });
  });

  it("rechaza producto inexistente", () => {
    const r = catalog.validateProduct("p999");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("inexistente");
  });

  it("rechaza producto no disponible", () => {
    const r = catalog.validateProduct("p3");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("no disponible");
  });
});
