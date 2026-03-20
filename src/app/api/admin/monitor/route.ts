import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase-server";

const MAX_ERRORS = 200;
const errorBuffer: ErrorEntry[] = [];

export interface ErrorEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  col?: number;
  url?: string;
  user_agent?: string;
  tenant_id?: string;
  user_id?: string;
  context?: Record<string, unknown>;
}

async function requireSuperAdmin(supabase: ReturnType<typeof createServiceClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = createServiceClient();
  const admin = await requireSuperAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "errors";

  if (action === "health") {
    const dbStart = Date.now();
    let dbOk = false, dbLatency = 0, dbError = "";
    try {
      const { error } = await supabase.from("tenants").select("id").limit(1);
      dbLatency = Date.now() - dbStart;
      dbOk = !error;
      if (error) dbError = error.message;
    } catch (e) {
      dbLatency = Date.now() - dbStart;
      dbError = (e as Error).message;
    }
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    return NextResponse.json({
      db: { ok: dbOk, latency_ms: dbLatency, error: dbError || null },
      errors_5m: errorBuffer.filter(e => e.timestamp > fiveMinAgo && e.level === "error").length,
      warns_5m: errorBuffer.filter(e => e.timestamp > fiveMinAgo && e.level === "warn").length,
      total_buffered: errorBuffer.length,
      timestamp: new Date().toISOString(),
    });
  }

  const level = searchParams.get("level");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
  const filtered = level ? errorBuffer.filter(e => e.level === level) : [...errorBuffer];
  return NextResponse.json({ errors: filtered.slice(-limit).reverse(), total: errorBuffer.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json() as Partial<ErrorEntry>;
    if (!body.message || typeof body.message !== "string")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const entry: ErrorEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level: body.level === "warn" || body.level === "info" ? body.level : "error",
      message: String(body.message).slice(0, 500),
      stack: body.stack ? String(body.stack).slice(0, 3000) : undefined,
      file: body.file ? String(body.file).slice(0, 300) : undefined,
      line: typeof body.line === "number" ? body.line : undefined,
      col: typeof body.col === "number" ? body.col : undefined,
      url: body.url ? String(body.url).slice(0, 300) : undefined,
      user_agent: req.headers.get("user-agent")?.slice(0, 200) || undefined,
      tenant_id: body.tenant_id ? String(body.tenant_id).slice(0, 50) : undefined,
      user_id: body.user_id ? String(body.user_id).slice(0, 50) : undefined,
      context: body.context && typeof body.context === "object" ? body.context : undefined,
    };

    errorBuffer.push(entry);
    if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();

    const loc = entry.file ? ` @ ${entry.file}:${entry.line}:${entry.col}` : "";
    const logLine = `[MONITOR][${entry.level.toUpperCase()}] ${entry.timestamp} ${entry.message}${loc}`;
    if (entry.level === "error") console.error(logLine);
    else if (entry.level === "warn") console.warn(logLine);
    else console.info(logLine);

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (err) {
    console.error("Monitor POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
