import type { Config } from "@netlify/functions";

const POS_URL = "https://ordy-pos-app.netlify.app";
const CRON_SECRET = process.env.CRON_SECRET || "ordy-health-2026";
const TENANT_IDS = (process.env.HEALTH_CHECK_TENANT_IDS || "").split(",").filter(Boolean);

export default async function handler() {
  if (TENANT_IDS.length === 0) {
    console.log("No HEALTH_CHECK_TENANT_IDS configured — skipping");
    return;
  }

  for (const tenantId of TENANT_IDS) {
    try {
      const res = await fetch(`${POS_URL}/api/admin/health-check?tenantId=${tenantId}&secret=${CRON_SECRET}`);
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ ${data.tenant} — OK`);
      } else {
        console.log(`❌ ${data.tenant} — ${data.critical} critical issues:`);
        (data.issues || []).filter((i: any) => i.critical).forEach((i: any) => console.log(`  • ${i.msg}`));
      }
    } catch (e: any) {
      console.error(`Health check failed for ${tenantId}: ${e.message}`);
    }
  }
}

export const config: Config = {
  schedule: "0 */2 * * *",
};
