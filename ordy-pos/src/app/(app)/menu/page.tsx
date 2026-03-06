"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Search, Plus, Minus, GripVertical, Image as ImageIcon, CheckSquare, Square, ToggleLeft, ToggleRight } from "lucide-react";

/* ── Types ────────────────────────────────────────────── */

interface Category {
  id: string;
  tenant_id: string;
  name_es: string;
  name_en: string;
  name_fr: string | null;
  name_de: string | null;
  name_it: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
}

interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name_es: string;
  name_en: string;
  name_fr: string | null;
  name_de: string | null;
  name_it: string | null;
  description_es: string | null;
  description_en: string | null;
  price: number;
  cost: number | null;
  available: boolean;
  prep_time_minutes: number | null;
  kds_station: string | null;
  allergens: string[];
  image_url: string | null;
}

interface ModifierGroup {
  id: string;
  tenant_id: string;
  name: string;
  type: "single_select" | "multi_select";
  required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
}

interface ModifierOption {
  id: string;
  group_id: string;
  tenant_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
}

interface ItemModifierGroup {
  menu_item_id: string;
  modifier_group_id: string;
}

type Tab = "categories" | "items" | "modifiers";

const ALLERGEN_OPTIONS = [
  "gluten", "dairy", "nuts", "shellfish", "eggs", "soy", "fish",
];

const EMOJI_PICKS = [
  "🍔", "🍕", "🥗", "🍣", "🍜", "🥩", "🍗", "🍰", "🧁", "🍩",
  "🥤", "🍷", "🍺", "☕", "🧃", "🍝", "🌮", "🥪", "🍟", "🥘",
  "🐟", "🦐", "🥡", "🍙", "🫕", "🍲", "🥧", "🧀", "🥚", "🍞",
];

const COLOR_PICKS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#78716c", "#64748b", "#ffffff",
];

const blankCategory: Omit<Category, "id" | "tenant_id"> = {
  name_es: "", name_en: "", name_fr: null, name_de: null, name_it: null,
  icon: "🍽️", color: "#3b82f6", sort_order: 0, active: true,
};

const blankProduct: Omit<Product, "id" | "tenant_id"> = {
  category_id: null,
  name_es: "", name_en: "", name_fr: null, name_de: null, name_it: null,
  description_es: null, description_en: null,
  price: 0, cost: null, available: true,
  prep_time_minutes: null, kds_station: null, allergens: [], image_url: null,
};

const blankModifierGroup: Omit<ModifierGroup, "id" | "tenant_id"> = {
  name: "",
  type: "single_select",
  required: false,
  min_select: 0,
  max_select: 1,
  sort_order: 0,
};

