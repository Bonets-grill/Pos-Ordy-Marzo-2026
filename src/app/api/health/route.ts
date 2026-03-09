import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import packageJson from "../../../../package.json";

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime_ms = Date.now() - startTime;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("tenants").select("id").limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      version: packageJson.version,
      timestamp,
      uptime_ms,
    });
  } catch {
    return NextResponse.json(
      {
        status: "db_error",
        error: "Database unreachable",
        version: packageJson.version,
        timestamp,
        uptime_ms,
      },
      { status: 503 }
    );
  }
}
