import type { Role } from "@/lib/constants";

export interface SecurityPolicy {
  allowedPaths: string[];
  deniedPaths: string[];
  maxFileSize: number;
  allowedFileTypes: string[];
}

export interface Permission {
  resource: string;
  actions: ("read" | "write" | "delete" | "admin")[];
  roles: Role[];
}
