// Evolution Manager — Supabase Edge Function
// Creates/manages WhatsApp instances for agent demos via Evolution API
// Endpoints: create-instance, get-qr, status, delete-instance

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-bd81.up.railway.app";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Track active demo sessions (in-memory, auto-expire)
const demoSessions = new Map<string, { instanceName: string; createdAt: number; expiresAt: number }>();

// Clean up expired sessions periodically
function cleanExpired() {
  const now = Date.now();
  for (const [key, session] of demoSessions) {
    if (now > session.expiresAt) {
      demoSessions.delete(key);
      // Fire and forget — delete the instance
      deleteInstance(session.instanceName).catch(() => {});
    }
  }
}

async function evoFetch(path: string, method: string = "GET", body?: unknown) {
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

async function createInstance(instanceName: string) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
  return evoFetch("/instance/create", "POST", {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    webhook: {
      url: webhookUrl,
      events: ["MESSAGES_UPSERT"],
      webhook_by_events: false,
    },
  });
}

async function getQrCode(instanceName: string) {
  return evoFetch(`/instance/connect/${instanceName}`);
}

async function getInstanceStatus(instanceName: string) {
  return evoFetch(`/instance/connectionState/${instanceName}`);
}

async function deleteInstance(instanceName: string) {
  return evoFetch(`/instance/delete/${instanceName}`, "DELETE");
}

async function logoutInstance(instanceName: string) {
  return evoFetch(`/instance/logout/${instanceName}`, "DELETE");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Clean expired sessions on every request
  cleanExpired();

  try {
    const { action, agentId } = await req.json();

    if (!action || !agentId) {
      return new Response(
        JSON.stringify({ error: "action and agentId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = `layra-demo-${agentId}-${Date.now()}`;

    switch (action) {
      case "create": {
        // Check if there's already an active session for this agent
        const existingKey = `agent_${agentId}`;
        const existing = demoSessions.get(existingKey);
        if (existing && Date.now() < existing.expiresAt) {
          // Return existing instance QR
          const qr = await getQrCode(existing.instanceName);
          const status = await getInstanceStatus(existing.instanceName);
          return new Response(
            JSON.stringify({
              instanceName: existing.instanceName,
              qr: qr?.base64 || qr?.code || null,
              pairingCode: qr?.pairingCode || null,
              status: status?.state || "unknown",
              expiresAt: existing.expiresAt,
              remainingMs: existing.expiresAt - Date.now(),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create new instance
        const result = await createInstance(instanceName);

        // Store session with 10-minute expiry
        const DEMO_DURATION_MS = 10 * 60 * 1000; // 10 minutes
        demoSessions.set(existingKey, {
          instanceName,
          createdAt: Date.now(),
          expiresAt: Date.now() + DEMO_DURATION_MS,
        });

        // Get QR code
        const qr = await getQrCode(instanceName);

        return new Response(
          JSON.stringify({
            instanceName,
            qr: qr?.base64 || result?.qrcode?.base64 || null,
            pairingCode: qr?.pairingCode || result?.qrcode?.pairingCode || null,
            status: "created",
            expiresAt: Date.now() + DEMO_DURATION_MS,
            remainingMs: DEMO_DURATION_MS,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "qr": {
        const existingKey = `agent_${agentId}`;
        const session = demoSessions.get(existingKey);
        if (!session) {
          return new Response(
            JSON.stringify({ error: "No active session. Create one first." }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const qr = await getQrCode(session.instanceName);
        const status = await getInstanceStatus(session.instanceName);
        return new Response(
          JSON.stringify({
            instanceName: session.instanceName,
            qr: qr?.base64 || qr?.code || null,
            pairingCode: qr?.pairingCode || null,
            status: status?.state || "unknown",
            remainingMs: Math.max(0, session.expiresAt - Date.now()),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        const existingKey = `agent_${agentId}`;
        const session = demoSessions.get(existingKey);
        if (!session) {
          return new Response(
            JSON.stringify({ status: "no_session" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const status = await getInstanceStatus(session.instanceName);
        return new Response(
          JSON.stringify({
            instanceName: session.instanceName,
            status: status?.state || "unknown",
            remainingMs: Math.max(0, session.expiresAt - Date.now()),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "end": {
        const existingKey = `agent_${agentId}`;
        const session = demoSessions.get(existingKey);
        if (session) {
          await logoutInstance(session.instanceName).catch(() => {});
          await deleteInstance(session.instanceName).catch(() => {});
          demoSessions.delete(existingKey);
        }
        return new Response(
          JSON.stringify({ status: "ended" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Evolution manager error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
