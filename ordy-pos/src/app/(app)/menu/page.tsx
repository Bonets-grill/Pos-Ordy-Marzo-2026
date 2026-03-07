"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Search, Plus, Minus, GripVertical, Image as ImageIcon, CheckSquare, Square, ToggleLeft, ToggleRight, Sparkles, Loader2, Wand2, Globe, Check, X as XIcon, Download } from "lucide-react";

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
  name_es: string;
  name_en: string;
  required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  active: boolean;
}

interface ModifierOption {
  id: string;
  group_id: string;
  tenant_id: string;
  name_es: string;
  name_en: string;
  price_delta: number;
  sort_order: number;
  active: boolean;
}

interface ItemModifierGroup {
  item_id: string;
  group_id: string;
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

const AI_BACKGROUNDS = [
  { key: "dark_wood", emoji: "🪵", label: "menu.ai_bg_dark_wood" },
  { key: "marble", emoji: "⬜", label: "menu.ai_bg_marble" },
  { key: "slate", emoji: "⬛", label: "menu.ai_bg_slate" },
  { key: "rustic", emoji: "🌾", label: "menu.ai_bg_rustic" },
  { key: "modern", emoji: "🍽️", label: "menu.ai_bg_modern" },
  { key: "garden", emoji: "🌿", label: "menu.ai_bg_garden" },
  { key: "italian", emoji: "🇮🇹", label: "menu.ai_bg_italian" },
  { key: "asian", emoji: "🥢", label: "menu.ai_bg_asian" },
  { key: "colorful", emoji: "🎨", label: "menu.ai_bg_colorful" },
  { key: "transparent", emoji: "📸", label: "menu.ai_bg_transparent" },
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
  name_es: "",
  name_en: "",
  required: false,
  min_select: 0,
  max_select: 1,
  sort_order: 0,
  active: true,
};

const blankModifierOption: Omit<ModifierOption, "id" | "group_id" | "tenant_id"> = {
  name_es: "",
  name_en: "",
  price_delta: 0,
  sort_order: 0,
  active: true,
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

/* ── Modal Overlay (must be outside component to avoid remount on state change) ── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
}

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

  // AI Assistant state
  const [aiIngredients, setAiIngredients] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiBackground, setAiBackground] = useState("dark_wood");
  const [aiError, setAiError] = useState<string | null>(null);

  // Scraper state
  interface ScrapedProduct { name: string; description: string | null; price: number | null; category: string | null; image_url: string | null; selected: boolean; }
  const [scrapeModal, setScrapeModal] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeProducts, setScrapeProducts] = useState<ScrapedProduct[]>([]);
  const [scrapeCategories, setScrapeCategories] = useState<string[]>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeImporting, setScrapeImporting] = useState(false);
  const [scrapeDone, setScrapeDone] = useState(false);

  // AI Modifier generation state
  interface AiModGroup {
    name: string;
    type: "single_select" | "multi_select";
    required: boolean;
    min_select: number;
    max_select: number;
    product_ids: string[];
    options: { name: string; price_delta: number }[];
    selected: boolean;
  }
  const [aiModModal, setAiModModal] = useState(false);
  const [aiModLoading, setAiModLoading] = useState(false);
  const [aiModGroups, setAiModGroups] = useState<AiModGroup[]>([]);
  const [aiModError, setAiModError] = useState<string | null>(null);
  const [aiModImporting, setAiModImporting] = useState(false);

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
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name_es", { ascending: true });
    if (filterCat !== "all") q = q.eq("category_id", filterCat);
    const { data } = await q;
    if (data) setProducts(data as Product[]);
  }, [tenantId, filterCat]);

  const loadModifierGroups = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("modifier_groups")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true });
    if (data) setModifierGroups(data as ModifierGroup[]);
  }, [tenantId]);

  const loadModifierOptions = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("modifiers")
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
      .select("group_id")
      .eq("item_id", prod.id);
    setItemModGroups(data ? data.map((d: { group_id: string }) => d.group_id) : []);
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
      await supabase.from("menu_item_modifier_groups").delete().eq("item_id", itemId);
      if (itemModGroups.length > 0) {
        const rows = itemModGroups.map((gid) => ({ item_id: itemId, group_id: gid }));
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

  /* ── AI Handlers ──────────────────────────────────── */

  const handleAiGenerate = async () => {
    if (!prodForm.name_es) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: aiIngredients,
          dishName: prodForm.name_es || prodForm.name_en,
          lang: "es",
          existingDescription: prodForm.description_es || prodForm.description_en || "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI generation failed");
      }
      const data = await res.json();
      setProdForm((prev) => ({
        ...prev,
        description_es: data.es || prev.description_es,
        description_en: data.en || prev.description_en,
      }));
      if (data.image_prompt) {
        setAiImagePrompt(data.image_prompt);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error generating description";
      setAiError(message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiImage = async () => {
    if (!aiImagePrompt && !prodForm.description_es && !prodForm.name_es) return;
    setAiImageGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: aiImagePrompt,
          dishName: prodForm.name_es || prodForm.name_en,
          backgroundStyle: aiBackground,
          description: prodForm.description_es || prodForm.description_en || "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Image generation failed");
      }
      const data = await res.json();
      if (data.url) {
        setProdForm((prev) => ({ ...prev, image_url: data.url }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error generating image";
      setAiError(message);
    } finally {
      setAiImageGenerating(false);
    }
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
      name_es: g.name_es,
      name_en: g.name_en,
      required: g.required,
      min_select: g.min_select,
      max_select: g.max_select,
      sort_order: g.sort_order,
      active: g.active,
    });
    setModGroupModal(true);
  };

