import { useEffect, useState } from "react";
import {
  Crown, Users, Bot, DollarSign, Building2,
  TrendingUp, AlertCircle, CheckCircle2, PauseCircle,
  XCircle, Eye, MoreHorizontal,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Franchise {
  id: string;
  brand_name: string;
  brand_color: string;
  tier: string;
  status: string;
  royalty_pct: number;
  investment_amount: number;
  max_agents: number;
  contact_email: string | null;
  contact_phone: string | null;
  activated_at: string;
  created_at: string;
  owner_id: string;
  // joined
  client_count?: number;
  monthly_revenue?: number;
  royalty_due?: number;
}

interface FranchiseStats {
  totalFranchises: number;
  activeFranchises: number;
  totalClients: number;
  totalMonthlyRevenue: number;
  totalRoyaltyDue: number;
  totalInvestment: number;
}

const TIER_COLORS: Record<string, string> = {
  starter: "bg-blue-500/10 text-blue-600 border-blue-200",
  growth: "bg-amber-500/10 text-amber-600 border-amber-200",
  empire: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle2,
  suspended: PauseCircle,
  cancelled: XCircle,
};

export function FranchiseManager() {
  const { t } = useTranslation();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [stats, setStats] = useState<FranchiseStats>({
    totalFranchises: 0,
    activeFranchises: 0,
    totalClients: 0,
    totalMonthlyRevenue: 0,
    totalRoyaltyDue: 0,
    totalInvestment: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Load franchises
    const { data: franchiseData } = await supabase
      .from("franchises")
      .select("*")
      .order("created_at", { ascending: false });

    // Load all clients
    const { data: clientData } = await supabase
      .from("franchise_clients")
      .select("franchise_id, monthly_price, status");

    const fList = (franchiseData ?? []) as Franchise[];

    // Compute per-franchise stats
    const clientsByFranchise = new Map<string, { count: number; revenue: number }>();
    for (const c of clientData ?? []) {
      const existing = clientsByFranchise.get(c.franchise_id) || { count: 0, revenue: 0 };
      existing.count++;
      if (c.status === "active" || c.status === "trial") {
        existing.revenue += Number(c.monthly_price) || 0;
      }
      clientsByFranchise.set(c.franchise_id, existing);
    }

    for (const f of fList) {
      const cStats = clientsByFranchise.get(f.id);
      f.client_count = cStats?.count ?? 0;
      f.monthly_revenue = cStats?.revenue ?? 0;
      f.royalty_due = (f.monthly_revenue * f.royalty_pct) / 100;
    }

    setFranchises(fList);

    const active = fList.filter((f) => f.status === "active");
    setStats({
      totalFranchises: fList.length,
      activeFranchises: active.length,
      totalClients: (clientData ?? []).length,
      totalMonthlyRevenue: fList.reduce((s, f) => s + (f.monthly_revenue || 0), 0),
      totalRoyaltyDue: fList.reduce((s, f) => s + (f.royalty_due || 0), 0),
      totalInvestment: fList.reduce((s, f) => s + Number(f.investment_amount), 0),
    });

    setLoading(false);
  }

  async function toggleFranchiseStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await supabase.from("franchises").update({ status: newStatus }).eq("id", id);
    loadData();
  }

  const statCards = [
    { title: t("admin.franchise.totalFranchises"), value: stats.totalFranchises, icon: Crown, color: "text-amber-600" },
    { title: t("admin.franchise.activeNow"), value: stats.activeFranchises, icon: CheckCircle2, color: "text-emerald-600" },
    { title: t("admin.franchise.totalClients"), value: stats.totalClients, icon: Users, color: "text-blue-600" },
    { title: t("admin.franchise.monthlyRevenue"), value: `\u20AC${stats.totalMonthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-jade-600" },
    { title: t("admin.franchise.royaltyDue"), value: `\u20AC${stats.totalRoyaltyDue.toLocaleString()}`, icon: DollarSign, color: "text-purple-600" },
    { title: t("admin.franchise.totalInvestment"), value: `\u20AC${stats.totalInvestment.toLocaleString()}`, icon: Building2, color: "text-slate-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.franchise.title")}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Franchise List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.franchise.allFranchises")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
          ) : franchises.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">{t("admin.franchise.noFranchises")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">{t("admin.franchise.colBrand")}</th>
                    <th className="pb-3 font-medium">{t("admin.franchise.colTier")}</th>
                    <th className="pb-3 font-medium">{t("admin.franchise.colStatus")}</th>
                    <th className="pb-3 font-medium text-right">{t("admin.franchise.colClients")}</th>
                    <th className="pb-3 font-medium text-right">{t("admin.franchise.colRevenue")}</th>
                    <th className="pb-3 font-medium text-right">{t("admin.franchise.colRoyalty")}</th>
                    <th className="pb-3 font-medium text-right">{t("admin.franchise.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {franchises.map((f) => {
                    const StatusIcon = STATUS_ICONS[f.status] || AlertCircle;
                    return (
                      <tr key={f.id} className="hover:bg-muted/50">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: f.brand_color }}
                            >
                              {f.brand_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{f.brand_name}</div>
                              <div className="text-xs text-muted-foreground">{f.contact_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge className={TIER_COLORS[f.tier] || ""}>
                            {f.tier.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-4 w-4 ${
                              f.status === "active" ? "text-emerald-500" :
                              f.status === "suspended" ? "text-amber-500" : "text-red-500"
                            }`} />
                            <span className="capitalize">{f.status}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium">{f.client_count}</td>
                        <td className="py-3 text-right font-medium">
                          {"\u20AC"}{(f.monthly_revenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="font-medium text-purple-600">
                            {"\u20AC"}{(f.royalty_due || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">{f.royalty_pct}%</div>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleFranchiseStatus(f.id, f.status)}
                            className="h-8 text-xs"
                          >
                            {f.status === "active" ? t("admin.franchise.suspend") : t("admin.franchise.activate")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
