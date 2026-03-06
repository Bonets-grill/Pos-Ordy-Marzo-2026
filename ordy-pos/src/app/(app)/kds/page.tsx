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
  status: string;
  created_at: string;
}

interface KdsStation {
  id: string;
  name: string;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
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
  if (order.order_type === "delivery") return "Delivery";
  if (order.order_type === "takeaway") return "Takeaway";
  if (order.restaurant_tables?.number) return `${t("kds.table")} ${order.restaurant_tables.number}`;
  return "";
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

  // Realtime connection indicator
  const [realtimeConnected, setRealtimeConnected] = useState(false);

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
      .select("id, order_number, table_id, order_type, status, created_at, restaurant_tables(number)")
      .eq("tenant_id", tenantId)
      .in("status", ["confirmed", "preparing", "ready"])
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
      .in("kds_status", ["pending", "preparing"]);

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
        () => fetchOrders()
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
  const filteredOrders =
    activeStation === "all"
      ? orders
      : orders
          .map((o) => ({
            ...o,
            items: o.items.filter((i) => i.kds_station === activeStation),
          }))
          .filter((o) => o.items.length > 0);

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
    fetchOrders();
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
    }
    fetchOrders();
  }

  async function bumpOrder(order: OrderWithItems) {
    // Save for recall
    setLastBumped(order);

    const itemIds = order.items.map((i) => i.id);
    await supabase
      .from("order_items")
      .update({ kds_status: "served" })
      .in("id", itemIds);
    await supabase
      .from("orders")
      .update({ status: "served" })
      .eq("id", order.id);
    fetchOrders();
  }

  async function recallOrder() {
    if (!lastBumped) return;
    const order = lastBumped;
    const itemIds = order.items.map((i) => i.id);

    // Restore items to their previous statuses
    for (const item of order.items) {
      await supabase
        .from("order_items")
        .update({ kds_status: item.kds_status })
        .eq("id", item.id);
    }
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
        minHeight: "100vh",
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
      ) : filteredOrders.length === 0 ? (
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
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
          className="max-lg:!grid-cols-3 max-md:!grid-cols-2 max-sm:!grid-cols-1"
        >
          {filteredOrders.map((order) => {
            const color = urgencyColor(order.created_at);
            const allPending = order.items.every((i) => i.kds_status === "pending");
            const allPreparing = order.items.some((i) => i.kds_status === "preparing");

            return (
              <div
                key={order.id}
                className={urgencyClass(order.created_at)}
                style={{
                  background: "var(--bg-card)",
                  border: `2px solid ${color}`,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
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
                      #{order.order_number}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {orderLabel(order, t)}
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

                {/* Items */}
                <div
                  style={{
                    padding: "12px 16px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        paddingBottom: 8,
                        borderBottom: "1px solid var(--border)",
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
                            color: "var(--accent)",
                            minWidth: 28,
                          }}
                        >
                          {item.quantity}x
                        </span>
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                      {!!item.modifiers && (
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            paddingLeft: 36,
                          }}
                        >
                          {String(item.modifiers)}
                        </span>
                      )}
                      {item.notes && (
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--warning)",
                            fontWeight: 600,
                            paddingLeft: 36,
                          }}
                        >
                          {item.notes}
                        </span>
                      )}
                    </div>
                  ))}
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

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    borderTop: "1px solid var(--border)",
                  }}
                >
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
