import { describe, it, expect } from "vitest";
import { aggregateGates, runPreExecutionGates } from "../orchestrator/gate-system";
import type { GateCheck } from "../types";

describe("aggregateGates", () => {
  it("returns pass when all gates pass", () => {
    const gates: GateCheck[] = [
      { name: "g1", result: "pass", message: "ok" },
      { name: "g2", result: "pass", message: "ok" },
    ];
    expect(aggregateGates(gates)).toBe("pass");
  });

  it("returns fail when any gate fails", () => {
    const gates: GateCheck[] = [
      { name: "g1", result: "pass", message: "ok" },
      { name: "g2", result: "fail", message: "not ok" },
    ];
    expect(aggregateGates(gates)).toBe("fail");
  });

  it("returns warn when no fails but has warnings", () => {
    const gates: GateCheck[] = [
      { name: "g1", result: "pass", message: "ok" },
      { name: "g2", result: "warn", message: "warning" },
    ];
    expect(aggregateGates(gates)).toBe("warn");
  });

  it("returns fail when has both fail and warn", () => {
    const gates: GateCheck[] = [
      { name: "g1", result: "warn", message: "warning" },
      { name: "g2", result: "fail", message: "not ok" },
    ];
    expect(aggregateGates(gates)).toBe("fail");
  });
});

describe("runPreExecutionGates", () => {
  it("all pass for healthy system", () => {
    const gates = runPreExecutionGates({
      lockVerifyAllIntact: true,
      lockViolations: [],
      testsPassed: 15,
      testsFailed: 0,
      typeErrors: 0,
      frozenZoneViolations: 0,
      riskScore: 25,
    });
    expect(gates.every((g) => g.result === "pass")).toBe(true);
  });

  it("fails on lock integrity violation", () => {
    const gates = runPreExecutionGates({
      lockVerifyAllIntact: false,
      lockViolations: [{ lock_file: "flow-lock.sha256", file: "auth.ts", status: "changed" }],
      testsPassed: 15,
      testsFailed: 0,
      typeErrors: 0,
      frozenZoneViolations: 0,
      riskScore: 25,
    });
    const lockGate = gates.find((g) => g.name === "lock_integrity");
    expect(lockGate?.result).toBe("fail");
  });

  it("fails on test failures", () => {
    const gates = runPreExecutionGates({
      lockVerifyAllIntact: true,
      lockViolations: [],
      testsPassed: 14,
      testsFailed: 1,
      typeErrors: 0,
      frozenZoneViolations: 0,
      riskScore: 25,
    });
    const testGate = gates.find((g) => g.name === "tests_pass");
    expect(testGate?.result).toBe("fail");
  });

  it("fails on type errors", () => {
    const gates = runPreExecutionGates({
      lockVerifyAllIntact: true,
      lockViolations: [],
      testsPassed: 15,
      testsFailed: 0,
      typeErrors: 3,
      frozenZoneViolations: 0,
      riskScore: 25,
    });
    const typeGate = gates.find((g) => g.name === "type_check");
    expect(typeGate?.result).toBe("fail");
  });

  it("fails on risk score over 80", () => {
    const gates = runPreExecutionGates({
      lockVerifyAllIntact: true,
      lockViolations: [],
      testsPassed: 15,
      testsFailed: 0,
      typeErrors: 0,
      frozenZoneViolations: 0,
      riskScore: 85,
    });
    const riskGate = gates.find((g) => g.name === "risk_threshold");
    expect(riskGate?.result).toBe("fail");
  });

  it("fails on OpenAI reject", () => {
    const gates = runPreExecutionGates({
      lockVerifyAllIntact: true,
      lockViolations: [],
      testsPassed: 15,
      testsFailed: 0,
      typeErrors: 0,
      frozenZoneViolations: 0,
      riskScore: 25,
      openaiApproval: "reject",
    });
    const reviewGate = gates.find((g) => g.name === "openai_review");
    expect(reviewGate?.result).toBe("fail");
  });
});
