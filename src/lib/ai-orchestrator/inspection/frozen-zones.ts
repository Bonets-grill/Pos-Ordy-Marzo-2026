// ============================================================
// FROZEN ZONES — Parse SHA256 lock files and verify integrity
// ============================================================

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import type { FrozenFile, LockFileInfo } from "../types";
import { LOCK_FILES } from "../constants";

interface LockEntry {
  hash: string;
  file: string;
}

/** Parse a single lock file content into entries */
export function parseLockFile(content: string): LockEntry[] {
  const entries: LockEntry[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Format: <sha256_hash>  <relative_path>
    const match = trimmed.match(/^([a-f0-9]{64})\s{2}(.+)$/);
    if (match) {
      entries.push({ hash: match[1], file: match[2] });
    }
  }
  return entries;
}

/** Compute SHA256 hash of a file */
export async function computeFileHash(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

/** Check all entries in a single lock file */
export async function verifyLockFile(
  lockFilePath: string,
  repoRoot: string
): Promise<{ info: LockFileInfo; files: FrozenFile[] }> {
  const lockName = lockFilePath.replace(repoRoot + "/", "");
  try {
    const content = await readFile(lockFilePath, "utf-8");
    const entries = parseLockFile(content);
    const files: FrozenFile[] = [];

    for (const entry of entries) {
      const fullPath = join(repoRoot, entry.file);
      const currentHash = await computeFileHash(fullPath);
      files.push({
        path: entry.file,
        lock_source: lockName,
        expected_hash: entry.hash,
        current_hash: currentHash ?? "MISSING",
        is_intact: currentHash === entry.hash,
      });
    }

    return {
      info: {
        path: lockName,
        file_count: files.length,
        all_intact: files.every((f) => f.is_intact),
      },
      files,
    };
  } catch {
    return {
      info: { path: lockName, file_count: 0, all_intact: false },
      files: [],
    };
  }
}

/** Check ALL lock files in the repo and return combined frozen zone status */
export async function checkAllFrozenZones(repoRoot: string): Promise<{
  lock_files: LockFileInfo[];
  frozen_files: FrozenFile[];
}> {
  const allLockFiles: LockFileInfo[] = [];
  const allFrozenFiles: FrozenFile[] = [];
  const seenPaths = new Set<string>();

  for (const lockName of LOCK_FILES) {
    const lockPath = join(repoRoot, lockName);
    const { info, files } = await verifyLockFile(lockPath, repoRoot);
    allLockFiles.push(info);
    for (const f of files) {
      if (!seenPaths.has(f.path)) {
        seenPaths.add(f.path);
        allFrozenFiles.push(f);
      }
    }
  }

  return { lock_files: allLockFiles, frozen_files: allFrozenFiles };
}

/** Get just the list of frozen file paths (no hash verification, fast) */
export async function getFrozenFilePaths(repoRoot: string): Promise<string[]> {
  const paths = new Set<string>();

  for (const lockName of LOCK_FILES) {
    try {
      const content = await readFile(join(repoRoot, lockName), "utf-8");
      const entries = parseLockFile(content);
      for (const entry of entries) {
        paths.add(entry.file);
      }
    } catch {
      // Lock file doesn't exist, skip
    }
  }

  return Array.from(paths);
}
