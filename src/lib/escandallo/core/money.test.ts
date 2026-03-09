import { describe, it, expect } from "vitest";
import {
  round, roundCost, roundCurrency, pct,
  foodCostPct, grossMargin, marginPct,
  salePriceFromFoodCost, salePriceFromMargin,
  formatMoney, formatPct, clamp,
} from "./money";

// ── round ───────────────────────────────────────────────────

describe("round", () => {
  it("rounds to 2 decimals by default", () => {
    expect(round(1.005)).toBe(1.01); // banker's rounding edge
    expect(round(1.004)).toBe(1);
    expect(round(1.555)).toBe(1.56);
    expect(round(2.345)).toBe(2.35);
  });

  it("rounds to custom decimals", () => {
    expect(round(1.23456, 3)).toBe(1.235);
    expect(round(1.23456, 4)).toBe(1.2346);
    expect(round(1.23456, 0)).toBe(1);
  });

  it("handles negative numbers", () => {
    expect(round(-1.555)).toBe(-1.55);
    expect(round(-2.345)).toBe(-2.34);
  });

  it("handles zero", () => {
    expect(round(0)).toBe(0);
    expect(round(0.001)).toBe(0);
    expect(round(0.005)).toBe(0.01);
  });

  it("handles very large numbers", () => {
    expect(round(999999.999)).toBe(1000000);
    expect(round(123456.785)).toBe(123456.79);
  });

  it("handles very small decimals", () => {
    expect(round(0.0000001)).toBe(0);
    expect(round(0.1 + 0.2, 1)).toBe(0.3);
  });
});

describe("roundCost", () => {
  it("rounds to 4 decimals for intermediate calcs", () => {
    expect(roundCost(1.23456789)).toBe(1.2346);
    expect(roundCost(0.00005)).toBe(0.0001);
  });
});

describe("roundCurrency", () => {
  it("defaults to EUR (2 decimals)", () => {
    expect(roundCurrency(1.235)).toBe(1.24);
  });

  it("respects currency precision", () => {
    expect(roundCurrency(1.235, "USD")).toBe(1.24);
    expect(roundCurrency(1.235, "GBP")).toBe(1.24);
    expect(roundCurrency(1.235, "MXN")).toBe(1.24);
  });
});

// ── pct ─────────────────────────────────────────────────────

describe("pct", () => {
  it("calculates percentage correctly", () => {
    expect(pct(25, 100)).toBe(25);
    expect(pct(1, 3)).toBe(33.33);
    expect(pct(2, 3)).toBe(66.67);
  });

  it("returns 0 for division by zero", () => {
    expect(pct(10, 0)).toBe(0);
    expect(pct(0, 0)).toBe(0);
  });

  it("handles 100%", () => {
    expect(pct(100, 100)).toBe(100);
  });

  it("handles > 100%", () => {
    expect(pct(200, 100)).toBe(200);
  });

  it("handles negative values", () => {
    expect(pct(-10, 100)).toBe(-10);
  });
});

// ── foodCostPct ─────────────────────────────────────────────

describe("foodCostPct", () => {
  it("calculates food cost % correctly", () => {
    expect(foodCostPct(3, 10)).toBe(30);    // 3€ cost / 10€ sale = 30%
    expect(foodCostPct(4.5, 15)).toBe(30);
    expect(foodCostPct(0, 10)).toBe(0);
  });

  it("returns 0 when sale price is 0", () => {
    expect(foodCostPct(5, 0)).toBe(0);
  });

  it("handles cost > sale price (losing money)", () => {
    expect(foodCostPct(15, 10)).toBe(150);
  });
});

// ── grossMargin ─────────────────────────────────────────────

describe("grossMargin", () => {
  it("calculates gross margin", () => {
    expect(grossMargin(10, 3)).toBe(7);
    expect(grossMargin(15, 4.5)).toBe(10.5);
  });

  it("handles negative margin (loss)", () => {
    expect(grossMargin(10, 15)).toBe(-5);
  });

  it("handles zero", () => {
    expect(grossMargin(0, 0)).toBe(0);
    expect(grossMargin(10, 0)).toBe(10);
  });
});

