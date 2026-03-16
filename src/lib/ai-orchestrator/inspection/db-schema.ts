// ============================================================
// DB SCHEMA — Read migration state from filesystem and Supabase
// ============================================================

import { readdir, readFile } from "fs/promises";
import { join } from "path";

interface MigrationFile {
  name: string;
  timestamp: string;
  description: string;
}

/** List all migration files from the repo */
export async function getMigrationFiles(repoRoot: string): Promise<MigrationFile[]> {
  const migrationsDir = join(repoRoot, "supabase", "migrations");
  try {
    const files = await readdir(migrationsDir);
    return files
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => {
        const match = f.match(/^(\d+)_(.+)\.sql$/);
        return {
          name: f,
          timestamp: match?.[1] ?? "",
          description: match?.[2]?.replace(/_/g, " ") ?? f,
        };
      });
  } catch {
    return [];
  }
}

/** Read the content of a specific migration file */
export async function readMigrationContent(
  repoRoot: string,
  migrationName: string
): Promise<string | null> {
  try {
    return await readFile(
      join(repoRoot, "supabase", "migrations", migrationName),
      "utf-8"
    );
  } catch {
    return null;
  }
}

/** Extract table names created in a migration */
export function extractTablesFromSql(sql: string): string[] {
  const tables: string[] = [];
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  return tables;
}
