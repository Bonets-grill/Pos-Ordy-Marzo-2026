"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import {
  Plus, Search, X as XIcon, Edit3, Archive, Loader2,
  AlertTriangle, Link2, Unlink, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Supplier, SupplierIngredient, Ingredient, UnitOfMeasure } from "@/lib/escandallo/core/types";
import {
  getSuppliers, createSupplier, updateSupplier, archiveSupplier,
  getSupplierIngredients, linkIngredientToSupplier, unlinkIngredientFromSupplier,
  type SupplierInput,
} from "@/lib/escandallo/suppliers/service";
import { getActiveIngredients } from "@/lib/escandallo/ingredients/service";
import { UNIT_LABELS, ALL_UNITS } from "@/lib/escandallo/core/units";
import { formatMoney } from "@/lib/escandallo/core/money";

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

const blankSupplier: SupplierInput = {
  name: "", contact_name: null, phone: null, email: null,
  address: null, notes: null, status: "active",
};

export default function SuppliersPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<(Supplier & { ingredient_count?: number })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Supplier modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierInput>({ ...blankSupplier });

  // Ingredients panel
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [supplierIngredients, setSupplierIngredients] = useState<(SupplierIngredient & { ingredient_name?: string })[]>([]);
  const [allIngredients, setAllIngredients] = useState<Pick<Ingredient, "id" | "name" | "unit" | "cost_per_unit" | "waste_pct">[]>([]);
  const [linkingOpen, setLinkingOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ ingredient_id: "", price: 0, unit: "kg" as UnitOfMeasure });

  // Auth
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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
    const result = await getSuppliers(supabase, tenantId, { search: search || undefined }, page);
    if (result.ok && result.data) {
      setSuppliers(result.data.items);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [supabase, tenantId, search, page]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load supplier ingredients when expanded
  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!tenantId) return;
    const [siResult, ingResult] = await Promise.all([
      getSupplierIngredients(supabase, tenantId, id),
      getActiveIngredients(supabase, tenantId),
    ]);
    if (siResult.ok && siResult.data) setSupplierIngredients(siResult.data);
    if (ingResult.ok && ingResult.data) setAllIngredients(ingResult.data);
  };

  // Handlers
  const openCreate = () => { setEditingId(null); setForm({ ...blankSupplier }); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({ name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email, address: s.address, notes: s.notes, status: s.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setError(null);
    const result = editingId
      ? await updateSupplier(supabase, tenantId, editingId, form)
      : await createSupplier(supabase, tenantId, form);
    if (result.ok) { setModalOpen(false); await loadData(); }
    else setError(result.error ?? "Error");
    setSaving(false);
  };

  const handleArchive = async (id: string) => {
    if (!tenantId) return;
    const result = await archiveSupplier(supabase, tenantId, id);
    if (result.ok) await loadData();
    else setError(result.error ?? "Error");
  };

  const handleLinkIngredient = async () => {
    if (!tenantId || !expandedId || !linkForm.ingredient_id) return;
    const result = await linkIngredientToSupplier(supabase, tenantId, {
      supplier_id: expandedId, ingredient_id: linkForm.ingredient_id,
      price: linkForm.price, unit: linkForm.unit,
    });
    if (result.ok) {
      setLinkingOpen(false);
      setLinkForm({ ingredient_id: "", price: 0, unit: "kg" });
      const siResult = await getSupplierIngredients(supabase, tenantId, expandedId);
      if (siResult.ok && siResult.data) setSupplierIngredients(siResult.data);
    } else setError(result.error ?? "Error");
  };

  const handleUnlink = async (siId: string) => {
    if (!tenantId || !expandedId) return;
    const result = await unlinkIngredientFromSupplier(supabase, tenantId, siId);
    if (result.ok) {
      const siResult = await getSupplierIngredients(supabase, tenantId, expandedId);
      if (siResult.ok && siResult.data) setSupplierIngredients(siResult.data);
    }
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("esc.suppliers")}</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>{total} {t("esc.suppliers").toLowerCase()}</p>
        </div>
        <button style={btnPrimary} onClick={openCreate}>
          <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.sup.add")}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "var(--danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}><XIcon size={16} /></button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 400 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input placeholder={t("esc.sup.search")} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 16, color: "var(--text-muted)", margin: 0 }}>{t("esc.sup.no_suppliers")}</p>
          <button style={{ ...btnPrimary, marginTop: 16 }} onClick={openCreate}>
            <Plus size={16} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.sup.add")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suppliers.map((s) => {
            const isExpanded = expandedId === s.id;
            return (
              <div key={s.id} style={{ ...cardStyle, padding: 0 }}>
                {/* Supplier row */}
                <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: 16, cursor: "pointer" }}
                  onClick={() => toggleExpand(s.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ") || "-"}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                      {(s as unknown as Record<string, unknown>).ingredient_count as number ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("esc.sup.ingredients_count")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
                      <Edit3 size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleArchive(s.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>
                      <Archive size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={18} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />}
                  </div>
                </div>

                {/* Expanded: linked ingredients */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                        {t("esc.sup.ingredients_count")} ({supplierIngredients.length})
                      </span>
                      <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }} onClick={() => setLinkingOpen(true)}>
                        <Link2 size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> {t("esc.rec.add_ingredient")}
                      </button>
                    </div>

                    {supplierIngredients.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 12 }}>{t("esc.common.no_data")}</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {[t("esc.ing.name"), t("esc.ing.cost"), t("esc.ing.unit"), t("esc.sup.last_price"), ""].map((h) => (
                              <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {supplierIngredients.map((si) => (
                            <tr key={si.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "8px 10px", color: "var(--text-primary)", fontWeight: 500 }}>{si.ingredient_name}</td>
                              <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{formatMoney(si.price)}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{UNIT_LABELS[si.unit]}</td>
                              <td style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 12 }}>
                                {si.last_price_date ? new Date(si.last_price_date).toLocaleDateString("es-ES") : "-"}
                              </td>
                              <td style={{ padding: "8px 10px" }}>
                                <button onClick={() => handleUnlink(si.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
                                  <Unlink size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Link ingredient inline form */}
                    {linkingOpen && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={labelStyle}>{t("esc.ing.name")}</div>
                          <select value={linkForm.ingredient_id} onChange={(e) => setLinkForm({ ...linkForm, ingredient_id: e.target.value })} style={inputStyle}>
                            <option value="">--</option>
                            {allIngredients.map((ig) => <option key={ig.id} value={ig.id}>{ig.name}</option>)}
                          </select>
                        </div>
                        <div style={{ width: 100 }}>
                          <div style={labelStyle}>{t("esc.ing.cost")}</div>
                          <input type="number" step="0.01" min="0" value={linkForm.price} onChange={(e) => setLinkForm({ ...linkForm, price: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                        </div>
                        <div style={{ width: 90 }}>
                          <div style={labelStyle}>{t("esc.ing.unit")}</div>
                          <select value={linkForm.unit} onChange={(e) => setLinkForm({ ...linkForm, unit: e.target.value as UnitOfMeasure })} style={inputStyle}>
                            {ALL_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                          </select>
                        </div>
                        <button style={{ ...btnPrimary, padding: "0.6rem 0.8rem" }} onClick={handleLinkIngredient} disabled={!linkForm.ingredient_id}>
                          <Plus size={16} />
                        </button>
                        <button style={{ ...btnSecondary, padding: "0.6rem 0.8rem" }} onClick={() => setLinkingOpen(false)}>
                          <XIcon size={16} />
                        </button>
                      </div>
                    )}

                    {/* Address/notes */}
                    {(s.address || s.notes) && (
                      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        {s.address && <div>{t("esc.sup.address")}: {s.address}</div>}
                        {s.notes && <div style={{ marginTop: 4 }}>{t("esc.sup.notes")}: {s.notes}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 12 }}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...btnSecondary, opacity: page <= 1 ? 0.4 : 1 }}>&laquo;</button>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", padding: "0.6rem 0" }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ ...btnSecondary, opacity: page >= totalPages ? 0.4 : 1 }}>&raquo;</button>
            </div>
          )}
        </div>
      )}

      {/* ── Supplier Create/Edit Modal ────────────────────── */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-primary)", borderRadius: 16, padding: 28, width: "95vw", maxWidth: 500,
            maxHeight: "90vh", overflowY: "auto", zIndex: 101, border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {editingId ? t("esc.sup.edit") : t("esc.sup.add")}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><XIcon size={20} /></button>
            </div>

            {[
              { key: "name", label: t("esc.sup.name"), required: true },
              { key: "contact_name", label: t("esc.sup.contact") },
              { key: "phone", label: t("esc.sup.phone") },
              { key: "email", label: t("esc.sup.email") },
              { key: "address", label: t("esc.sup.address") },
            ].map(({ key, label, required }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={labelStyle}>{label} {required && "*"}</div>
                <input
                  value={(form as unknown as Record<string, unknown>)[key] as string ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value || null })}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>{t("esc.sup.notes")}</div>
              <textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
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
