#!/usr/bin/env npx tsx
// ============================================================
// ISOLATED SIMULATION RUNNER
//
// Usage: npx tsx simulation/run-isolated.ts [--tenants=N]
//
// - Zero Supabase connections
// - Zero env vars read
// - All data in-memory (dies on exit)
// - Dashboard at http://localhost:4000
// ============================================================

// NO dotenv import — intentional
// NO process.env access — intentional

import { TENANTS, SIM_CONFIG } from "./config";
import { seedTenant, SeededTenantInfo } from "./mem-db";
import { runTenantSimulation } from "./flows-isolated";
import { glog, initStats, printDashboard } from "./logger";
import { startDashboardServer, stopDashboardServer } from "./dashboard-server";

// ── Parse CLI args ────────────────────────────────────────────

const args = process.argv.slice(2);
const tenantCountArg = args.find((a) => a.startsWith("--tenants="));
const tenantCount = tenantCountArg ? parseInt(tenantCountArg.split("=")[1], 10) : 10;
const selectedTenants = TENANTS.slice(0, Math.min(tenantCount, TENANTS.length));

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ORDY POS — ISOLATED SIMULATION (IN-MEMORY)                    ║
║                                                                  ║
║   Tenants:    ${String(selectedTenants.length).padEnd(4)}                                             ║
║   Orders/ea:  ${String(SIM_CONFIG.ordersPerTenant).padEnd(4)}                                             ║
║   Total:      ${String(selectedTenants.length * SIM_CONFIG.ordersPerTenant).padEnd(4)} orders across all tenants              ║
║   Languages:  ES + EN (alternating per wave)                     ║
║   Database:   IN-MEMORY ONLY (zero Supabase)                     ║
║   Dashboard:  http://localhost:4000                              ║
║                                                                  ║
║   Supabase:   NOT CONNECTED                                      ║
║   Network:    LOCAL ONLY                                         ║
║   Cleanup:    Automatic (process exit = data gone)               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // ── Phase 1: Start dashboard server ───────────────────────
  await new Promise<void>((resolve) => {
    startDashboardServer(selectedTenants.length, () => {
      glog("SETUP", "Dashboard live at http://localhost:4000");
      resolve();
    });
  });

  // ── Phase 2: Seed all tenants in memory ───────────────────
  glog("SETUP", `Seeding ${selectedTenants.length} tenants in memory...`);

  const seeded: SeededTenantInfo[] = [];
  for (let i = 0; i < selectedTenants.length; i++) {
    const profile = selectedTenants[i];
    initStats(i, profile.name);
    const tenant = seedTenant(profile);
    seeded.push(tenant);
    glog("SETUP", `  [${i + 1}/${selectedTenants.length}] ${profile.name}: ${tenant.menuItems.length} items, ${profile.tableCount} tables`);
  }

  glog("SETUP", `All ${seeded.length} tenants seeded. Open http://localhost:4000 to observe.\n`);
  glog("SETUP", "Starting simulation in 3 seconds...");
  await new Promise((r) => setTimeout(r, 3000));

  // ── Phase 3: Run all tenants concurrently ─────────────────
  const startTime = Date.now();

  const dashInterval = setInterval(() => {
    printDashboard();
  }, 10000);

  const results = await Promise.allSettled(
    seeded.map((tenant, idx) => runTenantSimulation(idx, tenant))
  );

  clearInterval(dashInterval);

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    glog("ERROR", `${failures.length} tenant(s) had errors`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Phase 4: Final report ─────────────────────────────────
  printDashboard();

  glog("SUMMARY", `Simulation completed in ${elapsed}s`);
  glog("SUMMARY", `${seeded.length} tenants x ${SIM_CONFIG.ordersPerTenant} orders = ${seeded.length * SIM_CONFIG.ordersPerTenant} lifecycles`);
  glog("SUMMARY", "Dashboard remains live at http://localhost:4000 — Ctrl+C to exit (all data vanishes)");

  // Keep process alive for dashboard viewing
  // setInterval prevents Node from exiting (active timer handle)
  setInterval(() => {}, 60_000);
}

main().catch((err) => {
  console.error("Fatal:", err);
  stopDashboardServer();
  process.exit(1);
});
