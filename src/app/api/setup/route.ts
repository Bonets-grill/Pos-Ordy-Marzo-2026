/**
 * BOOTSTRAP ENDPOINT — Creates users without needing an existing login.
 *
 * All requests require { secret: "<SETUP_SECRET>" } in the body.
 *
 * ── Action: "super_admin" (default when no action is provided) ──────────────
 * POST /api/setup
 * Body: { secret, password }
 * Creates admin@ordypos.com as super_admin linked to a "system" tenant.
 * Idempotent — safe to call multiple times.
 *
 * ── Action: "create_tenant_user" ────────────────────────────────────────────
 * POST /api/setup
 * Body: { secret, action: "create_tenant_user", email, password,
 *         tenant_name, tenant_slug, role? }
 * Creates (or reuses) a tenant, creates the auth user, and inserts the
 * users-table record with the given role (default: "owner").
 * Idempotent — running again resets the password.
 *
 * Required env vars (set in Netlify/Vercel dashboard):
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key
 *   SETUP_SECRET               — A secret you choose to protect this endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "admin@ordypos.com";
const SYSTEM_TENANT_SLUG = "system";

type Body = Record<string, string>;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function makeClient(serviceKey: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findOrCreateAuthUser(
  svc: ReturnType<typeof makeClient>,
  email: string,
  password: string
): Promise<{ id: string } | { error: string }> {
  const { data: { users } } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const existing = users?.find((u) => u.email === email);

  if (existing) {
    const { error } = await svc.auth.admin.updateUserById(existing.id, { password });
    if (error) return { error: `Could not update password: ${error.message}` };
    return { id: existing.id };
  }

  const { data: created, error } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created?.user) return { error: `Could not create auth user: ${error?.message}` };
  return { id: created.user.id };
}

async function findOrCreateTenant(
  svc: ReturnType<typeof makeClient>,
  name: string,
  slug: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await svc.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (existing) return { id: existing.id as string };

  const { data, error } = await svc
    .from("tenants")
    .insert({ name, slug, plan: "pro", currency: "EUR", tax_rate: 10, active: true })
    .select("id")
    .single();
  if (error || !data) return { error: `Could not create tenant: ${error?.message}` };
  return { id: data.id as string };
}

/* ── Route handler ────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  // 1. Guards
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in your Netlify dashboard." },
      { status: 503 }
    );
  }
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not set. Add it in your Netlify dashboard." },
      { status: 503 }
    );
  }

  let body: Body = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.secret !== setupSecret) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }

  const svc = makeClient(serviceKey);
  const action = body.action || "super_admin";

  // ── Action: create_tenant_user ──────────────────────────────────────────
  if (action === "create_tenant_user") {
    const VALID_ROLES = ["owner", "admin", "manager", "cashier", "waiter", "kitchen", "staff"];
    const { email, password, tenant_name, tenant_slug } = body;
    const role = body.role || "owner";
    if (!email || !password || !tenant_name || !tenant_slug) {
      return NextResponse.json(
        { error: "email, password, tenant_name and tenant_slug are required." },
        { status: 400 }
      );
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const tenantRes = await findOrCreateTenant(svc, tenant_name, tenant_slug);
    if ("error" in tenantRes) return NextResponse.json({ error: tenantRes.error }, { status: 500 });

    const userRes = await findOrCreateAuthUser(svc, email, password);
    if ("error" in userRes) return NextResponse.json({ error: userRes.error }, { status: 500 });

    const { error: upsertErr } = await svc.from("users").upsert(
      { id: userRes.id, email, role, tenant_id: tenantRes.id, name: tenant_name },
      { onConflict: "id" }
    );
    if (upsertErr) {
      return NextResponse.json({ error: `Could not upsert user record: ${upsertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Tenant user is ready. You can now log in.",
      email,
      role,
      tenant: { name: tenant_name, slug: tenant_slug, id: tenantRes.id },
      login_url: "/login",
    });
  }

  // ── Action: super_admin ─────────────────────────────────────────────────
  const password = body.password?.trim();
  if (!password) {
    return NextResponse.json({ error: "password is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // super_admin also needs a tenant row (users.tenant_id is NOT NULL)
  const tenantRes = await findOrCreateTenant(svc, "System", SYSTEM_TENANT_SLUG);
  if ("error" in tenantRes) return NextResponse.json({ error: tenantRes.error }, { status: 500 });

  const userRes = await findOrCreateAuthUser(svc, ADMIN_EMAIL, password);
  if ("error" in userRes) return NextResponse.json({ error: userRes.error }, { status: 500 });

  const { error: upsertErr } = await svc.from("users").upsert(
    { id: userRes.id, email: ADMIN_EMAIL, role: "super_admin", tenant_id: tenantRes.id, name: "Super Admin" },
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
