import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Shield,
  Users,
  ScrollText,
  Headset,
  Search,
  LogOut,
  Bot,
  LayoutGrid,
  DollarSign,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/core/auth/useAuth";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/projects", labelKey: "nav.projects", icon: FolderOpen },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: "/admin", labelKey: "nav.admin", icon: Shield, adminOnly: true },
  { to: "/admin/ai", labelKey: "nav.ai", icon: Bot, adminOnly: true },
  { to: "/admin/catalog", labelKey: "nav.catalog", icon: LayoutGrid, adminOnly: true },
  { to: "/admin/prices", labelKey: "admin.prices", icon: DollarSign, adminOnly: true },
  { to: "/admin/tenants", labelKey: "nav.tenants", icon: Users, adminOnly: true },
  { to: "/admin/inspector", labelKey: "nav.inspector", icon: Search, adminOnly: true },
  { to: "/admin/support", labelKey: "nav.support", icon: Headset, adminOnly: true },
  { to: "/admin/audit", labelKey: "nav.audit", icon: ScrollText, adminOnly: true },
  { to: "/admin/franchises", labelKey: "nav.franchises", icon: Crown, adminOnly: true },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { isSuperAdmin, logout } = useAuth();
  const location = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="h-8 w-8 rounded-lg bg-jade-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {t("app.name")}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 native-scroll">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} item={item} active={location.pathname === item.to} />
          ))}

          {isSuperAdmin && (
            <>
              <Separator className="my-3" />
              <p className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground tracking-wider">
                {t("nav.admin")}
              </p>
              {ADMIN_ITEMS.map((item) => (
                <NavLink key={item.to} item={item} active={location.pathname === item.to} />
              ))}
            </>
          )}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {t(item.labelKey)}
    </Link>
  );
}
