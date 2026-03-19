import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getProvider } from "@/lib/wa-agent/provider";
import { saveMessage } from "@/lib/wa-agent/sessions";
import type { WAInstance } from "@/lib/wa-agent/types";
import { NOTIFY_I18N, getLang } from "@/lib/wa-agent/language";

/**
 * POST /api/whatsapp/follow-up
 * Processes pending follow-up messages (24h after order ready).
 * Call this via cron every 15 minutes between 14:00-20:00.
 *
 * Auth: Internal cron secret or service key
 */
export async function POST(req: NextRequest) {
  try {
    // Simple auth check
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    const secret = process.env.CRON_SECRET || process.env.DIFY_TOOLS_SECRET || "ordy-dify-tools-2026";
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const now = new Date();
    const currentHour = now.getHours();

    // Only send between 14:00-20:00
    if (currentHour < 14 || currentHour > 20) {
      return NextResponse.json({ status: "outside_hours", sent: 0 });
    }

    // Find orders with pending follow-ups (follow_up_at <= now AND follow_up_sent = false)
    // We use metadata->>follow_up_at and metadata->>follow_up_sent
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, tenant_id, metadata, source")
      .eq("source", "whatsapp")
      .in("status", ["ready", "served", "closed"])
      .not("customer_phone", "is", null)
      .limit(50);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ status: "ok", sent: 0 });
    }

    let sent = 0;

    for (const order of orders) {
      const metadata = (order.metadata || {}) as Record<string, unknown>;

      // Skip if no follow_up_at or already sent
      if (!metadata.follow_up_at || metadata.follow_up_sent === true) continue;

      const followUpAt = new Date(metadata.follow_up_at as string);
      if (followUpAt > now) continue; // Not yet time

      // Get tenant settings for review links
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, settings")
        .eq("id", order.tenant_id)
        .single();

      if (!tenant) continue;

      const settings = (tenant.settings || {}) as Record<string, unknown>;
      const tenantName = tenant.name || "el restaurante";

      // Get WhatsApp instance
      const { data: instance } = await supabase
        .from("wa_instances")
        .select("*")
        .eq("tenant_id", order.tenant_id)
        .single();

      if (!instance) continue;

      // Get client language
      const { data: langSession } = await supabase
        .from("wa_sessions")
        .select("id, context")
        .eq("tenant_id", order.tenant_id)
        .eq("phone", order.customer_phone!)
        .single();

      const lang = getLang(langSession?.context as Record<string, unknown> | null);
      const t = NOTIFY_I18N[lang];

      // Build follow-up message
      let message = t.follow_up(order.customer_name || "", tenantName) + "\n\n";

      const links: string[] = [];
      if (settings.google_review_url) links.push(`⭐ Google: ${settings.google_review_url}`);
      if (settings.tripadvisor_url) links.push(`🏆 TripAdvisor: ${settings.tripadvisor_url}`);

      if (links.length > 0) {
        message += links.join("\n") + "\n\n";
      }

      // Social links
      const socials: string[] = [];
      if (settings.instagram_url) socials.push(`📸 ${settings.instagram_url}`);
      if (settings.facebook_url) socials.push(`👍 ${settings.facebook_url}`);
      if (settings.tiktok_url) socials.push(`🎵 ${settings.tiktok_url}`);

      if (socials.length > 0) {
        message += `Síguenos en redes:\n${socials.join("\n")}\n\n`;
      }

      message += `¡Gracias y esperamos verte pronto! 😊🙏`;

      // Send message
      const provider = getProvider(instance.provider);
      await provider.sendMessage({
        to: order.customer_phone!,
        text: message,
        instance: instance as WAInstance,
      });

      // Save to conversation history
      const { data: session } = await supabase
        .from("wa_sessions")
        .select("id")
        .eq("tenant_id", order.tenant_id)
        .eq("phone", order.customer_phone!)
        .single();

      if (session) {
        await saveMessage(supabase, {
          session_id: session.id,
          tenant_id: order.tenant_id,
          role: "assistant",
          content: message,
        });
      }

      // Mark as sent
      await supabase
        .from("orders")
        .update({ metadata: { ...metadata, follow_up_sent: true } })
        .eq("id", order.id);

      sent++;
    }

    return NextResponse.json({ status: "ok", sent });
  } catch (err) {
    console.error("Follow-up error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
