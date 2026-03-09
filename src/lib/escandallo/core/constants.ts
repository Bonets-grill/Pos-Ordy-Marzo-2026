// ============================================================
// ESCANDALLO CORE — Business Constants
// Module 1: Core Foundation
// ============================================================

import type { RecipeCategory, AlertType, AlertSeverity } from "./types";

/** Default thresholds for alerts */
export const ALERT_THRESHOLDS = {
  /** Food cost above this % triggers warning */
  FOOD_COST_WARNING: 30,
  /** Food cost above this % triggers critical */
  FOOD_COST_CRITICAL: 40,
  /** Margin below this % triggers warning */
  MARGIN_WARNING: 60,
  /** Margin below this % triggers critical */
  MARGIN_CRITICAL: 50,
  /** Price increase above this % triggers alert */
  PRICE_INCREASE_WARNING: 10,
  /** Price increase above this % triggers critical */
  PRICE_INCREASE_CRITICAL: 25,
} as const;

/** Recipe category display labels (i18n keys) */
export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  starter: "esc.cat.starter",
  main: "esc.cat.main",
  dessert: "esc.cat.dessert",
  side: "esc.cat.side",
  beverage: "esc.cat.beverage",
  sauce: "esc.cat.sauce",
  base: "esc.cat.base",
  bread: "esc.cat.bread",
  other: "esc.cat.other",
};

/** Alert type display labels (i18n keys) */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  price_increase: "esc.alert.price_increase",
  low_margin: "esc.alert.low_margin",
  high_food_cost: "esc.alert.high_food_cost",
  critical_ingredient: "esc.alert.critical_ingredient",
  unprofitable_recipe: "esc.alert.unprofitable_recipe",
};

/** Alert severity colors */
export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: "var(--info)",
  warning: "var(--warning)",
  critical: "var(--danger)",
};

/** Food cost health indicator */
export function getFoodCostHealth(foodCostPct: number): {
  label: string;
  color: string;
  severity: AlertSeverity;
} {
  if (foodCostPct <= ALERT_THRESHOLDS.FOOD_COST_WARNING) {
    return { label: "esc.health.good", color: "var(--success)", severity: "info" };
  }
  if (foodCostPct <= ALERT_THRESHOLDS.FOOD_COST_CRITICAL) {
    return { label: "esc.health.warning", color: "var(--warning)", severity: "warning" };
  }
  return { label: "esc.health.critical", color: "var(--danger)", severity: "critical" };
}

/** Margin health indicator */
export function getMarginHealth(marginPct: number): {
  label: string;
  color: string;
  severity: AlertSeverity;
} {
  if (marginPct >= ALERT_THRESHOLDS.MARGIN_WARNING) {
    return { label: "esc.health.good", color: "var(--success)", severity: "info" };
  }
  if (marginPct >= ALERT_THRESHOLDS.MARGIN_CRITICAL) {
    return { label: "esc.health.warning", color: "var(--warning)", severity: "warning" };
  }
  return { label: "esc.health.critical", color: "var(--danger)", severity: "critical" };
}

/** Default pagination */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
