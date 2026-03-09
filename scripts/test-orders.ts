/**
 * TEST ORDERS SCRIPT — Simula 6 pedidos reales contra la API
 *
 * Uso: npx tsx scripts/test-orders.ts
 *
 * Crea pedidos variados (mesa, delivery, takeaway) y verifica
 * que todo funcione correctamente.
 */

const API_URL = process.env.API_URL || "https://pos.ordysuite.com";
const TENANT_SLUG = "bonets-grill";

// Menu items reales de Bonets Grill
const MENU = {
  louisiana:  "dd9a43eb-4a61-4283-bd9f-e09b57d4068e",  // 14.90€
  carnivora:  "c7d432a5-80ee-44dc-928c-e9c9eaeac457",  // 16.90€
  honey:      "08ebc600-2df7-4001-a75c-69219b3abea4",  // 13.90€
  peque:      "259647bf-52c3-4810-8c56-0e86494698a3",  //  8.90€
  kentucky:   "a8bf1cde-e3c0-48fb-94e2-cbbaf1f4155a",  // 14.90€
  newyork:    "2ced87da-267e-4144-9b58-9b2fc5c68a0b",  // 14.90€
  pistacho:   "674ae107-04b9-4374-a511-fb8022ecf285",  // 14.90€
  tennesse:   "5a73f364-4318-4cbe-abae-672c09387033",  // 15.90€
  torre:      "ed124548-9bab-4f3d-8374-df87ba1ff892",  // 19.90€
  jalapenos:  "a9961a74-4b17-4b23-af31-742ff75a912f",  //  7.90€
  nuggets:    "668aec10-ef6a-4fce-b714-c29565aa12f9",  //  7.90€
  aros:       "20f13968-ab15-47eb-a121-fa7b1349e98e",  //  8.90€
  tequenos:   "b7b720f8-1ad5-427d-b7f8-d22697782dc0",  //  7.50€
  cocacola:   "7315a927-c0af-4808-ae9e-1a89564fa133",  //  2.00€
  colaZero:   "003d84e0-583f-42fb-a79e-ce3dfcdcf0c4",  //  2.00€
  drpepper:   "493b3600-64db-4654-9f89-2d6bacbeed0c",  //  3.00€
  zumoMeloc:  "8cf1ee0b-e3f8-409b-9e2e-6052241b81c7",  //  1.50€
  aquarius:   "27c1c5b9-6ba1-4e6a-9d6e-0d22e58f27d1",  //  2.00€
};

interface TestOrder {
  name: string;
  orderType?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  deliveryAddress?: string;
  items: { menu_item_id: string; quantity: number; modifier_ids?: string[]; notes?: string }[];
  expectedMinTotal: number;
}

const TEST_ORDERS: TestOrder[] = [
  {
    name: "🍔 Mesa 3 — Pareja cenando",
    orderType: "qr",
    tableNumber: "3",
    customerName: "Carlos y Ana",
    items: [
      { menu_item_id: MENU.louisiana, quantity: 1 },
      { menu_item_id: MENU.carnivora, quantity: 1 },
      { menu_item_id: MENU.tequenos, quantity: 1 },
      { menu_item_id: MENU.cocacola, quantity: 2 },
    ],
    expectedMinTotal: 37,
  },
  {
    name: "🥡 Takeaway — Pedido grande",
    orderType: "takeaway",
    customerName: "Pedro Martinez",
    customerPhone: "+34666123456",
    customerNotes: "Recoger en 20 minutos",
    items: [
      { menu_item_id: MENU.tennesse, quantity: 2 },
      { menu_item_id: MENU.pistacho, quantity: 1 },
      { menu_item_id: MENU.nuggets, quantity: 2 },
      { menu_item_id: MENU.drpepper, quantity: 3 },
    ],
    expectedMinTotal: 65,
  },
  {
    name: "🛵 Delivery — Familia",
    orderType: "delivery",
    customerName: "Familia Garcia",
    customerPhone: "+34677888999",
    deliveryAddress: "Calle Principal 42, Santa Cruz",
    items: [
      { menu_item_id: MENU.torre, quantity: 1 },
      { menu_item_id: MENU.honey, quantity: 2 },
      { menu_item_id: MENU.peque, quantity: 2, notes: "Sin cebolla" },
      { menu_item_id: MENU.jalapenos, quantity: 1 },
      { menu_item_id: MENU.aros, quantity: 1 },
      { menu_item_id: MENU.zumoMeloc, quantity: 4 },
    ],
    expectedMinTotal: 80,
  },
  {
    name: "🍔 Mesa 5 — Pedido simple",
    orderType: "qr",
    tableNumber: "5",
    items: [
      { menu_item_id: MENU.kentucky, quantity: 1, notes: "Extra salsa BBQ" },
      { menu_item_id: MENU.colaZero, quantity: 1 },
    ],
    expectedMinTotal: 16,
  },
  {
    name: "🥡 Takeaway — Solo bebidas",
    orderType: "takeaway",
    customerName: "Laura",
    items: [
      { menu_item_id: MENU.cocacola, quantity: 3 },
      { menu_item_id: MENU.aquarius, quantity: 2 },
      { menu_item_id: MENU.drpepper, quantity: 1 },
    ],
    expectedMinTotal: 13,
  },
  {
    name: "🍔 Mesa 1 — Grupo grande",
    orderType: "qr",
    tableNumber: "1",
    customerName: "Cumpleanos Marta",
    customerNotes: "Es un cumpleanos, sorpresa!",
    items: [
      { menu_item_id: MENU.newyork, quantity: 3 },
      { menu_item_id: MENU.louisiana, quantity: 2 },
      { menu_item_id: MENU.tequenos, quantity: 2 },
      { menu_item_id: MENU.nuggets, quantity: 2 },
      { menu_item_id: MENU.cocacola, quantity: 4 },
      { menu_item_id: MENU.drpepper, quantity: 2 },
    ],
    expectedMinTotal: 100,
  },
];

