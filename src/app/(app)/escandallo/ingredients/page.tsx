"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import {
  Plus, Search, X as XIcon, Edit3, Archive, ChevronDown,
  Loader2, TrendingUp, AlertTriangle, Filter,
} from "lucide-react";
import type { Ingredient, IngredientCategory, IngredientPriceHistory, UnitOfMeasure, EntityStatus } from "@/lib/escandallo/core/types";
import {
  getIngredients, getCategories, createIngredient, updateIngredient,
  archiveIngredient, createCategory, getPriceHistory,
  type IngredientInput, type IngredientFilter,
} from "@/lib/escandallo/ingredients/service";
import { UNIT_LABELS, ALL_UNITS } from "@/lib/escandallo/core/units";
import { formatMoney, formatPct } from "@/lib/escandallo/core/money";

/* ── Allergens ───────────────────────────────────────────── */
const ALLERGENS = [
  "gluten", "dairy", "nuts", "shellfish", "eggs", "soy", "fish",
  "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
];

/* ── Styles ──────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: "var(--bg-secondary)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "0.6rem 0.75rem", color: "var(--text-primary)",
  fontSize: "0.9rem", outline: "none", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
};
const btnPrimary: React.CSSProperties = {
  background: "var(--accent)", color: "#000", border: "none", borderRadius: 8,
  padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 12, padding: 20,
};

/* ── Blank ingredient ────────────────────────────────────── */
const blankIngredient: IngredientInput = {
  name: "", unit: "kg", cost_per_unit: 0, waste_pct: 0,
  density: null, category_id: null, default_supplier_id: null,
  allergens: [], notes: null, status: "active",
};

