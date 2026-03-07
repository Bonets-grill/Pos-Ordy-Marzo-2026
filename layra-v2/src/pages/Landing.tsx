import { Link } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Layers,
  Globe,
  Zap,
  Lock,
  Headset,
  CheckCircle2,
  ShoppingCart,
  Rocket,
  Star,
  Users,
  KanbanSquare,
  Receipt,
  UserCog,
  Building2,
  UtensilsCrossed,
  Hotel,
  Bike,
  ChefHat,
  Stethoscope,
  Dumbbell,
  Sparkles,
  HeartPulse,
  GraduationCap,
  School,
  BookOpen,
  Home,
  Building,
  CalendarCheck,
  SprayCan,
  Scale,
  Wrench,
  Briefcase,
  CreditCard,
  Store,
  BarChart3,
  LifeBuoy,
  Bot,
  Calculator,
  Wallet,
  FileText,
  Share2,
  Mic,
  Ticket,
  Crown,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  SYSTEM_CATALOG,
  SYSTEM_CATEGORIES,
  type SystemTemplate,
} from "@/lib/systemCatalog";
import { getTemplateConfig } from "@/lib/templates/configs";
import { PLAN_CONFIGS, type PlanId } from "@/lib/constants";
import { AGENT_CATALOG } from "@/lib/agents/catalog";
import type { AgentCatalogItem } from "@/lib/agents/types";
import type { I18nStr } from "@/lib/agents/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useState } from "react";

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
};

function getIcon(name: string) {
  return ICON_MAP[name] || BarChart3;
}

function resolveI18n(s: I18nStr | undefined, lang: string): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  return (s as Record<string, string>)[lang] || (s as Record<string, string>).es || (s as Record<string, string>).en || "";
}