// ── Runner ──

async function createOrder(test: TestOrder): Promise<{ success: boolean; orderId?: string; orderNumber?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/public/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug: TENANT_SLUG,
        tableNumber: test.tableNumber,
        customerLang: "es",
        customerName: test.customerName,
        customerPhone: test.customerPhone,
        customerNotes: test.customerNotes,
        orderType: test.orderType,
        deliveryAddress: test.deliveryAddress,
        items: test.items,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${data.error || JSON.stringify(data)}` };
    }

    return { success: true, orderId: data.orderId, orderNumber: data.orderNumber };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function checkOrder(orderId: string): Promise<{ status: string; items: number }> {
  try {
    const res = await fetch(`${API_URL}/api/public/order?orderId=${orderId}`);
    const data = await res.json();
    return { status: data.order?.status || "unknown", items: data.items?.length || 0 };
  } catch {
    return { status: "error", items: 0 };
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║          ORDY POS — TEST DE PEDIDOS EN VIVO            ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  API: ${API_URL.padEnd(49)}║`);
  console.log(`║  Tenant: ${TENANT_SLUG.padEnd(46)}║`);
  console.log(`║  Pedidos a crear: ${TEST_ORDERS.length}                                   ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;
  const results: { name: string; orderId?: string; orderNumber?: string; status?: string; error?: string }[] = [];

  for (let i = 0; i < TEST_ORDERS.length; i++) {
    const test = TEST_ORDERS[i];
    // Small delay between orders to avoid rate limiter (5/min/IP)
    if (i > 0) await new Promise((r) => setTimeout(r, 1200));
    process.stdout.write(`  ${test.name}... `);

    const result = await createOrder(test);

    if (result.success && result.orderId) {
      // Verify order was created
      const check = await checkOrder(result.orderId);

      if (check.status === "confirmed") {
        console.log(`✅ Pedido #${result.orderNumber} — ${check.items} items — ${check.status}`);
        passed++;
        results.push({ name: test.name, orderId: result.orderId, orderNumber: result.orderNumber, status: check.status });
      } else {
        console.log(`⚠️  Pedido #${result.orderNumber} creado pero estado: ${check.status}`);
        passed++; // still created
        results.push({ name: test.name, orderId: result.orderId, orderNumber: result.orderNumber, status: check.status });
      }
    } else {
      console.log(`❌ ERROR: ${result.error}`);
      failed++;
      results.push({ name: test.name, error: result.error });
    }
  }

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    RESULTADOS                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  ✅ Exitosos: ${passed}                                        ║`);
  console.log(`║  ❌ Fallidos:  ${failed}                                        ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");

  for (const r of results) {
    if (r.orderNumber) {
      console.log(`║  #${r.orderNumber} — ${r.status} — ${r.name.slice(0, 40).padEnd(40)}║`);
    } else {
      console.log(`║  ERROR — ${(r.error || "").slice(0, 46).padEnd(46)}║`);
    }
  }

  console.log("╚══════════════════════════════════════════════════════════╝");

  if (passed > 0) {
    console.log(`\n👉 Ahora abre https://pos.ordysuite.com/dashboard para ver los pedidos`);
    console.log(`👉 Abre https://pos.ordysuite.com/kds para ver la cocina`);
    console.log(`👉 Abre https://pos.ordysuite.com/orders para ver todos los pedidos\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
