// Agent Chat — Supabase Edge Function
// Handles web chat + WhatsApp messages for AI agent demos
// Uses REAL knowledge base per agent (services, prices, hours, FAQs)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getAgentPrompt } from "../_shared/agent-prompts.ts";
import { getAgentKnowledge } from "../_shared/agent-knowledge.ts";
import type { AgentKnowledge } from "../_shared/agent-knowledge.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In-memory session store for demo (production would use DB)
const sessions = new Map<string, { messages: Array<{ role: string; content: string }> }>();

// ── Tool execution with REAL knowledge ──
function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  lang: string,
  knowledge: AgentKnowledge
): string {
  const l = (lang === "es" || lang === "fr" || lang === "de" || lang === "it") ? lang : "en";
  const bizName = knowledge.businessName[l] || knowledge.businessName.en || "Business";

  switch (toolName) {
    case "get_services": {
      const lines = knowledge.services.map((s) => {
        const name = s.name[l] || s.name.en;
        const dur = s.duration ? ` (${s.duration})` : "";
        const price = s.price === "0"
          ? (l === "es" ? "Gratis" : "Free")
          : `${s.price} EUR`;
        return `- ${name}: ${price}${dur}`;
      });
      const header = l === "es"
        ? `Servicios de ${bizName}:`
        : `${bizName} services:`;
      return `${header}\n${lines.join("\n")}`;
    }

    case "check_availability": {
      const date = toolInput.date || (l === "es" ? "hoy" : "today");
      const slots = knowledge.availableSlots;
      if (slots.length === 0) {
        return l === "es"
          ? "Este servicio no requiere cita previa."
          : "This service doesn't require an appointment.";
      }
      const header = l === "es"
        ? `Horarios disponibles para ${date}:`
        : `Available slots for ${date}:`;
      return `${header} ${slots.join(", ")}`;
    }

    case "book_appointment": {
      const clientName = toolInput.client_name || (l === "es" ? "el cliente" : "the client");
      const date = toolInput.date || (l === "es" ? "fecha por confirmar" : "date TBC");
      const time = toolInput.time || (l === "es" ? "hora por confirmar" : "time TBC");
      const service = toolInput.service || (l === "es" ? "servicio" : "service");
      return l === "es"
        ? `Cita reservada en ${bizName} para ${clientName} el ${date} a las ${time} para ${service}. Se enviara un recordatorio 24h antes.`
        : `Appointment booked at ${bizName} for ${clientName} on ${date} at ${time} for ${service}. A reminder will be sent 24h before.`;
    }

    case "get_faq": {
      const topic = String(toolInput.topic || "").toLowerCase();
      // Search for matching FAQ
      for (const faq of knowledge.faqs) {
        const q = (faq.q[l] || faq.q.en || "").toLowerCase();
        if (q.includes(topic) || topic.includes(q.split(" ")[0])) {
          return faq.a[l] || faq.a.en || "";
        }
      }
      // If no specific match, return all FAQs + hours + policies
      const parts: string[] = [];
      parts.push(l === "es"
        ? `Horario de ${bizName}: ${knowledge.hours}`
        : `${bizName} hours: ${knowledge.hours}`);
      if (knowledge.faqs.length > 0) {
        for (const faq of knowledge.faqs) {
          parts.push(`Q: ${faq.q[l] || faq.q.en}\nA: ${faq.a[l] || faq.a.en}`);
        }
      }
      const pol = knowledge.policies[l] || knowledge.policies.en;
      if (pol) parts.push(l === "es" ? `Politicas: ${pol}` : `Policies: ${pol}`);
      return parts.join("\n\n");
    }

    case "transfer_to_human": {
      const reason = toolInput.reason || (l === "es" ? "solicitud del cliente" : "customer request");
      return l === "es"
        ? `Entendido. He notificado al equipo de ${bizName} y un agente humano te contactara en breve. Motivo: ${reason}.`
        : `Understood. I've notified the ${bizName} team and a human agent will contact you shortly. Reason: ${reason}.`;
    }

    default:
      return "Tool not available.";
  }
}

// Claude API tool definitions
const CLAUDE_TOOLS = [
  {
    name: "book_appointment",
    description: "Book an appointment for the customer",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Appointment date (YYYY-MM-DD)" },
        time: { type: "string", description: "Appointment time (HH:MM)" },
        service: { type: "string", description: "Service requested" },
        client_name: { type: "string", description: "Client name" },
        client_phone: { type: "string", description: "Client phone number" },
      },
      required: ["service"],
    },
  },
  {
    name: "check_availability",
    description: "Check available time slots for a given date",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date to check (YYYY-MM-DD)" },
        service: { type: "string", description: "Service to check availability for" },
      },
    },
  },
  {
    name: "get_services",
    description: "Get list of available services with real prices and durations",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_faq",
    description: "Get frequently asked questions, business hours, and policies",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "Topic to get FAQ for (hours, payment, cancellation, etc.)" },
      },
    },
  },
  {
    name: "transfer_to_human",
    description: "Transfer the conversation to a human agent",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: { type: "string", description: "Reason for transfer" },
      },
      required: ["reason"],
    },
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { agentId, sessionId, message, lang = "es" } = await req.json();

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: "agentId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create session
    const sid = sessionId || `demo_${Date.now()}`;
    if (!sessions.has(sid)) {
      sessions.set(sid, { messages: [] });
    }
    const session = sessions.get(sid)!;

    // Get agent prompt and REAL knowledge
    const agentPrompt = getAgentPrompt(agentId);
    const knowledge = getAgentKnowledge(agentId);

    // Inject knowledge context into system prompt
    const l = (lang === "es" || lang === "fr" || lang === "de" || lang === "it") ? lang : "en";
    const knowledgeContext = [
      `\n\n--- REAL BUSINESS DATA (use this, never invent) ---`,
      `Business: ${knowledge.businessName[l] || knowledge.businessName.en}`,
      `Hours: ${knowledge.hours}`,
      `Services: ${knowledge.services.map(s => `${s.name[l] || s.name.en}: ${s.price === "0" ? "Free" : s.price + " EUR"}${s.duration ? " (" + s.duration + ")" : ""}`).join(", ")}`,
      `Policies: ${knowledge.policies[l] || knowledge.policies.en}`,
      `--- END BUSINESS DATA ---`,
    ].join("\n");

    const systemPrompt = agentPrompt.system + knowledgeContext;

    // Add user message to history
    session.messages.push({ role: "user", content: message });

    // Keep only last 20 messages
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }

    const claudeMessages = session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call Claude API with tool loop
    let assistantResponse = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          tools: CLAUDE_TOOLS,
          messages: claudeMessages,
        }),
      });

      if (!claudeResponse.ok) {
        const err = await claudeResponse.text();
        console.error("Claude API error:", err);
        throw new Error(`Claude API error: ${claudeResponse.status}`);
      }

      const result = await claudeResponse.json();

      let hasToolUse = false;
      let textContent = "";

      for (const block of result.content) {
        if (block.type === "text") {
          textContent += block.text;
        } else if (block.type === "tool_use") {
          hasToolUse = true;
          // Execute with REAL knowledge
          const toolResult = executeTool(block.name, block.input, lang, knowledge);

          claudeMessages.push({
            role: "assistant",
            content: result.content,
          });

          claudeMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: block.id,
                content: toolResult,
              },
            ] as any,
          });
        }
      }

      if (!hasToolUse) {
        assistantResponse = textContent;
        break;
      }
    }

    session.messages.push({ role: "assistant", content: assistantResponse });

    return new Response(
      JSON.stringify({ response: assistantResponse, sessionId: sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agent chat error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
