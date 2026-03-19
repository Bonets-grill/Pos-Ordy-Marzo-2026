import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { runAllDBScans, runSingleDBScan, getDBScanDefinitions } from "@/lib/inspection/db-scans";

/**
 * GET /api/admin/db-scan?tenant_id=xxx&scan_id=DB_001
 * Run DB integrity scans for a tenant.
 * Requires super_admin role.
 *
 * Query params:
 *   - tenant_id (required): Tenant to scan
 *   - scan_id (optional): Run a specific scan only
 *   - definitions (optional): Return scan definitions without running
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Auth: require super_admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    // Return definitions only
    if (searchParams.has("definitions")) {
      return NextResponse.json({ definitions: getDBScanDefinitions() });
    }

    const tenantId = searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
    }

    const scanId = searchParams.get("scan_id");

    if (scanId) {
      const result = await runSingleDBScan(supabase, tenantId, scanId);
      if (!result) return NextResponse.json({ error: "Unknown scan_id" }, { status: 404 });
      return NextResponse.json({ result });
    }

    // Run all scans
    const results = await runAllDBScans(supabase, tenantId);
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const totalAnomalies = results.reduce((s, r) => s + r.count, 0);

    return NextResponse.json({
      tenant_id: tenantId,
      scans_total: results.length,
      scans_passed: passed,
      scans_failed: failed,
      total_anomalies: totalAnomalies,
      results,
      scanned_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("DB scan error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
