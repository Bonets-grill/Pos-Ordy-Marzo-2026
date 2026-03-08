import {
  AuditEventSchema,
  CartSchema,
  IdempotencySchema,
  MenuCatalogSchema,
  ReservationSchema,
  TenantScopeSchema,
} from "../foundation/contracts";

export function runContractAudit(): { name: string; pass: boolean; details: string } {
  try {
    TenantScopeSchema.parse({ tenantId: "t1", agentId: "a1", channel: "web" });
    MenuCatalogSchema.parse({
      catalogVersion: "v1",
      source: "pos",
      confidence: 1,
      categories: [{ id: "c1", name: "Bebidas" }],
      products: [
        {
          productId: "p1",
          categoryId: "c1",
          name: "Café",
          description: "",
          price: 2,
          currency: "EUR",
          requiredModifiers: [],
          optionalModifiers: [],
        },
      ],
      modifiers: [],
      publishedAt: new Date().toISOString(),
      reviewRequired: false,
    });
    CartSchema.parse({
      cartId: "cart-1",
      items: [],
      subtotal: 0,
      fees: 0,
      taxes: 0,
      total: 0,
      frozen: false,
    });
    ReservationSchema.parse({
      reservationId: "r1",
      date: "2026-01-10",
      time: "20:00",
      peopleCount: 2,
      customerName: "Ana",
      phone: "+34123456",
      status: "booked",
    });
    IdempotencySchema.parse({
      key: "idem-12345678",
      operation: "create_order",
      createdAt: new Date().toISOString(),
    });
    AuditEventSchema.parse({
      eventId: "e1",
      tenantId: "t1",
      sessionId: "s1",
      timestamp: new Date().toISOString(),
      eventType: "order_confirmed",
      payload: {},
    });

    return { name: "Contract Audit", pass: true, details: "Schemas válidos" };
  } catch (error) {
    return {
      name: "Contract Audit",
      pass: false,
      details: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
