import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export type ModuleLock = {
  moduleName: string;
  fileHashes: Record<string, string>;
  masterHash: string;
  contracts: string[];
  regressionSuite: string[];
  blastRadiusRules: string[];
  governance: string;
};

export function buildModuleLock(
  moduleName: string,
  files: string[],
  contracts: string[],
  regressionSuite: string[],
  blastRadiusRules: string[],
): ModuleLock {
  const fileHashes: Record<string, string> = {};

  files.forEach((filePath) => {
    const content = readFileSync(filePath, "utf8");
    fileHashes[filePath] = createHash("sha256").update(content).digest("hex");
  });

  const masterHash = createHash("sha256")
    .update(Object.entries(fileHashes).map(([k, v]) => `${k}:${v}`).join("|"))
    .digest("hex");

  return {
    moduleName,
    fileHashes,
    masterHash,
    contracts,
    regressionSuite,
    blastRadiusRules,
    governance: "No modificar sin autorización explícita y refresh de lock.",
  };
}
