// ============================================================
// TEST RUNNER — Execute vitest and parse results
// ============================================================

import { exec } from "child_process";
import { promisify } from "util";
import type { TestRunResult } from "../types";

const execAsync = promisify(exec);

/** Run vitest and return structured results */
export async function runTests(repoRoot: string): Promise<TestRunResult> {
  const start = Date.now();
  try {
    const { stdout } = await execAsync("npx vitest run --reporter=json", {
      cwd: repoRoot,
      timeout: 120_000,
      env: { ...process.env, CI: "true" },
    });

    const duration_ms = Date.now() - start;

    try {
      const result = JSON.parse(stdout);
      const passed = result.numPassedTests ?? 0;
      const failed = result.numFailedTests ?? 0;
      const skipped = result.numPendingTests ?? 0;
      const failures: TestRunResult["failures"] = [];

      if (result.testResults) {
        for (const suite of result.testResults) {
          if (suite.status === "failed" && suite.assertionResults) {
            for (const test of suite.assertionResults) {
              if (test.status === "failed") {
                failures.push({
                  test: `${suite.name} > ${test.fullName ?? test.title}`,
                  error: (test.failureMessages ?? []).join("\n").slice(0, 500),
                });
              }
            }
          }
        }
      }

      return { passed, failed, skipped, duration_ms, failures };
    } catch {
      // JSON parse failed but vitest exited 0 — parse from text
      return { passed: -1, failed: 0, skipped: 0, duration_ms, failures: [] };
    }
  } catch (err: unknown) {
    const duration_ms = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      passed: 0,
      failed: 1,
      skipped: 0,
      duration_ms,
      failures: [{ test: "vitest run", error: message.slice(0, 1000) }],
    };
  }
}
