import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";
import { getProvider } from "@/lib/wa-agent/provider";
import type { WAInstance } from "@/lib/wa-agent/types";
import { saveMessage } from "@/lib/wa-agent/sessions";
import { NOTIFY_I18N, getLang } from "@/lib/wa-agent/language";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { orderId, type, pickup_minutes, tenant_id } = body as {
      orderId: string;
      type: "kitchen_accepted" | "kitchen_rejected" | "order_ready";
      pickup_minutes?: number;
      tenant_id: string;
    };

    if (!orderId || !type || !tenant_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (auth.tenantId !== tenant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceClient();

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, total, metadata, order_type, source")
      .eq("id", orderId)
      .single();

    if (!order || !order.customer_phone) {
      return NextResponse.json({ error: "Order not found or no phone" }, { status: 404 });
    }

    if (order.source !== "whatsapp") {
      return NextResponse.json({ error: "Not a WhatsApp order" }, { status: 400 });
    }

    const { data: instance } = await supabase
      .from("wa_instances")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (!instance) {
      return NextResponse.json({ error: "WhatsApp instance not found" }, { status: 404 });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, settings")
      .eq("id", tenant_id)
      .single();

    const tenantName = tenant?.name || "el restaurante";
    const settings = (tenant?.settings || {}) as Record<string, unknown>;
    const googleMapsUrl = settings.google_maps_url as string || "";

    const { data: session } = await supabase
      .from("wa_sessions")
      .select("id, context")
      .eq("tenant_id", tenant_id)
      .eq("phone", order.customer_phone)
      .single();

    // Use client's detected language for notifications
    const lang = getLang((session?.context || {}) as Record<string, unknown>);
    const t = NOTIFY_I18N[lang];
    const name = order.customer_name || "";
    const num = String(order.order_number);

    let message = "";

    switch (type) {
      case "kitchen_accepted": {
        const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_minutes, pickup_status: "awaiting_confirmation" };
        await supabase.from("orders").update({ metadata }).eq("id", orderId);
        if (session) {
          await supabase.from("wa_sessions")
            .update({ state: "awaiting_pickup_confirmation", pending_order_id: orderId })
            .eq("id", session.id);
        }
        message = t.kitchen_accepted(name, num, pickup_minutes ?? "?");
        break;
      }
      case "kitchen_rejected": {
        const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "rejected_by_kitchen" };
        await supabase.from("orders").update({ status: "cancelled", metadata }).eq("id", orderId);
        await supabase.from("order_items").update({ kds_status: "served" }).eq("order_id", orderId);
        if (session) {
          await supabase.from("wa_sessions").update({ state: "idle", pending_order_id: null, cart: [] }).eq("id", session.id);
        }
        message = t.kitchen_rejected(name, num);
        break;
      }
      case "order_ready": {
        const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "ready" };
        await supabase.from("orders").update({ metadata, ready_at: new Date().toISOString() }).eq("id", orderId);
        message = t.order_ready(name, num, tenantName, googleMapsUrl || undefined);
        if (session) {
          await supabase.from("wa_sessions").update({ state: "idle", pending_order_id: null }).eq("id", session.id);
        }
        break;
      }
    }

    const provider = getProvider(instance.provider);
    await provider.sendMessage({ to: order.customer_phone, text: message, instance: instance as WAInstance });

    if (session) {
      await saveMessage(supabase, { session_id: session.id, tenant_id, role: "assistant", content: message });
    }

    return NextResponse.json({ status: "ok", message_sent: true });
  } catch (err) {
    console.error("WhatsApp notify error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
