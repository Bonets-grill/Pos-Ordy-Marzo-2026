/**
 * Lightweight Metrics Collection System
 *
 * Provides Prometheus-compatible metrics for operational monitoring.
 * Three metric types: Counter, Histogram, Gauge.
 *
 * In serverless (Netlify), each function instance has its own metrics state.
 * Prometheus scrapes /api/admin/metrics and aggregates across instances.
 *
 * For persistent metrics (dashboards), use recordMetricSnapshot() to
 * store aggregated values in the DB periodically.
 *
 * Usage:
 *   metrics.ordersCreated.inc({ source: "whatsapp" });
 *   metrics.agentLatency.observe(350, { tool: "confirmOrder" });
 *   metrics.activeOrders.set(12, { status: "preparing" });
 */

// ─── Metric Types ───────────────────────────────────────

type Labels = Record<string, string>;

function labelsKey(labels: Labels): string {
  const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([k, v]) => `${k}="${v}"`).join(",");
}

class Counter {
  readonly name: string;
  readonly help: string;
  private values = new Map<string, number>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels: Labels = {}, value: number = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  toPrometheus(): string {
    const lines: string[] = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, val] of this.values) {
      const labelStr = key ? `{${key}}` : "";
      lines.push(`${this.name}${labelStr} ${val}`);
    }
    return lines.join("\n");
  }

  getValues(): Map<string, number> { return new Map(this.values); }
  reset(): void { this.values.clear(); }
}

class Histogram {
  readonly name: string;
  readonly help: string;
  readonly buckets: number[];
  private counts = new Map<string, { sum: number; count: number; buckets: number[] }>();

  constructor(name: string, help: string, buckets: number[] = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
    this.name = name;
    this.help = help;
    this.buckets = buckets.sort((a, b) => a - b);
  }

  observe(value: number, labels: Labels = {}): void {
    const key = labelsKey(labels);
    if (!this.counts.has(key)) {
      this.counts.set(key, { sum: 0, count: 0, buckets: new Array(this.buckets.length).fill(0) });
    }
    const entry = this.counts.get(key)!;
    entry.sum += value;
    entry.count++;
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) entry.buckets[i]++;
    }
  }

  toPrometheus(): string {
    const lines: string[] = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const [key, entry] of this.counts) {
      const base = key ? `,${key}` : "";
      for (let i = 0; i < this.buckets.length; i++) {
        lines.push(`${this.name}_bucket{le="${this.buckets[i]}"${base}} ${entry.buckets[i]}`);
      }
      lines.push(`${this.name}_bucket{le="+Inf"${base}} ${entry.count}`);
      lines.push(`${this.name}_sum{${key}} ${entry.sum}`);
      lines.push(`${this.name}_count{${key}} ${entry.count}`);
    }
    return lines.join("\n");
  }

  getSummary(): Map<string, { sum: number; count: number; avg: number }> {
    const result = new Map<string, { sum: number; count: number; avg: number }>();
    for (const [key, entry] of this.counts) {
      result.set(key, { sum: entry.sum, count: entry.count, avg: entry.count > 0 ? Math.round(entry.sum / entry.count) : 0 });
    }
    return result;
  }

  reset(): void { this.counts.clear(); }
}

class Gauge {
  readonly name: string;
  readonly help: string;
  private values = new Map<string, number>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  set(value: number, labels: Labels = {}): void {
    this.values.set(labelsKey(labels), value);
  }

  inc(labels: Labels = {}, value: number = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  dec(labels: Labels = {}, value: number = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) || 0) - value);
  }

  toPrometheus(): string {
    const lines: string[] = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [key, val] of this.values) {
      const labelStr = key ? `{${key}}` : "";
      lines.push(`${this.name}${labelStr} ${val}`);
    }
    return lines.join("\n");
  }

  getValues(): Map<string, number> { return new Map(this.values); }
  reset(): void { this.values.clear(); }
}

// ─── Metrics Registry ───────────────────────────────────

