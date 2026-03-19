/**
 * DB Integrity Scenario Executors (DB_001–DB_008)
 * Wraps db-scans into ScenarioExecutor format.
 */

import type { ScenarioExecutor, ScenarioContext, ScenarioResult } from "../types";
import { getScenarioById } from "../scenario-registry";
import { runSingleDBScan } from "../db-scans";
import { assertZero, assertEmpty } from "../assertions";

function createDBScenario(scenarioId: string, scanId: string): ScenarioExecutor {
  const def = getScenarioById(scenarioId)!;

  return {
    definition: def,
    async execute(ctx: ScenarioContext): Promise<ScenarioResult> {
      const result = await runSingleDBScan(ctx.supabase, ctx.tenantId, scanId);

      if (!result) {
        return {
          scenario_id: def.id, scenario_name: def.name, group: def.group,
          status: "error", severity: def.severity, blocks_release: def.blocksRelease,
          assertions: [], duration_ms: 0, error_message: `Scan ${scanId} not found`,
          timestamp: new Date().toISOString(),
        };
      }

      const assertions = [
        assertZero(result.count, `${def.name}: 0 anomalies expected`, def.severity),
        assertEmpty(result.anomalies, `${def.name}: no anomaly records`, def.severity),
      ];

      const allPassed = assertions.every((a) => a.passed);

      return {
        scenario_id: def.id, scenario_name: def.name, group: def.group,
        status: allPassed ? "pass" : "fail",
        severity: def.severity, blocks_release: def.blocksRelease && !allPassed,
        assertions, duration_ms: result.duration_ms,
        evidence: { anomalies: result.anomalies.slice(0, 10), total_anomalies: result.count },
        timestamp: new Date().toISOString(),
      };
    },
  };
}

export const dbIntegrityScenarios: ScenarioExecutor[] = [
  createDBScenario("DB_001", "DB_001"),
  createDBScenario("DB_002", "DB_002"),
  createDBScenario("DB_003", "DB_003"),
  createDBScenario("DB_004", "DB_004"),
  createDBScenario("DB_005", "DB_005"),
  createDBScenario("DB_006", "DB_006"),
  createDBScenario("DB_007", "DB_007"),
  createDBScenario("DB_008", "DB_008"),
  createDBScenario("DB_009", "DB_009"),
];
