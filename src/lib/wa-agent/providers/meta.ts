import type { WAProviderInterface, WAInstance, SendMessageParams, InstanceStatus } from "../types";

const META_API_URL = "https://graph.facebook.com/v21.0";

export class MetaProvider implements WAProviderInterface {
  async sendMessage(params: SendMessageParams): Promise<void> {
    const phoneId = params.instance.meta_phone_number_id;
    const token = params.instance.meta_access_token;

    if (!phoneId || !token) {
      throw new Error("Meta provider not configured");
    }

    const response = await fetch(`${META_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: { body: params.text },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Meta send error:", err);
      throw new Error(`Failed to send message: ${response.status}`);
    }
  }

  async sendTyping(to: string, instance: WAInstance): Promise<void> {
    const phoneId = instance.meta_phone_number_id;
    const token = instance.meta_access_token;
    if (!phoneId || !token) return;

    // Meta doesn't have a typing indicator API for outgoing
    // Mark message as read instead
  }

  async createInstance(_tenantId: string, _name: string): Promise<{ instanceId: string }> {
    // Meta instances are created via Meta Business Manager, not via API
    // This is a placeholder — the tenant configures their Meta credentials manually
    throw new Error(
      "Meta instances are configured manually via Meta Business Manager. " +
      "Set meta_phone_number_id and meta_access_token in the instance settings."
    );
  }

  async getQRCode(_instance: WAInstance): Promise<string> {
    // Meta doesn't use QR codes — phones are connected via Business Manager
    throw new Error("Meta Cloud API does not use QR codes for connection.");
  }

  async deleteInstance(_instance: WAInstance): Promise<void> {
    // Nothing to delete on Meta's side
  }

  async getConnectionStatus(instance: WAInstance): Promise<InstanceStatus> {
    const phoneId = instance.meta_phone_number_id;
    const token = instance.meta_access_token;

    if (!phoneId || !token) return "disconnected";

    try {
      const response = await fetch(`${META_API_URL}/${phoneId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) return "connected";
      return "disconnected";
    } catch {
      return "disconnected";
    }
  }

  /**
   * Verify webhook challenge from Meta.
   */
  verifyWebhook(params: URLSearchParams, verifyToken: string): string | null {
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken && challenge) {
      return challenge;
    }
    return null;
  }

  /**
   * Parse incoming webhook payload from Meta.
   */
  parseWebhook(body: Record<string, unknown>): { from: string; text: string; wa_message_id: string; timestamp: number; phoneId: string } | null {
    try {
      const entry = (body.entry as any[])?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messageObj = value?.messages?.[0];

      if (!messageObj || messageObj.type !== "text") return null;

      return {
        from: messageObj.from,
        text: messageObj.text.body,
        wa_message_id: messageObj.id,
        timestamp: parseInt(messageObj.timestamp) * 1000,
        phoneId: value.metadata.phone_number_id,
      };
    } catch {
      return null;
    }
  }

  /**
   * Mark a message as read.
   */
  async markAsRead(instance: WAInstance, messageId: string): Promise<void> {
    const phoneId = instance.meta_phone_number_id;
    const token = instance.meta_access_token;
    if (!phoneId || !token) return;

    await fetch(`${META_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    }).catch(() => { /* non-critical */ });
  }
}
