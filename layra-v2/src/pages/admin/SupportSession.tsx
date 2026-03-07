import { useEffect, useState } from "react";
import { Headset, Play, Square, RotateCcw } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import type { Tables } from "@/core/supabase/types";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function SupportSession() {
  const { t, lang } = useTranslation();
  const [sessions, setSessions] = useState<Tables<"support_sessions">[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const { data } = await supabase
      .from("support_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setSessions(data ?? []);
  }

  const statusBadge: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Headset className="h-6 w-6 text-jade-500" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("support.title")}
        </h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("support.project")}</TableHead>
                <TableHead>{t("support.status")}</TableHead>
                <TableHead>{t("support.admin")}</TableHead>
                <TableHead>{t("support.opened")}</TableHead>
                <TableHead>{t("projects.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {session.project_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusBadge[session.status] ?? ""}
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.admin_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(session.created_at, lang)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {session.status === "open" && (
                        <Button size="icon" variant="ghost" title="Start">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {session.status === "in_progress" && (
                        <Button size="icon" variant="ghost" title="Stop">
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      {session.status === "completed" && (
                        <Button size="icon" variant="ghost" title="Rollback">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("common.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
