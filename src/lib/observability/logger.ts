/**
 * Structured JSON logger for critical flows.
 * Outputs to console with structured format for log aggregation.
 * Enabled/disabled via OBSERVABILITY_LOGGING env var.
 */

import type { TraceContext, SpanContext, FlowStep, Severity, LogEntry, FlowSource } from "./types";

const isEnabled = () => process.env.OBSERVABILITY_LOGGING === "true";

function buildEntry(
  ctx: TraceContext | SpanContext | null,
  severity: Severity,
  flowStep: FlowStep,
  message: string,
  extra?: Partial<LogEntry>
): LogEntry {
  const spanCtx = ctx && "span_id" in ctx ? ctx as SpanContext : null;
  return {
    timestamp: new Date().toISOString(),
    trace_id: ctx?.trace_id || "no-trace",
    span_id: spanCtx?.span_id || extra?.span_id,
    parent_span_id: spanCtx?.parent_span_id || extra?.parent_span_id || undefined,
    severity,
    source: ctx?.source || (extra?.source as FlowSource) || "system",
    flow_step: flowStep,
    message,
    tenant_id: ctx?.tenant_id || extra?.tenant_id,
    order_id: ("order_id" in (ctx || {}) ? (ctx as TraceContext)?.order_id : undefined) || extra?.order_id,
    session_id: ("session_id" in (ctx || {}) ? (ctx as TraceContext)?.session_id : undefined) || extra?.session_id,
    phone: ("phone" in (ctx || {}) ? (ctx as TraceContext)?.phone : undefined) || extra?.phone,
    ...extra,
  };
}

function emit(entry: LogEntry): void {
  if (!isEnabled()) return;

  const { severity } = entry;
  const json = JSON.stringify(entry);

  switch (severity) {
    case "error":
    case "critical":
      console.error(`[ORDY:${severity.toUpperCase()}] ${json}`);
      break;
    case "warn":
      console.warn(`[ORDY:WARN] ${json}`);
      break;
    default:
      console.log(`[ORDY:${severity.toUpperCase()}] ${json}`);
  }
}

/**
 * Create a scoped logger bound to a trace context.
 */
export function createLogger(ctx: TraceContext | SpanContext) {
  return {
    debug: (step: FlowStep, msg: string, extra?: Partial<LogEntry>) =>
      emit(buildEntry(ctx, "debug", step, msg, extra)),
    info: (step: FlowStep, msg: string, extra?: Partial<LogEntry>) =>
      emit(buildEntry(ctx, "info", step, msg, extra)),
    warn: (step: FlowStep, msg: string, extra?: Partial<LogEntry>) =>
      emit(buildEntry(ctx, "warn", step, msg, extra)),
    error: (step: FlowStep, msg: string, extra?: Partial<LogEntry>) =>
      emit(buildEntry(ctx, "error", step, msg, extra)),
    critical: (step: FlowStep, msg: string, extra?: Partial<LogEntry>) =>
      emit(buildEntry(ctx, "critical", step, msg, extra)),
  };
}

/**
 * Standalone log function (no trace context required).
 */
export function log(
  severity: Severity,
  source: FlowSource,
  step: FlowStep,
  message: string,
  extra?: Partial<LogEntry>
): void {
  emit(buildEntry(null, severity, step, message, { source, ...extra }));
}
