import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

interface OrderItem {
  menu_item_id: string;
  name: string; // in tenant's language
  quantity: number;
  unit_price: number;
  modifiers: { name: string; price_delta: number }[]; // in tenant's language
  modifiers_total: number;
  notes?: string;
  kds_station?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      tenantSlug,
      tableNumber,
      customerLang,
      customerName,
      customerNotes,
      items,
    } = (await req.json()) as {
      tenantSlug: string;
      tableNumber: string;
      customerLang: string;
      customerName?: string;
      customerNotes?: string;
      items: OrderItem[];
    };

    if (!tenantSlug || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Resolve tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, tax_rate, tax_included, locale, currency")
      .eq("slug", tenantSlug)
      .eq("active", true)
      .single();
    if (!tenant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }
    const tenantId = tenant.id;

    // 2. Resolve table
    let tableId: string | null = null;
    if (tableNumber) {
      const { data: table } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("number", tableNumber)
        .eq("active", true)
        .single();
      tableId = table?.id || null;
    }

    // 3. Calculate totals
    const subtotal = items.reduce(
      (sum, i) => sum + (i.unit_price + i.modifiers_total) * i.quantity,
      0
    );
    const taxAmount = tenant.tax_included
      ? 0
      : Math.round(subtotal * (tenant.tax_rate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    // 4. Create order — items stored in TENANT language, metadata has customer language
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        table_id: tableId,
        order_type: "qr",
        status: "confirmed",
        customer_name: customerName || null,
        customer_notes: customerNotes || null,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: taxAmount,
        total: Math.round(total * 100) / 100,
        source: "qr",
        metadata: { customer_lang: customerLang },
        confirmed_at: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      console.error("Order create error:", orderErr?.message);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 5. Create order items (in tenant language for KDS)
    const orderItems = items.map((item) => ({
      order_id: order.id,
      tenant_id: tenantId,
      menu_item_id: item.menu_item_id,
      name: item.name, // tenant language
      quantity: item.quantity,
      unit_price: item.unit_price,
      modifiers: item.modifiers, // tenant language
      modifiers_total: item.modifiers_total,
      subtotal: Math.round((item.unit_price + item.modifiers_total) * item.quantity * 100) / 100,
      notes: item.notes || null,
      kds_station: item.kds_station || null,
      kds_status: "pending",
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("Order items error:", itemsErr.message);
    }

    // 6. Update table status to occupied
    if (tableId) {
      await supabase
        .from("restaurant_tables")
        .update({ status: "occupied", current_order_id: order.id })
        .eq("id", tableId);
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err: unknown) {
    console.error("Public order error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: check order status (customer polls this)
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, confirmed_at, preparing_at, ready_at, served_at")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Get item statuses for KDS progress
  const { data: items } = await supabase
    .from("order_items")
    .select("id, name, kds_status")
    .eq("order_id", orderId)
    .eq("voided", false);

  return NextResponse.json({ order, items: items || [] });
}
