"use client";

import { useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { X, Printer, Share2 } from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

interface ReceiptOrder {
  id: string;
  order_number: number;
  order_type: string;
  status: string;
  customer_name?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  total: number;
  payment_method?: string;
  created_at: string;
  restaurant_tables?: { number: string };
}

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  modifiers?: { name: string; price_delta: number }[];
  notes?: string;
}

interface ReceiptConfig {
  enabled: boolean;
  header_text: string;
  footer_text: string;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  order: ReceiptOrder;
  items: ReceiptItem[];
  tenantName: string;
  receiptConfig?: ReceiptConfig;
  currency?: string;
}

/* ── Plain text generator ─────────────────────────────── */

export function generateReceiptText(
  order: ReceiptOrder,
  items: ReceiptItem[],
  tenantName: string,
  config?: ReceiptConfig,
  currency = "EUR",
): string {
  const W = 40;
  const sep = "═".repeat(W);
  const dash = "- ".repeat(W / 2);
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((W - s.length) / 2));
    return " ".repeat(pad) + s;
  };
  const row = (left: string, right: string) => {
    const gap = Math.max(1, W - left.length - right.length);
    return left + " ".repeat(gap) + right;
  };
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);

  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [];
  lines.push(sep);
  lines.push(center(tenantName.toUpperCase()));
  if (config?.header_text) lines.push(center(config.header_text));
  lines.push(sep);

  const orderLine = `Pedido #${order.order_number}`;
  const tableLine = order.restaurant_tables
    ? `Mesa ${order.restaurant_tables.number}`
    : "";
  lines.push(row(orderLine, tableLine));
  lines.push(row(`${dateStr} ${timeStr}`, order.order_type));
  lines.push(dash);

  for (const item of items) {
    const label = `${item.quantity}x ${item.name}`;
    lines.push(row(label, fmt(item.subtotal)));
    if (item.modifiers?.length) {
      for (const mod of item.modifiers) {
        const modLabel = `   + ${mod.name}${mod.price_delta > 0 ? ` (+${fmt(mod.price_delta)})` : ""}`;
        lines.push(modLabel);
      }
    }
    if (item.notes) {
      lines.push(`   * ${item.notes}`);
    }
  }

  lines.push(dash);
  lines.push(row("Subtotal", fmt(order.subtotal)));
  if (order.tax_amount > 0) lines.push(row("IVA", fmt(order.tax_amount)));
  if (order.discount_amount > 0)
    lines.push(row("Descuento", `-${fmt(order.discount_amount)}`));
  if (order.tip_amount > 0) lines.push(row("Propina", fmt(order.tip_amount)));
  lines.push(sep);
  lines.push(row("TOTAL", fmt(order.total)));
  lines.push(sep);

  if (order.payment_method) {
    lines.push(row("Metodo:", order.payment_method));
    lines.push(dash);
  }

  if (config?.footer_text) lines.push(center(config.footer_text));
  lines.push(center("¡Gracias por su visita!"));
  lines.push("");

  return lines.join("\n");
}

/* ── Receipt Modal ────────────────────────────────────── */

