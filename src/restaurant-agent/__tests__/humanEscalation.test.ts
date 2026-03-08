import { describe, it, expect } from "vitest";
import { HumanEscalationEngine } from "../engines/humanEscalationEngine";

describe("HumanEscalationEngine", () => {
  it("crea ticket válido", () => {
    const engine = new HumanEscalationEngine();
    const ticket = engine.createTicket({
      tenantId: "t1",
      reason: "Cliente solicita hablar con persona",
      transcript: "User: Quiero hablar con alguien\nBot: Transfiriendo...",
      dispatchedTo: "dashboard",
    });
    expect(ticket.ticketId).toMatch(/^TICKET-/);
    expect(ticket.reason).toContain("persona");
  });

  it("rechaza ticket sin razón", () => {
    const engine = new HumanEscalationEngine();
    expect(() =>
      engine.createTicket({
        tenantId: "t1",
        reason: "",
        transcript: "algo",
        dispatchedTo: "email",
      }),
    ).toThrow("sin contexto");
  });
});
