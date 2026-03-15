import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import type { WAInstance, WASession, IncomingMessage } from "./types";
import { getOrCreateSession, loadMessageHistory, saveMessage, updateSession } from "./sessions";
import { loadRestaurantContext } from "./context";
import {
  TOOL_DEFINITIONS,
  getMenu, getItemDetails, addToCart, viewCart,
  removeFromCart, confirmOrder, checkOrderStatus,
  checkBusinessHours, checkAllergens,
} from "./tools";

const MAX_TOOL_ROUNDS = 5; // prevent infinite tool loops

/**
 * Process an incoming WhatsApp message and return the agent's response.
 * This is the main entry point for the agent.
 */
export async function processMessage(
  supabase: SupabaseClient,
  instance: WAInstance,
  message: IncomingMessage
): Promise<string> {
  const tenantId = instance.tenant_id;
  const lang = instance.agent_language || "es";

  // 1. Get or create session
  const session = await getOrCreateSession(supabase, tenantId, instance.id, message.from);

  // 2. Save incoming message
  await saveMessage(supabase, {
    session_id: session.id,
    tenant_id: tenantId,
    role: "user",
    content: message.text,
    wa_message_id: message.wa_message_id,
  });

  // 3. Load conversation history
  const history = await loadMessageHistory(supabase, session.id);

  // 4. Load fresh restaurant context
  const ctx = await loadRestaurantContext(supabase, tenantId, lang);

  // 5. Check if restaurant is open
  if (!ctx.isOpen && instance.away_message) {
    const awayMsg = instance.away_message;
    await saveMessage(supabase, {
      session_id: session.id,
      tenant_id: tenantId,
      role: "assistant",
      content: awayMsg,
    });
    return awayMsg;
  }

  // 6. Build system prompt with fresh context
  const systemPrompt = buildSystemPrompt(instance, ctx, session);

  // 7. Build messages array from history
  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Ensure last message is the current one
  if (messages.length === 0 || messages[messages.length - 1].content !== message.text) {
    messages.push({ role: "user", content: message.text });
  }

  // 8. Call Claude with tools
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let finalResponse = "";
  let toolRounds = 0;
  let currentMessages = [...messages];

  while (toolRounds < MAX_TOOL_ROUNDS) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS as Anthropic.Tool[],
      messages: currentMessages,
    });

    // Check if response has tool use
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    const textBlocks = response.content.filter((b) => b.type === "text");

    if (toolUseBlocks.length === 0) {
      // No tool calls — extract text response
      finalResponse = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n");
      break;
    }

    // Process tool calls
    const assistantContent = response.content;
    currentMessages.push({ role: "assistant", content: assistantContent });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const tu = toolUse as Anthropic.ToolUseBlock;
      const result = await executeTool(supabase, tenantId, lang, session, instance, tu.name, tu.input as Record<string, unknown>);

      // Apply session updates if any
      if (result.sessionUpdates) {
        await updateSession(supabase, session.id, result.sessionUpdates);
        // Update local session object
        Object.assign(session, result.sessionUpdates);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: result.result,
      });
    }

    currentMessages.push({ role: "user", content: toolResults });
    toolRounds++;
  }

  if (!finalResponse) {
    finalResponse = "Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?";
  }

  // 9. Save assistant response
  await saveMessage(supabase, {
    session_id: session.id,
    tenant_id: tenantId,
    role: "assistant",
    content: finalResponse,
  });

  return finalResponse;
}

/**
 * Execute a tool by name.
 */
