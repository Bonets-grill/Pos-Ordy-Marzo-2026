import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { sendToAirtable, getTenantName } from "@/lib/airtable/dispatcher";

/**
 * POST /api/airtable/sync
 * Proxy route for frontend components to sync data to Airtable.
 * Keeps the Airtable API key server-side only.
 *
 * Body: { table: string, fields: Record<string, unknown> }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { tenantId } = auth;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  let body: { table: string; fields: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { table, fields } = body;
  if (!table || !fields) {
    return NextResponse.json({ error: "table and fields required" }, { status: 400 });
  }

  // Inject tenant name if not provided
  if (!fields['Tenant Name']) {
    fields['Tenant Name'] = await getTenantName(tenantId);
  }

  // Add timestamp if not provided
  if (!fields['Timestamp']) {
    fields['Timestamp'] = new Date().toISOString();
  }

  const result = await sendToAirtable(table, fields);
  return NextResponse.json(result);
}
