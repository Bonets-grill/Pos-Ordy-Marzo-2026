// ============================================================
// DEPENDENCY ANALYZER — BFS on import graph for impact analysis
// ============================================================

import type { DependencyNode, AffectedDependency } from "../types";

/**
 * Given a set of changed files and the full dependency graph,
 * find all transitively affected files via BFS on `imported_by` edges.
 */
export function analyzeImpact(
  changedFiles: string[],
  dependencies: DependencyNode[]
): AffectedDependency[] {
  // Build a lookup: file -> node
  const nodeMap = new Map<string, DependencyNode>();
  for (const node of dependencies) {
    nodeMap.set(node.file, node);
  }

  const affected = new Map<string, AffectedDependency>();
  const visited = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = [];

  // Seed the BFS with the directly changed files
  for (const file of changedFiles) {
    visited.add(file);
    const node = nodeMap.get(file);
    if (!node) continue;
    for (const parent of node.imported_by) {
      if (!visited.has(parent)) {
        queue.push({ file: parent, depth: 1 });
        visited.add(parent);
      }
    }
  }

  // BFS through imported_by edges
  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;
    const riskContribution = Math.max(1, Math.round(10 / depth));

    affected.set(file, {
      file,
      impact: depth === 1 ? "direct" : "transitive",
      risk_contribution: riskContribution,
    });

    const node = nodeMap.get(file);
    if (!node) continue;
    for (const parent of node.imported_by) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push({ file: parent, depth: depth + 1 });
      }
    }
  }

  return Array.from(affected.values());
}

/**
 * Count the maximum depth of transitive impact.
 */
export function maxImpactDepth(
  changedFiles: string[],
  dependencies: DependencyNode[]
): number {
  const nodeMap = new Map<string, DependencyNode>();
  for (const node of dependencies) {
    nodeMap.set(node.file, node);
  }

  let maxDepth = 0;
  const visited = new Set<string>(changedFiles);
  const queue: Array<{ file: string; depth: number }> = [];

  for (const file of changedFiles) {
    const node = nodeMap.get(file);
    if (!node) continue;
    for (const parent of node.imported_by) {
      if (!visited.has(parent)) {
        queue.push({ file: parent, depth: 1 });
        visited.add(parent);
      }
    }
  }

  while (queue.length > 0) {
    const { file, depth } = queue.shift()!;
    if (depth > maxDepth) maxDepth = depth;
    const node = nodeMap.get(file);
    if (!node) continue;
    for (const parent of node.imported_by) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push({ file: parent, depth: depth + 1 });
      }
    }
  }

  return maxDepth;
}
