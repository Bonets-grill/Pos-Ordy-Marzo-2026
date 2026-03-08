import { describe, it, expect } from "vitest";
import {
  TenantScopeSchema,
  MenuCatalogSchema,
  CartSchema,
  ReservationSchema,
  IdempotencySchema,
  AuditEventSchema,
  ProductSchema,
  SessionStateSchema,
  OperationalModeSchema,
} from "../foundation/contracts";

describe("Contract Schemas", () => {
  it("TenantScopeSchema acepta datos válidos", () => {
    const result = TenantScopeSchema.parse({ tenantId: "t1", agentId: "a1", channel: "web" });
    expect(result.tenantId).toBe("t1");
    expect(result.channel).toBe("web");
  });

  it("TenantScopeSchema rechaza canal inválido", () => {
    expect(() =>
      TenantScopeSchema.parse({ tenantId: "t1", agentId: "a1", channel: "sms" }),
    ).toThrow();
  });

  it("ProductSchema acepta producto válido con defaults", () => {
    const p = ProductSchema.parse({
      productId: "p1",
      categoryId: "c1",
      name: "Café",
      price: 2.5,
      currency: "EUR",
    });
    expect(p.available).toBe(true);
    expect(p.allergens).toEqual([]);
    expect(p.requiredModifiers).toEqual([]);
  });

  it("ProductSchema rechaza precio negativo", () => {
    expect(() =>
      ProductSchema.parse({
        productId: "p1",
        categoryId: "c1",
        name: "X",
        price: -1,
        currency: "EUR",
      }),
    ).toThrow();
  });

  it("MenuCatalogSchema acepta catálogo completo", () => {
    const catalog = MenuCatalogSchema.parse({
      catalogVersion: "v1",
      source: "json",
      confidence: 0.95,
      categories: [{ id: "c1", name: "Platos" }],
      products: [
        {
          productId: "p1",
          categoryId: "c1",
          name: "Burger",
          price: 10,
          currency: "USD",
        },
      ],
      modifiers: [],
      publishedAt: new Date().toISOString(),
      reviewRequired: false,
    });
    expect(catalog.products).toHaveLength(1);
    expect(catalog.confidence).toBe(0.95);
  });

  it("CartSchema acepta carrito vacío", () => {
    const cart = CartSchema.parse({
      cartId: "c1",
      items: [],
      subtotal: 0,
      fees: 0,
      taxes: 0,
      total: 0,
    });
    expect(cart.frozen).toBe(false);
    expect(cart.items).toHaveLength(0);
  });

  it("ReservationSchema acepta reserva válida", () => {
    const r = ReservationSchema.parse({
      reservationId: "r1",
      date: "2026-03-10",
      time: "20:30",
      peopleCount: 4,
      customerName: "Carlos",
      phone: "+34600111",
      status: "booked",
    });
    expect(r.status).toBe("booked");
  });

  it("ReservationSchema rechaza hora inválida", () => {
    expect(() =>
      ReservationSchema.parse({
        reservationId: "r1",
        date: "2026-03-10",
        time: "25:00",
        peopleCount: 2,
        customerName: "Ana",
        phone: "+34600",
        status: "booked",
      }),
    ).toThrow();
  });

  it("IdempotencySchema acepta key >= 8 chars", () => {
    const i = IdempotencySchema.parse({
      key: "idem-12345678",
      operation: "create_order",
      createdAt: new Date().toISOString(),
    });
    expect(i.operation).toBe("create_order");
  });

  it("AuditEventSchema acepta evento válido", () => {
    const e = AuditEventSchema.parse({
      eventId: "e1",
      tenantId: "t1",
      sessionId: "s1",
      timestamp: new Date().toISOString(),
      eventType: "order_confirmed",
      payload: { orderId: "o1" },
    });
    expect(e.eventType).toBe("order_confirmed");
  });

  it("SessionStateSchema acepta estados válidos", () => {
    expect(SessionStateSchema.parse("IDLE")).toBe("IDLE");
    expect(SessionStateSchema.parse("ORDER_BUILDING")).toBe("ORDER_BUILDING");
    expect(() => SessionStateSchema.parse("INVALID_STATE")).toThrow();
  });

  it("OperationalModeSchema acepta modos válidos", () => {
    expect(OperationalModeSchema.parse("delivery")).toBe("delivery");
    expect(OperationalModeSchema.parse("dine_in")).toBe("dine_in");
    expect(() => OperationalModeSchema.parse("pickup")).toThrow();
  });
});
