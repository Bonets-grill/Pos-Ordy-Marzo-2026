"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import {
  LayoutDashboard, Leaf, Truck, BookOpen, Calculator,
  Warehouse, FlaskConical, Bell, BarChart3,
} from "lucide-react";

const SUB_NAV = [
  { href: "/escandallo", icon: LayoutDashboard, label: "esc.dashboard", exact: true },
  { href: "/escandallo/ingredients", icon: Leaf, label: "esc.ingredients" },
  { href: "/escandallo/suppliers", icon: Truck, label: "esc.suppliers" },
  { href: "/escandallo/recipes", icon: BookOpen, label: "esc.recipes" },
  { href: "/escandallo/costing", icon: Calculator, label: "esc.costing" },
  { href: "/escandallo/inventory", icon: Warehouse, label: "esc.inv.current_stock" },
  { href: "/escandallo/simulator", icon: FlaskConical, label: "esc.simulator" },
  { href: "/escandallo/alerts", icon: Bell, label: "esc.alerts" },
  { href: "/escandallo/analytics", icon: BarChart3, label: "esc.analytics" },
] as const;

export default function EscandalloLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div>
      {/* Sub-navigation bar */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        overflowX: "auto",
        whiteSpace: "nowrap",
        padding: "0 16px",
      }}>
        <div style={{ display: "inline-flex", gap: 2 }}>
          {SUB_NAV.map((item) => {
            const active = isActive(item.href, "exact" in item ? item.exact : false);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 14px", border: "none", cursor: "pointer",
                  background: "none", fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={15} />
                <span className="hidden sm:!inline">{t(item.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
