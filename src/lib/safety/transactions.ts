/**
 * Transaction wrappers for critical multi-table operations.
 * Uses Supabase RPC to call PL/pgSQL functions that run in a single transaction.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface OrderPayload {
  tenant_id: string;
  table_id?: string | null;
  order_type: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total: number;
  payment_status: string;
  source: string;
  metadata: Record<string, unknown>;
  confirmed_at: string;
  created_by?: string | null;
}

export interface OrderItemPayload {
  tenant_id: string;
  menu_item_id?: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  modifiers: unknown[];
  modifiers_total: number;
  subtotal: number;
  notes?: string | null;
  kds_status: string;
  kds_station?: string | null;
}

export interface TransactionalOrderResult {
  id: string;
  order_number: number;
}

/**
 * Create an order with its items in a single DB transaction.
 * If order_items insert fails, the order insert is rolled back.
 *
 * @returns The created order's id and order_number, or throws on failure.
 */
export async function createOrderWithItems(
  supabase: SupabaseClient,
  order: OrderPayload,
  items: OrderItemPayload[]
): Promise<TransactionalOrderResult> {
  const { data, error } = await supabase.rpc("create_order_with_items", {
    p_order: order,
    p_items: items,
  });

  if (error) {
    throw new Error(`Transactional order creation failed: ${error.message}`);
  }

  const result = data as { id: string; order_number: number } | null;
  if (!result?.id) {
    throw new Error("Transactional order creation returned no result");
  }

  return { id: result.id, order_number: result.order_number };
}
