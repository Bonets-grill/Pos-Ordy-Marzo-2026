"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Minus, Trash2, X, CheckCircle, Split, Clock, ChevronDown, Users, ListChecks, UtensilsCrossed, ShoppingBag, Truck, ArrowLeft, AlertTriangle, DollarSign, Maximize, Minimize } from "lucide-react";
import PosLoyaltyPanel from "@/components/loyalty/PosLoyaltyPanel";
import ReceiptModal from "@/components/receipt/ReceiptModal";

/* ── Types ─────────────────────────────────────────────── */

interface Category {
  id: string;
  name_es: string;
  name_en?: string; name_fr?: string; name_de?: string; name_it?: string;
  sort_order: number;
}

interface MenuItem {
  id: string;
  name_es: string;
  name_en?: string; name_fr?: string; name_de?: string; name_it?: string;
  price: number;
  category_id: string;
}

interface PosZone {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Table {
  id: string;
  number: string;
  zone_id: string | null;
  shape: "square" | "round" | "rectangle";
  status: "available" | "occupied" | "reserved" | "cleaning";
  capacity: number;
  pos_x: number;
  pos_y: number;
  scale: number;
}

interface SelectedModifier {
  name: string;
  price_delta: number;
}

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  notes: string;
  modifiers: SelectedModifier[];
  modifiersTotal: number;
}

interface ModifierGroup {
  id: string;
  name_es: string;
  name_en: string;
  name_fr?: string; name_de?: string; name_it?: string;
  min_select: number;
  max_select: number;
  required: boolean;
  sort_order: number;
  options: ModifierOption[];
}

interface ModifierOption {
  id: string;
  name_es: string;
  name_en: string;
  name_fr?: string; name_de?: string; name_it?: string;
  price_delta: number;
  sort_order: number;
}

interface RecentOrder {
  id: string;
  order_number: number;
  total: number;
  created_at: string;
  status: string;
  items: { name: string; quantity: number; unit_price: number; modifiers: SelectedModifier[] | null }[];
}

type OrderType = "dine_in" | "takeaway" | "delivery";
type SplitType = "equal" | "by_item";

/* ── Component ─────────────────────────────────────────── */

