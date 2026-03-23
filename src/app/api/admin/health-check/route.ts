import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { sendToAirtableAsync, getTenantName } from "@/lib/airtable/dispatcher";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const secret = searchParams.get("secret");
  const tenantId = searchParams.get("tenantId");

  if (!CRON_SECRET || secret !== CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const supabase = createServiceClient();
  const issues: { critical: boolean; msg: string }[] = [];

  try {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, slug, active, settings")
      .eq("id", tenantId)
      .single();

    if (!tenant || !tenant.active) {
      return NextResponse.json({ ok: false, issues: [{ critical: true, msg: "Tenant not found or inactive" }] });
    }

    // 1. Modifier orphans
    const { data: links } = await supabase.from("menu_item_modifier_groups").select("group_id").eq("tenant_id", tenantId);
    const { data: mods } = await supabase.from("modifiers").select("id, name_es, group_id").eq("tenant_id", tenantId).eq("active", true);
    if (links && mods) {
      const linkedGroups = new Set(links.map((l: any) => l.group_id));
      const orphans = mods.filter((m: any) => !linkedGroups.has(m.group_id));
      if (orphans.length > 0) {
        issues.push({ critical: true, msg: `${orphans.length} modifiers huérfanos — pedidos QR fallarán: ${orphans.map((o: any) => o.name_es).join(", ")}` });
      }
    }

    // 2. Stale occupied tables
    const { data: occupiedTables } = await supabase
      .from("restaurant_tables")
      .select("number, current_order_id")
      .eq("tenant_id", tenantId)
      .eq("status", "occupied");

    if (occupiedTables && occupiedTables.length > 0) {
      for (const t of occupiedTables) {
        if (!t.current_order_id) { issues.push({ critical: false, msg: `Mesa ${t.number} ocupada sin pedido` }); continue; }
        const { data: o } = await supabase.from("orders").select("status").eq("id", t.current_order_id).single();
        if (!o || ["closed","cancelled","refunded"].includes(o.status)) {
          issues.push({ critical: false, msg: `Mesa ${t.number} bloqueada — pedido ${o?.status || "no encontrado"}` });
        }
      }
    }

    // 3. WhatsApp connection
    const waSettings = (tenant as any).settings?.whatsapp;
    if (waSettings?.enabled && waSettings?.instance_name) {
      try {
        const evoUrl = process.env.EVOLUTION_API_URL;
        const evoKey = process.env.EVOLUTION_API_KEY;
        const res = await fetch(`${evoUrl}/instance/fetchInstances`, {
          headers: { apikey: evoKey || "" },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          const instances = Array.isArray(data) ? data : (data.data || []);
          const inst = instances.find((i: any) => i.name === waSettings.instance_name || i.instance?.instanceName === waSettings.instance_name);
          const state = inst?.connectionStatus || inst?.instance?.state || "unknown";
          if (state !== "open") {
            issues.push({ critical: true, msg: `WhatsApp desconectado — estado: ${state} — ve al dashboard y reconecta` });
          }
        }
      } catch {
        issues.push({ critical: true, msg: "Evolution API no responde — WhatsApp offline" });
      }
    }

    // 4. Active menu items
    const { count: itemCount } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .eq("available", true);

    if (!itemCount || itemCount === 0) {
      issues.push({ critical: true, msg: "Sin items activos en el menú" });
    }

    // 5. Send WhatsApp alert if critical issues
    const criticalIssues = issues.filter(i => i.critical);
    if (criticalIssues.length > 0 && waSettings?.enabled && waSettings?.instance_name) {
      const adminPhone = (tenant as any).settings?.admin_phone;
      if (adminPhone) {
        try {
          const evoUrl = process.env.EVOLUTION_API_URL;
          const evoKey = process.env.EVOLUTION_API_KEY;
          const alertMsg = `🚨 *Ordy POS — Alerta del sistema*\n\n*${tenant.name}* tiene ${criticalIssues.length} problema(s) crítico(s):\n\n${criticalIssues.map(i => `• ${i.msg}`).join("\n")}\n\n_Revisa el panel de administración_`;
          await fetch(`${evoUrl}/message/sendText/${waSettings.instance_name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evoKey || "" },
            body: JSON.stringify({ number: adminPhone, text: alertMsg }),
          });
        } catch { /* silent */ }
      }
    }

    // Airtable: registrar alertas del sistema
    if (issues.length > 0 && tenantId) {
      const tenantName = await getTenantName(tenantId);
      for (const issue of issues) {
        sendToAirtableAsync('system_alerts', {
          'Alert Type': 'health_check',
          'Severity': issue.critical ? 'critical' : 'warning',
          'Message': issue.msg,
          'Details': '',
          'Tenant Name': tenantName,
          'Resolved': false,
          'Timestamp': new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      ok: criticalIssues.length === 0,
      tenant: tenant.name,
      issues,
      critical: criticalIssues.length,
      checked_at: new Date().toISOString(),
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
