"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import {
  Plus, Search, X as XIcon, Edit3, Archive, Loader2,
  AlertTriangle, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import type { Recipe, RecipeCategory, UnitOfMeasure, Ingredient } from "@/lib/escandallo/core/types";
import {
  getRecipes, createRecipe, updateRecipe, archiveRecipe,
  getRecipeWithComposition, addRecipeIngredient, removeRecipeIngredient,
  addRecipeSubrecipe, removeRecipeSubrecipe, getActiveRecipes,
  type RecipeInput, type RecipeFilter, type RecipeWithComposition,
} from "@/lib/escandallo/recipes/service";
import { getActiveIngredients } from "@/lib/escandallo/ingredients/service";
import { UNIT_LABELS, ALL_UNITS } from "@/lib/escandallo/core/units";
import { formatMoney, formatPct, foodCostPct, grossMargin, marginPct } from "@/lib/escandallo/core/money";
import { RECIPE_CATEGORY_LABELS, getFoodCostHealth } from "@/lib/escandallo/core/constants";
import { calculateUnitCost, applyWaste } from "@/lib/escandallo/core/units";

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
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
};

const CATEGORIES: RecipeCategory[] = ["starter", "main", "dessert", "side", "beverage", "sauce", "base", "bread", "other"];

const blankRecipe: RecipeInput = {
  name: "", category: "main", description: null, yield_qty: 1, yield_unit: "portion",
  portions: 1, sale_price: 0, target_margin_pct: 70, image_url: null, notes: null, status: "active",
};