  const saveModGroup = async () => {
    if (!tenantId || !modGroupForm.name_es) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...modGroupForm, tenant_id: tenantId };
    if (modGroupEdit) {
      await supabase.from("modifier_groups").update(payload).eq("id", modGroupEdit.id);
    } else {
      await supabase.from("modifier_groups").insert(payload);
    }
    setModGroupModal(false);
    setSaving(false);
    await loadModifierGroups();
  };

  const deleteModGroup = async (id: string) => {
    const supabase = createClient();
    // Delete options first
    await supabase.from("modifiers").delete().eq("group_id", id);
    // Delete junction entries
    await supabase.from("menu_item_modifier_groups").delete().eq("group_id", id);
    // Delete group
    await supabase.from("modifier_groups").delete().eq("id", id);
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
      name_es: opt.name_es,
      name_en: opt.name_en,
      price_delta: opt.price_delta,
      sort_order: opt.sort_order,
      active: opt.active,
    });
    setModOptModal(true);
  };

  const saveModOpt = async () => {
    if (!tenantId || !modOptGroupId || !modOptForm.name_es) return;
    setSaving(true);
    const supabase = createClient();
    const payload = { ...modOptForm, group_id: modOptGroupId, tenant_id: tenantId };
    if (modOptEdit) {
      await supabase.from("modifiers").update(payload).eq("id", modOptEdit.id);
    } else {
      await supabase.from("modifiers").insert(payload);
    }
    setModOptModal(false);
    setSaving(false);
    await loadModifierOptions();
  };

  const deleteModOpt = async (id: string) => {
    const supabase = createClient();
    await supabase.from("modifiers").delete().eq("id", id);
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

  /* ── Modal overlay — see Overlay component defined outside ── */

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

  /* ── Scraper functions ─────────────────────────────── */

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScrapeLoading(true);
    setScrapeError(null);
    setScrapeProducts([]);
    setScrapeCategories([]);
    setScrapeDone(false);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed");
      if (!data.products || data.products.length === 0) {
        setScrapeError(t("menu.scrape_no_products"));
        return;
      }
      setScrapeProducts(data.products.map((p: Omit<ScrapedProduct, "selected">) => ({ ...p, selected: true })));
      setScrapeCategories(data.categories || []);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : t("menu.scrape_error"));
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleScrapeImport = async () => {
    if (!tenantId) return;
    const selected = scrapeProducts.filter((p) => p.selected);
    if (selected.length === 0) return;
    setScrapeImporting(true);
    try {
      const supabase = createClient();
      // Category icons mapping
      const catIcons: Record<string, string> = {
        burgers: "🍔", hamburguesas: "🍔", burger: "🍔",
        entrantes: "🥗", starters: "🥗", appetizers: "🥗", aperitivos: "🥗",
        compartir: "🫕", sharing: "🫕", para_compartir: "🫕",
        bebidas: "🥤", drinks: "🥤", refrescos: "🥤", beverages: "🥤",
        cervezas: "🍺", beers: "🍺", cerveza: "🍺",
        postres: "🍰", desserts: "🍰", dulces: "🍰",
        salsas: "🫙", sauces: "🫙", extras: "➕",
        pizzas: "🍕", pizza: "🍕", pastas: "🍝", pasta: "🍝",
        ensaladas: "🥗", salads: "🥗", carnes: "🥩", meat: "🥩",
        pescados: "🐟", fish: "🐟", mariscos: "🦐", seafood: "🦐",
        sopas: "🍜", soups: "🍜", vinos: "🍷", wines: "🍷",
        cafe: "☕", coffee: "☕", cocktails: "🍹", cocteles: "🍹",
        principales: "🍽️", mains: "🍽️", sandwiches: "🥪", wraps: "🌯",
        infantil: "👶", kids: "👶", desayunos: "🍳", breakfast: "🍳",
      };
      const getCatIcon = (name: string) => catIcons[name.toLowerCase().replace(/\s+/g, "_")] || "🍽️";

      // Create categories in order, preserving original order from source
      const uniqueCats = [...new Set(selected.map((p) => p.category).filter(Boolean))] as string[];
      const catMap: Record<string, string> = {};
      let catOrder = categories.length;
      for (const catName of uniqueCats) {
        const existing = categories.find((c) => c.name_es.toLowerCase() === catName.toLowerCase() || c.name_en.toLowerCase() === catName.toLowerCase());
        if (existing) {
          catMap[catName] = existing.id;
        } else {
          const { data: newCat } = await supabase
            .from("menu_categories")
            .insert({
              tenant_id: tenantId,
              name_es: catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase(),
              name_en: catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase(),
              icon: getCatIcon(catName),
              sort_order: catOrder++,
              active: true,
            })
            .select("id")
            .single();
          if (newCat) catMap[catName] = newCat.id;
        }
      }
      // Sort products by category, then by original order — assign sort_order
      const sorted = [...selected].sort((a, b) => {
        const catA = a.category || "";
        const catB = b.category || "";
        const idxA = uniqueCats.indexOf(catA);
        const idxB = uniqueCats.indexOf(catB);
        return idxA - idxB;
      });
      const inserts = sorted.map((p, idx) => ({
        tenant_id: tenantId,
        name_es: p.name,
        name_en: p.name,
        description_es: p.description || null,
        description_en: p.description || null,
        price: p.price || 0,
        category_id: p.category ? catMap[p.category] || null : null,
        image_url: p.image_url || null,
        available: true,
        allergens: [],
        sort_order: idx,
      }));
      const { error } = await supabase.from("menu_items").insert(inserts);
      if (error) throw error;
      // Reload
      await loadCategories();
      await loadProducts();
      setScrapeDone(true);
      setTimeout(() => {
        setScrapeModal(false);
        setScrapeUrl("");
        setScrapeProducts([]);
        setScrapeDone(false);
      }, 2000);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setScrapeImporting(false);
    }
  };

  const toggleScrapeProduct = (idx: number) => {
    setScrapeProducts((prev) => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const toggleAllScrape = (val: boolean) => {
    setScrapeProducts((prev) => prev.map((p) => ({ ...p, selected: val })));
  };

  /* ── AI Modifier Generation ─────────────────────────── */

  const handleAiModifiers = async () => {
    if (!tenantId) return;
    setAiModLoading(true);
    setAiModError(null);
    setAiModGroups([]);
    setAiModModal(true);
    try {
      // Load ALL products (ignore current category filter)
      const supabase = createClient();
      const { data: allProducts } = await supabase
        .from("menu_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name_es", { ascending: true });
      if (!allProducts || allProducts.length === 0) {
        setAiModError("No hay productos en el menu");
        setAiModLoading(false);
        return;
      }
      const productData = (allProducts as Product[]).map((p) => ({
        id: p.id,
        name: p.name_es || p.name_en,
        description: p.description_es || p.description_en || null,
        category: catName(p.category_id),
      }));
      const res = await fetch("/api/ai/modifiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate modifiers");
      }
      const data = await res.json();
      if (data.groups && Array.isArray(data.groups)) {
        setAiModGroups(data.groups.map((g: AiModGroup) => ({ ...g, selected: true })));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setAiModError(message);
    } finally {
      setAiModLoading(false);
    }
  };

  const handleAiModImport = async () => {
    if (!tenantId) return;
    const selected = aiModGroups.filter((g) => g.selected);
    if (selected.length === 0) return;
    setAiModImporting(true);
    setAiModError(null);
    try {
      const supabase = createClient();

      // Load all product IDs for validation
      const { data: allProds } = await supabase
        .from("menu_items")
        .select("id")
        .eq("tenant_id", tenantId);
      const allProductIds = new Set((allProds || []).map((p: { id: string }) => p.id));

      let sortOrder = modifierGroups.length;
      let imported = 0;
      for (const group of selected) {
        // Create modifier group
        const { data: gData, error: gErr } = await supabase
          .from("modifier_groups")
          .insert({
            tenant_id: tenantId,
            name_es: group.name,
            name_en: group.name,
            required: group.required,
            min_select: group.min_select,
            max_select: group.max_select,
            sort_order: sortOrder++,
          })
          .select("id")
          .single();
        if (gErr) {
          console.error("Failed to insert modifier group:", gErr.message, group.name);
          continue;
        }
        if (!gData) continue;
        const groupId = gData.id;
        imported++;

        // Create options
        if (group.options.length > 0) {
          const optRows = group.options.map((opt, idx) => ({
            group_id: groupId,
            tenant_id: tenantId,
            name_es: opt.name,
            name_en: opt.name,
            price_delta: opt.price_delta,
            sort_order: idx,
          }));
          const { error: optErr } = await supabase.from("modifiers").insert(optRows);
          if (optErr) console.error("Failed to insert options:", optErr.message);
        }

        // Link to products
        if (group.product_ids && group.product_ids.length > 0) {
          const validIds = group.product_ids.filter((pid) => allProductIds.has(pid));
          if (validIds.length > 0) {
            const junctionRows = validIds.map((pid) => ({
              item_id: pid,
              group_id: groupId,
            }));
            const { error: jErr } = await supabase.from("menu_item_modifier_groups").insert(junctionRows);
            if (jErr) console.error("Failed to link products:", jErr.message);
          }
        }
      }
      if (imported === 0) {
        throw new Error("No se pudieron guardar los modificadores. Verifica permisos de la base de datos.");
      }
      setAiModModal(false);
      await Promise.all([loadModifierGroups(), loadModifierOptions()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error importing";
      setAiModError(message);
    } finally {
      setAiModImporting(false);
    }
  };

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
    <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, margin: 0 }}>
          {t("menu.title")}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Import from web (items tab only) */}
          {tab === "items" && (
            <button
              style={{
                ...btnSecondary,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(59,130,246,0.08)",
                borderColor: "rgba(59,130,246,0.3)",
                color: "#3b82f6",
              }}
              onClick={() => { setScrapeModal(true); setScrapeError(null); setScrapeProducts([]); setScrapeDone(false); }}
            >
              <Globe size={16} />
              {t("menu.scrape_import")}
            </button>
          )}
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
          {/* AI Generate Modifiers (modifiers tab only) */}
          {tab === "modifiers" && (
            <button
              style={{
                ...btnSecondary,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(168,85,247,0.08)",
                borderColor: "rgba(168,85,247,0.3)",
                color: "#c084fc",
              }}
              onClick={handleAiModifiers}
              disabled={aiModLoading}
            >
              <Sparkles size={16} />
              {t("menu.ai_generate_modifiers")}
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

          {/* Products grid — grouped by category when showing all */}
          {(() => {
            // Group products by category
            const grouped: { cat: Category | null; prods: Product[] }[] = [];
            if (filterCat === "all" && !searchQuery.trim()) {
              const catMap = new Map<string, Product[]>();
              const noCat: Product[] = [];
              for (const p of filteredProducts) {
                if (p.category_id) {
                  const arr = catMap.get(p.category_id) || [];
                  arr.push(p);
                  catMap.set(p.category_id, arr);
                } else {
                  noCat.push(p);
                }
              }
              for (const cat of categories) {
                const prods = catMap.get(cat.id);
                if (prods && prods.length > 0) grouped.push({ cat, prods });
              }
              if (noCat.length > 0) grouped.push({ cat: null, prods: noCat });
            } else {
              grouped.push({ cat: null, prods: filteredProducts });
            }

            return grouped.map((group, gi) => (
              <div key={group.cat?.id || `nocat-${gi}`} style={{ marginBottom: group.cat ? 24 : 0 }}>
                {group.cat && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                    paddingBottom: 8, borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 22 }}>{group.cat.icon || "🍽️"}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      {group.cat.name_es}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>
                      ({group.prods.length})
                    </span>
                  </div>
                )}
                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
                  className="max-lg:!grid-cols-3 max-md:!grid-cols-2"
                >
            {group.prods.map((prod) => {
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
              </div>
            ));
          })()}
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
              return (g.name_es || g.name_en || "").toLowerCase().includes(searchQuery.toLowerCase());
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
                        {group.name_es || group.name_en}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                        <span style={{
                          padding: "1px 8px",
                          borderRadius: 999,
                          background: group.max_select === 1 ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                          color: group.max_select === 1 ? "#60a5fa" : "#c084fc",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                        }}>
                          {group.max_select === 1 ? t("menu.single_select") : t("menu.multi_select")}
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
                            {opt.name_es || opt.name_en}
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

            {/* ═══ AI DESCRIPTION ASSISTANT ═══ */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(168,85,247,0.08))",
                border: "1px solid rgba(249,115,22,0.25)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Sparkles size={18} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)" }}>
                  {t("menu.ai_assistant")}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  {t("menu.ai_assistant_hint")}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, fontSize: "0.7rem" }}>{t("menu.ai_ingredients")}</label>
                  <input
                    style={inputStyle}
                    placeholder={t("menu.ai_ingredients_placeholder")}
                    value={aiIngredients}
                    onChange={(e) => setAiIngredients(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAiGenerate();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !prodForm.name_es}
                  style={{
                    ...btnPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: aiGenerating || !prodForm.name_es ? 0.5 : 1,
                    cursor: aiGenerating || !prodForm.name_es ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    background: "linear-gradient(135deg, var(--accent), #a855f7)",
                  }}
                >
                  {aiGenerating ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={15} />}
                  {aiGenerating ? t("menu.ai_generating") : t("menu.ai_generate")}
                </button>
              </div>

              {aiError && (
                <div style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--danger)", fontWeight: 500 }}>
                  {aiError}
                </div>
              )}
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

            {/* ═══ AI IMAGE GENERATION ═══ */}
            <div>
              <label style={labelStyle}>{t("menu.image_url")}</label>

              {/* Background style selector */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ ...labelStyle, fontSize: "0.7rem", marginBottom: 6, display: "block" }}>
                  {t("menu.ai_bg_style")}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {AI_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.key}
                      onClick={() => setAiBackground(bg.key)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: aiBackground === bg.key ? "2px solid var(--accent)" : "1px solid var(--border)",
                        background: aiBackground === bg.key ? "rgba(249,115,22,0.12)" : "var(--bg-secondary)",
                        color: aiBackground === bg.key ? "var(--accent)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "all 0.15s",
                      }}
                    >
                      <span>{bg.emoji}</span>
                      <span>{t(bg.label)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL input + generate button + preview */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    style={inputStyle}
                    placeholder="https://..."
                    value={prodForm.image_url || ""}
                    onChange={(e) => setProdForm({ ...prodForm, image_url: e.target.value || null })}
                  />
                  <button
                    onClick={handleAiImage}
                    disabled={aiImageGenerating || !aiImagePrompt}
                    style={{
                      ...btnPrimary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: aiImageGenerating || !aiImagePrompt ? 0.5 : 1,
                      cursor: aiImageGenerating || !aiImagePrompt ? "not-allowed" : "pointer",
                      background: "linear-gradient(135deg, var(--accent), #a855f7)",
                      fontSize: "0.8rem",
                      padding: "8px 14px",
                    }}
                  >
                    {aiImageGenerating ? (
                      <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <ImageIcon size={15} />
                    )}
                    {aiImageGenerating ? t("menu.ai_image_generating") : t("menu.ai_generate_image")}
                  </button>
                  {!aiImagePrompt && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      {t("menu.ai_image_hint")}
                    </span>
                  )}
                </div>
                {prodForm.image_url ? (
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "2px solid var(--border)",
                      background: "var(--bg-secondary)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <img
                      src={prodForm.image_url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 10,
                      border: "2px dashed var(--border)",
                      background: "var(--bg-secondary)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <ImageIcon size={24} color="var(--text-muted)" />
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                      {t("menu.ai_no_image")}
                    </span>
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
                          {g.name_es || g.name_en}
                        </span>
                        <span style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                        }}>
                          {g.max_select === 1 ? t("menu.single_select") : t("menu.multi_select")}
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
            {/* Name ES */}
            <div>
              <label style={labelStyle}>{t("menu.modifier_name")} (ES) *</label>
              <input
                style={inputStyle}
                value={modGroupForm.name_es}
                onChange={(e) => setModGroupForm({ ...modGroupForm, name_es: e.target.value })}
                placeholder={t("menu.modifier_name_placeholder")}
              />
            </div>
            {/* Name EN */}
            <div>
              <label style={labelStyle}>{t("menu.modifier_name")} (EN)</label>
              <input
                style={inputStyle}
                value={modGroupForm.name_en}
                onChange={(e) => setModGroupForm({ ...modGroupForm, name_en: e.target.value })}
                placeholder="English name"
              />
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
              <label style={labelStyle}>{t("menu.option_name")} (ES) *</label>
              <input
                style={inputStyle}
                value={modOptForm.name_es}
                onChange={(e) => setModOptForm({ ...modOptForm, name_es: e.target.value })}
                placeholder={t("menu.option_name_placeholder")}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("menu.option_name")} (EN)</label>
              <input
                style={inputStyle}
                value={modOptForm.name_en}
                onChange={(e) => setModOptForm({ ...modOptForm, name_en: e.target.value })}
                placeholder="English name"
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

      {/* ── Scraper Modal ──────────────────────────────── */}
      {scrapeModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => !scrapeLoading && !scrapeImporting && setScrapeModal(false)} />
          <div style={{
            position: "relative", background: "var(--bg-card)", borderRadius: 16, width: "90%", maxWidth: 800,
            maxHeight: "85vh", display: "flex", flexDirection: "column", border: "1px solid var(--border)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Globe size={22} style={{ color: "#3b82f6" }} />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{t("menu.scrape_title")}</h2>
              </div>
              <button onClick={() => !scrapeLoading && !scrapeImporting && setScrapeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                <XIcon size={20} />
              </button>
            </div>

            {/* URL input */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px" }}>{t("menu.scrape_hint")}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder={t("menu.scrape_url_placeholder")}
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                  disabled={scrapeLoading}
                />
                <button
                  style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6, opacity: scrapeLoading ? 0.7 : 1, minWidth: 120 }}
                  onClick={handleScrape}
                  disabled={scrapeLoading || !scrapeUrl.trim()}
                >
                  {scrapeLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {scrapeLoading ? t("menu.scrape_scanning") : t("menu.scrape_import")}
                </button>
              </div>
              {scrapeError && (
                <p style={{ color: "#f87171", fontSize: 13, marginTop: 8, margin: "8px 0 0" }}>{scrapeError}</p>
              )}
            </div>

            {/* Products list */}
            {scrapeProducts.length > 0 && (
              <>
                <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {scrapeProducts.filter((p) => p.selected).length}/{scrapeProducts.length} {t("menu.scrape_found")}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: 12 }} onClick={() => toggleAllScrape(true)}>
                      {t("menu.scrape_select_all")}
                    </button>
                    <button style={{ ...btnSecondary, padding: "4px 12px", fontSize: 12 }} onClick={() => toggleAllScrape(false)}>
                      {t("menu.scrape_deselect_all")}
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
                  {scrapeProducts.map((product, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleScrapeProduct(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                        borderRadius: 10, marginBottom: 4, cursor: "pointer",
                        background: product.selected ? "rgba(59,130,246,0.06)" : "transparent",
                        border: `1px solid ${product.selected ? "rgba(59,130,246,0.2)" : "var(--border)"}`,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: product.selected ? "none" : "2px solid var(--border)",
                        background: product.selected ? "#3b82f6" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {product.selected && <Check size={14} style={{ color: "#fff" }} />}
                      </div>

                      {/* Image */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--bg-secondary)" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <ImageIcon size={20} style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {product.name}
                        </div>
                        {product.description && (
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                            {product.description}
                          </div>
                        )}
                        {product.category && (
                          <span style={{ fontSize: 11, background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "1px 8px", borderRadius: 100, marginTop: 3, display: "inline-block" }}>
                            {product.category}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      {product.price != null && (
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)", flexShrink: 0 }}>
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            {scrapeProducts.length > 0 && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  style={btnSecondary}
                  onClick={() => { setScrapeModal(false); setScrapeProducts([]); }}
                  disabled={scrapeImporting}
                >
                  {t("menu.scrape_cancel")}
                </button>
                {scrapeDone ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#22c55e", fontWeight: 600 }}>
                    <Check size={18} />
                    {scrapeProducts.filter((p) => p.selected).length} {t("menu.scrape_success")}
                  </div>
                ) : (
                  <button
                    style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6, opacity: scrapeImporting ? 0.7 : 1 }}
                    onClick={handleScrapeImport}
                    disabled={scrapeImporting || scrapeProducts.filter((p) => p.selected).length === 0}
                  >
                    {scrapeImporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {scrapeImporting ? t("menu.scrape_importing") : `${t("menu.scrape_import_selected")} (${scrapeProducts.filter((p) => p.selected).length})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── AI Modifier Generation Modal ──────────────── */}
      {aiModModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => { if (!aiModLoading && !aiModImporting) setAiModModal(false); }} />
          <div style={{
            position: "relative", background: "var(--bg-card)", borderRadius: 16, width: "90%", maxWidth: 700,
            maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--border)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.3)", padding: "1.5rem",
          }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.2rem", fontWeight: 700, margin: "0 0 16px" }}>
              <Sparkles size={20} style={{ display: "inline", marginRight: 8, color: "#c084fc" }} />
              {t("menu.ai_modifiers_preview")}
            </h2>

            {aiModLoading && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
                <p>{t("menu.ai_modifiers_loading")}</p>
                <p style={{ fontSize: "0.78rem" }}>{products.length} {t("menu.products_count") || "productos"}</p>
              </div>
            )}

            {aiModError && (
              <div style={{
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: "0.85rem", marginBottom: 12,
              }}>
                {aiModError}
              </div>
            )}

            {!aiModLoading && aiModGroups.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {aiModGroups.map((group, gi) => (
                  <div
                    key={gi}
                    style={{
                      background: group.selected ? "var(--bg-card)" : "var(--bg-secondary)",
                      border: group.selected ? "2px solid rgba(168,85,247,0.4)" : "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 14,
                      opacity: group.selected ? 1 : 0.5,
                      transition: "all 0.15s",
                    }}
                  >
                    {/* Group header with checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <button
                        onClick={() => setAiModGroups((prev) => prev.map((g, i) => i === gi ? { ...g, selected: !g.selected } : g))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        {group.selected
                          ? <CheckSquare size={20} style={{ color: "#c084fc" }} />
                          : <Square size={20} style={{ color: "var(--text-muted)" }} />
                        }
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>
                          {group.name}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                          <span style={{
                            padding: "1px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600,
                            background: group.type === "single_select" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                            color: group.type === "single_select" ? "#60a5fa" : "#c084fc",
                          }}>
                            {group.type === "single_select" ? "Seleccion unica" : "Multi seleccion"}
                          </span>
                          {group.required && (
                            <span style={{
                              padding: "1px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600,
                              background: "rgba(249,115,22,0.15)", color: "var(--accent)",
                            }}>
                              {t("menu.required")}
                            </span>
                          )}
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {group.options.length} {t("menu.ai_modifiers_options")} · {group.product_ids.length} {t("menu.ai_modifiers_products")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Options list */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginLeft: 30 }}>
                      {group.options.map((opt, oi) => (
                        <span
                          key={oi}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border)",
                            fontSize: "0.78rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {opt.name}
                          {opt.price_delta > 0 && (
                            <span style={{ color: "var(--accent)", marginLeft: 4, fontWeight: 600 }}>
                              +{opt.price_delta.toFixed(2)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Import button */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button
                    style={{ ...btnSecondary }}
                    onClick={() => setAiModModal(false)}
                  >
                    {t("menu.scrape_cancel")}
                  </button>
                  <button
                    style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}
                    onClick={handleAiModImport}
                    disabled={aiModImporting || aiModGroups.filter((g) => g.selected).length === 0}
                  >
                    {aiModImporting ? (
                      <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("menu.ai_modifiers_importing")}</>
                    ) : (
                      <><Download size={16} /> {t("menu.ai_modifiers_import")} ({aiModGroups.filter((g) => g.selected).length})</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!aiModLoading && aiModGroups.length === 0 && !aiModError && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                {t("menu.no_modifier_groups")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
