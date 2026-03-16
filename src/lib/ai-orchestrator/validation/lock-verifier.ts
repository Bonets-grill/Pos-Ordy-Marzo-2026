// ============================================================
// LOCK VERIFIER — TypeScript equivalent of verify-flow-lock.sh
// ============================================================

import type { LockVerifyResult } from "../types";
import { checkAllFrozenZones } from "../inspection/frozen-zones";

/** Verify all lock files and return a structured result */
export async function verifyAllLocks(repoRoot: string): Promise<LockVerifyResult> {
  const { lock_files, frozen_files } = await checkAllFrozenZones(repoRoot);

  const violations: LockVerifyResult["violations"] = [];

  for (const file of frozen_files) {
    if (!file.is_intact) {
      violations.push({
        lock_file: file.lock_source,
        file: file.path,
        status: file.current_hash === "MISSING" ? "missing" : "changed",
      });
    }
  }

  return {
    locks_checked: lock_files.length,
    all_intact: violations.length === 0,
    violations,
  };
}
