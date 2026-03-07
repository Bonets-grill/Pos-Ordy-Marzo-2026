// Agent config generator — creates a SystemConfig for any agent from the catalog
import type { SystemConfig } from "../../templates/types";
import { t5 } from "../../templates/types";
import { getAgentById } from "../catalog";
import { getAgentSharedModules } from "../sharedModules";
import { getTenantAdminModules } from "../../templates/tenantAdmin";
import type { AgentCatalogItem } from "../types";
import type { I18nStr } from "../types";

export interface RealDashboardData {
  todayBookings: number;
  weekBookings: number;
  confirmedToday: number;
  noShowsToday: number;
  activityRows: Array<{ event: string; channel: string; result: string; time: string }>;
}

function agentDashboard(agent: AgentCatalogItem, realData?: RealDashboardData): SystemConfig["modules"][0] {
  const hasReal = !!realData;
  const todayCount = realData?.todayBookings ?? 0;
  const weekCount = realData?.weekBookings ?? 0;
  const confirmedCount = realData?.confirmedToday ?? 0;
  const noShowCount = realData?.noShowsToday ?? 0;
  const resolutionRate = todayCount > 0 ? Math.round((confirmedCount / todayCount) * 100) : 0;

  const rows = hasReal && realData!.activityRows.length > 0
    ? realData!.activityRows
    : [
        { event: "—", channel: "—", result: "—", time: "—" },
      ];

  return {
    id: "dashboard",
    label: t5("Panel Principal", "Dashboard", "Tableau de Bord", "Übersicht", "Pannello"),
    icon: "dashboard",
    kpis: [
      { label: t5("Citas Hoy", "Bookings Today", "RDV Aujourd'hui", "Termine Heute", "Appuntamenti Oggi"), value: String(todayCount), change: hasReal ? "" : "—", trend: todayCount > 0 ? "up" : "neutral" },
      { label: t5("Citas Semana", "Week Bookings", "RDV Semaine", "Wochentermine", "Appuntamenti Settimana"), value: String(weekCount), change: hasReal ? "" : "—", trend: weekCount > 0 ? "up" : "neutral" },
      { label: t5("Confirmadas", "Confirmed", "Confirmés", "Bestätigt", "Confermati"), value: String(confirmedCount), trend: confirmedCount > 0 ? "up" : "neutral" },
      { label: t5("No Asistieron", "No-Shows", "Absences", "Nicht Erschienen", "Assenze"), value: String(noShowCount), trend: noShowCount > 0 ? "down" : "neutral" },
    ],
    table: {
      columns: [
        { key: "event", label: t5("Actividad Reciente", "Recent Activity", "Activité Récente", "Letzte Aktivität", "Attività Recente"), type: "text" },
        { key: "channel", label: t5("Canal", "Channel", "Canal", "Kanal", "Canale"), type: "badge", badgeColors: { WhatsApp: "green", Web: "blue", whatsapp: "green", web: "blue" } },
        { key: "result", label: t5("Resultado", "Result", "Résultat", "Ergebnis", "Risultato"), type: "badge", badgeColors: { Confirmada: "green", Confirmado: "green", confirmed: "green", Cancelada: "red", cancelled: "red", "No asistio": "yellow", no_show: "yellow", completed: "blue", Completada: "blue" } },
        { key: "time", label: t5("Hora", "Time", "Heure", "Uhrzeit", "Ora"), type: "text" },
      ],
      rows,
      searchPlaceholder: t5("Buscar actividad...", "Search activity...", "Rechercher activité...", "Aktivität suchen...", "Cerca attività..."),
      searchField: "event",
    },
  };
}

export function getAgentConfig(agentId: string, realData?: RealDashboardData): SystemConfig | null {
  const agent = getAgentById(agentId);
  if (!agent) return null;

  const config: SystemConfig = {
    name: agent.name as SystemConfig["name"],
    subtitle: agent.description as SystemConfig["subtitle"],
    brandColor: agent.brandColor,
    icon: undefined,
    modules: [
      agentDashboard(agent, realData),
      ...getAgentSharedModules(),
    ],
    tenantAdmin: { modules: getTenantAdminModules() },
    superAdmin: {
      modules: [
        {
          id: "tenants",
          label: "Tenants",
          icon: "building",
          kpis: [
            { label: t5("Agentes Activos", "Active Agents", "Agents Actifs", "Aktive Agenten", "Agenti Attivi"), value: "284", change: "+32", trend: "up" },
            { label: t5("Mensajes/Día", "Messages/Day", "Messages/Jour", "Nachrichten/Tag", "Messaggi/Giorno"), value: "45.600", change: "+18%", trend: "up" },
            { label: t5("MRR", "MRR", "MRR", "MRR", "MRR"), value: "€18.400", change: "+22%", trend: "up" },
            { label: t5("Churn", "Churn", "Churn", "Churn", "Churn"), value: "2.1%", change: "-0.5%", trend: "down" },
          ],
          table: {
            columns: [
              { key: "tenant", label: "Tenant", type: "text" },
              { key: "plan", label: "Plan", type: "badge", badgeColors: { Premium: "purple", Professional: "blue", Starter: "green", Trial: "yellow" } },
              { key: "messages", label: t5("Mensajes", "Messages", "Messages", "Nachrichten", "Messaggi"), type: "text" },
              { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activo: "green", Trial: "yellow", Suspendido: "red", Cancelado: "gray" } },
            ],
            rows: [
              { tenant: "BarberKing Madrid", plan: "Premium", messages: "2.340", status: "Activo" },
              { tenant: "Salon Belle Paris", plan: "Professional", messages: "1.890", status: "Activo" },
              { tenant: "AutoFix Barcelona", plan: "Starter", messages: "456", status: "Activo" },
              { tenant: "Dental Plus Roma", plan: "Professional", messages: "1.200", status: "Activo" },
              { tenant: "FlowerBox Berlin", plan: "Trial", messages: "78", status: "Trial" },
              { tenant: "GymPro Lisboa", plan: "Starter", messages: "320", status: "Activo" },
            ],
            searchPlaceholder: t5("Buscar tenant...", "Search tenant...", "Rechercher tenant...", "Tenant suchen...", "Cerca tenant..."),
            searchField: "tenant",
          },
        },
      ],
    },
  };

  return config;
}
