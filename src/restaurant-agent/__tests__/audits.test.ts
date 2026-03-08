import { describe, it, expect } from "vitest";
import { runContractAudit } from "../audits/contractAudit";
import { runBehaviorAudit } from "../audits/behaviorAudit";
import { runIntegrityAudit } from "../audits/integrityAudit";
import { runThreeAudits, assertAuditsPass } from "../audits/runAudits";

describe("Audit Suite", () => {
  it("Contract Audit pasa", () => {
    const result = runContractAudit();
    expect(result.pass).toBe(true);
    expect(result.name).toBe("Contract Audit");
  });

  it("Behavior Audit pasa", () => {
    const result = runBehaviorAudit();
    expect(result.pass).toBe(true);
    expect(result.name).toBe("Behavior Audit");
  });

  it("Integrity Audit pasa", () => {
    const result = runIntegrityAudit();
    expect(result.pass).toBe(true);
    expect(result.details).toContain("Master hash");
  });

  it("Las 3 auditorías pasan juntas", () => {
    const results = runThreeAudits();
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.pass)).toBe(true);
    expect(() => assertAuditsPass(results)).not.toThrow();
  });
});
