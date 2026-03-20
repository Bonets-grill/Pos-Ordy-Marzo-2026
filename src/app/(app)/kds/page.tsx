"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { timeAgo } from "@/lib/utils";
import {
  Volume2,
  VolumeX,
  Undo2,
  Maximize,
  Minimize,
} from "lucide-react";

/* ─── Types ─── */

interface OrderItem {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  notes: string | null;
  modifiers: unknown;
  kds_status: string;
  kds_station: string | null;
}

interface Order {
  id: string;
  order_number: string;
  table_id: string | null;
  restaurant_tables: { number: string } | null;
  order_type: string | null;
  source: string | null;
  status: string;
  created_at: string;
  customer_name: string | null;
  customer_notes: string | null;
  customer_phone: string | null;
  total: number | null;
  metadata: Record<string, unknown> | null;
}

interface KdsStation {
  id: string;
  name: string;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
}

/* ─── Table Group ─── */
// Groups multiple orders from the same table into one card
// Orders without table_id (WA, takeaway, delivery) are shown individually
interface TableGroup {
  key: string;             // table_id or order.id for ungrouped
  table_number: string | null;
  orders: OrderWithItems[]; // sorted oldest→newest
  activeOrder: OrderWithItems; // most recent = the one buttons act on
}

/* ─── Helpers ─── */

function elapsedMinutes(created_at: string): number {
  return (Date.now() - new Date(created_at).getTime()) / 60000;
}

function urgencyColor(created_at: string): string {
  const mins = elapsedMinutes(created_at);
  if (mins < 5) return "var(--success)";
  if (mins < 10) return "var(--warning)";
  return "var(--danger)";
}

function urgencyClass(created_at: string): string {
  return elapsedMinutes(created_at) > 10 ? "kds-urgent" : "";
}

function orderLabel(order: Order, t: (k: string) => string): string {
  const mesa = order.restaurant_tables?.number ? ` · Mesa ${order.restaurant_tables.number}` : "";
  if (order.source === "whatsapp") return "📱 WhatsApp";
  if (order.order_type === "qr") return `📲 QR${mesa}`;
  if (order.order_type === "delivery") return t("pos.delivery");
  if (order.order_type === "takeaway") return t("pos.takeaway");
  if (order.restaurant_tables?.number) return `${t("kds.table")} ${order.restaurant_tables.number}`;
  return "";
}

function formatCurrencyKds(amount: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

/* ─── Sound helper ─── */

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Web Audio not available
  }
}

/* ─── Component ─── */

