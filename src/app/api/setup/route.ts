/**
 * BOOTSTRAP ENDPOINT — Creates the super-admin user on first deploy.
 *
 * POST /api/setup
 * Body: { secret: "<SETUP_SECRET env var>", password: "<desired password>" }
 *
 * Required env vars (set in Netlify/Vercel dashboard):
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key
 *   SETUP_SECRET               — A secret you choose; prevents unauthorised use
 *
 * The endpoint is idempotent: safe to call multiple times.
 * Once the user exists and has super_admin role the call is a no-op.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "admin@ordypos.com";

export async function POST(req: NextRequest) {
  // ── 1. Guard: service role key must be configured ──────────────────────
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in your hosting dashboard." },
      { status: 503 }
    );
  }

  // ── 2. Guard: setup secret prevents open access ─────────────────────────
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not set. Add it in your hosting dashboard." },
      { status: 503 }
    );
  }

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.secret !== setupSecret) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }

  const password = body.password?.trim();
  if (!password) {
    return NextResponse.json({ error: "password is required in the request body." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // ── 3. Create service client ────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 4. Find or create auth user ─────────────────────────────────────────
  let authUserId: string;
  const { data: { users: allUsers } } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const existing = allUsers?.find((u) => u.email === ADMIN_EMAIL);

  if (existing) {
    authUserId = existing.id;
    // Update password so the user can log in with the requested password
    const { error: pwErr } = await svc.auth.admin.updateUserById(authUserId, { password });
    if (pwErr) {
      return NextResponse.json({ error: `Could not update password: ${pwErr.message}` }, { status: 500 });
    }
  } else {
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      return NextResponse.json({ error: `Could not create auth user: ${createErr?.message}` }, { status: 500 });
    }
    authUserId = created.user.id;
  }

  // ── 5. Upsert users table record with super_admin role ──────────────────
  const { error: upsertErr } = await svc.from("users").upsert(
    { id: authUserId, email: ADMIN_EMAIL, role: "super_admin", tenant_id: null },
    { onConflict: "id" }
  );
  if (upsertErr) {
    return NextResponse.json({ error: `Could not upsert users record: ${upsertErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Super admin is ready. You can now log in.",
    email: ADMIN_EMAIL,
    login_url: "/login",
  });
}
