import { describe, it, expect } from "vitest";
import { checkFrozenZoneViolations, touchesFrozenZone } from "../risk/frozen-zone-checker";
import { parseLockFile } from "../inspection/frozen-zones";
import type { FrozenFile } from "../types";

const MOCK_FROZEN: FrozenFile[] = [
  { path: "src/app/qr/[slug]/[table]/page.tsx", lock_source: "flow-lock.sha256", expected_hash: "abc", current_hash: "abc", is_intact: true },
  { path: "src/lib/api-auth.ts", lock_source: "flow-lock.sha256", expected_hash: "def", current_hash: "def", is_intact: true },
  { path: "src/lib/utils.ts", lock_source: "flow-lock.sha256", expected_hash: "ghi", current_hash: "ghi", is_intact: true },
];

describe("checkFrozenZoneViolations", () => {
  it("returns empty array when no frozen files are touched", () => {
    const violations = checkFrozenZoneViolations(
      ["src/lib/ai-orchestrator/types.ts", "src/app/api/ai/orchestrator/route.ts"],
      MOCK_FROZEN
    );
    expect(violations).toHaveLength(0);
  });

  it("returns blocking violation when frozen file is touched", () => {
    const violations = checkFrozenZoneViolations(
      ["src/lib/api-auth.ts", "src/lib/ai-orchestrator/types.ts"],
      MOCK_FROZEN
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe("src/lib/api-auth.ts");
    expect(violations[0].severity).toBe("blocking");
    expect(violations[0].lock_source).toBe("flow-lock.sha256");
  });

  it("returns multiple violations for multiple frozen files", () => {
    const violations = checkFrozenZoneViolations(
      ["src/lib/api-auth.ts", "src/lib/utils.ts"],
      MOCK_FROZEN
    );
    expect(violations).toHaveLength(2);
  });
});

describe("touchesFrozenZone", () => {
  it("returns false when no frozen files are touched", () => {
    expect(touchesFrozenZone(["src/new-file.ts"], MOCK_FROZEN)).toBe(false);
  });

  it("returns true when a frozen file is touched", () => {
    expect(touchesFrozenZone(["src/lib/utils.ts"], MOCK_FROZEN)).toBe(true);
  });
});

describe("parseLockFile", () => {
  it("parses hash + path entries correctly", () => {
    const content = `# Comment line
a46b1500f142f0775ea5c5262889ad86437a500944c97e67b184e78e5c3ce814  src/file1.ts
c3e056c3654005ba4abb7ebfa78a3e469d945884c549e8e49201aa29d88e70ef  src/file2.tsx
`;
    const entries = parseLockFile(content);
    expect(entries).toHaveLength(2);
    expect(entries[0].file).toBe("src/file1.ts");
    expect(entries[1].file).toBe("src/file2.tsx");
  });

  it("skips blank lines and comments", () => {
    const content = `# Header
# Another comment

a46b1500f142f0775ea5c5262889ad86437a500944c97e67b184e78e5c3ce814  src/only.ts

# Footer
`;
    const entries = parseLockFile(content);
    expect(entries).toHaveLength(1);
  });

  it("returns empty array for empty content", () => {
    expect(parseLockFile("")).toHaveLength(0);
    expect(parseLockFile("# only comments")).toHaveLength(0);
  });
});
