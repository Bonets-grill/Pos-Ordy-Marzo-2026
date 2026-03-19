import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { buildDifyInputs } from "@/lib/wa-agent/dify-context";

/**
 * GET /api/whatsapp/test-dify?tenant_id=xxx
 * Tests the Dify connection with the restaurant's menu context.
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const DIFY_API_URL = process.env.DIFY_API_URL;
  const DIFY_API_KEY = process.env.DIFY_API_KEY;

  const checks: Record<string, unknown> = {
    dify_url: DIFY_API_URL || "NOT SET",
    dify_key: DIFY_API_KEY ? `${DIFY_API_KEY.substring(0, 10)}...` : "NOT SET",
    timestamp: new Date().toISOString(),
  };

  // 1. Build inputs
  try {
    const supabase = createServiceClient();
    const inputs = await buildDifyInputs(supabase, tenantId);
    checks.inputs_ok = true;
    checks.menu_length = inputs.menu?.length || 0;
    checks.business_name = inputs.business_name;

    // 2. Test Dify call
    if (DIFY_API_URL && DIFY_API_KEY) {
      const resp = await fetch(`${DIFY_API_URL}/chat-messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs,
          query: "Hola, qué tal?",
          response_mode: "streaming",
          user: "test-diagnostic",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        checks.dify_status = resp.status;
        checks.dify_error = errText;
      } else {
        const text = await resp.text();
        let answer = "";
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.event === "agent_message" || json.event === "message") {
              answer += json.answer || "";
            }
          } catch { /* skip */ }
        }
        checks.dify_status = 200;
        checks.dify_answer = answer || "EMPTY";
        checks.dify_ok = !!answer;
      }
    } else {
      checks.dify_status = "SKIPPED — no env vars";
    }
  } catch (err) {
    checks.error = (err as Error).message;
  }

  return NextResponse.json(checks);
}