export default function RecipesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<RecipeCategory | "">("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeInput>({ ...blankRecipe });

  // Expanded recipe (builder)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composition, setComposition] = useState<RecipeWithComposition | null>(null);
  const [allIngredients, setAllIngredients] = useState<Pick<Ingredient, "id" | "name" | "unit" | "cost_per_unit" | "waste_pct">[]>([]);
  const [allRecipes, setAllRecipes] = useState<Pick<Recipe, "id" | "name" | "category" | "portions" | "sale_price">[]>([]);

  // Add ingredient form
  const [addIngOpen, setAddIngOpen] = useState(false);
  const [addIngForm, setAddIngForm] = useState({ ingredient_id: "", quantity: 0, unit: "g" as UnitOfMeasure });
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addSubForm, setAddSubForm] = useState({ child_recipe_id: "", quantity: 1, unit: "portion" as UnitOfMeasure });

  // Auth
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (u) setTenantId(u.tenant_id);
    })();
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const filter: RecipeFilter = {};
    if (search) filter.search = search;
    if (filterCat) filter.category = filterCat;
    const result = await getRecipes(supabase, tenantId, filter, page);
    if (result.ok && result.data) { setRecipes(result.data.items); setTotal(result.data.total); }
    setLoading(false);
  }, [supabase, tenantId, search, filterCat, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Expand recipe
  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setComposition(null); return; }
    setExpandedId(id);
    if (!tenantId) return;
    const [compResult, ingResult, recResult] = await Promise.all([
      getRecipeWithComposition(supabase, tenantId, id),
      getActiveIngredients(supabase, tenantId),
      getActiveRecipes(supabase, tenantId),
    ]);
    if (compResult.ok && compResult.data) setComposition(compResult.data);
    if (ingResult.ok && ingResult.data) setAllIngredients(ingResult.data);
    if (recResult.ok && recResult.data) setAllRecipes(recResult.data.filter((r) => r.id !== id));
  };

  const reloadComposition = async () => {
    if (!tenantId || !expandedId) return;
    const result = await getRecipeWithComposition(supabase, tenantId, expandedId);
    if (result.ok && result.data) setComposition(result.data);
  };

  // Handlers
  const openCreate = () => { setEditingId(null); setForm({ ...blankRecipe }); setModalOpen(true); };
  const openEdit = (r: Recipe) => {
    setEditingId(r.id);
    setForm({
      name: r.name, category: r.category, description: r.description, yield_qty: r.yield_qty,
      yield_unit: r.yield_unit, portions: r.portions, sale_price: r.sale_price,
      target_margin_pct: r.target_margin_pct, image_url: r.image_url, notes: r.notes, status: r.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true); setError(null);
    const result = editingId
      ? await updateRecipe(supabase, tenantId, editingId, form)
      : await createRecipe(supabase, tenantId, form, userId);
    if (result.ok) { setModalOpen(false); await loadData(); }
    else setError(result.error ?? "Error");
    setSaving(false);
  };

  const handleAddIngredient = async () => {
    if (!composition || !addIngForm.ingredient_id) return;
    const result = await addRecipeIngredient(supabase, composition.id, composition.current_version, addIngForm);
    if (result.ok) { setAddIngOpen(false); setAddIngForm({ ingredient_id: "", quantity: 0, unit: "g" }); await reloadComposition(); }
    else setError(result.error ?? "Error");
  };

  const handleRemoveIngredient = async (riId: string) => {
    const result = await removeRecipeIngredient(supabase, riId);
    if (result.ok) await reloadComposition();
  };

  const handleAddSubrecipe = async () => {
    if (!composition || !addSubForm.child_recipe_id) return;
    const result = await addRecipeSubrecipe(supabase, composition.id, composition.current_version, addSubForm);
    if (result.ok) { setAddSubOpen(false); setAddSubForm({ child_recipe_id: "", quantity: 1, unit: "portion" }); await reloadComposition(); }
    else setError(result.error ?? "Error");
  };

  const handleRemoveSubrecipe = async (srId: string) => {
    const result = await removeRecipeSubrecipe(supabase, srId);
    if (result.ok) await reloadComposition();
  };

  // Calculate inline cost for composition
  const calcLineCost = (qty: number, unit: UnitOfMeasure, ingCost: number, ingUnit: string, wastePct: number): number => {
    const cost = calculateUnitCost(ingCost, ingUnit as UnitOfMeasure, qty, unit);
    if (cost === null) return qty * ingCost; // fallback
    const adjustedQty = applyWaste(cost, wastePct);
    return adjustedQty;
  };

  const totalCost = composition?.ingredients.reduce((sum, ri) => {
    return sum + calcLineCost(ri.quantity, ri.unit, ri.ingredient_cost ?? 0, ri.ingredient_unit ?? ri.unit, ri.waste_pct_override ?? ri.ingredient_waste ?? 0);
  }, 0) ?? 0;

  const totalPages = Math.ceil(total / 25);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("esc.recipes")}</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>{total} {t("esc.recipes").toLowerCase()}</p>
        </div>
        <button style={btnPrimary} onClick={openCreate}>
          <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.rec.add")}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "var(--danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}><XIcon size={16} /></button>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input placeholder={t("esc.rec.search")} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value as RecipeCategory | ""); setPage(1); }} style={{ ...inputStyle, width: 160 }}>
          <option value="">{t("common.all")}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(RECIPE_CATEGORY_LABELS[c])}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : recipes.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 16, color: "var(--text-muted)", margin: 0 }}>{t("esc.rec.no_recipes")}</p>
          <button style={{ ...btnPrimary, marginTop: 16 }} onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.rec.add")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recipes.map((r) => {
            const isExpanded = expandedId === r.id;
            const fc = foodCostPct(totalCost, r.sale_price);
            const health = isExpanded ? getFoodCostHealth(fc) : null;

            return (
              <div key={r.id} style={{ ...cardStyle, padding: 0 }}>
                {/* Recipe row */}
                <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: 16, cursor: "pointer" }}
                  onClick={() => toggleExpand(r.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>{r.name}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: "var(--bg-secondary)", color: "var(--text-muted)",
                      }}>
                        {t(RECIPE_CATEGORY_LABELS[r.category])}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {r.portions} {t("esc.rec.portions")} · v{r.current_version}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 80 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatMoney(r.sale_price)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("esc.rec.sale_price")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                      <Edit3 size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); archiveRecipe(supabase, tenantId!, r.id).then(() => loadData()); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>
                      <Archive size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={18} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />}
                  </div>
                </div>

                {/* Expanded: Recipe Builder */}
                {isExpanded && composition && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px", background: "var(--bg-secondary)" }}>
                    {/* Cost summary bar */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                      {[
                        { label: t("esc.cost.total_cost"), value: formatMoney(totalCost) },
                        { label: t("esc.cost.cost_per_portion"), value: formatMoney(composition.portions > 0 ? totalCost / composition.portions : 0) },
                        { label: t("esc.cost.food_cost_pct"), value: formatPct(fc), color: health?.color },
                        { label: t("esc.cost.margin"), value: formatMoney(grossMargin(composition.sale_price, totalCost / (composition.portions || 1))) },
                        { label: t("esc.cost.margin_pct"), value: formatPct(marginPct(composition.sale_price, totalCost / (composition.portions || 1))) },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ minWidth: 100 }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Ingredients table */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                        {t("esc.ingredients")} ({composition.ingredients.length})
                      </span>
                      <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }} onClick={() => setAddIngOpen(true)}>
                        <Plus size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.rec.add_ingredient")}
                      </button>
                    </div>

                    {composition.ingredients.length > 0 && (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {[t("esc.ing.name"), t("esc.rec.quantity"), t("esc.ing.unit"), t("esc.ing.cost") + "/ud", t("esc.ing.waste"), t("esc.rec.total_cost"), ""].map((h) => (
                              <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {composition.ingredients.map((ri) => {
                            const lineCost = calcLineCost(ri.quantity, ri.unit, ri.ingredient_cost ?? 0, ri.ingredient_unit ?? ri.unit, ri.waste_pct_override ?? ri.ingredient_waste ?? 0);
                            return (
                              <tr key={ri.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "8px", fontWeight: 500, color: "var(--text-primary)" }}>{ri.ingredient_name}</td>
                                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{ri.quantity}</td>
                                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{UNIT_LABELS[ri.unit]}</td>
                                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{formatMoney(ri.ingredient_cost ?? 0)}</td>
                                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{formatPct(ri.waste_pct_override ?? ri.ingredient_waste ?? 0)}</td>
                                <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(lineCost)}</td>
                                <td style={{ padding: "8px" }}>
                                  <button onClick={() => handleRemoveIngredient(ri.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Add ingredient inline */}
                    {addIngOpen && (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={labelStyle}>{t("esc.ing.name")}</div>
                          <select value={addIngForm.ingredient_id} onChange={(e) => setAddIngForm({ ...addIngForm, ingredient_id: e.target.value })} style={inputStyle}>
                            <option value="">--</option>
                            {allIngredients.map((ig) => <option key={ig.id} value={ig.id}>{ig.name} ({UNIT_LABELS[ig.unit]})</option>)}
                          </select>
                        </div>
                        <div style={{ width: 80 }}>
                          <div style={labelStyle}>{t("esc.rec.quantity")}</div>
                          <input type="number" step="0.01" min="0" value={addIngForm.quantity || ""} onChange={(e) => setAddIngForm({ ...addIngForm, quantity: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                        </div>
                        <div style={{ width: 80 }}>
                          <div style={labelStyle}>{t("esc.ing.unit")}</div>
                          <select value={addIngForm.unit} onChange={(e) => setAddIngForm({ ...addIngForm, unit: e.target.value as UnitOfMeasure })} style={inputStyle}>
                            {ALL_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                          </select>
                        </div>
                        <button style={{ ...btnPrimary, padding: "0.6rem 0.8rem" }} onClick={handleAddIngredient} disabled={!addIngForm.ingredient_id || !addIngForm.quantity}>
                          <Plus size={16} />
                        </button>
                        <button style={{ ...btnSecondary, padding: "0.6rem 0.8rem" }} onClick={() => setAddIngOpen(false)}>
                          <XIcon size={16} />
                        </button>
                      </div>
                    )}

                    {/* Subrecipes */}
                    {composition.subrecipes.length > 0 && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 8, marginTop: 8 }}>
                          Sub-recetas ({composition.subrecipes.length})
                        </div>
                        {composition.subrecipes.map((sr) => (
                          <div key={sr.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{sr.child_recipe_name}</span>
                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{sr.quantity} {UNIT_LABELS[sr.unit]}</span>
                            <button onClick={() => handleRemoveSubrecipe(sr.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Add subrecipe */}
                    <div style={{ marginTop: 8 }}>
                      {!addSubOpen ? (
                        <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }} onClick={() => setAddSubOpen(true)}>
                          <Plus size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.rec.add_subrecipe")}
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={labelStyle}>Sub-receta</div>
                            <select value={addSubForm.child_recipe_id} onChange={(e) => setAddSubForm({ ...addSubForm, child_recipe_id: e.target.value })} style={inputStyle}>
                              <option value="">--</option>
                              {allRecipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          </div>
                          <div style={{ width: 80 }}>
                            <div style={labelStyle}>{t("esc.rec.quantity")}</div>
                            <input type="number" step="0.01" min="0" value={addSubForm.quantity || ""} onChange={(e) => setAddSubForm({ ...addSubForm, quantity: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                          </div>
                          <button style={{ ...btnPrimary, padding: "0.6rem 0.8rem" }} onClick={handleAddSubrecipe} disabled={!addSubForm.child_recipe_id}>
                            <Plus size={16} />
                          </button>
                          <button style={{ ...btnSecondary, padding: "0.6rem 0.8rem" }} onClick={() => setAddSubOpen(false)}>
                            <XIcon size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 12 }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...btnSecondary, opacity: page <= 1 ? 0.4 : 1 }}>&laquo;</button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", padding: "0.6rem 0" }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ ...btnSecondary, opacity: page >= totalPages ? 0.4 : 1 }}>&raquo;</button>
            </div>
          )}
        </div>
      )}

      {/* ── Create/Edit Recipe Modal ──────────────────────── */}
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
                {editingId ? t("esc.rec.edit") : t("esc.rec.add")}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><XIcon size={20} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.rec.name")} *</div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={labelStyle}>{t("esc.rec.category")} *</div>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RecipeCategory })} style={inputStyle}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t(RECIPE_CATEGORY_LABELS[c])}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>{t("esc.rec.portions")} *</div>
                <input type="number" min="1" value={form.portions} onChange={(e) => setForm({ ...form, portions: parseInt(e.target.value) || 1 })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={labelStyle}>{t("esc.rec.yield")}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" step="0.1" min="0" value={form.yield_qty} onChange={(e) => setForm({ ...form, yield_qty: parseFloat(e.target.value) || 1 })} style={{ ...inputStyle, flex: 1 }} />
                  <select value={form.yield_unit} onChange={(e) => setForm({ ...form, yield_unit: e.target.value as UnitOfMeasure })} style={{ ...inputStyle, width: 80 }}>
                    {ALL_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={labelStyle}>{t("esc.rec.sale_price")} *</div>
                <input type="number" step="0.01" min="0" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.rec.target_margin")} (%)</div>
              <input type="number" step="1" min="0" max="100" value={form.target_margin_pct} onChange={(e) => setForm({ ...form, target_margin_pct: parseFloat(e.target.value) || 70 })} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>{t("esc.rec.description")}</div>
              <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t("esc.sup.notes")}</div>
              <textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} style={{ ...inputStyle, minHeight: 40, resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnSecondary} onClick={() => setModalOpen(false)} disabled={saving}>{t("esc.common.cancel")}</button>
              <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite", verticalAlign: "middle" }} />}
                {t("esc.common.save")}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
