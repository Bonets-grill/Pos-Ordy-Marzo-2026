import { createHash } from "node:crypto";

type POSPayload = {
  tenant_id: string;
  agent_id: string;
  order_id: string;
  mode: "dine_in" | "takeaway" | "delivery";
  items: Array<{ product_id: string; qty: number; unit_price: number }>;
  totals: { total: number };
  source_channel: string;
  idempotency_key: string;
};

export class POSBridge {
  private readonly sent = new Set<string>();

  dispatch(payload: POSPayload) {
    if (this.sent.has(payload.idempotency_key)) {
      return { accepted: true, duplicate: true };
    }

    if (payload.items.length === 0) throw new Error("Payload inválido: sin items");

    const signature = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex")
      .slice(0, 16);

    this.sent.add(payload.idempotency_key);
    return { accepted: true, duplicate: false, signature };
  }
}