export function Landing() {
  const { t } = useTranslation();
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const availableSystems = SYSTEM_CATALOG.filter((s) => s.status === "available");
  const filtered = selectedCat === "all"
    ? availableSystems
    : availableSystems.filter((s) => s.category === selectedCat);

  // Featured: top 6 by demand + price
  const featured = [...availableSystems]
    .sort((a, b) => {
      const demandOrder: Record<string, number> = { very_high: 0, high: 1, medium: 2 };
      return (demandOrder[a.demand] ?? 3) - (demandOrder[b.demand] ?? 3) || b.price - a.price;
    })
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background overflow-y-auto native-scroll">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-jade-500 flex items-center justify-center">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">
              {t("app.name")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/login">{t("auth.login")}</Link>
            </Button>
            <Button asChild className="bg-jade-600 hover:bg-jade-700 text-white">
              <Link to="/register">{t("auth.register")}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 lg:py-32 text-center">
        <Badge
          variant="secondary"
          className="mb-6 px-4 py-1.5 text-sm font-medium"
        >
          v2.0 — Enterprise Platform
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight">
          {t("app.tagline")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("landing.heroDescription")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" className="gap-2 px-8 bg-jade-600 hover:bg-jade-700 text-white" asChild>
            <Link to="/register">
              {t("landing.getStarted")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">{t("landing.signIn")}</Link>
          </Button>
        </div>

        {/* Stats bar */}
        <div className="mt-16 flex items-center justify-center gap-8 md:gap-16 text-center">
          <div>
            <div className="text-3xl font-bold text-jade-600">{availableSystems.length}</div>
            <div className="text-sm text-muted-foreground">{t("landing.systemsReady")}</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-jade-600">35+</div>
            <div className="text-sm text-muted-foreground">{t("landing.modules")}</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-jade-600">{AGENT_CATALOG.length}</div>
            <div className="text-sm text-muted-foreground">{t("landing.agentCount")}</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-jade-600">5</div>
            <div className="text-sm text-muted-foreground">{t("landing.languages")}</div>
          </div>
        </div>
      </section>

      {/* Featured Systems */}
      <section className="bg-muted/30 border-y py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="h-5 w-5 text-jade-500" />
            <h2 className="text-3xl font-bold text-center">
              {t("landing.featuredTitle")}
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t("landing.featuredSubtitle")}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((system) => (
              <SystemCard key={system.id} system={system} featured />
            ))}
          </div>
        </div>
      </section>

      {/* Full Catalog */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t("landing.availableTitle")}
        </h2>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
          {t("landing.availableSubtitle")}
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          <Button
            size="sm"
            variant={selectedCat === "all" ? "default" : "outline"}
            onClick={() => setSelectedCat("all")}
            className={selectedCat === "all" ? "bg-jade-600 hover:bg-jade-700 text-white" : ""}
          >
            {t("catalog.all")} ({availableSystems.length})
          </Button>
          {SYSTEM_CATEGORIES.map((cat) => {
            const count = availableSystems.filter((s) => s.category === cat.id).length;
            if (count === 0) return null;
            const CatIcon = getIcon(cat.icon);
            return (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCat === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCat(cat.id)}
                className={`gap-1.5 ${selectedCat === cat.id ? "bg-jade-600 hover:bg-jade-700 text-white" : ""}`}
              >
                <CatIcon className="h-3.5 w-3.5" />
                {t(`catalog.cat.${cat.id}`)} ({count})
              </Button>
            );
          })}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((system) => (
            <SystemCard key={system.id} system={system} />
          ))}
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="bg-muted/30 border-y py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-jade-500" />
            <h2 className="text-3xl font-bold text-center">
              {t("landing.agentsTitle")}
            </h2>
            <span className="text-sm text-muted-foreground">({AGENT_CATALOG.length})</span>
          </div>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t("landing.agentsSubtitle")}
          </p>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {AGENT_CATALOG.slice(0, 8).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/agents">
                <Bot className="h-4 w-4" />
                {t("landing.agentsViewAll")} ({AGENT_CATALOG.length})
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Franchise Banner */}
      <section className="container mx-auto px-4 py-20">
        <Card className="relative overflow-hidden border-jade-500/30 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-jade-500/5 to-transparent" />
          <CardContent className="relative py-12 px-8 md:px-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <Badge variant="secondary" className="text-xs">
                    {t("franchise.badge")}
                  </Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  {t("landing.franchiseTitle")}
                </h2>
                <p className="text-muted-foreground max-w-lg">
                  {t("landing.franchiseSubtitle")}
                </p>
                <div className="mt-4 flex items-center gap-6 justify-center md:justify-start text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-jade-500" />
                    White-label
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-jade-500" />
                    {AGENT_CATALOG.length} agents
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-jade-500" />
                    10-30% royalty
                  </span>
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-sm text-muted-foreground mb-1">{t("landing.franchiseFrom")}</div>
                <div className="text-4xl font-bold text-jade-600 mb-4">{"\u20AC"}10,000</div>
                <Button size="lg" className="gap-2 bg-jade-600 hover:bg-jade-700 text-white" asChild>
                  <Link to="/franchise">
                    <Crown className="h-4 w-4" />
                    {t("landing.franchiseCta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("landing.featuresTitle")}
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Shield} titleKey="landing.feat1Title" descKey="landing.feat1Desc" />
            <Feature icon={Layers} titleKey="landing.feat2Title" descKey="landing.feat2Desc" />
            <Feature icon={Headset} titleKey="landing.feat3Title" descKey="landing.feat3Desc" />
            <Feature icon={Lock} titleKey="landing.feat4Title" descKey="landing.feat4Desc" />
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t("landing.pricingTitle")}
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          {t("landing.pricingSubtitle")}
        </p>
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {(["free", "pro", "enterprise"] as PlanId[]).map((planId) => {
            const plan = PLAN_CONFIGS[planId];
            return (
              <Card
                key={planId}
                className={
                  plan.highlighted
                    ? "border-jade-500 shadow-lg relative"
                    : ""
                }
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-jade-500 text-white">
                      {t("landing.popular")}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{t(plan.nameKey)}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {plan.featuresKeys.map((key) => (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-jade-500 shrink-0" />
                        {t(key)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.highlighted ? "bg-jade-600 hover:bg-jade-700 text-white" : ""}`}
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/register">{t("landing.getStarted")}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Layra</span>
          <span>{t("app.tagline")}</span>
        </div>
      </footer>
    </div>
  );
}

/* ── System Card ── */
function SystemCard({ system, featured }: { system: SystemTemplate; featured?: boolean }) {
  const { t } = useTranslation();
  const Icon = getIcon(system.icon);
  const hasTemplate = !!getTemplateConfig(system.id);
  const isFree = system.price === 0;

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 overflow-hidden ${
      featured ? "border-jade-500/30 shadow-md" : "hover:border-jade-500/20"
    }`}>
      {/* Top color bar */}
      <div className={`h-1 w-full ${hasTemplate ? "bg-jade-500" : "bg-gray-200 dark:bg-gray-700"}`} />

      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
            hasTemplate
              ? "bg-jade-500/10 ring-1 ring-jade-500/20"
              : "bg-muted"
          }`}>
            <Icon className={`h-5 w-5 ${hasTemplate ? "text-jade-500" : "text-muted-foreground"}`} />
          </div>
          {hasTemplate && (
            <Badge className="bg-jade-500/10 text-jade-600 border-jade-200 text-[10px] gap-1">
              <Rocket className="h-3 w-3" />
              {t("landing.readyToDeploy")}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-base mb-1">
          {t(`catalog.sys.${system.id}`)}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {t(`catalog.sys.${system.id}.desc`)}
        </p>

        <div className="flex flex-wrap gap-1 mb-4">
          {system.modules.slice(0, 3).map((mod) => (
            <span
              key={mod}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground"
            >
              {mod.replace(/_/g, " ")}
            </span>
          ))}
          {system.modules.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
              +{system.modules.length - 3}
            </span>
          )}
        </div>

        <div className="border-t pt-3">
          <div className="flex items-baseline justify-between mb-3">
            {isFree ? (
              <span className="text-lg font-bold text-jade-600">{t("catalog.free")}</span>
            ) : (
              <div>
                <span className="text-xl font-bold">${system.price}</span>
                <span className="text-xs text-muted-foreground ml-1">USD</span>
              </div>
            )}
            {system.monthlyFee > 0 && (
              <span className="text-xs text-muted-foreground">
                + ${system.monthlyFee}/mo
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {hasTemplate && (
              <Button
                className="flex-1 gap-1.5 text-xs"
                size="sm"
                variant="outline"
                asChild
              >
                <Link to={`/demo/${system.id}`}>
                  {t("landing.viewDemo")}
                </Link>
              </Button>
            )}
            <Button
              className={`flex-1 gap-1.5 text-xs ${hasTemplate ? "bg-jade-600 hover:bg-jade-700 text-white" : ""}`}
              size="sm"
              variant={hasTemplate ? "default" : "outline"}
              asChild
            >
              <Link to={`/checkout/${system.id}`}>
                {hasTemplate ? (
                  <><Rocket className="h-3 w-3" /> {t("catalog.deploy")}</>
                ) : (
                  <><ShoppingCart className="h-3 w-3" /> {t("landing.buyNow")}</>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Feature Card ── */
function Feature({
  icon: Icon,
  titleKey,
  descKey,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 rounded-xl bg-jade-500/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-jade-500" />
      </div>
      <h3 className="font-semibold mb-2">{t(titleKey)}</h3>
      <p className="text-sm text-muted-foreground">{t(descKey)}</p>
    </div>
  );
}

/* ── Agent Card ── */
function AgentCard({ agent }: { agent: AgentCatalogItem }) {
  const { t, lang } = useTranslation();
  const name = resolveI18n(agent.name, lang);
  const desc = resolveI18n(agent.description, lang);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden hover:border-jade-500/20">
      <div className="h-1 w-full" style={{ background: agent.brandColor }} />
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: `${agent.brandColor}20` }}
          >
            <Bot className="h-5 w-5" style={{ color: agent.brandColor }} />
          </div>
          <div className="flex items-center gap-1.5">
            {agent.category === "premium" && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">
                {t("landing.agentPremium")}
              </Badge>
            )}
            {agent.category === "custom" && (
              <Badge className="bg-jade-500/10 text-jade-600 border-jade-200 text-[10px]">
                {t("landing.agentCustom")}
              </Badge>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-base mb-1 group-hover:text-jade-600 transition-colors">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{desc}</p>

        <div className="border-t pt-3">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-xl font-bold">{"\u20AC"}{agent.priceMonthly}</span>
              <span className="text-xs text-muted-foreground ml-1">{t("landing.agentMonth")}</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
              {t("landing.agentTrial")}
            </span>
          </div>
          <Button
            className="w-full gap-1.5 text-xs"
            size="sm"
            variant="outline"
            asChild
          >
            <Link to={`/demo/agent/${agent.id}`}>
              <Bot className="h-3 w-3" />
              {t("landing.agentViewDemo")}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
