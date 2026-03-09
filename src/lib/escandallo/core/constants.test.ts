import { describe, it, expect } from "vitest";
import {
  ALERT_THRESHOLDS, getFoodCostHealth, getMarginHealth,
  RECIPE_CATEGORY_LABELS, ALERT_TYPE_LABELS, ALERT_SEVERITY_COLORS,
  DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
} from "./constants";

// ── ALERT_THRESHOLDS consistency ────────────────────────────

describe("ALERT_THRESHOLDS", () => {
  it("food cost warning < critical", () => {
    expect(ALERT_THRESHOLDS.FOOD_COST_WARNING).toBeLessThan(ALERT_THRESHOLDS.FOOD_COST_CRITICAL);
  });

  it("margin warning > critical (higher is better for margin)", () => {
    expect(ALERT_THRESHOLDS.MARGIN_WARNING).toBeGreaterThan(ALERT_THRESHOLDS.MARGIN_CRITICAL);
  });

  it("price increase warning < critical", () => {
    expect(ALERT_THRESHOLDS.PRICE_INCREASE_WARNING).toBeLessThan(ALERT_THRESHOLDS.PRICE_INCREASE_CRITICAL);
  });

  it("all thresholds are positive numbers", () => {
    Object.values(ALERT_THRESHOLDS).forEach((v) => {
      expect(v).toBeGreaterThan(0);
    });
  });
});

// ── getFoodCostHealth ───────────────────────────────────────

describe("getFoodCostHealth", () => {
  it("good health when food cost <= 30%", () => {
    const result = getFoodCostHealth(25);
    expect(result.severity).toBe("info");
    expect(result.label).toContain("good");
  });

  it("good at exactly 30% (threshold boundary)", () => {
    const result = getFoodCostHealth(30);
    expect(result.severity).toBe("info");
  });

  it("warning when food cost 31-40%", () => {
    const result = getFoodCostHealth(35);
    expect(result.severity).toBe("warning");
    expect(result.label).toContain("warning");
  });

  it("warning at exactly 40%", () => {
    const result = getFoodCostHealth(40);
    expect(result.severity).toBe("warning");
  });

  it("critical when food cost > 40%", () => {
    const result = getFoodCostHealth(45);
    expect(result.severity).toBe("critical");
    expect(result.label).toContain("critical");
  });

  it("critical for extreme values", () => {
    expect(getFoodCostHealth(80).severity).toBe("critical");
    expect(getFoodCostHealth(100).severity).toBe("critical");
  });

  it("good for 0% food cost", () => {
    expect(getFoodCostHealth(0).severity).toBe("info");
  });
});

// ── getMarginHealth ─────────────────────────────────────────

describe("getMarginHealth", () => {
  it("good health when margin >= 60%", () => {
    const result = getMarginHealth(70);
    expect(result.severity).toBe("info");
    expect(result.label).toContain("good");
  });

  it("good at exactly 60%", () => {
    expect(getMarginHealth(60).severity).toBe("info");
  });

  it("warning when margin 50-59%", () => {
    const result = getMarginHealth(55);
    expect(result.severity).toBe("warning");
  });

  it("warning at exactly 50%", () => {
    expect(getMarginHealth(50).severity).toBe("warning");
  });

  it("critical when margin < 50%", () => {
    const result = getMarginHealth(40);
    expect(result.severity).toBe("critical");
    expect(result.label).toContain("critical");
  });

  it("critical for negative margins", () => {
    expect(getMarginHealth(-10).severity).toBe("critical");
  });

  it("good for 100% margin", () => {
    expect(getMarginHealth(100).severity).toBe("info");
  });
});

// ── Labels completeness ─────────────────────────────────────

describe("RECIPE_CATEGORY_LABELS", () => {
  it("has all 9 categories", () => {
    const categories = ["starter", "main", "dessert", "side", "beverage", "sauce", "base", "bread", "other"];
    categories.forEach((cat) => {
      expect(RECIPE_CATEGORY_LABELS[cat as keyof typeof RECIPE_CATEGORY_LABELS]).toBeDefined();
    });
  });

  it("all labels are i18n keys", () => {
    Object.values(RECIPE_CATEGORY_LABELS).forEach((label) => {
      expect(label).toMatch(/^esc\./);
    });
  });
});

describe("ALERT_TYPE_LABELS", () => {
  it("has all 5 alert types", () => {
    const types = ["price_increase", "low_margin", "high_food_cost", "critical_ingredient", "unprofitable_recipe"];
    types.forEach((t) => {
      expect(ALERT_TYPE_LABELS[t as keyof typeof ALERT_TYPE_LABELS]).toBeDefined();
    });
  });
});

describe("ALERT_SEVERITY_COLORS", () => {
  it("has all 3 severity levels", () => {
    expect(ALERT_SEVERITY_COLORS.info).toBeDefined();
    expect(ALERT_SEVERITY_COLORS.warning).toBeDefined();
    expect(ALERT_SEVERITY_COLORS.critical).toBeDefined();
  });

  it("uses CSS variables", () => {
    Object.values(ALERT_SEVERITY_COLORS).forEach((color) => {
      expect(color).toMatch(/^var\(--/);
    });
  });
});

// ── Pagination constants ────────────────────────────────────

describe("Pagination constants", () => {
  it("DEFAULT_PAGE_SIZE is reasonable", () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(50);
  });

  it("MAX_PAGE_SIZE > DEFAULT_PAGE_SIZE", () => {
    expect(MAX_PAGE_SIZE).toBeGreaterThan(DEFAULT_PAGE_SIZE);
  });
});
