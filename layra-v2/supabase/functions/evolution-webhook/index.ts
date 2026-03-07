// Evolution Webhook — Supabase Edge Function
// Receives incoming WhatsApp messages from Evolution API
// Routes them to the agent engine and sends response back

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getAgentPrompt } from "../_shared/agent-prompts.ts";
import { getAgentKnowledge } from "../_shared/agent-knowledge.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-bd81.up.railway.app";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory session store for WhatsApp conversations
const waSessions = new Map<string, {
  agentId: string;
  messages: Array<{ role: string; content: string }>;
  lastActivity: number;
}>();

// Extract agentId from instance name: layra-demo-{agentId}-{timestamp}
function extractAgentId(instanceName: string): string | null {
  const match = instanceName.match(/^layra-demo-(.+)-\d+$/);
  return match ? match[1] : null;
}

// Send message back via Evolution API
async function sendWhatsAppMessage(instanceName: string, remoteJid: string, text: string) {
  await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: remoteJid,
      text,
    }),
  });
}

// Process message through agent engine (same as agent-chat but for WhatsApp)
async function processAgentMessage(agentId: string, sessionKey: string, message: string, lang: string): Promise<string> {
  const agentPrompt = getAgentPrompt(agentId);
  const knowledge = getAgentKnowledge(agentId);

  // Get or create session
  if (!waSessions.has(sessionKey)) {
    waSessions.set(sessionKey, { agentId, messages: [], lastActivity: Date.now() });
  }
  const session = waSessions.get(sessionKey)!;
  session.lastActivity = Date.now();
  session.messages.push({ role: "user", content: message });

  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  // Build knowledge context
  const l = lang === "es" ? "es" : "en";
  const knowledgeContext = [
    `\n\n--- REAL BUSINESS DATA (use this, never invent) ---`,
    `Business: ${knowledge.businessName[l] || knowledge.businessName.en}`,
    `Hours: ${knowledge.hours}`,
    `Services: ${knowledge.services.map(s => `${s.name[l] || s.name.en}: ${s.price === "0" ? "Free" : s.price + " EUR"}${s.duration ? " (" + s.duration + ")" : ""}`).join(", ")}`,
    `Policies: ${knowledge.policies[l] || knowledge.policies.en}`,
    `--- END BUSINESS DATA ---`,
  ].join("\n");

  const tools = [
    { name: "get_services", description: "Get services with real prices", input_schema: { type: "object" as const, properties: {} } },
    { name: "check_availability", description: "Check available slots", input_schema: { type: "object" as const, properties: { date: { type: "string" } } } },
    { name: "book_appointment", description: "Book appointment", input_schema: { type: "object" as const, properties: { service: { type: "string" }, date: { type: "string" }, time: { type: "string" }, client_name: { type: "string" } }, required: ["service"] } },
    { name: "get_faq", description: "Get FAQ and policies", input_schema: { type: "object" as const, properties: { topic: { type: "string" } } } },
    { name: "transfer_to_human", description: "Transfer to human", input_schema: { type: "object" as const, properties: { reason: { type: "string" } }, required: ["reason"] } },
  ];

  const claudeMessages = session.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let assistantResponse = "";
  let attempts = 0;

  while (attempts < 3) {
    attempts++;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: agentPrompt.system + knowledgeContext,
        tools,
        messages: claudeMessages,
      }),
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const result = await res.json();

    let hasToolUse = false;
    let textContent = "";

    for (const block of result.content) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        hasToolUse = true;
        // Execute tool with real knowledge
        const toolResult = executeToolWA(block.name, block.input, l, knowledge);
        claudeMessages.push({ role: "assistant", content: result.content });
        claudeMessages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: block.id, content: toolResult }] as any,
        });
      }
    }

    if (!hasToolUse) {
      assistantResponse = textContent;
      break;
    }
  }

  session.messages.push({ role: "assistant", content: assistantResponse });
  return assistantResponse;
}

function executeToolWA(toolName: string, toolInput: Record<string, unknown>, l: string, knowledge: any): string {
  const bizName = knowledge.businessName[l] || knowledge.businessName.en;
  switch (toolName) {
    case "get_services":
      return knowledge.services.map((s: any) => `- ${s.name[l] || s.name.en}: ${s.price === "0" ? "Gratis" : s.price + " EUR"}${s.duration ? " (" + s.duration + ")" : ""}`).join("\n");
    case "check_availability":
      return `Disponible: ${knowledge.availableSlots.join(", ")}`;
    case "book_appointment":
      return l === "es"
        ? `Cita reservada en ${bizName} para ${toolInput.service} el ${toolInput.date || "por confirmar"} a las ${toolInput.time || "por confirmar"}.`
        : `Appointment booked at ${bizName} for ${toolInput.service} on ${toolInput.date || "TBC"} at ${toolInput.time || "TBC"}.`;
    case "get_faq":
      return knowledge.faqs.map((f: any) => `Q: ${f.q[l] || f.q.en}\nA: ${f.a[l] || f.a.en}`).join("\n\n") +
        `\n\nHorario: ${knowledge.hours}\nPoliticas: ${knowledge.policies[l] || knowledge.policies.en}`;
    case "transfer_to_human":
      return l === "es" ? `Transferido a humano. Motivo: ${toolInput.reason}` : `Transferred to human. Reason: ${toolInput.reason}`;
    default:
      return "OK";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Evolution API sends different event types
    const event = payload.event;
    if (event !== "messages.upsert") {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = payload.data;
    if (!data) {
      return new Response(JSON.stringify({ status: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip messages from the bot itself
    if (data.key?.fromMe) {
      return new Response(JSON.stringify({ status: "self_message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceName = payload.instance || "";
    const remoteJid = data.key?.remoteJid || "";
    const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || "";

    if (!messageText || !instanceName) {
      return new Response(JSON.stringify({ status: "no_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract agentId from instance name
    const agentId = extractAgentId(instanceName);
    if (!agentId) {
      return new Response(JSON.stringify({ status: "unknown_instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process through agent engine
    const sessionKey = `wa_${instanceName}_${remoteJid}`;
    const response = await processAgentMessage(agentId, sessionKey, messageText, "es");

    // Send response back via WhatsApp
    if (response) {
      await sendWhatsAppMessage(instanceName, remoteJid, response);
    }

    return new Response(
      JSON.stringify({ status: "processed", agentId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
