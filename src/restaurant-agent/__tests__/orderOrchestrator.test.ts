import { describe, it, expect } from "vitest";
import { CartEngine } from "../engines/cartEngine";
import { BusinessRulesEngine, BusinessRulesConfig } from "../engines/businessRulesEngine";
import { OrderOrchestrator } from "../engines/orderOrchestrator";
import { Product } from "../foundation/contracts";

const burger: Product = {
  productId: "p1",
  categoryId: "c1",
  name: "Hamburguesa",
  description: "",
  allergens: [],
  tags: [],
  available: true,
  price: 10,
  currency: "EUR",
  requiredModifiers: [],
  optionalModifiers: [],
};

const rulesConfig: BusinessRulesConfig = {
  timezone: "UTC",
  openHours: { 0: null, 1: { open: "00:00", close: "23:59" }, 2: { open: "00:00", close: "23:59" }, 3: { open: "00:00", close: "23:59" }, 4: { open: "00:00", close: "23:59" }, 5: { open: "00:00", close: "23:59" }, 6: { open: "00:00", close: "23:59" } },
  deliveryEnabled: true,
  takeawayEnabled: true,
  dineInEnabled: true,
  reservationsEnabled: true,
  closedDates: new Set(),
  deliveryZones: ["CENTRO"],
  minimumOrderByMode: { delivery: 15 },
};

describe("OrderOrchestrator", () => {
  it("crea orden delivery válida", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 2); // total = 20
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    const order = orch.confirmAndCreateOrder(
      "delivery",
      { customerName: "Luis", phone: "+34111", address: "Calle 1", deliveryZone: "CENTRO" },
      "idem-001",
    );

    expect(order.orderId).toBeTruthy();
    expect(order.mode).toBe("delivery");
    expect(order.total).toBe(20);
    expect(order.payloadVersion).toBe("v1");
  });

  it("bloquea confirmación duplicada (idempotencia)", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 2);
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    orch.confirmAndCreateOrder(
      "dine_in",
      { customerName: "Ana", phone: "+34222" },
      "idem-dup",
    );

    expect(() =>
      orch.confirmAndCreateOrder("dine_in", { customerName: "Ana", phone: "+34222" }, "idem-dup"),
    ).toThrow("idempotencia");
  });

  it("rechaza carrito vacío", () => {
    const cart = new CartEngine();
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    expect(() =>
      orch.confirmAndCreateOrder("dine_in", { customerName: "X", phone: "+34000" }, "idem-empty"),
    ).toThrow("vacío");
  });

  it("rechaza delivery bajo mínimo", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 1); // total = 10, mínimo delivery = 15
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    expect(() =>
      orch.confirmAndCreateOrder(
        "delivery",
        { customerName: "X", phone: "+34000", address: "C1", deliveryZone: "CENTRO" },
        "idem-low",
      ),
    ).toThrow("mínimo");
  });

  it("rechaza delivery sin dirección", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 2);
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    expect(() =>
      orch.confirmAndCreateOrder(
        "delivery",
        { customerName: "X", phone: "+34000" },
        "idem-noaddr",
      ),
    ).toThrow("obligatorias");
  });

  it("rechaza zona fuera de cobertura", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 2);
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    expect(() =>
      orch.confirmAndCreateOrder(
        "delivery",
        { customerName: "X", phone: "+34000", address: "C1", deliveryZone: "SUR" },
        "idem-badzone",
      ),
    ).toThrow("cobertura");
  });

  it("crea orden dine_in sin mínimo", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 1); // total = 10, sin mínimo para dine_in
    const rules = new BusinessRulesEngine(rulesConfig);
    const orch = new OrderOrchestrator(cart, rules);

    const order = orch.confirmAndCreateOrder(
      "dine_in",
      { customerName: "Pedro", phone: "+34333" },
      "idem-dinein",
    );
    expect(order.mode).toBe("dine_in");
    expect(order.total).toBe(10);
  });
});
