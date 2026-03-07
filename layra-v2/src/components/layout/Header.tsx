import { Menu, Bell } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/core/auth/useAuth";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function Header() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <LanguageSelector />
      <ThemeToggle />

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-jade-500 flex items-center justify-center text-sm font-medium text-white">
          {profile?.display_name?.charAt(0)?.toUpperCase() ?? "U"}
        </div>
        <span className="hidden text-sm font-medium md:inline-block">
          {profile?.display_name ?? t("common.loading")}
        </span>
      </div>
    </header>
  );
}
