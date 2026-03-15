"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  ArrowLeft,
  Stethoscope,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  ChevronDown,
  Play,
  ShieldCheck,
} from "lucide-react";

interface PhaseResult {
  phase: string;
  passed: number;
  total: number;
  failures: { test: string; detail?: string; critical?: boolean }[];
}

interface Summary {
  total: number;
  passed: number;
  failed: number;
  critical: number;
  percentage: number;
  verdict: "green" | "yellow" | "red";
  phases: PhaseResult[];
}

interface TestResult {
  phase: string;
  test: string;
  passed: boolean;
  detail?: string;
  critical?: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export default function DiagnosticsWrapper() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} /></div>}>
      <DiagnosticsPage />
    </Suspense>
  );
}

function DiagnosticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => {
    loadTenants();
    const tenantParam = searchParams.get("tenant");
    if (tenantParam) {
      setSelectedTenant(tenantParam);
      setAutoRun(true);
    }
  }, [searchParams]);

  async function loadTenants() {
    const supabase = createClient();
    const { data } = await supabase
      .from("tenants")
      .select("id, name, slug, plan")
      .order("name");
    setTenants((data || []) as Tenant[]);
    setLoading(false);
  }

  // Auto-run if tenant came from query param
  useEffect(() => {
    if (autoRun && selectedTenant && !loading && tenants.length > 0) {
      setAutoRun(false);
      runDiagnostics();
    }
  }, [autoRun, selectedTenant, loading, tenants]);

  async function runDiagnostics() {
    if (!selectedTenant) return;
    setRunning(true);
    setResults(null);
    setSummary(null);
    setExpandedPhases(new Set());

    try {
      const res = await fetch("/api/admin/qa-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: selectedTenant }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      setResults(data.results);
      setSummary(data.summary);

      // Auto-expand failed phases
      const failedPhases = new Set(
        (data.summary.phases as PhaseResult[])
          .filter(p => p.failures.length > 0)
          .map(p => p.phase)
      );
      setExpandedPhases(failedPhases);
    } catch (e: any) {
      alert(`Network error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  }

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  };

  const selectedTenantData = tenants.find(t => t.id === selectedTenant);
  const verdictConfig = {
    green: { color: "#22c55e", bg: "#22c55e15", label: "APTO PARA PRODUCCION", icon: ShieldCheck },
    yellow: { color: "#f59e0b", bg: "#f59e0b15", label: "PRODUCCION CON PRECAUCION", icon: AlertTriangle },
    red: { color: "#ef4444", bg: "#ef444415", label: "NO APTO PARA PRODUCCION", icon: XCircle },
  };

  const phaseLabels: Record<string, string> = {
    tenant: "Tenant",
    menu: "Menu",
    tables: "Mesas",
    orders: "Pedidos",
    payments: "Pagos",
    users: "Usuarios",
    whatsapp: "WhatsApp",
    integrity: "Integridad",
    system: "Sistema",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => router.push("/admin")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
        >
          <ArrowLeft size={22} />
        </button>
        <Stethoscope size={28} style={{ color: "var(--accent)" }} />
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            Diagnostics
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Audita el estado completo de un tenant
          </p>
        </div>
      </div>

      {/* Tenant selector + Run button */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end",
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: 20,
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
            Seleccionar tenant
          </label>
          <select
            value={selectedTenant}
            onChange={(e) => { setSelectedTenant(e.target.value); setResults(null); setSummary(null); }}
            style={{
              width: "100%", padding: "10px 12px",
              backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text-primary)", fontSize: 14,
            }}
          >
            <option value="">-- Selecciona un restaurante --</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.slug}) — {t.plan}</option>
            ))}
          </select>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={!selectedTenant || running}
          style={{
            padding: "10px 24px", backgroundColor: selectedTenant ? "var(--accent)" : "var(--bg-secondary)",
            color: selectedTenant ? "#fff" : "var(--text-secondary)",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: selectedTenant && !running ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
          }}
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {running ? "Ejecutando..." : "Diagnosticar"}
        </button>
      </div>

      {/* Running animation */}
      {running && (
        <div style={{
          textAlign: "center", padding: 48,
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12,
        }}>
          <Loader2 size={48} className="animate-spin" style={{ color: "var(--accent)", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 600 }}>
            Auditando {selectedTenantData?.name}...
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Revisando menu, pedidos, pagos, usuarios, WhatsApp, integridad...
          </p>
        </div>
      )}

      {/* Results */}
      {summary && results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Verdict banner */}
          {(() => {
            const v = verdictConfig[summary.verdict];
            const VIcon = v.icon;
            return (
              <div style={{
                backgroundColor: v.bg, border: `2px solid ${v.color}`,
                borderRadius: 12, padding: 24, textAlign: "center",
              }}>
                <VIcon size={40} style={{ color: v.color, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 20, fontWeight: 700, color: v.color, marginBottom: 4 }}>
                  {v.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>
                  {summary.percentage}%
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                  {summary.passed}/{summary.total} tests passed
                  {summary.critical > 0 && ` — ${summary.critical} critical`}
                </div>
              </div>
            );
          })()}

          {/* Phase breakdown */}
          {summary.phases.map((phase) => {
            const allPassed = phase.passed === phase.total;
            const hasCritical = phase.failures.some(f => f.critical);
            const expanded = expandedPhases.has(phase.phase);
            const phaseResults = results.filter(r => r.phase === phase.phase);

            return (
              <div
                key={phase.phase}
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: `1px solid ${hasCritical ? "#ef4444" : allPassed ? "var(--border)" : "#f59e0b"}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase.phase)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", border: "none", cursor: "pointer",
                    backgroundColor: "transparent", color: "var(--text-primary)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {allPassed
                      ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
                      : hasCritical
                        ? <XCircle size={18} style={{ color: "#ef4444" }} />
                        : <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
                    }
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {phaseLabels[phase.phase] || phase.phase}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {phase.passed}/{phase.total}
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    style={{
                      color: "var(--text-secondary)",
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {/* Phase details */}
                {expanded && (
                  <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--border)" }}>
                    {phaseResults.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 8,
                          padding: "8px 0", borderBottom: i < phaseResults.length - 1 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        {r.passed
                          ? <CheckCircle2 size={14} style={{ color: "#22c55e", marginTop: 2, flexShrink: 0 }} />
                          : <XCircle size={14} style={{ color: r.critical ? "#ef4444" : "#f59e0b", marginTop: 2, flexShrink: 0 }} />
                        }
                        <div>
                          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{r.test}</span>
                          {r.detail && (
                            <div style={{ fontSize: 12, color: r.passed ? "var(--text-secondary)" : r.critical ? "#ef4444" : "#f59e0b", marginTop: 2 }}>
                              {r.detail}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
