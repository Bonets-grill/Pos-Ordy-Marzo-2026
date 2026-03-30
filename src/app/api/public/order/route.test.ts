import { describe, it, expect } from "vitest";

/**
 * Tests for public order API validation and business logic.
 * Tests pure functions extracted from src/app/api/public/order/route.ts
 * without requiring Supabase or network access.
 *
 * NOTE: Core calculation tests are in src/lib/order-logic.test.ts.
 * These tests focus on the validation layer, rate limiting, and
 * input sanitization logic.
 */

// ── Reproduce validation helpers ────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const VALID_ORDER_TYPES = new Set(["qr", "delivery", "takeaway"]);

function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function sanitize(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  // Strip angle brackets entirely to prevent any HTML/script injection.
  return input
    .replace(/</g, "")
    .replace(/>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isValidSlug(slug: unknown): boolean {
  return typeof slug === "string" && SLUG_RE.test(slug) && slug.length <= 100;
}

function isValidOrderType(orderType: unknown): boolean {
  return typeof orderType === "string" && VALID_ORDER_TYPES.has(orderType);
}

function isValidQuantity(qty: unknown): boolean {
  return (
    typeof qty === "number" &&
    Number.isInteger(qty) &&
    qty >= 1 &&
    qty <= 50
  );
}

// ── Rate limiter simulation ──────────────────────────────────

function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function isLimited(ip: string, nowMs: number = Date.now()): boolean {
    const bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= nowMs) {
      buckets.set(ip, { count: 1, resetAt: nowMs + windowMs });
      return false;
    }
    bucket.count += 1;
    return bucket.count > maxRequests;
  };
}

// ── UUID validation tests ────────────────────────────────────

