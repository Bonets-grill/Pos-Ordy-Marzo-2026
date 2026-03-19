/**
 * Dify Agent Prompt Auto-Generator & Sync Engine
 *
 * Generates the complete system prompt for the WhatsApp AI agent
 * from the current DB state (menu, hours, settings, reservation config).
 *
 * When anything changes (menu, hours, settings), the prompt is regenerated.
 * A hash comparison detects whether a re-sync is needed.
 *
 * Sync strategies:
 *   1. If DIFY_WORKSPACE_KEY is set → push directly to Dify API
 *   2. Otherwise → store in wa_instances.prompt_text for manual paste
 *
 * This ensures the agent ALWAYS reflects the current state of the restaurant.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// ─── Types ──────────────────────────────────────────────

interface TenantConfig {
  name: string;
  currency: string;
  timezone: string;
  tax_rate: number;
  tax_included: boolean;
  business_hours: Record<string, unknown>;
  settings: Record<string, unknown>;
}

interface MenuItem {
  name_es: string;
  price: number;
  description_es?: string;
  allergens?: string[];
  category_name: string;
}

interface ModifierGroup {
  name_es: string;
  required: boolean;
  min_select: number;
  max_select: number;
  modifiers: { name_es: string; price_delta: number }[];
  item_names: string[];
}

interface ReservationConfig {
  enabled: boolean;
  slot_duration_minutes: number;
  max_party_size: number;
  advance_booking_days: number;
  min_advance_hours: number;
  auto_confirm: boolean;
  cancellation_policy: string;
}

export interface PromptGenerationResult {
  prompt: string;
  hash: string;
  variables: string[];
  tools_schema: string;
  generated_at: string;
  changed: boolean;
}

// ─── Prompt Generator ───────────────────────────────────
// Generates a GENERIC, tool-first prompt.
// The agent gets ALL data via tools (get_restaurant_info, get_menu).
// No tenant-specific data is baked into the prompt.
// This means: zero sync needed when menu/hours/config change.

export async function generateAgentPrompt(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PromptGenerationResult> {
  // Only need to check reservation state + instance hash
  const { data: resSettings } = await supabase
    .from("reservation_settings")
    .select("enabled")
    .eq("tenant_id", tenantId)
    .single();

  const reservationsEnabled = resSettings?.enabled === true;

  const { data: instance } = await supabase
    .from("wa_instances")
    .select("prompt_hash")
    .eq("tenant_id", tenantId)
    .single();

  // ─── GENERIC PROMPT (tool-first) ──────────────────

  let prompt = `Eres un asistente virtual de WhatsApp para un restaurante.

═══ OBTENER DATOS DEL RESTAURANTE ═══
Cuando el cliente te salude o pregunte por el menú por PRIMERA VEZ en la conversación, llama:
1. get_restaurant_info — nombre, dirección, horarios, modos de pedido, capacidad
2. get_menu — menú completo con categorías, precios, disponibilidad

IMPORTANTE: Solo llama estas herramientas UNA VEZ al principio. NO las llames en cada mensaje.
Si ya tienes la info del restaurante en esta conversación, NO vuelvas a pedirla.
Mantén el contexto de la conversación — si el cliente está en medio de un pedido, CONTINÚA desde donde estaba.

═══ IDIOMA ═══
- Detecta el idioma del cliente desde su primer mensaje
- Respóndele SIEMPRE en ese idioma
- Los nombres de productos/modificadores para las herramientas van SIEMPRE en ESPAÑOL
- Traduce los nombres cuando hables con el cliente

═══ PERSONALIDAD ═══
Eres súper amable, cercano y alegre. Usas emojis 😊🍔🔥🎉
Habla como un amigo que trabaja en el restaurante, no como un robot.

═══ PEDIDOS — REGLAS ═══
1. tenant_id = "${tenantId}" — SIEMPRE este valor en todas las herramientas
2. phone = {{customer_phone}} — SIEMPRE este valor
3. ANTES de añadir al carrito, usa get_item_details para ver modificadores disponibles
4. Si un producto tiene variantes, PREGUNTA cuál quiere
5. modifier_names: TODOS en UN string separado por comas, EN ESPAÑOL
6. NUNCA inventes precios — el sistema calcula todo
7. Pregunta el nombre ANTES de confirmar (set_customer_name)
8. NO respondas a "SÍ"/"NO" de confirmación de recogida — el sistema lo maneja
9. Cuando confirmes con confirm_order, di que ha sido ENVIADO a cocina
10. Si customer_context tiene info de cliente recurrente, salúdalo por nombre
11. Sugiere bebidas/postres cuando solo pide plato principal
12. Si está CERRADO según horarios (check_business_hours), NO tomes pedidos`;

  if (reservationsEnabled) {
    prompt += `

═══ RESERVAS ═══
El restaurante ACEPTA reservas. La info completa viene de get_restaurant_info.

REGLAS:
1. SIEMPRE usa check_availability ANTES de confirmar — verifica disponibilidad real de mesas
2. Pregunta: fecha, hora, número de personas, nombre
3. Si no hay disponibilidad, la herramienta sugiere alternativas — ofréceselas al cliente
4. Usa make_reservation para crear la reserva — el sistema asigna mesa automáticamente
5. Para cancelar: cancel_reservation con el teléfono del cliente`;
  } else {
    prompt += `

═══ RESERVAS ═══
Reservas NO están habilitadas. Si preguntan, sugiere llamar al restaurante.`;
  }

  // ─── GENERATE HASH ────────────────────────────────

  const hash = createHash("sha256").update(prompt).digest("hex").substring(0, 16);
  const previousHash = (instance as any)?.prompt_hash || null;
  const changed = hash !== previousHash;

  // ─── TOOL SCHEMA ──────────────────────────────────

  const toolNames = [
    "get_restaurant_info", "get_menu", "get_item_details",
    "add_to_cart", "view_cart", "remove_from_cart",
    "set_customer_name", "confirm_order", "cancel_order",
    "check_order_status", "check_business_hours", "check_allergens",
  ];

  if (reservationsEnabled) {
    toolNames.push("check_availability", "make_reservation", "cancel_reservation");
  }

  const toolsSchema = generateToolsSchema(tenantId, toolNames, reservationsEnabled);

  // Variables — minimal, since data comes from tools
  const variables = ["customer_phone", "customer_context"];

  return {
    prompt,
    hash,
    variables,
    tools_schema: toolsSchema,
    generated_at: new Date().toISOString(),
    changed,
  };
}

// ─── Tool Schema Generator ──────────────────────────────

function generateToolsSchema(tenantId: string, tools: string[], reservationsEnabled: boolean): string {
  const paths: Record<string, unknown> = {
    "/api/whatsapp/tools": {
      post: {
        operationId: "executeTool",
        summary: "Execute restaurant agent tool",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tool", "tenant_id", "phone"],
                properties: {
                  tool: { type: "string", description: `Tool name: ${tools.join(", ")}` },
                  tenant_id: { type: "string", description: `Always: ${tenantId}` },
                  phone: { type: "string", description: "Customer WhatsApp phone" },
                  item_name: { type: "string", description: "Menu item name IN SPANISH" },
                  quantity: { type: "integer", description: "Quantity 1-20" },
                  modifier_names: { type: "string", description: "Comma-separated modifier names IN SPANISH" },
                  notes: { type: "string", description: "Special instructions" },
                  name: { type: "string", description: "Customer name for set_customer_name" },
                  table_number: { type: "string", description: "Table number for dine-in" },
                  ...(reservationsEnabled ? {
                    date: { type: "string", description: "Reservation date YYYY-MM-DD" },
                    time: { type: "string", description: "Reservation time HH:MM" },
                    party_size: { type: "integer", description: "Number of people 1-12" },
                  } : {}),
                },
              },
            },
          },
        },
        responses: { "200": { description: "Result", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
  };

  return JSON.stringify({
    openapi: "3.0.0",
    info: { title: "Ordy POS Tools", version: "3.0.0" },
    servers: [{ url: "https://ordy-pos-app.netlify.app" }],
    paths,
  }, null, 2);
}

// ─── Sync to Dify ───────────────────────────────────────

/**
 * Sync the generated prompt to Dify (if workspace key available)
 * and store in wa_instances for reference.
 */
