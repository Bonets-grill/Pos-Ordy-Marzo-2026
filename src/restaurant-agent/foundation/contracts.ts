import { z } from "zod";

export const TenantScopeSchema = z.object({
  tenantId: z.string().min(1),
  agentId: z.string().min(1),
  channel: z.enum(["web", "whatsapp", "api", "internal"]),
});

export const CurrencySchema = z.enum(["EUR", "USD", "MXN", "COP"]);

export const OperationalModeSchema = z.enum(["dine_in", "takeaway", "delivery"]);

export const ProductSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  allergens: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  available: z.boolean().default(true),
  price: z.number().nonnegative(),
  currency: CurrencySchema,
  requiredModifiers: z.array(z.string()).default([]),
  optionalModifiers: z.array(z.string()).default([]),
});

export const ModifierOptionSchema = z.object({
  modifierId: z.string().min(1),
  groupId: z.string().min(1),
  name: z.string().min(1),
  priceDelta: z.number(),
});

export const MenuCatalogSchema = z.object({
  catalogVersion: z.string().min(1),
  source: z.enum(["url", "image", "pos", "csv", "json"]),
  confidence: z.number().min(0).max(1),
  categories: z.array(z.object({ id: z.string(), name: z.string() })),
  products: z.array(ProductSchema),
  modifiers: z.array(ModifierOptionSchema),
  publishedAt: z.string().datetime(),
  reviewRequired: z.boolean().default(false),
});

export const CartItemSchema = z.object({
  lineId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  modifiers: z.array(
    z.object({ modifierId: z.string(), name: z.string(), priceDelta: z.number() }),
  ),
  note: z.string().max(300).optional(),
  lineTotal: z.number().nonnegative(),
});

export const CartSchema = z.object({
  cartId: z.string().min(1),
  items: z.array(CartItemSchema),
  subtotal: z.number().nonnegative(),
  fees: z.number().nonnegative(),
  taxes: z.number().nonnegative(),
  total: z.number().nonnegative(),
  frozen: z.boolean().default(false),
});

export const ReservationSchema = z.object({
  reservationId: z.string().min(1),
  date: z.string().date(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  peopleCount: z.number().int().positive(),
  customerName: z.string().min(2),
  phone: z.string().min(6),
  notes: z.string().max(250).optional(),
  status: z.enum(["draft", "booked", "cancelled"]),
});

export const SessionStateSchema = z.enum([
  "IDLE",
  "DISCOVERY",
  "MENU_BROWSING",
  "ITEM_CLARIFICATION",
  "ORDER_BUILDING",
  "CART_REVIEW",
  "CHECKOUT_MODE_SELECT",
  "DELIVERY_FLOW",
  "TAKEAWAY_FLOW",
  "RESERVATION_FLOW",
  "RESERVATION_MODIFY_FLOW",
  "RESERVATION_CANCEL_FLOW",
  "ORDER_CONFIRMATION",
  "RESERVATION_CONFIRMATION",
  "HUMAN_ESCALATION",
  "CLOSED_HOURS",
  "ERROR_RECOVERY",
]);

export const IdempotencySchema = z.object({
  key: z.string().min(8),
  operation: z.enum([
    "confirm_order",
    "create_order",
    "send_order_to_pos",
    "create_reservation",
    "modify_reservation",
    "cancel_reservation",
  ]),
  createdAt: z.string().datetime(),
});

export const AuditEventSchema = z.object({
  eventId: z.string().min(1),
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  timestamp: z.string().datetime(),
  eventType: z.enum([
    "cart_item_added",
    "cart_item_removed",
    "order_confirmed",
    "order_sent_pos",
    "reservation_created",
    "reservation_modified",
    "reservation_cancelled",
    "human_escalation",
  ]),
  payload: z.record(z.string(), z.unknown()),
});

export type TenantScope = z.infer<typeof TenantScopeSchema>;
export type MenuCatalog = z.infer<typeof MenuCatalogSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ModifierOption = z.infer<typeof ModifierOptionSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type IdempotencyRecord = z.infer<typeof IdempotencySchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
