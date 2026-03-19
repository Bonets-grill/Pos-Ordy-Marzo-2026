/**
 * Trace context for correlating events across a single request flow.
 * Generates unique trace_id and propagates context through function calls.
 */

import type { TraceContext, FlowSource } from "./types";

let counter = 0;

/**
 * Generate a unique trace ID.
 * Format: ordy-{timestamp}-{counter}-{random}
 */
export function generateTraceId(): string {
  counter = (counter + 1) % 99999;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  return `ordy-${ts}-${counter}-${rnd}`;
}

/**
 * Create a new trace context for a request flow.
 */
export function createTrace(source: FlowSource, tenantId?: string): TraceContext {
  return {
    trace_id: generateTraceId(),
    tenant_id: tenantId,
    source,
    started_at: Date.now(),
  };
}

/**
 * Enrich trace context with additional identifiers as they become known.
 */
export function enrichTrace(
  ctx: TraceContext,
  fields: Partial<Pick<TraceContext, "tenant_id" | "order_id" | "session_id" | "phone">>
): TraceContext {
  return { ...ctx, ...fields };
}

/**
 * Calculate elapsed time from trace start.
 */
export function traceElapsed(ctx: TraceContext): number {
  return Date.now() - ctx.started_at;
}
