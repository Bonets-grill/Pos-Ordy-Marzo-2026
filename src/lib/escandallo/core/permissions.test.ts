import { describe, it, expect } from "vitest";
import { hasPermission, getPermissions, canAccessEscandallo } from "./permissions";
import type { EscandalloPermission } from "./permissions";

// ── hasPermission ───────────────────────────────────────────

describe("hasPermission", () => {
  it("super_admin has ALL permissions", () => {
    const allPerms: EscandalloPermission[] = [
      "escandallo.view",
      "escandallo.ingredients.manage",
      "escandallo.suppliers.manage",
      "escandallo.recipes.manage",
      "escandallo.recipes.view",
      "escandallo.costs.view",
      "escandallo.simulation.use",
      "escandallo.alerts.manage",
      "escandallo.alerts.view",
      "escandallo.analytics.view",
      "escandallo.inventory.manage",
      "escandallo.inventory.view",
      "escandallo.export",
    ];
    allPerms.forEach((perm) => {
      expect(hasPermission("super_admin", perm)).toBe(true);
    });
  });

  it("owner has ALL permissions", () => {
    expect(hasPermission("owner", "escandallo.view")).toBe(true);
    expect(hasPermission("owner", "escandallo.export")).toBe(true);
    expect(hasPermission("owner", "escandallo.alerts.manage")).toBe(true);
  });

  it("admin has most permissions but NOT alerts.manage", () => {
    expect(hasPermission("admin", "escandallo.view")).toBe(true);
    expect(hasPermission("admin", "escandallo.ingredients.manage")).toBe(true);
    expect(hasPermission("admin", "escandallo.alerts.manage")).toBe(false);
    expect(hasPermission("admin", "escandallo.alerts.view")).toBe(true);
  });

  it("manager has view + simulation but NOT manage", () => {
    expect(hasPermission("manager", "escandallo.view")).toBe(true);
    expect(hasPermission("manager", "escandallo.recipes.view")).toBe(true);
    expect(hasPermission("manager", "escandallo.costs.view")).toBe(true);
    expect(hasPermission("manager", "escandallo.simulation.use")).toBe(true);
    expect(hasPermission("manager", "escandallo.ingredients.manage")).toBe(false);
    expect(hasPermission("manager", "escandallo.recipes.manage")).toBe(false);
    expect(hasPermission("manager", "escandallo.suppliers.manage")).toBe(false);
  });

  it("kitchen has limited view permissions", () => {
    expect(hasPermission("kitchen", "escandallo.view")).toBe(true);
    expect(hasPermission("kitchen", "escandallo.recipes.view")).toBe(true);
    expect(hasPermission("kitchen", "escandallo.costs.view")).toBe(true);
    expect(hasPermission("kitchen", "escandallo.inventory.view")).toBe(true);
    expect(hasPermission("kitchen", "escandallo.ingredients.manage")).toBe(false);
    expect(hasPermission("kitchen", "escandallo.simulation.use")).toBe(false);
    expect(hasPermission("kitchen", "escandallo.export")).toBe(false);
  });

  it("cashier has NO escandallo permissions", () => {
    expect(hasPermission("cashier", "escandallo.view")).toBe(false);
    expect(hasPermission("cashier", "escandallo.recipes.view")).toBe(false);
  });

  it("waiter has NO escandallo permissions", () => {
    expect(hasPermission("waiter", "escandallo.view")).toBe(false);
  });

  it("staff has NO escandallo permissions", () => {
    expect(hasPermission("staff", "escandallo.view")).toBe(false);
  });

  it("unknown role returns false", () => {
    expect(hasPermission("customer", "escandallo.view")).toBe(false);
    expect(hasPermission("", "escandallo.view")).toBe(false);
  });
});

// ── getPermissions ──────────────────────────────────────────

describe("getPermissions", () => {
  it("returns full array for super_admin", () => {
    const perms = getPermissions("super_admin");
    expect(perms.length).toBe(13);
  });

  it("returns empty array for cashier", () => {
    expect(getPermissions("cashier")).toEqual([]);
  });

  it("returns empty array for unknown role", () => {
    expect(getPermissions("hacker")).toEqual([]);
  });
});

// ── canAccessEscandallo ─────────────────────────────────────

describe("canAccessEscandallo", () => {
  it("allowed roles can access", () => {
    expect(canAccessEscandallo("super_admin")).toBe(true);
    expect(canAccessEscandallo("owner")).toBe(true);
    expect(canAccessEscandallo("admin")).toBe(true);
    expect(canAccessEscandallo("manager")).toBe(true);
    expect(canAccessEscandallo("kitchen")).toBe(true);
  });

  it("denied roles cannot access", () => {
    expect(canAccessEscandallo("cashier")).toBe(false);
    expect(canAccessEscandallo("waiter")).toBe(false);
    expect(canAccessEscandallo("staff")).toBe(false);
  });
});
