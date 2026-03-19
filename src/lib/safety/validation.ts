/**
 * Business validation functions for critical financial and data integrity checks.
 * Pure functions — no side effects, no DB calls.
 */

/**
 * Validate that mixed payment amounts sum to the expected total.
 * Returns null if valid, error message if invalid.
 */
export function validateMixedPayment(
  cashAmount: number,
  cardAmount: number,
  expectedTotal: number,
  tolerance: number = 0.01
): string | null {
  const sum = Math.round((cashAmount + cardAmount) * 100) / 100;
  const expected = Math.round(expectedTotal * 100) / 100;
  const diff = Math.abs(sum - expected);

  if (diff > tolerance) {
    return `Mixed payment mismatch: cash(${cashAmount}) + card(${cardAmount}) = ${sum}, expected ${expected}, diff ${diff.toFixed(2)}`;
  }

  if (cashAmount < 0 || cardAmount < 0) {
    return `Payment amounts cannot be negative: cash=${cashAmount}, card=${cardAmount}`;
  }

  return null; // valid
}

/**
 * Validate split bill tax distribution.
 * Returns corrected tax per split.
 */
export function calculateSplitTax(
  totalTax: number,
  splitCount: number,
  splitIndex: number
): number {
  if (splitCount <= 0) return 0;
  const baseTax = Math.floor((totalTax * 100) / splitCount) / 100;
  // Last split gets the rounding remainder
  if (splitIndex === splitCount - 1) {
    const remainder = Math.round((totalTax - baseTax * (splitCount - 1)) * 100) / 100;
    return remainder;
  }
  return baseTax;
}

/**
 * Distribute items across equal splits without duplication.
 * Each split gets a proportional subset of items.
 * Returns item indices for the given split.
 */
export function getItemsForEqualSplit(
  totalItems: number,
  splitCount: number,
  splitIndex: number
): number[] {
  if (splitCount <= 0 || splitIndex < 0 || splitIndex >= splitCount) return [];

  const indices: number[] = [];
  for (let i = 0; i < totalItems; i++) {
    if (i % splitCount === splitIndex) {
      indices.push(i);
    }
  }
  return indices;
}

export interface ModifierValidationResult {
  valid: boolean;
  invalidModifiers: string[];
  missingRequired: string[];
}

/**
 * Validate that modifiers belong to the correct item.
 * @param requestedModifierNames - modifier names from the cart
 * @param validModifierNames - modifier names actually linked to this item
 * @param requiredGroupNames - modifier group names that are required
 * @param selectedGroupNames - modifier group names that have selections
 */
export function validateModifiersForItem(
  requestedModifierNames: string[],
  validModifierNames: string[],
  requiredGroupNames: string[] = [],
  selectedGroupNames: string[] = []
): ModifierValidationResult {
  const validSet = new Set(validModifierNames.map((n) => n.toLowerCase()));

  const invalidModifiers = requestedModifierNames.filter(
    (name) => !validSet.has(name.toLowerCase())
  );

  const selectedSet = new Set(selectedGroupNames.map((n) => n.toLowerCase()));
  const missingRequired = requiredGroupNames.filter(
    (name) => !selectedSet.has(name.toLowerCase())
  );

  return {
    valid: invalidModifiers.length === 0 && missingRequired.length === 0,
    invalidModifiers,
    missingRequired,
  };
}

/**
 * Validate order total consistency.
 * Checks: subtotal + tax - discount + tip = total
 */
export function validateOrderTotals(
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  tipAmount: number,
  total: number,
  tolerance: number = 0.02
): string | null {
  const expected = Math.round((subtotal + taxAmount - discountAmount + tipAmount) * 100) / 100;
  const actual = Math.round(total * 100) / 100;
  const diff = Math.abs(expected - actual);

  if (diff > tolerance) {
    return `Total mismatch: subtotal(${subtotal}) + tax(${taxAmount}) - discount(${discountAmount}) + tip(${tipAmount}) = ${expected}, but total is ${actual}`;
  }
  return null;
}
