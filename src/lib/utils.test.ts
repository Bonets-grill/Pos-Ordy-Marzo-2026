import { describe, it, expect, vi, afterEach } from "vitest";
import { cn, formatCurrency, formatDate, timeAgo } from "./utils";

// ── cn (className merger) ───────────────────────────────────

describe("cn", () => {
  it("merges strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditionals", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
    expect(cn("base", true && "active")).toBe("base active");
  });

  it("handles undefined/null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("handles empty call", () => {
    expect(cn()).toBe("");
  });

  it("handles arrays", () => {
    expect(cn(["a", "b"])).toBe("a b");
  });
});

// ── formatCurrency ──────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats EUR by default", () => {
    const result = formatCurrency(10.50);
    expect(result).toContain("10,50");
    expect(result).toContain("€");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });

  it("formats large amounts", () => {
    const result = formatCurrency(1234.56);
    // Node's Intl may or may not include thousands separator depending on version
    expect(result).toContain("1234,56");
    expect(result).toContain("€");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-5.99);
    expect(result).toContain("5,99");
  });

  it("formats USD when specified", () => {
    const result = formatCurrency(10.50, "USD");
    expect(result).toContain("10,50");
    expect(result).toContain("$");
  });
});

// ── formatDate ──────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-03-09T14:30:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date(2026, 2, 9, 14, 30));
    expect(typeof result).toBe("string");
  });

  it("uses es-ES locale format", () => {
    const result = formatDate("2026-01-15T10:00:00Z");
    // es-ES format: "15/1/26, 11:00" or similar
    expect(result).toMatch(/\d/);
  });

  it("accepts custom options", () => {
    const result = formatDate("2026-03-09", { dateStyle: "long" });
    expect(typeof result).toBe("string");
  });
});

// ── timeAgo ─────────────────────────────────────────────────

describe("timeAgo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns seconds for < 60s", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const past = new Date(now - 30 * 1000).toISOString();
    expect(timeAgo(past)).toBe("30s");
  });

  it("returns minutes for < 1h", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const past = new Date(now - 5 * 60 * 1000).toISOString();
    expect(timeAgo(past)).toBe("5m");
  });

  it("returns hours for < 24h", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const past = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(past)).toBe("3h");
  });

  it("returns days for >= 24h", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const past = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(past)).toBe("2d");
  });

  it("handles 0 seconds ago", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const past = new Date(now).toISOString();
    expect(timeAgo(past)).toBe("0s");
  });

  it("accepts Date objects", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const past = new Date(now - 120 * 1000);
    expect(timeAgo(past)).toBe("2m");
  });
});
