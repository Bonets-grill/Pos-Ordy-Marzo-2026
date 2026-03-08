import { describe, it, expect } from "vitest";
import { ReservationEngine } from "../engines/reservationEngine";

describe("ReservationEngine", () => {
  it("crea reserva válida", () => {
    const engine = new ReservationEngine();
    const r = engine.createReservation({
      date: "2026-03-15",
      time: "20:00",
      peopleCount: 4,
      customerName: "María",
      phone: "+34600111222",
    });
    expect(r.reservationId).toBeTruthy();
    expect(r.status).toBe("booked");
    expect(r.peopleCount).toBe(4);
  });

  it("busca reserva existente", () => {
    const engine = new ReservationEngine();
    const created = engine.createReservation({
      date: "2026-03-15",
      time: "21:00",
      peopleCount: 2,
      customerName: "Pedro",
      phone: "+34600333",
    });
    const found = engine.searchReservation(created.reservationId);
    expect(found).not.toBeNull();
    expect(found!.customerName).toBe("Pedro");
  });

  it("retorna null para reserva inexistente", () => {
    const engine = new ReservationEngine();
    expect(engine.searchReservation("fake-id")).toBeNull();
  });

  it("cancela reserva existente", () => {
    const engine = new ReservationEngine();
    const created = engine.createReservation({
      date: "2026-03-16",
      time: "19:00",
      peopleCount: 3,
      customerName: "Ana",
      phone: "+34600444",
    });
    const cancelled = engine.cancelReservation(created.reservationId);
    expect(cancelled.status).toBe("cancelled");
  });

  it("error al cancelar reserva inexistente", () => {
    const engine = new ReservationEngine();
    expect(() => engine.cancelReservation("fake")).toThrow("no encontrada");
  });
});
