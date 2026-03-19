// Legacy trace (backwards compatible)
export { createTrace, enrichTrace, generateTraceId as generateTraceIdLegacy, traceElapsed } from "./trace";

// Span-based tracing (enterprise)
export {
  generateTraceId,
  generateSpanId,
  createRootSpan,
  createChildSpan,
  createSpanFromContext,
  spanDuration,
  serializeSpan,
} from "./tracing";

// Logger
export { createLogger, log } from "./logger";

// Metrics
export { metrics } from "./metrics";

// Types
export type { TraceContext, SpanContext, LogEntry, FlowSource, FlowStep, Severity } from "./types";
