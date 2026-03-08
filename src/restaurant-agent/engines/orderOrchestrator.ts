import { randomUUID } from "node:crypto";
import { BusinessRulesEngine, OperationalMode } from "./businessRulesEngine";
import { CartEngine } from "./cartEngine";

export type OrderDraft = {
  customerName: string;
  phone: string;
  address?: string;
  deliveryZone?: string;
  notes?: string;
};

export type CreatedOrder = {
  orderId: string;
  mode: OperationalMode;
  total: number;
  payloadVersion: "v1";
};

export class OrderOrchestrator {
  private readonly idempotency = new Set<string>();

  constructor(
    private readonly cartEngine: CartEngine,
    private readonly businessRules: BusinessRulesEngine,
  ) {}

  confirmAndCreateOrder(
    mode: OperationalMode,
    draft: OrderDraft,
    idempotencyKey: string,
  ): CreatedOrder {
    if (this.idempotency.has(idempotencyKey)) {
      throw new Error("Confirmación duplicada bloqueada por idempotencia");
    }

    const modeValidation = this.businessRules.validateMode(mode);
    if (!modeValidation.ok) throw new Error(modeValidation.reason);

    const cart = this.cartEngine.getCart();
    if (cart.items.length === 0) throw new Error("Carrito vacío");

    const minimum = this.businessRules.validateMinimum(mode, cart.total);
    if (!minimum.ok) throw new Error(minimum.reason);

    if (mode === "delivery") {
      if (!draft.address || !draft.deliveryZone) {
        throw new Error("Dirección y zona obligatorias para delivery");
      }
      const zoneValidation = this.businessRules.validateDeliveryZone(draft.deliveryZone);
      if (!zoneValidation.ok) throw new Error(zoneValidation.reason);
    }

    this.cartEngine.freezeCartBeforeCheckout();
    this.idempotency.add(idempotencyKey);

    return {
      orderId: randomUUID(),
      mode,
      total: cart.total,
      payloadVersion: "v1",
    };
  }
}
