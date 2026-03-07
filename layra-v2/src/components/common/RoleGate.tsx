import { useAuth } from "@/core/auth/useAuth";
import type { Role } from "@/lib/constants";

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

export function RoleGate({
  children,
  allowedRoles,
  fallback = null,
}: RoleGateProps) {
  const { profile } = useAuth();
  if (!profile || !allowedRoles.includes(profile.role as Role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
