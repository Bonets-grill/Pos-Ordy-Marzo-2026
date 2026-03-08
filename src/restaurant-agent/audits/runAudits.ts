import { runBehaviorAudit } from "./behaviorAudit";
import { runContractAudit } from "./contractAudit";
import { runIntegrityAudit } from "./integrityAudit";

export type AuditResult = {
  name: string;
  pass: boolean;
  details: string;
};

export function runThreeAudits(): AuditResult[] {
  return [runContractAudit(), runBehaviorAudit(), runIntegrityAudit()];
}

export function assertAuditsPass(results: AuditResult[]) {
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    throw new Error(`Auditorías fallidas: ${failed.map((f) => f.name).join(", ")}`);
  }
}