class MetricsRegistry {
  // Counters
  readonly ordersCreated = new Counter("ordy_orders_created_total", "Total orders created");
  readonly webhooksReceived = new Counter("ordy_webhooks_received_total", "Total webhook events received");
  readonly webhooksDuplicate = new Counter("ordy_webhooks_duplicate_total", "Duplicate webhooks skipped");
  readonly webhooksRateLimited = new Counter("ordy_webhooks_rate_limited_total", "Rate-limited webhook requests");
  readonly toolCalls = new Counter("ordy_tool_calls_total", "Total agent tool calls");
  readonly paymentsProcessed = new Counter("ordy_payments_processed_total", "Total payments processed");
  readonly notificationsSent = new Counter("ordy_notifications_sent_total", "Total notifications sent");
  readonly notificationsSkipped = new Counter("ordy_notifications_skipped_total", "Notifications skipped (idempotency)");
  readonly errorsTotal = new Counter("ordy_errors_total", "Total errors by type");
  readonly stateMachineViolations = new Counter("ordy_state_machine_violations_total", "Order state machine violations blocked");

  // Histograms (latency in ms)
  readonly webhookLatency = new Histogram("ordy_webhook_latency_ms", "Webhook processing latency", [50, 100, 500, 1000, 5000, 10000, 30000, 60000]);
  readonly agentLatency = new Histogram("ordy_agent_latency_ms", "AI agent response latency", [500, 1000, 2500, 5000, 10000, 20000, 30000]);
  readonly toolLatency = new Histogram("ordy_tool_latency_ms", "Tool execution latency", [10, 50, 100, 250, 500, 1000, 2500]);
  readonly dbQueryLatency = new Histogram("ordy_db_query_latency_ms", "Database query latency", [5, 10, 25, 50, 100, 250, 500]);

  // Gauges
  readonly activeWebhooks = new Gauge("ordy_active_webhooks", "Currently processing webhooks");
  readonly instanceUptime = new Gauge("ordy_instance_uptime_seconds", "Serverless instance uptime");

  private startedAt = Date.now();

  /**
   * Export all metrics in Prometheus text format.
   */
  toPrometheus(): string {
    // Update uptime gauge
    this.instanceUptime.set(Math.floor((Date.now() - this.startedAt) / 1000));

    const all = [
      this.ordersCreated, this.webhooksReceived, this.webhooksDuplicate,
      this.webhooksRateLimited, this.toolCalls, this.paymentsProcessed,
      this.notificationsSent, this.notificationsSkipped, this.errorsTotal,
      this.stateMachineViolations,
      this.webhookLatency, this.agentLatency, this.toolLatency, this.dbQueryLatency,
      this.activeWebhooks, this.instanceUptime,
    ];

    return all.map((m) => m.toPrometheus()).join("\n\n") + "\n";
  }

  /**
   * Export a JSON summary (for admin dashboard).
   */
  toJSON(): Record<string, unknown> {
    return {
      counters: {
        orders_created: Object.fromEntries(this.ordersCreated.getValues()),
        webhooks_received: Object.fromEntries(this.webhooksReceived.getValues()),
        webhooks_duplicate: Object.fromEntries(this.webhooksDuplicate.getValues()),
        webhooks_rate_limited: Object.fromEntries(this.webhooksRateLimited.getValues()),
        tool_calls: Object.fromEntries(this.toolCalls.getValues()),
        payments_processed: Object.fromEntries(this.paymentsProcessed.getValues()),
        notifications_sent: Object.fromEntries(this.notificationsSent.getValues()),
        errors: Object.fromEntries(this.errorsTotal.getValues()),
      },
      histograms: {
        webhook_latency: Object.fromEntries(this.webhookLatency.getSummary()),
        agent_latency: Object.fromEntries(this.agentLatency.getSummary()),
        tool_latency: Object.fromEntries(this.toolLatency.getSummary()),
      },
      uptime_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  /**
   * Reset all metrics (for testing).
   */
  reset(): void {
    this.ordersCreated.reset(); this.webhooksReceived.reset();
    this.webhooksDuplicate.reset(); this.webhooksRateLimited.reset();
    this.toolCalls.reset(); this.paymentsProcessed.reset();
    this.notificationsSent.reset(); this.notificationsSkipped.reset();
    this.errorsTotal.reset(); this.stateMachineViolations.reset();
    this.webhookLatency.reset(); this.agentLatency.reset();
    this.toolLatency.reset(); this.dbQueryLatency.reset();
    this.activeWebhooks.reset();
  }
}

// ─── Singleton ──────────────────────────────────────────

export const metrics = new MetricsRegistry();
