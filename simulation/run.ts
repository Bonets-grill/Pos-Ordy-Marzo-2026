#!/usr/bin/env npx tsx
// ============================================================
// SIMULATION RUNNER — 10 concurrent tenants, full lifecycle
//
// Usage: npx tsx simulation/run.ts [--cleanup] [--tenants=N]
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY
// ============================================================

import * as dotenv from "dotenv";
import * as path from "path";

// Load env from project root — __dirname may not resolve with tsx, use cwd
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { TENANTS, SIM_CONFIG } from "./config";
import { provisionTenant, cleanupTenant, SeededTenant } from "./db";
import { runTenantSimulation } from "./flows";
import { glog, log, initStats, printDashboard } from "./logger";

// ── Parse CLI args ────────────────────────────────────────────

const args = process.argv.slice(2);
const doCleanup = args.includes("--cleanup");
const tenantCountArg = args.find((a) => a.startsWith("--tenants="));
const tenantCount = tenantCountArg ? parseInt(tenantCountArg.split("=")[1], 10) : 10;
const selectedTenants = TENANTS.slice(0, Math.min(tenantCount, TENANTS.length));

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ORDY POS — MULTI-TENANT LOAD SIMULATION                       ║
║                                                                  ║
║   Tenants:    ${String(selectedTenants.length).padEnd(4)}                                             ║
║   Orders/ea:  ${String(SIM_CONFIG.ordersPerTenant).padEnd(4)}                                             ║
║   Total:      ${String(selectedTenants.length * SIM_CONFIG.ordersPerTenant).padEnd(4)} orders across all tenants              ║
║   Languages:  ES + EN (alternating per wave)                     ║
║   Flows:      POS → KDS → Payment → Receipt → Close             ║
║               QR  → KDS → Payment → Receipt → Close             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Validate env
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  glog("SETUP", `Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // ── Phase 1: Provision all tenants ────────────────────────
  glog("SETUP", `Provisioning ${selectedTenants.length} simulation tenants...`);

  const seeded: SeededTenant[] = [];
  for (let i = 0; i < selectedTenants.length; i++) {
    const profile = selectedTenants[i];
    initStats(i, profile.name);
    try {
      glog("SETUP", `  [${i + 1}/${selectedTenants.length}] ${profile.name} (${profile.slug})...`);
      const tenant = await provisionTenant(profile);
      seeded.push(tenant);
      glog("SETUP", `  ✓ ${profile.name}: ${tenant.menuItems.length} items, ${tenant.tables.length} tables`);
    } catch (err: any) {
      glog("ERROR", `  ✗ ${profile.name}: ${err.message}`);
      process.exit(1);
    }
  }

  glog("SETUP", `All ${seeded.length} tenants provisioned. Starting simulation...\n`);

  // ── Phase 2: Run all tenants concurrently ─────────────────
  const startTime = Date.now();

  // Dashboard refresh interval
  const dashInterval = setInterval(() => {
    printDashboard();
  }, 8000);

  // Run all tenant simulations in parallel
  const results = await Promise.allSettled(
    seeded.map((tenant, idx) => runTenantSimulation(idx, tenant))
  );

  clearInterval(dashInterval);

  // Check for failures
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    glog("ERROR", `${failures.length} tenant(s) failed:`);
    failures.forEach((f) => {
      if (f.status === "rejected") glog("ERROR", `  ${f.reason}`);
    });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Phase 3: Final dashboard ──────────────────────────────
  printDashboard();

  glog("SUMMARY", `Simulation completed in ${elapsed}s`);
  glog("SUMMARY", `${seeded.length} tenants × ${SIM_CONFIG.ordersPerTenant} orders = ${seeded.length * SIM_CONFIG.ordersPerTenant} order lifecycles`);

  // ── Phase 4: Optional cleanup ─────────────────────────────
  if (doCleanup) {
    glog("SETUP", "Cleaning up simulation data...");
    for (const tenant of seeded) {
      await cleanupTenant(tenant.tenantId);
      glog("SETUP", `  ✓ Cleaned ${tenant.profile.name}`);
    }
    glog("SETUP", "Cleanup complete.");
  } else {
    glog("SETUP", "Simulation data preserved. Run with --cleanup to remove.");
  }
}

main().catch((err) => {
  console.error("Fatal simulation error:", err);
  process.exit(1);
});
