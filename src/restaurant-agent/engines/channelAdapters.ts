export type NormalizedInboundMessage = {
  channel: "web" | "whatsapp";
  sessionKey: string;
  text: string;
  metadata: Record<string, unknown>;
};

export function normalizeWebInput(sessionKey: string, text: string): NormalizedInboundMessage {
  return { channel: "web", sessionKey, text, metadata: {} };
}

export function normalizeWhatsAppInput(payload: {
  messageId: string;
  from: string;
  body: string;
}): NormalizedInboundMessage {
  return {
    channel: "whatsapp",
    sessionKey: payload.from,
    text: payload.body,
    metadata: { messageId: payload.messageId },
  };
}
