"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Loader2, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Recipe, UnitOfMeasure } from "@/lib/escandallo/core/types";
import { getRecipes } from "@/lib/escandallo/recipes/service";
import { getRecipeWithComposition } from "@/lib/escandallo/recipes/service";
import { calculateRecipeCostFromDB } from "@/lib/escandallo/cost-engine/service";
import { simulatePriceChange, simulateCostChange, simulateQuantityChange, type SimulationComparison } from "@/lib/escandallo/simulation/service";
import type { RecipeParams, IngredientLine } from "@/lib/escandallo/cost-engine/engine";
import { formatMoney, formatPct } from "@/lib/escandallo/core/money";
import { UNIT_LABELS } from "@/lib/escandallo/core/units";

const inputStyle: React.CSSProperties = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", width: "100%", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
const btnPrimary: React.CSSProperties = { background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" };
const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };

type SimType = "price" | "cost" | "quantity";

export default function SimulatorPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [simType, setSimType] = useState<SimType>("price");
  const [recipeParams, setRecipeParams] = useState<RecipeParams | null>(null);
  const [result, setResult] = useState<SimulationComparison | null>(null);

  // Sim inputs
  const [newPrice, setNewPrice] = useState(0);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [newCost, setNewCost] = useState(0);
  const [newQty, setNewQty] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (u) setTenantId(u.tenant_id);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setLoading(true);
      const res = await getRecipes(supabase, tenantId, { status: "active" }, 1, 100);
      if (res.ok && res.data) setRecipes(res.data.items);
      setLoading(false);
    })();
  }, [supabase, tenantId]);

  const loadRecipeParams = useCallback(async (recipeId: string) => {
    if (!tenantId) return;
    const comp = await getRecipeWithComposition(supabase, tenantId, recipeId);
    if (!comp.ok || !comp.data) return;
    const c = comp.data;

    const ingredients: IngredientLine[] = c.ingredients.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      ingredient_name: ri.ingredient_name ?? "",
      quantity: ri.quantity,
      unit: ri.unit,
      cost_per_unit: ri.ingredient_cost ?? 0,
      base_unit: (ri.ingredient_unit as UnitOfMeasure) ?? ri.unit,
      waste_pct: ri.waste_pct_override ?? ri.ingredient_waste ?? 0,
    }));

    const params: RecipeParams = {
      recipe_id: c.id, recipe_name: c.name, category: c.category,
      portions: c.portions, sale_price: c.sale_price, target_margin_pct: c.target_margin_pct,
      ingredients, subrecipes: [],
    };

    setRecipeParams(params);
    setNewPrice(c.sale_price);
    setResult(null);
  }, [supabase, tenantId]);

  useEffect(() => {
    if (selectedRecipeId) loadRecipeParams(selectedRecipeId);
  }, [selectedRecipeId, loadRecipeParams]);

  const runSimulation = () => {
    if (!recipeParams) return;
    setSimulating(true);

    let comparison: SimulationComparison;

    if (simType === "price") {
      comparison = simulatePriceChange({ recipe_params: recipeParams, new_sale_price: newPrice });
    } else if (simType === "cost") {
      comparison = simulateCostChange({ recipe_params: recipeParams, ingredient_id: selectedIngredientId, new_cost_per_unit: newCost });
    } else {
      comparison = simulateQuantityChange({ recipe_params: recipeParams, ingredient_id: selectedIngredientId, new_quantity: newQty });
    }

    setResult(comparison);
    setSimulating(false);
  };

  const DeltaIndicator = ({ value, suffix = "", invert = false }: { value: number; suffix?: string; invert?: boolean }) => {
    const positive = invert ? value < 0 : value > 0;
    const color = value === 0 ? "var(--text-muted)" : positive ? "var(--success)" : "var(--danger)";
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    return (
      <span style={{ color, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icon size={14} /> {value > 0 ? "+" : ""}{value.toFixed(2)}{suffix}
      </span>
    );
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{t("esc.sim.title")}</h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>{t("esc.sim.impact")}</p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Configuration */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Configuracion</h2>

            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>{t("esc.recipes")}</div>
              <select value={selectedRecipeId} onChange={(e) => setSelectedRecipeId(e.target.value)} style={inputStyle}>
                <option value="">-- {t("esc.rec.search")} --</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.name} ({formatMoney(r.sale_price)})</option>)}
              </select>
            </div>

            {recipeParams && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={labelStyle}>Tipo de simulacion</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([
                      { value: "price" as SimType, label: t("esc.sim.change_price") },
                      { value: "cost" as SimType, label: t("esc.sim.change_cost") },
                      { value: "quantity" as SimType, label: t("esc.sim.change_qty") },
                    ]).map(({ value, label }) => (
                      <button key={value} onClick={() => { setSimType(value); setResult(null); }}
                        style={{
                          ...btnSecondary, flex: 1, fontSize: 12, padding: "6px 8px",
                          background: simType === value ? "var(--accent)1a" : "transparent",
                          color: simType === value ? "var(--accent)" : "var(--text-secondary)",
                          borderColor: simType === value ? "var(--accent)" : "var(--border)",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {simType === "price" && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>{t("esc.rec.sale_price")}</div>
                    <input type="number" step="0.01" min="0" value={newPrice} onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)} style={inputStyle} />
                  </div>
                )}

                {(simType === "cost" || simType === "quantity") && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={labelStyle}>{t("esc.ing.name")}</div>
                      <select value={selectedIngredientId} onChange={(e) => {
                        setSelectedIngredientId(e.target.value);
                        const ing = recipeParams.ingredients.find((i) => i.ingredient_id === e.target.value);
                        if (ing) { setNewCost(ing.cost_per_unit); setNewQty(ing.quantity); }
                      }} style={inputStyle}>
                        <option value="">--</option>
                        {recipeParams.ingredients.map((ig) => <option key={ig.ingredient_id} value={ig.ingredient_id}>{ig.ingredient_name}</option>)}
                      </select>
                    </div>
                    {simType === "cost" && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={labelStyle}>{t("esc.ing.cost")}</div>
                        <input type="number" step="0.0001" min="0" value={newCost} onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)} style={inputStyle} />
                      </div>
                    )}
                    {simType === "quantity" && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={labelStyle}>{t("esc.rec.quantity")}</div>
                        <input type="number" step="0.01" min="0" value={newQty} onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)} style={inputStyle} />
                      </div>
                    )}
                  </>
                )}

                <button style={{ ...btnPrimary, width: "100%" }} onClick={runSimulation}
                  disabled={!recipeParams || (simType !== "price" && !selectedIngredientId)}>
                  {t("esc.sim.run")}
                </button>
              </>
            )}
          </div>

          {/* Results */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>{t("esc.sim.impact")}</h2>

            {!result ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
                {recipeParams ? t("esc.sim.run") : t("esc.rec.search")}
              </p>
            ) : (
              <div>
                {/* Before / After comparison */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 20 }}>
                  {/* Before */}
                  <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>{t("esc.sim.before")}</div>
                    {[
                      { label: "PVP", value: formatMoney(result.before.sale_price) },
                      { label: t("esc.cost.total_cost"), value: formatMoney(result.before.total_cost) },
                      { label: "FC%", value: formatPct(result.before.food_cost_pct) },
                      { label: t("esc.cost.margin"), value: formatMoney(result.before.margin) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Arrow */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <ArrowRight size={24} style={{ color: "var(--accent)" }} />
                  </div>

                  {/* After */}
                  <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>{t("esc.sim.after")}</div>
                    {[
                      { label: "PVP", value: formatMoney(result.after.sale_price) },
                      { label: t("esc.cost.total_cost"), value: formatMoney(result.after.total_cost) },
                      { label: "FC%", value: formatPct(result.after.food_cost_pct) },
                      { label: t("esc.cost.margin"), value: formatMoney(result.after.margin) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deltas */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 8 }}>Variaciones</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("esc.cost.total_cost")}:</span> <DeltaIndicator value={result.delta_cost} suffix="€" invert /></div>
                    <div><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("esc.cost.margin")}:</span> <DeltaIndicator value={result.delta_margin} suffix="€" /></div>
                    <div><span style={{ fontSize: 12, color: "var(--text-muted)" }}>FC%:</span> <DeltaIndicator value={result.delta_food_cost_pct} suffix="pp" invert /></div>
                    <div><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("esc.cost.margin_pct")}:</span> <DeltaIndicator value={result.delta_margin_pct} suffix="pp" /></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
