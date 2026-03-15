"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  ClipboardList,
  UtensilsCrossed,
  Grid3X3,
  CreditCard,
  Heart,
  BarChart3,
  Calculator,
  Settings,
  LogOut,
  Menu,
  X,
  Banknote,
  Crown,
  MessageCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { createClient } from "@/lib/supabase-browser";

/* ── Navigation config ─────────────────────────────────── */

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/pos", icon: ShoppingCart, label: "nav.pos" },
  { href: "/kds", icon: ChefHat, label: "nav.kds" },
  { href: "/orders", icon: ClipboardList, label: "nav.orders" },
  { href: "/menu", icon: UtensilsCrossed, label: "nav.menu" },
  { href: "/tables", icon: Grid3X3, label: "nav.tables" },
  { href: "/payments", icon: CreditCard, label: "nav.payments" },
  { href: "/loyalty", icon: Heart, label: "nav.loyalty" },
  { href: "/analytics", icon: BarChart3, label: "nav.analytics" },
  { href: "/cash-register", icon: Banknote, label: "nav.cash_register" },
  { href: "/escandallo", icon: Calculator, label: "nav.escandallo" },
  { href: "/whatsapp", icon: MessageCircle, label: "nav.whatsapp" },
  { href: "/admin", icon: Crown, label: "nav.admin", adminOnly: true },
  { href: "/settings", icon: Settings, label: "nav.settings" },
] as const;

const MOBILE_BAR_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
  { href: "/pos", icon: ShoppingCart, label: "nav.pos" },
  { href: "/orders", icon: ClipboardList, label: "nav.orders" },
  { href: "/kds", icon: ChefHat, label: "nav.kds" },
  { href: "/settings", icon: Settings, label: "nav.settings" },
] as const;

/* ── Component ─────────────────────────────────────────── */

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("role").eq("id", user.id).single().then(({ data }) => {
        if (data) setUserRole(data.role);
      });
    });
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) =>
    !("adminOnly" in item && item.adminOnly) || userRole === "super_admin"
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navigate = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  /* ── Desktop sidebar ─────────────────────────────────── */
  const desktopSidebar = (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 256,
        backgroundColor: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        flexDirection: "column",
        zIndex: 40,
      }}
      className="hidden md:!flex"
    >
      {/* Branding */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ShoppingCart size={28} style={{ color: "var(--accent)" }} />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Ordy POS
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                marginBottom: 2,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                backgroundColor: active ? "var(--accent)1a" : "transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget.style.backgroundColor = "var(--bg-card)");
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget.style.backgroundColor = "transparent");
              }}
            >
              <Icon size={20} />
              <span>{t(item.label)}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--text-secondary)",
            backgroundColor: "transparent",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--bg-card)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <LogOut size={20} />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );

  /* ── Mobile top header ───────────────────────────────── */
  const mobileHeader = (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        backgroundColor: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 50,
      }}
      className="flex md:!hidden"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ShoppingCart size={22} style={{ color: "var(--accent)" }} />
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Ordy POS
        </span>
      </div>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
          padding: 4,
        }}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </header>
  );

  /* ── Mobile slide-out drawer ─────────────────────────── */
  const mobileDrawer = (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="block md:!hidden"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 55,
          }}
        />
      )}

      {/* Drawer */}
      <div
        className="flex md:!hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          backgroundColor: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          zIndex: 60,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          flexDirection: "column",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShoppingCart size={24} style={{ color: "var(--accent)" }} />
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Ordy POS
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 4,
            }}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  marginBottom: 2,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  backgroundColor: active ? "var(--accent)1a" : "transparent",
                }}
              >
                <Icon size={20} />
                <span>{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer logout */}
        <div
          style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
            }}
          >
            <LogOut size={20} />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </div>
    </>
  );

  /* ── Mobile bottom tab bar ───────────────────────────── */
  const mobileBottomBar = (
    <nav
      className="flex md:!hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {MOBILE_BAR_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "6px 12px",
              color: active ? "var(--accent)" : "var(--text-secondary)",
              transition: "color 0.15s ease",
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>
              {t(item.label)}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {desktopSidebar}
      {mobileHeader}
      {mobileDrawer}
      {mobileBottomBar}
    </>
  );
}
