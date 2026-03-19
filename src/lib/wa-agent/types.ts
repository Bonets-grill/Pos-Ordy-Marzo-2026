// Provider types
export type WAProvider = "evolution" | "meta";
export type InstanceStatus = "disconnected" | "connecting" | "connected" | "banned";
export type SessionState = "idle" | "browsing_menu" | "ordering" | "confirming_order" | "checking_status" | "reserving" | "awaiting_pickup_confirmation";

export interface WAInstance {
  id: string;
  tenant_id: string;
  provider: WAProvider;
  instance_name: string | null;
  phone_number: string | null;
  status: InstanceStatus;
  evolution_api_url: string | null;
  evolution_api_key: string | null;
  evolution_instance_id: string | null;
  meta_phone_number_id: string | null;
  meta_access_token: string | null;
  meta_verify_token: string | null;
  meta_waba_id: string | null;
  agent_name: string;
  agent_personality: string;
  agent_language: string;
  agent_instructions: string | null;
  welcome_message: string | null;
  away_message: string | null;
  max_items_per_order: number;
  allow_orders: boolean;
  allow_reservations: boolean;
}

export interface WASession {
  id: string;
  tenant_id: string;
  instance_id: string;
  phone: string;
  customer_name: string | null;
  loyalty_customer_id: string | null;
  state: SessionState;
  cart: CartItem[];
  pending_order_id: string | null;
  context: Record<string, unknown>;
  last_message_at: string;
}

export interface CartItem {
  menu_item_id: string;
  name: string;
  qty: number;
  unit_price: number;
  modifiers: { id: string; name: string; price_delta: number }[];
  notes?: string;
}

export interface WAMessage {
  id: string;
  session_id: string;
  tenant_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: unknown;
  tool_name?: string;
  created_at: string;
}

export interface IncomingMessage {
  from: string;           // phone number E.164
  text: string;
  wa_message_id: string;
  timestamp: number;
  media_url?: string;     // if image/audio
  trace_id?: string;      // distributed tracing correlation ID
  span_id?: string;       // current span ID (from webhook root span)
  parent_span_id?: string | null; // parent span (null for root)
}

export interface SendMessageParams {
  to: string;
  text: string;
  instance: WAInstance;
}

export interface WAProviderInterface {
  sendMessage(params: SendMessageParams): Promise<void>;
  sendTyping(to: string, instance: WAInstance): Promise<void>;
  createInstance(tenantId: string, name: string): Promise<{ instanceId: string; apiKey?: string }>;
  getQRCode(instance: WAInstance): Promise<string>; // returns base64 or URL
  deleteInstance(instance: WAInstance): Promise<void>;
  getConnectionStatus(instance: WAInstance): Promise<InstanceStatus>;
}
