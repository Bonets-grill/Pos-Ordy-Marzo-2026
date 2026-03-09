"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { Leaf, Truck, BookOpen, Calculator, FlaskConical, Bell, BarChart3, Warehouse } from "lucide-react";

/* Placeholder dashboard — will be replaced by Module 9 */
const MODULES = [
  { href: "/escandallo/ingredients", icon: Leaf, label: "esc.ingredients", desc: "esc.ing.search" },
  { href: "/escandallo/suppliers", icon: Truck, label: "esc.suppliers", desc: "esc.sup.search" },
  { href: "/escandallo/recipes", icon: BookOpen, label: "esc.recipes", desc: "esc.rec.search" },
  { href: "/escandallo/costing", icon: Calculator, label: "esc.costing", desc: "esc.cost.breakdown" },
  { href: "/escandallo/inventory", icon: Warehouse, label: "esc.inv.current_stock", desc: "esc.inv.movement" },
  { href: "/escandallo/simulator", icon: FlaskConical, label: "esc.simulator", desc: "esc.sim.title" },
  { href: "/escandallo/alerts", icon: Bell, label: "esc.alerts", desc: "esc.alert.title" },
  { href: "/escandallo/analytics", icon: BarChart3, label: "esc.analytics", desc: "esc.dash.cost_trend" },
];

export default function EscandalloDashboard() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>
        {t("esc.title")}
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px" }}>
        {t("esc.dashboard")}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 14,
      }}>
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.href}
              onClick={() => router.push(m.href)}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 12, padding: 20, cursor: "pointer",
                textAlign: "left", transition: "border-color 0.15s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <Icon size={24} style={{ color: "var(--accent)", marginBottom: 10 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {t(m.label)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t(m.desc)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
