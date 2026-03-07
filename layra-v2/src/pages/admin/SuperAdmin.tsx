import { useEffect, useState } from "react";
import {
  Shield, Users, FolderOpen, Headset, Activity,
  CreditCard, Key, Save, Check,
  ShoppingCart, DollarSign,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlatformStats {
  totalTenants: number;
  totalProjects: number;
  activeSessions: number;
  totalOrders: number;
  revenue: number;
}

export function SuperAdmin() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<PlatformStats>({
    totalTenants: 0,
    totalProjects: 0,
    activeSessions: 0,
    totalOrders: 0,
    revenue: 0,
  });

  // Stripe settings (public key only — secrets stay server-side)
  const [stripePublicKey, setStripePublicKey] = useState("");
  const [stripeConnectedStatus, setStripeConnectedStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadStats();
    loadStripeSettings();
  }, []);

  async function loadStats() {
    const [tenantsRes, projectsRes, sessionsRes, ordersRes] = await Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase
        .from("support_sessions")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
      supabase.from("orders").select("amount, status"),
    ]);

    const paidOrders = (ordersRes.data ?? []).filter((o) => o.status === "paid");
    const revenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    setStats({
      totalTenants: tenantsRes.count ?? 0,
      totalProjects: projectsRes.count ?? 0,
      activeSessions: sessionsRes.count ?? 0,
      totalOrders: paidOrders.length,
      revenue: revenue / 100, // cents to dollars
    });
  }

  async function loadStripeSettings() {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["stripe_public_key"]);

    if (data) {
      for (const row of data) {
        if (row.key === "stripe_public_key") setStripePublicKey(row.value);
      }
    }

    // Check if secret keys are configured (without exposing values)
    const { count } = await supabase
      .from("platform_settings")
      .select("key", { count: "exact", head: true })
      .in("key", ["stripe_secret_key", "stripe_webhook_secret"]);

    setStripeConnectedStatus((count ?? 0) >= 1 && !!stripePublicKey);
  }

  async function saveStripeSettings() {
    setSaving(true);
    if (stripePublicKey.trim()) {
      await supabase
        .from("platform_settings")
        .upsert({ key: "stripe_public_key", value: stripePublicKey }, { onConflict: "key" });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const statCards = [
    { title: t("admin.totalTenants"), value: stats.totalTenants, icon: Users },
    { title: t("admin.totalProjects"), value: stats.totalProjects, icon: FolderOpen },
    { title: t("admin.activeSessions"), value: stats.activeSessions, icon: Headset },
    { title: t("admin.totalOrders"), value: stats.totalOrders, icon: ShoppingCart },
    {
      title: t("admin.revenue"),
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  const stripeConnected = stripePublicKey && stripeConnectedStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-jade-500" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.title")}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("admin.systemHealth")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Operational
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("admin.stripeConfig")}
            </CardTitle>
            <Badge
              variant={stripeConnected ? "default" : "secondary"}
              className={stripeConnected ? "bg-green-500/10 text-green-600" : ""}
            >
              {stripeConnected ? t("admin.stripeConnected") : t("admin.stripeNotConnected")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("admin.stripeDesc")}
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Key className="h-3 w-3" />
                Publishable Key
              </Label>
              <Input
                value={stripePublicKey}
                onChange={(e) => setStripePublicKey(e.target.value)}
                placeholder="pk_live_..."
                className="font-mono text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Secret Key and Webhook Secret must be configured via environment variables on the server (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
            </p>
          </div>

          <Button
            onClick={saveStripeSettings}
            disabled={saving}
            className="gap-2"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                {t("admin.stripeSaved")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {saving ? t("common.saving") : t("admin.stripeSave")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
