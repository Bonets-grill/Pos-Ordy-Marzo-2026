/**
 * Dify API client for WhatsApp agent.
 * Sends messages to Dify and parses streaming responses.
 */

const DIFY_API_URL = process.env.DIFY_API_URL || "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY || "";

export interface DifyResponse {
  answer: string;
  conversation_id: string | null;
}

/**
 * Send a chat message to Dify and get the response.
 * Uses streaming mode (required for Agent Chat Apps).
 */
export async function chatWithDify(
  message: string,
  userId: string,
  conversationId: string | null,
  inputs: Record<string, string>,
  apiKey?: string
): Promise<DifyResponse | null> {
  const key = apiKey || DIFY_API_KEY;
  if (!key) {
    console.error("[DIFY] No API key configured");
    return null;
  }

  try {
    const body: Record<string, unknown> = {
      inputs,
      query: message,
      response_mode: "streaming",
      user: userId,
    };

    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DIFY] API error:", response.status, errorText);
      return null;
    }

    // Parse SSE stream
    const text = await response.text();
    let fullAnswer = "";
    let convId: string | null = null;

    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.event === "agent_message" || json.event === "message") {
          fullAnswer += json.answer || "";
        }
        if (json.conversation_id) {
          convId = json.conversation_id;
        }
      } catch {
        // skip non-JSON lines
      }
    }

    if (!fullAnswer) {
      console.error("[DIFY] Empty answer. Raw:", text.substring(0, 500));
      return null;
    }

    return { answer: fullAnswer, conversation_id: convId };
  } catch (error) {
    console.error("[DIFY] Request failed:", (error as Error).message);
    return null;
  }
}