export default function ReceiptModal({
  open,
  onClose,
  order,
  items,
  tenantName,
  receiptConfig,
  currency = "EUR",
}: ReceiptModalProps) {
  const { t } = useI18n();
  const receiptRef = useRef<HTMLDivElement>(null);

  const fmt = useCallback(
    (n: number) => formatCurrency(n, currency),
    [currency],
  );

  const date = new Date(order.created_at);
  const dateStr = formatDate(order.created_at, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ── Print ─────────────────────────────── */
  const handlePrint = useCallback(async () => {
    // 1. Intentar impresión directa via servidor local (sin diálogo)
    const fmt = (n: number) =>
      new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);

    const date = new Date(order.created_at);
    const dateStr = date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    const payload = {
      tenantName,
      headerText: receiptConfig?.header_text || "",
      footerText: receiptConfig?.footer_text || "",
      orderNumber: order.order_number,
      tableNumber: order.restaurant_tables?.number || "",
      date: `${dateStr} ${timeStr}`,
      orderType: order.order_type,
      customerName: order.customer_name || "",
      items: items.map((item) => ({
        quantity: item.quantity,
        name: item.name,
        subtotal: fmt(item.subtotal),
        modifiers: item.modifiers?.map((m) =>
          m.price_delta > 0 ? `${m.name} (+${fmt(m.price_delta)})` : m.name
        ) || [],
        notes: item.notes || "",
      })),
      subtotal: fmt(order.subtotal),
      tax: order.tax_amount > 0 ? fmt(order.tax_amount) : "",
      discount: order.discount_amount > 0 ? fmt(order.discount_amount) : "",
      tip: order.tip_amount > 0 ? fmt(order.tip_amount) : "",
      total: fmt(order.total),
      paymentMethod: order.payment_method || "",
    };

    try {
      const res = await fetch("http://localhost:3001/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) return; // impreso directamente, sin diálogo
    } catch {
      // servidor local no disponible — fallback al diálogo del navegador
    }

    // 2. Fallback: diálogo del navegador
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=360,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t("receipt.title")} #${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            width: 80mm;
            padding: 4mm;
          }
          @media print {
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [order, items, tenantName, receiptConfig, currency, t]);

  /* ── Share / Copy ──────────────────────── */
  const handleShare = useCallback(async () => {
    const text = generateReceiptText(
      order,
      items,
      tenantName,
      receiptConfig,
      currency,
    );
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t("receipt.title")} #${order.order_number}`,
          text,
        });
        return;
      } catch {
        /* user cancelled or not supported, fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert(t("receipt.copied"));
    } catch {
      /* clipboard also failed, ignore */
    }
  }, [order, items, tenantName, receiptConfig, currency, t]);

  if (!open) return null;

  /* ── Styles ────────────────────────────── */
  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
  };

  const modal: React.CSSProperties = {
    background: "var(--bg-card)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    width: "100%",
    maxWidth: 400,
    maxHeight: "90vh",
    overflow: "auto",
    position: "relative",
  };

  const receipt: React.CSSProperties = {
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 12,
    lineHeight: 1.5,
    color: "#111",
    background: "#fff",
    padding: "20px 16px",
    margin: 16,
    borderRadius: 4,
    maxWidth: 320,
    marginLeft: "auto",
    marginRight: "auto",
  };

  const sepLine: React.CSSProperties = {
    textAlign: "center" as const,
    letterSpacing: 1,
    margin: "4px 0",
  };

  const dashLine: React.CSSProperties = {
    ...sepLine,
    color: "#999",
  };

  const flexRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  };

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    flex: 1,
  };

  const btnAccent: React.CSSProperties = {
    ...btnBase,
    background: "var(--accent)",
    color: "#fff",
    border: "1px solid var(--accent)",
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--text-primary)",
            }}
          >
            {t("receipt.title")}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Receipt body */}
        <div ref={receiptRef} style={receipt}>
          {/* Restaurant name */}
          <div style={sepLine}>{"═".repeat(36)}</div>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14 }}>
            {tenantName.toUpperCase()}
          </div>
          {receiptConfig?.header_text && (
            <div style={{ textAlign: "center", fontSize: 11 }}>
              {receiptConfig.header_text}
            </div>
          )}
          <div style={sepLine}>{"═".repeat(36)}</div>

          {/* Order info */}
          <div style={flexRow}>
            <span>
              {t("receipt.order")} #{order.order_number}
            </span>
            {order.restaurant_tables && (
              <span>
                {t("receipt.table")} {order.restaurant_tables.number}
              </span>
            )}
          </div>
          <div style={flexRow}>
            <span>{dateStr}</span>
            <span style={{ textTransform: "capitalize" }}>
              {order.order_type}
            </span>
          </div>
          {order.customer_name && (
            <div style={{ fontSize: 11, color: "#666" }}>
              {order.customer_name}
            </div>
          )}

          <div style={dashLine}>{"- ".repeat(18)}</div>

          {/* Items */}
          {items.map((item, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={flexRow}>
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {fmt(item.subtotal)}
                </span>
              </div>
              {item.modifiers?.map((mod, mi) => (
                <div
                  key={mi}
                  style={{ fontSize: 11, color: "#666", paddingLeft: 12 }}
                >
                  + {mod.name}
                  {mod.price_delta > 0 && (
                    <span> (+{fmt(mod.price_delta)})</span>
                  )}
                </div>
              ))}
              {item.notes && (
                <div
                  style={{
                    fontSize: 11,
                    fontStyle: "italic",
                    color: "#666",
                    paddingLeft: 12,
                  }}
                >
                  * {item.notes}
                </div>
              )}
            </div>
          ))}

          <div style={dashLine}>{"- ".repeat(18)}</div>

          {/* Totals */}
          <div style={flexRow}>
            <span>{t("receipt.subtotal")}</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          {order.tax_amount > 0 && (
            <div style={flexRow}>
              <span>{t("receipt.tax")}</span>
              <span>{fmt(order.tax_amount)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div style={flexRow}>
              <span>{t("receipt.discount")}</span>
              <span>-{fmt(order.discount_amount)}</span>
            </div>
          )}
          {order.tip_amount > 0 && (
            <div style={flexRow}>
              <span>{t("receipt.tip")}</span>
              <span>{fmt(order.tip_amount)}</span>
            </div>
          )}

          <div style={sepLine}>{"═".repeat(36)}</div>
          <div
            style={{
              ...flexRow,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <span>{t("receipt.total")}</span>
            <span>{fmt(order.total)}</span>
          </div>
          <div style={sepLine}>{"═".repeat(36)}</div>

          {/* Payment method */}
          {order.payment_method && (
            <>
              <div style={flexRow}>
                <span>{t("receipt.method")}:</span>
                <span style={{ textTransform: "capitalize" }}>
                  {order.payment_method}
                </span>
              </div>
              <div style={dashLine}>{"- ".repeat(18)}</div>
            </>
          )}

          {/* Footer */}
          {receiptConfig?.footer_text && (
            <div style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>
              {receiptConfig.footer_text}
            </div>
          )}
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              marginTop: 2,
              color: "#666",
            }}
          >
            {t("receipt.thank_you")}
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "0 16px 16px",
          }}
        >
          <button style={btnBase} onClick={handlePrint}>
            <Printer size={15} />
            {t("receipt.print")}
          </button>
          <button style={btnAccent} onClick={handleShare}>
            <Share2 size={15} />
            {t("receipt.share")}
          </button>
        </div>
      </div>
    </div>
  );
}
