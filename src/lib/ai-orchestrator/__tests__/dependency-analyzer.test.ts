import { describe, it, expect } from "vitest";
import { analyzeImpact, maxImpactDepth } from "../risk/dependency-analyzer";
import type { DependencyNode } from "../types";

const MOCK_GRAPH: DependencyNode[] = [
  { file: "lib/core.ts", imports: [], imported_by: ["lib/service.ts", "lib/utils.ts"] },
  { file: "lib/service.ts", imports: ["lib/core.ts"], imported_by: ["app/page.tsx"] },
  { file: "lib/utils.ts", imports: ["lib/core.ts"], imported_by: ["app/page.tsx", "app/layout.tsx"] },
  { file: "app/page.tsx", imports: ["lib/service.ts", "lib/utils.ts"], imported_by: [] },
  { file: "app/layout.tsx", imports: ["lib/utils.ts"], imported_by: [] },
  { file: "lib/isolated.ts", imports: [], imported_by: [] },
];

describe("analyzeImpact", () => {
  it("finds direct dependents", () => {
    const affected = analyzeImpact(["lib/core.ts"], MOCK_GRAPH);
    const files = affected.map((a) => a.file);
    expect(files).toContain("lib/service.ts");
    expect(files).toContain("lib/utils.ts");
  });

  it("finds transitive dependents", () => {
    const affected = analyzeImpact(["lib/core.ts"], MOCK_GRAPH);
    const files = affected.map((a) => a.file);
    expect(files).toContain("app/page.tsx");
    expect(files).toContain("app/layout.tsx");
  });

  it("returns empty for isolated file", () => {
    const affected = analyzeImpact(["lib/isolated.ts"], MOCK_GRAPH);
    expect(affected).toHaveLength(0);
  });

  it("returns empty for leaf files", () => {
    const affected = analyzeImpact(["app/page.tsx"], MOCK_GRAPH);
    expect(affected).toHaveLength(0);
  });

  it("marks direct vs transitive correctly", () => {
    const affected = analyzeImpact(["lib/core.ts"], MOCK_GRAPH);
    const service = affected.find((a) => a.file === "lib/service.ts");
    const page = affected.find((a) => a.file === "app/page.tsx");
    expect(service?.impact).toBe("direct");
    expect(page?.impact).toBe("transitive");
  });
});

describe("maxImpactDepth", () => {
  it("returns 0 for isolated file", () => {
    expect(maxImpactDepth(["lib/isolated.ts"], MOCK_GRAPH)).toBe(0);
  });

  it("returns 2 for core change (core → service/utils → page/layout)", () => {
    expect(maxImpactDepth(["lib/core.ts"], MOCK_GRAPH)).toBe(2);
  });

  it("returns 1 for service change (service → page)", () => {
    expect(maxImpactDepth(["lib/service.ts"], MOCK_GRAPH)).toBe(1);
  });
});
