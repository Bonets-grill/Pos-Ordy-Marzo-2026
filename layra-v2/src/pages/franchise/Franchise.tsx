import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Rocket,
  Building2,
  Bot,
  Globe,
  Users,
  Headset,
  Shield,
  Zap,
  Star,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { AGENT_CATALOG } from "@/lib/agents/catalog";

interface FranchiseTier {
  id: "starter" | "growth" | "empire";
  price: number;
  royalty: number;
  highlighted?: boolean;
}

const TIERS: FranchiseTier[] = [
  { id: "starter", price: 10000, royalty: 30 },
  { id: "growth", price: 20000, royalty: 22, highlighted: true },
  { id: "empire", price: 50000, royalty: 12 },
];

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  starter: Rocket,
  growth: Crown,
  empire: Building2,
};

export function Franchise() {
  const { t } = useTranslation();

  const premiumCount = AGENT_CATALOG.filter((a) => a.category === "premium").length;
  const totalCount = AGENT_CATALOG.length;

  return (
    <div className="min-h-screen bg-background overflow-y-auto native-scroll">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <div className="h-9 w-9 rounded-xl bg-jade-500 flex items-center justify-center">
                <span className="text-lg font-bold text-white">L</span>
              </div>
              <span className="text-xl font-semibold tracking-tight">Layra</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button asChild className="bg-jade-600 hover:bg-jade-700 text-white">
              <Link to="/register">{t("auth.register")}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
          {t("franchise.badge")}
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight">
          {t("franchise.heroTitle")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("franchise.heroSubtitle")}
        </p>

        {/* Stats */}
        <div className="mt-12 flex items-center justify-center gap-8 md:gap-16 text-center">
          <div>
            <div className="text-3xl font-bold text-jade-600">{totalCount}</div>
            <div className="text-sm text-muted-foreground">{t("franchise.statAgents")}</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-jade-600">{premiumCount}</div>
            <div className="text-sm text-muted-foreground">{t("franchise.statPremium")}</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-jade-600">5</div>
            <div className="text-sm text-muted-foreground">{t("franchise.statLangs")}</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-jade-600">24/7</div>
            <div className="text-sm text-muted-foreground">{t("franchise.statSupport")}</div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-muted/30 border-y py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">{t("franchise.tiersTitle")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t("franchise.tiersSubtitle")}
          </p>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {TIERS.map((tier) => {
              const TierIcon = TIER_ICONS[tier.id];
              const featureKeys = Array.from(
                { length: tier.id === "starter" ? 8 : tier.id === "growth" ? 10 : 12 },
                (_, i) => `franchise.${tier.id}.feat${i + 1}`
              );

              return (
                <Card
                  key={tier.id}
                  className={`relative transition-all duration-200 ${
                    tier.highlighted
                      ? "border-jade-500 shadow-xl scale-[1.02]"
                      : "hover:border-jade-500/30 hover:shadow-lg"
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-jade-500 text-white px-4">
                        {t("franchise.recommended")}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-jade-500/10 flex items-center justify-center mb-3">
                      <TierIcon className="h-7 w-7 text-jade-500" />
                    </div>
                    <CardTitle className="text-xl">{t(`franchise.${tier.id}.name`)}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(`franchise.${tier.id}.tagline`)}
                    </p>
                    <div className="mt-4">
                      <span className="text-5xl font-bold">
                        {"\u20AC"}{(tier.price).toLocaleString()}
                      </span>
                      <div className="text-sm text-muted-foreground mt-1">
                        {t("franchise.oneTime")}
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="text-sm font-semibold text-amber-600">{tier.royalty}%</span>
                        <span className="text-xs text-amber-600/80">{t("franchise.royalty")}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {featureKeys.map((key) => (
                        <li key={key} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-jade-500 shrink-0 mt-0.5" />
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full gap-2 ${
                        tier.highlighted
                          ? "bg-jade-600 hover:bg-jade-700 text-white"
                          : ""
                      }`}
                      size="lg"
                      variant={tier.highlighted ? "default" : "outline"}
                      asChild
                    >
                      <a
                        href={`https://wa.me/34600000000?text=${encodeURIComponent(
                          t(`franchise.${tier.id}.whatsapp`)
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {t("franchise.contact")}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">{t("franchise.whatYouGet")}</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {[
            { icon: Bot, key: "franchise.benefit1" },
            { icon: Globe, key: "franchise.benefit2" },
            { icon: Shield, key: "franchise.benefit3" },
            { icon: Headset, key: "franchise.benefit4" },
            { icon: Zap, key: "franchise.benefit5" },
            { icon: Users, key: "franchise.benefit6" },
            { icon: Star, key: "franchise.benefit7" },
            { icon: Building2, key: "franchise.benefit8" },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-jade-500/10 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-jade-500" />
              </div>
              <h3 className="font-semibold mb-1">{t(`${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI Section */}
      <section className="bg-muted/30 border-y py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("franchise.roiTitle")}</h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">{t("franchise.roiSubtitle")}</p>

          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-jade-600 mb-1">{"\u20AC"}2,500+</div>
                <div className="text-sm text-muted-foreground">{t("franchise.roiMonthly")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-jade-600 mb-1">85%</div>
                <div className="text-sm text-muted-foreground">{t("franchise.roiMargin")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-jade-600 mb-1">4-6</div>
                <div className="text-sm text-muted-foreground">{t("franchise.roiPayback")}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">{t("franchise.ctaTitle")}</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{t("franchise.ctaSubtitle")}</p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" className="gap-2 px-8 bg-jade-600 hover:bg-jade-700 text-white" asChild>
            <a
              href={`https://wa.me/34600000000?text=${encodeURIComponent(t("franchise.ctaWhatsapp"))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare className="h-4 w-4" />
              {t("franchise.ctaButton")}
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/agents">{t("franchise.viewAgents")}</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Layra</span>
          <span>{t("franchise.heroTitle")}</span>
        </div>
      </footer>
    </div>
  );
}
