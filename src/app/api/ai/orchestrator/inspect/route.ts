/**
 * AI ORCHESTRATOR — Inspection endpoint
 *
 * GET  /api/ai/orchestrator/inspect → Run fresh inspection, return system map
 *
 * Requires super_admin role.
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { inspectRepository, generateSystemMap, writeLogEntry } from "@/lib/ai-orchestrator";

const REPO_ROOT = process.cwd();

function ok(data: unknown) {
  return NextResponse.json(data);
}

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("users")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") return null;
  return profile as { id: string; role: string; tenant_id: string };
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return err("Unauthorized", 403);

  const start = Date.now();
  const svc = createServiceClient();

  try {
    const inspection = await inspectRepository(REPO_ROOT);
    const systemMap = await generateSystemMap(inspection, REPO_ROOT);

    await writeLogEntry(svc, {
      tenant_id: admin.tenant_id,
      phase: "inspecting",
      action: "standalone_inspect",
      output_summary: `${systemMap.file_count} files, ${systemMap.frozen_files.length} frozen`,
      duration_ms: Date.now() - start,
    });

    return ok({
      generated_at: systemMap.generated_at,
      file_count: systemMap.file_count,
      frozen_files: {
        total: systemMap.frozen_files.length,
        intact: systemMap.frozen_files.filter((f) => f.is_intact).length,
        broken: systemMap.frozen_files.filter((f) => !f.is_intact).length,
        details: systemMap.frozen_files.filter((f) => !f.is_intact),
      },
      lock_files: systemMap.lock_files,
      api_routes: systemMap.api_routes,
      pages: systemMap.pages,
      lib_modules_count: systemMap.lib_modules.length,
      test_files: systemMap.test_files,
      migrations: systemMap.migrations,
      dependency_graph_size: systemMap.dependencies.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(msg, 500);
  }
}
