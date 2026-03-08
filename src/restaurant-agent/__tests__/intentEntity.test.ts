import { describe, it, expect } from "vitest";
import { CatalogEngine } from "../engines/catalogEngine";
import { IntentEntityEngine } from "../engines/intentEntityEngine";
import { MenuCatalog } from "../foundation/contracts";

const catalog: MenuCatalog = {
  catalogVersion: "v1",
  source: "json",
  confidence: 1,
  categories: [{ id: "c1", name: "Platos" }],
  products: [
    {
      productId: "p1",
      categoryId: "c1",
      name: "Pizza Margherita",
      description: "",
      allergens: [],
      tags: [],
      available: true,
      price: 8,
      currency: "EUR",
      requiredModifiers: [],
      optionalModifiers: [],
    },
    {
      productId: "p2",
      categoryId: "c1",
      name: "Pizza Pepperoni",
      description: "",
      allergens: [],
      tags: [],
      available: true,
      price: 10,
      currency: "EUR",
      requiredModifiers: [],
      optionalModifiers: [],
    },
  ],
  modifiers: [],
  publishedAt: new Date().toISOString(),
  reviewRequired: false,
};

describe("IntentEntityEngine", () => {
  const engine = new IntentEntityEngine(new CatalogEngine(catalog));

  it("detecta saludo", () => {
    const r = engine.detect("Hola, buenas tardes");
    expect(r.intent).toBe("greeting");
    expect(r.requiresClarification).toBe(false);
  });

  it("detecta pedido de menú", () => {
    expect(engine.detect("Quiero ver el menú").intent).toBe("show_menu");
    expect(engine.detect("Dame la carta").intent).toBe("show_menu");
  });

  it("detecta pregunta de horarios", () => {
    expect(engine.detect("¿A qué hora abren?").intent).toBe("ask_hours");
  });

  it("detecta intención de reserva", () => {
    expect(engine.detect("Quiero hacer una reserva").intent).toBe("reservation_new");
  });

  it("detecta escalación humana", () => {
    expect(engine.detect("Quiero hablar con un humano").intent).toBe("human_help");
  });

  it("detecta start_order cuando texto no matchea producto exacto", () => {
    const r = engine.detect("Quiero una pizza margherita");
    // searchByName busca si product.name contiene el input completo — texto largo no matchea
    expect(r.intent).toBe("start_order");
    expect(r.requiresClarification).toBe(true);
  });

  it("detecta start_order cuando búsqueda parcial no matchea", () => {
    const r = engine.detect("Quiero una pizza");
    expect(r.intent).toBe("start_order");
    expect(r.requiresClarification).toBe(true);
  });

  it("detecta start_order cuando texto es más largo que nombre de producto", () => {
    // searchByName busca product.name.includes(fullText) — texto largo no es substring del nombre
    const r = engine.detect("Agrega margherita");
    expect(r.intent).toBe("start_order");
    expect(r.requiresClarification).toBe(true);
  });

  it("detecta start_order para texto genérico con trigger word", () => {
    const r = engine.detect("Agrega pizza");
    expect(r.intent).toBe("start_order");
    expect(r.requiresClarification).toBe(true);
  });

  it("devuelve unknown para texto no reconocido", () => {
    const r = engine.detect("asdlkjf alskdjf");
    expect(r.intent).toBe("unknown");
    expect(r.requiresClarification).toBe(true);
  });
});
