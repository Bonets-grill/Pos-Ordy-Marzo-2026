export type EscalationTicket = {
  ticketId: string;
  tenantId: string;
  reason: string;
  transcript: string;
  dispatchedTo: "email" | "dashboard";
};

export class HumanEscalationEngine {
  createTicket(input: Omit<EscalationTicket, "ticketId">): EscalationTicket {
    if (!input.reason || !input.transcript) {
      throw new Error("Escalación inválida sin contexto real");
    }

    return {
      ...input,
      ticketId: `TICKET-${Date.now()}`,
    };
  }
}