export default function PosPage() {
  const { t, lang } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ln = (item: any) => item[`name_${lang}`] || item.name_es || "";
  const supabase = useMemo(() => createClient(), []);

  /* ── Data state ──────────────────────────────────────── */
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<PosZone[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── UI state ────────────────────────────────────────── */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [orderModeSelected, setOrderModeSelected] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderModes, setOrderModes] = useState<{ dine_in: boolean; takeaway: boolean; delivery: boolean }>({ dine_in: true, takeaway: true, delivery: true });
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  /* ── Loyalty state ─────────────────────────────────────── */
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<{ id: string; name: string; points: number } | null>(null);
  const [loyaltyReward, setLoyaltyReward] = useState<{ id: string; title: string; type: string; discount_amount?: number; discount_percent?: number } | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);

  /* ── Modifier modal state ──────────────────────────────── */
  const [modifierModalItem, setModifierModalItem] = useState<MenuItem | null>(null);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [modifierSelections, setModifierSelections] = useState<Record<string, string[]>>({});
  const [loadingModifiers, setLoadingModifiers] = useState(false);

  /* ── Split bill state ──────────────────────────────────── */
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [splitAssignments, setSplitAssignments] = useState<Record<string, number>>({});
  const [splitPaidBills, setSplitPaidBills] = useState<Set<number>>(new Set());
  const [splitSending, setSplitSending] = useState(false);

  /* ── Payment modal state ──────────────────────────────── */
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "mixed">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [mixedCashAmount, setMixedCashAmount] = useState("");
  const [mixedCardAmount, setMixedCardAmount] = useState("");
  const [customTipInput, setCustomTipInput] = useState("");
  const [modalDiscount, setModalDiscount] = useState("");

  /* ── Existing order for occupied table ─────────────────── */
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [originalCartSnapshot, setOriginalCartSnapshot] = useState<string>("");
  const [originalItemIds, setOriginalItemIds] = useState<Set<string>>(new Set());

  /* ── Receipt modal state ──────────────────────────────── */
  const [receiptData, setReceiptData] = useState<{ order: any; items: any[]; tenantName: string; receiptConfig?: any } | null>(null);

  /* ── Cash shift & business hours guard ─────────────────── */
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null); // null = loading
  const [isWithinHours, setIsWithinHours] = useState<boolean | null>(null);
  const [guardChecked, setGuardChecked] = useState(false);

  /* ── Recent orders state ───────────────────────────────── */
  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<RecentOrder | null>(null);
  const recentRef = useRef<HTMLDivElement>(null);

  /* ── WhatsApp pending orders state ──────────────────────── */
  const [showWaOrders, setShowWaOrders] = useState(false);
  const [waOrders, setWaOrders] = useState<RecentOrder[]>([]);
  const [loadingWa, setLoadingWa] = useState(false);
  const [waCount, setWaCount] = useState(0);
  const waRef = useRef<HTMLDivElement>(null);
  const tenantNameRef = useRef("Restaurant");
  const receiptConfigRef = useRef<any>(null);
  const currencyRef = useRef("EUR");
  const payingRef = useRef(false);

  /* ── Close recent dropdown on outside click ────────────── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (recentRef.current && !recentRef.current.contains(e.target as Node)) {
        setShowRecentOrders(false);
      }
    }
    if (showRecentOrders) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showRecentOrders]);

  /* ── Close WA dropdown on outside click ────────────────── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (waRef.current && !waRef.current.contains(e.target as Node)) {
        setShowWaOrders(false);
      }
    }
    if (showWaOrders) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showWaOrders]);

  /* ── Load initial data ───────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const { data: profile } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile?.tenant_id) return;

        const tid = profile.tenant_id;
        setTenantId(tid);

        // Fetch tenant tax_rate + settings + name + receipt_config + business_hours
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name, tax_rate, tax_included, settings, receipt_config, currency, business_hours")
          .eq("id", tid)
          .single();

        if (tenant?.name) tenantNameRef.current = tenant.name;
        if (tenant?.receipt_config) receiptConfigRef.current = tenant.receipt_config;
        if (tenant?.currency) currencyRef.current = tenant.currency;
        if (tenant?.tax_rate) setTaxRate(tenant.tax_rate);
        if (tenant?.tax_included !== undefined) setTaxIncluded(tenant.tax_included);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = tenant?.settings as any;
        if (s?.order_modes) {
          setOrderModes({
            dine_in: s.order_modes.dine_in !== false,
            takeaway: s.order_modes.takeaway !== false,
            delivery: s.order_modes.delivery !== false,
          });
        }

        // Check loyalty enabled
        const { data: loyaltySettings } = await supabase
          .from("loyalty_settings")
          .select("enabled")
          .eq("tenant_id", tid)
          .maybeSingle();
        if (loyaltySettings?.enabled) setLoyaltyEnabled(true);

        // ── Guard: Check if cash shift is open ──
        const { data: openShift } = await supabase
          .from("cash_shifts")
          .select("id")
          .eq("tenant_id", tid)
          .eq("status", "open")
          .limit(1)
          .maybeSingle();
        setShiftOpen(!!openShift);

        // ── Guard: Check business hours ──
        const bh = tenant?.business_hours as Record<string, { open: string; close: string; open2?: string; close2?: string; split?: boolean; closed?: boolean }> | null;
        if (bh) {
          const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          const now = new Date();
          const dayKey = days[now.getDay()];
          const todayHours = bh[dayKey];
          if (todayHours && !todayHours.closed && todayHours.open && todayHours.close) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();

            // Check shift 1
            const [openH, openM] = todayHours.open.split(":").map(Number);
            const [closeH, closeM] = todayHours.close.split(":").map(Number);
            const openMin = openH * 60 + openM;
            const closeMin = closeH * 60 + closeM;
            let inShift1 = false;
            if (closeMin < openMin) {
              inShift1 = nowMinutes >= openMin || nowMinutes <= closeMin;
            } else {
              inShift1 = nowMinutes >= openMin && nowMinutes <= closeMin;
            }

            // Check shift 2 (if double shift enabled)
            let inShift2 = false;
            if (todayHours.split && todayHours.open2 && todayHours.close2) {
              const [o2H, o2M] = todayHours.open2.split(":").map(Number);
              const [c2H, c2M] = todayHours.close2.split(":").map(Number);
              const o2Min = o2H * 60 + o2M;
              const c2Min = c2H * 60 + c2M;
              if (c2Min < o2Min) {
                inShift2 = nowMinutes >= o2Min || nowMinutes <= c2Min;
              } else {
                inShift2 = nowMinutes >= o2Min && nowMinutes <= c2Min;
              }
            }

            setIsWithinHours(inShift1 || inShift2);
          } else if (todayHours?.closed) {
            setIsWithinHours(false);
          } else {
            setIsWithinHours(true); // No hours set for this day = always open
          }
        } else {
          setIsWithinHours(true); // No business hours configured = always open
        }
        setGuardChecked(true);

        // Parallel fetches
        const [catRes, itemsRes, tablesRes, zonesRes] = await Promise.all([
          supabase
            .from("menu_categories")
            .select("id, name_es, name_en, name_fr, name_de, name_it, sort_order")
            .eq("tenant_id", tid)
            .eq("active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("menu_items")
            .select("id, name_es, name_en, name_fr, name_de, name_it, price, category_id")
            .eq("tenant_id", tid)
            .eq("active", true)
            .eq("available", true)
            .order("name_es", { ascending: true }),
          supabase
            .from("restaurant_tables")
            .select("id, number, zone_id, shape, status, capacity, pos_x, pos_y, scale")
            .eq("tenant_id", tid)
            .order("number", { ascending: true }),
          supabase
            .from("zones")
            .select("id, name, color, position")
            .eq("tenant_id", tid)
            .order("position", { ascending: true }),
        ]);

        if (catRes.data) setCategories(catRes.data);
        if (itemsRes.data) setMenuItems(itemsRes.data);
        if (tablesRes.data) setTables(tablesRes.data);
        if (zonesRes.data) setZones(zonesRes.data);
      } catch (err) {
        console.error("POS load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  // Realtime — update table status instantly when changed
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("pos-tables-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurant_tables" },
        (payload) => {
          setTables((prev) =>
            prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, supabase]);

  /* ── Filtered products ───────────────────────────────── */
  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (selectedCategory) {
      items = items.filter((i) => i.category_id === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => ln(i).toLowerCase().includes(q) || i.name_es.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, selectedCategory, search]);

  const cartChanged = useMemo(() => {
    if (!existingOrderId) return true; // new order — always allow send
    const current = JSON.stringify(cart.map((c) => `${c.name}:${c.qty}:${c.modifiersTotal}`).sort());
    return current !== originalCartSnapshot;
  }, [cart, existingOrderId, originalCartSnapshot]);

  /* ── Fetch modifier groups for an item ─────────────────── */
  const fetchModifiers = useCallback(
    async (itemId: string): Promise<ModifierGroup[]> => {
      if (!tenantId) return [];
      // Get group IDs linked to this item
      const { data: links } = await supabase
        .from("menu_item_modifier_groups")
        .select("group_id")
        .eq("item_id", itemId);

      if (!links || links.length === 0) return [];

      const groupIds = links.map((l: { group_id: string }) => l.group_id);

      // Fetch groups
      const { data: groups } = await supabase
        .from("modifier_groups")
        .select("id, name_es, name_en, name_fr, name_de, name_it, min_select, max_select, required, sort_order")
        .in("id", groupIds)
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (!groups || groups.length === 0) return [];

      // Fetch all options for these groups
      const { data: options } = await supabase
        .from("modifiers")
        .select("id, group_id, name_es, name_en, name_fr, name_de, name_it, price_delta, sort_order")
        .in("group_id", groupIds)
        .eq("active", true)
        .order("sort_order", { ascending: true });

      // Merge options into groups
      return groups.map((g: { id: string; name_es: string; name_en: string; name_fr?: string; name_de?: string; name_it?: string; min_select: number; max_select: number; required: boolean; sort_order: number }) => ({
        ...g,
        options: (options || []).filter((o: { group_id: string }) => o.group_id === g.id),
      }));
    },
    [supabase, tenantId]
  );

  /* ── Cart helpers ────────────────────────────────────── */
  const addToCart = useCallback(
    async (item: MenuItem) => {
      // Check if item has modifier groups
      setLoadingModifiers(true);
      try {
        const groups = await fetchModifiers(item.id);
        if (groups.length > 0) {
          // Show modifier modal
          setModifierModalItem(item);
          setModifierGroups(groups);
          // Initialize selections
          const init: Record<string, string[]> = {};
          groups.forEach((g) => { init[g.id] = []; });
          setModifierSelections(init);
          return;
        }
      } catch {
        // If fetch fails, just add without modifiers
      } finally {
        setLoadingModifiers(false);
      }

      // No modifiers — add directly
      addItemDirectly(item, [], 0);
    },
    [fetchModifiers]
  );

  const addItemDirectly = useCallback(
    (item: MenuItem, mods: SelectedModifier[], modsTotal: number) => {
      setCart((prev) => {
        // Only merge if no modifiers and no notes
        if (mods.length === 0) {
          const existing = prev.find((c) => c.menuItemId === item.id && !c.notes && c.modifiers.length === 0);
          if (existing) {
            return prev.map((c) =>
              c.id === existing.id ? { ...c, qty: c.qty + 1 } : c
            );
          }
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            menuItemId: item.id,
            name: item.name_es,
            price: item.price + modsTotal,
            qty: 1,
            notes: "",
            modifiers: mods,
            modifiersTotal: modsTotal,
          },
        ];
      });
    },
    []
  );

  const confirmModifiers = useCallback(() => {
    if (!modifierModalItem) return;
    // Validate required groups
    for (const g of modifierGroups) {
      const selected = modifierSelections[g.id] || [];
      if (g.required && selected.length < Math.max(1, g.min_select)) {
        return; // don't close modal if required group not satisfied
      }
    }

    // Build selected modifiers list
    const mods: SelectedModifier[] = [];
    let modsTotal = 0;
    for (const g of modifierGroups) {
      const selectedIds = modifierSelections[g.id] || [];
      for (const optId of selectedIds) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) {
          const delta = Number(opt.price_delta) || 0;
          mods.push({ name: opt.name_es, price_delta: delta });
          modsTotal += delta;
        }
      }
    }

    addItemDirectly(modifierModalItem, mods, modsTotal);
    setModifierModalItem(null);
    setModifierGroups([]);
    setModifierSelections({});
  }, [modifierModalItem, modifierGroups, modifierSelections, addItemDirectly]);

  const handleModifierToggle = useCallback(
    (groupId: string, optionId: string, isSingle: boolean) => {
      setModifierSelections((prev) => {
        const current = prev[groupId] || [];
        if (isSingle) {
          // Radio behavior: toggle off if already selected, otherwise select
          return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
        }
        // Checkbox behavior
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        }
        // Check max_select
        const group = modifierGroups.find((g) => g.id === groupId);
        if (group && current.length >= group.max_select) {
          return prev; // at max
        }
        return { ...prev, [groupId]: [...current, optionId] };
      });
    },
    [modifierGroups]
  );

  const updateQty = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === cartId ? { ...c, qty: Math.max(0, c.qty + delta) } : c
        )
        .filter((c) => c.qty > 0)
    );
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartId));
  }, []);

  const updateNote = useCallback((cartId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.id === cartId ? { ...c, notes } : c))
    );
  }, []);

  /* ── Totals ──────────────────────────────────────────── */
  const subtotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.price * c.qty, 0),
    [cart]
  );
  const taxAmount = useMemo(
    () => taxIncluded
      ? Math.round((subtotal - subtotal / (1 + taxRate / 100)) * 100) / 100
      : Math.round(subtotal * (taxRate / 100) * 100) / 100,
    [subtotal, taxRate, taxIncluded]
  );
  const loyaltyDiscount = useMemo(() => {
    if (!loyaltyReward) return 0;
    if (loyaltyReward.type === "discount_fixed" && loyaltyReward.discount_amount)
      return loyaltyReward.discount_amount;
    if (loyaltyReward.type === "discount_percent" && loyaltyReward.discount_percent)
      return subtotal * (loyaltyReward.discount_percent / 100);
    return 0;
  }, [loyaltyReward, subtotal]);

  const total = useMemo(
    () => taxIncluded
      ? Math.max(0, subtotal - discount - loyaltyDiscount + tip)
      : Math.max(0, subtotal + taxAmount - discount - loyaltyDiscount + tip),
    [subtotal, taxAmount, taxIncluded, discount, loyaltyDiscount, tip]
  );

  /* ── Show toast ──────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Build order items for insert ──────────────────────── */
  const buildOrderItems = useCallback(
    (orderId: string, items: CartItem[]) =>
      items.map((c) => ({
        order_id: orderId,
        tenant_id: tenantId!,
        menu_item_id: c.menuItemId,
        name: c.name,
        quantity: c.qty,
        unit_price: c.price,
        subtotal: c.price * c.qty,
        notes: c.notes || null,
        modifiers: c.modifiers.length > 0 ? c.modifiers : [],
        modifiers_total: c.modifiersTotal,
      })),
    [tenantId]
  );

  /* ── Reset cart after order ────────────────────────────── */
  const resetCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setTip(0);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setSelectedTable("");
    setLoyaltyCustomer(null);
    setLoyaltyReward(null);
    setExistingOrderId(null);
    setOriginalItemIds(new Set());
    setOriginalCartSnapshot("");
    setOrderModeSelected(false);
  }, []);

  /* ── Load existing order for occupied table ──────────── */
  const loadTableOrder = useCallback(async (tableId: string) => {
    if (!tenantId) return;
    setSelectedTable(tableId); // always confirm table selection
    // Find active order for this table
    const { data: order } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, tip_amount, discount_amount, status")
      .eq("table_id", tableId)
      .in("status", ["confirmed", "preparing", "ready", "served"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order) {
      // No active order — treat as new order on this table
      setExistingOrderId(null);
      return;
    }

    setExistingOrderId(order.id);
    if (order.customer_name) setCustomerName(order.customer_name);
    if (order.customer_phone) setCustomerPhone(order.customer_phone);
    if (order.tip_amount) setTip(order.tip_amount);
    if (order.discount_amount) setDiscount(order.discount_amount);

    // Load order items into cart
    const { data: items } = await supabase
      .from("order_items")
      .select("id, name, quantity, unit_price, modifiers, notes")
      .eq("order_id", order.id);

    if (items && items.length > 0) {
      const cartItems: CartItem[] = items.map((it) => {
        const mods: SelectedModifier[] = Array.isArray(it.modifiers) ? it.modifiers : [];
        const modsTotal = mods.reduce((sum, m) => sum + (m.price_delta || 0), 0);
        return {
          id: it.id,
          menuItemId: it.id,
          name: it.name,
          price: it.unit_price,
          qty: it.quantity,
          notes: it.notes || "",
          modifiers: mods,
          modifiersTotal: modsTotal,
        };
      });
      setCart(cartItems);
      setOriginalItemIds(new Set(cartItems.map((c) => c.id)));
      setOriginalCartSnapshot(JSON.stringify(cartItems.map((c) => `${c.name}:${c.qty}:${c.modifiersTotal}`).sort()));
    } else {
      setOriginalItemIds(new Set());
      setOriginalCartSnapshot("");
    }
  }, [tenantId, supabase]);

  /* ── Send to kitchen ─────────────────────────────────── */
  const sendToKitchen = useCallback(async () => {
    if (!tenantId || !userId || cart.length === 0) return;
    if (payingRef.current) return;
    payingRef.current = true;
    setSending(true);

    try {
      let orderId = existingOrderId;

      if (existingOrderId) {
        // Update existing order totals
        await supabase
          .from("orders")
          .update({
            subtotal,
            tax_amount: taxAmount,
            discount_amount: discount + loyaltyDiscount,
            tip_amount: tip,
            total,
            status: "confirmed",
            customer_name: loyaltyCustomer?.name || customerName || null,
            customer_phone: customerPhone || null,
          })
          .eq("id", existingOrderId);

        // Only insert NEW items (not already in DB)
        const newItems = cart.filter((c) => !originalItemIds.has(c.id));
        if (newItems.length > 0) {
          const orderItems = buildOrderItems(existingOrderId, newItems);
          const { error: itemsErr } = await supabase
            .from("order_items")
            .insert(orderItems);
          if (itemsErr) console.error("Order items insert error:", itemsErr);
        }

        // Update quantity of existing items that changed
        const existingItems = cart.filter((c) => originalItemIds.has(c.id));
        for (const item of existingItems) {
          await supabase
            .from("order_items")
            .update({ quantity: item.qty, subtotal: item.price * item.qty, kds_status: "pending" })
            .eq("id", item.id);
        }
      } else {
        // Create new order via API (validated, audited, idempotent)
        const kitchenRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_type: orderType,
            table_id: orderType === "dine_in" && selectedTable ? selectedTable : null,
            customer_name: loyaltyCustomer?.name || customerName || null,
            customer_phone: customerPhone || null,
            loyalty_customer_id: loyaltyCustomer?.id || null,
            loyalty_reward_applied: loyaltyReward?.title || null,
            discount_amount: discount + loyaltyDiscount,
            tip_amount: tip,
            delivery_address: deliveryAddress || null,
            items: cart.map((c) => ({
              menu_item_id: c.menuItemId,
              name: c.name,
              quantity: c.qty,
              unit_price: c.price,
              modifiers: c.modifiers || [],
              modifiers_total: c.modifiers?.reduce((s: number, m: { price_delta?: number }) => s + (m.price_delta || 0), 0) || 0,
              notes: c.notes || null,
              kds_station: c.kds_station || null,
            })),
          }),
        });

        if (!kitchenRes.ok) {
          const errData = await kitchenRes.json().catch(() => ({}));
          console.error("Order API error:", errData);
          setSending(false);
          return;
        }

        const kitchenData = await kitchenRes.json();
        orderId = kitchenData.order_id;
      }

      // Earn loyalty points if customer is linked
      if (loyaltyCustomer?.id && orderId) {
        await supabase.rpc("loyalty_earn_points", {
          p_tenant_id: tenantId,
          p_customer_id: loyaltyCustomer.id,
          p_order_id: orderId,
          p_order_subtotal: subtotal,
          p_source: "pos",
        });
      }

      resetCart();
      setExistingOrderId(null);
      showToast(t("pos.order_sent"));
    } catch (err) {
      console.error("Send to kitchen error:", err);
    } finally {
      payingRef.current = false;
      setSending(false);
    }
  }, [
    tenantId,
    userId,
    cart,
    orderType,
    selectedTable,
    customerName,
    subtotal,
    taxAmount,
    discount,
    tip,
    total,
    supabase,
    showToast,
    t,
    buildOrderItems,
    resetCart,
    loyaltyCustomer,
    loyaltyReward,
    loyaltyDiscount,
    customerPhone,
    deliveryAddress,
    existingOrderId,
    originalItemIds,
  ]);

  /* ── Pay ─────────────────────────────────────────────── */
  const handlePay = useCallback(async () => {
    if (!tenantId || !userId || cart.length === 0) return;
    if (payingRef.current) return;
    payingRef.current = true;
    setSending(true);

    try {
      let orderId = existingOrderId;
      let orderNumber: number | null = null;

      if (existingOrderId) {
        // Update existing order → closed + paid
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            subtotal,
            tax_amount: taxAmount,
            discount_amount: discount + loyaltyDiscount,
            tip_amount: tip,
            total,
            status: "closed",
            payment_status: "paid",
            customer_name: loyaltyCustomer?.name || customerName || null,
            customer_phone: customerPhone || null,
          })
          .eq("id", existingOrderId);

        if (updateErr) {
          console.error("Order update error:", updateErr);
          setSending(false);
          return;
        }

        // Fetch order_number for receipt
        const { data: existingOrderData } = await supabase
          .from("orders")
          .select("order_number")
          .eq("id", existingOrderId)
          .single();
        orderNumber = existingOrderData?.order_number || null;

        // Insert new items if any were added
        const newItems = cart.filter((c) => !originalItemIds.has(c.id));
        if (newItems.length > 0) {
          const orderItems = buildOrderItems(existingOrderId, newItems);
          await supabase.from("order_items").insert(orderItems);
        }
      } else {
        // Create order via API then pay+close
        const payOrderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_type: orderType,
            table_id: orderType === "dine_in" && selectedTable ? selectedTable : null,
            customer_name: loyaltyCustomer?.name || customerName || null,
            customer_phone: customerPhone || null,
            loyalty_customer_id: loyaltyCustomer?.id || null,
            loyalty_reward_applied: loyaltyReward?.title || null,
            discount_amount: discount + loyaltyDiscount,
            tip_amount: tip,
            delivery_address: deliveryAddress || null,
            items: cart.map((c) => ({
              menu_item_id: c.menuItemId,
              name: c.name,
              quantity: c.qty,
              unit_price: c.price,
              modifiers: c.modifiers || [],
              modifiers_total: c.modifiers?.reduce((s: number, m: { price_delta?: number }) => s + (m.price_delta || 0), 0) || 0,
              notes: c.notes || null,
              kds_station: c.kds_station || null,
            })),
          }),
        });

        if (!payOrderRes.ok) {
          const errData = await payOrderRes.json().catch(() => ({}));
          console.error("Order API error:", errData);
          setSending(false);
          return;
        }

        const payOrderData = await payOrderRes.json();
        orderId = payOrderData.order_id;
        orderNumber = payOrderData.order_number;
      }

      // Register payment via API (validates duplicates + amount)
      if (orderId) {
        if (payMethod === "mixed") {
          const cashAmt = parseFloat(mixedCashAmount) || 0;
          const cardAmt = parseFloat(mixedCardAmount) || 0;
          const mixedSum = Math.round((cashAmt + cardAmt) * 100) / 100;
          const expectedTotal = Math.round(total * 100) / 100;
          if (Math.abs(mixedSum - expectedTotal) > 0.01) {
            console.error(`[POS] Mixed payment mismatch: ${cashAmt}+${cardAmt}=${mixedSum}, expected ${expectedTotal}`);
            setSending(false);
            return;
          }
          // Pay cash portion
          await fetch("/api/orders/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderId, method: "cash", amount: cashAmt, tip_amount: 0, auto_close: false }),
          });
          // Pay card portion + close
          await fetch("/api/orders/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderId, method: "card", amount: cardAmt, tip_amount: tip, auto_close: true }),
          });
        } else {
          await fetch("/api/orders/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderId, method: payMethod, amount: total, tip_amount: tip, auto_close: true }),
          });
        }
      }

      // Earn loyalty points if customer is linked
      if (loyaltyCustomer?.id && orderId) {
        await supabase.rpc("loyalty_earn_points", {
          p_tenant_id: tenantId,
          p_customer_id: loyaltyCustomer.id,
          p_order_id: orderId,
          p_order_subtotal: subtotal,
          p_source: "pos",
        });
      }

      // Show receipt
      const selectedTableObj = tables.find((t: any) => t.id === selectedTable);
      setReceiptData({
        order: {
          id: orderId,
          order_number: orderNumber || 0,
          order_type: orderType,
          status: "closed",
          customer_name: loyaltyCustomer?.name || customerName || undefined,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discount + loyaltyDiscount,
          tip_amount: tip,
          total,
          payment_method: payMethod,
          created_at: new Date().toISOString(),
          restaurant_tables: selectedTableObj ? { number: selectedTableObj.number } : undefined,
        },
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.qty,
          unit_price: c.price,
          subtotal: c.price * c.qty,
          modifiers: c.modifiers?.map((m) => ({ name: m.name, price_delta: m.price_delta || 0 })),
          notes: c.notes,
        })),
        tenantName: tenantNameRef.current,
        receiptConfig: receiptConfigRef.current,
      });

      resetCart();
      setExistingOrderId(null);
      setOriginalItemIds(new Set());
      showToast(t("pos.payment_success"));
    } catch (err) {
      console.error("Pay error:", err);
    } finally {
      payingRef.current = false;
      setSending(false);
    }
  }, [
    tenantId,
    userId,
    cart,
    orderType,
    selectedTable,
    customerName,
    subtotal,
    taxAmount,
    discount,
    tip,
    total,
    supabase,
    showToast,
    t,
    buildOrderItems,
    resetCart,
    loyaltyCustomer,
    loyaltyReward,
    loyaltyDiscount,
    customerPhone,
    deliveryAddress,
    existingOrderId,
    originalItemIds,
    payMethod,
    mixedCashAmount,
    mixedCardAmount,
  ]);

  /* ── Split Bill Logic ──────────────────────────────────── */
  const openSplitModal = useCallback(() => {
    setSplitType("equal");
    setSplitCount(2);
    const assignments: Record<string, number> = {};
    cart.forEach((c) => { assignments[c.id] = 1; });
    setSplitAssignments(assignments);
    setSplitPaidBills(new Set());
    setShowSplitModal(true);
  }, [cart]);

  const splitBills = useMemo(() => {
    if (splitType === "equal") {
      const perPerson = total / splitCount;
      return Array.from({ length: splitCount }, (_, i) => ({
        billNumber: i + 1,
        items: cart,
        total: Math.round(perPerson * 100) / 100,
      }));
    }
    // By item
    const billMap: Record<number, CartItem[]> = {};
    let maxBill = 1;
    cart.forEach((c) => {
      const bn = splitAssignments[c.id] || 1;
      if (bn > maxBill) maxBill = bn;
      if (!billMap[bn]) billMap[bn] = [];
      billMap[bn].push(c);
    });
    return Array.from({ length: maxBill }, (_, i) => {
      const items = billMap[i + 1] || [];
      const billSubtotal = items.reduce((s, c) => s + c.price * c.qty, 0);
      const billTax = billSubtotal * (taxRate / 100);
      return {
        billNumber: i + 1,
        items,
        total: Math.max(0, billSubtotal + billTax),
      };
    });
  }, [splitType, splitCount, total, cart, splitAssignments, taxRate]);

  const handlePaySplit = useCallback(
    async (billNumber: number) => {
      if (!tenantId || !userId) return;
      if (payingRef.current) return;
      payingRef.current = true;
      setSplitSending(true);
      try {
        const bill = splitBills.find((b) => b.billNumber === billNumber);
        if (!bill) return;

        // SAFETY FIX: Distribute tax proportionally across splits
        const splitTaxAmount = splitBills.length > 0
          ? (billNumber === splitBills.length
            ? Math.round((taxAmount - Math.floor((taxAmount * 100) / splitBills.length) / 100 * (splitBills.length - 1)) * 100) / 100
            : Math.floor((taxAmount * 100) / splitBills.length) / 100)
          : 0;
        const splitDiscount = splitBills.length > 0
          ? Math.round((discount / splitBills.length) * 100) / 100
          : 0;

        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            tenant_id: tenantId,
            table_id: orderType === "dine_in" && selectedTable ? selectedTable : null,
            order_type: orderType,
            customer_name: loyaltyCustomer?.name || customerName || null,
            customer_phone: customerPhone || null,
            subtotal: bill.total,
            tax_amount: splitTaxAmount,
            discount_amount: splitDiscount,
            tip_amount: 0,
            total: Math.round((bill.total + splitTaxAmount - splitDiscount) * 100) / 100,
            status: "closed",
            payment_status: "paid",
            source: orderType === "delivery" ? "delivery" : orderType === "takeaway" ? "takeaway" : "pos",
            metadata: deliveryAddress ? { delivery_address: deliveryAddress, split_bill: billNumber } : { split_bill: billNumber },
            received_by: userId,
          })
          .select("id")
          .single();

        if (orderErr || !order) {
          console.error("Split order insert error:", orderErr);
          return;
        }

        if (splitType === "equal") {
          // SAFETY FIX: Only insert items that belong to this split (round-robin distribution)
          const splitItems = cart.filter((_c, idx) => idx % splitBills.length === (billNumber - 1));
          const orderItems = splitItems.map((c) => ({
            order_id: order.id,
            tenant_id: tenantId,
            menu_item_id: c.menuItemId,
            name: c.name,
            quantity: c.qty,
            unit_price: c.price,
            subtotal: c.price * c.qty,
            notes: c.notes || null,
            modifiers: c.modifiers.length > 0 ? c.modifiers : [],
            modifiers_total: c.modifiersTotal,
          }));
          if (orderItems.length > 0) {
            await supabase.from("order_items").insert(orderItems);
          }
        } else {
          // Insert only items assigned to this bill
          const billItems = buildOrderItems(order.id, bill.items);
          if (billItems.length > 0) {
            await supabase.from("order_items").insert(billItems);
          }
        }

        const newPaid = new Set(splitPaidBills);
        newPaid.add(billNumber);
        setSplitPaidBills(newPaid);

        // Check if all bills are paid
        if (newPaid.size === splitBills.length) {
          // Free table
          if (selectedTable) {
            await supabase
              .from("restaurant_tables")
              .update({ status: "available", current_order_id: null })
              .eq("id", selectedTable);
          }
          setShowSplitModal(false);
          resetCart();
          showToast(t("pos.split_all_paid"));
        } else {
          showToast(t("pos.split_bill_paid") + " #" + billNumber);
        }
      } catch (err) {
        console.error("Split pay error:", err);
      } finally {
        payingRef.current = false;
        setSplitSending(false);
      }
    },
    [
      tenantId,
      userId,
      splitBills,
      cart,
      orderType,
      selectedTable,
      customerName,
      supabase,
      splitPaidBills,
      resetCart,
      showToast,
      t,
      splitType,
      buildOrderItems,
      loyaltyCustomer,
    ]
  );

  /* ── Recent Orders ─────────────────────────────────────── */
  const fetchRecentOrders = useCallback(async () => {
    if (!tenantId || !userId) return;
    setLoadingRecent(true);
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, status")
        .eq("tenant_id", tenantId)
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!orders || orders.length === 0) {
        setRecentOrders([]);
        return;
      }

      // Fetch items for each order
      const orderIds = orders.map((o: { id: string }) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("order_id, name, quantity, unit_price, modifiers")
        .in("order_id", orderIds);

      const result: RecentOrder[] = orders.map((o: { id: string; order_number: number; total: number; created_at: string; status: string }) => ({
        ...o,
        items: (items || [])
          .filter((i: { order_id: string }) => i.order_id === o.id)
          .map((i: { name: string; quantity: number; unit_price: number; modifiers: string | SelectedModifier[] | null }) => ({
            name: i.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            modifiers: typeof i.modifiers === "string" ? JSON.parse(i.modifiers) : i.modifiers,
          })),
      }));
      setRecentOrders(result);
    } catch (err) {
      console.error("Fetch recent orders error:", err);
    } finally {
      setLoadingRecent(false);
    }
  }, [tenantId, userId, supabase]);

  const toggleRecentOrders = useCallback(() => {
    if (!showRecentOrders) {
      fetchRecentOrders();
    }
    setShowRecentOrders((v) => !v);
    setShowWaOrders(false);
  }, [showRecentOrders, fetchRecentOrders]);

  /* ── WhatsApp pending orders ─────────────────────────────── */
  const fetchWaOrders = useCallback(async () => {
    if (!tenantId) return;
    setLoadingWa(true);
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, status, customer_name, customer_phone")
        .eq("tenant_id", tenantId)
        .eq("source", "whatsapp")
        .in("status", ["confirmed", "preparing", "ready", "served"])
        .neq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!orders || orders.length === 0) {
        setWaOrders([]);
        setWaCount(0);
        return;
      }

      const orderIds = orders.map((o: { id: string }) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("order_id, name, quantity, unit_price, modifiers")
        .in("order_id", orderIds);

      const result: RecentOrder[] = orders.map((o: any) => ({
        ...o,
        items: (items || [])
          .filter((i: { order_id: string }) => i.order_id === o.id)
          .map((i: { name: string; quantity: number; unit_price: number; modifiers: string | SelectedModifier[] | null }) => ({
            name: i.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            modifiers: typeof i.modifiers === "string" ? JSON.parse(i.modifiers) : i.modifiers,
          })),
      }));
      setWaOrders(result);
      setWaCount(result.length);
    } catch (err) {
      console.error("Fetch WA orders error:", err);
    } finally {
      setLoadingWa(false);
    }
  }, [tenantId, supabase]);

  const toggleWaOrders = useCallback(() => {
    if (!showWaOrders) {
      fetchWaOrders();
    }
    setShowWaOrders((v) => !v);
    setShowRecentOrders(false);
  }, [showWaOrders, fetchWaOrders]);

  // Load a WhatsApp order into the POS cart for payment
  const loadWaOrderForPayment = useCallback((order: RecentOrder) => {
    const cartItems: CartItem[] = order.items.map((item, idx) => {
      const mods = item.modifiers || [];
      return {
        id: `wa-${order.id}-${idx}`,
        menuItemId: "",
        name: item.name,
        price: item.unit_price - mods.reduce((s: number, m: SelectedModifier) => s + (m.price_delta || 0), 0),
        qty: item.quantity,
        modifiers: mods,
        modifiersTotal: mods.reduce((s: number, m: SelectedModifier) => s + (m.price_delta || 0), 0),
        notes: "",
      };
    });
    setCart(cartItems);
    setExistingOrderId(order.id);
    setOriginalItemIds(new Set(cartItems.map((c) => c.id)));
    setOriginalCartSnapshot(JSON.stringify(cartItems));
    setCustomerName((order as any).customer_name || "");
    setCustomerPhone((order as any).customer_phone || "");
    setOrderType("takeaway");
    setOrderModeSelected(true);
    setShowWaOrders(false);
    setDiscount(0);
    setTip(0);
  }, []);

  // Fetch WA count on mount for badge
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("source", "whatsapp")
        .in("status", ["confirmed", "preparing", "ready", "served"])
        .neq("payment_status", "paid");
      setWaCount(count || 0);
    })();
  }, [tenantId, supabase]);

  const timeAgo = useCallback((dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("pos.just_now");
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }, [t]);

  // Auto-select if only one mode enabled
  useEffect(() => {
    if (orderModeSelected) return;
    const modes = (["dine_in", "takeaway", "delivery"] as OrderType[]).filter((m) => orderModes[m]);
    if (modes.length === 1) {
      setOrderType(modes[0]);
      if (modes[0] !== "dine_in") {
        setOrderModeSelected(true);
        if (modes[0] === "takeaway") fetchWaOrders();
      }
    }
  }, [orderModes, orderModeSelected, fetchWaOrders]);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ── Guard: Cash shift closed or outside business hours ── */
  if (guardChecked && (shiftOpen === false || isWithinHours === false)) {
    const noShift = shiftOpen === false;
    const outsideHours = isWithinHours === false;
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        flex: 1, minHeight: "80vh", background: "var(--bg-primary)", gap: 20, padding: 24, textAlign: "center",
      }}>
        <AlertTriangle size={56} style={{ color: "#f59e0b" }} />
        <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800, margin: 0 }}>
          POS Bloqueado
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          {noShift && (
            <div style={{
              background: "#ef444420", border: "1px solid #ef4444", borderRadius: 12,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
            }}>
              <DollarSign size={24} style={{ color: "#ef4444", flexShrink: 0 }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>Caja cerrada</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  Abre un turno en la Caja antes de crear pedidos.
                </div>
              </div>
            </div>
          )}
          {outsideHours && (
            <div style={{
              background: "#f59e0b20", border: "1px solid #f59e0b", borderRadius: 12,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
            }}>
              <Clock size={24} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 14 }}>Fuera de horario</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  El restaurante esta fuera del horario de apertura configurado.
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {noShift && (
            <a href="/cash-register" style={{
              padding: "10px 24px", background: "var(--accent)", color: "#fff",
              borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none",
            }}>
              Abrir Caja
            </a>
          )}
          <button onClick={() => { setShiftOpen(null); setIsWithinHours(null); setGuardChecked(false); window.location.reload(); }} style={{
            padding: "10px 24px", background: "var(--bg-card)", color: "var(--text-primary)",
            borderRadius: 8, fontWeight: 600, fontSize: 14, border: "1px solid var(--border)", cursor: "pointer",
          }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  /* ── Loading state ───────────────────────────────────── */
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          color: "var(--text-secondary)",
          fontSize: "1.1rem",
        }}
      >
        Loading POS...
      </div>
    );
  }

  /* ── Order mode selection overlay ─────────────────────── */
  const enabledModes = (["dine_in", "takeaway", "delivery"] as OrderType[]).filter((m) => orderModes[m]);

  if (!orderModeSelected) {

    const MODE_ICONS_POS: Record<OrderType, React.ReactNode> = {
      dine_in: <UtensilsCrossed size={40} />,
      takeaway: <ShoppingBag size={40} />,
      delivery: <Truck size={40} />,
    };

    const MODE_DESCS: Record<OrderType, string> = {
      dine_in: t("pos.select_table"),
      takeaway: t("pos.takeaway"),
      delivery: t("pos.delivery"),
    };

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        flex: 1, minHeight: 0, background: "var(--bg-primary)", gap: 32, padding: 24,
        position: "relative",
      }}>
        <a
          href="/dashboard"
          style={{
            position: "absolute", top: 16, left: 16,
            display: "flex", alignItems: "center", gap: 8,
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
            textDecoration: "none", padding: "8px 14px", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--bg-card)",
          }}
        >
          ← {t("nav.dashboard")}
        </a>
        <button
          onClick={toggleFullscreen}
          style={{
            position: "absolute", top: 16, right: 16,
            display: "flex", alignItems: "center", gap: 6,
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 14px", cursor: "pointer",
          }}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 800, margin: 0 }}>
          {t("pos.order_type")}
        </h1>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {enabledModes.map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setOrderType(mode);
                if (mode === "dine_in") {
                  // For dine-in, stay on overlay to pick table
                } else {
                  setOrderModeSelected(true);
                  if (mode === "takeaway") fetchWaOrders();
                }
              }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 14, width: 200, height: 200, borderRadius: 20,
                border: orderType === mode && mode === "dine_in" ? "3px solid var(--accent)" : "2px solid var(--border)",
                background: orderType === mode && mode === "dine_in" ? "rgba(249,115,22,0.08)" : "var(--bg-card)",
                cursor: "pointer", transition: "all 0.15s", color: "var(--text-primary)",
              }}
            >
              <span style={{ color: "var(--accent)" }}>{MODE_ICONS_POS[mode]}</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{t(`pos.${mode}`)}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{MODE_DESCS[mode]}</span>
            </button>
          ))}
        </div>

        {/* Table selection for dine-in — visual floor plan */}
        {orderType === "dine_in" && (() => {
          const STATUS_COLORS: Record<string, string> = {
            available: "#22C55E", occupied: "#F97316", reserved: "#3B82F6", cleaning: "#EAB308",
          };
          const zoneTabs = zones.length > 0 ? zones : [{ id: "__all", name: t("pos.all_zones") || "Todas", color: "var(--accent)", position: 0 }];
          const activeZone = selectedZone || zoneTabs[0]?.id || "__all";
          const filteredTables = activeZone === "__all"
            ? tables
            : tables.filter((tb) => tb.zone_id === activeZone);

          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 700 }}>
              {/* Zone tabs */}
              {zones.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    onClick={() => setSelectedZone("__all")}
                    style={{
                      padding: "8px 18px", borderRadius: 20, border: "none", fontSize: 13, fontWeight: 600,
                      background: activeZone === "__all" ? "var(--accent)" : "var(--bg-card)",
                      color: activeZone === "__all" ? "#000" : "var(--text-secondary)", cursor: "pointer",
                    }}
                  >{t("pos.all_zones") || "Todas"}</button>
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZone(z.id)}
                      style={{
                        padding: "8px 18px", borderRadius: 20, border: "none", fontSize: 13, fontWeight: 600,
                        background: activeZone === z.id ? z.color : "var(--bg-card)",
                        color: activeZone === z.id ? "#fff" : "var(--text-secondary)", cursor: "pointer",
                      }}
                    >{z.name}</button>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
                {(["available", "occupied", "reserved", "cleaning"] as const).map((s) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[s] }} />
                    {t(`tables.${s}`)}
                  </div>
                ))}
              </div>

              {/* Floor plan grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                gap: 12, width: "100%", padding: "8px 0",
              }}>
                {filteredTables.map((tb) => {
                  const isAvailable = tb.status === "available";
                  const isOccupied = tb.status === "occupied";
                  const isSelectable = isAvailable || isOccupied;
                  const isSelected = selectedTable === tb.id;
                  const borderRadius = tb.shape === "round" ? "50%" : tb.shape === "rectangle" ? 10 : 12;
                  const aspectRatio = tb.shape === "rectangle" ? "3/2" : "1/1";

                  return (
                    <button
                      key={tb.id}
                      onClick={() => {
                        if (!isSelectable) return;
                        setReceiptData(null);
                        setSelectedTable(tb.id);
                        if (isOccupied) loadTableOrder(tb.id);
                        else setExistingOrderId(null);
                        setOrderModeSelected(true);
                      }}
                      style={{
                        aspectRatio,
                        borderRadius,
                        border: isSelected ? "3px solid var(--accent)" : `2px solid ${STATUS_COLORS[tb.status]}`,
                        background: isSelected
                          ? "rgba(249,115,22,0.15)"
                          : isAvailable ? "var(--bg-card)" : `${STATUS_COLORS[tb.status]}15`,
                        cursor: isSelectable ? "pointer" : "not-allowed",
                        opacity: isSelectable ? 1 : 0.5,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 2, padding: 6, transition: "all 0.15s", position: "relative",
                      }}
                    >
                      <span style={{
                        fontSize: 15, fontWeight: 700,
                        color: isSelected ? "var(--accent)" : isAvailable ? "var(--text-primary)" : STATUS_COLORS[tb.status],
                      }}>{tb.number}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
                        <Users size={10} /> {tb.capacity}
                      </span>
                      {!isAvailable && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, color: STATUS_COLORS[tb.status],
                          textTransform: "uppercase", letterSpacing: "0.03em",
                        }}>{t(`tables.${tb.status}`)}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredTables.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("pos.no_tables") || "No hay mesas en esta zona"}</p>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
      className="max-md:!h-[calc(100vh-56px-64px)] max-md:!max-h-[calc(100vh-56px-64px)]"
    >
      {/* ═══════ LEFT PANEL — MENU (60%) ═══════ */}
      <div
        style={{
          flex: "0 0 60%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          overflow: "hidden",
        }}
        className="max-md:!flex-[1_1_100%]"
      >
        {/* Search bar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                color: "var(--text-secondary)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder={t("pos.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px 10px 40px",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="pos-btn"
                style={{
                  position: "absolute",
                  right: 8,
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "10px 16px",
            overflowX: "auto",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSelectedCategory(null)}
            className="pos-btn"
            style={{
              flexShrink: 0,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              background: !selectedCategory
                ? "var(--accent)"
                : "var(--bg-card)",
              color: !selectedCategory ? "#000" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {t("pos.items") === "items" ? "All" : "Todos"}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="pos-btn"
              style={{
                flexShrink: 0,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                background:
                  selectedCategory === cat.id
                    ? "var(--accent)"
                    : "var(--bg-card)",
                color:
                  selectedCategory === cat.id
                    ? "#000"
                    : "var(--text-secondary)",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {ln(cat)}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 10,
            alignContent: "start",
          }}
        >
          {filteredItems.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                color: "var(--text-secondary)",
                padding: "3rem 0",
                fontSize: "0.95rem",
              }}
            >
              {t("pos.empty_cart")}
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={loadingModifiers}
                className="pos-btn"
                style={{
                  minHeight: 80,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: loadingModifiers ? "wait" : "pointer",
                  transition: "border-color 0.15s, transform 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "scale(0.97)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {ln(item)}
                </span>
                <span
                  style={{
                    color: "var(--accent)",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                  }}
                >
                  {formatCurrency(item.price)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ═══════ RIGHT PANEL — CART (40%) ═══════ */}
      <div
        style={{
          flex: "0 0 40%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
          overflow: "hidden",
        }}
        className="max-md:hidden"
      >
        {/* Order type selector */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Mode indicator + back button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setOrderModeSelected(false)}
              className="pos-btn"
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 6,
                padding: "4px 6px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center",
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 6,
                padding: "4px 6px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center",
              }}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <span style={{
              flex: 1, padding: "6px 12px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700,
              background: "var(--accent)", color: "#000", textAlign: "center",
            }}>
              {t(`pos.${orderType}`)}
              {orderType === "dine_in" && selectedTable && ` — ${t("pos.table")} ${tables.find((tb) => tb.id === selectedTable)?.number || ""}`}
            </span>
          </div>

          {/* Customer info for takeaway/delivery */}
          {(orderType === "takeaway" || orderType === "delivery") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                placeholder={t("pos.customer")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.85rem",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <input
                type="tel"
                placeholder={t("pos.phone") || "Telefono *"}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.85rem",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {orderType === "delivery" && (
                <textarea
                  placeholder={t("pos.address") || "Direccion de entrega *"}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.85rem",
                    outline: "none", boxSizing: "border-box", resize: "vertical",
                  }}
                />
              )}
            </div>
          )}

          {/* Customer / Loyalty (dine-in or name-only) */}
          {orderType === "dine_in" && (
            <>
              {loyaltyEnabled && tenantId ? (
                <PosLoyaltyPanel
                  tenantId={tenantId}
                  orderTotal={subtotal}
                  onCustomerSelect={(c) => {
                    setLoyaltyCustomer(c);
                    setCustomerName(c?.name || "");
                  }}
                  onRewardSelect={setLoyaltyReward}
                />
              ) : (
                <input
                  type="text"
                  placeholder={t("pos.customer")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)", fontSize: "0.85rem",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Cart header with Recent button */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "var(--text-primary)",
              fontSize: "0.95rem",
            }}
          >
            {t("pos.cart")} ({cart.reduce((s, c) => s + c.qty, 0)}{" "}
            {t("pos.items")})
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* WhatsApp pending orders button */}
            <div ref={waRef} style={{ position: "relative" }}>
              <button
                onClick={toggleWaOrders}
                className="pos-btn"
                style={{
                  background: waCount > 0 ? "rgba(37, 211, 102, 0.15)" : "none",
                  border: waCount > 0 ? "1px solid #25D366" : "1px solid var(--border)",
                  color: waCount > 0 ? "#25D366" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  position: "relative",
                }}
              >
                📱 WA
                {waCount > 0 && (
                  <span style={{
                    background: "#25D366", color: "#fff", borderRadius: 999, padding: "1px 6px",
                    fontSize: "0.65rem", fontWeight: 700, minWidth: 16, textAlign: "center",
                  }}>{waCount}</span>
                )}
              </button>

              {showWaOrders && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 4, width: 320,
                  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 60, maxHeight: 400, overflowY: "auto",
                }}>
                  <div style={{
                    padding: "10px 12px", borderBottom: "1px solid var(--border)", fontWeight: 700,
                    fontSize: "0.82rem", color: "#25D366", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    📱 Pedidos WhatsApp pendientes
                  </div>
                  {loadingWa ? (
                    <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>...</div>
                  ) : waOrders.length === 0 ? (
                    <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      No hay pedidos WhatsApp pendientes
                    </div>
                  ) : (
                    waOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => loadWaOrderForPayment(o)}
                        className="pos-btn"
                        style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px", background: "none", border: "none",
                          borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(37, 211, 102, 0.08)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                            #{o.order_number} — {(o as any).customer_name || (o as any).customer_phone || "WhatsApp"}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                            {o.items.length} items · {o.status}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#25D366" }}>
                            {formatCurrency(o.total)}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {timeAgo(o.created_at)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Recent orders button */}
            <div ref={recentRef} style={{ position: "relative" }}>
              <button
                onClick={toggleRecentOrders}
                className="pos-btn"
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Clock size={13} />
                {t("pos.recent")}
              </button>

              {/* Recent orders dropdown */}
              {showRecentOrders && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 4,
                    width: 280,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    zIndex: 60,
                    maxHeight: 320,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {t("pos.recent_orders")}
                  </div>
                  {loadingRecent ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      ...
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {t("pos.no_recent_orders")}
                    </div>
                  ) : (
                    recentOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          setViewingOrder(o);
                          setShowRecentOrders(false);
                        }}
                        className="pos-btn"
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderBottom: "1px solid var(--border)",
                          background: "none",
                          border: "none",
                          borderBlockEnd: "1px solid var(--border)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                            #{o.order_number}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                            {o.items.length} {t("pos.items")} - {o.status}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--accent)" }}>
                            {formatCurrency(o.total)}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {timeAgo(o.created_at)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <button
                onClick={() => {
                  setCart([]);
                  setDiscount(0);
                  setTip(0);
                }}
                className="pos-btn"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "4px 8px",
                }}
              >
                {t("pos.clear")}
              </button>
            )}
          </div>
        </div>

        {/* Cart items list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 16px",
          }}
        >
          {cart.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {/* WhatsApp pending orders inline when cart is empty */}
              {orderType === "takeaway" && waCount > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
                    fontWeight: 700, fontSize: "0.82rem", color: "#25D366",
                  }}>
                    📱 Pedidos WhatsApp ({waCount})
                  </div>
                  {waOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => loadWaOrderForPayment(o)}
                      className="pos-btn"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 8px", background: "rgba(37, 211, 102, 0.06)", border: "1px solid rgba(37, 211, 102, 0.2)",
                        borderRadius: 8, cursor: "pointer", textAlign: "left", marginBottom: 6,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(37, 211, 102, 0.12)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(37, 211, 102, 0.06)"; }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                          #{o.order_number} — {(o as any).customer_name || "WhatsApp"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                          {o.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#25D366" }}>
                          {formatCurrency(o.total)}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {timeAgo(o.created_at)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  padding: waCount > 0 && orderType === "takeaway" ? "1rem 0" : "2.5rem 0",
                  fontSize: "0.9rem",
                }}
              >
                {t("pos.empty_cart")}
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Item row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {/* Qty controls */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="pos-btn"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      style={{
                        width: 26,
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="pos-btn"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Name + price + modifiers */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.78rem",
                      }}
                    >
                      {formatCurrency(item.price)} x {item.qty}
                    </div>
                    {/* Show selected modifiers */}
                    {item.modifiers.length > 0 && (
                      <div style={{ marginTop: 2 }}>
                        {item.modifiers.map((m, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-block",
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: "1px 6px",
                              fontSize: "0.68rem",
                              color: "var(--text-muted)",
                              marginRight: 4,
                              marginTop: 2,
                            }}
                          >
                            {m.name}
                            {m.price_delta > 0 && ` +${formatCurrency(m.price_delta)}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subtotal */}
                  <span
                    style={{
                      color: "var(--accent)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {formatCurrency(item.price * item.qty)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="pos-btn"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Notes */}
                {editingNoteId === item.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={item.notes}
                    placeholder={t("pos.add_note")}
                    onChange={(e) => updateNote(item.id, e.target.value)}
                    onBlur={() => setEditingNoteId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingNoteId(null);
                    }}
                    style={{
                      marginTop: 6,
                      width: "100%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "6px 8px",
                      color: "var(--text-primary)",
                      fontSize: "0.78rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingNoteId(item.id)}
                    className="pos-btn"
                    style={{
                      marginTop: 4,
                      background: "none",
                      border: "none",
                      color: item.notes
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      padding: "2px 0",
                      textAlign: "left",
                    }}
                  >
                    {item.notes || t("pos.add_note")}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Totals + Action buttons */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "12px 16px",
            background: "var(--bg-card)",
          }}
        >
          {/* Subtotal */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            <span>{t("pos.subtotal")}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Tax */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            <span>
              {t("pos.tax")} ({taxRate}%)
            </span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>

          {/* Discount input */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            <span>{t("pos.discount")}</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={discount || ""}
              onChange={(e) =>
                setDiscount(Math.max(0, parseFloat(e.target.value) || 0))
              }
              placeholder="0.00"
              style={{
                width: 80,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "4px 8px",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                textAlign: "right",
                outline: "none",
              }}
            />
          </div>

          {/* Loyalty discount (read-only) */}
          {loyaltyDiscount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.85rem",
                color: "var(--success)",
                marginBottom: 4,
              }}
            >
              <span>{loyaltyReward?.title || t("pos.loyalty_discount")}</span>
              <span>-{formatCurrency(loyaltyDiscount)}</span>
            </div>
          )}

          {/* Tip input */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            <span>{t("pos.tip")}</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={tip || ""}
              onChange={(e) =>
                setTip(Math.max(0, parseFloat(e.target.value) || 0))
              }
              placeholder="0.00"
              style={{
                width: 80,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "4px 8px",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                textAlign: "right",
                outline: "none",
              }}
            />
          </div>

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "1.15rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              padding: "8px 0",
              borderTop: "1px solid var(--border)",
              marginBottom: 12,
            }}
          >
            <span>{t("pos.total")}</span>
            <span style={{ color: "var(--accent)" }}>
              {formatCurrency(total)}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={sendToKitchen}
              disabled={sending || cart.length === 0 || !cartChanged}
              className="pos-btn"
              style={{
                flex: 1,
                padding: "14px 10px",
                borderRadius: 10,
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor:
                  sending || cart.length === 0 || !cartChanged ? "not-allowed" : "pointer",
                background:
                  sending || cart.length === 0 || !cartChanged
                    ? "var(--border)"
                    : "var(--accent)",
                color:
                  sending || cart.length === 0 || !cartChanged ? "var(--text-secondary)" : "#000",
                opacity: sending || cart.length === 0 || !cartChanged ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {t("pos.send_kitchen")}
            </button>
            <button
              onClick={() => { setPayMethod("cash"); setCashReceived(""); setMixedCashAmount(""); setMixedCardAmount(""); setCustomTipInput(""); setModalDiscount(discount > 0 ? discount.toString() : ""); setShowPayModal(true); }}
              disabled={sending || cart.length === 0}
              className="pos-btn"
              style={{
                flex: 1,
                padding: "14px 10px",
                borderRadius: 10,
                border: "2px solid var(--accent)",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor:
                  sending || cart.length === 0 ? "not-allowed" : "pointer",
                background: "transparent",
                color:
                  sending || cart.length === 0
                    ? "var(--text-secondary)"
                    : "var(--accent)",
                opacity: sending || cart.length === 0 ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {t("pos.pay")}
            </button>
            {/* Split button */}
            <button
              onClick={openSplitModal}
              disabled={sending || cart.length === 0}
              className="pos-btn"
              style={{
                padding: "14px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor:
                  sending || cart.length === 0 ? "not-allowed" : "pointer",
                background: "var(--bg-secondary)",
                color:
                  sending || cart.length === 0
                    ? "var(--text-muted)"
                    : "var(--text-primary)",
                opacity: sending || cart.length === 0 ? 0.5 : 1,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Split size={16} />
              {t("pos.split")}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ PAYMENT MODAL ═══════ */}
      {showPayModal && (() => {
        const mixedValid = payMethod === "mixed"
          ? Math.abs((parseFloat(mixedCashAmount) || 0) + (parseFloat(mixedCardAmount) || 0) - total) < 0.01
          : true;
        const cashValid = payMethod === "cash" && cashReceived !== "" ? parseFloat(cashReceived) >= total : true;
        const canConfirm = !sending && cart.length > 0 && cashValid && mixedValid;

        return (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
          onClick={() => setShowPayModal(false)}
        >
          <div
            style={{ background: "var(--bg-secondary)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{t("pos.pay")}</h2>
              <button onClick={() => setShowPayModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                <X size={22} />
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>

              {/* ── 1. ORDER SUMMARY ── */}
              <div style={{ padding: "16px 0 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  {t("pos.order_summary")}
                </div>
                {/* Table / order type badge */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {orderType === "dine_in" && selectedTable && (
                    <span style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(249,115,22,0.12)", color: "var(--accent)", fontSize: 13, fontWeight: 700 }}>
                      {t("pos.table")} {tables.find((tb) => tb.id === selectedTable)?.number}
                    </span>
                  )}
                  <span style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, border: "1px solid var(--border)" }}>
                    {t(`pos.${orderType}`)}
                  </span>
                </div>
                {/* Item list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{item.qty} x {item.name}</span>
                        {item.modifiers.length > 0 && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {item.modifiers.map((m) => m.name).join(", ")}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", marginLeft: 12 }}>
                        {formatCurrency(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Subtotal line */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                  <span>{t("pos.subtotal")}</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                    <span>{t("pos.tax")}</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
              </div>

              {/* ── 2. ADJUSTMENTS ── */}
              <div style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                {/* Discount */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{t("pos.discount")}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={modalDiscount}
                      onChange={(e) => {
                        setModalDiscount(e.target.value);
                        setDiscount(Math.max(0, parseFloat(e.target.value) || 0));
                      }}
                      placeholder="0.00"
                      style={{
                        width: 90, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 15, fontWeight: 700,
                        textAlign: "right", outline: "none", boxSizing: "border-box",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>EUR</span>
                  </div>
                </div>
                {loyaltyDiscount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: "#a78bfa" }}>
                    <span>{t("pos.loyalty_discount")}</span>
                    <span style={{ fontWeight: 700 }}>-{formatCurrency(loyaltyDiscount)}</span>
                  </div>
                )}
                {/* Tip */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>{t("pos.tip")}</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[
                      { label: "0%", value: 0 },
                      { label: "5%", value: Math.round(subtotal * 0.05 * 100) / 100 },
                      { label: "10%", value: Math.round(subtotal * 0.10 * 100) / 100 },
                      { label: "15%", value: Math.round(subtotal * 0.15 * 100) / 100 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => { setTip(opt.value); setCustomTipInput(""); }}
                        style={{
                          flex: 1, minWidth: 56, padding: "10px 6px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                          border: tip === opt.value && customTipInput === "" ? "2px solid var(--accent)" : "2px solid var(--border)",
                          background: tip === opt.value && customTipInput === "" ? "rgba(249,115,22,0.1)" : "var(--bg-card)",
                          color: tip === opt.value && customTipInput === "" ? "var(--accent)" : "var(--text-primary)",
                          transition: "all 0.15s",
                        }}
                      >
                        <div>{opt.label}</div>
                        {opt.value > 0 && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{formatCurrency(opt.value)}</div>}
                      </button>
                    ))}
                    {/* Custom tip */}
                    <div style={{ flex: 1, minWidth: 80, position: "relative" }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={customTipInput}
                        onChange={(e) => {
                          setCustomTipInput(e.target.value);
                          setTip(Math.max(0, parseFloat(e.target.value) || 0));
                        }}
                        placeholder={t("pos.tip_custom")}
                        style={{
                          width: "100%", padding: "10px 8px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                          border: customTipInput !== "" ? "2px solid var(--accent)" : "2px solid var(--border)",
                          background: customTipInput !== "" ? "rgba(249,115,22,0.1)" : "var(--bg-card)",
                          color: "var(--text-primary)", textAlign: "center", outline: "none", boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                        onBlur={(e) => { if (customTipInput === "") e.target.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  </div>
                </div>
                {/* Updated total */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px", borderTop: "1px solid var(--border)", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
                  <span>{t("pos.total")}</span>
                  <span style={{ color: "var(--accent)" }}>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* ── 3. PAYMENT METHOD ── */}
              <div style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  {t("pos.pay_method")}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["cash", "card", "mixed"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setPayMethod(m);
                        if (m === "mixed") { setMixedCashAmount(""); setMixedCardAmount(""); }
                      }}
                      style={{
                        flex: 1, padding: "14px 8px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                        border: payMethod === m ? "2px solid var(--accent)" : "2px solid var(--border)",
                        background: payMethod === m ? "rgba(249,115,22,0.1)" : "var(--bg-card)",
                        color: payMethod === m ? "var(--accent)" : "var(--text-primary)",
                        transition: "all 0.15s",
                      }}
                    >
                      {m === "mixed" ? t("pos.pay_mixed") : t(`pos.pay_${m}`)}
                    </button>
                  ))}
                </div>

                {/* ── Cash input ── */}
                {payMethod === "cash" && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                      {t("pos.cash_received")}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={total.toFixed(2)}
                      autoFocus
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)",
                        background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 22, fontWeight: 700,
                        textAlign: "center", outline: "none", boxSizing: "border-box",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                    {/* Quick cash buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {[5, 10, 20, 50].filter((v) => v >= total).concat([Math.ceil(total)]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((v) => (
                        <button
                          key={v}
                          onClick={() => setCashReceived(v.toFixed(2))}
                          style={{
                            flex: 1, minWidth: 60, padding: "10px 8px", borderRadius: 8, border: "1px solid var(--border)",
                            background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {formatCurrency(v)}
                        </button>
                      ))}
                    </div>
                    {/* Change */}
                    {cashReceived && parseFloat(cashReceived) >= total && (
                      <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "#22C55E", fontWeight: 600, textTransform: "uppercase" }}>{t("pos.change")}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#22C55E" }}>{formatCurrency(parseFloat(cashReceived) - total)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Mixed (split) inputs ── */}
                {payMethod === "mixed" && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                        {t("pos.cash_amount")}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={mixedCashAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMixedCashAmount(val);
                          const cashVal = parseFloat(val) || 0;
                          const remainder = Math.max(0, Math.round((total - cashVal) * 100) / 100);
                          setMixedCardAmount(remainder > 0 ? remainder.toFixed(2) : "0.00");
                        }}
                        placeholder="0.00"
                        autoFocus
                        style={{
                          width: "100%", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)",
                          background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 20, fontWeight: 700,
                          textAlign: "center", outline: "none", boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                        {t("pos.card_amount")}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={mixedCardAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMixedCardAmount(val);
                          const cardVal = parseFloat(val) || 0;
                          const remainder = Math.max(0, Math.round((total - cardVal) * 100) / 100);
                          setMixedCashAmount(remainder > 0 ? remainder.toFixed(2) : "0.00");
                        }}
                        placeholder="0.00"
                        style={{
                          width: "100%", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)",
                          background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 20, fontWeight: 700,
                          textAlign: "center", outline: "none", boxSizing: "border-box",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                      />
                    </div>
                    {/* Validation indicator */}
                    {mixedCashAmount && mixedCardAmount && (
                      <div style={{
                        padding: "8px 12px", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700,
                        background: mixedValid ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                        border: mixedValid ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
                        color: mixedValid ? "#22C55E" : "#EF4444",
                      }}>
                        {mixedValid
                          ? `${formatCurrency(parseFloat(mixedCashAmount) || 0)} + ${formatCurrency(parseFloat(mixedCardAmount) || 0)} = ${formatCurrency(total)}`
                          : `${formatCurrency((parseFloat(mixedCashAmount) || 0) + (parseFloat(mixedCardAmount) || 0))} / ${formatCurrency(total)}`
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── 4. CONFIRM BUTTON (sticky bottom) ── */}
            <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button
                onClick={() => { setShowPayModal(false); handlePay(); }}
                disabled={!canConfirm}
                style={{
                  width: "100%", padding: 18, borderRadius: 12, border: "none", fontSize: 17, fontWeight: 800,
                  background: canConfirm ? "var(--accent)" : "var(--border)",
                  color: canConfirm ? "#000" : "var(--text-secondary)",
                  cursor: canConfirm ? "pointer" : "not-allowed",
                  opacity: canConfirm ? 1 : 0.6,
                  transition: "all 0.15s",
                }}
              >
                {sending ? "..." : `${t("pos.confirm_pay")} — ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ═══════ MODIFIER SELECTION MODAL ═══════ */}
      {modifierModalItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => {
            setModifierModalItem(null);
            setModifierGroups([]);
            setModifierSelections({});
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              width: "90%",
              maxWidth: 440,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {ln(modifierModalItem)}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--accent)", fontWeight: 600 }}>
                  {formatCurrency(modifierModalItem.price)}
                </div>
              </div>
              <button
                onClick={() => {
                  setModifierModalItem(null);
                  setModifierGroups([]);
                  setModifierSelections({});
                }}
                className="pos-btn"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modifier groups */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
              {modifierGroups.map((group) => {
                const isSingle = group.max_select === 1;
                const selectedIds = modifierSelections[group.id] || [];
                return (
                  <div key={group.id} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {ln(group)}
                      {group.required && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            background: "var(--danger)",
                            color: "#fff",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          {t("pos.mod_required")}
                        </span>
                      )}
                      {!isSingle && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          ({t("pos.mod_select_up_to")} {group.max_select})
                        </span>
                      )}
                    </div>
                    {group.options.map((opt) => {
                      const isSelected = selectedIds.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleModifierToggle(group.id, opt.id, isSingle)}
                          className="pos-btn"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            marginBottom: 4,
                            background: isSelected ? "rgba(249,115,22,0.1)" : "var(--bg-secondary)",
                            border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {/* Radio / Checkbox indicator */}
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: isSingle ? "50%" : 4,
                              border: isSelected ? "2px solid var(--accent)" : "2px solid var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && (
                              <div
                                style={{
                                  width: isSingle ? 8 : 10,
                                  height: isSingle ? 8 : 10,
                                  borderRadius: isSingle ? "50%" : 2,
                                  background: "var(--accent)",
                                }}
                              />
                            )}
                          </div>
                          <span style={{ flex: 1, textAlign: "left", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 500 }}>
                            {ln(opt)}
                          </span>
                          {opt.price_delta !== 0 && (
                            <span style={{ color: opt.price_delta > 0 ? "var(--accent)" : "var(--success)", fontSize: "0.82rem", fontWeight: 600 }}>
                              {opt.price_delta > 0 ? "+" : ""}{formatCurrency(opt.price_delta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Confirm button */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
              {(() => {
                const modTotal = modifierGroups.reduce((sum, g) => {
                  const sel = modifierSelections[g.id] || [];
                  return sum + sel.reduce((s, optId) => {
                    const opt = g.options.find((o) => o.id === optId);
                    return s + (opt?.price_delta || 0);
                  }, 0);
                }, 0);
                const itemTotal = modifierModalItem.price + modTotal;
                return (
                  <button
                    onClick={confirmModifiers}
                    className="pos-btn"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 10,
                      border: "none",
                      background: "var(--accent)",
                      color: "#000",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {t("pos.mod_add_to_cart")} - {formatCurrency(itemTotal)}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SPLIT BILL MODAL ═══════ */}
      {showSplitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setShowSplitModal(false)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              width: "90%",
              maxWidth: 520,
              maxHeight: "85vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                {t("pos.split_bill")}
              </div>
              <button
                onClick={() => setShowSplitModal(false)}
                className="pos-btn"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Split type tabs */}
            <div style={{ display: "flex", gap: 6, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() => setSplitType("equal")}
                className="pos-btn"
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: splitType === "equal" ? "var(--accent)" : "var(--bg-secondary)",
                  color: splitType === "equal" ? "#000" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Users size={15} />
                {t("pos.split_equal")}
              </button>
              <button
                onClick={() => setSplitType("by_item")}
                className="pos-btn"
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: splitType === "by_item" ? "var(--accent)" : "var(--bg-secondary)",
                  color: splitType === "by_item" ? "#000" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <ListChecks size={15} />
                {t("pos.split_by_item")}
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
              {splitType === "equal" ? (
                <div>
                  {/* Number of people */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 600 }}>
                      {t("pos.split_people")}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => setSplitCount((c) => Math.max(2, c - 1))}
                        className="pos-btn"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--accent)", minWidth: 30, textAlign: "center" }}>
                        {splitCount}
                      </span>
                      <button
                        onClick={() => setSplitCount((c) => Math.min(20, c + 1))}
                        className="pos-btn"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Per-person amount */}
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      borderRadius: 10,
                      padding: "14px 16px",
                      marginBottom: 16,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: 4 }}>
                      {t("pos.split_per_person")}
                    </div>
                    <div style={{ color: "var(--accent)", fontSize: "1.4rem", fontWeight: 800 }}>
                      {formatCurrency(total / splitCount)}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 4 }}>
                      {t("pos.total")}: {formatCurrency(total)}
                    </div>
                  </div>

                  {/* Pay each split */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {splitBills.map((bill) => {
                      const isPaid = splitPaidBills.has(bill.billNumber);
                      return (
                        <button
                          key={bill.billNumber}
                          onClick={() => !isPaid && handlePaySplit(bill.billNumber)}
                          disabled={isPaid || splitSending}
                          className="pos-btn"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: isPaid ? "1px solid var(--success)" : "1px solid var(--border)",
                            background: isPaid ? "rgba(34,197,94,0.1)" : "var(--bg-secondary)",
                            cursor: isPaid || splitSending ? "not-allowed" : "pointer",
                            opacity: splitSending && !isPaid ? 0.6 : 1,
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: isPaid ? "var(--success)" : "var(--text-primary)" }}>
                            {t("pos.split_person")} {bill.billNumber}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: isPaid ? "var(--success)" : "var(--accent)" }}>
                              {formatCurrency(bill.total)}
                            </span>
                            {isPaid && <CheckCircle size={16} style={{ color: "var(--success)" }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  {/* By item assignment */}
                  <div style={{ marginBottom: 12, color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                    {t("pos.split_assign_items")}
                  </div>
                  {cart.map((item) => {
                    const assignedBill = splitAssignments[item.id] || 1;
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "var(--text-primary)", fontSize: "0.82rem", fontWeight: 600 }}>
                            {item.name} x{item.qty}
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                            {formatCurrency(item.price * item.qty)}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: 4 }}>
                            {t("pos.split_bill_label")}
                          </span>
                          {[1, 2, 3, 4].map((bn) => (
                            <button
                              key={bn}
                              onClick={() =>
                                setSplitAssignments((prev) => ({ ...prev, [item.id]: bn }))
                              }
                              className="pos-btn"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: assignedBill === bn ? "2px solid var(--accent)" : "1px solid var(--border)",
                                background: assignedBill === bn ? "rgba(249,115,22,0.15)" : "var(--bg-secondary)",
                                color: assignedBill === bn ? "var(--accent)" : "var(--text-secondary)",
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {bn}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Bill summaries */}
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                    {splitBills
                      .filter((b) => b.items.length > 0)
                      .map((bill) => {
                        const isPaid = splitPaidBills.has(bill.billNumber);
                        return (
                          <button
                            key={bill.billNumber}
                            onClick={() => !isPaid && handlePaySplit(bill.billNumber)}
                            disabled={isPaid || splitSending}
                            className="pos-btn"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              borderRadius: 8,
                              border: isPaid ? "1px solid var(--success)" : "1px solid var(--border)",
                              background: isPaid ? "rgba(34,197,94,0.1)" : "var(--bg-secondary)",
                              cursor: isPaid || splitSending ? "not-allowed" : "pointer",
                              opacity: splitSending && !isPaid ? 0.6 : 1,
                            }}
                          >
                            <div style={{ textAlign: "left" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: isPaid ? "var(--success)" : "var(--text-primary)" }}>
                                {t("pos.split_bill_label")} {bill.billNumber}
                              </span>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {bill.items.length} {t("pos.items")}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: isPaid ? "var(--success)" : "var(--accent)" }}>
                                {formatCurrency(bill.total)}
                              </span>
                              {isPaid && <CheckCircle size={16} style={{ color: "var(--success)" }} />}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ VIEW ORDER MODAL (read-only) ═══════ */}
      {viewingOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setViewingOrder(null)}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              width: "90%",
              maxWidth: 400,
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {t("pos.order")} #{viewingOrder.order_number}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  {new Date(viewingOrder.created_at).toLocaleString()} - {viewingOrder.status}
                </div>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="pos-btn"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
              {viewingOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 600 }}>
                      {item.quantity}x {item.name}
                    </div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div style={{ marginTop: 2 }}>
                        {item.modifiers.map((m, mi) => (
                          <span
                            key={mi}
                            style={{
                              display: "inline-block",
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: "1px 6px",
                              fontSize: "0.68rem",
                              color: "var(--text-muted)",
                              marginRight: 4,
                              marginTop: 2,
                            }}
                          >
                            {m.name}
                            {m.price_delta > 0 && ` +${formatCurrency(m.price_delta)}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                fontSize: "1.05rem",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>{t("pos.total")}</span>
              <span style={{ color: "var(--accent)" }}>{formatCurrency(viewingOrder.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TOAST ═══════ */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--accent)",
            color: "#000",
            padding: "12px 24px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 100,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            animation: "fadeInUp 0.3s ease",
          }}
        >
          <CheckCircle size={18} />
          {toast}
        </div>
      )}

      {/* Toast animation keyframe (injected once) */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          open={!!receiptData}
          onClose={() => setReceiptData(null)}
          order={receiptData.order}
          items={receiptData.items}
          tenantName={receiptData.tenantName}
          receiptConfig={receiptData.receiptConfig}
          currency={currencyRef.current}
        />
      )}
    </div>
  );
}
