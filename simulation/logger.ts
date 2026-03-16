// ============================================================
// SIMULATION LOGGER — Real-time colored terminal output
// ============================================================

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // Foreground
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  // Background
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
} as const;

// Assign each tenant a color for visual distinction
const TENANT_COLORS = [
  COLORS.cyan, COLORS.magenta, COLORS.yellow, COLORS.green,
  COLORS.blue, COLORS.red, COLORS.white, COLORS.cyan,
  COLORS.magenta, COLORS.yellow,
];

export type LogCategory =
  | "ORDER"
  | "PAYMENT"
  | "RECEIPT"
  | "KDS"
  | "QR"
  | "STATUS"
  | "TRANSLATE"
  | "SETUP"
  | "ERROR"
  | "SUMMARY";

const CATEGORY_STYLE: Record<LogCategory, string> = {
  ORDER: `${COLORS.bgBlue}${COLORS.white}${COLORS.bold}`,
  PAYMENT: `${COLORS.bgGreen}${COLORS.white}${COLORS.bold}`,
  RECEIPT: `${COLORS.bgMagenta}${COLORS.white}${COLORS.bold}`,
  KDS: `${COLORS.bgYellow}${COLORS.white}${COLORS.bold}`,
  QR: `${COLORS.bgCyan}${COLORS.white}${COLORS.bold}`,
  STATUS: `${COLORS.gray}`,
  TRANSLATE: `${COLORS.blue}${COLORS.bold}`,
  SETUP: `${COLORS.dim}`,
  ERROR: `${COLORS.bgRed}${COLORS.white}${COLORS.bold}`,
  SUMMARY: `${COLORS.bold}${COLORS.green}`,
};

// ── Counters for live dashboard ───────────────────────────────

export interface TenantStats {
  tenantName: string;
  ordersCreated: number;
  ordersCompleted: number;
  paymentsProcessed: number;
  receiptsGenerated: number;
  kdsUpdates: number;
  qrOrders: number;
  translationChecks: number;
  totalRevenue: number;
  errors: number;
}

const statsMap = new Map<number, TenantStats>();

export function initStats(tenantIdx: number, tenantName: string) {
  statsMap.set(tenantIdx, {
    tenantName,
    ordersCreated: 0,
    ordersCompleted: 0,
    paymentsProcessed: 0,
    receiptsGenerated: 0,
    kdsUpdates: 0,
    qrOrders: 0,
    translationChecks: 0,
    totalRevenue: 0,
    errors: 0,
  });
}

export function getStat(tenantIdx: number): TenantStats {
  return statsMap.get(tenantIdx)!;
}

export function incStat(tenantIdx: number, key: keyof Omit<TenantStats, "tenantName">, amount = 1) {
  const s = statsMap.get(tenantIdx)!;
  (s[key] as number) += amount;
}

// ── Log function ──────────────────────────────────────────────

export function log(
  tenantIdx: number,
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>
) {
  const now = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  const tenantColor = TENANT_COLORS[tenantIdx % TENANT_COLORS.length];
  const catStyle = CATEGORY_STYLE[category];
  const tenantTag = `${tenantColor}[T${(tenantIdx + 1).toString().padStart(2, "0")}]${COLORS.reset}`;
  const catTag = `${catStyle} ${category.padEnd(9)} ${COLORS.reset}`;
  const detailStr = details
    ? ` ${COLORS.dim}${JSON.stringify(details)}${COLORS.reset}`
    : "";

  console.log(`${COLORS.gray}${now}${COLORS.reset} ${tenantTag} ${catTag} ${message}${detailStr}`);
}

// ── Global log (no tenant) ────────────────────────────────────

export function glog(category: LogCategory, message: string) {
  const now = new Date().toISOString().slice(11, 23);
  const catStyle = CATEGORY_STYLE[category];
  const catTag = `${catStyle} ${category.padEnd(9)} ${COLORS.reset}`;
  console.log(`${COLORS.gray}${now}${COLORS.reset} ${COLORS.bold}[SIM]${COLORS.reset} ${catTag} ${message}`);
}

// ── Dashboard summary ─────────────────────────────────────────

export function printDashboard() {
  const line = "═".repeat(110);
  console.log(`\n${COLORS.bold}${line}${COLORS.reset}`);
  console.log(`${COLORS.bold}  SIMULATION DASHBOARD — LIVE TOTALS${COLORS.reset}`);
  console.log(`${COLORS.bold}${line}${COLORS.reset}`);
  console.log(
    `  ${"Tenant".padEnd(28)} ${"Orders".padStart(8)} ${"Paid".padStart(8)} ${"Done".padStart(8)} ` +
    `${"KDS".padStart(6)} ${"QR".padStart(6)} ${"Receipts".padStart(10)} ${"i18n".padStart(6)} ` +
    `${"Revenue".padStart(12)} ${"Errors".padStart(8)}`
  );
  console.log(`  ${"-".repeat(106)}`);

  let totals = { orders: 0, paid: 0, done: 0, kds: 0, qr: 0, receipts: 0, i18n: 0, revenue: 0, errors: 0 };

  for (const [idx, s] of statsMap) {
    const color = TENANT_COLORS[idx % TENANT_COLORS.length];
    console.log(
      `  ${color}${s.tenantName.padEnd(28)}${COLORS.reset}` +
      ` ${s.ordersCreated.toString().padStart(8)}` +
      ` ${s.paymentsProcessed.toString().padStart(8)}` +
      ` ${s.ordersCompleted.toString().padStart(8)}` +
      ` ${s.kdsUpdates.toString().padStart(6)}` +
      ` ${s.qrOrders.toString().padStart(6)}` +
      ` ${s.receiptsGenerated.toString().padStart(10)}` +
      ` ${s.translationChecks.toString().padStart(6)}` +
      ` ${s.totalRevenue.toFixed(2).padStart(12)}` +
      ` ${s.errors.toString().padStart(8)}`
    );
    totals.orders += s.ordersCreated;
    totals.paid += s.paymentsProcessed;
    totals.done += s.ordersCompleted;
    totals.kds += s.kdsUpdates;
    totals.qr += s.qrOrders;
    totals.receipts += s.receiptsGenerated;
    totals.i18n += s.translationChecks;
    totals.revenue += s.totalRevenue;
    totals.errors += s.errors;
  }

  console.log(`  ${"-".repeat(106)}`);
  console.log(
    `  ${COLORS.bold}${"TOTAL".padEnd(28)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.orders.toString().padStart(8)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.paid.toString().padStart(8)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.done.toString().padStart(8)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.kds.toString().padStart(6)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.qr.toString().padStart(6)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.receipts.toString().padStart(10)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.i18n.toString().padStart(6)}${COLORS.reset}` +
    ` ${COLORS.bold}${totals.revenue.toFixed(2).padStart(12)}${COLORS.reset}` +
    ` ${totals.errors > 0 ? COLORS.red : COLORS.green}${totals.errors.toString().padStart(8)}${COLORS.reset}`
  );
  console.log(`${COLORS.bold}${line}${COLORS.reset}\n`);
}
