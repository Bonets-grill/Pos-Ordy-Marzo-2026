import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/core/auth/useAuth";
import { supabase } from "@/core/supabase/client";
import type { Tables } from "@/core/supabase/types";
import { SYSTEM_TYPES, type SystemType } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Projects() {
  const { t, lang } = useTranslation();
  const { profile, tenant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<SystemType>("crm");
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Auto-open dialog when coming from catalog with ?create=system_id
  useEffect(() => {
    const createType = searchParams.get("create");
    if (createType && SYSTEM_TYPES.includes(createType as SystemType)) {
      setNewType(createType as SystemType);
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (tenant) loadProjects();
  }, [tenant]);

  async function loadProjects() {
    if (!tenant) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    setProjects(data ?? []);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !profile) return;
    setCreating(true);
    try {
      await supabase.from("projects").insert({
        tenant_id: tenant.id,
        name: newName,
        description: newDescription,
        system_type: newType,
        created_by: profile.user_id,
      });
      setDialogOpen(false);
      setNewName("");
      setNewDescription("");
      await loadProjects();
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(project: Tables<"projects">, newStatus: string) {
    await supabase
      .from("projects")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", project.id);
    setSelectedProject(null);
    await loadProjects();
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-jade-100 text-jade-800 dark:bg-jade-900 dark:text-jade-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("projects.title")}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("projects.create")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("projects.create")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={createProject} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("projects.name")}</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("projects.description")}</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("projects.systemType")}</Label>
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as SystemType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`systems.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? t("projects.creating") : t("common.create")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("projects.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("projects.noResults")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md hover:border-jade-500/30 transition-all cursor-pointer group"
              onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base group-hover:text-jade-600 transition-colors">{project.name}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={statusColor[project.status] ?? ""}
                  >
                    {t(`status.${project.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {project.description || "-"}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t(`systems.${project.system_type}`)}</span>
                  <span>{formatDate(project.created_at, lang)}</span>
                </div>
                {selectedProject === project.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(project, project.status === "active" ? "paused" : "active"); }}
                    >
                      {project.status === "active" ? t("projects.pause") : t("projects.activate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-red-500 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(project, "archived"); }}
                    >
                      {t("projects.archive")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
