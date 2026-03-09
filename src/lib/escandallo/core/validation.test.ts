import { describe, it, expect } from "vitest";
import {
  required, minLength, maxLength, positiveNumber, positiveNonZero,
  percentage, validUnit, validEmail, validPhone,
  validateIngredient, validateSupplier, validateRecipe, validateRecipeIngredient,
  collect,
} from "./validation";

// ── Field validators ────────────────────────────────────────

describe("required", () => {
  it("returns error for null/undefined/empty", () => {
    expect(required("name", null)).not.toBeNull();
    expect(required("name", undefined)).not.toBeNull();
    expect(required("name", "")).not.toBeNull();
  });

  it("passes for valid values", () => {
    expect(required("name", "hello")).toBeNull();
    expect(required("name", 0)).toBeNull();
    expect(required("name", false)).toBeNull();
  });
});

describe("minLength", () => {
  it("fails for short strings", () => {
    expect(minLength("name", "a", 2)).not.toBeNull();
    expect(minLength("name", "", 1)).not.toBeNull();
  });

  it("passes for valid strings", () => {
    expect(minLength("name", "ab", 2)).toBeNull();
    expect(minLength("name", "abc", 2)).toBeNull();
  });
});

describe("maxLength", () => {
  it("fails for long strings", () => {
    expect(maxLength("name", "abc", 2)).not.toBeNull();
  });

  it("passes for valid strings", () => {
    expect(maxLength("name", "ab", 2)).toBeNull();
    expect(maxLength("name", "a", 2)).toBeNull();
  });
});

describe("positiveNumber", () => {
  it("fails for negative numbers", () => {
    expect(positiveNumber("cost", -1)).not.toBeNull();
  });

  it("fails for NaN", () => {
    expect(positiveNumber("cost", NaN)).not.toBeNull();
  });

  it("fails for non-numbers", () => {
    expect(positiveNumber("cost", "abc" as unknown as number)).not.toBeNull();
  });

  it("passes for 0 and positive", () => {
    expect(positiveNumber("cost", 0)).toBeNull();
    expect(positiveNumber("cost", 10)).toBeNull();
    expect(positiveNumber("cost", 0.01)).toBeNull();
  });
});

describe("positiveNonZero", () => {
  it("fails for 0", () => {
    expect(positiveNonZero("qty", 0)).not.toBeNull();
  });

  it("fails for negative", () => {
    expect(positiveNonZero("qty", -1)).not.toBeNull();
  });

  it("passes for positive", () => {
    expect(positiveNonZero("qty", 0.001)).toBeNull();
    expect(positiveNonZero("qty", 100)).toBeNull();
  });
});

describe("percentage", () => {
  it("fails for values outside 0-100", () => {
    expect(percentage("waste", -1)).not.toBeNull();
    expect(percentage("waste", 101)).not.toBeNull();
    expect(percentage("waste", NaN)).not.toBeNull();
  });

  it("passes for valid percentages", () => {
    expect(percentage("waste", 0)).toBeNull();
    expect(percentage("waste", 50)).toBeNull();
    expect(percentage("waste", 100)).toBeNull();
  });
});

describe("validUnit", () => {
  it("fails for invalid units", () => {
    expect(validUnit("unit", "liters")).not.toBeNull();
    expect(validUnit("unit", "oz")).not.toBeNull();
    expect(validUnit("unit", "")).not.toBeNull();
  });

  it("passes for valid units", () => {
    expect(validUnit("unit", "kg")).toBeNull();
    expect(validUnit("unit", "g")).toBeNull();
    expect(validUnit("unit", "ml")).toBeNull();
    expect(validUnit("unit", "unit")).toBeNull();
    expect(validUnit("unit", "dozen")).toBeNull();
  });
});

describe("validEmail", () => {
  it("fails for invalid emails", () => {
    expect(validEmail("email", "notanemail")).not.toBeNull();
    expect(validEmail("email", "missing@")).not.toBeNull();
    expect(validEmail("email", "@nodomain.com")).not.toBeNull();
  });

  it("passes for valid emails", () => {
    expect(validEmail("email", "test@example.com")).toBeNull();
    expect(validEmail("email", "user+tag@domain.co")).toBeNull();
  });

  it("passes for empty string (optional field)", () => {
    expect(validEmail("email", "")).toBeNull();
  });
});

describe("validPhone", () => {
  it("fails for invalid phones", () => {
    expect(validPhone("phone", "abc")).not.toBeNull();
    expect(validPhone("phone", "12345")).not.toBeNull(); // too short
  });

  it("passes for valid phones", () => {
    expect(validPhone("phone", "+34 612 345 678")).toBeNull();
    expect(validPhone("phone", "612345678")).toBeNull();
    expect(validPhone("phone", "(555) 123-4567")).toBeNull();
  });

  it("passes for empty string (optional field)", () => {
    expect(validPhone("phone", "")).toBeNull();
  });
});

// ── Entity validators ───────────────────────────────────────

