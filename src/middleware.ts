import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiter (in-memory, resets on cold start) ──
const rateLimits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimits) if (v.resetAt <= now) rateLimits.delete(k);
}, 60_000);

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  entry.count += 1;
  return entry.count > max; // limited
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit: login page — 10 attempts / 5 min
  if (path.startsWith("/login") || path.startsWith("/api/auth")) {
    if (checkRateLimit(`login:${ip}`, 10, 5 * 60_000)) {
      console.warn(`[SECURITY] Rate limit: login blocked ip=${ip} path=${path}`);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Rate limit: public API — 60 req / min per IP
  if (path.startsWith("/api/public")) {
    if (checkRateLimit(`pub:${ip}`, 60, 60_000)) {
      console.warn(`[SECURITY] Rate limit: public API blocked ip=${ip} path=${path}`);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Rate limit: WhatsApp webhook — 100 req / min
  if (path.startsWith("/api/whatsapp")) {
    if (checkRateLimit(`wa:${ip}`, 100, 60_000)) {
      console.warn(`[SECURITY] Rate limit: WhatsApp blocked ip=${ip} path=${path}`);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Maintenance mode: block all routes except health check and static assets
  if (process.env.MAINTENANCE_MODE === "true") {
    if (path !== "/api/health" && !path.startsWith("/_next/") && path !== "/favicon.ico") {
      return NextResponse.json(
        { error: "System under maintenance", retry_after: 300 },
        { status: 503 }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/qr")) {
    if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/dashboard")) {
      console.warn(`[SECURITY] Unauthenticated access attempt: ip=${ip} path=${path}`);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
