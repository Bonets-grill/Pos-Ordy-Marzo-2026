// ============================================================
// ESCANDALLO CORE — Validation Utilities
// Module 1: Core Foundation
// ============================================================

import type { UnitOfMeasure, EntityStatus, RecipeCategory } from "./types";
import { ALL_UNITS } from "./units";

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

function err(field: string, message: string): ValidationError {
  return { field, message };
}

// ── Field validators ────────────────────────────────────────

export function required(field: string, value: unknown): ValidationError | null {
  if (value === null || value === undefined || value === "") {
    return err(field, `${field} is required`);
  }
  return null;
}

export function minLength(field: string, value: string, min: number): ValidationError | null {
  if (value.length < min) {
    return err(field, `${field} must be at least ${min} characters`);
  }
  return null;
}

export function maxLength(field: string, value: string, max: number): ValidationError | null {
  if (value.length > max) {
    return err(field, `${field} must be at most ${max} characters`);
  }
  return null;
}

export function positiveNumber(field: string, value: number): ValidationError | null {
  if (typeof value !== "number" || isNaN(value) || value < 0) {
    return err(field, `${field} must be a positive number`);
  }
  return null;
}

export function positiveNonZero(field: string, value: number): ValidationError | null {
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    return err(field, `${field} must be greater than 0`);
  }
  return null;
}

export function percentage(field: string, value: number): ValidationError | null {
  if (typeof value !== "number" || isNaN(value) || value < 0 || value > 100) {
    return err(field, `${field} must be between 0 and 100`);
  }
  return null;
}

export function validUnit(field: string, value: string): ValidationError | null {
  if (!ALL_UNITS.includes(value as UnitOfMeasure)) {
    return err(field, `${field} must be a valid unit of measure`);
  }
  return null;
}

export function validEmail(field: string, value: string): ValidationError | null {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return err(field, `${field} must be a valid email`);
  }
  return null;
}

export function validPhone(field: string, value: string): ValidationError | null {
  if (value && !/^[+]?[\d\s()-]{6,20}$/.test(value)) {
    return err(field, `${field} must be a valid phone number`);
  }
  return null;
}

// ── Entity validators ───────────────────────────────────────

const VALID_STATUSES: EntityStatus[] = ["active", "inactive", "archived"];
const VALID_CATEGORIES: RecipeCategory[] = [
  "starter", "main", "dessert", "side", "beverage", "sauce", "base", "bread", "other",
];

export function validateIngredient(data: {
  name?: string;
  unit?: string;
  cost_per_unit?: number;
  waste_pct?: number;
  status?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const r1 = required("name", data.name);
  if (r1) errors.push(r1);
  else if (data.name) {
    const m = minLength("name", data.name, 2);
    if (m) errors.push(m);
  }

  const r2 = required("unit", data.unit);
  if (r2) errors.push(r2);
  else if (data.unit) {
    const u = validUnit("unit", data.unit);
    if (u) errors.push(u);
  }

  if (data.cost_per_unit !== undefined) {
    const p = positiveNumber("cost_per_unit", data.cost_per_unit);
    if (p) errors.push(p);
  }

  if (data.waste_pct !== undefined) {
    const w = percentage("waste_pct", data.waste_pct);
    if (w) errors.push(w);
  }

  if (data.status && !VALID_STATUSES.includes(data.status as EntityStatus)) {
    errors.push(err("status", "Invalid status"));
  }

  return errors.length ? fail(errors) : ok();
}

export function validateSupplier(data: {
  name?: string;
  email?: string;
  phone?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const r1 = required("name", data.name);
  if (r1) errors.push(r1);
  else if (data.name) {
    const m = minLength("name", data.name, 2);
    if (m) errors.push(m);
  }

  if (data.email) {
    const e = validEmail("email", data.email);
    if (e) errors.push(e);
  }

  if (data.phone) {
    const p = validPhone("phone", data.phone);
    if (p) errors.push(p);
  }

  return errors.length ? fail(errors) : ok();
}

export function validateRecipe(data: {
  name?: string;
  category?: string;
  portions?: number;
  sale_price?: number;
  target_margin_pct?: number;
  yield_qty?: number;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const r1 = required("name", data.name);
  if (r1) errors.push(r1);

  if (data.category && !VALID_CATEGORIES.includes(data.category as RecipeCategory)) {
    errors.push(err("category", "Invalid recipe category"));
  }

  if (data.portions !== undefined) {
    const p = positiveNonZero("portions", data.portions);
    if (p) errors.push(p);
  }

  if (data.sale_price !== undefined) {
    const s = positiveNumber("sale_price", data.sale_price);
    if (s) errors.push(s);
  }

  if (data.target_margin_pct !== undefined) {
    const m = percentage("target_margin_pct", data.target_margin_pct);
    if (m) errors.push(m);
  }

  if (data.yield_qty !== undefined) {
    const y = positiveNonZero("yield_qty", data.yield_qty);
    if (y) errors.push(y);
  }

  return errors.length ? fail(errors) : ok();
}

export function validateRecipeIngredient(data: {
  ingredient_id?: string;
  quantity?: number;
  unit?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const r1 = required("ingredient_id", data.ingredient_id);
  if (r1) errors.push(r1);

  if (data.quantity !== undefined) {
    const q = positiveNonZero("quantity", data.quantity);
    if (q) errors.push(q);
  } else {
    errors.push(err("quantity", "quantity is required"));
  }

  const r2 = required("unit", data.unit);
  if (r2) errors.push(r2);
  else if (data.unit) {
    const u = validUnit("unit", data.unit);
    if (u) errors.push(u);
  }

  return errors.length ? fail(errors) : ok();
}

// ── Helper ──────────────────────────────────────────────────

/** Collect errors from multiple nullable ValidationError values */
export function collect(...checks: (ValidationError | null)[]): ValidationResult {
  const errors = checks.filter((e): e is ValidationError => e !== null);
  return errors.length ? fail(errors) : ok();
}
