import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, Users, Activity, Plus } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/core/auth/useAuth";
import { supabase } from "@/core/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalUsers: number;
}

export function Dashboard() {
  const { t } = useTranslation();
  const { profile, tenant } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    if (!tenant) return;
    loadStats();
  }, [tenant]);

  async function loadStats() {
    if (!tenant) return;
    const [projectsRes, activeRes, usersRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
    ]);
    setStats({
      totalProjects: projectsRes.count ?? 0,
      activeProjects: activeRes.count ?? 0,
      totalUsers: usersRes.count ?? 0,
    });
  }

  const statCards = [
    {
      title: t("dashboard.totalProjects"),
      value: stats.totalProjects,
      icon: FolderOpen,
    },
    {
      title: t("dashboard.activeProjects"),
      value: stats.activeProjects,
      icon: Activity,
    },
    {
      title: t("dashboard.totalUsers"),
      value: stats.totalUsers,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("dashboard.welcome", {
              name: profile?.display_name ?? "",
            })}
          </h1>
          <p className="text-muted-foreground">{tenant?.name}</p>
        </div>
        <Button asChild>
          <Link to="/projects">
            <Plus className="mr-2 h-4 w-4" />
            {t("projects.create")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.totalProjects === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">
              {t("dashboard.noProjects")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("dashboard.createFirst")}
            </p>
            <Button className="mt-4" asChild>
              <Link to="/projects">
                <Plus className="mr-2 h-4 w-4" />
                {t("projects.create")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
