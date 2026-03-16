// ============================================================
// INSPECTOR — Walk repo and categorize files by role
// ============================================================

import { readdir, stat } from "fs/promises";
import { join, relative } from "path";
import { FILE_PATTERNS } from "../constants";
import type { InspectionResult } from "../types";
import { checkAllFrozenZones } from "./frozen-zones";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "coverage",
  "LOCKS",
]);

/** Recursively list all .ts/.tsx/.sql files in the repo */
async function walkDir(dir: string, repoRoot: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await walkDir(fullPath, repoRoot);
      results.push(...subFiles);
    } else if (/\.(ts|tsx|sql)$/.test(entry.name)) {
      results.push(relative(repoRoot, fullPath));
    }
  }

  return results;
}

/** Categorize a file based on its path */
function categorizeFile(filePath: string): string | null {
  if (FILE_PATTERNS.test_file.test(filePath)) return "test";
  if (FILE_PATTERNS.api_route.test(filePath)) return "api_route";
  if (FILE_PATTERNS.page.test(filePath)) return "page";
  if (FILE_PATTERNS.migration.test(filePath)) return "migration";
  if (FILE_PATTERNS.component.test(filePath)) return "component";
  if (FILE_PATTERNS.lib_module.test(filePath)) return "lib_module";
  return null;
}

/** Full repository inspection */
export async function inspectRepository(repoRoot: string): Promise<InspectionResult> {
  const allFiles = await walkDir(repoRoot, repoRoot);
  const { frozen_files } = await checkAllFrozenZones(repoRoot);

  const api_routes: string[] = [];
  const pages: string[] = [];
  const lib_modules: string[] = [];
  const test_files: string[] = [];
  const migrations: string[] = [];

  for (const file of allFiles) {
    const category = categorizeFile(file);
    switch (category) {
      case "api_route":
        api_routes.push(file);
        break;
      case "page":
        pages.push(file);
        break;
      case "lib_module":
        lib_modules.push(file);
        break;
      case "test":
        test_files.push(file);
        break;
      case "migration":
        migrations.push(file);
        break;
    }
  }

  return {
    file_tree: allFiles,
    frozen_files,
    api_routes,
    pages,
    lib_modules,
    test_files,
    migrations,
  };
}