const blankModifierOption: Omit<ModifierOption, "id" | "group_id" | "tenant_id"> = {
  name: "",
  price_delta: 0,
  sort_order: 0,
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

export default function MenuPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("categories");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [catModal, setCatModal] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState(blankCategory);
  const [catDeleting, setCatDeleting] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [prodModal, setProdModal] = useState(false);
  const [prodEdit, setProdEdit] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState(blankProduct);
  const [prodDeleting, setProdDeleting] = useState<string | null>(null);

  // Bulk selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Modifier groups
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [modOptions, setModOptions] = useState<ModifierOption[]>([]);
  const [modGroupModal, setModGroupModal] = useState(false);
  const [modGroupEdit, setModGroupEdit] = useState<ModifierGroup | null>(null);
  const [modGroupForm, setModGroupForm] = useState(blankModifierGroup);
  const [modGroupDeleting, setModGroupDeleting] = useState<string | null>(null);

  // Modifier options within a group (expanded view)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [modOptModal, setModOptModal] = useState(false);
  const [modOptEdit, setModOptEdit] = useState<ModifierOption | null>(null);
  const [modOptForm, setModOptForm] = useState(blankModifierOption);
  const [modOptDeleting, setModOptDeleting] = useState<string | null>(null);
  const [modOptGroupId, setModOptGroupId] = useState<string | null>(null);

  // Item modifier group assignments (for product modal)
  const [itemModGroups, setItemModGroups] = useState<string[]>([]);

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

  const loadCategories = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (data) setCategories(data as Category[]);
  }, [tenantId]);

  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    let q = supabase
      .from("menu_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name_es", { ascending: true });
    if (filterCat !== "all") q = q.eq("category_id", filterCat);
    const { data } = await q;
    if (data) setProducts(data as Product[]);
  }, [tenantId, filterCat]);

  const loadModifierGroups = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("menu_modifier_groups")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (data) setModifierGroups(data as ModifierGroup[]);
  }, [tenantId]);

  const loadModifierOptions = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("menu_modifier_options")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (data) setModOptions(data as ModifierOption[]);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    Promise.all([loadCategories(), loadProducts(), loadModifierGroups(), loadModifierOptions()]).finally(() => setLoading(false));
  }, [tenantId, loadCategories, loadProducts, loadModifierGroups, loadModifierOptions]);

  /* ── Filtered products (search) ────────────────────── */

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) =>
      p.name_es.toLowerCase().includes(q) ||
      p.name_en.toLowerCase().includes(q) ||
      (p.name_fr && p.name_fr.toLowerCase().includes(q)) ||
      (p.name_de && p.name_de.toLowerCase().includes(q)) ||
      (p.name_it && p.name_it.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  /* ── Category CRUD ────────────────────────────────── */

  const openCatCreate = () => {
    setCatEdit(null);
    setCatForm({ ...blankCategory, sort_order: categories.length });
    setCatModal(true);
  };

  const openCatEdit = (cat: Category) => {
    setCatEdit(cat);
    setCatForm({
      name_es: cat.name_es,
      name_en: cat.name_en,
      name_fr: cat.name_fr,
      name_de: cat.name_de,
      name_it: cat.name_it,
      icon: cat.icon,
      color: cat.color,
      sort_order: cat.sort_order,
      active: cat.active,
    });
    setCatModal(true);
  };

  const saveCat = async () => {
    if (!tenantId || !catForm.name_es || !catForm.name_en) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...catForm, tenant_id: tenantId };
    if (catEdit) {
      await supabase.from("menu_categories").update(payload).eq("id", catEdit.id);
    } else {
      await supabase.from("menu_categories").insert(payload);
    }
    setCatModal(false);
    setSaving(false);
    await loadCategories();
  };

  const deleteCat = async (id: string) => {
    const supabase = createClient();
    await supabase.from("menu_categories").delete().eq("id", id);
    setCatDeleting(null);
    await loadCategories();
  };

  const toggleCatActive = async (cat: Category) => {
    const supabase = createClient();
    await supabase.from("menu_categories").update({ active: !cat.active }).eq("id", cat.id);
    await loadCategories();
  };

  /* ── Product CRUD ─────────────────────────────────── */

  const openProdCreate = () => {
    setProdEdit(null);
    setProdForm({ ...blankProduct });
    setItemModGroups([]);
    setProdModal(true);
  };

  const openProdEdit = async (prod: Product) => {
    if (bulkMode) return; // don't open modal in bulk mode
    setProdEdit(prod);
    setProdForm({
      category_id: prod.category_id,
      name_es: prod.name_es,
      name_en: prod.name_en,
      name_fr: prod.name_fr,
      name_de: prod.name_de,
      name_it: prod.name_it,
      description_es: prod.description_es,
      description_en: prod.description_en,
      price: prod.price,
      cost: prod.cost,
      available: prod.available,
      prep_time_minutes: prod.prep_time_minutes,
      kds_station: prod.kds_station,
      allergens: prod.allergens || [],
      image_url: prod.image_url,
    });
    // Load item modifier group assignments
    const supabase = createClient();
    const { data } = await supabase
      .from("menu_item_modifier_groups")
      .select("modifier_group_id")
      .eq("menu_item_id", prod.id);
    setItemModGroups(data ? data.map((d: { modifier_group_id: string }) => d.modifier_group_id) : []);
    setProdModal(true);
  };

  const saveProd = async () => {
    if (!tenantId || !prodForm.name_es || !prodForm.name_en) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...prodForm, tenant_id: tenantId };
    let itemId = prodEdit?.id;
    if (prodEdit) {
      await supabase.from("menu_items").update(payload).eq("id", prodEdit.id);
    } else {
      const { data } = await supabase.from("menu_items").insert(payload).select("id").single();
      if (data) itemId = data.id;
    }
    // Save modifier group assignments
    if (itemId) {
      await supabase.from("menu_item_modifier_groups").delete().eq("menu_item_id", itemId);
      if (itemModGroups.length > 0) {
        const rows = itemModGroups.map((gid) => ({ menu_item_id: itemId, modifier_group_id: gid }));
        await supabase.from("menu_item_modifier_groups").insert(rows);
      }
    }
    setProdModal(false);
    setSaving(false);
    await loadProducts();
  };

  const deleteProd = async (id: string) => {
    const supabase = createClient();
    await supabase.from("menu_items").delete().eq("id", id);
    setProdDeleting(null);
    await loadProducts();
  };

  const toggleProdAvailable = async (prod: Product) => {
    const supabase = createClient();
    await supabase.from("menu_items").update({ available: !prod.available }).eq("id", prod.id);
    await loadProducts();
  };

  /* ── Bulk toggle ───────────────────────────────────── */

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const allIds = new Set(filteredProducts.map((p) => p.id));
    setSelectedItems(allIds);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const bulkToggleAvailable = async (setAvailable: boolean) => {
    if (selectedItems.size === 0) return;
    const supabase = createClient();
    const ids = Array.from(selectedItems);
    await supabase.from("menu_items").update({ available: setAvailable }).in("id", ids);
    setSelectedItems(new Set());
    setBulkMode(false);
    await loadProducts();
  };

  /* ── Modifier Group CRUD ───────────────────────────── */

  const openModGroupCreate = () => {
    setModGroupEdit(null);
    setModGroupForm({ ...blankModifierGroup, sort_order: modifierGroups.length });
    setModGroupModal(true);
  };

  const openModGroupEdit = (g: ModifierGroup) => {
    setModGroupEdit(g);
    setModGroupForm({
      name: g.name,
      type: g.type,
      required: g.required,
      min_select: g.min_select,
      max_select: g.max_select,
      sort_order: g.sort_order,
    });
    setModGroupModal(true);
  };

  const saveModGroup = async () => {
    if (!tenantId || !modGroupForm.name) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...modGroupForm, tenant_id: tenantId };
    if (modGroupEdit) {
      await supabase.from("menu_modifier_groups").update(payload).eq("id", modGroupEdit.id);
    } else {
      await supabase.from("menu_modifier_groups").insert(payload);
    }
    setModGroupModal(false);
    setSaving(false);
    await loadModifierGroups();
  };

  const deleteModGroup = async (id: string) => {
    const supabase = createClient();
    // Delete options first
    await supabase.from("menu_modifier_options").delete().eq("group_id", id);
    // Delete junction entries
    await supabase.from("menu_item_modifier_groups").delete().eq("modifier_group_id", id);
    // Delete group
    await supabase.from("menu_modifier_groups").delete().eq("id", id);
    setModGroupDeleting(null);
    if (expandedGroup === id) setExpandedGroup(null);
    await Promise.all([loadModifierGroups(), loadModifierOptions()]);
  };

  /* ── Modifier Option CRUD ──────────────────────────── */

  const openModOptCreate = (groupId: string) => {
    setModOptGroupId(groupId);
    setModOptEdit(null);
    const groupOpts = modOptions.filter((o) => o.group_id === groupId);
    setModOptForm({ ...blankModifierOption, sort_order: groupOpts.length });
    setModOptModal(true);
  };

  const openModOptEdit = (opt: ModifierOption) => {
    setModOptGroupId(opt.group_id);
    setModOptEdit(opt);
    setModOptForm({
      name: opt.name,
      price_delta: opt.price_delta,
      sort_order: opt.sort_order,
    });
    setModOptModal(true);
  };

  const saveModOpt = async () => {
    if (!tenantId || !modOptGroupId || !modOptForm.name) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...modOptForm, group_id: modOptGroupId, tenant_id: tenantId };
    if (modOptEdit) {
      await supabase.from("menu_modifier_options").update(payload).eq("id", modOptEdit.id);
    } else {
      await supabase.from("menu_modifier_options").insert(payload);
    }
    setModOptModal(false);
    setSaving(false);
    await loadModifierOptions();
  };

  const deleteModOpt = async (id: string) => {
    const supabase = createClient();
    await supabase.from("menu_modifier_options").delete().eq("id", id);
    setModOptDeleting(null);
    await loadModifierOptions();
  };

  /* ── Helpers ──────────────────────────────────────── */

  const catName = (id: string | null) => {
    const c = categories.find((c) => c.id === id);
    return c ? c.name_es : "—";
  };

  const catColor = (id: string | null) => {
    const c = categories.find((c) => c.id === id);
    return c?.color || "var(--text-muted)";
  };

  const toggleAllergen = (a: string) => {
    setProdForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(a)
        ? prev.allergens.filter((x) => x !== a)
        : [...prev.allergens, a],
    }));
  };

  const toggleItemModGroup = (groupId: string) => {
    setItemModGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  /* ── Modal overlay ────────────────────────────────── */

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
          maxWidth: 540,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );

  /* ── Confirm delete overlay ───────────────────────── */

  const ConfirmDelete = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <Overlay onClose={onCancel}>
      <p style={{ color: "var(--text-primary)", fontSize: "1rem", marginBottom: 20, marginTop: 0 }}>
        {t("menu.confirm_delete")}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button style={btnSecondary} onClick={onCancel}>{t("menu.cancel")}</button>
        <button style={btnDanger} onClick={onConfirm}>{t("menu.delete")}</button>
      </div>
    </Overlay>
  );

  /* ── Add button action ─────────────────────────────── */

  const handleAddButton = () => {
    if (tab === "categories") openCatCreate();
    else if (tab === "items") openProdCreate();
    else openModGroupCreate();
  };

  const addButtonLabel = () => {
    if (tab === "categories") return t("menu.add_category");
    if (tab === "items") return t("menu.add_item");
    return t("menu.add_modifier_group");
  };

  /* ── Render ───────────────────────────────────────── */

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, margin: 0 }}>
          {t("menu.title")}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Bulk mode toggle (items tab only) */}
          {tab === "items" && (
            <button
              style={{
                ...btnSecondary,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: bulkMode ? "rgba(249,115,22,0.12)" : "transparent",
                borderColor: bulkMode ? "var(--accent)" : "var(--border)",
                color: bulkMode ? "var(--accent)" : "var(--text-secondary)",
              }}
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedItems(new Set());
              }}
            >
              {bulkMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {t("menu.bulk_mode")}
            </button>
          )}
          <button style={btnPrimary} onClick={handleAddButton}>
            + {addButtonLabel()}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 420 }}>
        <Search
          size={18}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          style={{
            ...inputStyle,
            paddingLeft: 38,
          }}
          placeholder={t("menu.search_placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {(["categories", "items", "modifiers"] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => { setTab(tb); setSearchQuery(""); setBulkMode(false); setSelectedItems(new Set()); }}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: tab === tb ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              color: tab === tb ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: tab === tb ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t(`menu.${tb}`)}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>...</p>
      )}

      {/* ─── Categories Tab ─────────────────────────── */}

      {!loading && tab === "categories" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
              {t("menu.no_categories")}
            </p>
          )}
          {categories
            .filter((cat) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return cat.name_es.toLowerCase().includes(q) || cat.name_en.toLowerCase().includes(q);
            })
            .map((cat) => (
            <div
              key={cat.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 28 }}>{cat.icon || "🍽️"}</span>

              {/* Color swatch */}
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: cat.color || "#888",
                  flexShrink: 0,
                  border: "1px solid var(--border)",
                }}
              />

              {/* Name + sort */}
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                  {cat.name_es}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  {t("menu.sort_order")}: {cat.sort_order}
                </div>
              </div>

              {/* Active toggle */}
              <button
                onClick={() => toggleCatActive(cat)}
                style={{
                  padding: "4px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: cat.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                  color: cat.active ? "#22c55e" : "#f87171",
                }}
              >
                {cat.active ? t("menu.active") : "Off"}
              </button>

              {/* Actions */}
              <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => openCatEdit(cat)}>
                {t("menu.edit")}
              </button>
              <button style={{ ...btnDanger, padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setCatDeleting(cat.id)}>
                {t("menu.delete")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Products Tab ───────────────────────────── */}

      {!loading && tab === "items" && (
        <>
          {/* Filter by category + bulk actions */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={{ ...inputStyle, maxWidth: 280, width: "auto" }}
            >
              <option value="all">{t("menu.all_categories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name_es}</option>
              ))}
            </select>

            {bulkMode && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  style={{ ...btnSecondary, padding: "6px 12px", fontSize: "0.8rem" }}
                  onClick={selectAllVisible}
                >
                  {t("menu.select_all")}
                </button>
                <button
                  style={{ ...btnSecondary, padding: "6px 12px", fontSize: "0.8rem" }}
                  onClick={deselectAll}
                >
                  {t("menu.deselect_all")}
                </button>
                {selectedItems.size > 0 && (
                  <>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {selectedItems.size} {t("menu.selected")}
                    </span>
                    <button
                      style={{
                        ...btnPrimary,
                        padding: "6px 14px",
                        fontSize: "0.8rem",
                        background: "rgba(34,197,94,0.9)",
                      }}
                      onClick={() => bulkToggleAvailable(true)}
                    >
                      {t("menu.bulk_activate")}
                    </button>
                    <button
                      style={{
                        ...btnDanger,
                        padding: "6px 14px",
                        fontSize: "0.8rem",
                      }}
                      onClick={() => bulkToggleAvailable(false)}
                    >
                      {t("menu.bulk_deactivate")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {filteredProducts.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
              {searchQuery ? t("menu.no_search_results") : t("menu.no_items")}
            </p>
          )}

          {/* Products grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
            className="max-lg:!grid-cols-3 max-md:!grid-cols-2"
          >
            {filteredProducts.map((prod) => {
              const isSelected = selectedItems.has(prod.id);
              return (
                <div
                  key={prod.id}
                  style={{
                    background: "var(--bg-card)",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                    position: "relative",
                  }}
                  onClick={() => {
                    if (bulkMode) {
                      toggleSelectItem(prod.id);
                    } else {
                      openProdEdit(prod);
                    }
                  }}
                  onMouseEnter={(e) => { if (!bulkMode) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { if (!bulkMode && !isSelected) e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Bulk checkbox */}
                  {bulkMode && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        zIndex: 2,
                        background: "rgba(0,0,0,0.5)",
                        borderRadius: 4,
                        padding: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} color="var(--accent)" />
                      ) : (
                        <Square size={20} color="var(--text-muted)" />
                      )}
                    </div>
                  )}

                  {/* Image placeholder */}
                  <div
                    style={{
                      height: 120,
                      background: "var(--bg-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 36,
                      color: "var(--text-muted)",
                    }}
                  >
                    {prod.image_url ? (
                      <img src={prod.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      "🍽️"
                    )}
                  </div>

                  <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Name */}
                    <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem" }}>
                      {prod.name_es}
                    </div>

                    {/* Price */}
                    <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1rem" }}>
                      ${prod.price.toFixed(2)}
                    </div>

                    {/* Category badge */}
                    {prod.category_id && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 999,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: `${catColor(prod.category_id)}22`,
                          color: catColor(prod.category_id),
                          alignSelf: "flex-start",
                        }}
                      >
                        {catName(prod.category_id)}
                      </span>
                    )}

                    {/* Available toggle */}
                    <div style={{ marginTop: "auto", paddingTop: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleProdAvailable(prod); }}
                        style={{
                          padding: "3px 12px",
                          borderRadius: 999,
                          border: "none",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: prod.available ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                          color: prod.available ? "#22c55e" : "#f87171",
                        }}
                      >
                        {prod.available ? t("menu.available") : "Off"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Modifiers Tab ──────────────────────────── */}

      {!loading && tab === "modifiers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {modifierGroups.length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
              {t("menu.no_modifier_groups")}
            </p>
          )}
          {modifierGroups
            .filter((g) => {
              if (!searchQuery.trim()) return true;
              return g.name.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .map((group) => {
              const groupOpts = modOptions.filter((o) => o.group_id === group.id);
              const isExpanded = expandedGroup === group.id;
              return (
                <div key={group.id} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {/* Group row */}
                  <div
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: isExpanded ? "12px 12px 0 0" : 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  >
                    <GripVertical size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                        {group.name}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                        <span style={{
                          padding: "1px 8px",
                          borderRadius: 999,
                          background: group.type === "single_select" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                          color: group.type === "single_select" ? "#60a5fa" : "#c084fc",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                        }}>
                          {group.type === "single_select" ? t("menu.single_select") : t("menu.multi_select")}
                        </span>
                        {group.required && (
                          <span style={{
                            padding: "1px 8px",
                            borderRadius: 999,
                            background: "rgba(249,115,22,0.15)",
                            color: "var(--accent)",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                          }}>
                            {t("menu.required")}
                          </span>
                        )}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          {groupOpts.length} {t("menu.options_count")}
                        </span>
                        {(group.min_select > 0 || group.max_select > 0) && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                            ({t("menu.min")}: {group.min_select}, {t("menu.max")}: {group.max_select})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      style={{ ...btnSecondary, padding: "4px 12px", fontSize: "0.8rem" }}
                      onClick={(e) => { e.stopPropagation(); openModGroupEdit(group); }}
                    >
                      {t("menu.edit")}
                    </button>
                    <button
                      style={{ ...btnDanger, padding: "4px 12px", fontSize: "0.8rem" }}
                      onClick={(e) => { e.stopPropagation(); setModGroupDeleting(group.id); }}
                    >
                      {t("menu.delete")}
                    </button>
                  </div>

                  {/* Expanded options */}
                  {isExpanded && (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderTop: "none",
                        borderRadius: "0 0 12px 12px",
                        padding: "12px 18px",
                      }}
                    >
                      {groupOpts.length === 0 && (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0" }}>
                          {t("menu.no_options")}
                        </p>
                      )}
                      {groupOpts.map((opt) => (
                        <div
                          key={opt.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 0",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <span style={{ color: "var(--text-primary)", fontSize: "0.9rem", flex: 1 }}>
                            {opt.name}
                          </span>
                          <span style={{
                            color: opt.price_delta > 0 ? "var(--accent)" : opt.price_delta < 0 ? "#22c55e" : "var(--text-muted)",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                          }}>
                            {opt.price_delta > 0 ? `+$${opt.price_delta.toFixed(2)}` : opt.price_delta < 0 ? `-$${Math.abs(opt.price_delta).toFixed(2)}` : "$0.00"}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                            #{opt.sort_order}
                          </span>
                          <button
                            style={{ ...btnSecondary, padding: "2px 10px", fontSize: "0.75rem" }}
                            onClick={() => openModOptEdit(opt)}
                          >
                            {t("menu.edit")}
                          </button>
                          <button
                            style={{ ...btnDanger, padding: "2px 10px", fontSize: "0.75rem" }}
                            onClick={() => setModOptDeleting(opt.id)}
                          >
                            {t("menu.delete")}
                          </button>
                        </div>
                      ))}

                      {/* Add option button */}
                      <button
                        style={{
                          ...btnSecondary,
                          marginTop: 10,
                          padding: "6px 14px",
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onClick={() => openModOptCreate(group.id)}
                      >
                        <Plus size={14} /> {t("menu.add_option")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ─── Category Modal ─────────────────────────── */}

      {catModal && (
        <Overlay onClose={() => setCatModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {catEdit ? t("menu.edit") : t("menu.add_category")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* name_es */}
            <div>
              <label style={labelStyle}>{t("menu.name_es")} *</label>
              <input
                style={inputStyle}
                value={catForm.name_es}
                onChange={(e) => setCatForm({ ...catForm, name_es: e.target.value })}
              />
            </div>

            {/* name_en */}
            <div>
              <label style={labelStyle}>{t("menu.name_en")} *</label>
              <input
                style={inputStyle}
                value={catForm.name_en}
                onChange={(e) => setCatForm({ ...catForm, name_en: e.target.value })}
              />
            </div>

            {/* Icon picker */}
            <div>
              <label style={labelStyle}>{t("menu.icon")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {EMOJI_PICKS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setCatForm({ ...catForm, icon: em })}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: catForm.icon === em ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: catForm.icon === em ? "var(--accent)1a" : "var(--bg-secondary)",
                      fontSize: 18,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label style={labelStyle}>{t("menu.color")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {COLOR_PICKS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatForm({ ...catForm, color: c })}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      background: c,
                      border: catForm.color === c ? "3px solid var(--accent)" : "2px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Sort order */}
            <div>
              <label style={labelStyle}>{t("menu.sort_order")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 120 }}
                value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Active */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={catForm.active}
                onChange={(e) => setCatForm({ ...catForm, active: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              />
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{t("menu.active")}</span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button style={btnSecondary} onClick={() => setCatModal(false)}>{t("menu.cancel")}</button>
            <button style={btnPrimary} onClick={saveCat} disabled={saving}>
              {saving ? "..." : t("menu.save")}
            </button>
          </div>
        </Overlay>
      )}

      {/* ─── Product Modal ──────────────────────────── */}

      {prodModal && (
        <Overlay onClose={() => setProdModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {prodEdit ? t("menu.edit") : t("menu.add_item")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* name_es, name_en (required) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("menu.name_es")} *</label>
                <input style={inputStyle} value={prodForm.name_es} onChange={(e) => setProdForm({ ...prodForm, name_es: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.name_en")} *</label>
                <input style={inputStyle} value={prodForm.name_en} onChange={(e) => setProdForm({ ...prodForm, name_en: e.target.value })} />
              </div>
            </div>

            {/* name_fr, name_de, name_it */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("menu.name_fr")}</label>
                <input style={inputStyle} value={prodForm.name_fr || ""} onChange={(e) => setProdForm({ ...prodForm, name_fr: e.target.value || null })} />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.name_de")}</label>
                <input style={inputStyle} value={prodForm.name_de || ""} onChange={(e) => setProdForm({ ...prodForm, name_de: e.target.value || null })} />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.name_it")}</label>
                <input style={inputStyle} value={prodForm.name_it || ""} onChange={(e) => setProdForm({ ...prodForm, name_it: e.target.value || null })} />
              </div>
            </div>

            {/* description_es, description_en */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("menu.desc_es")}</label>
                <textarea
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                  value={prodForm.description_es || ""}
                  onChange={(e) => setProdForm({ ...prodForm, description_es: e.target.value || null })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.desc_en")}</label>
                <textarea
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                  value={prodForm.description_en || ""}
                  onChange={(e) => setProdForm({ ...prodForm, description_en: e.target.value || null })}
                />
              </div>
            </div>

            {/* price, cost */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("menu.price")} *</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.cost")}</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={prodForm.cost ?? ""}
                  onChange={(e) => setProdForm({ ...prodForm, cost: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>

            {/* category_id */}
            <div>
              <label style={labelStyle}>{t("menu.category")}</label>
              <select
                style={inputStyle}
                value={prodForm.category_id || ""}
                onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value || null })}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name_es}</option>
                ))}
              </select>
            </div>

            {/* prep_time_minutes, kds_station */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("menu.prep_time")} (min)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={prodForm.prep_time_minutes ?? ""}
                  onChange={(e) => setProdForm({ ...prodForm, prep_time_minutes: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.kds_station")}</label>
                <input
                  style={inputStyle}
                  value={prodForm.kds_station || ""}
                  onChange={(e) => setProdForm({ ...prodForm, kds_station: e.target.value || null })}
                />
              </div>
            </div>

            {/* Image URL + preview */}
            <div>
              <label style={labelStyle}>{t("menu.image_url")}</label>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <input
                    style={inputStyle}
                    placeholder="https://..."
                    value={prodForm.image_url || ""}
                    onChange={(e) => setProdForm({ ...prodForm, image_url: e.target.value || null })}
                  />
                </div>
                {prodForm.image_url && (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--bg-secondary)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={prodForm.image_url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem;">Error</span>';
                      }}
                    />
                  </div>
                )}
                {!prodForm.image_url && (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      border: "1px dashed var(--border)",
                      background: "var(--bg-secondary)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ImageIcon size={20} color="var(--text-muted)" />
                  </div>
                )}
              </div>
            </div>

            {/* Allergens multi-select chips */}
            <div>
              <label style={labelStyle}>{t("menu.allergens")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {ALLERGEN_OPTIONS.map((a) => {
                  const selected = prodForm.allergens.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 999,
                        border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: selected ? "var(--accent)22" : "var(--bg-secondary)",
                        color: selected ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: "0.8rem",
                        fontWeight: selected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modifier groups assignment */}
            {modifierGroups.length > 0 && (
              <div>
                <label style={labelStyle}>{t("menu.modifier_groups")}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  {modifierGroups.map((g) => {
                    const assigned = itemModGroups.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: assigned ? "1px solid var(--accent)" : "1px solid var(--border)",
                          background: assigned ? "rgba(249,115,22,0.08)" : "var(--bg-secondary)",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={assigned}
                          onChange={() => toggleItemModGroup(g.id)}
                          style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                        />
                        <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "0.88rem", flex: 1 }}>
                          {g.name}
                        </span>
                        <span style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                        }}>
                          {g.type === "single_select" ? t("menu.single_select") : t("menu.multi_select")}
                          {g.required ? ` · ${t("menu.required")}` : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={prodForm.available}
                onChange={(e) => setProdForm({ ...prodForm, available: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              />
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{t("menu.available")}</span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, flexWrap: "wrap" }}>
            <div>
              {prodEdit && (
                <button style={btnDanger} onClick={() => { setProdModal(false); setProdDeleting(prodEdit.id); }}>
                  {t("menu.delete")}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={btnSecondary} onClick={() => setProdModal(false)}>{t("menu.cancel")}</button>
              <button style={btnPrimary} onClick={saveProd} disabled={saving}>
                {saving ? "..." : t("menu.save")}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ─── Modifier Group Modal ───────────────────── */}

      {modGroupModal && (
        <Overlay onClose={() => setModGroupModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {modGroupEdit ? t("menu.edit_modifier_group") : t("menu.add_modifier_group")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t("menu.modifier_name")} *</label>
              <input
                style={inputStyle}
                value={modGroupForm.name}
                onChange={(e) => setModGroupForm({ ...modGroupForm, name: e.target.value })}
                placeholder={t("menu.modifier_name_placeholder")}
              />
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>{t("menu.modifier_type")}</label>
              <select
                style={inputStyle}
                value={modGroupForm.type}
                onChange={(e) => setModGroupForm({ ...modGroupForm, type: e.target.value as "single_select" | "multi_select" })}
              >
                <option value="single_select">{t("menu.single_select")}</option>
                <option value="multi_select">{t("menu.multi_select")}</option>
              </select>
            </div>

            {/* Required */}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={modGroupForm.required}
                onChange={(e) => setModGroupForm({ ...modGroupForm, required: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
              />
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{t("menu.required")}</span>
            </label>

            {/* Min / Max select */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>{t("menu.min_select")}</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={modGroupForm.min_select}
                  onChange={(e) => setModGroupForm({ ...modGroupForm, min_select: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("menu.max_select")}</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={modGroupForm.max_select}
                  onChange={(e) => setModGroupForm({ ...modGroupForm, max_select: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Sort order */}
            <div>
              <label style={labelStyle}>{t("menu.sort_order")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 120 }}
                value={modGroupForm.sort_order}
                onChange={(e) => setModGroupForm({ ...modGroupForm, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button style={btnSecondary} onClick={() => setModGroupModal(false)}>{t("menu.cancel")}</button>
            <button style={btnPrimary} onClick={saveModGroup} disabled={saving}>
              {saving ? "..." : t("menu.save")}
            </button>
          </div>
        </Overlay>
      )}

      {/* ─── Modifier Option Modal ──────────────────── */}

      {modOptModal && (
        <Overlay onClose={() => setModOptModal(false)}>
          <h2 style={{ color: "var(--text-primary)", fontSize: "1.15rem", fontWeight: 700, margin: "0 0 20px" }}>
            {modOptEdit ? t("menu.edit_option") : t("menu.add_option")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>{t("menu.option_name")} *</label>
              <input
                style={inputStyle}
                value={modOptForm.name}
                onChange={(e) => setModOptForm({ ...modOptForm, name: e.target.value })}
                placeholder={t("menu.option_name_placeholder")}
              />
            </div>

            {/* Price delta */}
            <div>
              <label style={labelStyle}>{t("menu.price_delta")}</label>
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                value={modOptForm.price_delta}
                onChange={(e) => setModOptForm({ ...modOptForm, price_delta: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Sort order */}
            <div>
              <label style={labelStyle}>{t("menu.sort_order")}</label>
              <input
                type="number"
                style={{ ...inputStyle, maxWidth: 120 }}
                value={modOptForm.sort_order}
                onChange={(e) => setModOptForm({ ...modOptForm, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button style={btnSecondary} onClick={() => setModOptModal(false)}>{t("menu.cancel")}</button>
            <button style={btnPrimary} onClick={saveModOpt} disabled={saving}>
              {saving ? "..." : t("menu.save")}
            </button>
          </div>
        </Overlay>
      )}

      {/* ─── Delete confirmations ───────────────────── */}

      {catDeleting && (
        <ConfirmDelete
          onConfirm={() => deleteCat(catDeleting)}
          onCancel={() => setCatDeleting(null)}
        />
      )}

      {prodDeleting && (
        <ConfirmDelete
          onConfirm={() => deleteProd(prodDeleting)}
          onCancel={() => setProdDeleting(null)}
        />
      )}

      {modGroupDeleting && (
        <ConfirmDelete
          onConfirm={() => deleteModGroup(modGroupDeleting)}
          onCancel={() => setModGroupDeleting(null)}
        />
      )}

      {modOptDeleting && (
        <ConfirmDelete
          onConfirm={() => deleteModOpt(modOptDeleting)}
          onCancel={() => setModOptDeleting(null)}
        />
      )}
    </div>
  );
}
