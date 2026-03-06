"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, timeAgo } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────── */

interface Zone {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
}

interface RestaurantTable {
  id: string;
  tenant_id: string;
  number: number;
  capacity: number;
  zone_id: string | null;
  shape: "square" | "round" | "rectangle";
  status: "available" | "occupied" | "reserved" | "cleaning";
}

interface TableOrder {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  table_id: string;
}

type ViewMode = "grid" | "list";
type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

/* ── Constants ────────────────────────────────────────── */

const STATUS_COLORS: Record<TableStatus, string> = {
  available: "#22C55E",
  occupied: "#F97316",
  reserved: "#3B82F6",
  cleaning: "#EAB308",
};

const SHAPE_OPTIONS: { value: RestaurantTable["shape"]; key: string }[] = [
  { value: "square", key: "tables.square" },
  { value: "round", key: "tables.round" },
  { value: "rectangle", key: "tables.rectangle" },
];

const STATUS_OPTIONS: { value: TableStatus; key: string }[] = [
  { value: "available", key: "tables.available" },
  { value: "occupied", key: "tables.occupied" },
  { value: "reserved", key: "tables.reserved" },
  { value: "cleaning", key: "tables.cleaning" },
];

const ZONE_COLOR_PICKS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#78716c", "#64748b",
];

const blankTable: Omit<RestaurantTable, "id" | "tenant_id" | "status"> = {
  number: 1,
  capacity: 4,
  zone_id: null,
  shape: "square",
};

const blankZone: Omit<Zone, "id" | "tenant_id"> = {
  name: "",
  color: "#3b82f6",
};

/* ── Shared styles ────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.6rem 0.75rem",
  color: "var(--text-primary)",
  fontSize: "0.9rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
};

const btnPrimary: React.CSSProperties = {
  background: "var(--accent)",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: "rgba(239,68,68,0.15)",
  color: "#f87171",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

/* ── Component ────────────────────────────────────────── */

