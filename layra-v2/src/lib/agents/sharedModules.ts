// Shared modules that every AI agent gets
import { t5 } from "../templates/types";
import type { ModuleConfig } from "../templates/types";

export function getAgentSharedModules(): ModuleConfig[] {
  return [
    // ── Conversations ──
    {
      id: "conversations",
      label: t5("Conversaciones", "Conversations", "Conversations", "Gespräche", "Conversazioni"),
      icon: "mail",
      kpis: [
        { label: t5("Hoy", "Today", "Aujourd'hui", "Heute", "Oggi"), value: "127", change: "+18%", trend: "up" },
        { label: t5("Tasa Resolución", "Resolution Rate", "Taux Résolution", "Lösungsrate", "Tasso Risoluzione"), value: "94.2%", change: "+2.1%", trend: "up" },
        { label: t5("Tiempo Respuesta", "Response Time", "Temps Réponse", "Antwortzeit", "Tempo Risposta"), value: "1.2s", change: "-0.3s", trend: "down" },
        { label: t5("Satisfacción", "Satisfaction", "Satisfaction", "Zufriedenheit", "Soddisfazione"), value: "4.8/5", change: "+0.2", trend: "up" },
      ],
      table: {
        columns: [
          { key: "contact", label: t5("Contacto", "Contact", "Contact", "Kontakt", "Contatto"), type: "text" },
          { key: "channel", label: t5("Canal", "Channel", "Canal", "Kanal", "Canale"), type: "badge", badgeColors: { WhatsApp: "green", Web: "blue", Email: "purple", SMS: "yellow" } },
          { key: "lastMessage", label: t5("Último Mensaje", "Last Message", "Dernier Message", "Letzte Nachricht", "Ultimo Messaggio"), type: "text" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activa: "green", Resuelta: "blue", Escalada: "yellow", Cerrada: "gray" } },
          { key: "time", label: t5("Hora", "Time", "Heure", "Uhrzeit", "Ora"), type: "text" },
        ],
        rows: [
          { contact: "+34 612 345 678", channel: "WhatsApp", lastMessage: "Perfecto, quedo confirmado", status: "Resuelta", time: "09:32" },
          { contact: "maria.lopez@email.com", channel: "Email", lastMessage: "Necesito cambiar mi cita", status: "Activa", time: "09:28" },
          { contact: "+34 698 765 432", channel: "WhatsApp", lastMessage: "Cuánto cuesta el servicio?", status: "Activa", time: "09:15" },
          { contact: "Web visitor #4521", channel: "Web", lastMessage: "I need help with my order", status: "Escalada", time: "09:10" },
          { contact: "+33 6 12 34 56 78", channel: "WhatsApp", lastMessage: "Merci beaucoup!", status: "Resuelta", time: "09:05" },
          { contact: "+34 655 432 109", channel: "SMS", lastMessage: "Recordatorio de cita mañana", status: "Cerrada", time: "08:45" },
          { contact: "+49 170 1234567", channel: "WhatsApp", lastMessage: "Danke, alles klar", status: "Resuelta", time: "08:30" },
        ],
        searchPlaceholder: t5("Buscar conversaciones...", "Search conversations...", "Rechercher conversations...", "Gespräche suchen...", "Cerca conversazioni..."),
        searchField: "contact",
      },
      tabs: [
        { id: "all", label: t5("Todas", "All", "Toutes", "Alle", "Tutte"), filterField: "status", filterValue: "all" },
        { id: "active", label: t5("Activas", "Active", "Actives", "Aktive", "Attive"), filterField: "status", filterValue: "Activa" },
        { id: "resolved", label: t5("Resueltas", "Resolved", "Résolues", "Gelöst", "Risolte"), filterField: "status", filterValue: "Resuelta" },
        { id: "escalated", label: t5("Escaladas", "Escalated", "Escaladées", "Eskaliert", "Escalate"), filterField: "status", filterValue: "Escalada" },
      ],
    },

    // ── Training / Knowledge ──
    {
      id: "training",
      label: t5("Entrenamiento", "Training", "Entraînement", "Training", "Addestramento"),
      icon: "book",
      kpis: [
        { label: t5("Documentos Base", "Knowledge Docs", "Documents Base", "Wissensdokumente", "Documenti Base"), value: "24", change: "+3", trend: "up" },
        { label: t5("FAQs Activas", "Active FAQs", "FAQs Actives", "Aktive FAQs", "FAQ Attive"), value: "86", change: "+12", trend: "up" },
        { label: t5("Precisión", "Accuracy", "Précision", "Genauigkeit", "Precisione"), value: "96.8%", change: "+1.2%", trend: "up" },
        { label: t5("Última Actualización", "Last Update", "Dernière MAJ", "Letztes Update", "Ultimo Aggiornamento"), value: t5("Hoy 08:00", "Today 08:00", "Aujourd'hui 08:00", "Heute 08:00", "Oggi 08:00"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "document", label: t5("Documento", "Document", "Document", "Dokument", "Documento"), type: "text" },
          { key: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { FAQ: "blue", PDF: "red", URL: "green", Manual: "purple", API: "yellow" } },
          { key: "entries", label: t5("Entradas", "Entries", "Entrées", "Einträge", "Voci"), type: "text" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activo: "green", Procesando: "yellow", Error: "red" } },
          { key: "updated", label: t5("Actualizado", "Updated", "Mis à jour", "Aktualisiert", "Aggiornato"), type: "text" },
        ],
        rows: [
          { document: "Servicios y precios", type: "Manual", entries: "45", status: "Activo", updated: "2026-03-07" },
          { document: "Preguntas frecuentes", type: "FAQ", entries: "86", status: "Activo", updated: "2026-03-06" },
          { document: "Política de cancelación", type: "PDF", entries: "12", status: "Activo", updated: "2026-03-01" },
          { document: "Horarios y ubicación", type: "Manual", entries: "8", status: "Activo", updated: "2026-02-28" },
          { document: "Sitio web", type: "URL", entries: "156", status: "Procesando", updated: "2026-03-07" },
          { document: "Catálogo de productos", type: "API", entries: "320", status: "Activo", updated: "2026-03-05" },
        ],
        searchPlaceholder: t5("Buscar documentos...", "Search documents...", "Rechercher documents...", "Dokumente suchen...", "Cerca documenti..."),
        searchField: "document",
      },
      modal: {
        title: t5("Añadir Documento", "Add Document", "Ajouter Document", "Dokument Hinzufügen", "Aggiungi Documento"),
        fields: [
          { name: "document", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
          { name: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "select", required: true, options: [
            { value: "FAQ", label: "FAQ" },
            { value: "PDF", label: "PDF" },
            { value: "URL", label: "URL" },
            { value: "Manual", label: "Manual" },
            { value: "API", label: "API" },
          ]},
          { name: "content", label: t5("Contenido/URL", "Content/URL", "Contenu/URL", "Inhalt/URL", "Contenuto/URL"), type: "textarea" },
        ],
      },
    },

    // ── Flows ──
    {
      id: "flows",
      label: t5("Flujos", "Flows", "Flux", "Abläufe", "Flussi"),
      icon: "toggle",
      kpis: [
        { label: t5("Flujos Activos", "Active Flows", "Flux Actifs", "Aktive Abläufe", "Flussi Attivi"), value: "8", trend: "neutral" },
        { label: t5("Ejecuciones Hoy", "Runs Today", "Exécutions Aujourd'hui", "Ausführungen Heute", "Esecuzioni Oggi"), value: "342", change: "+15%", trend: "up" },
        { label: t5("Tasa de Éxito", "Success Rate", "Taux de Succès", "Erfolgsrate", "Tasso Successo"), value: "98.5%", change: "+0.3%", trend: "up" },
        { label: t5("Tiempo Medio", "Avg Time", "Temps Moyen", "Durchschn. Zeit", "Tempo Medio"), value: "2.1s", change: "-0.4s", trend: "down" },
      ],
      table: {
        columns: [
          { key: "flow", label: t5("Flujo", "Flow", "Flux", "Ablauf", "Flusso"), type: "text" },
          { key: "trigger", label: t5("Disparador", "Trigger", "Déclencheur", "Auslöser", "Trigger"), type: "badge", badgeColors: { Mensaje: "blue", Keyword: "purple", Horario: "green", Webhook: "yellow", Manual: "gray" } },
          { key: "runs", label: t5("Ejecuciones", "Runs", "Exécutions", "Ausführungen", "Esecuzioni"), type: "text" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activo: "green", Pausado: "yellow", Borrador: "gray" } },
          { key: "success", label: t5("Éxito", "Success", "Succès", "Erfolg", "Successo"), type: "text" },
        ],
        rows: [
          { flow: "Bienvenida nuevo contacto", trigger: "Mensaje", runs: "1.248", status: "Activo", success: "99.2%" },
          { flow: "Agendar cita", trigger: "Keyword", runs: "856", status: "Activo", success: "97.8%" },
          { flow: "Enviar catálogo", trigger: "Keyword", runs: "432", status: "Activo", success: "99.5%" },
          { flow: "Recordatorio 24h", trigger: "Horario", runs: "621", status: "Activo", success: "100%" },
          { flow: "Seguimiento post-servicio", trigger: "Horario", runs: "398", status: "Activo", success: "98.1%" },
          { flow: "Escalado a humano", trigger: "Mensaje", runs: "45", status: "Activo", success: "100%" },
          { flow: "Promoción mensual", trigger: "Manual", runs: "2", status: "Pausado", success: "100%" },
          { flow: "Encuesta satisfacción", trigger: "Webhook", runs: "312", status: "Activo", success: "96.7%" },
        ],
        searchPlaceholder: t5("Buscar flujos...", "Search flows...", "Rechercher flux...", "Abläufe suchen...", "Cerca flussi..."),
        searchField: "flow",
      },
      modal: {
        title: t5("Nuevo Flujo", "New Flow", "Nouveau Flux", "Neuer Ablauf", "Nuovo Flusso"),
        fields: [
          { name: "flow", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
          { name: "trigger", label: t5("Disparador", "Trigger", "Déclencheur", "Auslöser", "Trigger"), type: "select", required: true, options: [
            { value: "Mensaje", label: t5("Mensaje", "Message", "Message", "Nachricht", "Messaggio") },
            { value: "Keyword", label: "Keyword" },
            { value: "Horario", label: t5("Horario", "Schedule", "Horaire", "Zeitplan", "Orario") },
            { value: "Webhook", label: "Webhook" },
            { value: "Manual", label: "Manual" },
          ]},
          { name: "description", label: t5("Descripción", "Description", "Description", "Beschreibung", "Descrizione"), type: "textarea" },
        ],
      },
    },

    // ── WhatsApp Connection ──
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: "phone",
      kpis: [
        { label: t5("Estado Conexión", "Connection Status", "État Connexion", "Verbindungsstatus", "Stato Connessione"), value: t5("Conectado", "Connected", "Connecté", "Verbunden", "Connesso"), trend: "up" },
        { label: t5("Mensajes Hoy", "Messages Today", "Messages Aujourd'hui", "Nachrichten Heute", "Messaggi Oggi"), value: "847", change: "+12%", trend: "up" },
        { label: t5("Canal", "Channel", "Canal", "Kanal", "Canale"), value: "Evolution API", trend: "neutral" },
        { label: t5("Número", "Number", "Numéro", "Nummer", "Numero"), value: "+34 6XX XXX XXX", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "event", label: t5("Evento", "Event", "Événement", "Ereignis", "Evento"), type: "text" },
          { key: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { Entrante: "blue", Saliente: "green", Sistema: "purple", Error: "red" } },
          { key: "number", label: t5("Número", "Number", "Numéro", "Nummer", "Numero"), type: "text" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Entregado: "green", Leído: "blue", Enviado: "yellow", Fallido: "red" } },
          { key: "time", label: t5("Hora", "Time", "Heure", "Uhrzeit", "Ora"), type: "text" },
        ],
        rows: [
          { event: "Mensaje recibido", type: "Entrante", number: "+34 612 345 678", status: "Leído", time: "09:32" },
          { event: "Confirmación de cita", type: "Saliente", number: "+34 698 765 432", status: "Entregado", time: "09:30" },
          { event: "Respuesta automática", type: "Saliente", number: "+34 655 123 456", status: "Entregado", time: "09:28" },
          { event: "Recordatorio enviado", type: "Saliente", number: "+34 677 890 123", status: "Enviado", time: "09:15" },
          { event: "Webhook recibido", type: "Sistema", number: "—", status: "Entregado", time: "09:10" },
          { event: "Mensaje no entregado", type: "Saliente", number: "+34 600 111 222", status: "Fallido", time: "08:55" },
        ],
        searchPlaceholder: t5("Buscar eventos...", "Search events...", "Rechercher événements...", "Ereignisse suchen...", "Cerca eventi..."),
        searchField: "event",
      },
    },

    // ── Analytics ──
    {
      id: "analytics",
      label: "Analytics",
      icon: "chart",
      kpis: [
        { label: t5("Conversaciones/Mes", "Conversations/Month", "Conversations/Mois", "Gespräche/Monat", "Conversazioni/Mese"), value: "3.847", change: "+22%", trend: "up" },
        { label: t5("Ahorro Estimado", "Estimated Savings", "Économies Estimées", "Geschätzte Einsparungen", "Risparmio Stimato"), value: "€4.200/mo", change: "+€800", trend: "up" },
        { label: t5("Resolución sin Humano", "No-Human Resolution", "Résolution sans Humain", "Lösung ohne Mensch", "Risoluzione senza Umano"), value: "89%", change: "+4%", trend: "up" },
        { label: t5("NPS del Agente", "Agent NPS", "NPS de l'Agent", "Agent-NPS", "NPS dell'Agente"), value: "72", change: "+8", trend: "up" },
      ],
      table: {
        columns: [
          { key: "metric", label: t5("Métrica", "Metric", "Métrique", "Metrik", "Metrica"), type: "text" },
          { key: "period", label: t5("Período", "Period", "Période", "Zeitraum", "Periodo"), type: "badge", badgeColors: { "Hoy": "green", "Semana": "blue", "Mes": "purple", "Trimestre": "yellow" } },
          { key: "value", label: t5("Valor", "Value", "Valeur", "Wert", "Valore"), type: "text" },
          { key: "change", label: t5("Cambio", "Change", "Changement", "Änderung", "Variazione"), type: "text" },
          { key: "trend", label: t5("Tendencia", "Trend", "Tendance", "Trend", "Tendenza"), type: "badge", badgeColors: { Subiendo: "green", Estable: "blue", Bajando: "red" } },
        ],
        rows: [
          { metric: "Mensajes procesados", period: "Hoy", value: "847", change: "+12%", trend: "Subiendo" },
          { metric: "Citas agendadas", period: "Semana", value: "64", change: "+8%", trend: "Subiendo" },
          { metric: "Tasa de conversión", period: "Mes", value: "34.2%", change: "+2.1%", trend: "Subiendo" },
          { metric: "Tiempo medio respuesta", period: "Semana", value: "1.2s", change: "-15%", trend: "Subiendo" },
          { metric: "Escalados a humano", period: "Mes", value: "11%", change: "-4%", trend: "Subiendo" },
          { metric: "Retención de clientes", period: "Trimestre", value: "92%", change: "+3%", trend: "Subiendo" },
          { metric: "Coste por conversación", period: "Mes", value: "€0.08", change: "-22%", trend: "Subiendo" },
        ],
        searchPlaceholder: t5("Buscar métricas...", "Search metrics...", "Rechercher métriques...", "Metriken suchen...", "Cerca metriche..."),
        searchField: "metric",
      },
    },

    // ── Rules & Anti-Spam ──
    {
      id: "rules",
      label: t5("Reglas Anti-Spam", "Anti-Spam Rules", "Règles Anti-Spam", "Anti-Spam-Regeln", "Regole Anti-Spam"),
      icon: "shield",
      kpis: [
        { label: t5("Reglas Activas", "Active Rules", "Règles Actives", "Aktive Regeln", "Regole Attive"), value: "12", trend: "neutral" },
        { label: t5("Mensajes Bloqueados", "Messages Blocked", "Messages Bloqués", "Blockierte Nachrichten", "Messaggi Bloccati"), value: "23", change: "this week", trend: "neutral" },
        { label: t5("Límite Diario", "Daily Limit", "Limite Quotidien", "Tageslimit", "Limite Giornaliero"), value: "500 msg", trend: "neutral" },
        { label: t5("Estado", "Status", "Statut", "Status", "Stato"), value: t5("Protegido", "Protected", "Protégé", "Geschützt", "Protetto"), trend: "up" },
      ],
      table: {
        columns: [
          { key: "rule", label: t5("Regla", "Rule", "Règle", "Regel", "Regola"), type: "text" },
          { key: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { Obligatoria: "red", Recomendada: "yellow", Personalizada: "blue" } },
          { key: "description", label: t5("Descripción", "Description", "Description", "Beschreibung", "Descrizione"), type: "text" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activa: "green", Inactiva: "gray" } },
        ],
        rows: [
          { rule: "No cold outreach", type: "Obligatoria", description: "Solo responder a contactos que iniciaron conversación", status: "Activa" },
          { rule: "Rate limit 500/día", type: "Obligatoria", description: "Máximo 500 mensajes salientes por día", status: "Activa" },
          { rule: "No bulk messaging", type: "Obligatoria", description: "Prohibido envío masivo sin consentimiento previo", status: "Activa" },
          { rule: "Opt-out inmediato", type: "Obligatoria", description: "Respetar 'STOP' o 'No quiero más mensajes' al instante", status: "Activa" },
          { rule: "Horario permitido", type: "Obligatoria", description: "Solo enviar entre 09:00-21:00 hora local del contacto", status: "Activa" },
          { rule: "Verificación Meta", type: "Recomendada", description: "Usar Meta WhatsApp API si el negocio está verificado", status: "Activa" },
          { rule: "Cooldown 24h", type: "Recomendada", description: "Esperar 24h antes de re-contactar sin respuesta", status: "Activa" },
          { rule: "Max 3 follow-ups", type: "Recomendada", description: "Máximo 3 seguimientos sin respuesta del contacto", status: "Activa" },
          { rule: "Identificación clara", type: "Obligatoria", description: "El agente siempre se identifica como IA al inicio", status: "Activa" },
          { rule: "Sin contenido engañoso", type: "Obligatoria", description: "Prohibido contenido falso, spam o clickbait", status: "Activa" },
          { rule: "Blacklist automática", type: "Personalizada", description: "Bloquear números que reportan spam automáticamente", status: "Activa" },
          { rule: "Límite por contacto", type: "Personalizada", description: "Máximo 10 mensajes por contacto en 24h", status: "Activa" },
        ],
        searchPlaceholder: t5("Buscar reglas...", "Search rules...", "Rechercher règles...", "Regeln suchen...", "Cerca regole..."),
        searchField: "rule",
      },
    },
  ];
}
