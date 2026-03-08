import { describe, it, expect } from "vitest";
import { RestaurantStateMachine } from "../engines/stateMachine";

describe("RestaurantStateMachine", () => {
  it("inicia en IDLE", () => {
    const sm = new RestaurantStateMachine();
    expect(sm.getState()).toBe("IDLE");
  });

  it("transiciona IDLE -> DISCOVERY -> MENU_BROWSING", () => {
    const sm = new RestaurantStateMachine();
    sm.transition("DISCOVERY");
    expect(sm.getState()).toBe("DISCOVERY");
    sm.transition("MENU_BROWSING");
    expect(sm.getState()).toBe("MENU_BROWSING");
  });

  it("flujo completo pedido: IDLE -> DISCOVERY -> MENU -> ORDER -> CART_REVIEW", () => {
    const sm = new RestaurantStateMachine();
    sm.transition("DISCOVERY");
    sm.transition("MENU_BROWSING");
    sm.transition("ORDER_BUILDING");
    sm.transition("CART_REVIEW", { cartItems: 2 });
    expect(sm.getState()).toBe("CART_REVIEW");
  });

  it("rechaza transición inválida IDLE -> CART_REVIEW", () => {
    const sm = new RestaurantStateMachine();
    expect(() => sm.transition("CART_REVIEW")).toThrow("Transición inválida");
  });

  it("guard bloquea CART_REVIEW sin items", () => {
    const sm = new RestaurantStateMachine();
    sm.transition("DISCOVERY");
    sm.transition("MENU_BROWSING");
    sm.transition("ORDER_BUILDING");
    expect(() => sm.transition("CART_REVIEW", { cartItems: 0 })).toThrow("Guard bloqueó");
  });

  it("permite escalación humana desde cualquier estado (wildcard)", () => {
    const sm = new RestaurantStateMachine();
    sm.transition("DISCOVERY");
    sm.transition("MENU_BROWSING");
    sm.transition("HUMAN_ESCALATION");
    expect(sm.getState()).toBe("HUMAN_ESCALATION");
  });

  it("flujo reserva: IDLE -> RESERVATION_FLOW -> CONFIRMATION -> IDLE", () => {
    const sm = new RestaurantStateMachine();
    sm.transition("RESERVATION_FLOW");
    sm.transition("RESERVATION_CONFIRMATION", { hasReservationDraft: true });
    sm.transition("IDLE"); // RESERVATION_CONFIRMATION -> IDLE
    expect(sm.getState()).toBe("IDLE");
  });

  it("checkout delivery: CART_REVIEW -> MODE_SELECT -> DELIVERY", () => {
    const sm = new RestaurantStateMachine();
    sm.transition("DISCOVERY");
    sm.transition("MENU_BROWSING");
    sm.transition("ORDER_BUILDING");
    sm.transition("CART_REVIEW", { cartItems: 1 });
    sm.transition("CHECKOUT_MODE_SELECT");
    sm.transition("DELIVERY_FLOW", { mode: "delivery" });
    expect(sm.getState()).toBe("DELIVERY_FLOW");
  });
});
