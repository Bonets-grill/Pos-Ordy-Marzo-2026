"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  MessageSquare,
  Ban,
  RotateCcw,
  Pencil,
  Calendar,
  Save,
  ChevronDown,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

interface OrderItem {
  id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  modifiers: unknown;
  kds_status: string | null;
  notes: string | null;
}

interface Order {
  id: string;
  order_number: string;
  restaurant_tables: { number: string } | null;
  order_type: string;
  status: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number;
  payment_method: string | null;
  payment_status: string | null;
  customer_name: string | null;
  customer_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
}

interface MenuItem {
  id: string;
  name_es: string;
  price: number;
  category_id: string | null;
}

/* ── Constants ────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  open: "var(--info)",
  confirmed: "var(--accent)",
  preparing: "var(--warning)",
  ready: "var(--success)",
  served: "var(--text-secondary)",
  closed: "var(--text-muted)",
  cancelled: "var(--danger)",
  refunded: "var(--warning)",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  qr: "QR",
  whatsapp: "📱 WhatsApp",
};

const TAB_FILTERS = [
  { key: "all", label: "orders.all", value: null },
  { key: "open", label: "orders.open", value: "open" },
  { key: "preparing", label: "orders.preparing", value: "preparing" },
  { key: "ready", label: "orders.ready", value: "ready" },
  { key: "closed", label: "orders.closed", value: "closed" },
  { key: "cancelled", label: "orders.cancelled", value: "cancelled" },
] as const;

const DATE_RANGE_OPTIONS = [
  { key: "all", label: "orders.date_all" },
  { key: "today", label: "orders.date_today" },
  { key: "week", label: "orders.date_week" },
  { key: "month", label: "orders.date_month" },
  { key: "custom", label: "orders.date_custom" },
] as const;

const PAGE_SIZE = 20;
// Tax rate loaded from tenant settings in loadOrders()

/* ── Component ────────────────────────────────────────── */

