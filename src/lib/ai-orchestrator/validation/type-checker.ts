// ============================================================
// TYPE CHECKER — Execute tsc --noEmit and parse results
// ============================================================

import { exec } from "child_process";
import { promisify } from "util";
import type { TypeCheckResult } from "../types";

const execAsync = promisify(exec);

/** Run TypeScript type checker and return structured results */
export async function runTypeCheck(repoRoot: string): Promise<TypeCheckResult> {
  try {
    await execAsync("npx tsc --noEmit --pretty false", {
      cwd: repoRoot,
      timeout: 120_000,
    });
    // Exit 0 = no errors
    return { errors: 0, error_details: [] };
  } catch (err: unknown) {
    const output = err instanceof Error && "stdout" in err
      ? (err as { stdout: string }).stdout
      : "";

    const lines = output.split("\n").filter((l: string) => l.trim());
    const error_details: TypeCheckResult["error_details"] = [];

    for (const line of lines) {
      // Format: src/file.ts(10,5): error TS2345: ...
      const match = line.match(/^(.+?)\((\d+),\d+\):\s+error\s+\w+:\s+(.+)$/);
      if (match) {
        error_details.push({
          file: match[1],
          line: parseInt(match[2], 10),
          message: match[3],
        });
      }
    }

    return { errors: error_details.length || 1, error_details };
  }
}