/* ── Component ───────────────────────────────────────────── */
export default function IngredientsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  // State
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<EntityStatus | "">("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IngredientInput>({ ...blankIngredient });

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");

  // Price history
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<IngredientPriceHistory[]>([]);
  const [priceIngredientName, setPriceIngredientName] = useState("");

  // ── Auth ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (u) setTenantId(u.tenant_id);
    })();
  }, [supabase]);

  // ── Load data ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    const filter: IngredientFilter = {};
    if (search) filter.search = search;
    if (filterCategory) filter.category_id = filterCategory;
    if (filterStatus) filter.status = filterStatus;

    const [ingResult, catResult] = await Promise.all([
      getIngredients(supabase, tenantId, filter, page),
      getCategories(supabase, tenantId),
    ]);

    if (ingResult.ok && ingResult.data) {
      setIngredients(ingResult.data.items);
      setTotal(ingResult.data.total);
    } else {
      setError(ingResult.error ?? "Error loading ingredients");
    }

    if (catResult.ok && catResult.data) {
      setCategories(catResult.data);
    }

    setLoading(false);
  }, [supabase, tenantId, search, filterCategory, filterStatus, page]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Debounced search ────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Handlers ────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...blankIngredient });
    setModalOpen(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      waste_pct: ing.waste_pct,
      density: ing.density,
      category_id: ing.category_id,
      default_supplier_id: ing.default_supplier_id,
      allergens: ing.allergens,
      notes: ing.notes,
      status: ing.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setError(null);

    const result = editingId
      ? await updateIngredient(supabase, tenantId, editingId, form)
      : await createIngredient(supabase, tenantId, form);

    if (result.ok) {
      setModalOpen(false);
      await loadData();
    } else {
      setError(result.error ?? "Error saving");
    }
    setSaving(false);
  };

  const handleArchive = async (id: string) => {
    if (!tenantId) return;
    const result = await archiveIngredient(supabase, tenantId, id);
    if (result.ok) await loadData();
    else setError(result.error ?? "Error archiving");
  };

  const handleCreateCategory = async () => {
    if (!tenantId || !catName.trim()) return;
    const result = await createCategory(supabase, tenantId, { name: catName.trim() });
    if (result.ok) {
      setCatModalOpen(false);
      setCatName("");
      await loadData();
    } else {
      setError(result.error ?? "Error creating category");
    }
  };

  const handleViewPriceHistory = async (ing: Ingredient) => {
    if (!tenantId) return;
    setPriceIngredientName(ing.name);
    const result = await getPriceHistory(supabase, tenantId, ing.id);
    if (result.ok && result.data) {
      setPriceHistory(result.data);
      setPriceHistoryOpen(true);
    }
  };

  const totalPages = Math.ceil(total / 25);

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {t("esc.ingredients")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {total} {t("esc.ingredients").toLowerCase()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSecondary} onClick={() => setCatModalOpen(true)}>
            <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {t("esc.ing.category")}
          </button>
          <button style={btnPrimary} onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {t("esc.ing.add")}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)",
          borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "var(--danger)",
          fontSize: 14, display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            placeholder={t("esc.ing.search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <button
          style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 4 }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} /> {t("esc.common.filter")}
          <ChevronDown size={14} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "0.2s" }} />
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>{t("esc.ing.category")}</div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              style={{ ...inputStyle, width: 180 }}
            >
              <option value="">{t("common.all")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>{t("esc.ing.status")}</div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as EntityStatus | ""); setPage(1); }}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="">{t("common.all")}</option>
              <option value="active">{t("common.active")}</option>
              <option value="inactive">{t("common.inactive")}</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : ingredients.length === 0 ? (
        /* Empty state */
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 16, color: "var(--text-muted)", margin: 0 }}>{t("esc.ing.no_ingredients")}</p>
          <button style={{ ...btnPrimary, marginTop: 16 }} onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {t("esc.ing.add")}
          </button>
        </div>
      ) : (
        /* Table */
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[t("esc.ing.name"), t("esc.ing.category"), t("esc.ing.unit"), t("esc.ing.cost"), t("esc.ing.waste"), t("esc.ing.status"), t("common.actions")].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const cat = (ing as unknown as Record<string, unknown>).esc_ingredient_categories as { name: string } | null;
                  return (
                    <tr
                      key={ing.id}
                      style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--text-primary)" }}>
                        {ing.name}
                        {ing.allergens.length > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: "var(--warning)" }}>
                            {ing.allergens.length} alerg.
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {cat?.name ?? "-"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {UNIT_LABELS[ing.unit]}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatMoney(ing.cost_per_unit)}/{UNIT_LABELS[ing.unit]}
                      </td>
                      <td style={{ padding: "12px 16px", color: ing.waste_pct > 15 ? "var(--warning)" : "var(--text-secondary)" }}>
                        {formatPct(ing.waste_pct)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 10px", borderRadius: 12,
                          fontSize: 12, fontWeight: 600,
                          background: ing.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: ing.status === "active" ? "var(--success)" : "var(--danger)",
                        }}>
                          {ing.status === "active" ? t("common.active") : t("common.inactive")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => openEdit(ing)}
                            title={t("common.edit")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleViewPriceHistory(ing)}
                            title={t("esc.ing.price_history")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
                          >
                            <TrendingUp size={16} />
                          </button>
                          <button
                            onClick={() => handleArchive(ing.id)}
                            title={t("esc.common.archive")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{ ...btnSecondary, opacity: page <= 1 ? 0.4 : 1 }}
              >
                &laquo;
              </button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                style={{ ...btnSecondary, opacity: page >= totalPages ? 0.4 : 1 }}
              >
                &raquo;
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Create/Edit Modal ──────────────────────────────── */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-primary)", borderRadius: 16, padding: 28, width: "95vw", maxWidth: 560,
            maxHeight: "90vh", overflowY: "auto", zIndex: 101, border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {editingId ? t("esc.ing.edit") : t("esc.ing.add")}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <XIcon size={20} />
              </button>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.ing.name")} *</div>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                placeholder="Tomate triturado"
              />
            </div>

            {/* Category + Unit row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={labelStyle}>{t("esc.ing.category")}</div>
                <select
                  value={form.category_id ?? ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                  style={inputStyle}
                >
                  <option value="">-- {t("common.none")} --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={labelStyle}>{t("esc.ing.unit")} *</div>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value as UnitOfMeasure })}
                  style={inputStyle}
                >
                  {ALL_UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABELS[u]} ({u})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cost + Waste row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={labelStyle}>{t("esc.ing.cost")} *</div>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.cost_per_unit}
                  onChange={(e) => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>{t("esc.ing.waste")}</div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={form.waste_pct ?? 0}
                  onChange={(e) => setForm({ ...form, waste_pct: parseFloat(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Density */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.ing.density")}</div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.density ?? ""}
                onChange={(e) => setForm({ ...form, density: e.target.value ? parseFloat(e.target.value) : null })}
                style={inputStyle}
                placeholder="1.05"
              />
            </div>

            {/* Allergens */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.ing.allergens")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ALLERGENS.map((a) => {
                  const active = (form.allergens ?? []).includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        const current = form.allergens ?? [];
                        setForm({
                          ...form,
                          allergens: active ? current.filter((x) => x !== a) : [...current, a],
                        });
                      }}
                      style={{
                        padding: "4px 10px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                        border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: active ? "var(--accent)1a" : "var(--bg-secondary)",
                        color: active ? "var(--accent)" : "var(--text-secondary)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.sup.notes")}</div>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t("esc.ing.status")}</div>
              <select
                value={form.status ?? "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value as EntityStatus })}
                style={inputStyle}
              >
                <option value="active">{t("common.active")}</option>
                <option value="inactive">{t("common.inactive")}</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnSecondary} onClick={() => setModalOpen(false)} disabled={saving}>
                {t("esc.common.cancel")}
              </button>
              <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite", verticalAlign: "middle" }} />}
                {t("esc.common.save")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Category Modal ─────────────────────────────────── */}
      {catModalOpen && (
        <>
          <div onClick={() => setCatModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-primary)", borderRadius: 16, padding: 28, width: "95vw", maxWidth: 400,
            zIndex: 101, border: "1px solid var(--border)",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
              {t("esc.ing.category")}
            </h2>
            <div style={labelStyle}>{t("esc.ing.name")}</div>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
              placeholder="Verduras, Carnes, Lacteos..."
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnSecondary} onClick={() => setCatModalOpen(false)}>{t("esc.common.cancel")}</button>
              <button style={btnPrimary} onClick={handleCreateCategory} disabled={!catName.trim()}>{t("esc.common.save")}</button>
            </div>
          </div>
        </>
      )}

      {/* ── Price History Modal ─────────────────────────────── */}
      {priceHistoryOpen && (
        <>
          <div onClick={() => setPriceHistoryOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-primary)", borderRadius: 16, padding: 28, width: "95vw", maxWidth: 500,
            maxHeight: "80vh", overflowY: "auto", zIndex: 101, border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {t("esc.ing.price_history")} — {priceIngredientName}
              </h2>
              <button onClick={() => setPriceHistoryOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <XIcon size={20} />
              </button>
            </div>

            {priceHistory.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>{t("esc.common.no_data")}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      {t("esc.cost.sale_price")}
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      {t("esc.ing.unit")}
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((ph, i) => {
                    const prev = priceHistory[i + 1];
                    const diff = prev ? ((ph.price - prev.price) / prev.price) * 100 : 0;
                    return (
                      <tr key={ph.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatMoney(ph.price)}
                          {diff !== 0 && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: diff > 0 ? "var(--danger)" : "var(--success)" }}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>
                          {UNIT_LABELS[ph.unit as UnitOfMeasure]}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>
                          {new Date(ph.recorded_at).toLocaleDateString("es-ES")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