export default function TablesPage() {
  const { t } = useI18n();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Data
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [tableOrders, setTableOrders] = useState<Record<string, TableOrder>>({});

  // Table modal
  const [tableModal, setTableModal] = useState(false);
  const [tableEdit, setTableEdit] = useState<RestaurantTable | null>(null);
  const [tableForm, setTableForm] = useState(blankTable);
  const [tableDeleting, setTableDeleting] = useState<string | null>(null);

  // Zone modal
  const [zoneModal, setZoneModal] = useState(false);
  const [zoneEdit, setZoneEdit] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState(blankZone);
  const [zoneDeleting, setZoneDeleting] = useState<string | null>(null);

  // Action menu
  const [actionTable, setActionTable] = useState<RestaurantTable | null>(null);
  const [actionPos, setActionPos] = useState<{ x: number; y: number } | null>(null);

  const [saving, setSaving] = useState(false);

  /* ── Init: get tenant ─────────────────────────────── */

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
    }
    init();
  }, []);

  /* ── Load data ────────────────────────────────────── */

  const loadZones = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("zones")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (data) setZones(data as Zone[]);
  }, [tenantId]);

  const loadTables = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("number", { ascending: true });
    if (data) setTables(data as RestaurantTable[]);
  }, [tenantId]);

  const loadTableOrders = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total, created_at, table_id")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "preparing", "ready", "delivered"])
      .not("table_id", "is", null);
    if (data) {
      const map: Record<string, TableOrder> = {};
      for (const order of data as TableOrder[]) {
        if (order.table_id) map[order.table_id] = order;
      }
      setTableOrders(map);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    Promise.all([loadZones(), loadTables(), loadTableOrders()]).finally(() =>
      setLoading(false)
    );
  }, [tenantId, loadZones, loadTables, loadTableOrders]);

  /* ── Table CRUD ────────────────────────────────────── */

  const openTableCreate = () => {
    setTableEdit(null);
    setTableForm({ ...blankTable, number: (tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1) });
    setTableModal(true);
  };

  const openTableEdit = (tbl: RestaurantTable) => {
    setTableEdit(tbl);
    setTableForm({
      number: tbl.number,
      capacity: tbl.capacity,
      zone_id: tbl.zone_id,
      shape: tbl.shape,
    });
    setTableModal(true);
  };

  const saveTable = async () => {
    if (!tenantId || !tableForm.number) return;
    setSaving(true);
    const supabase = createClient();
    if (tableEdit) {
      await supabase
        .from("restaurant_tables")
        .update({ ...tableForm })
        .eq("id", tableEdit.id);
    } else {
      await supabase
        .from("restaurant_tables")
        .insert({ ...tableForm, tenant_id: tenantId, status: "available" });
    }
    setTableModal(false);
    setSaving(false);
    await loadTables();
  };

  const deleteTable = async (id: string) => {
    const supabase = createClient();
    await supabase.from("restaurant_tables").delete().eq("id", id);
    setTableDeleting(null);
    await loadTables();
  };

  const changeTableStatus = async (tbl: RestaurantTable, status: TableStatus) => {
    const supabase = createClient();
    await supabase
      .from("restaurant_tables")
      .update({ status })
      .eq("id", tbl.id);
    setActionTable(null);
    setActionPos(null);
    await loadTables();
  };

  /* ── Zone CRUD ─────────────────────────────────────── */

  const openZoneCreate = () => {
    setZoneEdit(null);
    setZoneForm({ ...blankZone });
    setZoneModal(true);
  };

  const openZoneEdit = (zone: Zone) => {
    setZoneEdit(zone);
    setZoneForm({ name: zone.name, color: zone.color });
    setZoneModal(true);
  };

  const saveZone = async () => {
    if (!tenantId || !zoneForm.name) return;
    setSaving(true);
    const supabase = createClient();
    if (zoneEdit) {
      await supabase.from("zones").update({ ...zoneForm }).eq("id", zoneEdit.id);
    } else {
      await supabase.from("zones").insert({ ...zoneForm, tenant_id: tenantId });
    }
    setZoneModal(false);
    setSaving(false);
    await loadZones();
  };

  const deleteZone = async (id: string) => {
    const supabase = createClient();
    await supabase.from("zones").delete().eq("id", id);
    setZoneDeleting(null);
    await loadZones();
  };

  /* ── Helpers ───────────────────────────────────────── */

  const zoneName = (id: string | null) => {
    const z = zones.find((z) => z.id === id);
    return z ? z.name : "—";
  };

  const zoneColor = (id: string | null) => {
    const z = zones.find((z) => z.id === id);
    return z?.color || "var(--text-muted)";
  };

  const statusLabel = (status: TableStatus) => t(`tables.${status}`);

  const handleTableClick = (tbl: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionTable?.id === tbl.id) {
      setActionTable(null);
      setActionPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActionTable(tbl);
      setActionPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    }
  };

  // Close action menu when clicking outside
  useEffect(() => {
    if (!actionTable) return;
    const handler = () => {
      setActionTable(null);
      setActionPos(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [actionTable]);

  /* ── Modal overlay ─────────────────────────────────── */

  const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "1.5rem",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );

  const ConfirmDelete = ({
    message,
    onConfirm,
    onCancel,
  }: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <Overlay onClose={onCancel}>
      <p style={{ color: "var(--text-primary)", fontSize: "1rem", marginBottom: 20, marginTop: 0 }}>
        {message}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button style={btnSecondary} onClick={onCancel}>{t("tables.cancel")}</button>
        <button style={btnDanger} onClick={onConfirm}>{t("tables.delete")}</button>
      </div>
    </Overlay>
  );

  /* ── Table shape renderer ──────────────────────────── */

  const renderTableShape = (tbl: RestaurantTable) => {
    const color = STATUS_COLORS[tbl.status];
    const order = tableOrders[tbl.id];
    const isOccupied = tbl.status === "occupied";
    const baseSize = tbl.shape === "rectangle" ? { width: 160, height: 100 } : { width: 120, height: 120 };

    return (
      <div
        key={tbl.id}
        onClick={(e) => handleTableClick(tbl, e)}
        style={{
          ...baseSize,
          borderRadius: tbl.shape === "round" ? "50%" : tbl.shape === "rectangle" ? 12 : 12,
          background: `${color}18`,
          border: `2px solid ${color}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          position: "relative",
          gap: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = `0 0 20px ${color}40`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Table number */}
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {tbl.number}
        </span>

        {/* Capacity */}
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
          {tbl.capacity}p
        </span>

        {/* Status badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color,
            padding: "2px 8px",
            borderRadius: 999,
            background: `${color}25`,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {statusLabel(tbl.status)}
        </span>

        {/* Order info for occupied tables */}
        {isOccupied && order && (
          <div style={{ textAlign: "center", marginTop: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {formatCurrency(order.total)}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {timeAgo(order.created_at)}
            </div>
          </div>
        )}

        {/* Zone indicator dot */}
        {tbl.zone_id && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: zoneColor(tbl.zone_id),
              border: "1px solid var(--border)",
            }}
          />
        )}
      </div>
    );
  };

  /* ── Action menu (floating) ────────────────────────── */

  const renderActionMenu = () => {
    if (!actionTable || !actionPos) return null;
    const tbl = actionTable;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: actionPos.x,
          top: actionPos.y,
          transform: "translateX(-50%)",
          zIndex: 110,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 8,
          minWidth: 200,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* View Order (only if occupied with an order) */}
        {tbl.status === "occupied" && tableOrders[tbl.id] && (
          <button
            style={menuItemStyle}
            onClick={() => {
              window.location.href = `/orders?id=${tableOrders[tbl.id].id}`;
            }}
          >
            {t("tables.view_order")}
          </button>
        )}

        {/* Change status options */}
        <div
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("tables.change_status")}
        </div>
        {STATUS_OPTIONS.filter((s) => s.value !== tbl.status).map((s) => (
          <button
            key={s.value}
            style={menuItemStyle}
            onClick={() => changeTableStatus(tbl, s.value)}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: STATUS_COLORS[s.value],
                display: "inline-block",
                marginRight: 8,
              }}
            />
            {t(s.key)}
          </button>
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

        {/* Edit */}
        <button style={menuItemStyle} onClick={() => { setActionTable(null); openTableEdit(tbl); }}>
          {t("tables.edit")}
        </button>

        {/* Delete */}
        <button
          style={{ ...menuItemStyle, color: "#f87171" }}
          onClick={() => { setActionTable(null); setTableDeleting(tbl.id); }}
        >
          {t("tables.delete")}
        </button>
      </div>
    );
  };

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, margin: 0 }}>
          {t("tables.title")}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btnSecondary} onClick={openZoneCreate}>
            + {t("tables.add_zone")}
          </button>
          <button style={btnPrimary} onClick={openTableCreate}>
            + {t("tables.add")}
          </button>
        </div>
      </div>

      {/* View toggle + zone legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* View mode tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {(["grid", "list"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: viewMode === mode ? "2px solid var(--accent)" : "2px solid transparent",
                background: "none",
                color: viewMode === mode ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: viewMode === mode ? 700 : 500,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t(mode === "grid" ? "tables.grid_view" : "tables.list_view")}
            </button>
          ))}
        </div>

        {/* Zone legend + edit */}
        {zones.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => openZoneEdit(z)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: `${z.color}15`,
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: z.color,
                  }}
                />
                {z.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: STATUS_COLORS[s.value],
              }}
            />
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
              {t(s.key)}
            </span>
          </div>
        ))}
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>...</p>
      )}

      {/* ─── Grid View ───────────────────────────────── */}

      {!loading && viewMode === "grid" && (
        <>
          {tables.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
              {t("tables.no_tables")}
            </p>
          )}

          {/* Group by zone */}
          {(() => {
            const zoneIds = [...new Set(tables.map((t) => t.zone_id))];
            // Sort: zones with names first, null last
            zoneIds.sort((a, b) => {
              if (a === null) return 1;
              if (b === null) return -1;
              return zoneName(a).localeCompare(zoneName(b));
            });

            return zoneIds.map((zid) => {
              const zoneTables = tables.filter((t) => t.zone_id === zid);
              if (zoneTables.length === 0) return null;

              return (
                <div key={zid || "no-zone"} style={{ marginBottom: 32 }}>
                  {/* Zone header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {zid && (
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: zoneColor(zid),
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {zid ? zoneName(zid) : "—"}
                    </span>
                  </div>

                  {/* Table grid */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                    }}
                  >
                    {zoneTables.map((tbl) => renderTableShape(tbl))}
                  </div>
                </div>
              );
            });
          })()}
        </>
      )}

      {/* ─── List View ───────────────────────────────── */}

      {!loading && viewMode === "list" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "#",
                    t("tables.zone"),
                    t("tables.capacity"),
                    t("tables.status"),
                    t("tables.current_order"),
                    t("tables.time"),
                    t("tables.actions"),
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tables.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: 32,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      {t("tables.no_tables")}
                    </td>
                  </tr>
                )}
                {tables.map((tbl) => {
                  const order = tableOrders[tbl.id];
                  const color = STATUS_COLORS[tbl.status];
                  return (
                    <tr
                      key={tbl.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-primary)",
                          fontWeight: 700,
                        }}
                      >
                        {tbl.number}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {tbl.zone_id ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "3px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              background: `${zoneColor(tbl.zone_id)}20`,
                              color: zoneColor(tbl.zone_id),
                            }}
                          >
                            {zoneName(tbl.zone_id)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {tbl.capacity}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${color}20`,
                            color,
                          }}
                        >
                          {statusLabel(tbl.status)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {order ? formatCurrency(order.total) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {order ? timeAgo(order.created_at) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{ ...btnSecondary, padding: "4px 10px", fontSize: "0.78rem" }}
                            onClick={() => openTableEdit(tbl)}
                          >
                            {t("tables.edit")}
                          </button>
                          <button
                            style={{ ...btnDanger, padding: "4px 10px", fontSize: "0.78rem" }}
                            onClick={() => setTableDeleting(tbl.id)}
                          >
                            {t("tables.delete")}
                          </button>
                          {tbl.status !== "available" && (
                            <button
                              style={{ ...btnSecondary, padding: "4px 10px", fontSize: "0.78rem", color: STATUS_COLORS.available }}
                              onClick={() => changeTableStatus(tbl, "available")}
                            >
                              {t("tables.mark_available")}
                            </button>
                          )}
                          {tbl.status !== "cleaning" && (
                            <button
                              style={{ ...btnSecondary, padding: "4px 10px", fontSize: "0.78rem", color: STATUS_COLORS.cleaning }}
                              onClick={() => changeTableStatus(tbl, "cleaning")}
                            >
                              {t("tables.mark_cleaning")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Floating Action Menu (grid view) ────────── */}

      {viewMode === "grid" && renderActionMenu()}

      {/* ─── Table Modal ─────────────────────────────── */}

      {tableModal && (
        <Overlay onClose={() => setTableModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {tableEdit ? t("tables.edit") : t("tables.add")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Number + Capacity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("tables.number")} *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={tableForm.number}
                  onChange={(e) => setTableForm({ ...tableForm, number: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("tables.capacity")} *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Zone */}
            <div>
              <label style={labelStyle}>{t("tables.zone")}</label>
              <select
                style={inputStyle}
                value={tableForm.zone_id || ""}
                onChange={(e) => setTableForm({ ...tableForm, zone_id: e.target.value || null })}
              >
                <option value="">—</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            {/* Shape */}
            <div>
              <label style={labelStyle}>{t("tables.shape")}</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {SHAPE_OPTIONS.map((s) => {
                  const selected = tableForm.shape === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTableForm({ ...tableForm, shape: s.value })}
                      style={{
                        padding: "8px 18px",
                        borderRadius: 8,
                        border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
                        background: selected ? "var(--accent)1a" : "var(--bg-secondary)",
                        color: selected ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: "0.85rem",
                        fontWeight: selected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {t(s.key)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, flexWrap: "wrap" }}>
            <div>
              {tableEdit && (
                <button
                  style={btnDanger}
                  onClick={() => { setTableModal(false); setTableDeleting(tableEdit.id); }}
                >
                  {t("tables.delete")}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={btnSecondary} onClick={() => setTableModal(false)}>
                {t("tables.cancel")}
              </button>
              <button style={btnPrimary} onClick={saveTable} disabled={saving}>
                {saving ? "..." : t("tables.save")}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ─── Zone Modal ──────────────────────────────── */}

      {zoneModal && (
        <Overlay onClose={() => setZoneModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {zoneEdit ? t("tables.edit") : t("tables.add_zone")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Zone name */}
            <div>
              <label style={labelStyle}>{t("tables.zone_name")} *</label>
              <input
                style={inputStyle}
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>

            {/* Zone color */}
            <div>
              <label style={labelStyle}>{t("tables.zone_color")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {ZONE_COLOR_PICKS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setZoneForm({ ...zoneForm, color: c })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: c,
                      border: zoneForm.color === c ? "3px solid var(--accent)" : "2px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, flexWrap: "wrap" }}>
            <div>
              {zoneEdit && (
                <button
                  style={btnDanger}
                  onClick={() => { setZoneModal(false); setZoneDeleting(zoneEdit.id); }}
                >
                  {t("tables.delete")}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={btnSecondary} onClick={() => setZoneModal(false)}>
                {t("tables.cancel")}
              </button>
              <button style={btnPrimary} onClick={saveZone} disabled={saving}>
                {saving ? "..." : t("tables.save")}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ─── Delete confirmations ────────────────────── */}

      {tableDeleting && (
        <ConfirmDelete
          message={t("tables.confirm_delete")}
          onConfirm={() => deleteTable(tableDeleting)}
          onCancel={() => setTableDeleting(null)}
        />
      )}

      {zoneDeleting && (
        <ConfirmDelete
          message={t("tables.confirm_delete_zone")}
          onConfirm={() => deleteZone(zoneDeleting)}
          onCancel={() => setZoneDeleting(null)}
        />
      )}
    </div>
  );
}

/* ── Menu item style for action popup ─────────────────── */

const menuItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "none",
  background: "none",
  color: "var(--text-secondary)",
  fontSize: "0.85rem",
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: 6,
  textAlign: "left",
  display: "flex",
  alignItems: "center",
  transition: "background 0.1s",
  width: "100%",
};
