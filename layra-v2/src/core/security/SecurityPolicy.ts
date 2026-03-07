import type { SecurityPolicy } from "./types";

const CORE_DENIED_PATHS = [
  "/src/core/",
  "/src/stores/",
  "/supabase/",
  "/server/",
  ".env",
  ".env.local",
  ".env.server",
];

const WORKSPACE_ALLOWED_PATHS = [
  "/workspace/src/",
  "/workspace/public/",
  "/workspace/layra/",
];

const ALLOWED_FILE_TYPES = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".json",
  ".html",
  ".svg",
  ".png",
  ".jpg",
  ".md",
];

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowedPaths: WORKSPACE_ALLOWED_PATHS,
  deniedPaths: CORE_DENIED_PATHS,
  maxFileSize: 1024 * 1024, // 1MB
  allowedFileTypes: ALLOWED_FILE_TYPES,
};

export function isPathAllowed(
  path: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): boolean {
  if (policy.deniedPaths.some((denied) => path.startsWith(denied))) {
    return false;
  }
  return policy.allowedPaths.some((allowed) => path.startsWith(allowed));
}

export function isFileTypeAllowed(
  filename: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): boolean {
  return policy.allowedFileTypes.some((ext) => filename.endsWith(ext));
}
