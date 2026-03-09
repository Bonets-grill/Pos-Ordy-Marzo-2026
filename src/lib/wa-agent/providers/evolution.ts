import type { WAProviderInterface, WAInstance, SendMessageParams, InstanceStatus } from "../types";

export class EvolutionProvider implements WAProviderInterface {
  private baseUrl: string;
  private globalApiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080";
    this.globalApiKey = process.env.EVOLUTION_API_KEY || "";
  }

  private headers(apiKey?: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "apikey": apiKey || this.globalApiKey,
    };
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    const url = params.instance.evolution_api_url || this.baseUrl;
    const instanceName = params.instance.instance_name || params.instance.evolution_instance_id;
    const apiKey = params.instance.evolution_api_key || this.globalApiKey;

    const response = await fetch(`${url}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify({
        number: params.to,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Evolution send error:", err);
      throw new Error(`Failed to send message: ${response.status}`);
    }
  }

  async sendTyping(to: string, instance: WAInstance): Promise<void> {
    const url = instance.evolution_api_url || this.baseUrl;
    const instanceName = instance.instance_name || instance.evolution_instance_id;
    const apiKey = instance.evolution_api_key || this.globalApiKey;

    await fetch(`${url}/chat/presence/${instanceName}`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify({
        number: to,
        presence: "composing",
      }),
    }).catch(() => { /* non-critical */ });
  }

  async createInstance(tenantId: string, name: string): Promise<{ instanceId: string; apiKey?: string }> {
    const instanceName = `ordy-${tenantId.slice(0, 8)}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const response = await fetch(`${this.baseUrl}/instance/create`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        rejectCall: true,
        msgCall: "No puedo atender llamadas. Escríbeme por chat.",
        webhookByEvents: true,
        webhookBase64: false,
        webhookEvents: [
          "MESSAGES_UPSERT",
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create instance: ${err}`);
    }

    const data = await response.json();
    return {
      instanceId: data.instance?.instanceName || instanceName,
      apiKey: data.hash?.apikey,
    };
  }

  async getQRCode(instance: WAInstance): Promise<string> {
    const url = instance.evolution_api_url || this.baseUrl;
    const instanceName = instance.instance_name || instance.evolution_instance_id;
    const apiKey = instance.evolution_api_key || this.globalApiKey;

    const response = await fetch(`${url}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: this.headers(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to get QR: ${response.status}`);
    }

    const data = await response.json();
    // Evolution returns base64 QR or pairingCode
    return data.base64 || data.code || "";
  }

  async deleteInstance(instance: WAInstance): Promise<void> {
    const url = instance.evolution_api_url || this.baseUrl;
    const instanceName = instance.instance_name || instance.evolution_instance_id;
    const apiKey = instance.evolution_api_key || this.globalApiKey;

    await fetch(`${url}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: this.headers(apiKey),
    });
  }

  async getConnectionStatus(instance: WAInstance): Promise<InstanceStatus> {
    const url = instance.evolution_api_url || this.baseUrl;
    const instanceName = instance.instance_name || instance.evolution_instance_id;
    const apiKey = instance.evolution_api_key || this.globalApiKey;

    try {
      const response = await fetch(`${url}/instance/connectionState/${instanceName}`, {
        method: "GET",
        headers: this.headers(apiKey),
      });

      if (!response.ok) return "disconnected";

      const data = await response.json();
      const state = data.instance?.state || data.state;

      if (state === "open") return "connected";
      if (state === "connecting") return "connecting";
      return "disconnected";
    } catch {
      return "disconnected";
    }
  }

  /**
   * Set webhook URL for this instance.
   */
  async setWebhook(instance: WAInstance, webhookUrl: string): Promise<void> {
    const url = instance.evolution_api_url || this.baseUrl;
    const instanceName = instance.instance_name || instance.evolution_instance_id;
    const apiKey = instance.evolution_api_key || this.globalApiKey;

    await fetch(`${url}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: this.headers(apiKey),
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: false,
        events: [
          "MESSAGES_UPSERT",
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
        ],
      }),
    });
  }
}
