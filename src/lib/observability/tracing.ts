/**
 * Enterprise Distributed Tracing
 *
 * Implements a span-based tracing model inspired by OpenTelemetry.
 * Each request generates a trace_id, and each operation within that
 * request generates a span_id with a parent_span_id linking to the
 * operation that triggered it.
 *
 * Trace ID format: ordy-{random}-{timestamp}
 * Span ID format:  sp-{random}
 *
 * Example trace tree:
 *
 *   trace_id: ordy-a7xk-1742239123
 *
 *   sp-w1  webhook_received
 *   ├── sp-a1  agent_execution         (parent: sp-w1)
 *   │   ├── sp-t1  tool.get_menu       (parent: sp-a1)
 *   │   ├── sp-t2  tool.add_to_cart    (parent: sp-a1)
 *   │   └── sp-t3  tool.confirm_order  (parent: sp-a1)
 *   │       └── sp-o1  order_insert    (parent: sp-t3)
 *   └── sp-n1  notification_dispatch   (parent: sp-w1)
 *
 * Timeline reconstruction:
 *   SELECT * FROM order_events WHERE trace_id = 'ordy-a7xk-1742239123' ORDER BY created_at;
 */

import type { SpanContext, FlowSource } from "./types";

/**
 * Generate a trace ID.
 * Format: ordy-{random4}-{unix_timestamp}
 */
export function generateTraceId(): string {
  const rnd = Math.random().toString(36).substring(2, 6);
  const ts = Math.floor(Date.now() / 1000);
  return `ordy-${rnd}-${ts}`;
}

/**
 * Generate a span ID.
 * Format: sp-{random6}
 */
export function generateSpanId(): string {
  return `sp-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a root span (the first span in a trace).
 * This is typically created at the webhook entry point.
 */
export function createRootSpan(
  operation: string,
  source: FlowSource,
  tenantId?: string
): SpanContext {
  return {
    trace_id: generateTraceId(),
    span_id: generateSpanId(),
    parent_span_id: null,
    operation,
    source,
    tenant_id: tenantId,
    started_at: Date.now(),
  };
}

/**
 * Create a child span from a parent span.
 * Inherits the trace_id and sets parent_span_id to the parent's span_id.
 */
export function createChildSpan(
  parent: SpanContext,
  operation: string
): SpanContext {
  return {
    trace_id: parent.trace_id,
    span_id: generateSpanId(),
    parent_span_id: parent.span_id,
    operation,
    source: parent.source,
    tenant_id: parent.tenant_id,
    started_at: Date.now(),
  };
}

/**
 * Create a child span from partial trace info (when full parent span isn't available,
 * e.g., reconstructed from session context in a separate HTTP call).
 */
export function createSpanFromContext(
  traceId: string,
  parentSpanId: string | null,
  operation: string,
  source: FlowSource,
  tenantId?: string
): SpanContext {
  return {
    trace_id: traceId,
    span_id: generateSpanId(),
    parent_span_id: parentSpanId,
    operation,
    source,
    tenant_id: tenantId,
    started_at: Date.now(),
  };
}

/**
 * Calculate span duration in milliseconds.
 */
export function spanDuration(span: SpanContext): number {
  return Date.now() - span.started_at;
}

/**
 * Serialize span context for passing through session context or metadata.
 * Only includes the fields needed to reconstruct the span on the other side.
 */
export function serializeSpan(span: SpanContext): { trace_id: string; span_id: string; parent_span_id: string | null } {
  return {
    trace_id: span.trace_id,
    span_id: span.span_id,
    parent_span_id: span.parent_span_id,
  };
}
