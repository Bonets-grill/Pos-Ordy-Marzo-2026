/**
 * Deterministic assertion library for inspection scenarios.
 * Each assertion produces a structured result — never throws.
 * Used by scenario executors to validate expected behavior.
 */

import type { AssertionResult, Severity } from "./types";

function result(passed: boolean, description: string, severity: Severity, expected?: unknown, actual?: unknown): AssertionResult {
  return { passed, description, severity, expected, actual };
}

// ─── Equality ───────────────────────────────────────────

export function assertEqual(actual: unknown, expected: unknown, description: string, severity: Severity = "high"): AssertionResult {
  return result(actual === expected, description, severity, expected, actual);
}

export function assertDeepEqual(actual: unknown, expected: unknown, description: string, severity: Severity = "high"): AssertionResult {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  return result(passed, description, severity, expected, actual);
}

export function assertNotEqual(actual: unknown, notExpected: unknown, description: string, severity: Severity = "high"): AssertionResult {
  return result(actual !== notExpected, description, severity, `not ${String(notExpected)}`, actual);
}

// ─── Existence ──────────────────────────────────────────

export function assertNotNull(value: unknown, description: string, severity: Severity = "critical"): AssertionResult {
  return result(value !== null && value !== undefined, description, severity, "non-null", value);
}

export function assertNull(value: unknown, description: string, severity: Severity = "high"): AssertionResult {
  return result(value === null || value === undefined, description, severity, "null/undefined", value);
}

export function assertTruthy(value: unknown, description: string, severity: Severity = "high"): AssertionResult {
  return result(!!value, description, severity, "truthy", value);
}

export function assertFalsy(value: unknown, description: string, severity: Severity = "high"): AssertionResult {
  return result(!value, description, severity, "falsy", value);
}

// ─── Numeric ────────────────────────────────────────────

export function assertGreaterThan(actual: number, min: number, description: string, severity: Severity = "high"): AssertionResult {
  return result(actual > min, description, severity, `> ${min}`, actual);
}

export function assertGreaterOrEqual(actual: number, min: number, description: string, severity: Severity = "high"): AssertionResult {
  return result(actual >= min, description, severity, `>= ${min}`, actual);
}

export function assertLessThan(actual: number, max: number, description: string, severity: Severity = "high"): AssertionResult {
  return result(actual < max, description, severity, `< ${max}`, actual);
}

export function assertWithinTolerance(actual: number, expected: number, tolerance: number, description: string, severity: Severity = "critical"): AssertionResult {
  const diff = Math.abs(actual - expected);
  return result(diff <= tolerance, description, severity, `${expected} ± ${tolerance}`, `${actual} (diff: ${diff.toFixed(4)})`);
}

export function assertZero(actual: number, description: string, severity: Severity = "critical"): AssertionResult {
  return result(actual === 0, description, severity, 0, actual);
}

// ─── Collections ────────────────────────────────────────

export function assertInSet<T>(value: T, validSet: T[], description: string, severity: Severity = "high"): AssertionResult {
  return result(validSet.includes(value), description, severity, `one of [${validSet.join(", ")}]`, value);
}

export function assertArrayLength(arr: unknown[], expected: number, description: string, severity: Severity = "high"): AssertionResult {
  return result(arr.length === expected, description, severity, expected, arr.length);
}

export function assertArrayMinLength(arr: unknown[], min: number, description: string, severity: Severity = "high"): AssertionResult {
  return result(arr.length >= min, description, severity, `>= ${min}`, arr.length);
}

export function assertEmpty(arr: unknown[], description: string, severity: Severity = "critical"): AssertionResult {
  return result(arr.length === 0, description, severity, "empty (0)", arr.length);
}

export function assertNotEmpty(arr: unknown[], description: string, severity: Severity = "high"): AssertionResult {
  return result(arr.length > 0, description, severity, "> 0", arr.length);
}

// ─── Uniqueness ─────────────────────────────────────────

export function assertUnique(values: unknown[], description: string, severity: Severity = "critical"): AssertionResult {
  const set = new Set(values);
  const dupes = values.length - set.size;
  return result(dupes === 0, description, severity, "0 duplicates", `${dupes} duplicates`);
}

// ─── String ─────────────────────────────────────────────

export function assertContains(haystack: string, needle: string, description: string, severity: Severity = "medium"): AssertionResult {
  return result(haystack.includes(needle), description, severity, `contains "${needle}"`, haystack.substring(0, 100));
}

export function assertMatches(value: string, pattern: RegExp, description: string, severity: Severity = "medium"): AssertionResult {
  return result(pattern.test(value), description, severity, `matches ${pattern}`, value.substring(0, 100));
}

// ─── HTTP ───────────────────────────────────────────────

export function assertHttpStatus(actual: number, expected: number, description: string, severity: Severity = "critical"): AssertionResult {
  return result(actual === expected, description, severity, `HTTP ${expected}`, `HTTP ${actual}`);
}

export function assertHttpOk(actual: number, description: string, severity: Severity = "critical"): AssertionResult {
  return result(actual >= 200 && actual < 300, description, severity, "HTTP 2xx", `HTTP ${actual}`);
}

// ─── Consistency ────────────────────────────────────────

export function assertConsistent(
  values: { label: string; value: number }[],
  tolerance: number,
  description: string,
  severity: Severity = "critical"
): AssertionResult {
  if (values.length < 2) return result(true, description, severity);
  const first = values[0].value;
  const mismatches = values.filter((v) => Math.abs(v.value - first) > tolerance);
  if (mismatches.length === 0) return result(true, description, severity);
  const detail = values.map((v) => `${v.label}=${v.value}`).join(", ");
  return result(false, description, severity, "consistent values", detail);
}
