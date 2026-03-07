import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield, Users, FolderOpen, Headset, Activity,
  CreditCard, Key, Save, Check,
  ShoppingCart, DollarSign, Bot, ScrollText,
  Eye, ExternalLink, MessageSquare,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface PlatformStats {
  totalTenants: number;
  totalProjects: number;
  activeSessions: number;
  totalOrders: number;
  revenue: number;
  totalConversations: number;
  activeAgents: number;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  projectCount: number;
  userCount: number;
}

export function SuperAdmin() {
  const { t, lang } = useTranslation();
  const [stats, setStats] = useState<PlatformStats>({
    totalTenants: 0,
    totalProjects: 0,
    activeSessions: 0,
    totalOrders: 0,
    revenue: 0,
    totalConversations: 0,
    activeAgents: 0,
  });
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Stripe settings (public key only -- secrets stay server-side)
  const [stripePublicKey, setStripePublicKey] = useState("");
  const [stripeConnectedStatus, setStripeConnectedStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadStats();
    loadStripeSettings();
    loadTenants();
  }, []);

  async function loadStats() {
    const [tenantsRes, projectsRes, sessionsRes, ordersRes, franchiseClientsRes] = await Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase
        .from("support_sessions")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
      supabase.from("orders").select("amount, status"),
      supabase.from("franchise_clients").select("id, status", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const paidOrders = (ordersRes.data ?? []).filter((o) => o.status === "paid");
    const revenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    setStats({
      totalTenants: tenantsRes.count ?? 0,
      totalProjects: projectsRes.count ?? 0,
      activeSessions: sessionsRes.count ?? 0,
      totalOrders: paidOrders.length,
      revenue: revenue / 100,
      totalConversations: 0, // placeholder -- requires conversations table or edge function
      activeAgents: franchiseClientsRes.count ?? 0,
    });
  }

  async function loadTenants() {
    setTenantsLoading(true);
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (tenantData && tenantData.length > 0) {
      // Get project counts and user counts per tenant
      const tenantIds = tenantData.map((t) => t.id);
      const [projectsRes, usersRes] = await Promise.all([
        supabase.from("projects").select("tenant_id").in("tenant_id", tenantIds),
        supabase.from("profiles").select("tenant_id").in("tenant_id", tenantIds),
      ]);

      const projectCounts = new Map<string, number>();
      for (const p of projectsRes.data ?? []) {
        projectCounts.set(p.tenant_id, (projectCounts.get(p.tenant_id) || 0) + 1);
      }
      const userCounts = new Map<string, number>();
      for (const u of usersRes.data ?? []) {
        userCounts.set(u.tenant_id, (userCounts.get(u.tenant_id) || 0) + 1);
      }

      setTenants(
        tenantData.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          created_at: t.created_at,
          projectCount: projectCounts.get(t.id) || 0,
          userCount: userCounts.get(t.id) || 0,
        }))
      );
    } else {
      setTenants([]);
    }
    setTenantsLoading(false);
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

      {/* Quick Links */}
      <div className="grid gap-3 md:grid-cols-4">
        <Button variant="outline" className="justify-start gap-2" asChild>
          <Link to="/admin/tenants">
            <Users className="h-4 w-4" />
            {t("tenants.title")}
          </Link>
        </Button>
        <Button variant="outline" className="justify-start gap-2" asChild>
          <Link to="/admin/audit">
            <ScrollText className="h-4 w-4" />
            {t("audit.title")}
          </Link>
        </Button>
        <Button variant="outline" className="justify-start gap-2" asChild>
          <Link to="/admin/support">
            <Headset className="h-4 w-4" />
            {t("support.title")}
          </Link>
        </Button>
        <Button variant="outline" className="justify-start gap-2" asChild>
          <Link to="/admin/franchises">
            <Bot className="h-4 w-4" />
            {t("admin.franchise.title")}
          </Link>
        </Button>
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
              {t("admin.operational")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tenants Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("admin.recentTenants")}
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/tenants">{t("admin.viewAll")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tenants.name")}</TableHead>
                <TableHead>{t("tenants.plan")}</TableHead>
                <TableHead>{t("tenants.projects")}</TableHead>
                <TableHead>{t("tenants.users")}</TableHead>
                <TableHead>{t("tenants.created")}</TableHead>
                <TableHead>{t("projects.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("common.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                tenants.slice(0, 10).map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tenant.plan}</Badge>
                    </TableCell>
                    <TableCell>{tenant.projectCount}</TableCell>
                    <TableCell>{tenant.userCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tenant.created_at, lang)}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" title={t("common.view")} asChild>
                        <Link to={`/admin/inspector?tenant=${tenant.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                {t("admin.stripePublicKey")}
              </Label>
              <Input
                value={stripePublicKey}
                onChange={(e) => setStripePublicKey(e.target.value)}
                placeholder="pk_live_..."
                className="font-mono text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t("admin.stripeEnvHint")}
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
