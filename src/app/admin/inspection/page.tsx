"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

interface ScenarioResultItem {
  id: string;
  name: string;
  group: string;
  status: "pass" | "fail" | "warn" | "skip" | "error";
  severity: string;
  blocks_release: boolean;
  duration_ms: number;
  assertions_total: number;
  assertions_passed: number;
  error?: string;
}

interface DBScanItem {
  id: string;
  name: string;
  status: string;
  anomalies: number;
  blocks_release: boolean;
}

interface Blocker {
  source: string;
  name: string;
  severity: string;
  reason: string;
}

interface InspectionResult {
  run_id: string;
  tenant_id: string;
  verdict: "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED";
  readiness_score: number;
  recommendation: string;
  summary: { total: number; passed: number; failed: number; warned: number; skipped: number };
  blockers: Blocker[];
  warnings: string[];
  scenario_results: ScenarioResultItem[];
  db_scans: DBScanItem[];
}

interface HistoryRun {
  id: string;
  run_type: string;
  status: string;
  scenarios_total: number;
  scenarios_passed: number;
  scenarios_failed: number;
  readiness_score: number;
  blockers: Blocker[];
  started_at: string;
  completed_at: string;
  triggered_by: string;
}

const STATUS_COLORS: Record<string, string> = {
  pass: "#22C55E",
  fail: "#EF4444",
  warn: "#F59E0B",
  skip: "#6B7280",
  error: "#EF4444",
  PASS: "#22C55E",
  PASS_WITH_WARNINGS: "#F59E0B",
  BLOCKED: "#EF4444",
};

