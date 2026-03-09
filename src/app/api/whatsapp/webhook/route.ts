import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { processMessage } from "@/lib/wa-agent/agent";
import { getProvider } from "@/lib/wa-agent/provider";
import type { WAInstance, IncomingMessage } from "@/lib/wa-agent/types";
import { MetaProvider } from "@/lib/wa-agent/providers/meta";

/**
 * POST: Receive incoming messages from Evolution API or Meta Cloud API.
 * Evolution sends: { event, instance, data: { key, message, ... } }
 * Meta sends: { object: "whatsapp_business_account", entry: [...] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServiceClient();

    // Detect provider from payload shape
    if (body.object === "whatsapp_business_account") {
      // ── META CLOUD API ──
      return handleMetaWebhook(supabase, body);
    } else if (body.event || body.instance) {
      // ── EVOLUTION API ──
      return handleEvolutionWebhook(supabase, body);
    }

    return NextResponse.json({ status: "ignored" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

/**
 * GET: Meta webhook verification (hub.challenge).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const instanceId = params.get("instance_id");

  if (!instanceId) {
    return new NextResponse("Missing instance_id", { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("meta_verify_token")
    .eq("id", instanceId)
    .eq("provider", "meta")
    .single();

  if (!instance?.meta_verify_token) {
    return new NextResponse("Instance not found", { status: 404 });
  }

  const meta = new MetaProvider();
  const challenge = meta.verifyWebhook(params, instance.meta_verify_token);

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Verification failed", { status: 403 });
}

// ── Evolution API handler ──

async function handleEvolutionWebhook(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const event = body.event as string;
  const instanceName = (body.instance as string) || (body.instanceName as string);

  // Only process text messages
  if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
    // Handle connection updates
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = (body.data as Record<string, unknown>)?.state as string;
      if (instanceName && state) {
        const status = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
        await supabase
          .from("wa_instances")
          .update({
            status,
            ...(status === "connected" ? { connected_at: new Date().toISOString() } : {})
          })
          .eq("instance_name", instanceName)
          .eq("provider", "evolution");
      }
    }
    return NextResponse.json({ status: "ok" });
  }

  // Parse message
  const data = body.data as Record<string, unknown>;
  const key = data.key as Record<string, unknown>;
  const messageObj = data.message as Record<string, unknown>;

  // Skip messages sent by us
  if (key?.fromMe) {
    return NextResponse.json({ status: "ok" });
  }

  const remoteJid = key?.remoteJid as string;
  if (!remoteJid || remoteJid.includes("@g.us")) {
    // Skip group messages
    return NextResponse.json({ status: "ok" });
  }

  // Extract phone number (remove @s.whatsapp.net)
  const phone = remoteJid.replace("@s.whatsapp.net", "");

  // Extract text content
  let text = "";
  if (messageObj?.conversation) {
    text = messageObj.conversation as string;
  } else if (messageObj?.extendedTextMessage) {
    text = (messageObj.extendedTextMessage as Record<string, unknown>).text as string;
  }

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ status: "ok" }); // skip non-text (images, etc.)
  }

  // Find the instance
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("*")
    .eq("instance_name", instanceName)
    .eq("provider", "evolution")
    .single();

  if (!instance) {
    console.error("Instance not found:", instanceName);
    return NextResponse.json({ status: "instance_not_found" }, { status: 404 });
  }

  // Process with agent
  const incomingMessage: IncomingMessage = {
    from: phone,
    text: text.trim(),
    wa_message_id: key?.id as string || "",
    timestamp: Date.now(),
  };

  const response = await processMessage(supabase, instance as WAInstance, incomingMessage);

  // Send response via Evolution
  const provider = getProvider("evolution");
  await provider.sendMessage({
    to: phone,
    text: response,
    instance: instance as WAInstance,
  });

  return NextResponse.json({ status: "ok" });
}

// ── Meta Cloud API handler ──

async function handleMetaWebhook(supabase: ReturnType<typeof createServiceClient>, body: Record<string, unknown>) {
  const meta = new MetaProvider();
  const parsed = meta.parseWebhook(body);

  if (!parsed) {
    return NextResponse.json({ status: "ok" }); // not a text message
  }

  // Find instance by Meta phone number ID
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("*")
    .eq("meta_phone_number_id", parsed.phoneId)
    .eq("provider", "meta")
    .single();

  if (!instance) {
    console.error("Meta instance not found for phone:", parsed.phoneId);
    return NextResponse.json({ status: "instance_not_found" }, { status: 404 });
  }

  // Mark as read
  await meta.markAsRead(instance as WAInstance, parsed.wa_message_id);

  // Process with agent
  const incomingMessage: IncomingMessage = {
    from: parsed.from,
    text: parsed.text,
    wa_message_id: parsed.wa_message_id,
    timestamp: parsed.timestamp,
  };

  const response = await processMessage(supabase, instance as WAInstance, incomingMessage);

  // Send response via Meta
  const provider = getProvider("meta");
  await provider.sendMessage({
    to: parsed.from,
    text: response,
    instance: instance as WAInstance,
  });

  return NextResponse.json({ status: "ok" });
}
