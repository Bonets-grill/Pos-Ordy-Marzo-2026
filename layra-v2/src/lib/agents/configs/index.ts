// Agent config generator — creates a SystemConfig for any agent from the catalog
import type { SystemConfig } from "../../templates/types";
import { t5 } from "../../templates/types";
import { getAgentById } from "../catalog";
import { getAgentSharedModules } from "../sharedModules";
import { getTenantAdminModules } from "../../templates/tenantAdmin";
import type { AgentCatalogItem } from "../types";
import type { I18nStr } from "../types";

function agentDashboard(agent: AgentCatalogItem): SystemConfig["modules"][0] {
  return {
    id: "dashboard",
    label: t5("Panel Principal", "Dashboard", "Tableau de Bord", "Übersicht", "Pannello"),
    icon: "dashboard",
    kpis: [
      { label: t5("Conversaciones Hoy", "Conversations Today", "Conversations Aujourd'hui", "Gespräche Heute", "Conversazioni Oggi"), value: "127", change: "+18%", trend: "up" },
      { label: t5("Tasa de Resolución", "Resolution Rate", "Taux de Résolution", "Lösungsrate", "Tasso Risoluzione"), value: "94.2%", change: "+2.1%", trend: "up" },
      { label: t5("Tiempo de Respuesta", "Response Time", "Temps de Réponse", "Antwortzeit", "Tempo di Risposta"), value: "1.2s", change: "-0.3s", trend: "down" },
      { label: t5("Citas Agendadas", "Appointments Booked", "RDV Réservés", "Gebuchte Termine", "Appuntamenti Prenotati"), value: "34", change: "+8", trend: "up" },
    ],
    table: {
      columns: [
        { key: "event", label: t5("Actividad Reciente", "Recent Activity", "Activité Récente", "Letzte Aktivität", "Attività Recente"), type: "text" },
        { key: "channel", label: t5("Canal", "Channel", "Canal", "Kanal", "Canale"), type: "badge", badgeColors: { WhatsApp: "green", Web: "blue", Email: "purple" } },
        { key: "result", label: t5("Resultado", "Result", "Résultat", "Ergebnis", "Risultato"), type: "badge", badgeColors: { Completado: "green", "En Progreso": "blue", Pendiente: "yellow", Escalado: "red" } },
        { key: "time", label: t5("Hora", "Time", "Heure", "Uhrzeit", "Ora"), type: "text" },
      ],
      rows: [
        { event: "Cita agendada para mañana 10:00", channel: "WhatsApp", result: "Completado", time: "09:32" },
        { event: "Consulta de precios respondida", channel: "WhatsApp", result: "Completado", time: "09:28" },
        { event: "Nuevo contacto — información enviada", channel: "Web", result: "Completado", time: "09:15" },
        { event: "Solicitud compleja — escalado a humano", channel: "WhatsApp", result: "Escalado", time: "09:10" },
        { event: "Recordatorio de cita enviado", channel: "WhatsApp", result: "Completado", time: "09:00" },
        { event: "Follow-up post-servicio", channel: "Email", result: "Pendiente", time: "08:45" },
        { event: "Catálogo de servicios compartido", channel: "WhatsApp", result: "Completado", time: "08:30" },
      ],
      searchPlaceholder: t5("Buscar actividad...", "Search activity...", "Rechercher activité...", "Aktivität suchen...", "Cerca attività..."),
      searchField: "event",
    },
  };
}

export function getAgentConfig(agentId: string): SystemConfig | null {
  const agent = getAgentById(agentId);
  if (!agent) return null;

  const config: SystemConfig = {
    name: agent.name as SystemConfig["name"],
    subtitle: agent.description as SystemConfig["subtitle"],
    brandColor: agent.brandColor,
    icon: undefined,
    modules: [
      agentDashboard(agent),
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
