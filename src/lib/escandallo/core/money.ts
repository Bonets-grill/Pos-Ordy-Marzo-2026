// ============================================================
// ESCANDALLO CORE — Monetary & Rounding Utilities
// Module 1: Core Foundation
// ============================================================

import type { Currency } from "./types";

/** Decimal places per currency */
const CURRENCY_DECIMALS: Record<Currency, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  MXN: 2,
};

/**
 * Round a number to N decimal places using banker's rounding.
 * Default: 2 decimals for monetary values.
 */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Round to 4 decimals — for intermediate cost calculations
 * to avoid accumulated rounding errors.
 */
export function roundCost(value: number): number {
  return round(value, 4);
}

/**
 * Round to currency precision (final display values).
 */
export function roundCurrency(value: number, currency: Currency = "EUR"): number {
  return round(value, CURRENCY_DECIMALS[currency]);
}

/**
 * Calculate percentage: (part / whole) * 100
 * Returns 0 if whole is 0 to avoid division by zero.
 */
export function pct(part: number, whole: number): number {
  if (whole === 0) return 0;
  return round((part / whole) * 100, 2);
}

/**
 * Food cost percentage = (cost / sale_price) * 100
 */
export function foodCostPct(cost: number, salePrice: number): number {
  return pct(cost, salePrice);
}

/**
 * Gross margin = sale_price - cost
 */
export function grossMargin(salePrice: number, cost: number): number {
  return roundCurrency(salePrice - cost);
}

/**
 * Margin percentage = ((sale_price - cost) / sale_price) * 100
 */
export function marginPct(salePrice: number, cost: number): number {
  return pct(salePrice - cost, salePrice);
}

/**
 * Calculate sale price from cost and desired food cost %.
 * sale_price = cost / (target_food_cost_pct / 100)
 */
export function salePriceFromFoodCost(cost: number, targetFoodCostPct: number): number {
  if (targetFoodCostPct <= 0 || targetFoodCostPct >= 100) return 0;
  return roundCurrency(cost / (targetFoodCostPct / 100));
}

/**
 * Calculate sale price from cost and desired margin %.
 * sale_price = cost / (1 - target_margin_pct / 100)
 */
export function salePriceFromMargin(cost: number, targetMarginPct: number): number {
  if (targetMarginPct >= 100) return 0;
  return roundCurrency(cost / (1 - targetMarginPct / 100));
}

/**
 * Format a number as currency string.
 * Uses the browser's Intl.NumberFormat for locale-aware formatting.
 */
export function formatMoney(amount: number, currency: Currency = "EUR", locale = "es-ES"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: CURRENCY_DECIMALS[currency],
    maximumFractionDigits: CURRENCY_DECIMALS[currency],
  }).format(amount);
}

/**
 * Format a percentage value for display.
 */
export function formatPct(value: number, decimals = 1): string {
  return `${round(value, decimals)}%`;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
