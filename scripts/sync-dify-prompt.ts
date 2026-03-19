/**
 * Generate and display the Dify prompt for a tenant.
 * Usage: npx tsx scripts/sync-dify-prompt.ts [tenant_id]
 */
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SRK) { console.error("SUPABASE_SERVICE_ROLE_KEY required"); process.exit(1); }

const supabase = createClient(SUPA_URL, SRK);

async function main() {
  const tenantId = process.argv[2] || "4c0acda5-853c-44d9-b350-9a7941eb4391";

  const { generateAgentPrompt, syncPromptToDify } = await import("../src/lib/wa-agent/dify-sync");

  console.log(`\n🤖 Generating Dify prompt for tenant: ${tenantId}\n`);

  const result = await generateAgentPrompt(supabase, tenantId);

  console.log("═".repeat(70));
  console.log("  PROMPT GENERATION RESULT");
  console.log("═".repeat(70));
  console.log(`  Hash:       ${result.hash}`);
  console.log(`  Changed:    ${result.changed ? "YES — needs sync" : "NO — up to date"}`);
  console.log(`  Length:     ${result.prompt.length} chars`);
  console.log(`  Variables:  ${result.variables.join(", ")}`);
  console.log(`  Generated:  ${result.generated_at}`);
  console.log("═".repeat(70));

  console.log("\n── FULL PROMPT ──\n");
  console.log(result.prompt);

  console.log("\n── TOOLS SCHEMA (for Dify) ──\n");
  console.log(result.tools_schema);

  // Sync
  console.log("\n── SYNC ──\n");
  const sync = await syncPromptToDify(supabase, tenantId, result);
  console.log(`  Method: ${sync.method}`);
  console.log(`  Synced: ${sync.synced}`);
  console.log(`  ${sync.message}`);
  console.log();
}

main().catch(console.error);
