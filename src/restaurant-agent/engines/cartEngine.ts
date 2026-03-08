import { randomUUID } from "node:crypto";
import { Cart, CartSchema, ModifierOption, Product } from "../foundation/contracts";

export class CartEngine {
  private cart: Cart;

  constructor(cartId = randomUUID()) {
    this.cart = CartSchema.parse({
      cartId,
      items: [],
      subtotal: 0,
      fees: 0,
      taxes: 0,
      total: 0,
      frozen: false,
    });
  }

  getCart(): Cart {
    return structuredClone(this.cart);
  }

  addItem(product: Product, quantity = 1, modifiers: ModifierOption[] = [], note?: string): Cart {
    this.assertNotFrozen();
    if (quantity < 1) throw new Error("Cantidad inválida");

    const missing = product.requiredModifiers.filter(
      (requiredGroup) => !modifiers.some((m) => m.groupId === requiredGroup),
    );
    if (missing.length) {
      throw new Error(`Faltan modifiers requeridos: ${missing.join(", ")}`);
    }

    const lineId = randomUUID();
    const unitPrice = product.price + modifiers.reduce((acc, m) => acc + m.priceDelta, 0);
    const lineTotal = unitPrice * quantity;

    this.cart.items.push({
      lineId,
      productId: product.productId,
      productName: product.name,
      quantity,
      unitPrice,
      modifiers: modifiers.map((m) => ({
        modifierId: m.modifierId,
        name: m.name,
        priceDelta: m.priceDelta,
      })),
      note,
      lineTotal,
    });

    this.recalculate();
    return this.getCart();
  }

  removeItem(lineId: string): Cart {
    this.assertNotFrozen();
    this.cart.items = this.cart.items.filter((item) => item.lineId !== lineId);
    this.recalculate();
    return this.getCart();
  }

  freezeCartBeforeCheckout(): Cart {
    this.cart.frozen = true;
    return this.getCart();
  }

  recalculate(taxRate = 0, fee = 0): Cart {
    this.cart.items = this.cart.items.map((item) => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
    }));
    this.cart.subtotal = this.cart.items.reduce((acc, item) => acc + item.lineTotal, 0);
    this.cart.fees = fee;
    this.cart.taxes = this.cart.subtotal * taxRate;
    this.cart.total = this.cart.subtotal + this.cart.fees + this.cart.taxes;
    return this.getCart();
  }

  private assertNotFrozen() {
    if (this.cart.frozen) {
      throw new Error("El carrito está congelado para checkout");
    }
  }
}
