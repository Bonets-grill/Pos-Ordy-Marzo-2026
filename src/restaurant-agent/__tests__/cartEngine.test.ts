import { describe, it, expect } from "vitest";
import { CartEngine } from "../engines/cartEngine";
import { Product, ModifierOption } from "../foundation/contracts";

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

const burgerWithRequired: Product = {
  ...burger,
  productId: "p2",
  name: "Burger Especial",
  requiredModifiers: ["size-group"],
};

const sizeModifier: ModifierOption = {
  modifierId: "mod-large",
  groupId: "size-group",
  name: "Grande",
  priceDelta: 3,
};

describe("CartEngine", () => {
  it("inicia con carrito vacío", () => {
    const cart = new CartEngine("cart-1");
    const c = cart.getCart();
    expect(c.items).toHaveLength(0);
    expect(c.total).toBe(0);
    expect(c.frozen).toBe(false);
  });

  it("agrega item y calcula total", () => {
    const cart = new CartEngine();
    const c = cart.addItem(burger, 2);
    expect(c.items).toHaveLength(1);
    expect(c.items[0].quantity).toBe(2);
    expect(c.items[0].unitPrice).toBe(10);
    expect(c.items[0].lineTotal).toBe(20);
    expect(c.total).toBe(20);
  });

  it("agrega item con modifiers y calcula precio", () => {
    const cart = new CartEngine();
    const c = cart.addItem(burgerWithRequired, 1, [sizeModifier]);
    expect(c.items[0].unitPrice).toBe(13); // 10 + 3
    expect(c.items[0].modifiers).toHaveLength(1);
    expect(c.total).toBe(13);
  });

  it("rechaza item sin modifiers requeridos", () => {
    const cart = new CartEngine();
    expect(() => cart.addItem(burgerWithRequired, 1, [])).toThrow("Faltan modifiers requeridos");
  });

  it("rechaza cantidad 0", () => {
    const cart = new CartEngine();
    expect(() => cart.addItem(burger, 0)).toThrow("Cantidad inválida");
  });

  it("elimina item del carrito", () => {
    const cart = new CartEngine();
    const c1 = cart.addItem(burger, 1);
    expect(c1.items).toHaveLength(1);
    const c2 = cart.removeItem(c1.items[0].lineId);
    expect(c2.items).toHaveLength(0);
    expect(c2.total).toBe(0);
  });

  it("congela carrito y bloquea modificaciones", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 1);
    cart.freezeCartBeforeCheckout();
    expect(() => cart.addItem(burger, 1)).toThrow("congelado");
    expect(() => cart.removeItem("any")).toThrow("congelado");
  });

  it("recalcula con tax y fee", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 2); // subtotal = 20
    const c = cart.recalculate(0.1, 2); // tax 10% = 2, fee = 2
    expect(c.subtotal).toBe(20);
    expect(c.taxes).toBe(2);
    expect(c.fees).toBe(2);
    expect(c.total).toBe(24);
  });

  it("retorna copia inmutable (no referencia directa)", () => {
    const cart = new CartEngine();
    cart.addItem(burger, 1);
    const c1 = cart.getCart();
    const c2 = cart.getCart();
    expect(c1).toEqual(c2);
    expect(c1).not.toBe(c2); // distinta referencia
  });
});
