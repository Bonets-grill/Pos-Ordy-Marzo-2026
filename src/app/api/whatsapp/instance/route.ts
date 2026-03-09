import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { getProvider } from "@/lib/wa-agent/provider";
import { EvolutionProvider } from "@/lib/wa-agent/providers/evolution";
import type { WAProvider, WAInstance } from "@/lib/wa-agent/types";

/**
 * POST: Create a new WhatsApp instance for the tenant.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const tenantId = auth.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  try {
    const { provider, name, agent_name, agent_language, agent_personality, agent_instructions, welcome_message, away_message } = await req.json() as {
      provider: WAProvider;
      name?: string;
      agent_name?: string;
      agent_language?: string;
      agent_personality?: string;
      agent_instructions?: string;
      welcome_message?: string;
      away_message?: string;
    };

    if (!provider || !["evolution", "meta"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if tenant already has an instance
    const { data: existing } = await supabase
      .from("wa_instances")
      .select("id")
      .eq("tenant_id", tenantId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Instance already exists. Delete it first." }, { status: 409 });
    }

    let evolutionInstanceId: string | undefined;
    let evolutionApiKey: string | undefined;

    if (provider === "evolution") {
      // Create Evolution instance
      const evo = new EvolutionProvider();
      const result = await evo.createInstance(tenantId, name || "default");
      evolutionInstanceId = result.instanceId;
      evolutionApiKey = result.apiKey;

      // Set webhook
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
      if (appUrl) {
        const { data: tempInstance } = await supabase
          .from("wa_instances")
          .insert({
            tenant_id: tenantId,
            provider,
            instance_name: evolutionInstanceId,
            evolution_api_url: process.env.EVOLUTION_API_URL || null,
            evolution_api_key: evolutionApiKey || null,
            evolution_instance_id: evolutionInstanceId,
            status: "connecting",
            agent_name: agent_name || "Asistente",
            agent_language: agent_language || "es",
            agent_personality: agent_personality || "friendly",
            agent_instructions: agent_instructions || null,
            welcome_message: welcome_message || "¡Hola! Soy el asistente del restaurante. ¿En qué puedo ayudarte?",
            away_message: away_message || "Estamos cerrados ahora. ¡Te esperamos en nuestro próximo horario!",
          })
          .select("*")
          .single();

        if (tempInstance) {
          await evo.setWebhook(
            tempInstance as WAInstance,
            `${appUrl.startsWith("http") ? appUrl : `https://${appUrl}`}/api/whatsapp/webhook`
          );
        }

        return NextResponse.json({ instance: tempInstance });
      }
    }

    // For Meta or if no EVOLUTION_API_URL
    const { data: instance, error } = await supabase
      .from("wa_instances")
      .insert({
        tenant_id: tenantId,
        provider,
        instance_name: evolutionInstanceId || null,
        evolution_api_url: process.env.EVOLUTION_API_URL || null,
        evolution_api_key: evolutionApiKey || null,
        evolution_instance_id: evolutionInstanceId || null,
        status: provider === "evolution" ? "connecting" : "disconnected",
        agent_name: agent_name || "Asistente",
        agent_language: agent_language || "es",
        agent_personality: agent_personality || "friendly",
        agent_instructions: agent_instructions || null,
        welcome_message: welcome_message || "¡Hola! Soy el asistente del restaurante. ¿En qué puedo ayudarte?",
        away_message: away_message || "Estamos cerrados ahora. ¡Te esperamos en nuestro próximo horario!",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ instance });
  } catch (err) {
    console.error("Create instance error:", err);
    return NextResponse.json({ error: "Failed to create instance" }, { status: 500 });
  }
}

/**
 * GET: Get current instance info + QR code (for Evolution).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const tenantId = auth.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (!instance) {
    return NextResponse.json({ instance: null });
  }

  // If Evolution and not connected, try to get QR
  let qrCode: string | null = null;
  if (instance.provider === "evolution" && instance.status !== "connected") {
    try {
      const provider = getProvider("evolution");
      qrCode = await provider.getQRCode(instance as WAInstance);
    } catch {
      // QR not available yet
    }
  }

  // Refresh connection status
  try {
    const provider = getProvider(instance.provider as WAProvider);
    const status = await provider.getConnectionStatus(instance as WAInstance);
    if (status !== instance.status) {
      await supabase
        .from("wa_instances")
        .update({ status, ...(status === "connected" ? { connected_at: new Date().toISOString() } : {}) })
        .eq("id", instance.id);
      instance.status = status;
    }
  } catch { /* ignore */ }

  return NextResponse.json({ instance, qrCode });
}

/**
 * PUT: Update instance configuration.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const tenantId = auth.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const updates = await req.json();

  // Only allow updating specific fields
  const allowed = [
    "agent_name", "agent_personality", "agent_language", "agent_instructions",
    "welcome_message", "away_message", "max_items_per_order",
    "allow_orders", "allow_reservations",
    "meta_phone_number_id", "meta_access_token", "meta_verify_token", "meta_waba_id",
  ];

  const safeUpdates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wa_instances")
    .update(safeUpdates)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ instance: data });
}

/**
 * DELETE: Delete the WhatsApp instance.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const tenantId = auth.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const supabase = createServiceClient();
  const { data: instance } = await supabase
    .from("wa_instances")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (!instance) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  // Delete from provider
  try {
    const provider = getProvider(instance.provider as WAProvider);
    await provider.deleteInstance(instance as WAInstance);
  } catch { /* ignore */ }

  // Delete from DB (cascades to sessions and messages)
  await supabase.from("wa_instances").delete().eq("id", instance.id);

  return NextResponse.json({ status: "deleted" });
}
