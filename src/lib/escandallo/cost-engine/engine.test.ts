import { describe, it, expect } from "vitest";
import {
  calcIngredientLineCost, calcSubrecipeLineCost,
  calculateRecipeCost, calculateMultipleRecipeCosts, priceChangeImpact,
} from "./engine";
import type { IngredientLine, SubrecipeLine, RecipeParams } from "./engine";

// ── Helpers ─────────────────────────────────────────────────

function makeIngredient(overrides: Partial<IngredientLine> = {}): IngredientLine {
  return {
    ingredient_id: "ing-1",
    ingredient_name: "Tomate",
    quantity: 1,
    unit: "kg",
    cost_per_unit: 2, // €/kg
    base_unit: "kg",
    waste_pct: 0,
    density: null,
    ...overrides,
  };
}

function makeSubrecipe(overrides: Partial<SubrecipeLine> = {}): SubrecipeLine {
  return {
    recipe_id: "sub-1",
    recipe_name: "Salsa Base",
    quantity: 1,
    unit: "kg",
    total_cost: 5, // total cost of the subrecipe
    yield_qty: 2,  // yields 2kg
    yield_unit: "kg",
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<RecipeParams> = {}): RecipeParams {
  return {
    recipe_id: "rec-1",
    recipe_name: "Hamburguesa Clasica",
    category: "main",
    portions: 1,
    sale_price: 12,
    target_margin_pct: 70,
    ingredients: [],
    subrecipes: [],
    ...overrides,
  };
}

// ── calcIngredientLineCost ──────────────────────────────────

describe("calcIngredientLineCost", () => {
  it("simple cost: 1kg at 2€/kg = 2€", () => {
    expect(calcIngredientLineCost(makeIngredient())).toBe(2);
  });

  it("quantity scaling: 0.5kg at 2€/kg = 1€", () => {
    expect(calcIngredientLineCost(makeIngredient({ quantity: 0.5 }))).toBe(1);
  });

  it("unit conversion: 500g at 2€/kg → 0.5kg * 2 = 1€", () => {
    expect(calcIngredientLineCost(makeIngredient({
      quantity: 500,
      unit: "g",
      base_unit: "kg",
      cost_per_unit: 2,
    }))).toBe(1);
  });

  it("waste adjustment: 1kg at 2€/kg with 10% waste → 1.111kg * 2 ≈ 2.2222€", () => {
    const cost = calcIngredientLineCost(makeIngredient({ waste_pct: 10 }));
    expect(cost).toBeCloseTo(2.2222, 3);
  });

  it("waste + unit conversion: 500g at 10€/kg with 20% waste", () => {
    // 500g → 0.5kg → waste: 0.5/(1-0.20) = 0.625kg → 0.625 * 10 = 6.25€
    const cost = calcIngredientLineCost(makeIngredient({
      quantity: 500,
      unit: "g",
      base_unit: "kg",
      cost_per_unit: 10,
      waste_pct: 20,
    }));
    expect(cost).toBe(6.25);
  });

  it("density conversion: 500ml of olive oil (0.92 g/ml) at 8€/kg", () => {
    // 500ml → 500*0.92 = 460g = 0.46kg → 0.46 * 8 = 3.68€
    const cost = calcIngredientLineCost(makeIngredient({
      quantity: 500,
      unit: "ml",
      base_unit: "kg",
      cost_per_unit: 8,
      density: 0.92,
    }));
    expect(cost).toBeCloseTo(3.68, 2);
  });

  it("incompatible units fallback: uses quantity as-is", () => {
    // unit → kg can't convert, so fallback: 5 * 2 = 10
    const cost = calcIngredientLineCost(makeIngredient({
      quantity: 5,
      unit: "unit",
      base_unit: "kg",
      cost_per_unit: 2,
    }));
    expect(cost).toBe(10);
  });

  it("zero quantity = zero cost", () => {
    expect(calcIngredientLineCost(makeIngredient({ quantity: 0 }))).toBe(0);
  });

  it("zero cost per unit = zero cost", () => {
    expect(calcIngredientLineCost(makeIngredient({ cost_per_unit: 0 }))).toBe(0);
  });
});

// ── calcSubrecipeLineCost ───────────────────────────────────

describe("calcSubrecipeLineCost", () => {
  it("proportional cost: 1kg of a 2kg yield at 5€ total = 2.5€", () => {
    expect(calcSubrecipeLineCost(makeSubrecipe())).toBe(2.5);
  });

  it("full yield: 2kg of a 2kg yield = 5€", () => {
    expect(calcSubrecipeLineCost(makeSubrecipe({ quantity: 2 }))).toBe(5);
  });

  it("half yield: 500g of a 2kg yield at 5€", () => {
    // 500g → convert to kg = 0.5kg → 0.5/2 * 5 = 1.25€
    expect(calcSubrecipeLineCost(makeSubrecipe({
      quantity: 500,
      unit: "g",
      yield_unit: "kg",
      yield_qty: 2,
      total_cost: 5,
    }))).toBe(1.25);
  });

  it("zero yield returns 0", () => {
    expect(calcSubrecipeLineCost(makeSubrecipe({ yield_qty: 0 }))).toBe(0);
  });

  it("negative yield returns 0", () => {
    expect(calcSubrecipeLineCost(makeSubrecipe({ yield_qty: -1 }))).toBe(0);
  });
});

// ── calculateRecipeCost ─────────────────────────────────────

describe("calculateRecipeCost", () => {
  it("empty recipe has zero cost", () => {
    const result = calculateRecipeCost(makeRecipe());
    expect(result.total_cost).toBe(0);
    expect(result.cost_per_portion).toBe(0);
    expect(result.food_cost_pct).toBe(0);
    expect(result.margin).toBe(12); // sale price - 0
    expect(result.margin_pct).toBe(100);
    expect(result.is_profitable).toBe(true);
  });

  it("single ingredient recipe", () => {
    const result = calculateRecipeCost(makeRecipe({
      sale_price: 10,
      target_margin_pct: 70,
      ingredients: [makeIngredient({ cost_per_unit: 3, quantity: 1 })],
    }));
    expect(result.total_cost).toBe(3);
    expect(result.cost_per_portion).toBe(3);
    expect(result.food_cost_pct).toBe(30);
    expect(result.margin).toBe(7);
    expect(result.margin_pct).toBe(70);
    expect(result.is_profitable).toBe(true);
  });

  it("multi-ingredient recipe sums costs", () => {
    const result = calculateRecipeCost(makeRecipe({
      sale_price: 15,
      ingredients: [
        makeIngredient({ ingredient_id: "1", cost_per_unit: 2, quantity: 1 }),  // 2€
        makeIngredient({ ingredient_id: "2", ingredient_name: "Lechuga", cost_per_unit: 1.5, quantity: 0.2 }),  // 0.3€
        makeIngredient({ ingredient_id: "3", ingredient_name: "Pan", cost_per_unit: 3, quantity: 0.15 }),  // 0.45€
      ],
    }));
    expect(result.total_cost).toBeCloseTo(2.75, 1);
    expect(result.ingredients).toHaveLength(3);
  });

  it("recipe with subrecipes", () => {
    const result = calculateRecipeCost(makeRecipe({
      sale_price: 20,
      ingredients: [makeIngredient({ cost_per_unit: 3, quantity: 1 })], // 3€
      subrecipes: [makeSubrecipe({ total_cost: 5, yield_qty: 2, quantity: 1 })], // 2.5€
    }));
    expect(result.total_cost).toBe(5.5); // 3 + 2.5
    expect(result.subrecipes).toHaveLength(1);
    expect(result.subrecipes[0].cost).toBe(2.5);
  });

  it("multi-portion recipe divides cost", () => {
    const result = calculateRecipeCost(makeRecipe({
      portions: 4,
      sale_price: 10,
      target_margin_pct: 60,
      ingredients: [makeIngredient({ cost_per_unit: 8, quantity: 1 })], // 8€ total
    }));
    expect(result.total_cost).toBe(8);
    expect(result.cost_per_portion).toBe(2); // 8/4
    expect(result.food_cost_pct).toBe(20);   // 2/10*100
    expect(result.margin_pct).toBe(80);       // (10-2)/10*100
    expect(result.is_profitable).toBe(true);  // 80% >= 60%
  });

  it("unprofitable recipe detected", () => {
    const result = calculateRecipeCost(makeRecipe({
      sale_price: 10,
      target_margin_pct: 70,
      ingredients: [makeIngredient({ cost_per_unit: 5, quantity: 1 })], // 5€
    }));
    expect(result.food_cost_pct).toBe(50);
    expect(result.margin_pct).toBe(50); // 50% < 70%
    expect(result.is_profitable).toBe(false);
  });

  it("zero sale price → food cost % = 0, margin = negative", () => {
    const result = calculateRecipeCost(makeRecipe({
      sale_price: 0,
      ingredients: [makeIngredient({ cost_per_unit: 3, quantity: 1 })],
    }));
    expect(result.food_cost_pct).toBe(0); // pct(3, 0) = 0
    expect(result.margin).toBe(-3);
  });

  it("zero portions → cost_per_portion = 0", () => {
    const result = calculateRecipeCost(makeRecipe({
      portions: 0,
      ingredients: [makeIngredient({ cost_per_unit: 5, quantity: 1 })],
    }));
    expect(result.cost_per_portion).toBe(0);
  });

  it("returns correct ingredient details", () => {
    const result = calculateRecipeCost(makeRecipe({
      ingredients: [makeIngredient({
        ingredient_id: "tomato-1",
        ingredient_name: "Tomate Cherry",
        quantity: 0.5,
        cost_per_unit: 4,
        waste_pct: 10,
      })],
    }));
    expect(result.ingredients[0].ingredient_id).toBe("tomato-1");
    expect(result.ingredients[0].ingredient_name).toBe("Tomate Cherry");
    expect(result.ingredients[0].quantity).toBe(0.5);
    expect(result.ingredients[0].waste_pct).toBe(10);
  });

  it("preserves recipe metadata", () => {
    const result = calculateRecipeCost(makeRecipe({
      recipe_id: "test-id",
      recipe_name: "Test Recipe",
      category: "dessert",
      portions: 2,
      sale_price: 8,
      target_margin_pct: 65,
    }));
    expect(result.recipe_id).toBe("test-id");
    expect(result.recipe_name).toBe("Test Recipe");
    expect(result.category).toBe("dessert");
    expect(result.portions).toBe(2);
    expect(result.sale_price).toBe(8);
    expect(result.target_margin_pct).toBe(65);
  });
});

// ── calculateMultipleRecipeCosts ────────────────────────────

describe("calculateMultipleRecipeCosts", () => {
  it("processes multiple recipes", () => {
    const results = calculateMultipleRecipeCosts([
      makeRecipe({ recipe_id: "r1", ingredients: [makeIngredient({ cost_per_unit: 3 })] }),
      makeRecipe({ recipe_id: "r2", ingredients: [makeIngredient({ cost_per_unit: 5 })] }),
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].total_cost).toBe(3);
    expect(results[1].total_cost).toBe(5);
  });

  it("handles empty array", () => {
    expect(calculateMultipleRecipeCosts([])).toEqual([]);
  });
});

// ── priceChangeImpact ───────────────────────────────────────

describe("priceChangeImpact", () => {
  it("calculates impact of price increase", () => {
    const recipes = [
      makeRecipe({
        recipe_id: "burger",
        recipe_name: "Burger",
        sale_price: 10,
        ingredients: [
          makeIngredient({ ingredient_id: "tomato", cost_per_unit: 2, quantity: 0.5 }),
          makeIngredient({ ingredient_id: "lettuce", cost_per_unit: 1, quantity: 0.2 }),
        ],
      }),
    ];

    const impact = priceChangeImpact(recipes, "tomato", 4); // double the price
    expect(impact).toHaveLength(1);
    expect(impact[0].recipe_id).toBe("burger");
    expect(impact[0].cost_delta).toBeGreaterThan(0);
    expect(impact[0].margin_delta).toBeLessThan(0); // margin decreases
    expect(impact[0].after.total_cost).toBeGreaterThan(impact[0].before.total_cost);
  });

  it("only affects recipes containing the ingredient", () => {
    const recipes = [
      makeRecipe({
        recipe_id: "r1",
        ingredients: [makeIngredient({ ingredient_id: "tomato" })],
      }),
      makeRecipe({
        recipe_id: "r2",
        ingredients: [makeIngredient({ ingredient_id: "lettuce" })],
      }),
    ];

    const impact = priceChangeImpact(recipes, "tomato", 10);
    expect(impact).toHaveLength(1);
    expect(impact[0].recipe_id).toBe("r1");
  });

  it("returns empty for ingredient not in any recipe", () => {
    const recipes = [
      makeRecipe({
        ingredients: [makeIngredient({ ingredient_id: "tomato" })],
      }),
    ];
    expect(priceChangeImpact(recipes, "truffle", 100)).toHaveLength(0);
  });

  it("price decrease improves margins", () => {
    const recipes = [
      makeRecipe({
        sale_price: 10,
        ingredients: [makeIngredient({ ingredient_id: "x", cost_per_unit: 5, quantity: 1 })],
      }),
    ];

    const impact = priceChangeImpact(recipes, "x", 2); // cheaper
    expect(impact[0].cost_delta).toBeLessThan(0);
    expect(impact[0].margin_delta).toBeGreaterThan(0);
  });
});

// ── Real-world scenario tests ───────────────────────────────

describe("Real-world scenarios", () => {
  it("Classic Burger with sub-recipes and waste", () => {
    const burger = makeRecipe({
      recipe_name: "Burger Premium",
      portions: 1,
      sale_price: 14.50,
      target_margin_pct: 65,
      ingredients: [
        makeIngredient({
          ingredient_id: "beef",
          ingredient_name: "Carne Vacuno",
          quantity: 200,
          unit: "g",
          base_unit: "kg",
          cost_per_unit: 12, // €/kg
          waste_pct: 5,
        }),
        makeIngredient({
          ingredient_id: "bun",
          ingredient_name: "Pan Brioche",
          quantity: 1,
          unit: "unit",
          base_unit: "unit",
          cost_per_unit: 0.45,
          waste_pct: 0,
        }),
        makeIngredient({
          ingredient_id: "cheese",
          ingredient_name: "Cheddar",
          quantity: 40,
          unit: "g",
          base_unit: "kg",
          cost_per_unit: 14, // €/kg
          waste_pct: 2,
        }),
        makeIngredient({
          ingredient_id: "lettuce",
          ingredient_name: "Lechuga",
          quantity: 30,
          unit: "g",
          base_unit: "kg",
          cost_per_unit: 3, // €/kg
          waste_pct: 15,
        }),
        makeIngredient({
          ingredient_id: "tomato",
          ingredient_name: "Tomate",
          quantity: 50,
          unit: "g",
          base_unit: "kg",
          cost_per_unit: 2.5,
          waste_pct: 10,
        }),
      ],
      subrecipes: [
        makeSubrecipe({
          recipe_name: "Salsa Burger",
          quantity: 30,
          unit: "g",
          total_cost: 2,    // the whole batch costs 2€
          yield_qty: 500,   // yields 500g
          yield_unit: "g",
        }),
      ],
    });

    const result = calculateRecipeCost(burger);

    // Manual checks:
    // Beef: 200g→0.2kg → waste 5%: 0.2/0.95=0.2105 → 0.2105*12=2.5263€
    // Bun: 1 unit * 0.45 = 0.45€
    // Cheese: 40g→0.04kg → waste 2%: 0.04/0.98=0.0408 → 0.0408*14=0.5714€
    // Lettuce: 30g→0.03kg → waste 15%: 0.03/0.85=0.0353 → 0.0353*3=0.1059€
    // Tomato: 50g→0.05kg → waste 10%: 0.05/0.90=0.0556 → 0.0556*2.5=0.1389€
    // Sauce: 30g/500g * 2€ = 0.12€
    // Total ≈ 3.92€

    expect(result.total_cost).toBeGreaterThan(3.5);
    expect(result.total_cost).toBeLessThan(4.5);
    expect(result.food_cost_pct).toBeGreaterThan(20);
    expect(result.food_cost_pct).toBeLessThan(35);
    expect(result.ingredients).toHaveLength(5);
    expect(result.subrecipes).toHaveLength(1);
    expect(result.is_profitable).toBeDefined();
  });

  it("Pizza with 8 portions from batch", () => {
    const pizza = makeRecipe({
      recipe_name: "Pizza Margherita",
      portions: 8,
      sale_price: 3.50, // per slice
      target_margin_pct: 60,
      ingredients: [
        makeIngredient({
          ingredient_name: "Harina",
          quantity: 500, unit: "g", base_unit: "kg",
          cost_per_unit: 1.2, waste_pct: 0,
        }),
        makeIngredient({
          ingredient_name: "Mozzarella",
          quantity: 250, unit: "g", base_unit: "kg",
          cost_per_unit: 8, waste_pct: 0,
        }),
        makeIngredient({
          ingredient_name: "Tomate Triturado",
          quantity: 200, unit: "ml", base_unit: "l",
          cost_per_unit: 1.5, waste_pct: 0,
        }),
      ],
    });

    const result = calculateRecipeCost(pizza);

    // Harina: 500g→0.5kg * 1.2 = 0.60
    // Mozzarella: 250g→0.25kg * 8 = 2.00
    // Tomate: 200ml→0.2L * 1.5 = 0.30
    // Total = 2.90, per portion = 2.90/8 = 0.3625

    expect(result.total_cost).toBeCloseTo(2.9, 1);
    expect(result.cost_per_portion).toBeCloseTo(0.36, 1);
    expect(result.food_cost_pct).toBeLessThan(15); // very profitable
    expect(result.is_profitable).toBe(true);
  });
});
