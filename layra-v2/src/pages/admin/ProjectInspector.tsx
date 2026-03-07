import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import type { Tables } from "@/core/supabase/types";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProjectInspector() {
  const { t, lang } = useTranslation();
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tables<"projects"> | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects(data ?? []);
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("inspector.title")}
      </h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("projects.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-colors ${
                selected?.id === project.id ? "border-jade-500" : ""
              }`}
              onClick={() => setSelected(project)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{project.name}</span>
                  <Badge variant="outline">
                    {t(`systems.${project.system_type}`)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project.tenant_id.slice(0, 8)}... | v{project.version}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">
                    {t("inspector.systemType")}
                  </span>
                  <p className="font-medium">
                    {t(`systems.${selected.system_type}`)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("inspector.version")}
                  </span>
                  <p className="font-medium">{selected.version}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("projects.status")}
                  </span>
                  <p className="font-medium">
                    {t(`status.${selected.status}`)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("projects.created")}
                  </span>
                  <p className="font-medium">
                    {formatDate(selected.created_at, lang)}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Tenant ID</span>
                <p className="font-mono text-xs">{selected.tenant_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Project ID</span>
                <p className="font-mono text-xs">{selected.id}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
