import { BusinessRulesEngine } from "../engines/businessRulesEngine";
import { CartEngine } from "../engines/cartEngine";
import { CatalogEngine } from "../engines/catalogEngine";
import { OrderOrchestrator } from "../engines/orderOrchestrator";
import { RestaurantStateMachine } from "../engines/stateMachine";
import { MenuCatalog } from "../foundation/contracts";

const demoCatalog: MenuCatalog = {
  catalogVersion: "v1",
  source: "json",
  confidence: 1,
  categories: [{ id: "c1", name: "Platos" }],
  products: [
    {
      productId: "p1",
      categoryId: "c1",
      name: "Hamburguesa",
      description: "",
      allergens: [],
      tags: [],
      available: true,
      price: 10,
      currency: "EUR",
      requiredModifiers: [],
      optionalModifiers: [],
    },
  ],
  modifiers: [],
  publishedAt: new Date().toISOString(),
  reviewRequired: false,
};

export function runBehaviorAudit(): { name: string; pass: boolean; details: string } {
  try {
    const catalog = new CatalogEngine(demoCatalog);
    const cart = new CartEngine();
    cart.addItem(catalog.getProduct("p1")!, 2);

    const rules = new BusinessRulesEngine({
      timezone: "UTC",
      openHours: {
        0: null,
        1: { open: "00:00", close: "23:59" },
        2: { open: "00:00", close: "23:59" },
        3: { open: "00:00", close: "23:59" },
        4: { open: "00:00", close: "23:59" },
        5: { open: "00:00", close: "23:59" },
        6: { open: "00:00", close: "23:59" },
      },
      deliveryEnabled: true,
      takeawayEnabled: true,
      dineInEnabled: true,
      reservationsEnabled: true,
      closedDates: new Set<string>(),
      deliveryZones: ["CENTRO"],
      minimumOrderByMode: { delivery: 15 },
    });

    const orchestrator = new OrderOrchestrator(cart, rules);
    const order = orchestrator.confirmAndCreateOrder(
      "delivery",
      {
        customerName: "Luis",
        phone: "+34111111",
        address: "Calle 1",
        deliveryZone: "CENTRO",
      },
      "idem-order-1",
    );

    const sm = new RestaurantStateMachine();
    sm.transition("DISCOVERY");
    sm.transition("MENU_BROWSING");
    sm.transition("ORDER_BUILDING");
    sm.transition("CART_REVIEW", { cartItems: 1 });

    if (order.total < 15) {
      throw new Error("Total inválido para validación de mínimo");
    }

    return { name: "Behavior Audit", pass: true, details: "Flujos críticos validados" };
  } catch (error) {
    return {
      name: "Behavior Audit",
      pass: false,
      details: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