export default function OrdersPage() {
  const { t, lang } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ln = (item: any) => item[`name_${lang}`] || item.name_es || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantTaxRate, setTenantTaxRate] = useState(0.10);

  // Date range filter
  const [dateRange, setDateRange] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Detail panel
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit order modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuResults, setMenuResults] = useState<MenuItem[]>([]);
  const [menuSearching, setMenuSearching] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);
  const [addedItems, setAddedItems] = useState<{ menuItem: MenuItem; quantity: number }[]>([]);
  const [quantityChanges, setQuantityChanges] = useState<Record<string, number>>({});

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundSaving, setRefundSaving] = useState(false);

  // Notes modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesOrderId, setNotesOrderId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  /* ── Fetch tenant_id once ─────────────────────────── */

  useEffect(() => {
    async function getTenant() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
        const { data: tenant } = await supabase
          .from("tenants")
          .select("tax_rate")
          .eq("id", profile.tenant_id)
          .single();
        if (tenant?.tax_rate != null) setTenantTaxRate(tenant.tax_rate / 100);
      }
    }
    getTenant();
  }, []);

  /* ── Date range helpers ────────────────────────────── */

  const getDateRangeFilter = useCallback(() => {
    const now = new Date();
    if (dateRange === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (dateRange === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (dateRange === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    if (dateRange === "custom" && customDateFrom && customDateTo) {
      return {
        from: new Date(customDateFrom).toISOString(),
        to: new Date(customDateTo + "T23:59:59").toISOString(),
      };
    }
    return null;
  }, [dateRange, customDateFrom, customDateTo]);

  /* ── Fetch orders ─────────────────────────────────── */

  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const supabase = createClient();

      let query = supabase
        .from("orders")
        .select(
          "id, order_number, order_type, status, total, subtotal, tax_amount, discount_amount, tip_amount, payment_method, payment_status, customer_name, customer_notes, notes, created_at, updated_at, restaurant_tables(number)",
          { count: "exact" }
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (activeTab) {
        query = query.eq("status", activeTab);
      }

      if (search.trim()) {
        query = query.or(
          `order_number.ilike.%${search.trim()}%,customer_name.ilike.%${search.trim()}%`
        );
      }

      const dateFilter = getDateRangeFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }

      const { data, count } = await query;

      if (data) {
        // Fetch item counts for each order
        const orderIds = data.map((o) => o.id);
        const { data: itemCounts } = await supabase
          .from("order_items")
          .select("order_id")
          .in("order_id", orderIds);

        const countMap: Record<string, number> = {};
        itemCounts?.forEach((item) => {
          countMap[item.order_id] = (countMap[item.order_id] || 0) + 1;
        });

        setOrders(
          data.map((o) => ({
            ...o,
            items_count: countMap[o.id] || 0,
          })) as unknown as Order[]
        );
      }

      setTotalCount(count ?? 0);
    } catch (err) {
      console.error("fetchOrders error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, activeTab, search, page, getDateRangeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription — refresh orders on new/updated orders
  useEffect(() => {
    if (!tenantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` },
        () => { fetchOrders(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchOrders]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(0);
  }, [activeTab, search, dateRange, customDateFrom, customDateTo]);

  /* ── Fetch order detail ───────────────────────────── */

  const openDetail = async (order: Order) => {
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(null);
      return;
    }
    setSelectedOrder(order);
    setDetailLoading(true);

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("order_items")
        .select("id, menu_item_id, name, quantity, unit_price, subtotal, modifiers, kds_status, notes")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      setOrderItems((data as unknown as OrderItem[]) || []);
    } catch (err) {
      console.error("loadOrderItems error:", err);
      setOrderItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Actions ──────────────────────────────────────── */

  const changeStatus = async (orderId: string, newStatus: string) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("tenant_id", tenantId);

      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }
    } catch (err) {
      window.alert(t("orders.error_status"));
      console.error("changeStatus error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Cancel order with reason ──────────────────────── */

  const openCancelModal = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelOrderId || !tenantId) return;
    setCancelSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          notes: cancelReason.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cancelOrderId)
        .eq("tenant_id", tenantId);

      await fetchOrders();
      if (selectedOrder?.id === cancelOrderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: "cancelled", notes: cancelReason.trim() || null } : null
        );
      }
      setCancelModalOpen(false);
    } catch (err) {
      window.alert(t("orders.error_cancel"));
      console.error("submitCancel error:", err);
    } finally {
      setCancelSaving(false);
    }
  };

  /* ── Refund order ──────────────────────────────────── */

  const openRefundModal = (orderId: string) => {
    setRefundOrderId(orderId);
    setRefundModalOpen(true);
  };

  const submitRefund = async () => {
    if (!refundOrderId || !tenantId) return;
    setRefundSaving(true);
    try {
      const supabase = createClient();

      // Verify current status — state machine only allows closed→refunded
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", refundOrderId)
        .eq("tenant_id", tenantId)
        .single();

      if (currentOrder?.status !== "closed") {
        window.alert(t("orders.error_refund_closed"));
        return;
      }

      const { error: refundErr } = await supabase
        .from("orders")
        .update({
          status: "refunded",
          payment_status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", refundOrderId)
        .eq("tenant_id", tenantId);

      if (refundErr) {
        window.alert(`${t("orders.error_refund")} ${refundErr.message}`);
        return;
      }

      await fetchOrders();
      if (selectedOrder?.id === refundOrderId) {
        setSelectedOrder((prev) =>
          prev
            ? { ...prev, status: "refunded", payment_status: "refunded" }
            : null
        );
      }
      setRefundModalOpen(false);
    } catch (err) {
      window.alert(t("orders.error_refund"));
      console.error("submitRefund error:", err);
    } finally {
      setRefundSaving(false);
    }
  };

  /* ── Order Notes ───────────────────────────────────── */

  const openNotesModal = (order: Order) => {
    setNotesOrderId(order.id);
    setNotesText(order.notes || "");
    setNotesModalOpen(true);
  };

  const submitNotes = async () => {
    if (!notesOrderId || !tenantId) return;
    setNotesSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("orders")
        .update({
          notes: notesText.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", notesOrderId)
        .eq("tenant_id", tenantId);

      await fetchOrders();
      if (selectedOrder?.id === notesOrderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, notes: notesText.trim() || null } : null
        );
      }
      setNotesModalOpen(false);
    } catch (err) {
      window.alert(t("orders.error_notes"));
      console.error("submitNotes error:", err);
    } finally {
      setNotesSaving(false);
    }
  };

  /* ── Edit Order Modal ──────────────────────────────── */

  const canEditOrder = (order: Order) =>
    order.status === "confirmed" || order.status === "preparing";

  const openEditModal = async (order: Order) => {
    if (!canEditOrder(order)) return;
    setEditOrder(order);
    setEditItems([]);
    setMenuSearch("");
    setMenuResults([]);
    setRemovedItemIds([]);
    setAddedItems([]);
    setQuantityChanges({});
    setEditModalOpen(true);

    // Fetch items for this order
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("order_items")
        .select("id, menu_item_id, name, quantity, unit_price, subtotal, modifiers, kds_status, notes")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      setEditItems((data as unknown as OrderItem[]) || []);
    } catch (err) {
      console.error("loadEditItems error:", err);
      setEditItems([]);
    }
  };

  const searchMenuItems = async (query: string) => {
    if (!tenantId || query.trim().length < 2) {
      setMenuResults([]);
      return;
    }
    setMenuSearching(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("menu_items")
        .select("id, name_es, name_en, name_fr, name_de, name_it, price, category_id")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .ilike("name_es", `%${query.trim()}%`)
        .limit(10);

      setMenuResults((data as unknown as MenuItem[]) || []);
    } catch (err) {
      console.error("searchMenuItems error:", err);
      setMenuResults([]);
    } finally {
      setMenuSearching(false);
    }
  };

  // Debounced menu search
  const menuSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMenuSearch = (val: string) => {
    setMenuSearch(val);
    if (menuSearchTimer.current) clearTimeout(menuSearchTimer.current);
    menuSearchTimer.current = setTimeout(() => searchMenuItems(val), 300);
  };

  const addItemToEdit = (menuItem: MenuItem) => {
    const existing = addedItems.find((a) => a.menuItem.id === menuItem.id);
    if (existing) {
      setAddedItems((prev) =>
        prev.map((a) =>
          a.menuItem.id === menuItem.id ? { ...a, quantity: a.quantity + 1 } : a
        )
      );
    } else {
      setAddedItems((prev) => [...prev, { menuItem, quantity: 1 }]);
    }
    setMenuSearch("");
    setMenuResults([]);
  };

  const removeExistingItem = (itemId: string) => {
    setRemovedItemIds((prev) => [...prev, itemId]);
  };

  const undoRemoveItem = (itemId: string) => {
    setRemovedItemIds((prev) => prev.filter((id) => id !== itemId));
  };

  const changeExistingQuantity = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setQuantityChanges((prev) => ({ ...prev, [itemId]: newQty }));
  };

  const changeAddedQuantity = (menuItemId: string, newQty: number) => {
    if (newQty < 1) {
      setAddedItems((prev) => prev.filter((a) => a.menuItem.id !== menuItemId));
      return;
    }
    setAddedItems((prev) =>
      prev.map((a) =>
        a.menuItem.id === menuItemId ? { ...a, quantity: newQty } : a
      )
    );
  };

  const removeAddedItem = (menuItemId: string) => {
    setAddedItems((prev) => prev.filter((a) => a.menuItem.id !== menuItemId));
  };

  // Calculate new totals
  const calculateEditTotals = () => {
    let subtotal = 0;

    // Existing items (not removed, with updated quantities)
    for (const item of editItems) {
      if (removedItemIds.includes(item.id)) continue;
      const qty = quantityChanges[item.id] ?? item.quantity;
      subtotal += item.unit_price * qty;
    }

    // Added items
    for (const added of addedItems) {
      subtotal += added.menuItem.price * added.quantity;
    }

    const tax = subtotal * tenantTaxRate;
    const total = subtotal + tax + (editOrder?.tip_amount || 0) - (editOrder?.discount_amount || 0);

    return { subtotal, tax, total: Math.max(0, total) };
  };

  const submitEdit = async () => {
    if (!editOrder || !tenantId) return;
    setEditSaving(true);
    try {
      const supabase = createClient();

      // 1. Delete removed items
      if (removedItemIds.length > 0) {
        await supabase
          .from("order_items")
          .delete()
          .in("id", removedItemIds)
          .eq("order_id", editOrder.id);
      }

      // 2. Update changed quantities
      for (const [itemId, newQty] of Object.entries(quantityChanges)) {
        if (removedItemIds.includes(itemId)) continue;
        const item = editItems.find((i) => i.id === itemId);
        if (!item) continue;
        await supabase
          .from("order_items")
          .update({
            quantity: newQty,
            subtotal: item.unit_price * newQty,
          })
          .eq("id", itemId);
      }

      // 3. Insert new items
      if (addedItems.length > 0) {
        const newItems = addedItems.map((a) => ({
          order_id: editOrder.id,
          tenant_id: tenantId,
          menu_item_id: a.menuItem.id,
          name: a.menuItem.name_es,
          quantity: a.quantity,
          unit_price: a.menuItem.price,
          subtotal: a.menuItem.price * a.quantity,
        }));
        await supabase.from("order_items").insert(newItems);
      }

      // 4. Update order totals
      const { subtotal, tax, total } = calculateEditTotals();
      await supabase
        .from("orders")
        .update({
          subtotal,
          tax_amount: tax,
          total,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editOrder.id)
        .eq("tenant_id", tenantId);

      // Refresh
      await fetchOrders();
      if (selectedOrder?.id === editOrder.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, subtotal, tax_amount: tax, total } : null
        );
        // Reload items in detail panel
        const { data } = await supabase
          .from("order_items")
          .select("id, menu_item_id, name, quantity, unit_price, subtotal, modifiers, kds_status, notes")
          .eq("order_id", editOrder.id)
          .order("created_at", { ascending: true });
        setOrderItems((data as unknown as OrderItem[]) || []);
      }

      setEditModalOpen(false);
    } catch (err) {
      window.alert(t("orders.error_save"));
      console.error("submitEdit error:", err);
    } finally {
      setEditSaving(false);
    }
  };

  /* ── Pagination ───────────────────────────────────── */

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /* ── Status next step map ─────────────────────────── */

  const NEXT_STATUS: Record<string, string | null> = {
    // open removed: state machine requires open→confirmed first
    confirmed: "preparing",
    preparing: "ready",
    ready: "served",
    served: "closed",
  };

  /* ── Render ───────────────────────────────────────── */

  return (
    <div style={{ padding: 24, maxWidth: 1400, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Header */}
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
        <h1
          style={{
            color: "var(--text-primary)",
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
          }}
        >
          {t("orders.title")}
        </h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Date Range Filter */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 14px",
                color: dateRange === "all" ? "var(--text-secondary)" : "var(--accent)",
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Calendar size={14} />
              {t(DATE_RANGE_OPTIONS.find((d) => d.key === dateRange)?.label || "orders.date_all")}
              <ChevronDown size={12} />
            </button>

            {showDateDropdown && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 99 }}
                  onClick={() => setShowDateDropdown(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 4,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 6,
                    zIndex: 100,
                    minWidth: 180,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  {DATE_RANGE_OPTIONS.filter((d) => d.key !== "custom").map((d) => (
                    <button
                      key={d.key}
                      onClick={() => {
                        setDateRange(d.key);
                        setShowDateDropdown(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: dateRange === d.key ? "var(--accent)" : "transparent",
                        color: dateRange === d.key ? "#000" : "var(--text-secondary)",
                        fontSize: 13,
                        fontWeight: dateRange === d.key ? 600 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {t(d.label)}
                    </button>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                  <div style={{ padding: "6px 12px" }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      {t("orders.date_custom")}
                    </div>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        color: "var(--text-primary)",
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    />
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        color: "var(--text-primary)",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customDateFrom && customDateTo) {
                          setDateRange("custom");
                          setShowDateDropdown(false);
                        }
                      }}
                      disabled={!customDateFrom || !customDateTo}
                      style={{
                        width: "100%",
                        padding: "6px",
                        borderRadius: 6,
                        border: "none",
                        background: customDateFrom && customDateTo ? "var(--accent)" : "var(--border)",
                        color: customDateFrom && customDateTo ? "#000" : "var(--text-muted)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: customDateFrom && customDateTo ? "pointer" : "not-allowed",
                      }}
                    >
                      {t("orders.apply")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder={`${t("orders.order")} # / ${t("orders.table")}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 14px",
              color: "var(--text-primary)",
              fontSize: 14,
              width: 260,
              maxWidth: "100%",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
      </div>

      {/* Tab Filters */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {TAB_FILTERS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#000" : "var(--text-secondary)",
                backgroundColor: isActive ? "var(--accent)" : "var(--bg-card)",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {/* Content area: table + detail panel */}
      <div style={{ display: "flex", gap: 20 }} className="max-md:!flex-col">
        {/* Orders List */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Desktop Table */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
            className="max-md:!hidden"
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
                      t("orders.order") + " #",
                      t("orders.table"),
                      t("orders.type"),
                      t("orders.status"),
                      "Items",
                      t("orders.total"),
                      t("orders.created"),
                      t("orders.actions"),
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 500,
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        ...
                      </td>
                    </tr>
                  )}
                  {!loading && orders.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        {t("orders.no_orders")}
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    orders.map((order) => {
                      const isSelected = selectedOrder?.id === order.id;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => openDetail(order)}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                            backgroundColor: isSelected
                              ? "var(--accent-soft)"
                              : "transparent",
                            transition: "background-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.backgroundColor =
                                "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "var(--text-primary)",
                              fontWeight: 600,
                              fontFamily: "monospace",
                            }}
                          >
                            {order.order_number}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {order.restaurant_tables?.number || "---"}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {ORDER_TYPE_LABELS[order.order_type] || order.order_type || "---"}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <StatusBadge status={order.status} />
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "var(--text-secondary)",
                              textAlign: "center",
                            }}
                          >
                            {order.items_count}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(order.total)}
                          </td>
                          <td
                            style={{
                              padding: "12px 14px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {timeAgo(order.created_at)}
                          </td>
                          <td
                            style={{ padding: "12px 14px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <ActionBtn
                                label={t("orders.view")}
                                color="var(--info)"
                                onClick={() => openDetail(order)}
                              />
                              {canEditOrder(order) && (
                                <ActionBtn
                                  label={t("orders.edit")}
                                  color="var(--accent)"
                                  onClick={() => openEditModal(order)}
                                />
                              )}
                              {order.status !== "cancelled" &&
                                order.status !== "closed" &&
                                order.status !== "refunded" && (
                                  <ActionBtn
                                    label={t("orders.cancel")}
                                    color="var(--danger)"
                                    onClick={() => openCancelModal(order.id)}
                                  />
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

          {/* Mobile Cards */}
          <div className="md:!hidden" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                ...
              </div>
            )}
            {!loading && orders.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  background: "var(--bg-card)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                }}
              >
                {t("orders.no_orders")}
              </div>
            )}
            {!loading &&
              orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div key={order.id}>
                    <div
                      onClick={() => openDetail(order)}
                      style={{
                        background: isSelected
                          ? "var(--accent-soft)"
                          : "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 16,
                        cursor: "pointer",
                        transition: "background-color 0.15s",
                      }}
                    >
                      {/* Card header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 700,
                            fontSize: 16,
                            fontFamily: "monospace",
                          }}
                        >
                          #{order.order_number}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Card body */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ color: "var(--text-muted)" }}>
                          {t("orders.table")}:{" "}
                          <span style={{ color: "var(--text-secondary)" }}>
                            {order.restaurant_tables?.number || "---"}
                          </span>
                        </div>
                        <div style={{ color: "var(--text-muted)" }}>
                          {t("orders.type")}:{" "}
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              textTransform: "capitalize",
                            }}
                          >
                            {ORDER_TYPE_LABELS[order.order_type] || order.order_type || "---"}
                          </span>
                        </div>
                        <div style={{ color: "var(--text-muted)" }}>
                          Items:{" "}
                          <span style={{ color: "var(--text-secondary)" }}>
                            {order.items_count}
                          </span>
                        </div>
                        <div style={{ color: "var(--text-muted)" }}>
                          {t("orders.created")}:{" "}
                          <span style={{ color: "var(--text-secondary)" }}>
                            {timeAgo(order.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 12,
                          paddingTop: 10,
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 700,
                            fontSize: 18,
                          }}
                        >
                          {formatCurrency(order.total)}
                        </span>
                        <div
                          style={{ display: "flex", gap: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canEditOrder(order) && (
                            <ActionBtn
                              label={t("orders.edit")}
                              color="var(--accent)"
                              onClick={() => openEditModal(order)}
                            />
                          )}
                          {order.status !== "cancelled" &&
                            order.status !== "closed" &&
                            order.status !== "refunded" && (
                              <ActionBtn
                                label={t("orders.cancel")}
                                color="var(--danger)"
                                onClick={() => openCancelModal(order.id)}
                              />
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Inline detail for mobile */}
                    {isSelected && (
                      <MobileDetailPanel
                        order={order}
                        items={orderItems}
                        loading={detailLoading}
                        actionLoading={actionLoading}
                        t={t}
                        nextStatus={NEXT_STATUS}
                        onChangeStatus={changeStatus}
                        onCancel={openCancelModal}
                        onRefund={openRefundModal}
                        onClose={() => setSelectedOrder(null)}
                        onEditOrder={openEditModal}
                        onEditNotes={openNotesModal}
                        canEdit={canEditOrder(order)}
                      />
                    )}
                  </div>
                );
              })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                marginTop: 20,
              }}
            >
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: page === 0 ? "transparent" : "var(--bg-card)",
                  color:
                    page === 0
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                &larr;
              </button>
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                }}
              >
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background:
                    page >= totalPages - 1
                      ? "transparent"
                      : "var(--bg-card)",
                  color:
                    page >= totalPages - 1
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  cursor:
                    page >= totalPages - 1 ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Desktop Detail Panel (slide-out) */}
        {selectedOrder && (
          <div
            className="max-md:!hidden"
            style={{
              width: 400,
              flexShrink: 0,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
              alignSelf: "flex-start",
              position: "sticky",
              top: 24,
            }}
          >
            <DetailPanel
              order={selectedOrder}
              items={orderItems}
              loading={detailLoading}
              actionLoading={actionLoading}
              t={t}
              nextStatus={NEXT_STATUS}
              onChangeStatus={changeStatus}
              onCancel={openCancelModal}
              onRefund={openRefundModal}
              onClose={() => setSelectedOrder(null)}
              onEditOrder={openEditModal}
              onEditNotes={openNotesModal}
              canEdit={canEditOrder(selectedOrder)}
            />
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────── */}

      {/* Edit Order Modal */}
      {editModalOpen && editOrder && (
        <ModalOverlay onClose={() => setEditModalOpen(false)}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 600,
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("orders.edit_order")}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  #{editOrder.order_number}
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Add item search */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  {t("orders.add_item")}
                </div>
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Search size={14} style={{ color: "var(--text-muted)", position: "absolute", left: 10, pointerEvents: "none" }} />
                    <input
                      type="text"
                      placeholder={t("orders.search_menu")}
                      value={menuSearch}
                      onChange={(e) => handleMenuSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 32px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--text-primary)",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Search results dropdown */}
                  {menuResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        zIndex: 10,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      {menuResults.map((mi) => (
                        <button
                          key={mi.id}
                          onClick={() => addItemToEdit(mi)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "10px 14px",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--border)",
                            color: "var(--text-primary)",
                            fontSize: 13,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span>{ln(mi)}</span>
                          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                            {formatCurrency(mi.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {menuSearching && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        color: "var(--text-muted)",
                        fontSize: 13,
                      }}
                    >
                      ...
                    </div>
                  )}
                </div>
              </div>

              {/* Existing items */}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 8,
                }}
              >
                {t("orders.current_items")}
              </div>

              {editItems.map((item) => {
                const isRemoved = removedItemIds.includes(item.id);
                const qty = quantityChanges[item.id] ?? item.quantity;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                      opacity: isRemoved ? 0.35 : 1,
                      textDecoration: isRemoved ? "line-through" : "none",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }}>
                        {item.name}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {formatCurrency(item.unit_price)} {t("orders.each")}
                      </div>
                    </div>
                    {!isRemoved ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => changeExistingQuantity(item.id, qty - 1)}
                          disabled={qty <= 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--bg-secondary)",
                            color: qty <= 1 ? "var(--text-muted)" : "var(--text-primary)",
                            cursor: qty <= 1 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <span
                          style={{
                            color: "var(--accent)",
                            fontWeight: 600,
                            fontSize: 14,
                            minWidth: 24,
                            textAlign: "center",
                          }}
                        >
                          {qty}
                        </span>
                        <button
                          onClick={() => changeExistingQuantity(item.id, qty + 1)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={14} />
                        </button>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 13,
                            fontWeight: 500,
                            minWidth: 60,
                            textAlign: "right",
                          }}
                        >
                          {formatCurrency(item.unit_price * qty)}
                        </span>
                        <button
                          onClick={() => removeExistingItem(item.id)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--danger)",
                            background: "transparent",
                            color: "var(--danger)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => undoRemoveItem(item.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--info)",
                          background: "transparent",
                          color: "var(--info)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {t("orders.undo")}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Added items */}
              {addedItems.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--success)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 16,
                      marginBottom: 8,
                    }}
                  >
                    {t("orders.new_items")}
                  </div>
                  {addedItems.map((added) => (
                    <div
                      key={added.menuItem.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }}>
                          {ln(added.menuItem)}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {formatCurrency(added.menuItem.price)} {t("orders.each")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => changeAddedQuantity(added.menuItem.id, added.quantity - 1)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <span
                          style={{
                            color: "var(--success)",
                            fontWeight: 600,
                            fontSize: 14,
                            minWidth: 24,
                            textAlign: "center",
                          }}
                        >
                          {added.quantity}
                        </span>
                        <button
                          onClick={() => changeAddedQuantity(added.menuItem.id, added.quantity + 1)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={14} />
                        </button>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 13,
                            fontWeight: 500,
                            minWidth: 60,
                            textAlign: "right",
                          }}
                        >
                          {formatCurrency(added.menuItem.price * added.quantity)}
                        </span>
                        <button
                          onClick={() => removeAddedItem(added.menuItem.id)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--danger)",
                            background: "transparent",
                            color: "var(--danger)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* New totals preview */}
              <div style={{ marginTop: 16, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                {(() => {
                  const { subtotal, tax, total } = calculateEditTotals();
                  return (
                    <>
                      <TotalRow label={t("orders.subtotal")} value={formatCurrency(subtotal)} />
                      <TotalRow label={t("orders.tax")} value={formatCurrency(tax)} />
                      {(editOrder.discount_amount || 0) > 0 && (
                        <TotalRow
                          label={t("orders.discount")}
                          value={`-${formatCurrency(editOrder.discount_amount)}`}
                          color="var(--success)"
                        />
                      )}
                      {(editOrder.tip_amount || 0) > 0 && (
                        <TotalRow label={t("orders.tip")} value={formatCurrency(editOrder.tip_amount)} />
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: 8,
                          marginTop: 8,
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
                          {t("orders.new_total")}
                        </span>
                        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 16 }}>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 10,
              }}
            >
              <button
                onClick={() => setEditModalOpen(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("orders.close")}
              </button>
              <button
                onClick={submitEdit}
                disabled={editSaving}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: editSaving ? "not-allowed" : "pointer",
                  opacity: editSaving ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Save size={14} />
                {editSaving ? "..." : t("orders.save_changes")}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <ModalOverlay onClose={() => setCancelModalOpen(false)}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 420,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--danger)15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ban size={20} style={{ color: "var(--danger)" }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("orders.cancel_order")}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {t("orders.cancel_confirm")}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                {t("orders.cancel_reason")}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("orders.cancel_reason_placeholder")}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setCancelModalOpen(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("orders.go_back")}
              </button>
              <button
                onClick={submitCancel}
                disabled={cancelSaving}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--danger)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: cancelSaving ? "not-allowed" : "pointer",
                  opacity: cancelSaving ? 0.6 : 1,
                }}
              >
                {cancelSaving ? "..." : t("orders.confirm_cancel")}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Refund Order Modal */}
      {refundModalOpen && (
        <ModalOverlay onClose={() => setRefundModalOpen(false)}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 420,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--warning)15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RotateCcw size={20} style={{ color: "var(--warning)" }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("orders.refund_order")}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {t("orders.refund_confirm")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setRefundModalOpen(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("orders.go_back")}
              </button>
              <button
                onClick={submitRefund}
                disabled={refundSaving}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--warning)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: refundSaving ? "not-allowed" : "pointer",
                  opacity: refundSaving ? 0.6 : 1,
                }}
              >
                {refundSaving ? "..." : t("orders.confirm_refund")}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Order Notes Modal */}
      {notesModalOpen && (
        <ModalOverlay onClose={() => setNotesModalOpen(false)}>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 460,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--info)15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MessageSquare size={20} style={{ color: "var(--info)" }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                {t("orders.order_notes")}
              </div>
            </div>

            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder={t("orders.notes_placeholder")}
              rows={5}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: 13,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                marginBottom: 16,
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setNotesModalOpen(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("orders.close")}
              </button>
              <button
                onClick={submitNotes}
                disabled={notesSaving}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#000",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: notesSaving ? "not-allowed" : "pointer",
                  opacity: notesSaving ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Save size={14} />
                {notesSaving ? "..." : t("orders.save_notes")}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ── Sub-Components ──────────────────────────────────── */

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        backdropFilter: "blur(4px)",
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "var(--text-muted)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: `${color}20`,
        color: color,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function ActionBtn({
  label,
  color,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${color}40`,
        background: `${color}12`,
        color: color,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

/* ── Detail Panel (shared layout) ────────────────────── */

interface DetailPanelProps {
  order: Order;
  items: OrderItem[];
  loading: boolean;
  actionLoading: boolean;
  t: (key: string) => string;
  nextStatus: Record<string, string | null>;
  onChangeStatus: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onRefund: (id: string) => void;
  onClose: () => void;
  onEditOrder: (order: Order) => void;
  onEditNotes: (order: Order) => void;
  canEdit: boolean;
}

function DetailPanel({
  order,
  items,
  loading,
  actionLoading,
  t,
  nextStatus,
  onChangeStatus,
  onCancel,
  onRefund,
  onClose,
  onEditOrder,
  onEditNotes,
  canEdit,
}: DetailPanelProps) {
  const next = nextStatus[order.status] || null;
  const canCancel =
    order.status !== "cancelled" && order.status !== "closed" && order.status !== "refunded";
  const canRefund =
    order.payment_status === "paid" && order.status !== "cancelled" && order.status !== "refunded";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "monospace",
            }}
          >
            #{order.order_number}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {formatDate(order.created_at)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {canEdit && (
            <button
              onClick={() => onEditOrder(order)}
              style={{
                background: "none",
                border: "1px solid var(--accent)40",
                borderRadius: 6,
                cursor: "pointer",
                color: "var(--accent)",
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={t("orders.edit_order")}
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => onEditNotes(order)}
            style={{
              background: "none",
              border: "1px solid var(--info)40",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--info)",
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={t("orders.order_notes")}
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Status timeline */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {t("orders.status")}
          </span>
          <StatusBadge status={order.status} />
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {["open", "preparing", "ready", "served", "closed"].map(
            (s, i, arr) => {
              const idx = arr.indexOf(order.status);
              const isPast = i <= idx;
              const isCurrent = s === order.status;
              const color = isCurrent
                ? STATUS_COLORS[s] || "var(--text-muted)"
                : isPast
                ? "var(--success)"
                : "var(--text-muted)";
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isPast || isCurrent ? color : "var(--border)",
                      border: isCurrent
                        ? `2px solid ${color}`
                        : "2px solid transparent",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: isPast || isCurrent ? color : "var(--text-muted)",
                      fontWeight: isCurrent ? 600 : 400,
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </span>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        width: 16,
                        height: 1,
                        background: isPast ? "var(--success)" : "var(--border)",
                      }}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>
        {order.status === "cancelled" && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--danger)",
              fontWeight: 600,
            }}
          >
            {t("orders.cancelled").toUpperCase()}
          </div>
        )}
        {order.status === "cancelled" && order.notes && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            {t("orders.cancel_reason")}: {order.notes}
          </div>
        )}
        {order.status === "refunded" && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--warning)",
              fontWeight: 600,
            }}
          >
            {t("orders.refunded").toUpperCase()}
          </div>
        )}
      </div>

      {/* Order info */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontSize: 13,
        }}
      >
        <InfoRow label={t("orders.table")} value={order.restaurant_tables?.number || "---"} />
        <InfoRow
          label={t("orders.type")}
          value={ORDER_TYPE_LABELS[order.order_type] || order.order_type || "---"}
          capitalize
        />
        {order.customer_name && (
          <InfoRow label={t("orders.customer")} value={order.customer_name} />
        )}
        {order.payment_method && (
          <InfoRow label={t("orders.payment")} value={order.payment_method} capitalize />
        )}
        {order.payment_status && (
          <InfoRow label={t("orders.pay_status")} value={order.payment_status} capitalize />
        )}
      </div>

      {/* Order notes */}
      {order.notes && (
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {t("orders.notes")}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            {order.notes}
          </div>
        </div>
      )}

      {/* Items */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          maxHeight: 280,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 8,
          }}
        >
          Items ({items.length})
        </div>

        {loading && (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>...</div>
        )}

        {!loading &&
          items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                gap: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      fontSize: 13,
                      minWidth: 24,
                    }}
                  >
                    {item.quantity}x
                  </span>
                  <span
                    style={{
                      color: "var(--text-primary)",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                {!!item.modifiers && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginLeft: 32,
                      marginTop: 2,
                    }}
                  >
                    {String(item.modifiers)}
                  </div>
                )}
                {item.notes && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--warning)",
                      marginLeft: 32,
                      marginTop: 2,
                      fontStyle: "italic",
                    }}
                  >
                    {item.notes}
                  </div>
                )}
                {item.kds_status && (
                  <div style={{ marginLeft: 32, marginTop: 3 }}>
                    <StatusBadge status={item.kds_status} />
                  </div>
                )}
              </div>
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {formatCurrency(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
      </div>

      {/* Totals */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          fontSize: 13,
        }}
      >
        <TotalRow label={t("orders.subtotal")} value={formatCurrency(order.subtotal || 0)} />
        {(order.discount_amount || 0) > 0 && (
          <TotalRow
            label={t("orders.discount")}
            value={`-${formatCurrency(order.discount_amount)}`}
            color="var(--success)"
          />
        )}
        {(order.tax_amount || 0) > 0 && (
          <TotalRow label={t("orders.tax")} value={formatCurrency(order.tax_amount)} />
        )}
        {(order.tip_amount || 0) > 0 && (
          <TotalRow label={t("orders.tip")} value={formatCurrency(order.tip_amount)} />
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 8,
            marginTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {t("orders.total")}
          </span>
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {next && (
          <button
            onClick={() => onChangeStatus(order.id, next)}
            disabled={actionLoading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#000",
              fontSize: 14,
              fontWeight: 700,
              cursor: actionLoading ? "not-allowed" : "pointer",
              opacity: actionLoading ? 0.6 : 1,
              textTransform: "capitalize",
            }}
          >
            &rarr; {next}
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {canCancel && (
            <button
              onClick={() => onCancel(order.id)}
              disabled={actionLoading}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 8,
                border: "1px solid var(--danger)",
                background: "var(--danger)12",
                color: "var(--danger)",
                fontSize: 13,
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ban size={14} />
              {t("orders.cancel")}
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => onRefund(order.id)}
              disabled={actionLoading}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: 8,
                border: "1px solid var(--warning)",
                background: "var(--warning)12",
                color: "var(--warning)",
                fontSize: 13,
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <RotateCcw size={14} />
              {t("orders.refund")}
            </button>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => onEditOrder(order)}
            disabled={actionLoading}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--accent)12",
              color: "var(--accent)",
              fontSize: 13,
              fontWeight: 600,
              cursor: actionLoading ? "not-allowed" : "pointer",
              opacity: actionLoading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Pencil size={14} />
            {t("orders.edit_order")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Mobile Detail Panel (inline expand) ─────────────── */

function MobileDetailPanel(props: DetailPanelProps) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        marginTop: -1,
      }}
    >
      <DetailPanel {...props} />
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */

function InfoRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          fontWeight: 500,
          textTransform: capitalize ? "capitalize" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "3px 0",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: color || "var(--text-secondary)", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}