// ── marginPct ───────────────────────────────────────────────

describe("marginPct", () => {
  it("calculates margin % correctly", () => {
    expect(marginPct(10, 3)).toBe(70);     // (10-3)/10 = 70%
    expect(marginPct(15, 4.5)).toBe(70);
    expect(marginPct(100, 30)).toBe(70);
  });

  it("returns 0 when sale price is 0", () => {
    expect(marginPct(0, 5)).toBe(0);
  });

  it("handles negative margin", () => {
    expect(marginPct(10, 15)).toBe(-50);
  });

  it("margin% + foodCost% should equal 100% for positive values", () => {
    const cost = 3;
    const sale = 10;
    const fc = foodCostPct(cost, sale);
    const mp = marginPct(sale, cost);
    expect(fc + mp).toBe(100);
  });
});

// ── salePriceFromFoodCost ───────────────────────────────────

describe("salePriceFromFoodCost", () => {
  it("calculates correct sale price", () => {
    // cost=3, target food cost=30% → sale = 3/0.30 = 10
    expect(salePriceFromFoodCost(3, 30)).toBe(10);
    expect(salePriceFromFoodCost(4.5, 30)).toBe(15);
  });

  it("returns 0 for invalid target percentages", () => {
    expect(salePriceFromFoodCost(3, 0)).toBe(0);
    expect(salePriceFromFoodCost(3, -10)).toBe(0);
    expect(salePriceFromFoodCost(3, 100)).toBe(0);
    expect(salePriceFromFoodCost(3, 150)).toBe(0);
  });

  it("roundtrips with foodCostPct", () => {
    const cost = 4.5;
    const target = 30;
    const sale = salePriceFromFoodCost(cost, target);
    expect(foodCostPct(cost, sale)).toBe(target);
  });
});

// ── salePriceFromMargin ─────────────────────────────────────

describe("salePriceFromMargin", () => {
  it("calculates correct sale price", () => {
    // cost=3, target margin=70% → sale = 3/(1-0.70) = 10
    expect(salePriceFromMargin(3, 70)).toBe(10);
  });

  it("returns 0 for 100% margin (impossible)", () => {
    expect(salePriceFromMargin(3, 100)).toBe(0);
    expect(salePriceFromMargin(3, 150)).toBe(0);
  });

  it("handles 0% margin (cost = sale price)", () => {
    expect(salePriceFromMargin(5, 0)).toBe(5);
  });

  it("handles negative margin", () => {
    // cost=5, margin=-100% → sale = 5/(1-(-1)) = 5/2 = 2.5
    expect(salePriceFromMargin(5, -100)).toBe(2.5);
  });

  it("roundtrips with marginPct", () => {
    const cost = 3;
    const target = 70;
    const sale = salePriceFromMargin(cost, target);
    expect(marginPct(sale, cost)).toBe(target);
  });
});

// ── formatMoney ─────────────────────────────────────────────

describe("formatMoney", () => {
  it("formats EUR by default", () => {
    const result = formatMoney(10.5);
    expect(result).toContain("10,50");
    expect(result).toContain("€");
  });

  it("formats USD", () => {
    const result = formatMoney(10.5, "USD", "en-US");
    expect(result).toContain("10.50");
    expect(result).toContain("$");
  });

  it("handles zero", () => {
    const result = formatMoney(0);
    expect(result).toContain("0,00");
  });

  it("handles negative amounts", () => {
    const result = formatMoney(-5.99);
    expect(result).toContain("5,99");
  });
});

// ── formatPct ───────────────────────────────────────────────

describe("formatPct", () => {
  it("formats with 1 decimal by default", () => {
    expect(formatPct(30.456)).toBe("30.5%");
    expect(formatPct(100)).toBe("100%");
    expect(formatPct(0)).toBe("0%");
  });

  it("formats with custom decimals", () => {
    expect(formatPct(33.333, 2)).toBe("33.33%");
    expect(formatPct(33.333, 0)).toBe("33%");
  });
});

// ── clamp ───────────────────────────────────────────────────

describe("clamp", () => {
  it("clamps within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles edge values", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });
});
