import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getProvider } from "@/lib/wa-agent/provider";
import type { WAInstance } from "@/lib/wa-agent/types";
import { saveMessage } from "@/lib/wa-agent/sessions";

/**
 * POST /api/whatsapp/notify
 * Send WhatsApp notifications to customers from KDS/kitchen actions.
 *
 * Body: { orderId, type, pickup_minutes?, tenant_id }
 * Types: "kitchen_accepted" | "kitchen_rejected" | "order_ready"
 */
export async function POST(req: NextRequest) {
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

    const supabase = createServiceClient();

    // Get order with customer phone
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, total, metadata, order_type")
      .eq("id", orderId)
      .single();

    if (!order || !order.customer_phone) {
      return NextResponse.json({ error: "Order not found or no phone" }, { status: 404 });
    }

    if (order.order_type !== "whatsapp") {
      return NextResponse.json({ error: "Not a WhatsApp order" }, { status: 400 });
    }

    // Get WhatsApp instance for this tenant
    const { data: instance } = await supabase
      .from("wa_instances")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (!instance) {
      return NextResponse.json({ error: "WhatsApp instance not found" }, { status: 404 });
    }

    // Get tenant info for Google Maps / name
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, settings")
      .eq("id", tenant_id)
      .single();

    const tenantName = tenant?.name || "el restaurante";
    const settings = (tenant?.settings || {}) as Record<string, unknown>;
    const googleMapsUrl = settings.google_maps_url as string || "";

    // Find wa_session for this phone + tenant
    const { data: session } = await supabase
      .from("wa_sessions")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("phone", order.customer_phone)
      .single();

    let message = "";

    switch (type) {
      case "kitchen_accepted": {
        // Update order metadata with pickup time
        const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_minutes, pickup_status: "awaiting_confirmation" };
        await supabase
          .from("orders")
          .update({ metadata })
          .eq("id", orderId);

        // Update session state to awaiting pickup confirmation
        if (session) {
          await supabase
            .from("wa_sessions")
            .update({ state: "awaiting_pickup_confirmation", pending_order_id: orderId })
            .eq("id", session.id);
        }

        message = `🍳 *¡Buenas noticias, ${order.customer_name || ""}!*\n\n` +
          `Cocina ha aceptado tu pedido #${order.order_number} y estará listo en aproximadamente *${pickup_minutes} minutos*. ⏱️\n\n` +
          `¿Te parece bien ese tiempo? Responde:\n` +
          `✅ *SÍ* — para confirmar\n` +
          `❌ *NO* — para cancelar el pedido\n`;
        break;
      }

      case "kitchen_rejected": {
        // Cancel the order
        const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "rejected_by_kitchen" };
        await supabase
          .from("orders")
          .update({ status: "cancelled", metadata })
          .eq("id", orderId);

        await supabase
          .from("order_items")
          .update({ kds_status: "served" })
          .eq("order_id", orderId);

        // Reset session
        if (session) {
          await supabase
            .from("wa_sessions")
            .update({ state: "idle", pending_order_id: null, cart: [] })
            .eq("id", session.id);
        }

        message = `😔 Lo sentimos mucho, ${order.customer_name || ""}.\n\n` +
          `Lamentablemente, cocina no puede preparar tu pedido #${order.order_number} en este momento.\n\n` +
          `Te invitamos a intentarlo más tarde o a elegir otros productos. ¡Disculpa las molestias! 🙏`;
        break;
      }

      case "order_ready": {
        // Update metadata
        const metadata = { ...(order.metadata as Record<string, unknown> || {}), pickup_status: "ready" };
        await supabase
          .from("orders")
          .update({ metadata, ready_at: new Date().toISOString() })
          .eq("id", orderId);

        message = `🎉 *¡${order.customer_name || "Hola"}! ¡Tu pedido #${order.order_number} está LISTO!* 🎉\n\n` +
          `Ya puedes venir a recogerlo. ¡Te esperamos! 😊\n`;

        if (googleMapsUrl) {
          message += `\n📍 *Cómo llegar:* ${googleMapsUrl}\n`;
        }

        message += `\n¡Muchas gracias por elegir ${tenantName}! ❤️ ¡Que lo disfrutes!`;

        // Reset session state
        if (session) {
          await supabase
            .from("wa_sessions")
            .update({ state: "idle", pending_order_id: null })
            .eq("id", session.id);
        }
        break;
      }
    }

    // Send via WhatsApp
    const provider = getProvider(instance.provider);
    await provider.sendMessage({
      to: order.customer_phone,
      text: message,
      instance: instance as WAInstance,
    });

    // Save message to wa_messages for conversation history
    if (session) {
      await saveMessage(supabase, {
        session_id: session.id,
        tenant_id: tenant_id,
        role: "assistant",
        content: message,
      });
    }

    return NextResponse.json({ status: "ok", message_sent: true });
  } catch (err) {
    console.error("WhatsApp notify error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
