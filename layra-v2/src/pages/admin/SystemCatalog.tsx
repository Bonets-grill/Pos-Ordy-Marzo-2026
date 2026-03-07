import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, KanbanSquare, Receipt, UserCog, Building2,
  UtensilsCrossed, Hotel, Bike, ChefHat,
  Stethoscope, Dumbbell, Sparkles, HeartPulse,
  GraduationCap, School, BookOpen,
  Home, Building,
  CalendarCheck, SprayCan, Scale, Wrench, Briefcase,
  ShoppingCart, CreditCard, Store,
  BarChart3, LifeBuoy, Bot,
  Calculator, Wallet,
  FileText, Share2, Mic, Ticket,
  Plus, Rocket,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  SYSTEM_CATALOG,
  SYSTEM_CATEGORIES,
  type SystemCategory,
  type SystemTemplate,
} from "@/lib/systemCatalog";
import { getTemplateConfig } from "@/lib/templates/configs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, KanbanSquare, Receipt, UserCog, Building2,
  UtensilsCrossed, Hotel, Bike, ChefHat,
  Stethoscope, Dumbbell, Sparkles, HeartPulse,
  GraduationCap, School, BookOpen,
  Home, Building,
  CalendarCheck, SprayCan, Scale, Wrench, Briefcase,
  ShoppingCart, CreditCard, Store,
  BarChart3, LifeBuoy, Bot,
  Calculator, Wallet,
  FileText, Share2, Mic, Ticket,
  Code: BarChart3,
};

function getIcon(name: string) {
  return ICON_MAP[name] || BarChart3;
}

const demandColor: Record<string, string> = {
  very_high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const statusColor: Record<string, string> = {
  available: "bg-jade-100 text-jade-700 dark:bg-jade-900 dark:text-jade-300",
  coming_soon: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  in_development: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

export function SystemCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState<SystemCategory | "all">("all");

  const filtered =
    selectedCat === "all"
      ? SYSTEM_CATALOG
      : SYSTEM_CATALOG.filter((s) => s.category === selectedCat);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("catalog.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("catalog.subtitle")}
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedCat === "all" ? "default" : "outline"}
          onClick={() => setSelectedCat("all")}
        >
          {t("catalog.all")} ({SYSTEM_CATALOG.length})
        </Button>
        {SYSTEM_CATEGORIES.map((cat) => {
          const count = SYSTEM_CATALOG.filter(
            (s) => s.category === cat.id
          ).length;
          const Icon = getIcon(cat.icon);
          return (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCat === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCat(cat.id)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`catalog.cat.${cat.id}`)} ({count})
            </Button>
          );
        })}
      </div>

      {/* Systems grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((system) => (
          <SystemCard
            key={system.id}
            system={system}
            onCreateProject={() =>
              navigate(`/admin/builder/${system.id}`)
            }
          />
        ))}
      </div>
    </div>
  );
}

function SystemCard({
  system,
  onCreateProject,
}: {
  system: SystemTemplate;
  onCreateProject: () => void;
}) {
  const { t } = useTranslation();
  const Icon = getIcon(system.icon);
  const hasTemplate = !!getTemplateConfig(system.id);

  return (
    <Card className={`hover:shadow-md transition-shadow ${hasTemplate ? "ring-1 ring-jade-500/30" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-jade-500/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-jade-500" />
          </div>
          <div className="flex gap-1.5">
            <Badge variant="secondary" className={demandColor[system.demand]}>
              {t(`catalog.demand.${system.demand}`)}
            </Badge>
            <Badge variant="secondary" className={statusColor[system.status]}>
              {t(`catalog.status.${system.status}`)}
            </Badge>
          </div>
        </div>

        <h3 className="font-semibold mb-1">{t(`catalog.sys.${system.id}`)}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {t(`catalog.sys.${system.id}.desc`)}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {system.modules.slice(0, 4).map((mod) => (
            <Badge key={mod} variant="outline" className="text-xs">
              {mod.replace(/_/g, " ")}
            </Badge>
          ))}
          {system.modules.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{system.modules.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="uppercase">{system.tier}</span>
          <span>{system.markets.join(", ")}</span>
        </div>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-lg font-bold">
            {system.price === 0 ? t("catalog.free") : `$${system.price}`}
          </span>
          {system.monthlyFee > 0 && (
            <span className="text-xs text-muted-foreground">
              + ${system.monthlyFee}/mo
            </span>
          )}
        </div>

        {hasTemplate ? (
          <Button
            className="w-full gap-2 bg-jade-600 hover:bg-jade-700 text-white"
            size="sm"
            onClick={onCreateProject}
          >
            <Rocket className="h-3.5 w-3.5" />
            {t("catalog.deploy")}
          </Button>
        ) : (
          <Button
            className="w-full gap-2"
            size="sm"
            variant="outline"
            onClick={onCreateProject}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("catalog.build")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
