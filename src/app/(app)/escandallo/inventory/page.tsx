"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { Loader2, Plus, X as XIcon, AlertTriangle, Package, ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { InventoryItem, InventoryMovement, UnitOfMeasure, MovementType } from "@/lib/escandallo/core/types";
import { getInventoryItems, getInventoryMovements, adjustStock } from "@/lib/escandallo/inventory/service";
import { getActiveIngredients } from "@/lib/escandallo/ingredients/service";
import { UNIT_LABELS, ALL_UNITS } from "@/lib/escandallo/core/units";

const inputStyle: React.CSSProperties = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", width: "100%", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
const btnPrimary: React.CSSProperties = { background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" };
const btnSecondary: React.CSSProperties = { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" };
const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };

const MOVEMENT_TYPES: { value: MovementType; label: string; icon: typeof ArrowDown }[] = [
  { value: "purchase", label: "esc.inv.purchase", icon: ArrowDown },
  { value: "sale_consumption", label: "esc.inv.consumption", icon: ArrowUp },
  { value: "waste", label: "esc.inv.waste", icon: Minus },
  { value: "adjustment", label: "esc.inv.adjustment", icon: Package },
];

export default function InventoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<(InventoryItem & { ingredient_name?: string; ingredient_unit?: string })[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [ingredients, setIngredients] = useState<{ id: string; name: string; unit: UnitOfMeasure }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustment modal
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({ ingredient_id: "", quantity: 0, unit: "kg" as UnitOfMeasure, movement_type: "purchase" as MovementType, notes: "" });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: u } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
      if (u) setTenantId(u.tenant_id);
    })();
  }, [supabase]);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [itemsRes, movRes, ingRes] = await Promise.all([
      getInventoryItems(supabase, tenantId),
      getInventoryMovements(supabase, tenantId),
      getActiveIngredients(supabase, tenantId),
    ]);
    if (itemsRes.ok && itemsRes.data) setItems(itemsRes.data);
    if (movRes.ok && movRes.data) setMovements(movRes.data);
    if (ingRes.ok && ingRes.data) setIngredients(ingRes.data as { id: string; name: string; unit: UnitOfMeasure }[]);
    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdjust = async () => {
    if (!tenantId || !adjForm.ingredient_id) return;
    const result = await adjustStock(supabase, tenantId, adjForm, userId);
    if (result.ok) { setAdjOpen(false); setAdjForm({ ingredient_id: "", quantity: 0, unit: "kg", movement_type: "purchase", notes: "" }); await loadData(); }
    else setError(result.error ?? "Error");
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("esc.inv.current_stock")}</h1>
        <button style={btnPrimary} onClick={() => setAdjOpen(true)}>
          <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.inv.movement")}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "var(--danger)", fontSize: 14 }}>
          <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Stock levels */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
              {t("esc.inv.current_stock")} ({items.length})
            </h2>
            {items.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>{t("esc.common.no_data")}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[t("esc.ing.name"), t("esc.inv.current_stock"), t("esc.inv.min_stock"), t("esc.ing.unit")].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLow = item.current_stock <= item.min_stock;
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px", fontWeight: 500, color: "var(--text-primary)" }}>{item.ingredient_name}</td>
                        <td style={{ padding: "8px", fontWeight: 600, color: isLow ? "var(--danger)" : "var(--text-primary)" }}>
                          {item.current_stock.toFixed(2)}
                          {isLow && <AlertTriangle size={12} style={{ marginLeft: 4, color: "var(--danger)", verticalAlign: "middle" }} />}
                        </td>
                        <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{item.min_stock.toFixed(2)}</td>
                        <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{UNIT_LABELS[item.unit]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent movements */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
              {t("esc.inv.movement")}s ({movements.length})
            </h2>
            {movements.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>{t("esc.common.no_data")}</p>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {movements.slice(0, 20).map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                      background: m.quantity > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: m.quantity > 0 ? "var(--success)" : "var(--danger)",
                    }}>
                      {m.quantity > 0 ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{m.movement_type}</div>
                      {m.notes && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.notes}</div>}
                    </div>
                    <span style={{ fontWeight: 600, color: m.quantity > 0 ? "var(--success)" : "var(--danger)" }}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity.toFixed(2)} {UNIT_LABELS[m.unit]}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 60 }}>
                      {new Date(m.created_at).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjustment modal */}
      {adjOpen && (
        <>
          <div onClick={() => setAdjOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-primary)", borderRadius: 16, padding: 28, width: "95vw", maxWidth: 440, zIndex: 101, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>{t("esc.inv.movement")}</h2>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>{t("esc.ing.name")}</div>
              <select value={adjForm.ingredient_id} onChange={(e) => setAdjForm({ ...adjForm, ingredient_id: e.target.value })} style={inputStyle}>
                <option value="">--</option>
                {ingredients.map((ig) => <option key={ig.id} value={ig.id}>{ig.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>{t("esc.inv.movement")}</div>
              <select value={adjForm.movement_type} onChange={(e) => setAdjForm({ ...adjForm, movement_type: e.target.value as MovementType })} style={inputStyle}>
                {MOVEMENT_TYPES.map((mt) => <option key={mt.value} value={mt.value}>{t(mt.label)}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, marginBottom: 12 }}>
              <div>
                <div style={labelStyle}>{t("esc.rec.quantity")}</div>
                <input type="number" step="0.01" min="0" value={adjForm.quantity || ""} onChange={(e) => setAdjForm({ ...adjForm, quantity: parseFloat(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>{t("esc.ing.unit")}</div>
                <select value={adjForm.unit} onChange={(e) => setAdjForm({ ...adjForm, unit: e.target.value as UnitOfMeasure })} style={inputStyle}>
                  {ALL_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>{t("esc.sup.notes")}</div>
              <input value={adjForm.notes} onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnSecondary} onClick={() => setAdjOpen(false)}>{t("esc.common.cancel")}</button>
              <button style={btnPrimary} onClick={handleAdjust} disabled={!adjForm.ingredient_id || !adjForm.quantity}>{t("esc.common.save")}</button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
