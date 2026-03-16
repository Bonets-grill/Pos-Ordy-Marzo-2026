// ============================================================
// SYSTEM MAP — Build dependency graph from import statements
// ============================================================

import { readFile } from "fs/promises";
import { join, dirname, resolve, relative } from "path";
import type { SystemMap, DependencyNode } from "../types";
import type { InspectionResult } from "../types";

const IMPORT_REGEX = /(?:import|from)\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g;

/** Resolve an import path to a relative file path */
function resolveImport(
  importPath: string,
  fromFile: string,
  repoRoot: string
): string | null {
  let resolved: string;

  if (importPath.startsWith("@/")) {
    // Alias: @/ -> src/
    resolved = importPath.replace("@/", "src/");
  } else {
    // Relative import
    const fromDir = dirname(join(repoRoot, fromFile));
    resolved = relative(repoRoot, resolve(fromDir, importPath));
  }

  // Try common extensions
  const extensions = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
  for (const ext of extensions) {
    const candidate = resolved + ext;
    // We don't check existence here — we match against known files later
    if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) {
      return candidate;
    }
  }
  return resolved;
}

/** Extract import paths from file content */
export function extractImports(content: string): string[] {
  const imports: string[] = [];
  let match;
  const regex = new RegExp(IMPORT_REGEX.source, "g");
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/** Build the full dependency graph for all files */
export async function buildDependencyGraph(
  files: string[],
  repoRoot: string
): Promise<DependencyNode[]> {
  const fileSet = new Set(files);
  const nodeMap = new Map<string, DependencyNode>();

  // Initialize nodes
  for (const file of files) {
    nodeMap.set(file, { file, imports: [], imported_by: [] });
  }

  // Parse imports for each file
  for (const file of files) {
    try {
      const content = await readFile(join(repoRoot, file), "utf-8");
      const importPaths = extractImports(content);

      for (const imp of importPaths) {
        const resolved = resolveImport(imp, file, repoRoot);
        if (resolved && fileSet.has(resolved)) {
          const node = nodeMap.get(file)!;
          if (!node.imports.includes(resolved)) {
            node.imports.push(resolved);
          }
          const targetNode = nodeMap.get(resolved)!;
          if (!targetNode.imported_by.includes(file)) {
            targetNode.imported_by.push(file);
          }
        }
      }
    } catch {
      // File can't be read, skip
    }
  }

  return Array.from(nodeMap.values());
}

/** Generate a complete system map from inspection results */
export async function generateSystemMap(
  inspection: InspectionResult,
  repoRoot: string
): Promise<SystemMap> {
  const dependencies = await buildDependencyGraph(inspection.file_tree, repoRoot);

  // Deduplicate lock file info
  const lockInfoMap = new Map<string, { file_count: number; all_intact: boolean }>();
  for (const f of inspection.frozen_files) {
    const existing = lockInfoMap.get(f.lock_source);
    if (existing) {
      existing.file_count++;
      if (!f.is_intact) existing.all_intact = false;
    } else {
      lockInfoMap.set(f.lock_source, { file_count: 1, all_intact: f.is_intact });
    }
  }

  return {
    generated_at: new Date().toISOString(),
    file_count: inspection.file_tree.length,
    frozen_files: inspection.frozen_files,
    lock_files: Array.from(lockInfoMap.entries()).map(([path, info]) => ({
      path,
      ...info,
    })),
    api_routes: inspection.api_routes,
    pages: inspection.pages,
    lib_modules: inspection.lib_modules,
    test_files: inspection.test_files,
    migrations: inspection.migrations,
    dependencies,
  };
}
