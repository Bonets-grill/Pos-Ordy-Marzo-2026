import { describe, it, expect } from "vitest";
import { normalizeWebInput, normalizeWhatsAppInput } from "../engines/channelAdapters";

describe("Channel Adapters", () => {
  it("normaliza input web", () => {
    const msg = normalizeWebInput("session-123", "Hola");
    expect(msg.channel).toBe("web");
    expect(msg.sessionKey).toBe("session-123");
    expect(msg.text).toBe("Hola");
    expect(msg.metadata).toEqual({});
  });

  it("normaliza input WhatsApp", () => {
    const msg = normalizeWhatsAppInput({
      messageId: "wa-msg-1",
      from: "+34600111222",
      body: "Quiero hacer un pedido",
    });
    expect(msg.channel).toBe("whatsapp");
    expect(msg.sessionKey).toBe("+34600111222");
    expect(msg.text).toBe("Quiero hacer un pedido");
    expect(msg.metadata.messageId).toBe("wa-msg-1");
  });
});
