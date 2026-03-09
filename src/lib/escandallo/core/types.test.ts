import { describe, it, expect } from "vitest";

/**
 * Type-level tests — these verify that the type system is consistent.
 * They import types and ensure they exist and are structurally sound.
 * If any type is missing or has wrong structure, TypeScript will catch it at compile time.
 */

import type {
  UUID, Timestamp, Currency, UnitOfMeasure, UnitCategory,
  EntityStatus, AlertSeverity, AlertType, RecipeCategory, MovementType,
  TenantScoped, Ingredient, Supplier, Recipe, RecipeIngredient,
  RecipeSubrecipe, CostSnapshot, IngredientCostDetail, SubrecipeCostDetail,
  InventoryItem, InventoryMovement, CostAlert, SimulationRun,
  RecipeCostBreakdown, ServiceResult, PaginationParams, PaginatedResult, ListFilter,
} from "./types";

describe("Type exports exist (compile-time verification)", () => {
  it("all base types are defined", () => {
    // These pass if TypeScript can resolve the imports above
    const currency: Currency = "EUR";
    const unit: UnitOfMeasure = "kg";
    const cat: UnitCategory = "weight";
    const status: EntityStatus = "active";
    const severity: AlertSeverity = "warning";
    const alertType: AlertType = "low_margin";
    const recipeCat: RecipeCategory = "main";
    const movType: MovementType = "purchase";

    expect(currency).toBe("EUR");
    expect(unit).toBe("kg");
    expect(cat).toBe("weight");
    expect(status).toBe("active");
    expect(severity).toBe("warning");
    expect(alertType).toBe("low_margin");
    expect(recipeCat).toBe("main");
    expect(movType).toBe("purchase");
  });

  it("Currency covers all supported currencies", () => {
    const currencies: Currency[] = ["EUR", "USD", "GBP", "MXN"];
    expect(currencies).toHaveLength(4);
  });

  it("UnitOfMeasure covers all units", () => {
    const units: UnitOfMeasure[] = [
      "kg", "g", "mg", "l", "ml", "cl",
      "unit", "portion", "dozen", "bunch", "slice", "sheet",
    ];
    expect(units).toHaveLength(12);
  });

  it("RecipeCategory covers all categories", () => {
    const cats: RecipeCategory[] = [
      "starter", "main", "dessert", "side", "beverage",
      "sauce", "base", "bread", "other",
    ];
    expect(cats).toHaveLength(9);
  });

  it("ServiceResult<T> has correct shape", () => {
    const ok: ServiceResult<string> = { ok: true, data: "hello" };
    const err: ServiceResult<string> = { ok: false, error: "fail", code: "NOT_FOUND" };
    expect(ok.ok).toBe(true);
    expect(err.ok).toBe(false);
  });

  it("PaginatedResult<T> has correct shape", () => {
    const result: PaginatedResult<string> = {
      items: ["a", "b"],
      total: 100,
      page: 1,
      per_page: 25,
      total_pages: 4,
    };
    expect(result.items).toHaveLength(2);
    expect(result.total_pages).toBe(4);
  });
});
