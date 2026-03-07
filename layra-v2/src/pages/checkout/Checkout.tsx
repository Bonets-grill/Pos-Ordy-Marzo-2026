import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, CheckCircle2, CreditCard, ArrowLeft,
  Shield, Clock, Headset, Loader2,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/core/auth/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { getSystemById, type SystemTemplate } from "@/lib/systemCatalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function Checkout() {
  const { systemId } = useParams<{ systemId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, tenant } = useAuth();
  const session = useAuthStore((s) => s.session);
  const [system, setSystem] = useState<SystemTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (systemId) {
      const found = getSystemById(systemId);
      if (found && found.status === "available") {
        setSystem(found);
      }
    }
  }, [systemId]);

  async function handleCheckout() {
    if (!system || !session?.access_token) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ systemId: system.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        // No Stripe configured — mark as pending
        navigate("/dashboard?ordered=true");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!system) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">
              {t("checkout.notFound")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("checkout.notFoundDesc")}
            </p>
            <Button asChild>
              <Link to="/">{t("checkout.backHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not logged in — prompt to register/login
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <ShoppingCart className="h-12 w-12 text-jade-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t("checkout.loginRequired")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("checkout.loginRequiredDesc")}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/login">{t("auth.login")}</Link>
              </Button>
              <Button asChild>
                <Link to="/register">{t("auth.register")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-jade-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <span className="text-lg font-semibold">Layra</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            {t("checkout.back")}
          </Link>
        </Button>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Order Summary */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t("checkout.orderSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-jade-500/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-6 w-6 text-jade-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {t(`catalog.sys.${system.id}`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`catalog.sys.${system.id}.desc`)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {system.modules.map((mod) => (
                  <Badge key={mod} variant="outline" className="text-xs">
                    {mod.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("checkout.systemLicense")}</span>
                  <span className="font-medium">${system.price}</span>
                </div>
                {system.monthlyFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("checkout.monthlyMaintenance")}</span>
                    <span>${system.monthlyFee}/mo</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>{t("checkout.totalToday")}</span>
                  <span>${system.price}</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg p-3">
                  {error}
                </p>
              )}

              <Button
                className="w-full gap-2 h-12 text-base"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {t("checkout.pay")} — ${system.price}
              </Button>
            </CardContent>
          </Card>

          {/* Guarantees */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-jade-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t("checkout.guarantee1")}</p>
                    <p className="text-xs text-muted-foreground">{t("checkout.guarantee1Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-jade-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t("checkout.guarantee2")}</p>
                    <p className="text-xs text-muted-foreground">{t("checkout.guarantee2Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-jade-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t("checkout.guarantee3")}</p>
                    <p className="text-xs text-muted-foreground">{t("checkout.guarantee3Desc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Headset className="h-5 w-5 text-jade-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t("checkout.guarantee4")}</p>
                    <p className="text-xs text-muted-foreground">{t("checkout.guarantee4Desc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
