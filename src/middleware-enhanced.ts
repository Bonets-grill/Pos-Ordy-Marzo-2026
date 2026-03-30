/**
 * middleware-enhanced.ts — Enhanced middleware with additional security features.
 *
 * This file extends the functionality of the base middleware.ts with:
 * - Stricter CSP headers per-route
 * - Bot detection for public API endpoints
 * - Enhanced security logging
 * - Admin IP allowlist support
 *
 * NOTE: This file is NOT active. To activate, rename to middleware.ts
 * (replacing the current one) and update flow-lock.sha256.
 * Current active middleware: src/middleware.ts
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ── Rate limiter (in-memory, resets on cold start) ──────────
const rateLimits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  if (rateLimits.size === 0) return;
  const now = Date.now();
  for (const [k, v] of rateLimits) if (v.resetAt <= now) rateLimits.delete(k);
}, 60_000);

// Track repeated rate limit hits for alerting
const alertBuckets = new Map<string, { count: number; lastAlertAt: number }>();

async function sendSecurityAlert(ip: string, path: string, type: string) {
  const key = `alert:${ip}`;
  const now = Date.now();
  const bucket = alertBuckets.get(key);

  // Only alert once per 10 minutes per IP
  if (bucket && now - bucket.lastAlertAt < 10 * 60_000) {
    alertBuckets.set(key, { ...bucket, count: bucket.count + 1 });
    return;
  }
  alertBuckets.set(key, { count: 1, lastAlertAt: now });

  try {
    const evoUrl = process.env.EVOLUTION_API_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.WA_ADMIN_INSTANCE || "";
    const adminPhone = process.env.WA_ADMIN_PHONE || "";
    if (!evoUrl || !adminPhone || !instance) return;

    const msg = `🚨 *Ordy POS — Alerta de seguridad*\n\nTipo: ${type}\nIP: ${ip}\nRuta: ${path}\nHora: ${new Date().toISOString()}\n\n${
      type === "Login brute force"
        ? "_Posible ataque de fuerza bruta en login_"
        : `_Evento: ${type}_`
    }`;
    await fetch(`${evoUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evoKey || "" },
      body: JSON.stringify({ number: adminPhone, text: msg }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* silent — never block request for alert failure */ }
}

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

// ── Bot detection for public API ────────────────────────────

const BOT_UA_PATTERNS = [
  /curl\//i, /wget\//i, /python-requests/i, /go-http-client/i,
  /ruby/i, /java\//i, /perl/i, /scrapy/i, /semrush/i, /ahrefs/i,
];

function looksLikeBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // no UA = suspicious
  return BOT_UA_PATTERNS.some((re) => re.test(userAgent));
}

// ── Admin IP allowlist ───────────────────────────────────────

function isAdminIpAllowed(ip: string): boolean {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST;
  if (!allowlist) return true; // no allowlist = open (backward compatible)
  const allowed = allowlist.split(",").map((s) => s.trim());
  return allowed.includes(ip) || allowed.includes("*");
}

// ── Enhanced security logging ────────────────────────────────

interface SecurityEvent {
  type: "rate_limit" | "auth_required" | "admin_blocked" | "bot_detected";
  ip: string;
  path: string;
  userAgent?: string;
}

function logSecurityEvent(event: SecurityEvent) {
  const timestamp = new Date().toISOString();
  console.warn(
    `[SECURITY][${timestamp}] type=${event.type} ip=${event.ip} path=${event.path}${
      event.userAgent ? ` ua="${event.userAgent.slice(0, 50)}"` : ""
    }`
  );
}

// ── Main middleware function ─────────────────────────────────

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent");

  // Rate limit: login page — 10 attempts / 5 min
  if (path.startsWith("/login") || path.startsWith("/api/auth")) {
    if (checkRateLimit(`login:${ip}`, 10, 5 * 60_000)) {
      logSecurityEvent({ type: "rate_limit", ip, path, userAgent: userAgent || undefined });
      sendSecurityAlert(ip, path, "Login brute force");
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Rate limit: public API — 60 req / min per IP
  if (path.startsWith("/api/public")) {
    if (checkRateLimit(`pub:${ip}`, 60, 60_000)) {
      logSecurityEvent({ type: "rate_limit", ip, path, userAgent: userAgent || undefined });
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Bot detection: log but don't block (QR scanners may have bot-like UA)
    if (looksLikeBot(userAgent)) {
      logSecurityEvent({ type: "bot_detected", ip, path, userAgent: userAgent || undefined });
      // Could block here with: return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Rate limit: WhatsApp webhook — 100 req / min
  if (path.startsWith("/api/whatsapp")) {
    if (checkRateLimit(`wa:${ip}`, 100, 60_000)) {
      logSecurityEvent({ type: "rate_limit", ip, path });
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Admin IP allowlist check
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    if (!isAdminIpAllowed(ip)) {
      logSecurityEvent({ type: "admin_blocked", ip, path });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Maintenance mode: block all routes except health check and static assets
  if (process.env.MAINTENANCE_MODE === "true") {
    if (
      path !== "/api/health" &&
      !path.startsWith("/_next/") &&
      path !== "/favicon.ico"
    ) {
      return NextResponse.json(
        { error: "System under maintenance", retry_after: 300 },
        { status: 503 }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/reset-password") &&
    !request.nextUrl.pathname.startsWith("/qr")
  ) {
    if (
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/dashboard")
    ) {
      logSecurityEvent({ type: "auth_required", ip, path });
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
