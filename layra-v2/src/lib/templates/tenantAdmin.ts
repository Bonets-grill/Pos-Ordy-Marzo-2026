// Shared Tenant Admin modules — every SaaS system gets these
import { t5 } from "./types";
import type { ModuleConfig } from "./types";

export function getTenantAdminModules(): ModuleConfig[] {
  return [
    {
      id: "ta_settings",
      label: t5("Configuración", "Settings", "Paramètres", "Einstellungen", "Impostazioni"),
      icon: "settings",
      kpis: [
        { label: t5("Estado del Sistema", "System Status", "État du Système", "Systemstatus", "Stato del Sistema"), value: t5("Operativo", "Operational", "Opérationnel", "Betriebsbereit", "Operativo"), trend: "up" },
        { label: t5("Última Actualización", "Last Update", "Dernière Mise à Jour", "Letztes Update", "Ultimo Aggiornamento"), value: t5("Hoy 09:15", "Today 09:15", "Aujourd'hui 09:15", "Heute 09:15", "Oggi 09:15"), trend: "neutral" },
        { label: t5("Almacenamiento Usado", "Storage Used", "Stockage Utilisé", "Speicher Verwendet", "Spazio Utilizzato"), value: "3.2 GB / 10 GB", change: "+240 MB", trend: "up" },
        { label: t5("Dominio Personalizado", "Custom Domain", "Domaine Personnalisé", "Eigene Domain", "Dominio Personalizzato"), value: t5("Activo", "Active", "Actif", "Aktiv", "Attivo"), trend: "up" },
      ],
      table: {
        columns: [
          { key: "setting", label: t5("Ajuste", "Setting", "Paramètre", "Einstellung", "Impostazione"), type: "text" },
          { key: "category", label: t5("Categoría", "Category", "Catégorie", "Kategorie", "Categoria"), type: "badge", badgeColors: { General: "blue", Branding: "purple", SEO: "green", Email: "yellow", Security: "red" } },
          { key: "value", label: t5("Valor", "Value", "Valeur", "Wert", "Valore"), type: "text" },
          { key: "updated", label: t5("Modificado", "Modified", "Modifié", "Geändert", "Modificato"), type: "text" },
        ],
        rows: [
          { setting: "Nombre del negocio", category: "General", value: "Mi Empresa SL", updated: "2026-03-01" },
          { setting: "Logo principal", category: "Branding", value: "logo_v3.png", updated: "2026-02-28" },
          { setting: "Color primario", category: "Branding", value: "#00e5b8", updated: "2026-02-28" },
          { setting: "Meta descripción", category: "SEO", value: "Configurado", updated: "2026-02-15" },
          { setting: "Email remitente", category: "Email", value: "noreply@miempresa.com", updated: "2026-01-20" },
          { setting: "2FA obligatorio", category: "Security", value: "Activado", updated: "2026-03-05" },
          { setting: "Zona horaria", category: "General", value: "Europe/Madrid", updated: "2026-01-10" },
          { setting: "Idioma por defecto", category: "General", value: "Español", updated: "2026-01-10" },
        ],
        searchPlaceholder: t5("Buscar ajustes...", "Search settings...", "Rechercher paramètres...", "Einstellungen suchen...", "Cerca impostazioni..."),
        searchField: "setting",
      },
      modal: {
        title: t5("Editar Ajuste", "Edit Setting", "Modifier Paramètre", "Einstellung Bearbeiten", "Modifica Impostazione"),
        fields: [
          { name: "setting", label: t5("Ajuste", "Setting", "Paramètre", "Einstellung", "Impostazione"), type: "text", required: true },
          { name: "value", label: t5("Valor", "Value", "Valeur", "Wert", "Valore"), type: "text", required: true },
          { name: "category", label: t5("Categoría", "Category", "Catégorie", "Kategorie", "Categoria"), type: "select", options: [
            { value: "General", label: "General" },
            { value: "Branding", label: "Branding" },
            { value: "SEO", label: "SEO" },
            { value: "Email", label: "Email" },
            { value: "Security", label: t5("Seguridad", "Security", "Sécurité", "Sicherheit", "Sicurezza") },
          ]},
        ],
      },
    },
    {
      id: "ta_users",
      label: t5("Usuarios y Roles", "Users & Roles", "Utilisateurs et Rôles", "Benutzer & Rollen", "Utenti e Ruoli"),
      icon: "users",
      kpis: [
        { label: t5("Usuarios Activos", "Active Users", "Utilisateurs Actifs", "Aktive Benutzer", "Utenti Attivi"), value: "24", change: "+3", trend: "up" },
        { label: t5("Roles Definidos", "Defined Roles", "Rôles Définis", "Definierte Rollen", "Ruoli Definiti"), value: "5", trend: "neutral" },
        { label: t5("Invitaciones Pendientes", "Pending Invitations", "Invitations en Attente", "Ausstehende Einladungen", "Inviti in Sospeso"), value: "2", trend: "neutral" },
        { label: t5("Último Acceso", "Last Login", "Dernière Connexion", "Letzter Zugriff", "Ultimo Accesso"), value: t5("Hace 5 min", "5 min ago", "Il y a 5 min", "Vor 5 Min", "5 min fa"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text" },
          { key: "email", label: "Email", type: "text" },
          { key: "role", label: t5("Rol", "Role", "Rôle", "Rolle", "Ruolo"), type: "badge", badgeColors: { Admin: "red", Manager: "purple", Editor: "blue", Viewer: "gray", Operator: "green" } },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activo: "green", Inactivo: "gray", Pendiente: "yellow" } },
          { key: "lastLogin", label: t5("Último Acceso", "Last Login", "Dernière Connexion", "Letzter Zugriff", "Ultimo Accesso"), type: "text" },
        ],
        rows: [
          { name: "Carlos García", email: "carlos@empresa.com", role: "Admin", status: "Activo", lastLogin: "2026-03-07 09:15" },
          { name: "María López", email: "maria@empresa.com", role: "Manager", status: "Activo", lastLogin: "2026-03-07 08:45" },
          { name: "Pedro Ruiz", email: "pedro@empresa.com", role: "Editor", status: "Activo", lastLogin: "2026-03-06 17:30" },
          { name: "Ana Martínez", email: "ana@empresa.com", role: "Operator", status: "Activo", lastLogin: "2026-03-07 07:20" },
          { name: "Luis Torres", email: "luis@empresa.com", role: "Viewer", status: "Activo", lastLogin: "2026-03-05 14:10" },
          { name: "Elena Sánchez", email: "elena@empresa.com", role: "Editor", status: "Inactivo", lastLogin: "2026-02-28 11:00" },
          { name: "Diego Navarro", email: "diego@empresa.com", role: "Operator", status: "Pendiente", lastLogin: "—" },
        ],
        searchPlaceholder: t5("Buscar usuarios...", "Search users...", "Rechercher utilisateurs...", "Benutzer suchen...", "Cerca utenti..."),
        searchField: "name",
      },
      tabs: [
        { id: "all", label: t5("Todos", "All", "Tous", "Alle", "Tutti"), filterField: "status", filterValue: "all" },
        { id: "active", label: t5("Activos", "Active", "Actifs", "Aktive", "Attivi"), filterField: "status", filterValue: "Activo" },
        { id: "inactive", label: t5("Inactivos", "Inactive", "Inactifs", "Inaktive", "Inattivi"), filterField: "status", filterValue: "Inactivo" },
        { id: "pending", label: t5("Pendientes", "Pending", "En Attente", "Ausstehend", "In Sospeso"), filterField: "status", filterValue: "Pendiente" },
      ],
      modal: {
        title: t5("Nuevo Usuario", "New User", "Nouvel Utilisateur", "Neuer Benutzer", "Nuovo Utente"),
        fields: [
          { name: "name", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "role", label: t5("Rol", "Role", "Rôle", "Rolle", "Ruolo"), type: "select", required: true, options: [
            { value: "Admin", label: "Admin" },
            { value: "Manager", label: "Manager" },
            { value: "Editor", label: "Editor" },
            { value: "Operator", label: t5("Operador", "Operator", "Opérateur", "Operator", "Operatore") },
            { value: "Viewer", label: t5("Visor", "Viewer", "Lecteur", "Betrachter", "Visualizzatore") },
          ]},
        ],
      },
    },
    {
      id: "ta_billing",
      label: t5("Facturación", "Billing", "Facturation", "Abrechnung", "Fatturazione"),
      icon: "credit-card",
      kpis: [
        { label: t5("Plan Actual", "Current Plan", "Plan Actuel", "Aktueller Plan", "Piano Attuale"), value: "Professional", trend: "up" },
        { label: t5("Próximo Cobro", "Next Charge", "Prochain Prélèvement", "Nächste Abbuchung", "Prossimo Addebito"), value: t5("€149/mes", "€149/mo", "€149/mois", "€149/Mon.", "€149/mese"), trend: "neutral" },
        { label: t5("Método de Pago", "Payment Method", "Moyen de Paiement", "Zahlungsmethode", "Metodo di Pagamento"), value: "Visa •••• 4242", trend: "neutral" },
        { label: t5("Próxima Factura", "Next Invoice", "Prochaine Facture", "Nächste Rechnung", "Prossima Fattura"), value: "2026-04-01", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "invoice", label: t5("Factura", "Invoice", "Facture", "Rechnung", "Fattura"), type: "text" },
          { key: "date", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "amount", label: t5("Importe", "Amount", "Montant", "Betrag", "Importo"), type: "currency" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Pagada: "green", Pendiente: "yellow", Vencida: "red" } },
          { key: "plan", label: t5("Plan", "Plan", "Plan", "Plan", "Piano"), type: "text" },
        ],
        rows: [
          { invoice: "INV-2026-003", date: "2026-03-01", amount: "€149.00", status: "Pagada", plan: "Professional" },
          { invoice: "INV-2026-002", date: "2026-02-01", amount: "€149.00", status: "Pagada", plan: "Professional" },
          { invoice: "INV-2026-001", date: "2026-01-01", amount: "€149.00", status: "Pagada", plan: "Professional" },
          { invoice: "INV-2025-012", date: "2025-12-01", amount: "€99.00", status: "Pagada", plan: "Starter" },
          { invoice: "INV-2025-011", date: "2025-11-01", amount: "€99.00", status: "Pagada", plan: "Starter" },
          { invoice: "INV-2025-010", date: "2025-10-01", amount: "€99.00", status: "Pagada", plan: "Starter" },
        ],
        searchPlaceholder: t5("Buscar facturas...", "Search invoices...", "Rechercher factures...", "Rechnungen suchen...", "Cerca fatture..."),
        searchField: "invoice",
      },
    },
    {
      id: "ta_integrations",
      label: t5("Integraciones", "Integrations", "Intégrations", "Integrationen", "Integrazioni"),
      icon: "link",
      kpis: [
        { label: t5("Conectadas", "Connected", "Connectées", "Verbunden", "Connesse"), value: "4", change: "+1", trend: "up" },
        { label: t5("Disponibles", "Available", "Disponibles", "Verfügbar", "Disponibili"), value: "12", trend: "neutral" },
        { label: t5("API Calls Hoy", "API Calls Today", "Appels API Aujourd'hui", "API-Aufrufe Heute", "Chiamate API Oggi"), value: "1.248", change: "+8%", trend: "up" },
        { label: t5("Webhooks Activos", "Active Webhooks", "Webhooks Actifs", "Aktive Webhooks", "Webhook Attivi"), value: "3", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "integration", label: t5("Integración", "Integration", "Intégration", "Integration", "Integrazione"), type: "text" },
          { key: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { API: "blue", Webhook: "purple", OAuth: "green", SMTP: "yellow" } },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Conectado: "green", Desconectado: "gray", Error: "red" } },
          { key: "lastSync", label: t5("Última Sync", "Last Sync", "Dernière Sync", "Letzte Sync", "Ultima Sync"), type: "text" },
        ],
        rows: [
          { integration: "Stripe", type: "API", status: "Conectado", lastSync: "2026-03-07 09:00" },
          { integration: "Google Calendar", type: "OAuth", status: "Conectado", lastSync: "2026-03-07 08:30" },
          { integration: "Mailgun", type: "SMTP", status: "Conectado", lastSync: "2026-03-07 07:45" },
          { integration: "Slack Notifications", type: "Webhook", status: "Conectado", lastSync: "2026-03-07 09:10" },
          { integration: "Zapier", type: "API", status: "Desconectado", lastSync: "2026-02-20 14:00" },
          { integration: "HubSpot CRM", type: "OAuth", status: "Desconectado", lastSync: "—" },
        ],
        searchPlaceholder: t5("Buscar integraciones...", "Search integrations...", "Rechercher intégrations...", "Integrationen suchen...", "Cerca integrazioni..."),
        searchField: "integration",
      },
      modal: {
        title: t5("Nueva Integración", "New Integration", "Nouvelle Intégration", "Neue Integration", "Nuova Integrazione"),
        fields: [
          { name: "integration", label: t5("Servicio", "Service", "Service", "Dienst", "Servizio"), type: "text", required: true },
          { name: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "select", required: true, options: [
            { value: "API", label: "API" },
            { value: "Webhook", label: "Webhook" },
            { value: "OAuth", label: "OAuth" },
            { value: "SMTP", label: "SMTP" },
          ]},
          { name: "apiKey", label: t5("API Key", "API Key", "Clé API", "API-Schlüssel", "Chiave API"), type: "text", placeholder: t5("Introduce tu API key...", "Enter your API key...", "Entrez votre clé API...", "API-Schlüssel eingeben...", "Inserisci la tua chiave API...") },
        ],
      },
    },
    {
      id: "ta_notifications",
      label: t5("Notificaciones", "Notifications", "Notifications", "Benachrichtigungen", "Notifiche"),
      icon: "bell",
      kpis: [
        { label: t5("Enviadas Hoy", "Sent Today", "Envoyées Aujourd'hui", "Heute Gesendet", "Inviate Oggi"), value: "156", change: "+12%", trend: "up" },
        { label: t5("Tasa de Apertura", "Open Rate", "Taux d'Ouverture", "Öffnungsrate", "Tasso di Apertura"), value: "68%", change: "+3%", trend: "up" },
        { label: t5("Canales Activos", "Active Channels", "Canaux Actifs", "Aktive Kanäle", "Canali Attivi"), value: "3", trend: "neutral" },
        { label: t5("En Cola", "In Queue", "En File", "In Warteschlange", "In Coda"), value: "8", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "template", label: t5("Plantilla", "Template", "Modèle", "Vorlage", "Modello"), type: "text" },
          { key: "channel", label: t5("Canal", "Channel", "Canal", "Kanal", "Canale"), type: "badge", badgeColors: { Email: "blue", Push: "purple", SMS: "green", Slack: "yellow" } },
          { key: "trigger", label: t5("Disparador", "Trigger", "Déclencheur", "Auslöser", "Trigger"), type: "text" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activa: "green", Inactiva: "gray", Borrador: "yellow" } },
          { key: "sent", label: t5("Enviadas", "Sent", "Envoyées", "Gesendet", "Inviate"), type: "text" },
        ],
        rows: [
          { template: "Bienvenida", channel: "Email", trigger: "Registro", status: "Activa", sent: "1.240" },
          { template: "Pedido confirmado", channel: "Email", trigger: "Nuevo pedido", status: "Activa", sent: "3.580" },
          { template: "Recordatorio", channel: "Push", trigger: "24h antes", status: "Activa", sent: "892" },
          { template: "Pago recibido", channel: "Email", trigger: "Pago exitoso", status: "Activa", sent: "2.150" },
          { template: "Alerta equipo", channel: "Slack", trigger: "Incidencia", status: "Activa", sent: "45" },
          { template: "Promoción mensual", channel: "Email", trigger: "Manual", status: "Borrador", sent: "0" },
          { template: "SMS verificación", channel: "SMS", trigger: "Login nuevo", status: "Inactiva", sent: "320" },
        ],
        searchPlaceholder: t5("Buscar plantillas...", "Search templates...", "Rechercher modèles...", "Vorlagen suchen...", "Cerca modelli..."),
        searchField: "template",
      },
      modal: {
        title: t5("Nueva Plantilla", "New Template", "Nouveau Modèle", "Neue Vorlage", "Nuovo Modello"),
        fields: [
          { name: "template", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
          { name: "channel", label: t5("Canal", "Channel", "Canal", "Kanal", "Canale"), type: "select", required: true, options: [
            { value: "Email", label: "Email" },
            { value: "Push", label: "Push" },
            { value: "SMS", label: "SMS" },
            { value: "Slack", label: "Slack" },
          ]},
          { name: "trigger", label: t5("Disparador", "Trigger", "Déclencheur", "Auslöser", "Trigger"), type: "text", required: true },
          { name: "body", label: t5("Contenido", "Content", "Contenu", "Inhalt", "Contenuto"), type: "textarea" },
        ],
      },
    },
    {
      id: "ta_reports",
      label: t5("Reportes", "Reports", "Rapports", "Berichte", "Report"),
      icon: "chart",
      kpis: [
        { label: t5("Reportes Generados", "Reports Generated", "Rapports Générés", "Erstellte Berichte", "Report Generati"), value: "48", change: "+5", trend: "up" },
        { label: t5("Exportaciones Mes", "Exports This Month", "Exports Ce Mois", "Exporte Diesen Monat", "Esportazioni Mese"), value: "12", trend: "neutral" },
        { label: t5("Reporte Programado", "Scheduled Report", "Rapport Programmé", "Geplanter Bericht", "Report Programmato"), value: t5("Lunes 08:00", "Monday 08:00", "Lundi 08:00", "Montag 08:00", "Lunedì 08:00"), trend: "neutral" },
        { label: t5("Último Generado", "Last Generated", "Dernier Généré", "Zuletzt Erstellt", "Ultimo Generato"), value: t5("Hoy 06:00", "Today 06:00", "Aujourd'hui 06:00", "Heute 06:00", "Oggi 06:00"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "report", label: t5("Reporte", "Report", "Rapport", "Bericht", "Report"), type: "text" },
          { key: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { Ventas: "green", Usuarios: "blue", Financiero: "purple", Operativo: "yellow", Personalizado: "gray" } },
          { key: "frequency", label: t5("Frecuencia", "Frequency", "Fréquence", "Häufigkeit", "Frequenza"), type: "text" },
          { key: "lastRun", label: t5("Última Ejecución", "Last Run", "Dernière Exécution", "Letzte Ausführung", "Ultima Esecuzione"), type: "text" },
          { key: "format", label: t5("Formato", "Format", "Format", "Format", "Formato"), type: "badge", badgeColors: { PDF: "red", CSV: "green", Excel: "blue" } },
        ],
        rows: [
          { report: "Resumen de ventas", type: "Ventas", frequency: "Semanal", lastRun: "2026-03-03", format: "PDF" },
          { report: "Actividad de usuarios", type: "Usuarios", frequency: "Diario", lastRun: "2026-03-07", format: "CSV" },
          { report: "Balance mensual", type: "Financiero", frequency: "Mensual", lastRun: "2026-03-01", format: "Excel" },
          { report: "KPIs operativos", type: "Operativo", frequency: "Diario", lastRun: "2026-03-07", format: "PDF" },
          { report: "Análisis de retención", type: "Usuarios", frequency: "Mensual", lastRun: "2026-03-01", format: "PDF" },
          { report: "Informe personalizado", type: "Personalizado", frequency: "Bajo demanda", lastRun: "2026-02-28", format: "Excel" },
        ],
        searchPlaceholder: t5("Buscar reportes...", "Search reports...", "Rechercher rapports...", "Berichte suchen...", "Cerca report..."),
        searchField: "report",
      },
      modal: {
        title: t5("Nuevo Reporte", "New Report", "Nouveau Rapport", "Neuer Bericht", "Nuovo Report"),
        fields: [
          { name: "report", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
          { name: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "select", required: true, options: [
            { value: "Ventas", label: t5("Ventas", "Sales", "Ventes", "Verkäufe", "Vendite") },
            { value: "Usuarios", label: t5("Usuarios", "Users", "Utilisateurs", "Benutzer", "Utenti") },
            { value: "Financiero", label: t5("Financiero", "Financial", "Financier", "Finanziell", "Finanziario") },
            { value: "Operativo", label: t5("Operativo", "Operational", "Opérationnel", "Operativ", "Operativo") },
            { value: "Personalizado", label: t5("Personalizado", "Custom", "Personnalisé", "Benutzerdefiniert", "Personalizzato") },
          ]},
          { name: "frequency", label: t5("Frecuencia", "Frequency", "Fréquence", "Häufigkeit", "Frequenza"), type: "select", options: [
            { value: "Diario", label: t5("Diario", "Daily", "Quotidien", "Täglich", "Giornaliero") },
            { value: "Semanal", label: t5("Semanal", "Weekly", "Hebdomadaire", "Wöchentlich", "Settimanale") },
            { value: "Mensual", label: t5("Mensual", "Monthly", "Mensuel", "Monatlich", "Mensile") },
            { value: "Bajo demanda", label: t5("Bajo demanda", "On demand", "Sur demande", "Auf Anfrage", "Su richiesta") },
          ]},
          { name: "format", label: t5("Formato", "Format", "Format", "Format", "Formato"), type: "select", options: [
            { value: "PDF", label: "PDF" },
            { value: "CSV", label: "CSV" },
            { value: "Excel", label: "Excel" },
          ]},
        ],
      },
    },
  ];
}
