import { describe, it, expect } from "vitest";
import { BusinessRulesEngine, BusinessRulesConfig } from "../engines/businessRulesEngine";

const baseConfig: BusinessRulesConfig = {
  timezone: "UTC",
  openHours: {
    0: null, // domingo cerrado
    1: { open: "09:00", close: "22:00" },
    2: { open: "09:00", close: "22:00" },
    3: { open: "09:00", close: "22:00" },
    4: { open: "09:00", close: "22:00" },
    5: { open: "09:00", close: "23:00" },
    6: { open: "10:00", close: "23:00" },
  },
  deliveryEnabled: true,
  takeawayEnabled: true,
  dineInEnabled: true,
  reservationsEnabled: true,
  closedDates: new Set(["2026-12-25"]),
  deliveryZones: ["CENTRO", "NORTE"],
  minimumOrderByMode: { delivery: 15, takeaway: 5 },
};

describe("BusinessRulesEngine", () => {
  const engine = new BusinessRulesEngine(baseConfig);

  it("detecta abierto en horario válido (lunes 12:00 UTC)", () => {
    // Lunes = day 1, 12:00 UTC
    const date = new Date("2026-03-09T12:00:00Z"); // lunes
    expect(engine.isOpen(date)).toBe(true);
  });

  it("detecta cerrado en domingo", () => {
    const date = new Date("2026-03-08T12:00:00Z"); // domingo
    expect(engine.isOpen(date)).toBe(false);
  });

  it("detecta cerrado en fecha festiva", () => {
    const date = new Date("2026-12-25T12:00:00Z"); // navidad (viernes)
    expect(engine.isOpen(date)).toBe(false);
  });

  it("valida modo delivery habilitado", () => {
    expect(engine.validateMode("delivery")).toEqual({ ok: true });
  });

  it("rechaza modo deshabilitado", () => {
    const noDelivery = new BusinessRulesEngine({ ...baseConfig, deliveryEnabled: false });
    const result = noDelivery.validateMode("delivery");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("deshabilitado");
  });

  it("valida zona de delivery dentro de cobertura", () => {
    expect(engine.validateDeliveryZone("CENTRO")).toEqual({ ok: true });
  });

  it("rechaza zona fuera de cobertura", () => {
    const result = engine.validateDeliveryZone("SUR");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("fuera de cobertura");
  });

  it("valida pedido mínimo cumplido", () => {
    expect(engine.validateMinimum("delivery", 20)).toEqual({ ok: true });
  });

  it("rechaza pedido bajo mínimo", () => {
    const result = engine.validateMinimum("delivery", 10);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("15");
  });

  it("modo sin mínimo configurado acepta cualquier total", () => {
    expect(engine.validateMinimum("dine_in", 1)).toEqual({ ok: true });
  });
});
