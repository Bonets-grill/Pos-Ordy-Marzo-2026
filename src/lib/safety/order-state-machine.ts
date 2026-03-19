/**
 * Order State Machine
 *
 * Defines valid status transitions for orders and order items (KDS).
 * Used both in application code (validation before update) and
 * enforced at DB level via trigger (defense in depth).
 *
 * ORDER STATUS FLOW:
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │                                                  │
 *   │  open ──→ confirmed ──→ preparing ──→ ready      │
 *   │              │                          │        │
 *   │              │                          ▼        │
 *   │              │                       served      │
 *   │              │                          │        │
 *   │              │                          ▼        │
 *   │              │                       closed      │
 *   │              │                          │        │
 *   │              │                          ▼        │
 *   │              │                       refunded    │
 *   │              │                                   │
 *   │  Any active ──→ cancelled                        │
 *   │  (open, confirmed, preparing, ready)             │
 *   └──────────────────────────────────────────────────┘
 *
 * Special rules:
 *   - "served" can transition to "closed" (payment completes)
 *   - "confirmed" can skip to "ready" (fast prep, no kitchen step)
 *   - "closed" can become "refunded" (post-payment refund)
 *   - "cancelled" is terminal — cannot transition out
 *   - "refunded" is terminal — cannot transition out
 *
 * KDS ITEM STATUS FLOW:
 *
 *   pending ──→ preparing ──→ ready ──→ served
 *
 */

// ─── Valid Order Transitions ────────────────────────────

export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  open:       ["confirmed", "cancelled"],
  confirmed:  ["preparing", "ready", "served", "closed", "cancelled"],
  preparing:  ["ready", "cancelled"],
  ready:      ["served", "cancelled"],
  served:     ["closed"],
  closed:     ["refunded"],
  cancelled:  [],   // terminal
  refunded:   [],   // terminal
};

// ─── Valid KDS Item Transitions ─────────────────────────

export const VALID_KDS_TRANSITIONS: Record<string, string[]> = {
  pending:    ["preparing", "ready", "served"],   // can skip preparing for simple items
  preparing:  ["ready", "served"],                 // can skip ready for immediate bump
  ready:      ["served"],
  served:     ["pending", "preparing"],            // recall: undo to re-enter kitchen
};

// ─── Validation Functions ───────────────────────────────

export interface TransitionValidation {
  valid: boolean;
  from: string;
  to: string;
  reason?: string;
}

/**
 * Validate an order status transition.
 * Returns { valid: true } if the transition is allowed,
 * or { valid: false, reason } if it's blocked.
 */
export function validateOrderTransition(from: string, to: string): TransitionValidation {
  if (from === to) {
    return { valid: true, from, to }; // no-op, always allowed
  }

  const allowed = VALID_ORDER_TRANSITIONS[from];
  if (!allowed) {
    return { valid: false, from, to, reason: `Unknown source status: ${from}` };
  }

  if (!allowed.includes(to)) {
    return {
      valid: false,
      from,
      to,
      reason: `Invalid transition: ${from} → ${to}. Allowed from ${from}: [${allowed.join(", ")}]`,
    };
  }

  return { valid: true, from, to };
}

/**
 * Validate a KDS item status transition.
 */
export function validateKdsTransition(from: string, to: string): TransitionValidation {
  if (from === to) {
    return { valid: true, from, to };
  }

  const allowed = VALID_KDS_TRANSITIONS[from];
  if (!allowed) {
    return { valid: false, from, to, reason: `Unknown KDS status: ${from}` };
  }

  if (!allowed.includes(to)) {
    return {
      valid: false,
      from,
      to,
      reason: `Invalid KDS transition: ${from} → ${to}. Allowed from ${from}: [${allowed.join(", ")}]`,
    };
  }

  return { valid: true, from, to };
}

/**
 * Check if an order status is terminal (no further transitions allowed).
 */
export function isTerminalStatus(status: string): boolean {
  const allowed = VALID_ORDER_TRANSITIONS[status];
  return allowed !== undefined && allowed.length === 0;
}

/**
 * Get all valid next statuses for a given order status.
 */
export function getValidNextStatuses(status: string): string[] {
  return VALID_ORDER_TRANSITIONS[status] || [];
}

/**
 * Get all valid next KDS statuses for a given item status.
 */
export function getValidNextKdsStatuses(status: string): string[] {
  return VALID_KDS_TRANSITIONS[status] || [];
}
