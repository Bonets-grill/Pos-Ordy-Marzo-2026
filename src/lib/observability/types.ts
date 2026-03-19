/**
 * Observability types for structured logging and tracing.
 * Used across all critical flows (WhatsApp, QR, POS, KDS).
 */

export type FlowSource = "whatsapp" | "qr" | "pos" | "kds" | "admin" | "cron" | "system";

export type FlowStep =
  | "webhook_received"
  | "session_loaded"
  | "agent_called"
  | "tool_executed"
  | "order_created"
  | "order_updated"
  | "items_created"
  | "payment_created"
  | "notification_sent"
  | "notification_skipped"
  | "status_transition"
  | "cart_updated"
  | "pickup_confirmed"
  | "pickup_rejected"
  | "error"
  | "retry"
  | string; // extensible

export type Severity = "debug" | "info" | "warn" | "error" | "critical";

export interface TraceContext {
  trace_id: string;
  tenant_id?: string;
  order_id?: string;
  session_id?: string;
  phone?: string;
  source: FlowSource;
  started_at: number; // Date.now()
}

/** Span-based tracing context (OpenTelemetry-inspired). */
export interface SpanContext {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  operation: string;         // e.g., "webhook_received", "agent_execution", "tool.confirmOrder"
  source: FlowSource;
  tenant_id?: string;
  started_at: number;        // Date.now()
}

export interface LogEntry {
  timestamp: string;
  trace_id: string;
  span_id?: string;
  parent_span_id?: string;
  severity: Severity;
  source: FlowSource;
  flow_step: FlowStep;
  message: string;
  tenant_id?: string;
  order_id?: string;
  session_id?: string;
  phone?: string;
  status_before?: string;
  status_after?: string;
  latency_ms?: number;
  retry_count?: number;
  error_code?: string;
  metadata?: Record<string, unknown>;
}
