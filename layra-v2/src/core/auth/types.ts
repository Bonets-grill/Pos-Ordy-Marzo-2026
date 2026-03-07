import type { Role } from "@/lib/constants";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  displayName: string;
  avatarUrl: string | null;
  language: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  orgName: string;
}
