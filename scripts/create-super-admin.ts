/**
 * CREATE SUPER ADMIN USER
 *
 * Creates a super_admin user that can access the admin panel.
 * Usage: npx tsx scripts/create-super-admin.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://abqyqnmndjczkblwnvga.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

const ADMIN_EMAIL = "admin@ordypos.com";
const ADMIN_PASSWORD = "SuperAdmin2026!";

async function main() {
  console.log("Creating super admin user...\n");

  // Check if user already exists in users table
  const { data: existingUser } = await svc
    .from("users")
    .select("id, email, role")
    .eq("email", ADMIN_EMAIL)
    .single();

  if (existingUser) {
    // Update role to super_admin
    const { error } = await svc
      .from("users")
      .update({ role: "super_admin" })
      .eq("id", existingUser.id);

    if (error) {
      console.error("Error updating role:", error.message);
      process.exit(1);
    }

    console.log(`User ${ADMIN_EMAIL} already exists — role updated to super_admin`);
    console.log(`  ID: ${existingUser.id}`);
  } else {
    // Create auth user
    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      console.error("Error creating auth user:", authError.message);
      // Might already exist in auth — try to find
      const { data: { users } } = await svc.auth.admin.listUsers();
      const found = users.find((u) => u.email === ADMIN_EMAIL);
      if (found) {
        console.log("Auth user exists, creating users table entry...");
        const { error } = await svc.from("users").upsert({
          id: found.id,
          email: ADMIN_EMAIL,
          role: "super_admin",
          tenant_id: null,
        }, { onConflict: "id" });
        if (error) {
          console.error("Error creating user record:", error.message);
          process.exit(1);
        }
        console.log(`Super admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        console.log(`  ID: ${found.id}`);
      } else {
        process.exit(1);
      }
    } else {
      // Create users table entry
      const { error } = await svc.from("users").insert({
        id: authUser.user.id,
        email: ADMIN_EMAIL,
        role: "super_admin",
        tenant_id: null,
      });

      if (error) {
        console.error("Error creating user record:", error.message);
        // Try upsert
        await svc.from("users").upsert({
          id: authUser.user.id,
          email: ADMIN_EMAIL,
          role: "super_admin",
          tenant_id: null,
        }, { onConflict: "id" });
      }

      console.log(`Super admin created!`);
      console.log(`  ID: ${authUser.user.id}`);
    }
  }

  // Also make demo user a super_admin so the demo login works for admin
  const { data: demoUser } = await svc
    .from("users")
    .select("id, email, role")
    .eq("email", "demo@ordypos.com")
    .single();

  if (demoUser) {
    await svc
      .from("users")
      .update({ role: "super_admin" })
      .eq("id", demoUser.id);
    console.log(`\nDemo user (demo@ordypos.com) also upgraded to super_admin`);
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║         SUPER ADMIN CREDENTIALS             ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Email:    ${ADMIN_EMAIL.padEnd(33)}║`);
  console.log(`║  Password: ${ADMIN_PASSWORD.padEnd(33)}║`);
  console.log(`║  URL:      /admin                           ║`);
  console.log("╚══════════════════════════════════════════════╝");
}

main();
