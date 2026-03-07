import { useEffect, useState } from "react";
import {
  Crown, Users, Bot, DollarSign, TrendingUp,
  CheckCircle2, PauseCircle, XCircle, Plus, QrCode,
  Wifi, WifiOff,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FranchiseClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agent_id: string;
  status: string;
  monthly_price: number;
  whatsapp_instance: string | null;
  whatsapp_status: string;
  created_at: string;
}

interface FranchiseInfo {
  id: string;
  brand_name: string;
  brand_color: string;
  tier: string;
  status: string;
  royalty_pct: number;
  max_agents: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  trial: "bg-blue-500/10 text-blue-600 border-blue-200",
  paused: "bg-amber-500/10 text-amber-600 border-amber-200",
  cancelled: "bg-red-500/10 text-red-600 border-red-200",
};

const WA_STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  connected: Wifi,
  disconnected: WifiOff,
  qr_pending: QrCode,
};

export function ResellerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [franchise, setFranchise] = useState<FranchiseInfo | null>(null);
  const [clients, setClients] = useState<FranchiseClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);

    // Get reseller's franchise
    const { data: fData } = await supabase
      .from("franchises")
      .select("*")
      .eq("owner_id", user!.id)
      .single();

    if (fData) {
      setFranchise(fData as FranchiseInfo);

      // Get their clients
      const { data: cData } = await supabase
        .from("franchise_clients")
        .select("*")
        .eq("franchise_id", fData.id)
        .order("created_at", { ascending: false });

      setClients((cData ?? []) as FranchiseClient[]);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!franchise) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Crown className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">{t("reseller.noFranchise")}</p>
      </div>
    );
  }

  const activeClients = clients.filter((c) => c.status === "active" || c.status === "trial");
  const monthlyRevenue = activeClients.reduce((sum, c) => sum + Number(c.monthly_price), 0);
  const royaltyDue = (monthlyRevenue * franchise.royalty_pct) / 100;
  const netIncome = monthlyRevenue - royaltyDue;

  return (
    <div className="space-y-6">
      {/* Header with brand */}
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
          style={{ background: franchise.brand_color }}
        >
          {franchise.brand_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{franchise.brand_name}</h1>
          <div className="flex items-center gap-2">
            <Badge className="bg-jade-500/10 text-jade-600 border-jade-200">
              {franchise.tier.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t("reseller.royalty")}: {franchise.royalty_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("reseller.totalClients")}
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">{activeClients.length} {t("reseller.active")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("reseller.monthlyRevenue")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{"\u20AC"}{monthlyRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("reseller.royaltyDue")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{"\u20AC"}{royaltyDue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{franchise.royalty_pct}% {t("reseller.ofRevenue")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("reseller.netIncome")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-jade-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-jade-600">{"\u20AC"}{netIncome.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("reseller.myClients")}</CardTitle>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Quiero agregar un nuevo cliente a mi franquicia Layra")}`, "_blank")}
            title={t("reseller.addClient")}
          >
            <Plus className="h-4 w-4" />
            {t("reseller.addClient")}
          </Button>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">{t("reseller.noClients")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("reseller.noClientsHint")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">{t("reseller.colClient")}</th>
                    <th className="pb-3 font-medium">{t("reseller.colAgent")}</th>
                    <th className="pb-3 font-medium">{t("reseller.colStatus")}</th>
                    <th className="pb-3 font-medium">{t("reseller.colWhatsApp")}</th>
                    <th className="pb-3 font-medium text-right">{t("reseller.colPrice")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((c) => {
                    const WaIcon = WA_STATUS_ICONS[c.whatsapp_status] || WifiOff;
                    return (
                      <tr key={c.id} className="hover:bg-muted/50">
                        <td className="py-3">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.email || c.phone}</div>
                        </td>
                        <td className="py-3">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{c.agent_id}</span>
                        </td>
                        <td className="py-3">
                          <Badge className={STATUS_COLORS[c.status] || ""}>
                            {c.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <WaIcon className={`h-4 w-4 ${
                              c.whatsapp_status === "connected" ? "text-emerald-500" :
                              c.whatsapp_status === "qr_pending" ? "text-amber-500" : "text-red-500"
                            }`} />
                            <span className="text-xs capitalize">{c.whatsapp_status}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium">
                          {"\u20AC"}{Number(c.monthly_price).toLocaleString()}/mo
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
