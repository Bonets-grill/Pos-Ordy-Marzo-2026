"use client";

interface MonitorContext { tenantId?: string; userId?: string; }
let ctx: MonitorContext = {};

export function updateMonitorContext(update: MonitorContext) {
  ctx = { ...ctx, ...update };
}

async function ship(payload: Record<string, unknown>) {
  try {
    await fetch("/api/admin/monitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, ...ctx }),
      keepalive: true,
    });
  } catch { }
}

function parseStack(stack: string): { file?: string; line?: number; col?: number } {
  if (!stack) return {};
  for (const raw of stack.split("\n").slice(1)) {
    const trimmed = raw.trim();
    const match =
      trimmed.match(/at .+ \((.+):(\d+):(\d+)\)$/) ||
      trimmed.match(/at (.+):(\d+):(\d+)$/);
    if (match) {
      return {
        file: match[1]
          .replace(/^webpack-internal:\/\/\/(app-client)\/./, "src")
          .replace(/^webpack-internal:\/\/\//, "")
          .replace(/\?.*$/, ""),
        line: parseInt(match[2]),
        col: parseInt(match[3]),
      };
    }
  }
  return {};
}

export function initMonitor() {
  if (typeof window === "undefined") return;
  if ((window as unknown as Record<string, unknown>).__ordyMonitorInit) return;
  (window as unknown as Record<string, unknown>).__ordyMonitorInit = true;

  window.addEventListener("error", (event) => {
    const { message, filename, lineno, colno, error } = event;
    ship({
      level: "error",
      message: message || "Unknown error",
      file: filename || parseStack(error?.stack || "").file,
      line: lineno || parseStack(error?.stack || "").line,
      col: colno || parseStack(error?.stack || "").col,
      stack: error?.stack,
      url: window.location.href,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message
      : typeof reason === "string" ? reason : "Unhandled promise rejection";
    const { file, line, col } = parseStack(reason?.stack || "");
    ship({ level: "error", message, file, line, col, stack: reason?.stack, url: window.location.href });
  });

  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origError(...args);
    const syntheticStack = new Error().stack || "";
    const { file, line, col } = parseStack(syntheticStack);
    const message = args.map(a => a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a)).join(" ").slice(0, 400);
    ship({ level: "error", message, file, line, col, stack: syntheticStack, url: window.location.href });
  };

  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    const syntheticStack = new Error().stack || "";
    const { file, line, col } = parseStack(syntheticStack);
    const message = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ").slice(0, 400);
    ship({ level: "warn", message, file, line, col, url: window.location.href });
  };
}