export async function syncPromptToDify(
  supabase: SupabaseClient,
  tenantId: string,
  result: PromptGenerationResult
): Promise<{ synced: boolean; method: "api" | "stored"; message: string }> {
  // Store prompt + hash in wa_instances regardless
  await supabase
    .from("wa_instances")
    .update({
      prompt_text: result.prompt,
      prompt_hash: result.hash,
      prompt_synced_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  // Try to push to Dify if workspace key is available
  const workspaceKey = process.env.DIFY_WORKSPACE_KEY;
  const appId = process.env.DIFY_APP_ID;
  const difyUrl = process.env.DIFY_API_URL || "https://api.dify.ai/v1";

  if (workspaceKey && appId) {
    try {
      // Dify App Management API: update pre-prompt
      const res = await fetch(`${difyUrl}/apps/${appId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${workspaceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pre_prompt: result.prompt,
        }),
      });

      if (res.ok) {
        // Publish the changes
        await fetch(`${difyUrl}/apps/${appId}/publish`, {
          method: "POST",
          headers: { Authorization: `Bearer ${workspaceKey}` },
        });

        return { synced: true, method: "api", message: "Prompt pushed to Dify and published" };
      }

      const err = await res.text();
      console.error("[DIFY-SYNC] API push failed:", res.status, err);
      return { synced: false, method: "stored", message: `API push failed (${res.status}), prompt stored locally. Copy from wa_instances.prompt_text` };
    } catch (err) {
      console.error("[DIFY-SYNC] Error:", (err as Error).message);
      return { synced: false, method: "stored", message: `API error: ${(err as Error).message}. Prompt stored locally.` };
    }
  }

  return {
    synced: false,
    method: "stored",
    message: "No DIFY_WORKSPACE_KEY/DIFY_APP_ID configured. Prompt stored in wa_instances.prompt_text — copy to Dify manually.",
  };
}

/**
 * Check if prompt needs regeneration (menu/config changed since last sync).
 */
export async function checkPromptSyncNeeded(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ needed: boolean; current_hash: string | null; new_hash: string }> {
  const result = await generateAgentPrompt(supabase, tenantId);

  const { data: instance } = await supabase
    .from("wa_instances")
    .select("prompt_hash")
    .eq("tenant_id", tenantId)
    .single();

  return {
    needed: result.changed,
    current_hash: (instance as any)?.prompt_hash || null,
    new_hash: result.hash,
  };
}
