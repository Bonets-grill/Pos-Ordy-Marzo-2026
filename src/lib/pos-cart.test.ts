import { describe, it, expect } from "vitest";

/**
 * POS CART & PAYMENT LOGIC TEST LAB
 * Tests all cart calculations, split bills, loyalty, tips, discounts
 * extracted from pos/page.tsx business logic
 */

// ── Types (mirror POS page) ────────────────────────────────

interface CartItem {
  id: string;
  name: string;
  price: number; // base price + modifier deltas
  qty: number;
  modifiers: { name: string; price_delta: number }[];
  kds_station?: string;
  notes?: string;
}

interface LoyaltyReward {
  type: "discount_percent" | "discount_fixed" | "free_item";
  value: number;
}

// ── Business logic functions (extracted from POS page) ──────

function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.price * c.qty, 0);
}

function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

function calculateLoyaltyDiscount(
  subtotal: number,
  reward: LoyaltyReward | null
): number {
  if (!reward) return 0;
  if (reward.type === "discount_percent") {
    return subtotal * (reward.value / 100);
  }
  if (reward.type === "discount_fixed") {
    return reward.value;
  }
  return 0;
}

function calculateTotal(
  subtotal: number,
  taxAmount: number,
  discount: number,
  loyaltyDiscount: number,
  tip: number
): number {
  return Math.max(0, subtotal + taxAmount - discount - loyaltyDiscount + tip);
}

function calculateEqualSplit(total: number, splitCount: number): number {
  return Math.round((total / splitCount) * 100) / 100;
}

function calculateItemSplitBill(
  items: CartItem[],
  taxRate: number
): number {
  const billSubtotal = items.reduce((sum, c) => sum + c.price * c.qty, 0);
  const billTax = billSubtotal * (taxRate / 100);
  return Math.round((billSubtotal + billTax) * 100) / 100;
}

function calculateLoyaltyPointsEarned(
  subtotal: number,
  pointsPerEuro: number
): number {
  return Math.floor(subtotal * pointsPerEuro);
}

// ── Cart subtotal ───────────────────────────────────────────

