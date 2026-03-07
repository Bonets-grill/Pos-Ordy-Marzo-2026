import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/core/supabase/client";
import type { Tables } from "@/core/supabase/types";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AuditLog() {
  const { t, lang } = useTranslation();
  const [logs, setLogs] = useState<Tables<"audit_logs">[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data ?? []);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("audit.title")}
      </h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.action")}</TableHead>
                <TableHead>{t("audit.resource")}</TableHead>
                <TableHead>{t("audit.actor")}</TableHead>
                <TableHead>{t("audit.timestamp")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.resource_type}:{log.resource_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.actor_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.created_at, lang)}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t("audit.noLogs")}
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
