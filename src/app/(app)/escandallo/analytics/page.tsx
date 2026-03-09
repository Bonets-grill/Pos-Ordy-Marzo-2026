"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Leaf, Truck, BookOpen, Bell } from "lucide-react";
import type { RecipeCostBreakdown } from "@/lib/escandallo/core/types";
import { getRecipes } from "@/lib/escandallo/recipes/service";
import { calculateRecipeCostFromDB } from "@/lib/escandallo/cost-engine/service";
import { getActiveAlerts } from "@/lib/escandallo/alerts/service";
import { formatMoney, formatPct } from "@/lib/escandallo/core/money";
import { getFoodCostHealth, getMarginHealth, RECIPE_CATEGORY_LABELS } from "@/lib/escandallo/core/constants";

const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdowns, setBreakdowns] = useState<RecipeCostBreakdown[]>([]);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState(0);

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

    const [recResult, ingCount, supCount, alertsResult] = await Promise.all([
      getRecipes(supabase, tenantId, { status: "active" }, 1, 100),
      supabase.from("esc_ingredients").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
      supabase.from("esc_suppliers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
      getActiveAlerts(supabase, tenantId),
    ]);

    setTotalIngredients(ingCount.count ?? 0);
    setTotalSuppliers(supCount.count ?? 0);
    if (alertsResult.ok && alertsResult.data) setActiveAlerts(alertsResult.data.length);

    if (recResult.ok && recResult.data) {
      const bds: RecipeCostBreakdown[] = [];
      await Promise.all(recResult.data.items.map(async (r) => {
        const costResult = await calculateRecipeCostFromDB(supabase, tenantId, r.id);
        if (costResult.ok && costResult.data) bds.push(costResult.data);
      }));
      setBreakdowns(bds);
    }

    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // KPIs
  const avgFoodCost = breakdowns.length > 0 ? breakdowns.reduce((s, b) => s + b.food_cost_pct, 0) / breakdowns.length : 0;
  const avgMargin = breakdowns.length > 0 ? breakdowns.reduce((s, b) => s + b.margin_pct, 0) / breakdowns.length : 0;
  const sortedByMargin = [...breakdowns].sort((a, b) => b.margin_pct - a.margin_pct);
  const mostProfitable = sortedByMargin[0];
  const leastProfitable = sortedByMargin[sortedByMargin.length - 1];

  // Top expensive ingredients across all recipes
  const ingredientCosts = new Map<string, { name: string; totalCost: number; count: number }>();
  for (const bd of breakdowns) {
    for (const ing of bd.ingredients) {
      const existing = ingredientCosts.get(ing.ingredient_id);
      if (existing) {
        existing.totalCost += ing.line_cost;
        existing.count++;
      } else {
        ingredientCosts.set(ing.ingredient_id, { name: ing.ingredient_name, totalCost: ing.line_cost, count: 1 });
      }
    }
  }
  const topIngredients = [...ingredientCosts.values()].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);

  const fcHealth = getFoodCostHealth(avgFoodCost);
  const mHealth = getMarginHealth(avgMargin);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 24px" }}>{t("esc.analytics")}</h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: t("esc.dash.total_recipes"), value: breakdowns.length.toString(), icon: BookOpen, color: "var(--accent)" },
              { label: t("esc.dash.avg_food_cost"), value: formatPct(avgFoodCost), icon: TrendingUp, color: fcHealth.color },
              { label: t("esc.dash.avg_margin"), value: formatPct(avgMargin), icon: TrendingDown, color: mHealth.color },
              { label: t("esc.dash.total_ingredients"), value: totalIngredients.toString(), icon: Leaf, color: "var(--info)" },
              { label: t("esc.dash.total_suppliers"), value: totalSuppliers.toString(), icon: Truck, color: "var(--text-secondary)" },
              { label: t("esc.dash.active_alerts"), value: activeAlerts.toString(), icon: Bell, color: activeAlerts > 0 ? "var(--danger)" : "var(--success)" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={cardStyle}>
                <Icon size={20} style={{ color, marginBottom: 8 }} />
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Most/Least profitable */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
                {t("esc.dash.most_profitable")} / {t("esc.dash.least_profitable")}
              </h2>
              {mostProfitable && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--success)", fontSize: 14 }}>{mostProfitable.recipe_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(RECIPE_CATEGORY_LABELS[mostProfitable.category])}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--success)" }}>{formatPct(mostProfitable.margin_pct)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatMoney(mostProfitable.margin)}</div>
                  </div>
                </div>
              )}
              {leastProfitable && leastProfitable !== mostProfitable && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--danger)", fontSize: 14 }}>{leastProfitable.recipe_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(RECIPE_CATEGORY_LABELS[leastProfitable.category])}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--danger)" }}>{formatPct(leastProfitable.margin_pct)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatMoney(leastProfitable.margin)}</div>
                  </div>
                </div>
              )}
              {breakdowns.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center" }}>{t("esc.common.no_data")}</p>}
            </div>

            {/* Top ingredients by cost */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
                {t("esc.dash.expensive_ingredients")}
              </h2>
              {topIngredients.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>{t("esc.common.no_data")}</p>
              ) : (
                topIngredients.map((ing, i) => (
                  <div key={ing.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < topIngredients.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span style={{ width: 20, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{ing.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{formatMoney(ing.totalCost)}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({ing.count} rec.)</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* All recipes ranked */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
              {t("esc.recipes")} — Ranking
            </h2>
            {breakdowns.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>{t("esc.common.no_data")}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["#", t("esc.rec.name"), t("esc.rec.category"), "PVP", t("esc.cost.cost_per_portion"), "FC%", t("esc.cost.margin"), t("esc.cost.margin_pct")].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedByMargin.map((bd, i) => {
                    const fc = getFoodCostHealth(bd.food_cost_pct);
                    const mg = getMarginHealth(bd.margin_pct);
                    return (
                      <tr key={bd.recipe_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px", color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: "8px", fontWeight: 500, color: "var(--text-primary)" }}>
                          {bd.recipe_name}
                          {!bd.is_profitable && <AlertTriangle size={12} style={{ marginLeft: 4, color: "var(--danger)", verticalAlign: "middle" }} />}
                        </td>
                        <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{t(RECIPE_CATEGORY_LABELS[bd.category])}</td>
                        <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(bd.sale_price)}</td>
                        <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{formatMoney(bd.cost_per_portion)}</td>
                        <td style={{ padding: "8px", fontWeight: 600, color: fc.color }}>{formatPct(bd.food_cost_pct)}</td>
                        <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(bd.margin)}</td>
                        <td style={{ padding: "8px", fontWeight: 700, color: mg.color }}>{formatPct(bd.margin_pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
