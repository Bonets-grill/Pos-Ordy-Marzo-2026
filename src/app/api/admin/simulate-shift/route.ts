import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-auth";
import { sendToAirtableAsync, getTenantName } from "@/lib/airtable/dispatcher";

/**
 * POST /api/admin/simulate-shift
 * Simulates a FULL restaurant shift with realistic data:
 * - Opens cash register shift
 * - Creates orders for all tables (dine-in) + WhatsApp orders
 * - Processes through KDS lifecycle (pending → preparing → ready → served)
 * - Records payments (cash + card mix)
 * - Earns loyalty points
 * - Closes cash register shift with correct totals
 *
 * Body: { tenantId: string, clean?: boolean }
 * If clean=true, removes previously simulated data first.
 */

const CUSTOMER_NAMES = [
  "María García", "Carlos López", "Ana Martínez", "Pedro Sánchez", "Laura Fernández",
  "Javier Rodríguez", "Isabel Torres", "Miguel Díaz", "Carmen Ruiz", "José Moreno",
  "Elena Jiménez", "Francisco Navarro", "Marta Domínguez", "David Gil", "Patricia Muñoz",
  "Roberto Vargas", "Lucía Molina", "Alberto Romero", "Claudia Serrano", "Fernando Ortega",
];

const WA_PHONES = [
  "+34612345001", "+34612345002", "+34612345003", "+34612345004", "+34612345005",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { tenantId, clean } = await req.json();
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  // Load tenant config
  const { data: tenant } = await supabase
    .from("tenants")
    .select("tax_rate, tax_included, currency")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const taxRate = tenant.tax_rate || 7;
  const taxIncluded = tenant.tax_included !== false;

  // Load tables
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("id, number")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  // Load menu items
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name_es, price, kds_station, category_id")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .eq("available", true);

  if (!tables?.length || !menuItems?.length) {
    return NextResponse.json({ error: "No tables or menu items" }, { status: 400 });
  }

  // Load users for created_by
  const { data: staffUsers } = await supabase
    .from("users")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const adminUser = (staffUsers || []).find((u: any) => ["super_admin", "owner", "admin"].includes(u.role));
  const createdBy = adminUser?.id || auth.user.id;

  // Get last order number
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("order_number")
    .eq("tenant_id", tenantId)
    .order("order_number", { ascending: false })
    .limit(1)
    .single();

  let orderNumber = (lastOrder?.order_number || 300) + 1;

  // Clean previous simulation if requested
  if (clean) {
    await supabase.from("cash_movements").delete().eq("tenant_id", tenantId).like("description", "%[SIM]%");
    await supabase.from("payments").delete().eq("tenant_id", tenantId).like("notes", "%[SIM]%");
    // Delete simulated order_items via orders
    const { data: simOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("tenant_id", tenantId)
      .like("notes", "%[SIM]%");
    if (simOrders?.length) {
      const simIds = simOrders.map((o: any) => o.id);
      await supabase.from("order_items").delete().in("order_id", simIds);
      await supabase.from("orders").delete().in("id", simIds);
    }
    await supabase.from("cash_shifts").delete().eq("tenant_id", tenantId).like("notes", "%[SIM]%");
    // Reset all tables to available
    await supabase.from("restaurant_tables").update({ status: "available", current_order_id: null }).eq("tenant_id", tenantId);
  }

  const stats = {
    shift_id: "",
    orders_created: 0,
    dine_in_orders: 0,
    wa_orders: 0,
    takeaway_orders: 0,
    total_items: 0,
    total_revenue: 0,
    total_tips: 0,
    cash_payments: 0,
    card_payments: 0,
    cash_amount: 0,
    card_amount: 0,
    opening_amount: 150,
  };

  // ═══════════════════════════════════════════
  // STEP 1: OPEN CASH SHIFT
  // ═══════════════════════════════════════════
  const now = new Date();
  const shiftOpenedAt = new Date(now);
  shiftOpenedAt.setHours(Math.max(0, now.getHours() - 3), 0, 0, 0);
  // If that would cross midnight, just use today at 00:01
  if (shiftOpenedAt.getDate() !== now.getDate()) {
    shiftOpenedAt.setTime(now.getTime());
    shiftOpenedAt.setHours(0, 1, 0, 0);
  }

  const { data: shift } = await supabase
    .from("cash_shifts")
    .insert({
      tenant_id: tenantId,
      opened_by: createdBy,
      opening_amount: stats.opening_amount,
      status: "open",
      opened_at: shiftOpenedAt.toISOString(),
      cash_sales: 0,
      card_sales: 0,
      total_sales: 0,
      total_orders: 0,
      notes: "[SIM] Simulated shift",
    })
    .select("id")
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
  stats.shift_id = shift.id;

  // Airtable: registrar apertura de turno (multi-tenant)
  const tenantName = await getTenantName(tenantId);
  sendToAirtableAsync('cash_shifts', {
    'Shift Date': shiftOpenedAt.toISOString().split('T')[0],
    'Opened By': 'Staff',
    'Opening Amount': stats.opening_amount,
    'Status': 'open',
    'Notes': '[SIM] Simulated shift',
    'Tenant Name': tenantName,
  })

  // ═══════════════════════════════════════════
  // STEP 2: CREATE DINE-IN ORDERS FOR ALL TABLES
  // ═══════════════════════════════════════════
  const allOrders: any[] = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const numItems = randomInt(2, 6);
    const orderItems = pickN(menuItems as any[], numItems);
    const customerName = pick(CUSTOMER_NAMES);

    // Calculate totals
    let subtotal = 0;
    const itemInserts: any[] = [];

    for (const item of orderItems) {
      const qty = randomInt(1, 3);
      const unitPrice = item.price;
      const itemSubtotal = qty * unitPrice;
      subtotal += itemSubtotal;

      itemInserts.push({
        tenant_id: tenantId,
        menu_item_id: item.id,
        name: item.name_es,
        quantity: qty,
        unit_price: unitPrice,
        modifiers: [],
        modifiers_total: 0,
        subtotal: itemSubtotal,
        kds_station: item.kds_station || "cocina",
        kds_status: "served", // Already served (simulation)
        kds_started_at: new Date(shiftOpenedAt.getTime() + (i * 8 + 3) * 60 * 1000).toISOString(),
        kds_ready_at: new Date(shiftOpenedAt.getTime() + (i * 8 + 6) * 60 * 1000).toISOString(),
        voided: false,
      });
      stats.total_items += qty;
    }

    // Tax calculation
    let taxAmount: number;
    let orderSubtotal: number;
    if (taxIncluded) {
      taxAmount = Math.round((subtotal - subtotal / (1 + taxRate / 100)) * 100) / 100;
      orderSubtotal = Math.round((subtotal - taxAmount) * 100) / 100;
    } else {
      orderSubtotal = subtotal;
      taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
    }

    const tipAmount = Math.random() > 0.6 ? Math.round(randomInt(1, 5) * 100) / 100 : 0;
    const total = taxIncluded
      ? Math.round((subtotal + tipAmount) * 100) / 100
      : Math.round((subtotal + taxAmount + tipAmount) * 100) / 100;

    const paymentMethod = Math.random() > 0.4 ? "card" : "cash";
    const createdAt = new Date(shiftOpenedAt.getTime() + i * 8 * 60 * 1000); // spread across shift

    const { data: order } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber++,
        table_id: table.id,
        order_type: "dine_in",
        status: "closed",
        customer_name: customerName,
        subtotal: orderSubtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        tip_amount: tipAmount,
        total,
        payment_status: "paid",
        payment_method: paymentMethod,
        created_by: createdBy,
        served_by: createdBy,
        source: "pos",
        notes: "[SIM] Simulated dine-in order",
        confirmed_at: new Date(createdAt.getTime() + 1000).toISOString(),
        preparing_at: new Date(createdAt.getTime() + 60000).toISOString(),
        ready_at: new Date(createdAt.getTime() + 10 * 60000).toISOString(),
        served_at: new Date(createdAt.getTime() + 15 * 60000).toISOString(),
        closed_at: new Date(createdAt.getTime() + 25 * 60000).toISOString(),
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (!order) continue;

    // Insert order items
    const itemsWithOrder = itemInserts.map(item => ({ ...item, order_id: order.id }));
    await supabase.from("order_items").insert(itemsWithOrder);

    // Insert payment
    const paymentAmount = total;
    await supabase.from("payments").insert({
      tenant_id: tenantId,
      order_id: order.id,
      amount: paymentAmount,
      method: paymentMethod,
      status: "completed",
      tip_amount: tipAmount,
      received_by: createdBy,
      notes: "[SIM] Simulated payment",
      created_at: new Date(createdAt.getTime() + 20 * 60000).toISOString(),
    });

    // Insert cash movement
    await supabase.from("cash_movements").insert({
      shift_id: shift.id,
      tenant_id: tenantId,
      type: "sale",
      amount: paymentAmount,
      description: `[SIM] Venta mesa ${table.number} — ${paymentMethod}`,
      order_id: order.id,
      created_by: createdBy,
      created_at: new Date(createdAt.getTime() + 20 * 60000).toISOString(),
    });

    if (tipAmount > 0) {
      await supabase.from("cash_movements").insert({
        shift_id: shift.id,
        tenant_id: tenantId,
        type: "tip",
        amount: tipAmount,
        description: `[SIM] Propina mesa ${table.number}`,
        order_id: order.id,
        created_by: createdBy,
        created_at: new Date(createdAt.getTime() + 20 * 60000).toISOString(),
      });
      stats.total_tips += tipAmount;
    }

    stats.orders_created++;
    stats.dine_in_orders++;
    stats.total_revenue += paymentAmount;

    if (paymentMethod === "cash") {
      stats.cash_payments++;
      stats.cash_amount += paymentAmount;
    } else {
      stats.card_payments++;
      stats.card_amount += paymentAmount;
    }

    allOrders.push({ id: order.id, total, method: paymentMethod, table: table.number });
  }

  // ═══════════════════════════════════════════
  // STEP 3: CREATE WHATSAPP ORDERS
  // ═══════════════════════════════════════════
  for (let w = 0; w < 5; w++) {
    const numItems = randomInt(2, 4);
    const orderItems = pickN(menuItems as any[], numItems);
    const phone = WA_PHONES[w];
    const customerName = pick(CUSTOMER_NAMES);

    let subtotal = 0;
    const itemInserts: any[] = [];

    for (const item of orderItems) {
      const qty = randomInt(1, 2);
      const unitPrice = item.price;
      const itemSubtotal = qty * unitPrice;
      subtotal += itemSubtotal;

      itemInserts.push({
        tenant_id: tenantId,
        menu_item_id: item.id,
        name: item.name_es,
        quantity: qty,
        unit_price: unitPrice,
        modifiers: [],
        modifiers_total: 0,
        subtotal: itemSubtotal,
        kds_station: item.kds_station || "cocina",
        kds_status: "served",
        voided: false,
      });
      stats.total_items += qty;
    }

    let taxAmount: number;
    let orderSubtotal: number;
    if (taxIncluded) {
      taxAmount = Math.round((subtotal - subtotal / (1 + taxRate / 100)) * 100) / 100;
      orderSubtotal = Math.round((subtotal - taxAmount) * 100) / 100;
    } else {
      orderSubtotal = subtotal;
      taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
    }

    const total = taxIncluded ? subtotal : subtotal + taxAmount;
    const createdAt = new Date(shiftOpenedAt.getTime() + (15 + w) * 8 * 60 * 1000);

    const { data: order } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber++,
        order_type: "takeaway",
        status: "closed",
        customer_name: customerName,
        customer_phone: phone,
        subtotal: orderSubtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        tip_amount: 0,
        total: Math.round(total * 100) / 100,
        payment_status: "paid",
        payment_method: "card",
        created_by: createdBy,
        source: "whatsapp",
        notes: "[SIM] Simulated WhatsApp order",
        confirmed_at: new Date(createdAt.getTime() + 2000).toISOString(),
        preparing_at: new Date(createdAt.getTime() + 60000).toISOString(),
        ready_at: new Date(createdAt.getTime() + 15 * 60000).toISOString(),
        served_at: new Date(createdAt.getTime() + 20 * 60000).toISOString(),
        closed_at: new Date(createdAt.getTime() + 22 * 60000).toISOString(),
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (!order) continue;

    const itemsWithOrder = itemInserts.map(item => ({ ...item, order_id: order.id }));
    await supabase.from("order_items").insert(itemsWithOrder);

    const roundedTotal = Math.round(total * 100) / 100;

    await supabase.from("payments").insert({
      tenant_id: tenantId,
      order_id: order.id,
      amount: roundedTotal,
      method: "card",
      status: "completed",
      tip_amount: 0,
      received_by: createdBy,
      notes: "[SIM] Simulated WA payment",
      created_at: new Date(createdAt.getTime() + 20 * 60000).toISOString(),
    });

    await supabase.from("cash_movements").insert({
      shift_id: shift.id,
      tenant_id: tenantId,
      type: "sale",
      amount: roundedTotal,
      description: `[SIM] Venta WhatsApp ${customerName}`,
      order_id: order.id,
      created_by: createdBy,
      created_at: new Date(createdAt.getTime() + 20 * 60000).toISOString(),
    });

    stats.orders_created++;
    stats.wa_orders++;
    stats.total_revenue += roundedTotal;
    stats.card_payments++;
    stats.card_amount += roundedTotal;
  }

  // ═══════════════════════════════════════════
  // STEP 4: CREATE 3 TAKEAWAY ORDERS (QR source)
  // ═══════════════════════════════════════════
  for (let q = 0; q < 3; q++) {
    const numItems = randomInt(1, 3);
    const orderItems = pickN(menuItems as any[], numItems);
    const customerName = pick(CUSTOMER_NAMES);

    let subtotal = 0;
    const itemInserts: any[] = [];

    for (const item of orderItems) {
      const qty = 1;
      const unitPrice = item.price;
      const itemSubtotal = qty * unitPrice;
      subtotal += itemSubtotal;

      itemInserts.push({
        tenant_id: tenantId,
        menu_item_id: item.id,
        name: item.name_es,
        quantity: qty,
        unit_price: unitPrice,
        modifiers: [],
        modifiers_total: 0,
        subtotal: itemSubtotal,
        kds_station: item.kds_station || "cocina",
        kds_status: "served",
        voided: false,
      });
      stats.total_items += qty;
    }

    let taxAmount: number;
    let orderSubtotal: number;
    if (taxIncluded) {
      taxAmount = Math.round((subtotal - subtotal / (1 + taxRate / 100)) * 100) / 100;
      orderSubtotal = Math.round((subtotal - taxAmount) * 100) / 100;
    } else {
      orderSubtotal = subtotal;
      taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
    }

    const total = taxIncluded ? subtotal : subtotal + taxAmount;
    const paymentMethod = q === 0 ? "cash" : "card";
    const createdAt = new Date(shiftOpenedAt.getTime() + (20 + q) * 8 * 60 * 1000);

    const { data: order } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber++,
        order_type: "takeaway",
        status: "closed",
        customer_name: customerName,
        subtotal: orderSubtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        tip_amount: 0,
        total: Math.round(total * 100) / 100,
        payment_status: "paid",
        payment_method: paymentMethod,
        created_by: createdBy,
        source: "qr",
        notes: "[SIM] Simulated QR order",
        confirmed_at: new Date(createdAt.getTime() + 1000).toISOString(),
        preparing_at: new Date(createdAt.getTime() + 30000).toISOString(),
        ready_at: new Date(createdAt.getTime() + 10 * 60000).toISOString(),
        served_at: new Date(createdAt.getTime() + 12 * 60000).toISOString(),
        closed_at: new Date(createdAt.getTime() + 13 * 60000).toISOString(),
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (!order) continue;

    const itemsWithOrder = itemInserts.map(item => ({ ...item, order_id: order.id }));
    await supabase.from("order_items").insert(itemsWithOrder);

    const roundedTotal = Math.round(total * 100) / 100;

    await supabase.from("payments").insert({
      tenant_id: tenantId,
      order_id: order.id,
      amount: roundedTotal,
      method: paymentMethod,
      status: "completed",
      tip_amount: 0,
      received_by: createdBy,
      notes: "[SIM] Simulated QR payment",
      created_at: new Date(createdAt.getTime() + 12 * 60000).toISOString(),
    });

    await supabase.from("cash_movements").insert({
      shift_id: shift.id,
      tenant_id: tenantId,
      type: "sale",
      amount: roundedTotal,
      description: `[SIM] Venta QR ${customerName}`,
      order_id: order.id,
      created_by: createdBy,
      created_at: new Date(createdAt.getTime() + 12 * 60000).toISOString(),
    });

    stats.orders_created++;
    stats.takeaway_orders++;
    stats.total_revenue += roundedTotal;
    if (paymentMethod === "cash") {
      stats.cash_payments++;
      stats.cash_amount += roundedTotal;
    } else {
      stats.card_payments++;
      stats.card_amount += roundedTotal;
    }
  }

  // ═══════════════════════════════════════════
  // STEP 5: CLOSE CASH SHIFT
  // ═══════════════════════════════════════════
  const cashSales = Math.round(stats.cash_amount * 100) / 100;
  const cardSales = Math.round(stats.card_amount * 100) / 100;
  const totalSales = Math.round(stats.total_revenue * 100) / 100;
  const expectedAmount = Math.round((stats.opening_amount + cashSales) * 100) / 100;
  // Small realistic cash difference (±0-3€)
  const cashDiff = Math.round((Math.random() * 4 - 2) * 100) / 100;
  const closingAmount = Math.round((expectedAmount + cashDiff) * 100) / 100;

  await supabase
    .from("cash_shifts")
    .update({
      status: "closed",
      closed_by: createdBy,
      closing_amount: closingAmount,
      expected_amount: expectedAmount,
      difference: cashDiff,
      cash_sales: cashSales,
      card_sales: cardSales,
      total_sales: totalSales,
      total_orders: stats.orders_created,
      closed_at: new Date().toISOString(),
      notes: "[SIM] Simulated shift — completed",
    })
    .eq("id", shift.id);

  // Airtable: registrar cierre de turno
  sendToAirtableAsync('cash_shifts', {
    'Shift Date': new Date().toISOString().split('T')[0],
    'Opened By': 'Staff',
    'Closed By': 'Staff',
    'Opening Amount': stats.opening_amount,
    'Closing Amount': closingAmount,
    'Expected Amount': expectedAmount,
    'Difference': cashDiff,
    'Cash Sales': cashSales,
    'Card Sales': cardSales,
    'Total Sales': totalSales,
    'Total Orders': stats.orders_created,
    'Status': 'closed',
    'Notes': '[SIM] Simulated shift — completed',
    'Tenant Name': tenantName,
  })

  // Airtable: registrar resumen diario
  sendToAirtableAsync('daily_summaries', {
    'Date': new Date().toISOString().split('T')[0],
    'Total Orders': stats.orders_created,
    'Total Revenue': totalSales,
    'Avg Ticket': stats.orders_created > 0 ? Math.round(totalSales / stats.orders_created * 100) / 100 : 0,
    'Total Tips': Math.round(stats.total_tips * 100) / 100,
    'POS Orders': stats.dine_in_orders,
    'QR Orders': stats.takeaway_orders,
    'WhatsApp Orders': stats.wa_orders,
    'Cash Payments': cashSales,
    'Card Payments': cardSales,
    'Tenant Name': tenantName,
    'Period': 'daily',
  })

  // Reset tables to available
  await supabase
    .from("restaurant_tables")
    .update({ status: "available", current_order_id: null })
    .eq("tenant_id", tenantId);

  return NextResponse.json({
    success: true,
    stats: {
      ...stats,
      total_revenue: Math.round(stats.total_revenue * 100) / 100,
      total_tips: Math.round(stats.total_tips * 100) / 100,
      cash_amount: Math.round(stats.cash_amount * 100) / 100,
      card_amount: Math.round(stats.card_amount * 100) / 100,
      closing_amount: closingAmount,
      expected_amount: expectedAmount,
      cash_difference: cashDiff,
    },
  });
}
