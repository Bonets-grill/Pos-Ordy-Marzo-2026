// ============================================================
// DASHBOARD SERVER — Local Express on :4000
// Serves HTML dashboard + SSE event stream
// Zero Supabase, zero env vars, zero external network
// ============================================================

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { onSimEvent, SimEvent } from "./flows-isolated";
import { getStat } from "./logger";

let sseClients: http.ServerResponse[] = [];

// Push events to all connected SSE clients
onSimEvent((event: SimEvent) => {
  const data = JSON.stringify(event);
  for (const res of sseClients) {
    res.write(`data: ${data}\n\n`);
  }
});

// Push stats snapshots every 2s
let statsInterval: ReturnType<typeof setInterval> | null = null;

export function startDashboardServer(
  tenantCount: number,
  onReady: () => void
) {
  const dashboardHtml = fs.readFileSync(
    path.join(__dirname, "dashboard.html"),
    "utf-8"
  );

  const server = http.createServer((req, res) => {
    if (req.url === "/events") {
      // SSE endpoint
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      sseClients.push(res);
      req.on("close", () => {
        sseClients = sseClients.filter((c) => c !== res);
      });
      return;
    }

    if (req.url === "/stats") {
      const stats: Record<string, unknown>[] = [];
      for (let i = 0; i < tenantCount; i++) {
        try {
          stats.push(getStat(i));
        } catch {
          // tenant not yet initialized
        }
      }
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(stats));
      return;
    }

    // Serve dashboard HTML
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(dashboardHtml);
  });

  // Push stats to SSE clients periodically
  statsInterval = setInterval(() => {
    const stats: Record<string, unknown>[] = [];
    for (let i = 0; i < tenantCount; i++) {
      try {
        stats.push(getStat(i));
      } catch {
        // not yet initialized
      }
    }
    const data = JSON.stringify({ type: "stats", stats });
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`);
    }
  }, 2000);

  server.listen(4000, () => {
    onReady();
  });

  return server;
}

export function stopDashboardServer() {
  if (statsInterval) clearInterval(statsInterval);
  for (const res of sseClients) {
    res.end();
  }
  sseClients = [];
}
