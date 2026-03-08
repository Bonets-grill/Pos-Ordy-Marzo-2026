import { randomUUID } from "node:crypto";
import { Reservation, ReservationSchema } from "../foundation/contracts";

export class ReservationEngine {
  private readonly reservations = new Map<string, Reservation>();

  createReservation(input: Omit<Reservation, "reservationId" | "status">): Reservation {
    const reservation = ReservationSchema.parse({
      ...input,
      reservationId: randomUUID(),
      status: "booked",
    });
    this.reservations.set(reservation.reservationId, reservation);
    return reservation;
  }

  searchReservation(reservationId: string): Reservation | null {
    return this.reservations.get(reservationId) ?? null;
  }

  cancelReservation(reservationId: string): Reservation {
    const found = this.reservations.get(reservationId);
    if (!found) throw new Error("Reserva no encontrada");
    const cancelled = { ...found, status: "cancelled" as const };
    this.reservations.set(reservationId, cancelled);
    return cancelled;
  }
}
