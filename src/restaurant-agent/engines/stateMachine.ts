import { SessionState } from "../foundation/contracts";

type Transition = {
  from: SessionState | "*";
  to: SessionState;
  guard: (ctx: Record<string, unknown>) => boolean;
  reason: string;
};

const transitions: Transition[] = [
  { from: "IDLE", to: "DISCOVERY", guard: () => true, reason: "inicio" },
  { from: "DISCOVERY", to: "MENU_BROWSING", guard: () => true, reason: "show_menu" },
  { from: "MENU_BROWSING", to: "ORDER_BUILDING", guard: () => true, reason: "start_order" },
  {
    from: "ORDER_BUILDING",
    to: "ITEM_CLARIFICATION",
    guard: (ctx) => Boolean(ctx.ambiguousProduct),
    reason: "producto ambiguo",
  },
  {
    from: "ORDER_BUILDING",
    to: "CART_REVIEW",
    guard: (ctx) => Number(ctx.cartItems ?? 0) > 0,
    reason: "carrito con items",
  },
  { from: "CART_REVIEW", to: "CHECKOUT_MODE_SELECT", guard: () => true, reason: "checkout" },
  {
    from: "CHECKOUT_MODE_SELECT",
    to: "DELIVERY_FLOW",
    guard: (ctx) => ctx.mode === "delivery",
    reason: "delivery",
  },
  {
    from: "CHECKOUT_MODE_SELECT",
    to: "TAKEAWAY_FLOW",
    guard: (ctx) => ctx.mode === "takeaway",
    reason: "takeaway",
  },
  {
    from: "CHECKOUT_MODE_SELECT",
    to: "ORDER_CONFIRMATION",
    guard: (ctx) => ctx.mode === "dine_in",
    reason: "dine in",
  },
  { from: "IDLE", to: "RESERVATION_FLOW", guard: () => true, reason: "new reservation" },
  {
    from: "RESERVATION_FLOW",
    to: "RESERVATION_CONFIRMATION",
    guard: (ctx) => Boolean(ctx.hasReservationDraft),
    reason: "draft ready",
  },
  { from: "RESERVATION_CONFIRMATION", to: "IDLE", guard: () => true, reason: "done" },
  { from: "*", to: "HUMAN_ESCALATION", guard: () => true, reason: "escalation" },
  { from: "*", to: "ERROR_RECOVERY", guard: () => true, reason: "recovery" },
  {
    from: "*",
    to: "CLOSED_HOURS",
    guard: (ctx) => ctx.operationAllowed === false,
    reason: "closed hours",
  },
];

export class RestaurantStateMachine {
  private state: SessionState = "IDLE";

  getState(): SessionState {
    return this.state;
  }

  transition(to: SessionState, ctx: Record<string, unknown> = {}): SessionState {
    const transition = transitions.find(
      (t) => (t.from === this.state || t.from === "*") && t.to === to,
    );

    if (!transition) {
      throw new Error(`Transición inválida: ${this.state} -> ${to}`);
    }

    if (!transition.guard(ctx)) {
      throw new Error(
        `Guard bloqueó transición ${this.state} -> ${to}: ${transition.reason}`,
      );
    }

    this.state = to;
    return this.state;
  }
}
