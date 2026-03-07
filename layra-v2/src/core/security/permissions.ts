import type { Role } from "@/lib/constants";
import type { Permission } from "./types";

const PERMISSIONS: Permission[] = [
  {
    resource: "dashboard",
    actions: ["read"],
    roles: ["super_admin", "tenant_admin", "user"],
  },
  {
    resource: "projects",
    actions: ["read", "write"],
    roles: ["super_admin", "tenant_admin", "user"],
  },
  {
    resource: "projects",
    actions: ["delete"],
    roles: ["super_admin", "tenant_admin"],
  },
  {
    resource: "tenants",
    actions: ["read", "write", "delete", "admin"],
    roles: ["super_admin"],
  },
  {
    resource: "audit_logs",
    actions: ["read"],
    roles: ["super_admin", "tenant_admin"],
  },
  {
    resource: "support_sessions",
    actions: ["read", "write", "admin"],
    roles: ["super_admin"],
  },
  {
    resource: "settings",
    actions: ["read", "write"],
    roles: ["super_admin", "tenant_admin", "user"],
  },
  {
    resource: "admin",
    actions: ["read", "write", "admin"],
    roles: ["super_admin"],
  },
];

export function hasPermission(
  role: Role,
  resource: string,
  action: "read" | "write" | "delete" | "admin"
): boolean {
  return PERMISSIONS.some(
    (p) =>
      p.resource === resource &&
      p.actions.includes(action) &&
      p.roles.includes(role)
  );
}
