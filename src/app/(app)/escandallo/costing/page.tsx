"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { Recipe, RecipeCostBreakdown } from "@/lib/escandallo/core/types";
import { getRecipes } from "@/lib/escandallo/recipes/service";
import { calculateRecipeCostFromDB, saveCostSnapshot } from "@/lib/escandallo/cost-engine/service";
import { formatMoney, formatPct } from "@/lib/escandallo/core/money";
import { RECIPE_CATEGORY_LABELS, getFoodCostHealth, getMarginHealth } from "@/lib/escandallo/core/constants";
import { UNIT_LABELS } from "@/lib/escandallo/core/units";

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12,
};
const btnPrimary: React.CSSProperties = {
  background: "var(--accent)", color: "#000", border: "none", borderRadius: 8,
  padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
};

export default function CostingPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [breakdowns, setBreakdowns] = useState<Record<string, RecipeCostBreakdown>>({});
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (u) setTenantId(u.tenant_id);
    })();
  }, [supabase]);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const result = await getRecipes(supabase, tenantId, { status: "active" }, 1, 100);
    if (result.ok && result.data) {
      setRecipes(result.data.items);
      // Calculate costs for all recipes
      const bds: Record<string, RecipeCostBreakdown> = {};
      await Promise.all(result.data.items.map(async (r) => {
        const costResult = await calculateRecipeCostFromDB(supabase, tenantId, r.id);
        if (costResult.ok && costResult.data) bds[r.id] = costResult.data;
      }));
      setBreakdowns(bds);
    }
    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleRecalculate = async (recipeId: string) => {
    if (!tenantId) return;
    setCalcLoading(recipeId);
    const result = await saveCostSnapshot(supabase, tenantId, recipeId, "manual");
    if (result.ok) {
      const costResult = await calculateRecipeCostFromDB(supabase, tenantId, recipeId);
      if (costResult.ok && costResult.data) {
        setBreakdowns((prev) => ({ ...prev, [recipeId]: costResult.data! }));
      }
    }
    setCalcLoading(null);
  };

  const handleRecalculateAll = async () => {
    if (!tenantId) return;
    setCalcLoading("all");
    for (const r of recipes) {
      await saveCostSnapshot(supabase, tenantId, r.id, "manual");
    }
    await loadData();
    setCalcLoading(null);
  };

  // Sort by food cost descending (worst first)
  const sorted = [...recipes].sort((a, b) => {
    const fcA = breakdowns[a.id]?.food_cost_pct ?? 0;
    const fcB = breakdowns[b.id]?.food_cost_pct ?? 0;
    return fcB - fcA;
  });

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("esc.costing")}</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>{t("esc.cost.breakdown")}</p>
        </div>
        <button style={{ ...btnPrimary, opacity: calcLoading ? 0.6 : 1 }} onClick={handleRecalculateAll} disabled={!!calcLoading}>
          <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: "middle", animation: calcLoading === "all" ? "spin 1s linear infinite" : "none" }} />
          {t("esc.cost.recalculate")}
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ ...cardStyle, padding: 60, textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>{t("esc.rec.no_recipes")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((r) => {
            const bd = breakdowns[r.id];
            const isExpanded = expandedId === r.id;
            const fcHealth = bd ? getFoodCostHealth(bd.food_cost_pct) : null;
            const mHealth = bd ? getMarginHealth(bd.margin_pct) : null;

            return (
              <div key={r.id} style={cardStyle}>
                {/* Summary row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: 12, cursor: "pointer", flexWrap: "wrap" }}
                >
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {t(RECIPE_CATEGORY_LABELS[r.category])} · {r.portions} {t("esc.rec.portions")}
                    </div>
                  </div>

                  {bd && (
                    <>
                      <div style={{ textAlign: "center", minWidth: 70 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{formatMoney(bd.sale_price)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>PVP</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 70 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{formatMoney(bd.cost_per_portion)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("esc.cost.cost_per_portion")}</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: fcHealth?.color }}>{formatPct(bd.food_cost_pct)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>FC%</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 70 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: mHealth?.color }}>{formatMoney(bd.margin)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatPct(bd.margin_pct)}</div>
                      </div>
                      <div style={{ minWidth: 20 }}>
                        {!bd.is_profitable && <AlertTriangle size={16} style={{ color: "var(--danger)" }} />}
                      </div>
                    </>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); handleRecalculate(r.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
                  >
                    <RefreshCw size={14} style={{ animation: calcLoading === r.id ? "spin 1s linear infinite" : "none" }} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                </div>

                {/* Expanded: cost breakdown */}
                {isExpanded && bd && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px", background: "var(--bg-secondary)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {[t("esc.ing.name"), t("esc.rec.quantity"), t("esc.ing.unit"), t("esc.ing.cost") + "/ud", t("esc.ing.waste"), t("esc.rec.total_cost"), "%"].map((h) => (
                            <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bd.ingredients.map((ing, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "8px", fontWeight: 500, color: "var(--text-primary)" }}>{ing.ingredient_name}</td>
                            <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{ing.quantity}</td>
                            <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{UNIT_LABELS[ing.unit]}</td>
                            <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{formatMoney(ing.cost_per_unit)}</td>
                            <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{formatPct(ing.waste_pct)}</td>
                            <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(ing.line_cost)}</td>
                            <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: 12 }}>
                              {bd.total_cost > 0 ? formatPct((ing.line_cost / bd.total_cost) * 100) : "-"}
                            </td>
                          </tr>
                        ))}
                        {bd.subrecipes.map((sr, i) => (
                          <tr key={`sub-${i}`} style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,229,184,0.05)" }}>
                            <td style={{ padding: "8px", fontWeight: 500, color: "var(--accent)" }}>{sr.recipe_name} (sub)</td>
                            <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{sr.quantity}</td>
                            <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{UNIT_LABELS[sr.unit]}</td>
                            <td colSpan={2}></td>
                            <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(sr.cost)}</td>
                            <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: 12 }}>
                              {bd.total_cost > 0 ? formatPct((sr.cost / bd.total_cost) * 100) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                          <td colSpan={5} style={{ padding: "10px 8px", color: "var(--text-primary)" }}>TOTAL</td>
                          <td style={{ padding: "10px 8px", color: "var(--text-primary)" }}>{formatMoney(bd.total_cost)}</td>
                          <td style={{ padding: "10px 8px", color: "var(--text-muted)" }}>100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