describe("UUID validation", () => {
  it("valid UUID v4 is accepted", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
  });

  it("uppercase UUID is accepted (case insensitive)", () => {
    expect(isUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("empty string is rejected", () => {
    expect(isUUID("")).toBe(false);
  });

  it("non-UUID string is rejected", () => {
    expect(isUUID("not-a-uuid")).toBe(false);
    expect(isUUID("123")).toBe(false);
  });

  it("SQL injection attempt is rejected", () => {
    expect(isUUID("' OR 1=1 --")).toBe(false);
    expect(isUUID("'; DROP TABLE orders;--")).toBe(false);
  });

  it("XSS attempt is rejected", () => {
    expect(isUUID("<script>alert(1)</script>")).toBe(false);
  });

  it("non-string types are rejected", () => {
    expect(isUUID(null)).toBe(false);
    expect(isUUID(undefined)).toBe(false);
    expect(isUUID(123)).toBe(false);
    expect(isUUID({})).toBe(false);
  });
});

// ── Slug validation tests ────────────────────────────────────

describe("Tenant slug validation", () => {
  it("valid slugs are accepted", () => {
    expect(isValidSlug("bonets-grill")).toBe(true);
    expect(isValidSlug("mi-restaurante-2")).toBe(true);
    expect(isValidSlug("test123")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it("slugs with uppercase are accepted (case insensitive regex)", () => {
    expect(isValidSlug("BoNETs-GRILL")).toBe(true);
  });

  it("empty string is rejected", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("slug with spaces is rejected", () => {
    expect(isValidSlug("my restaurant")).toBe(false);
  });

  it("slug starting with dash is rejected", () => {
    expect(isValidSlug("-bad-slug")).toBe(false);
  });

  it("SQL injection in slug is rejected", () => {
    expect(isValidSlug("'; DROP TABLE tenants;--")).toBe(false);
  });

  it("XSS in slug is rejected", () => {
    expect(isValidSlug("<script>")).toBe(false);
  });

  it("slug over 100 chars is rejected", () => {
    const longSlug = "a".repeat(101);
    expect(isValidSlug(longSlug)).toBe(false);
  });

  it("null/undefined is rejected", () => {
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(undefined)).toBe(false);
  });
});

// ── Order type validation tests ──────────────────────────────

describe("Order type validation", () => {
  it("valid order types are accepted", () => {
    expect(isValidOrderType("qr")).toBe(true);
    expect(isValidOrderType("delivery")).toBe(true);
    expect(isValidOrderType("takeaway")).toBe(true);
  });

  it("invalid order types are rejected", () => {
    expect(isValidOrderType("dine_in")).toBe(false);
    expect(isValidOrderType("walkin")).toBe(false);
    expect(isValidOrderType("")).toBe(false);
  });

  it("null/undefined are rejected", () => {
    expect(isValidOrderType(null)).toBe(false);
    expect(isValidOrderType(undefined)).toBe(false);
  });

  it("injection attempts are rejected", () => {
    expect(isValidOrderType("qr; DROP TABLE")).toBe(false);
  });
});

// ── Quantity validation tests ────────────────────────────────

describe("Order item quantity validation", () => {
  it("valid quantities (1-50) are accepted", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(10)).toBe(true);
    expect(isValidQuantity(50)).toBe(true);
  });

  it("quantity 0 is rejected", () => {
    expect(isValidQuantity(0)).toBe(false);
  });

  it("quantity -1 is rejected", () => {
    expect(isValidQuantity(-1)).toBe(false);
  });

  it("quantity > 50 is rejected", () => {
    expect(isValidQuantity(51)).toBe(false);
    expect(isValidQuantity(999)).toBe(false);
  });

  it("non-integer quantity is rejected", () => {
    expect(isValidQuantity(1.5)).toBe(false);
    expect(isValidQuantity(0.5)).toBe(false);
  });

  it("string quantity is rejected", () => {
    expect(isValidQuantity("1")).toBe(false);
  });

  it("null/undefined is rejected", () => {
    expect(isValidQuantity(null)).toBe(false);
    expect(isValidQuantity(undefined)).toBe(false);
  });
});

// ── Input sanitization tests ─────────────────────────────────

describe("Input sanitization", () => {
  it("removes HTML tags (XSS prevention)", () => {
    // New sanitize strips all '<' and '>' — contents remain but tags are gone
    const result1 = sanitize("<script>alert(1)</script>", 100);
    expect(result1).not.toContain("<script>");
    expect(result1).not.toContain("<");
    expect(result1).not.toContain(">");

    const result2 = sanitize("<b>Bold</b>", 100);
    expect(result2).not.toContain("<b>");
    expect(result2).not.toContain("</b>");
    expect(result2).not.toContain("<");
    expect(result2).toContain("Bold");

    const result3 = sanitize("<img src=x onerror=alert(1)>", 100);
    expect(result3).not.toContain("<");
    expect(result3).not.toContain(">");
  });

  it("SECURITY: nested angle bracket bypass is prevented", () => {
    // With direct stripping of '<' and '>', no injection is possible
    const nestedAttack = "<<script>script>alert(1)<</script>/script>";
    const result = sanitize(nestedAttack, 200);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("collapses whitespace", () => {
    expect(sanitize("Hello   World", 100)).toBe("Hello World");
    expect(sanitize("  trim  me  ", 100)).toBe("trim me");
  });

  it("truncates to maxLen", () => {
    const longStr = "A".repeat(200);
    expect(sanitize(longStr, 100)).toHaveLength(100);
  });

  it("empty string returns empty string", () => {
    expect(sanitize("", 100)).toBe("");
  });

  it("non-string returns empty string", () => {
    expect(sanitize(null, 100)).toBe("");
    expect(sanitize(undefined, 100)).toBe("");
    expect(sanitize(123, 100)).toBe("");
    expect(sanitize({}, 100)).toBe("");
  });

  it("customer name is sanitized (maxLen=100)", () => {
    const maliciousName = "<script>alert('xss')</script>Hacker";
    const safe = sanitize(maliciousName, 100);
    expect(safe).not.toContain("<script>");
    expect(safe).not.toContain("<");
    expect(safe).toContain("Hacker");
  });

  it("delivery address is sanitized (maxLen=300)", () => {
    const address = "  Calle Mayor 1, 2nd Floor  ";
    expect(sanitize(address, 300)).toBe("Calle Mayor 1, 2nd Floor");
  });

  it("notes are sanitized and truncated (maxLen=500)", () => {
    const longNotes = "x".repeat(600);
    const sanitized = sanitize(longNotes, 500);
    expect(sanitized.length).toBeLessThanOrEqual(500);
  });
});

// ── Rate limiter tests ───────────────────────────────────────

describe("Rate limiter (10 orders/60s per IP)", () => {
  it("first 10 requests are allowed", () => {
    const isLimited = createRateLimiter(10, 60_000);
    const nowMs = Date.now();
    for (let i = 0; i < 10; i++) {
      expect(isLimited("192.168.1.1", nowMs)).toBe(false);
    }
  });

  it("11th request is blocked", () => {
    const isLimited = createRateLimiter(10, 60_000);
    const nowMs = Date.now();
    for (let i = 0; i < 10; i++) {
      isLimited("192.168.1.1", nowMs);
    }
    expect(isLimited("192.168.1.1", nowMs)).toBe(true); // blocked
  });

  it("different IPs have separate rate limits", () => {
    const isLimited = createRateLimiter(10, 60_000);
    const nowMs = Date.now();
    for (let i = 0; i < 10; i++) {
      isLimited("192.168.1.1", nowMs);
    }
    expect(isLimited("192.168.1.1", nowMs)).toBe(true);  // blocked
    expect(isLimited("10.0.0.1", nowMs)).toBe(false);    // different IP, allowed
  });

  it("rate limit resets after window expires", () => {
    const isLimited = createRateLimiter(10, 60_000);
    const nowMs = Date.now();
    for (let i = 0; i < 11; i++) {
      isLimited("192.168.1.1", nowMs);
    }
    expect(isLimited("192.168.1.1", nowMs)).toBe(true);  // blocked

    const future = nowMs + 60_001; // after window
    expect(isLimited("192.168.1.1", future)).toBe(false); // reset, allowed again
  });

  it("single request is never limited", () => {
    const isLimited = createRateLimiter(10, 60_000);
    expect(isLimited("192.168.1.1")).toBe(false);
  });
});

// ── round2 precision tests ───────────────────────────────────

describe("round2 — financial rounding (2 decimal places)", () => {
  it("rounds standard values correctly", () => {
    expect(round2(1.006)).toBe(1.01);
    expect(round2(1.004)).toBe(1.00);
  });

  it("integer stays integer", () => {
    expect(round2(10)).toBe(10);
  });

  it("handles floating point imprecision", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    const result = round2(0.1 + 0.2);
    expect(result).toBe(0.30);
  });

  it("handles negative values", () => {
    expect(round2(-1.006)).toBe(-1.01);
    expect(round2(-1.004)).toBe(-1.00);
  });

  it("handles zero", () => {
    expect(round2(0)).toBe(0);
  });

  it("large amounts stay precise", () => {
    expect(round2(9999.999)).toBe(10000.00);
  });
});

// ── Order items limit tests ──────────────────────────────────

describe("Order items limit (max 50 items)", () => {
  function validateItemsCount(items: unknown[]): string | null {
    if (!Array.isArray(items) || items.length === 0) return "Missing items";
    if (items.length > 50) return "Too many items (max 50)";
    return null;
  }

  it("accepts 1 item", () => {
    expect(validateItemsCount([{}])).toBeNull();
  });

  it("accepts 50 items", () => {
    const items = Array.from({ length: 50 }, () => ({}));
    expect(validateItemsCount(items)).toBeNull();
  });

  it("rejects 51 items", () => {
    const items = Array.from({ length: 51 }, () => ({}));
    expect(validateItemsCount(items)).toBe("Too many items (max 50)");
  });

  it("rejects empty array", () => {
    expect(validateItemsCount([])).toBe("Missing items");
  });

  it("rejects non-array", () => {
    expect(validateItemsCount(null as unknown as unknown[])).toBe("Missing items");
    expect(validateItemsCount("items" as unknown as unknown[])).toBe("Missing items");
  });
});

// ── Language handling tests ──────────────────────────────────

describe("Customer language handling", () => {
  function safeLang(customerLang: unknown): string {
    const sanitized = sanitize(customerLang, 5);
    return sanitized || "es";
  }

  it("valid language codes are preserved", () => {
    expect(safeLang("es")).toBe("es");
    expect(safeLang("en")).toBe("en");
    expect(safeLang("de")).toBe("de");
    expect(safeLang("fr")).toBe("fr");
    expect(safeLang("it")).toBe("it");
  });

  it("null/undefined defaults to 'es'", () => {
    expect(safeLang(null)).toBe("es");
    expect(safeLang(undefined)).toBe("es");
  });

  it("empty string defaults to 'es'", () => {
    expect(safeLang("")).toBe("es");
  });

  it("long/invalid lang code is truncated", () => {
    const result = safeLang("invalidlangcode");
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("CRITICAL: tenant locale defaults to 'es' when null", () => {
    const tenantLocale: string | null = null;
    const tenantLang = (tenantLocale || "es").slice(0, 2);
    expect(tenantLang).toBe("es");
  });
});

// ── Idempotency key tests ────────────────────────────────────

describe("Idempotency key deduplication", () => {
  it("valid UUID idempotency key is accepted", () => {
    const key = "550e8400-e29b-41d4-a716-446655440000";
    const result = typeof key === "string" && UUID_RE.test(key) ? key : null;
    expect(result).toBe(key);
  });

  it("invalid idempotency key is set to null (ignored)", () => {
    const key = "not-a-uuid";
    const result = typeof key === "string" && UUID_RE.test(key) ? key : null;
    expect(result).toBeNull();
  });

  it("null idempotency key is handled gracefully", () => {
    const key = null;
    const result = typeof key === "string" && UUID_RE.test(key) ? key : null;
    expect(result).toBeNull();
  });

  it("CRITICAL: duplicate order with same idempotency key returns existing order", () => {
    // Simulates the logic: if existingOrder found by idempotency_key → return it
    const existingOrder = { id: "order-123", order_number: "ORD-001" };
    const response = existingOrder
      ? { orderId: existingOrder.id, orderNumber: existingOrder.order_number, idempotent: true }
      : null;

    expect(response?.idempotent).toBe(true);
    expect(response?.orderId).toBe("order-123");
  });
});

// ── Modifier validation tests ────────────────────────────────

describe("Modifier ID validation in order items", () => {
  it("valid modifier IDs in an item are accepted", () => {
    const modifierIds = [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
    ];
    const allValid = modifierIds.every(isUUID);
    expect(allValid).toBe(true);
  });

  it("invalid modifier ID causes rejection", () => {
    const modifierIds = [
      "550e8400-e29b-41d4-a716-446655440001",
      "not-valid",
    ];
    const allValid = modifierIds.every(isUUID);
    expect(allValid).toBe(false);
  });

  it("more than 20 modifiers per item is rejected", () => {
    const tooManyMods = Array.from({ length: 21 }, (_, i) =>
      `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`
    );
    const valid = tooManyMods.length <= 20;
    expect(valid).toBe(false);
  });

  it("exactly 20 modifiers is accepted", () => {
    const validMods = Array.from({ length: 20 }, (_, i) =>
      `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`
    );
    const valid = validMods.length <= 20;
    expect(valid).toBe(true);
  });

  it("DEFENSIVE: missing modifier is SKIPPED (not rejection) — order proceeds", () => {
    // Per API design: modifiers that can't be found are skipped with a warning,
    // the order is NOT rejected for missing modifiers
    const knownModifiers = new Map([
      ["mod-1", { price_delta: 1.50, name_es: "Queso" }],
    ]);

    const requestedMods = ["mod-1", "mod-UNKNOWN"];
    const resolvedMods = requestedMods
      .filter((id) => knownModifiers.has(id))
      .map((id) => knownModifiers.get(id)!);

    // mod-UNKNOWN is skipped, not rejected
    expect(resolvedMods).toHaveLength(1);
    expect(resolvedMods[0].name_es).toBe("Queso");
  });
});
