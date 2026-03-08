import { describe, it, expect } from "vitest";
import { POSBridge } from "../engines/posBridge";

describe("POSBridge", () => {
  it("despacha payload válido con signature", () => {
    const bridge = new POSBridge();
    const result = bridge.dispatch({
      tenant_id: "t1",
      agent_id: "a1",
      order_id: "o1",
      mode: "delivery",
      items: [{ product_id: "p1", qty: 2, unit_price: 10 }],
      totals: { total: 20 },
      source_channel: "whatsapp",
      idempotency_key: "idem-pos-001",
    });
    expect(result.accepted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.signature).toBeTruthy();
    expect(result.signature!.length).toBe(16);
  });

  it("detecta duplicado por idempotency_key", () => {
    const bridge = new POSBridge();
    const payload = {
      tenant_id: "t1",
      agent_id: "a1",
      order_id: "o1",
      mode: "dine_in" as const,
      items: [{ product_id: "p1", qty: 1, unit_price: 5 }],
      totals: { total: 5 },
      source_channel: "web",
      idempotency_key: "idem-dup-pos",
    };
    bridge.dispatch(payload);
    const dup = bridge.dispatch(payload);
    expect(dup.accepted).toBe(true);
    expect(dup.duplicate).toBe(true);
  });

  it("rechaza payload sin items", () => {
    const bridge = new POSBridge();
    expect(() =>
      bridge.dispatch({
        tenant_id: "t1",
        agent_id: "a1",
        order_id: "o1",
        mode: "takeaway",
        items: [],
        totals: { total: 0 },
        source_channel: "web",
        idempotency_key: "idem-empty-pos",
      }),
    ).toThrow("sin items");
  });
});