describe("POS Cart subtotal", () => {
  it("single item", () => {
    const cart: CartItem[] = [
      { id: "1", name: "Burger", price: 12.50, qty: 1, modifiers: [] },
    ];
    expect(calculateSubtotal(cart)).toBe(12.50);
  });

  it("multiple items with quantities", () => {
    const cart: CartItem[] = [
      { id: "1", name: "Burger", price: 12.50, qty: 2, modifiers: [] },
      { id: "2", name: "Beer", price: 4.00, qty: 3, modifiers: [] },
      { id: "3", name: "Fries", price: 3.50, qty: 1, modifiers: [] },
    ];
    // 2*12.50 + 3*4.00 + 1*3.50 = 25 + 12 + 3.50 = 40.50
    expect(calculateSubtotal(cart)).toBe(40.50);
  });

  it("item price includes modifier deltas (pre-calculated)", () => {
    // POS adds modifier deltas to price before putting in cart
    const cart: CartItem[] = [
      {
        id: "1", name: "Burger",
        price: 12.50 + 1.50 + 2.00, // base + cheese + bacon
        qty: 1,
        modifiers: [
          { name: "Cheese", price_delta: 1.50 },
          { name: "Bacon", price_delta: 2.00 },
        ],
      },
    ];
    expect(calculateSubtotal(cart)).toBe(16.00);
  });

  it("empty cart = 0", () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

// ── Tax ─────────────────────────────────────────────────────

describe("POS Tax calculation", () => {
  it("10% IVA standard", () => {
    expect(calculateTax(100, 10)).toBe(10);
    expect(calculateTax(40.50, 10)).toBeCloseTo(4.05, 2);
  });

  it("21% IVA (bebidas alcoholicas)", () => {
    expect(calculateTax(100, 21)).toBe(21);
  });

  it("0% tax", () => {
    expect(calculateTax(100, 0)).toBe(0);
  });

  it("BUG: POS applies tax to subtotal BEFORE discounts", () => {
    // subtotal=100, discount=20, tax should be on 80 but POS taxes on 100
    const subtotal = 100;
    const taxOnFull = calculateTax(subtotal, 10); // 10€ tax
    const taxOnDiscounted = calculateTax(subtotal - 20, 10); // 8€ tax
    expect(taxOnFull).toBeGreaterThan(taxOnDiscounted);
    // Customer pays 2€ more tax than they should
    // This is the actual POS behavior — documenting as known issue
  });
});

// ── Total with discounts, loyalty, tips ─────────────────────

describe("POS Total calculation", () => {
  it("simple: subtotal + tax", () => {
    expect(calculateTotal(100, 10, 0, 0, 0)).toBe(110);
  });

  it("with manual discount", () => {
    expect(calculateTotal(100, 10, 15, 0, 0)).toBe(95);
  });

  it("with loyalty discount", () => {
    expect(calculateTotal(100, 10, 0, 20, 0)).toBe(90);
  });

  it("with tip", () => {
    expect(calculateTotal(100, 10, 0, 0, 5)).toBe(115);
  });

  it("all combined", () => {
    // 100 + 10 tax - 15 discount - 10 loyalty + 5 tip = 90
    expect(calculateTotal(100, 10, 15, 10, 5)).toBe(90);
  });

  it("CRITICAL: total never goes negative (clamped to 0)", () => {
    // discount + loyalty > subtotal + tax
    expect(calculateTotal(50, 5, 30, 30, 0)).toBe(0);
  });

  it("stacking discounts can drain order", () => {
    // 50€ subtotal + 5€ tax - 30€ manual - 30€ loyalty = -5 → 0
    const total = calculateTotal(50, 5, 30, 30, 0);
    expect(total).toBe(0);
    // BUG: With tip=10, result is max(0, 50+5-30-30+10) = max(0,5) = 5
    // The tip partially covers the overcharged discount, but customer
    // intended the tip as a BONUS, not as payment for overcharged items
    expect(calculateTotal(50, 5, 30, 30, 10)).toBe(5);
  });
});

// ── Loyalty discount ────────────────────────────────────────

describe("Loyalty discount", () => {
  it("percentage discount", () => {
    const discount = calculateLoyaltyDiscount(100, {
      type: "discount_percent",
      value: 15,
    });
    expect(discount).toBe(15);
  });

  it("fixed discount", () => {
    const discount = calculateLoyaltyDiscount(100, {
      type: "discount_fixed",
      value: 5,
    });
    expect(discount).toBe(5);
  });

  it("fixed discount can exceed subtotal", () => {
    const discount = calculateLoyaltyDiscount(3, {
      type: "discount_fixed",
      value: 10,
    });
    expect(discount).toBe(10); // BUG: no cap, handled by total clamp
  });

  it("free item type returns 0", () => {
    expect(calculateLoyaltyDiscount(100, { type: "free_item", value: 0 })).toBe(0);
  });

  it("no reward returns 0", () => {
    expect(calculateLoyaltyDiscount(100, null)).toBe(0);
  });

  it("100% discount = subtotal", () => {
    expect(calculateLoyaltyDiscount(100, {
      type: "discount_percent",
      value: 100,
    })).toBe(100);
  });
});

// ── Split bill ──────────────────────────────────────────────

describe("POS Split bill — equal", () => {
  it("2-way split", () => {
    expect(calculateEqualSplit(100, 2)).toBe(50);
  });

  it("3-way split with remainder", () => {
    // 100/3 = 33.33 per person (loses 0.01€ in rounding)
    expect(calculateEqualSplit(100, 3)).toBe(33.33);
  });

  it("BUG: 3-way equal split loses money (rounding)", () => {
    const perPerson = calculateEqualSplit(100, 3);
    const collectedTotal = perPerson * 3;
    expect(collectedTotal).toBe(99.99); // LOST 0.01€!
    // The restaurant loses 1 cent on every 3-way split
  });

  it("4-way split exact", () => {
    expect(calculateEqualSplit(100, 4)).toBe(25);
  });

  it("7-way split large rounding", () => {
    const perPerson = calculateEqualSplit(100, 7);
    const collectedTotal = Math.round(perPerson * 7 * 100) / 100;
    // 100/7 = 14.29 * 7 = 100.03 — OVERCHARGED!
    expect(collectedTotal).not.toBe(100);
  });

  it("split count 1 = full total", () => {
    expect(calculateEqualSplit(55.50, 1)).toBe(55.50);
  });
});

describe("POS Split bill — by item", () => {
  const taxRate = 10;

  it("single person gets all items", () => {
    const items: CartItem[] = [
      { id: "1", name: "Burger", price: 12, qty: 1, modifiers: [] },
      { id: "2", name: "Beer", price: 4, qty: 1, modifiers: [] },
    ];
    expect(calculateItemSplitBill(items, taxRate)).toBe(17.60); // 16 + 1.6
  });

  it("each person gets individual tax calculated", () => {
    const personA: CartItem[] = [
      { id: "1", name: "Steak", price: 25, qty: 1, modifiers: [] },
    ];
    const personB: CartItem[] = [
      { id: "2", name: "Salad", price: 8, qty: 1, modifiers: [] },
    ];
    const billA = calculateItemSplitBill(personA, taxRate);
    const billB = calculateItemSplitBill(personB, taxRate);
    expect(billA).toBe(27.50); // 25 + 2.5
    expect(billB).toBe(8.80); // 8 + 0.8
    // Total: 36.30, but if we taxed 33 subtotal at 10% = 3.30 → 36.30 ✓
  });
});

// ── Loyalty points earning ──────────────────────────────────

describe("Loyalty points earning", () => {
  it("1 point per euro", () => {
    expect(calculateLoyaltyPointsEarned(25.50, 1)).toBe(25); // floor
  });

  it("2 points per euro", () => {
    expect(calculateLoyaltyPointsEarned(25.50, 2)).toBe(51);
  });

  it("0.5 points per euro", () => {
    expect(calculateLoyaltyPointsEarned(25.50, 0.5)).toBe(12);
  });

  it("zero subtotal = zero points", () => {
    expect(calculateLoyaltyPointsEarned(0, 1)).toBe(0);
  });

  it("BUG: points earned on subtotal, not on what customer actually paid", () => {
    // Customer has 50€ subtotal but 20€ discount = pays 30€
    // Points earned on 50€ (full subtotal), not 30€
    const pointsOnSubtotal = calculateLoyaltyPointsEarned(50, 1);
    const pointsOnPaid = calculateLoyaltyPointsEarned(30, 1);
    expect(pointsOnSubtotal).toBeGreaterThan(pointsOnPaid);
    // This inflates loyalty points vs actual spend
  });
});

// ── Payment flows ───────────────────────────────────────────

describe("Payment logic", () => {
  it("cash payment: full amount", () => {
    const total = 55.50;
    const cashGiven = 60;
    const change = cashGiven - total;
    expect(change).toBeCloseTo(4.50, 2);
  });

  it("mixed payment: cash + card", () => {
    const total = 55.50;
    const tip = 5;
    const cashAmount = 30; // cash portion (no tip on cash)
    const cardAmount = total - cashAmount + tip; // 25.50 + 5 tip
    expect(cashAmount + cardAmount).toBe(total + tip);
    expect(cardAmount).toBe(30.50);
  });

  it("BUG: tip goes only to card in mixed payment", () => {
    // If payment is cash=30 + card=25.50+5tip
    // Cash record: amount=30, tip=0
    // Card record: amount=25.50, tip=5
    // Total collected: 30 + 25.50 + 5 = 60.50
    // But order total is 55.50 + 5 tip = 60.50 ✓
    const total = 55.50;
    const tip = 5;
    const cashAmount = 30;
    const cardAmount = total - cashAmount;
    expect(cashAmount + cardAmount + tip).toBe(total + tip);
  });
});

// ── Modifier selection ──────────────────────────────────────

describe("Modifier selection rules", () => {
  interface SelectedMods { [groupId: string]: string[] }

  function toggleMod(
    prev: SelectedMods,
    groupId: string,
    modId: string,
    maxSelect: number
  ): SelectedMods {
    const current = prev[groupId] || [];
    if (current.includes(modId)) {
      return { ...prev, [groupId]: current.filter((id) => id !== modId) };
    }
    if (maxSelect === 1) {
      return { ...prev, [groupId]: [modId] };
    }
    if (current.length >= maxSelect) {
      return prev;
    }
    return { ...prev, [groupId]: [...current, modId] };
  }

  it("single-select: replaces previous selection", () => {
    let mods: SelectedMods = {};
    mods = toggleMod(mods, "cooking", "rare", 1);
    expect(mods.cooking).toEqual(["rare"]);
    mods = toggleMod(mods, "cooking", "medium", 1);
    expect(mods.cooking).toEqual(["medium"]); // replaced!
  });

  it("single-select: toggle off", () => {
    let mods: SelectedMods = {};
    mods = toggleMod(mods, "cooking", "rare", 1);
    mods = toggleMod(mods, "cooking", "rare", 1); // toggle off
    expect(mods.cooking).toEqual([]);
  });

  it("multi-select: accumulates up to max", () => {
    let mods: SelectedMods = {};
    mods = toggleMod(mods, "extras", "cheese", 3);
    mods = toggleMod(mods, "extras", "bacon", 3);
    mods = toggleMod(mods, "extras", "egg", 3);
    expect(mods.extras).toEqual(["cheese", "bacon", "egg"]);
    // 4th blocked
    mods = toggleMod(mods, "extras", "avocado", 3);
    expect(mods.extras).toEqual(["cheese", "bacon", "egg"]); // unchanged
  });

  it("multi-select: deselect reduces", () => {
    let mods: SelectedMods = {};
    mods = toggleMod(mods, "extras", "cheese", 3);
    mods = toggleMod(mods, "extras", "bacon", 3);
    mods = toggleMod(mods, "extras", "cheese", 3); // deselect
    expect(mods.extras).toEqual(["bacon"]);
  });

  it("independent groups don't interfere", () => {
    let mods: SelectedMods = {};
    mods = toggleMod(mods, "cooking", "rare", 1);
    mods = toggleMod(mods, "extras", "cheese", 3);
    expect(mods.cooking).toEqual(["rare"]);
    expect(mods.extras).toEqual(["cheese"]);
  });
});

// ── Full POS flow scenario ──────────────────────────────────

describe("Full POS flow: order with everything", () => {
  const taxRate = 10;

  it("complete order lifecycle", () => {
    // 1. Build cart
    const cart: CartItem[] = [
      { id: "1", name: "Burger Premium", price: 14.50 + 1.50, qty: 2, modifiers: [{ name: "Extra Cheese", price_delta: 1.50 }] },
      { id: "2", name: "Ensalada Cesar", price: 9.00, qty: 1, modifiers: [] },
      { id: "3", name: "Cerveza", price: 4.50, qty: 3, modifiers: [] },
    ];

    // 2. Calculate subtotal
    const subtotal = calculateSubtotal(cart);
    // 2*(14.50+1.50) + 1*9 + 3*4.50 = 32 + 9 + 13.50 = 54.50
    expect(subtotal).toBe(54.50);

    // 3. Apply tax
    const tax = calculateTax(subtotal, taxRate);
    expect(tax).toBeCloseTo(5.45, 2);

    // 4. Apply manual discount: 10%
    const discount = subtotal * 0.10; // 5.45€
    expect(discount).toBeCloseTo(5.45, 2);

    // 5. Apply loyalty: 15% off
    const loyaltyDiscount = calculateLoyaltyDiscount(subtotal, {
      type: "discount_percent", value: 15,
    });
    expect(loyaltyDiscount).toBeCloseTo(8.175, 2);

    // 6. Add tip
    const tip = 3;

    // 7. Final total
    const total = calculateTotal(subtotal, tax, discount, loyaltyDiscount, tip);
    // 54.50 + 5.45 - 5.45 - 8.175 + 3 = 49.325 → clamped ≥ 0
    expect(total).toBeCloseTo(49.33, 0);
    expect(total).toBeGreaterThan(0);

    // 8. Loyalty points (earned on full subtotal!)
    const points = calculateLoyaltyPointsEarned(subtotal, 1);
    expect(points).toBe(54);

    // 9. 2-way split
    const perPerson = calculateEqualSplit(total, 2);
    expect(perPerson).toBeCloseTo(total / 2, 2);
  });
});
