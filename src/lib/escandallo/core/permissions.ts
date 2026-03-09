// ============================================================
// ESCANDALLO CORE — Permissions & Access Control
// Module 1: Core Foundation
// ============================================================
// Maps to ordy-pos user roles: super_admin, owner, admin, manager,
// cashier, waiter, kitchen, staff
// ============================================================

/** Escandallo-specific permissions */
export type EscandalloPermission =
  | "escandallo.view"
  | "escandallo.ingredients.manage"
  | "escandallo.suppliers.manage"
  | "escandallo.recipes.manage"
  | "escandallo.recipes.view"
  | "escandallo.costs.view"
  | "escandallo.simulation.use"
  | "escandallo.alerts.manage"
  | "escandallo.alerts.view"
  | "escandallo.analytics.view"
  | "escandallo.inventory.manage"
  | "escandallo.inventory.view"
  | "escandallo.export";

/** Role-based permission matrix */
const ROLE_PERMISSIONS: Record<string, EscandalloPermission[]> = {
  super_admin: [
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
  ],
  owner: [
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
  ],
  admin: [
    "escandallo.view",
    "escandallo.ingredients.manage",
    "escandallo.suppliers.manage",
    "escandallo.recipes.manage",
    "escandallo.recipes.view",
    "escandallo.costs.view",
    "escandallo.simulation.use",
    "escandallo.alerts.view",
    "escandallo.analytics.view",
    "escandallo.inventory.manage",
    "escandallo.inventory.view",
    "escandallo.export",
  ],
  manager: [
    "escandallo.view",
    "escandallo.recipes.view",
    "escandallo.costs.view",
    "escandallo.simulation.use",
    "escandallo.alerts.view",
    "escandallo.analytics.view",
    "escandallo.inventory.view",
  ],
  kitchen: [
    "escandallo.view",
    "escandallo.recipes.view",
    "escandallo.costs.view",
    "escandallo.inventory.view",
  ],
  cashier: [],
  waiter: [],
  staff: [],
};

/** Check if a role has a specific permission */
export function hasPermission(role: string, permission: EscandalloPermission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/** Get all permissions for a role */
export function getPermissions(role: string): EscandalloPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Check if a role can access the escandallo module at all */
export function canAccessEscandallo(role: string): boolean {
  return hasPermission(role, "escandallo.view");
}