async function executeTool(
  supabase: SupabaseClient,
  tenantId: string,
  lang: string,
  session: WASession,
  instance: WAInstance,
  toolName: string,
  input: Record<string, unknown>
): Promise<{ result: string; sessionUpdates?: Record<string, unknown> }> {
  switch (toolName) {
    case "get_menu":
      return getMenu(supabase, tenantId, lang);
    case "get_item_details":
      return getItemDetails(supabase, tenantId, lang, input.item_name as string);
    case "add_to_cart":
      return addToCart(supabase, tenantId, lang, session, {
        itemName: input.item_name as string,
        quantity: (input.quantity as number) || 1,
        modifierNames: input.modifier_names as string[] | undefined,
        notes: input.notes as string | undefined,
      });
    case "view_cart":
      return viewCart(session, instance.agent_language === "en" ? "USD" : "EUR");
    case "remove_from_cart":
      return removeFromCart(session, input.item_name as string, instance.agent_language === "en" ? "USD" : "EUR");
    case "confirm_order":
      return confirmOrder(supabase, session, tenantId, lang, input.table_number as string | undefined);
    case "check_order_status":
      return checkOrderStatus(supabase, session, tenantId);
    case "check_business_hours":
      return checkBusinessHours(supabase, tenantId, lang);
    case "check_allergens":
      return checkAllergens(supabase, tenantId, lang, input.item_name as string);
    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

/**
 * Build the system prompt with fresh restaurant context.
 */
function buildSystemPrompt(
  instance: WAInstance,
  ctx: ReturnType<typeof loadRestaurantContext> extends Promise<infer T> ? T : never,
  session: WASession
): string {
  const cartSummary = session.cart && session.cart.length > 0
    ? `\nCarrito actual del cliente: ${JSON.stringify(session.cart)}`
    : "\nEl cliente no tiene nada en el carrito.";

  const personality: Record<string, string> = {
    friendly: "Eres amable, cercano y usas emojis con moderación. Tratas al cliente como a un amigo.",
    professional: "Eres profesional, cortés y eficiente. Vas al grano sin ser frío.",
    casual: "Eres relajado y coloquial. Usas lenguaje informal y emojis.",
  };

  // Weather-based suggestion hints
  const weatherHints = ctx.weather ? buildWeatherHints(ctx.weather) : "";

  return `Eres "${instance.agent_name}", el asistente virtual por WhatsApp del restaurante "${ctx.tenant.name}".

PERSONALIDAD: ${personality[instance.agent_personality] || personality.friendly}

REGLAS ESTRICTAS:
1. NUNCA inventes productos, precios ni información. SIEMPRE usa las herramientas para consultar datos reales.
2. Si el cliente pregunta por el menú, USA la herramienta get_menu. No recites de memoria.
3. Si el cliente quiere pedir algo, verifica primero que existe con get_menu o get_item_details.
4. Los precios SIEMPRE vienen de la base de datos. Nunca digas un precio sin verificar.
5. Si un producto no está disponible, informa al cliente y sugiere alternativas.
6. Responde SIEMPRE en ${instance.agent_language === "en" ? "inglés" : instance.agent_language === "fr" ? "francés" : instance.agent_language === "de" ? "alemán" : instance.agent_language === "it" ? "italiano" : "español"}, a menos que el cliente escriba en otro idioma.
7. Mantén las respuestas concisas — esto es WhatsApp, no un email.
8. No confirmes un pedido sin que el cliente diga explícitamente que sí.
9. Si el restaurante está cerrado, informa los horarios.

ESTRATEGIA DE UPSELLING INTELIGENTE:
- Cuando el cliente añade un plato principal, sugiere UNA bebida o complemento que combine bien. Hazlo de forma natural, como un camarero experto: "¿Te apetece una cerveza fría con eso?" o "Nuestro tiramisú es el favorito para terminar".
- Si el pedido no tiene postre y el cliente parece que va a confirmar, menciona brevemente los postres.
- Si el pedido no tiene bebida, sugiere una antes de confirmar.
- NUNCA seas agresivo ni insistente. Una sola sugerencia por turno. Si el cliente dice no, respeta y avanza.
- Adapta las sugerencias al contexto: hora del día, clima, tipo de plato pedido.
${weatherHints}

INFORMACIÓN DEL RESTAURANTE:
- Nombre: ${ctx.tenant.name}
- Moneda: ${ctx.tenant.currency}
- Impuesto: ${ctx.tenant.tax_included ? "incluido en precio" : `${ctx.tenant.tax_rate}% adicional`}
- Estado: ${ctx.isOpen ? "ABIERTO" : "CERRADO"}
- Categorías disponibles: ${ctx.categories.map(c => c.name).join(", ")}
- Total productos disponibles: ${ctx.menuItems.length}
${ctx.weather ? `- Clima actual: ${ctx.weather.description}, ${ctx.weather.temp_c}°C (sensación ${ctx.weather.feels_like_c}°C)` : ""}

ESTADO DE LA SESIÓN:
- Cliente: ${session.customer_name || "Desconocido"}
- Estado: ${session.state}${cartSummary}
${session.pending_order_id ? `- Pedido activo: ${session.pending_order_id}` : ""}

${instance.agent_instructions ? `INSTRUCCIONES PERSONALIZADAS DEL RESTAURANTE:\n${instance.agent_instructions}` : ""}`;
}

/**
 * Build weather-based upselling hints for the agent.
 */
function buildWeatherHints(weather: { condition: string; temp_c: number }): string {
  const hints: string[] = [];
  switch (weather.condition) {
    case "hot":
      hints.push("Hace calor: prioriza bebidas frías, ensaladas, helados, gazpacho.");
      break;
    case "warm":
      hints.push("Día cálido: sugiere bebidas frescas, platos ligeros, cerveza bien fría.");
      break;
    case "cold":
      hints.push("Hace frío: sugiere sopas, caldos, bebidas calientes, platos contundentes.");
      break;
    case "rainy":
    case "stormy":
      hints.push("Día lluvioso: sugiere platos reconfortantes, sopas, chocolate caliente, infusiones.");
      break;
    default:
      hints.push("Clima agradable: cualquier sugerencia es apropiada.");
  }

  const hour = new Date().getHours();
  if (hour < 12) hints.push("Es por la mañana: café, zumos, desayunos si los hay.");
  else if (hour < 16) hints.push("Hora de comida: platos principales, menú del día si existe.");
  else if (hour < 20) hints.push("Hora de merienda: cafés, postres, tapas si las hay.");
  else hints.push("Es de noche: cenas, vinos, cócteles si los hay.");

  return `CONTEXTO AMBIENTAL PARA SUGERENCIAS:\n- ${hints.join("\n- ")}`;
}
