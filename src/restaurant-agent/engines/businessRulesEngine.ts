import { OperationalModeSchema } from "../foundation/contracts";

export type OperationalMode = ReturnType<typeof OperationalModeSchema.parse>;

export type BusinessRulesConfig = {
  timezone: string;
  openHours: Record<number, { open: string; close: string } | null>;
  deliveryEnabled: boolean;
  takeawayEnabled: boolean;
  dineInEnabled: boolean;
  reservationsEnabled: boolean;
  closedDates: Set<string>;
  deliveryZones: string[];
  minimumOrderByMode: Partial<Record<OperationalMode, number>>;
};

export class BusinessRulesEngine {
  constructor(private readonly config: BusinessRulesConfig) {}

  isOpen(date: Date): boolean {
    const isoDate = date.toISOString().slice(0, 10);
    if (this.config.closedDates.has(isoDate)) return false;

    const day = date.getUTCDay();
    const hours = this.config.openHours[day];
    if (!hours) return false;

    const nowMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const [openH, openM] = hours.open.split(":").map(Number);
    const [closeH, closeM] = hours.close.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  }

  validateMode(mode: OperationalMode): { ok: boolean; reason?: string } {
    const flags: Record<OperationalMode, boolean> = {
      dine_in: this.config.dineInEnabled,
      takeaway: this.config.takeawayEnabled,
      delivery: this.config.deliveryEnabled,
    };

    return flags[mode] ? { ok: true } : { ok: false, reason: `Modo ${mode} deshabilitado` };
  }

  validateDeliveryZone(zone: string): { ok: boolean; reason?: string } {
    if (!this.config.deliveryEnabled) return { ok: false, reason: "Delivery deshabilitado" };
    return this.config.deliveryZones.includes(zone)
      ? { ok: true }
      : { ok: false, reason: `Zona ${zone} fuera de cobertura` };
  }

  validateMinimum(mode: OperationalMode, total: number): { ok: boolean; reason?: string } {
    const minimum = this.config.minimumOrderByMode[mode] ?? 0;
    if (total < minimum) {
      return { ok: false, reason: `Pedido mínimo para ${mode}: ${minimum}` };
    }
    return { ok: true };
  }
}
