import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { metrics } from "@/lib/observability/metrics";

/**
 * GET /api/admin/metrics
 *
 * Returns metrics in Prometheus text format or JSON.
 *
 * Query params:
 *   format=prometheus (default) — Prometheus text exposition format
 *   format=json — JSON summary for admin dashboard
 *
 * Auth: super_admin or Bearer token (for Prometheus scraper)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Auth: super_admin session OR metrics bearer token
    const metricsToken = process.env.METRICS_TOKEN;
    const bearerToken = req.headers.get("authorization")?.replace("Bearer ", "");

    let authorized = false;
    if (metricsToken && bearerToken === metricsToken) {
      authorized = true;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (profile?.role === "super_admin") authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "prometheus";

    if (format === "json") {
      return NextResponse.json({
        metrics: metrics.toJSON(),
        collected_at: new Date().toISOString(),
      });
    }

    // Prometheus text format
    const body = metrics.toPrometheus();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Metrics error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