describe("validateIngredient", () => {
  it("valid ingredient passes", () => {
    const result = validateIngredient({
      name: "Tomate",
      unit: "kg",
      cost_per_unit: 2.5,
      waste_pct: 10,
      status: "active",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("missing name fails", () => {
    const result = validateIngredient({ unit: "kg" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("missing unit fails", () => {
    const result = validateIngredient({ name: "Tomate" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "unit")).toBe(true);
  });

  it("short name fails (< 2 chars)", () => {
    const result = validateIngredient({ name: "T", unit: "kg" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("invalid unit fails", () => {
    const result = validateIngredient({ name: "Tomate", unit: "ounces" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "unit")).toBe(true);
  });

  it("negative cost fails", () => {
    const result = validateIngredient({ name: "Tomate", unit: "kg", cost_per_unit: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "cost_per_unit")).toBe(true);
  });

  it("waste > 100 fails", () => {
    const result = validateIngredient({ name: "Tomate", unit: "kg", waste_pct: 110 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "waste_pct")).toBe(true);
  });

  it("invalid status fails", () => {
    const result = validateIngredient({ name: "Tomate", unit: "kg", status: "deleted" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "status")).toBe(true);
  });

  it("collects multiple errors", () => {
    const result = validateIngredient({ cost_per_unit: -1, waste_pct: 150 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3); // name + unit + cost + waste
  });
});

describe("validateSupplier", () => {
  it("valid supplier passes", () => {
    const result = validateSupplier({
      name: "Proveedor Central",
      email: "info@proveedor.com",
      phone: "+34 612 345 678",
    });
    expect(result.valid).toBe(true);
  });

  it("missing name fails", () => {
    const result = validateSupplier({});
    expect(result.valid).toBe(false);
  });

  it("short name fails", () => {
    const result = validateSupplier({ name: "A" });
    expect(result.valid).toBe(false);
  });

  it("invalid email fails", () => {
    const result = validateSupplier({ name: "Test Supplier", email: "bademail" });
    expect(result.valid).toBe(false);
  });

  it("invalid phone fails", () => {
    const result = validateSupplier({ name: "Test Supplier", phone: "abc" });
    expect(result.valid).toBe(false);
  });
});

describe("validateRecipe", () => {
  it("valid recipe passes", () => {
    const result = validateRecipe({
      name: "Hamburguesa Clasica",
      category: "main",
      portions: 1,
      sale_price: 12.5,
      target_margin_pct: 70,
      yield_qty: 1,
    });
    expect(result.valid).toBe(true);
  });

  it("missing name fails", () => {
    const result = validateRecipe({});
    expect(result.valid).toBe(false);
  });

  it("invalid category fails", () => {
    const result = validateRecipe({ name: "Test", category: "snacks" });
    expect(result.valid).toBe(false);
  });

  it("zero portions fails", () => {
    const result = validateRecipe({ name: "Test", portions: 0 });
    expect(result.valid).toBe(false);
  });

  it("negative sale price fails", () => {
    const result = validateRecipe({ name: "Test", sale_price: -5 });
    expect(result.valid).toBe(false);
  });

  it("margin > 100 fails", () => {
    const result = validateRecipe({ name: "Test", target_margin_pct: 110 });
    expect(result.valid).toBe(false);
  });

  it("zero yield fails", () => {
    const result = validateRecipe({ name: "Test", yield_qty: 0 });
    expect(result.valid).toBe(false);
  });
});

describe("validateRecipeIngredient", () => {
  it("valid recipe ingredient passes", () => {
    const result = validateRecipeIngredient({
      ingredient_id: "uuid-123",
      quantity: 0.5,
      unit: "kg",
    });
    expect(result.valid).toBe(true);
  });

  it("missing ingredient_id fails", () => {
    const result = validateRecipeIngredient({ quantity: 1, unit: "kg" });
    expect(result.valid).toBe(false);
  });

  it("missing quantity fails", () => {
    const result = validateRecipeIngredient({ ingredient_id: "uuid-123", unit: "kg" });
    expect(result.valid).toBe(false);
  });

  it("zero quantity fails", () => {
    const result = validateRecipeIngredient({
      ingredient_id: "uuid-123",
      quantity: 0,
      unit: "kg",
    });
    expect(result.valid).toBe(false);
  });

  it("missing unit fails", () => {
    const result = validateRecipeIngredient({
      ingredient_id: "uuid-123",
      quantity: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("invalid unit fails", () => {
    const result = validateRecipeIngredient({
      ingredient_id: "uuid-123",
      quantity: 1,
      unit: "cups",
    });
    expect(result.valid).toBe(false);
  });
});

// ── collect helper ──────────────────────────────────────────

describe("collect", () => {
  it("returns ok when all null", () => {
    const result = collect(null, null, null);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("collects non-null errors", () => {
    const result = collect(
      null,
      { field: "name", message: "required" },
      null,
      { field: "unit", message: "invalid" }
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
