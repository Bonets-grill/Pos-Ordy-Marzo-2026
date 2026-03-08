import { CatalogEngine } from "./catalogEngine";

export type DetectedIntent =
  | "greeting"
  | "show_menu"
  | "ask_hours"
  | "start_order"
  | "add_item"
  | "reservation_new"
  | "human_help"
  | "unknown";

export type ExtractionResult = {
  intent: DetectedIntent;
  entities: Record<string, unknown>;
  requiresClarification: boolean;
};

export class IntentEntityEngine {
  constructor(private readonly catalog: CatalogEngine) {}

  detect(text: string): ExtractionResult {
    const normalized = text.toLowerCase();

    if (/hola|buenas/.test(normalized)) {
      return { intent: "greeting", entities: {}, requiresClarification: false };
    }

    if (/menú|menu|carta/.test(normalized)) {
      return { intent: "show_menu", entities: {}, requiresClarification: false };
    }

    if (/horario|abren|abierto/.test(normalized)) {
      return { intent: "ask_hours", entities: {}, requiresClarification: false };
    }

    if (/reserva|reservar/.test(normalized)) {
      return { intent: "reservation_new", entities: {}, requiresClarification: false };
    }

    if (/humano|agente|soporte/.test(normalized)) {
      return { intent: "human_help", entities: {}, requiresClarification: false };
    }

    if (/quiero|agrega|añade|pedido/.test(normalized)) {
      const matches = this.catalog.searchByName(normalized);
      if (matches.length === 1) {
        return {
          intent: "add_item",
          entities: { productId: matches[0].productId, productName: matches[0].name },
          requiresClarification: false,
        };
      }

      if (matches.length > 1) {
        return {
          intent: "add_item",
          entities: { productCandidates: matches.map((m) => m.name) },
          requiresClarification: true,
        };
      }

      return { intent: "start_order", entities: {}, requiresClarification: true };
    }

    return { intent: "unknown", entities: {}, requiresClarification: true };
  }
}