export default function KdsPage() {
  const { t } = useI18n();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stations, setStations] = useState<KdsStation[]>([]);
  const [activeStation, setActiveStation] = useState<string>("all");
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // Sound
  const [muted, setMuted] = useState(false);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  // Recall / Undo
  const [lastBumped, setLastBumped] = useState<OrderWithItems | null>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // WhatsApp accept modal
  const [waAcceptOrder, setWaAcceptOrder] = useState<OrderWithItems | null>(null);
  const [waPickupMinutes, setWaPickupMinutes] = useState(30);
  const [waActionLoading, setWaActionLoading] = useState(false);

  // Realtime connection indicator
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // WhatsApp customer cancellation popup
  const [waCancelledOrder, setWaCancelledOrder] = useState<{ order_number: string; customer_name: string } | null>(null);

  // Tick every second to update elapsed times
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Resolve tenant
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
    })();
  }, [supabase]);

  // Fetch stations
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("kds_stations")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");
      if (data) setStations(data as KdsStation[]);
    })();
  }, [tenantId, supabase]);

  // Fetch orders + items
  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, order_number, table_id, order_type, source, status, created_at, customer_name, customer_notes, customer_phone, total, metadata, restaurant_tables(number)")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "preparing", "ready", "closed"])
      .order("created_at", { ascending: true });

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = ordersData.map((o: any) => o.id);
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("id, order_id, name, quantity, notes, modifiers, kds_status, kds_station")
      .in("order_id", orderIds)
      .in("kds_status", ["pending", "preparing", "ready"]);

    const itemsByOrder: Record<string, OrderItem[]> = {};
    (itemsData || []).forEach((item: OrderItem) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    const merged: OrderWithItems[] = (ordersData as unknown as Order[])
      .map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }))
      .filter((o) => o.items.length > 0);

    // Detect new orders for sound alert
    const newIds = new Set(merged.map((o) => o.id));
    if (prevOrderIdsRef.current.size > 0) {
      for (const id of newIds) {
        if (!prevOrderIdsRef.current.has(id)) {
          // New order arrived
          if (!muted) playBeep();
          break;
        }
      }
    }
    prevOrderIdsRef.current = newIds;

    setOrders(merged);
    setLoading(false);
  }, [tenantId, supabase, muted]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscriptions
  useEffect(() => {
    if (!tenantId) return;

    const ordersChannel = supabase
      .channel("kds-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          // Detect WhatsApp order cancelled by customer
          if (payload.eventType === "UPDATE" && payload.new?.status === "cancelled" && payload.new?.source === "whatsapp") {
            const meta = payload.new.metadata as Record<string, unknown> | null;
            if (meta?.pickup_status === "customer_cancelled") {
              setWaCancelledOrder({
                order_number: String(payload.new.order_number),
                customer_name: (payload.new.customer_name as string) || "",
              });
              // Auto-dismiss after 8 seconds
              setTimeout(() => setWaCancelledOrder(null), 8000);
            }
          }
          fetchOrders();
        }
      )
      .subscribe((status: string) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    const itemsChannel = supabase
      .channel("kds-items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
      setRealtimeConnected(false);
    };
  }, [tenantId, supabase, fetchOrders]);

  // Count orders per station
  function stationOrderCount(stationId: string): number {
    if (stationId === "all") return orders.length;
    return orders.filter((o) =>
      o.items.some((i) => i.kds_station === stationId)
    ).length;
  }

  // Filter by station
  // Items with kds_station=null appear in ALL stations (created from POS without station)
  const filteredOrders =
    activeStation === "all"
      ? orders
      : orders
          .map((o) => ({
            ...o,
            items: o.items.filter(
              (i) => i.kds_station === activeStation || i.kds_station === null
            ),
          }))
          .filter((o) => o.items.length > 0);

  // Group orders by table — orders without table_id stay individual
  const tableGroups: TableGroup[] = (() => {
    const grouped = new Map<string, OrderWithItems[]>();
    for (const order of filteredOrders) {
      const key = order.table_id || `__solo__${order.id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(order);
    }
    const groups: TableGroup[] = [];
    for (const [key, grpOrders] of grouped) {
      // Sort oldest first so we show history top→bottom
      const sorted = [...grpOrders].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      // Split orders: those with active items vs fully served (no items left)
      // fetchOrders already filters items to pending/preparing/ready only
      // so items.length === 0 means fully served
      const activeOrders = sorted.filter(o => o.items.length > 0);
      const servedOrders = sorted.filter(o => o.items.length === 0);
      const activeOrder = activeOrders[activeOrders.length - 1] || sorted[sorted.length - 1];
      // Rebuild sorted: served first (history), then active orders
      const resorted = [...servedOrders, ...activeOrders];
      groups.push({
        key,
        table_number: resorted[0].restaurant_tables?.number || null,
        orders: resorted,
        activeOrder,
      });
    }
    // Sort groups by the oldest order in each group (FIFO)
    groups.sort(
      (a, b) =>
        new Date(a.orders[0].created_at).getTime() -
        new Date(b.orders[0].created_at).getTime()
    );
    return groups;
  })();

  /* ─── Actions ─── */

  async function markPreparing(order: OrderWithItems) {
    const itemIds = order.items.map((i) => i.id);
    await supabase
      .from("order_items")
      .update({ kds_status: "preparing" })
      .in("id", itemIds);
    await supabase
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", order.id);

    // Auto-notify WhatsApp customer when order starts preparing
    if (order.source === "whatsapp" && order.customer_phone && tenantId) {
      fetch("/api/whatsapp/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          type: "order_preparing",
          tenant_id: tenantId,
        }),
      }).catch((err) => console.error("WA preparing notify error:", err));
    }

    fetchOrders();
  }

  // WhatsApp: Accept order with pickup time
  async function waAcceptConfirm() {
    if (!waAcceptOrder || !tenantId) return;
    setWaActionLoading(true);
    try {
      await fetch("/api/whatsapp/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: waAcceptOrder.id,
          type: "kitchen_accepted",
          pickup_minutes: waPickupMinutes,
          tenant_id: tenantId,
        }),
      });
      setWaAcceptOrder(null);
      fetchOrders();
    } catch (err) {
      console.error("WA accept error:", err);
    } finally {
      setWaActionLoading(false);
    }
  }

  // WhatsApp: Reject order
  async function waRejectOrder(order: OrderWithItems) {
    if (!tenantId) return;
    try {
      await fetch("/api/whatsapp/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          type: "kitchen_rejected",
          tenant_id: tenantId,
        }),
      });
      fetchOrders();
    } catch (err) {
      console.error("WA reject error:", err);
    }
  }

  async function markReady(order: OrderWithItems) {
    const itemIds = order.items.map((i) => i.id);
    await supabase
      .from("order_items")
      .update({ kds_status: "ready" })
      .in("id", itemIds);

    // Check if ALL items in this order are now ready
    const { data: remaining } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", order.id)
      .in("kds_status", ["pending", "preparing"]);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from("orders")
        .update({ status: "ready" })
        .eq("id", order.id);

      // Auto-notify WhatsApp customer when order is ready
      if (order.source === "whatsapp" && order.customer_phone && tenantId) {
        fetch("/api/whatsapp/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            type: "order_ready",
            tenant_id: tenantId,
          }),
        }).catch((err) => console.error("WA ready notify error:", err));
      }
    }
    fetchOrders();
  }

  async function bumpOrder(order: OrderWithItems) {
    // Save for recall
    setLastBumped(order);

    const itemIds = order.items.map((i) => i.id);
    const { error: itemsErr } = await supabase
      .from("order_items")
      .update({ kds_status: "served" })
      .in("id", itemIds);

    if (itemsErr) {
      console.error("bumpOrder items error:", itemsErr);
      return;
    }

    const { error: orderErr } = await supabase
      .from("orders")
      .update({ status: "served" })
      .eq("id", order.id);

    if (orderErr) {
      console.error("bumpOrder order error:", orderErr);
    }

    fetchOrders();
  }

  async function recallOrder() {
    if (!lastBumped) return;
    const order = lastBumped;

    // Batch updates by status — avoids N sequential queries
    const byStatus: Record<string, string[]> = {};
    for (const item of order.items) {
      if (!byStatus[item.kds_status]) byStatus[item.kds_status] = [];
      byStatus[item.kds_status].push(item.id);
    }
    await Promise.all(
      Object.entries(byStatus).map(([status, ids]) =>
        supabase.from("order_items").update({ kds_status: status }).in("id", ids)
      )
    );
    await supabase
      .from("orders")
      .update({ status: order.status })
      .eq("id", order.id);

    setLastBumped(null);
    fetchOrders();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ─── Render ─── */

  return (
    <div
      style={{
        padding: 16,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Top Bar: Station Tabs + Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Station Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            flex: 1,
          }}
        >
          <button
            onClick={() => setActiveStation("all")}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: activeStation === "all" ? "var(--accent)" : "var(--border)",
              background: activeStation === "all" ? "var(--accent-soft)" : "var(--bg-card)",
              color: activeStation === "all" ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {t("kds.all_stations")}
            <span
              style={{
                background: activeStation === "all" ? "var(--accent)" : "var(--text-muted)",
                color: activeStation === "all" ? "#000" : "var(--bg-card)",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 12,
                fontWeight: 700,
                minWidth: 22,
                textAlign: "center",
              }}
            >
              {stationOrderCount("all")}
            </span>
          </button>
          {stations.map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStation(st.id)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: activeStation === st.id ? "var(--accent)" : "var(--border)",
                background: activeStation === st.id ? "var(--accent-soft)" : "var(--bg-card)",
                color: activeStation === st.id ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {st.name}
              <span
                style={{
                  background: activeStation === st.id ? "var(--accent)" : "var(--text-muted)",
                  color: activeStation === st.id ? "#000" : "var(--bg-card)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 12,
                  fontWeight: 700,
                  minWidth: 22,
                  textAlign: "center",
                }}
              >
                {stationOrderCount(st.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* Realtime indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
            title={t("kds.realtime_connected")}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: realtimeConnected ? "var(--success)" : "var(--danger)",
                animation: realtimeConnected ? "kds-pulse 2s ease-in-out infinite" : "none",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              {t("kds.live")}
            </span>
          </div>

          {/* Recall button */}
          <button
            onClick={recallOrder}
            disabled={!lastBumped}
            title={t("kds.recall")}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: lastBumped ? "var(--warning)" : "var(--bg-card)",
              color: lastBumped ? "#000" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: 14,
              cursor: lastBumped ? "pointer" : "not-allowed",
              opacity: lastBumped ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Undo2 size={16} />
            {t("kds.recall")}
          </button>

          {/* Mute / Unmute */}
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? t("kds.unmute") : t("kds.mute")}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: muted ? "var(--danger)" : "var(--success)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={t("kds.fullscreen")}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes kds-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>

      {/* Orders Grid */}
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 20,
          }}
        >
          ...
        </div>
      ) : tableGroups.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 20,
          }}
        >
          —
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
          className="max-lg:!grid-cols-3 max-md:!grid-cols-2 max-sm:!grid-cols-1"
        >
          {tableGroups.map((group) => {
            const order = group.activeOrder;
            const color = urgencyColor(order.created_at);
            const allPending = order.items.every((i) => i.kds_status === "pending");
            const allPreparing = order.items.some((i) => i.kds_status === "preparing");
            const hasHistory = group.orders.length > 1;

            return (
              <div
                key={group.key}
                className={urgencyClass(order.created_at)}
                style={{
                  background: "var(--bg-card)",
                  border: `2px solid ${color}`,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  maxHeight: "calc(100vh - 140px)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${color}33`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: `${color}10`,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {hasHistory ? `Mesa ${group.table_number}` : `#${order.order_number}`}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {hasHistory
                        ? group.orders.map((o) => `#${o.order_number}`).join(" · ")
                        : orderLabel(order, t)}
                      {order.customer_name ? ` — ${order.customer_name}` : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {timeAgo(order.created_at)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {t("kds.elapsed")}
                    </span>
                  </div>
                </div>

                {/* Customer notes */}
                {order.customer_notes && (
                  <div
                    style={{
                      margin: "0 12px",
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "var(--warning)15",
                      borderRadius: 8,
                      borderLeft: "4px solid var(--warning)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--warning)",
                    }}
                  >
                    {order.customer_notes}
                  </div>
                )}

                {/* Items */}
                <div
                  style={{
                    padding: "12px 16px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflowY: "auto",
                  }}
                >
                  {/* Previous orders — crossed out */}
                  {hasHistory && group.orders.slice(0, -1).map((prevOrder) => (
                    <div key={prevOrder.id}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        #{prevOrder.order_number} · {t("kds.served")}
                      </div>
                      {prevOrder.items.map((item) => (
                        <div key={item.id} style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: 0.4, textDecoration: "line-through", marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-muted)", minWidth: 28 }}>{item.quantity}x</span>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)" }}>{item.name}</span>
                        </div>
                      ))}
                      <div style={{ borderBottom: "1px dashed var(--border)", margin: "6px 0 8px" }} />
                    </div>
                  ))}
                  {/* Active order items — ready items tachados, pending/preparing activos con badge NUEVO */}
                  {order.items.map((item) => {
                    const isServed = item.kds_status === "ready";
                    const isNew = item.kds_status === "pending";
                    return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        paddingBottom: 8,
                        borderBottom: "1px solid var(--border)",
                        opacity: isServed ? 0.45 : 1,
                        textDecoration: isServed ? "line-through" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: isServed ? "var(--text-muted)" : "var(--accent)",
                            minWidth: 28,
                          }}
                        >
                          {item.quantity}x
                        </span>
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: isServed ? "var(--text-muted)" : "var(--text-primary)",
                          }}
                        >
                          {item.name}
                        </span>
                        {isNew && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            background: "var(--accent)",
                            color: "#000",
                            borderRadius: 4,
                            padding: "2px 6px",
                            marginLeft: 4,
                            letterSpacing: "0.05em",
                            textDecoration: "none",
                          }}>NUEVO</span>
                        )}
                      </div>
                      {(() => {
                        const mods = Array.isArray(item.modifiers) ? item.modifiers : [];
                        return mods.length > 0 ? (
                          <div style={{ paddingLeft: 36, display: "flex", flexDirection: "column", gap: 2 }}>
                            {mods.map((mod: { name: string; price_delta: number }, mi: number) => (
                              <span key={mi} style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>
                                + {mod.name}{mod.price_delta > 0 ? ` (+${mod.price_delta.toFixed(2)}€)` : ""}
                              </span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      {item.notes && (
                        <div
                          style={{
                            fontSize: 14,
                            color: "var(--warning)",
                            fontWeight: 700,
                            paddingLeft: 36,
                            padding: "4px 8px 4px 36px",
                            marginTop: 2,
                            background: "var(--warning)11",
                            borderRadius: 6,
                            borderLeft: "3px solid var(--warning)",
                          }}
                        >
                          ⚠ {item.notes}
                        </div>
                      )}
                    </div>
                  );
                  })}
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {order.items.length} {t("kds.items")}
                  </span>
                </div>

                {/* WhatsApp order info bar */}
                {order.source === "whatsapp" && (
                  <div
                    style={{
                      padding: "8px 16px",
                      background: "rgba(37, 211, 102, 0.1)",
                      borderTop: "1px solid rgba(37, 211, 102, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#25D366" }}>
                      📱 WhatsApp — {order.customer_name || order.customer_phone}
                    </span>
                    {order.total != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                        {formatCurrencyKds(order.total)}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {/* WhatsApp orders: state-based buttons */}
                  {order.source === "whatsapp" && order.status === "confirmed" && (() => {
                    const pickupStatus = (order.metadata as Record<string, unknown>)?.pickup_status as string | undefined;

                    // State 1: Initial — Accept / Reject
                    if (!pickupStatus && allPending) return (
                      <>
                        <button
                          onClick={() => { setWaAcceptOrder(order); setWaPickupMinutes(30); }}
                          style={{ flex: 1, padding: "14px 8px", border: "none", background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", borderRadius: "0 0 0 10px" }}
                        >
                          ✅ {t("kds.wa_accept")}
                        </button>
                        <button
                          onClick={() => waRejectOrder(order)}
                          style={{ flex: 1, padding: "14px 8px", border: "none", background: "var(--danger)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", borderRadius: "0 0 10px 0" }}
                        >
                          ❌ {t("kds.wa_reject")}
                        </button>
                      </>
                    );

                    // State 2: Waiting for customer confirmation
                    if (pickupStatus === "awaiting_confirmation") return (
                      <div style={{ flex: 1, padding: "14px 8px", background: "rgba(255, 170, 0, 0.15)", color: "var(--warning)", fontWeight: 700, fontSize: 14, textAlign: "center", borderRadius: "0 0 10px 10px" }}>
                        ⏳ Esperando confirmación del cliente...
                      </div>
                    );

                    // State 3: Customer confirmed — Aceptado + Preparar
                    if (pickupStatus === "customer_confirmed") return (
                      <>
                        <div style={{ flex: 1, padding: "14px 8px", background: "rgba(37, 211, 102, 0.15)", color: "#25D366", fontWeight: 700, fontSize: 15, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: "0 0 0 10px" }}>
                          ✅ Aceptado
                        </div>
                        <button
                          onClick={() => markPreparing(order)}
                          style={{ flex: 1, padding: "14px 8px", border: "none", background: "var(--info)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", borderRadius: "0 0 10px 0" }}
                        >
                          🔥 Preparar
                        </button>
                      </>
                    );

                    // Fallback: show default buttons
                    return null;
                  })() || (order.source === "whatsapp" && order.status === "confirmed" ? null : (
                    <>
                      {allPending && (
                        <button
                          onClick={() => markPreparing(order)}
                          style={{
                            flex: 1,
                            padding: "14px 8px",
                            border: "none",
                            background: "var(--info)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: "pointer",
                            borderRadius: "0 0 0 10px",
                          }}
                        >
                          {t("kds.mark_preparing")}
                        </button>
                      )}
                      {allPreparing && (
                        <button
                          onClick={() => markReady(order)}
                          style={{
                            flex: 1,
                            padding: "14px 8px",
                            border: "none",
                            background: "var(--success)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: "pointer",
                            borderRadius: allPending ? "0" : "0 0 0 10px",
                          }}
                        >
                          {t("kds.mark_ready")}
                        </button>
                      )}
                      <button
                        onClick={() => bumpOrder(order)}
                        style={{
                          flex: 1,
                          padding: "14px 8px",
                          border: "none",
                          background: "var(--accent)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: "pointer",
                          borderRadius: "0 0 10px 0",
                        }}
                      >
                        {t("kds.bump")}
                      </button>
                    </>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* WhatsApp Accept Modal — Pickup Time Picker */}
      {waAcceptOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setWaAcceptOrder(null)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 16,
              padding: 24,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              📱 {t("kds.wa_accept_title")}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              #{waAcceptOrder.order_number} — {waAcceptOrder.customer_name || waAcceptOrder.customer_phone}
              {waAcceptOrder.total != null && ` — ${formatCurrencyKds(waAcceptOrder.total)}`}
            </div>

            {/* Items summary */}
            <div style={{ marginBottom: 16, padding: 12, background: "var(--bg-secondary)", borderRadius: 8, maxHeight: 150, overflowY: "auto" }}>
              {waAcceptOrder.items.map((item) => (
                <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 14, color: "var(--text-primary)" }}>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>{item.quantity}x</span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
              ⏱️ {t("kds.wa_pickup_time")}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[10, 15, 20, 25, 35, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setWaPickupMinutes(mins)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: waPickupMinutes === mins ? "2px solid #25D366" : "1px solid var(--border)",
                    background: waPickupMinutes === mins ? "rgba(37, 211, 102, 0.15)" : "var(--bg-secondary)",
                    color: waPickupMinutes === mins ? "#25D366" : "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setWaAcceptOrder(null)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                {t("kds.wa_cancel")}
              </button>
              <button
                onClick={waAcceptConfirm}
                disabled={waActionLoading}
                style={{
                  flex: 2,
                  padding: 14,
                  borderRadius: 10,
                  border: "none",
                  background: "#25D366",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: waActionLoading ? "wait" : "pointer",
                  opacity: waActionLoading ? 0.7 : 1,
                }}
              >
                {waActionLoading ? "..." : `✅ ${t("kds.wa_confirm_send")} (${waPickupMinutes} min)`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp Customer Cancellation Popup */}
      {waCancelledOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setWaCancelledOrder(null)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 16,
              padding: 32,
              width: 420,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              border: "3px solid var(--danger)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>
              Pedido #{waCancelledOrder.order_number} cancelado
            </div>
            <div style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 20 }}>
              El cliente <strong>{waCancelledOrder.customer_name}</strong> ha cancelado su pedido por WhatsApp.
            </div>
            <button
              onClick={() => setWaCancelledOrder(null)}
              style={{
                padding: "12px 32px",
                borderRadius: 10,
                border: "none",
                background: "var(--danger)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