export default function InspectionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    const { data } = await supabase.from("tenants").select("id, name, slug").eq("active", true).order("name");
    if (data) setTenants(data);
  }, [supabase]);

  useState(() => { loadTenants(); });

  const runInspection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {};
      if (tenantId) body.tenant_id = tenantId;
      else body.use_inspection_tenant = true;

      const res = await fetch("/api/admin/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || `HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!tenantId) return;
    const res = await fetch(`/api/admin/inspection?action=history&tenant_id=${tenantId}`);
    const data = await res.json();
    setHistory(data.runs || []);
  };

  const groupedScenarios = result?.scenario_results.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {} as Record<string, ScenarioResultItem[]>);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: "#F97316" }}>
        Pre-Production Inspection & Release Gate
      </h1>
      <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>
        Run comprehensive validation before promoting to production.
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #374151", background: "#1F2937", color: "#F3F4F6", fontSize: 14 }}
        >
          <option value="">Inspection Tenant (isolated)</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
          ))}
        </select>

        <button
          onClick={runInspection}
          disabled={loading}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14,
            background: loading ? "#374151" : "#F97316", color: loading ? "#9CA3AF" : "#000",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Running inspection..." : "Run Full Inspection"}
        </button>

        {tenantId && (
          <button onClick={loadHistory} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #374151", background: "transparent", color: "#9CA3AF", cursor: "pointer", fontSize: 13 }}>
            View History
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid #EF4444", color: "#EF4444", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ═══ VERDICT BANNER ═══ */}
      {result && (
        <div style={{
          padding: 20, borderRadius: 12, marginBottom: 20,
          background: `${STATUS_COLORS[result.verdict]}15`,
          border: `2px solid ${STATUS_COLORS[result.verdict]}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: STATUS_COLORS[result.verdict] }}>
                {result.verdict}
              </div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{result.recommendation}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: STATUS_COLORS[result.verdict] }}>
                {result.readiness_score}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>Readiness Score</div>
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: "Total", value: result.summary.total, color: "#F3F4F6" },
              { label: "Passed", value: result.summary.passed, color: "#22C55E" },
              { label: "Failed", value: result.summary.failed, color: "#EF4444" },
              { label: "Warnings", value: result.summary.warned, color: "#F59E0B" },
              { label: "Skipped", value: result.summary.skipped, color: "#6B7280" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BLOCKERS ═══ */}
      {result && result.blockers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#EF4444", marginBottom: 10 }}>
            Release Blockers ({result.blockers.length})
          </h2>
          {result.blockers.map((b, i) => (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 6,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
            }}>
              <div style={{ fontWeight: 700, color: "#EF4444", fontSize: 13 }}>{b.source}: {b.name}</div>
              <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{b.reason}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SCENARIO RESULTS BY GROUP ═══ */}
      {result && groupedScenarios && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F3F4F6", marginBottom: 10 }}>Scenario Results</h2>
          {Object.entries(groupedScenarios).map(([group, scenarios]) => {
            const passed = scenarios.filter((s) => s.status === "pass").length;
            const failed = scenarios.filter((s) => s.status === "fail" || s.status === "error").length;
            const isExpanded = expandedGroup === group;

            return (
              <div key={group} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 8,
                    border: "1px solid #374151", background: "#1F2937", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#F3F4F6", fontSize: 14, textTransform: "uppercase" }}>{group}</span>
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: "#22C55E" }}>{passed} pass</span>
                    {failed > 0 && <span style={{ color: "#EF4444", marginLeft: 8 }}>{failed} fail</span>}
                    <span style={{ color: "#6B7280", marginLeft: 8 }}>{scenarios.length} total</span>
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ padding: "8px 0" }}>
                    {scenarios.map((s) => (
                      <div key={s.id} style={{
                        padding: "8px 14px", display: "flex", justifyContent: "space-between",
                        alignItems: "center", borderBottom: "1px solid #1F2937",
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                            background: STATUS_COLORS[s.status], marginRight: 8,
                          }} />
                          <span style={{ color: "#F3F4F6", fontSize: 13, fontWeight: 600 }}>{s.id}</span>
                          <span style={{ color: "#9CA3AF", fontSize: 13, marginLeft: 8 }}>{s.name}</span>
                          {s.blocks_release && <span style={{ color: "#EF4444", fontSize: 10, marginLeft: 6, fontWeight: 700 }}>BLOCKER</span>}
                        </div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "#6B7280" }}>{s.assertions_passed}/{s.assertions_total}</span>
                          <span style={{ fontSize: 11, color: "#6B7280" }}>{s.duration_ms}ms</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            background: `${STATUS_COLORS[s.status]}20`, color: STATUS_COLORS[s.status],
                          }}>{s.status.toUpperCase()}</span>
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

      {/* ═══ DB SCANS ═══ */}
      {result && result.db_scans.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F3F4F6", marginBottom: 10 }}>DB Integrity Scans</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
            {result.db_scans.map((s) => (
              <div key={s.id} style={{
                padding: "10px 14px", borderRadius: 8, border: `1px solid ${STATUS_COLORS[s.status]}40`,
                background: `${STATUS_COLORS[s.status]}08`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "#F3F4F6", fontSize: 13 }}>{s.id}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: `${STATUS_COLORS[s.status]}20`, color: STATUS_COLORS[s.status],
                  }}>{s.anomalies === 0 ? "CLEAN" : `${s.anomalies} issues`}</span>
                </div>
                <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#F3F4F6", marginBottom: 10 }}>Inspection History</h2>
          {history.map((run) => (
            <div key={run.id} style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid #374151",
              background: "#1F2937", marginBottom: 6, display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <span style={{ fontWeight: 700, color: STATUS_COLORS[run.status] || "#F3F4F6", fontSize: 13 }}>
                  {run.status.toUpperCase()}
                </span>
                <span style={{ color: "#6B7280", fontSize: 12, marginLeft: 8 }}>{run.run_type}</span>
                <span style={{ color: "#6B7280", fontSize: 12, marginLeft: 8 }}>
                  {new Date(run.started_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#22C55E" }}>{run.scenarios_passed} pass</span>
                <span style={{ fontSize: 12, color: "#EF4444" }}>{run.scenarios_failed} fail</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: STATUS_COLORS[run.status] || "#F3F4F6" }}>
                  {run.readiness_score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
