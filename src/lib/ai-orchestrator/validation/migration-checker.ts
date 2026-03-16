// ============================================================
// MIGRATION CHECKER — Parse SQL for dangerous patterns
// ============================================================

import type { MigrationCheckResult } from "../types";
import { DANGEROUS_SQL_PATTERNS, SAFE_SQL_PATTERNS } from "../constants";

/** Analyze a SQL migration for safety */
export function checkMigrationSafety(sql: string): MigrationCheckResult {
  const risk_notes: string[] = [];
  const tables_affected: string[] = [];

  // Check for dangerous patterns
  let has_drop = false;
  let has_alter_column = false;
  let has_delete = false;

  for (const pattern of DANGEROUS_SQL_PATTERNS) {
    const match = sql.match(pattern);
    if (match) {
      if (/DROP/i.test(match[0])) has_drop = true;
      if (/ALTER\s+COLUMN/i.test(match[0])) has_alter_column = true;
      if (/DELETE/i.test(match[0]) || /TRUNCATE/i.test(match[0])) has_delete = true;
      risk_notes.push(`Dangerous pattern detected: ${match[0]}`);
    }
  }

  // Extract affected tables
  const tablePatterns = [
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi,
    /ALTER\s+TABLE\s+(\w+)/gi,
    /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/gi,
    /DELETE\s+FROM\s+(\w+)/gi,
    /TRUNCATE\s+(?:TABLE\s+)?(\w+)/gi,
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+\w+\s+ON\s+(\w+)/gi,
    /CREATE\s+POLICY\s+\S+\s+ON\s+(\w+)/gi,
  ];

  const tableSet = new Set<string>();
  for (const regex of tablePatterns) {
    let match;
    while ((match = regex.exec(sql)) !== null) {
      tableSet.add(match[1]);
    }
  }
  tables_affected.push(...tableSet);

  // Check for safe patterns
  let hasSafePatterns = false;
  for (const pattern of SAFE_SQL_PATTERNS) {
    if (pattern.test(sql)) {
      hasSafePatterns = true;
      break;
    }
  }

  const is_additive = !has_drop && !has_alter_column && !has_delete && hasSafePatterns;

  if (is_additive) {
    risk_notes.push("Migration is additive-only (safe)");
  }

  return {
    is_additive,
    has_drop,
    has_alter_column,
    has_delete,
    tables_affected,
    risk_notes,
  };
}
