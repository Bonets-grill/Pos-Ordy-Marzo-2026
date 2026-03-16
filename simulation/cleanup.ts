// Cleanup all simulation data from the database
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing env"); process.exit(1); }

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanup() {
  const { data: simTenants, error: tErr } = await db
    .from("tenants")
    .select("id, name, slug")
    .like("slug", "sim-%");

  if (tErr) { console.error("Tenant query error:", tErr.message); return; }
  if (!simTenants || simTenants.length === 0) {
    console.log("No simulation tenants found. Database is clean.");
    return;
  }

  console.log(`Found ${simTenants.length} simulation tenants to remove.\n`);
  const tenantIds = simTenants.map((t) => t.id);
  const report: Record<string, number> = {};

  for (const tid of tenantIds) {
    // payments
    const { data: d1 } = await db.from("payments").delete().eq("tenant_id", tid).select("id");
    report["payments"] = (report["payments"] || 0) + (d1?.length || 0);

    // order_items
    const { data: d2 } = await db.from("order_items").delete().eq("tenant_id", tid).select("id");
    report["order_items"] = (report["order_items"] || 0) + (d2?.length || 0);

    // orders
    const { data: d3 } = await db.from("orders").delete().eq("tenant_id", tid).select("id");
    report["orders"] = (report["orders"] || 0) + (d3?.length || 0);

    // cash_movements
    const { data: d4 } = await db.from("cash_movements").delete().eq("tenant_id", tid).select("id");
    report["cash_movements"] = (report["cash_movements"] || 0) + (d4?.length || 0);

    // cash_shifts
    const { data: d5 } = await db.from("cash_shifts").delete().eq("tenant_id", tid).select("id");
    report["cash_shifts"] = (report["cash_shifts"] || 0) + (d5?.length || 0);

    // restaurant_tables
    const { data: d6 } = await db.from("restaurant_tables").delete().eq("tenant_id", tid).select("id");
    report["restaurant_tables"] = (report["restaurant_tables"] || 0) + (d6?.length || 0);

    // zones
    const { data: d7 } = await db.from("zones").delete().eq("tenant_id", tid).select("id");
    report["zones"] = (report["zones"] || 0) + (d7?.length || 0);

    // kds_stations
    const { data: d8 } = await db.from("kds_stations").delete().eq("tenant_id", tid).select("id");
    report["kds_stations"] = (report["kds_stations"] || 0) + (d8?.length || 0);

    // modifiers
    const { data: d9 } = await db.from("modifiers").delete().eq("tenant_id", tid).select("id");
    report["modifiers"] = (report["modifiers"] || 0) + (d9?.length || 0);

    // modifier_groups
    const { data: d10 } = await db.from("modifier_groups").delete().eq("tenant_id", tid).select("id");
    report["modifier_groups"] = (report["modifier_groups"] || 0) + (d10?.length || 0);

    // menu_items
    const { data: d11 } = await db.from("menu_items").delete().eq("tenant_id", tid).select("id");
    report["menu_items"] = (report["menu_items"] || 0) + (d11?.length || 0);

    // menu_categories
    const { data: d12 } = await db.from("menu_categories").delete().eq("tenant_id", tid).select("id");
    report["menu_categories"] = (report["menu_categories"] || 0) + (d12?.length || 0);

    // loyalty
    await db.from("loyalty_settings").delete().eq("tenant_id", tid);
    const { data: d13 } = await db.from("loyalty_customers").delete().eq("tenant_id", tid).select("id");
    report["loyalty_customers"] = (report["loyalty_customers"] || 0) + (d13?.length || 0);

    // users table rows + auth users
    const { data: users } = await db.from("users").delete().eq("tenant_id", tid).select("id, email");
    report["users"] = (report["users"] || 0) + (users?.length || 0);

    if (users) {
      for (const u of users) {
        const { error } = await db.auth.admin.deleteUser(u.id);
        if (!error) report["auth_users"] = (report["auth_users"] || 0) + 1;
      }
    }

    // tenant itself
    await db.from("tenants").delete().eq("id", tid);
  }
  report["tenants"] = simTenants.length;

  // Print report
  console.log("════════════════════════════════════════════════════");
  console.log("  CLEANUP REPORT");
  console.log("════════════════════════════════════════════════════");
  console.log("");
  console.log("  Tenants removed:");
  for (const t of simTenants) {
    console.log(`    - ${t.name} (${t.slug}) [${t.id}]`);
  }
  console.log("");
  console.log("  Records deleted:");
  for (const [table, count] of Object.entries(report)) {
    if (count > 0) {
      console.log(`    ${table.padEnd(28)}: ${count}`);
    }
  }
  console.log("");

  // Verify zero residue
  const { data: verify } = await db.from("tenants").select("id").like("slug", "sim-%");
  const { data: verifyOrders } = await db.from("orders").select("id").in("tenant_id", tenantIds);
  const { data: verifyUsers } = await db.from("users").select("id").in("tenant_id", tenantIds);

  console.log("  Verification:");
  console.log(`    sim-* tenants remaining:   ${verify?.length || 0}`);
  console.log(`    orphan orders remaining:   ${verifyOrders?.length || 0}`);
  console.log(`    orphan users remaining:    ${verifyUsers?.length || 0}`);
  console.log("");
  console.log("════════════════════════════════════════════════════");
}

cleanup().catch((e) => { console.error("Fatal:", e); process.exit(1); });
