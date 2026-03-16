// ============================================================
// FROZEN ZONE CHECKER — Hard gate: block frozen file modifications
// ============================================================

import type { FrozenFile, FrozenZoneViolation } from "../types";

/**
 * Check if any of the changed files are in a frozen zone.
 * Returns blocking violations for any match.
 * This is a NON-NEGOTIABLE gate — any violation auto-rejects the proposal.
 */
export function checkFrozenZoneViolations(
  changedFiles: string[],
  frozenFiles: FrozenFile[]
): FrozenZoneViolation[] {
  const frozenSet = new Map<string, string>();
  for (const f of frozenFiles) {
    frozenSet.set(f.path, f.lock_source);
  }

  const violations: FrozenZoneViolation[] = [];
  for (const file of changedFiles) {
    const lockSource = frozenSet.get(file);
    if (lockSource) {
      violations.push({
        file,
        lock_source: lockSource,
        severity: "blocking",
      });
    }
  }

  return violations;
}

/**
 * Quick boolean check: are ANY of these files frozen?
 */
export function touchesFrozenZone(
  changedFiles: string[],
  frozenFiles: FrozenFile[]
): boolean {
  const frozenPaths = new Set(frozenFiles.map((f) => f.path));
  return changedFiles.some((f) => frozenPaths.has(f));
}
