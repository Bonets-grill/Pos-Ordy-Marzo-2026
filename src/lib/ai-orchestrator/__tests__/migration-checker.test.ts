import { describe, it, expect } from "vitest";
import { checkMigrationSafety } from "../validation/migration-checker";

describe("checkMigrationSafety", () => {
  it("marks CREATE TABLE as additive", () => {
    const sql = `
      CREATE TABLE ai_proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL
      );
      CREATE INDEX idx_proposals ON ai_proposals(title);
    `;
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(true);
    expect(result.has_drop).toBe(false);
    expect(result.has_delete).toBe(false);
    expect(result.tables_affected).toContain("ai_proposals");
  });

  it("detects DROP TABLE as dangerous", () => {
    const sql = "DROP TABLE IF EXISTS old_table;";
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(false);
    expect(result.has_drop).toBe(true);
    expect(result.tables_affected).toContain("old_table");
  });

  it("detects DELETE FROM as dangerous", () => {
    const sql = "DELETE FROM orders WHERE status = 'draft';";
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(false);
    expect(result.has_delete).toBe(true);
  });

  it("detects TRUNCATE as dangerous", () => {
    const sql = "TRUNCATE TABLE logs;";
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(false);
    expect(result.has_delete).toBe(true);
  });

  it("marks ALTER TABLE ADD COLUMN as additive", () => {
    const sql = "ALTER TABLE tenants ADD COLUMN google_review_url text;";
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(true);
    expect(result.has_drop).toBe(false);
  });

  it("detects CREATE POLICY with correct table", () => {
    const sql = `CREATE POLICY "tenant_iso" ON ai_proposals FOR ALL USING (true);`;
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(true);
    expect(result.tables_affected).toContain("ai_proposals");
  });

  it("handles mixed safe and dangerous operations", () => {
    const sql = `
      CREATE TABLE new_table (id uuid PRIMARY KEY);
      DROP TABLE old_table;
    `;
    const result = checkMigrationSafety(sql);
    expect(result.is_additive).toBe(false);
    expect(result.has_drop).toBe(true);
    expect(result.tables_affected).toContain("new_table");
    expect(result.tables_affected).toContain("old_table");
  });
});
