import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const crmConfig: SystemConfig = {
  name: t5("SalesPro CRM","SalesPro CRM","SalesPro CRM","SalesPro CRM","SalesPro CRM"),
  subtitle: t5("Gestión de Relaciones con Clientes","Customer Relationship Management","Gestion de la Relation Client","Kundenbeziehungsmanagement","Gestione Relazioni Clienti"),
  brandColor: "#6366f1",
  icon: "👥",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel","Dashboard","Tableau de Bord","Dashboard","Pannello"),
      icon: "dashboard",
      kpis: [
        { label: t5("Revenue (Mes)","Revenue (Month)","Revenu (Mois)","Umsatz (Monat)","Ricavi (Mese)"), value: "$124,500", change: "+18.2%", trend: "up" },
        { label: t5("Deals Activos","Active Deals","Deals Actifs","Aktive Deals","Deal Attivi"), value: "47", change: "+5", trend: "up" },
        { label: t5("Leads Nuevos","New Leads","Nouveaux Leads","Neue Leads","Nuovi Lead"), value: "128", change: "+32%", trend: "up" },
        { label: t5("Tasa de Cierre","Close Rate","Taux de Clôture","Abschlussrate","Tasso di Chiusura"), value: "34%", change: "+2.1%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "deal", label: t5("Deal","Deal","Affaire","Deal","Affare"), type: "avatar" },
          { key: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda") },
          { key: "value", label: t5("Valor","Value","Valeur","Wert","Valore"), type: "currency" },
          { key: "stage", label: t5("Etapa","Stage","Étape","Phase","Fase"), type: "badge", badgeColors: { "Prospecto": "blue", "Propuesta": "yellow", "Negociación": "orange", "Cerrado": "green", "Perdido": "red" } },
          { key: "owner", label: t5("Responsable","Owner","Responsable","Verantwortlicher","Responsabile") },
          { key: "nextAction", label: t5("Próxima Acción","Next Action","Prochaine Action","Nächste Aktion","Prossima Azione"), type: "date" },
        ],
        rows: [
          { deal: "Migración Cloud", company: "TechCorp Inc.", value: "$45,000", stage: "Negociación", owner: "Ana García", nextAction: "Mar 8, 2026" },
          { deal: "Licencia Enterprise", company: "Global Media", value: "$28,000", stage: "Propuesta", owner: "Carlos Ruiz", nextAction: "Mar 10, 2026" },
          { deal: "Consultoría Digital", company: "StartupXYZ", value: "$12,500", stage: "Prospecto", owner: "María López", nextAction: "Mar 9, 2026" },
          { deal: "Implementación ERP", company: "FoodChain SA", value: "$67,000", stage: "Cerrado", owner: "Ana García", nextAction: "Mar 7, 2026" },
          { deal: "Soporte Anual", company: "Retail Plus", value: "$8,400", stage: "Propuesta", owner: "Luis Torres", nextAction: "Mar 12, 2026" },
        ],
        searchPlaceholder: t5("Buscar deals...","Search deals...","Rechercher des deals...","Deals suchen...","Cerca deal..."),
      },
    },
    {
      id: "contacts",
      label: t5("Contactos","Contacts","Contacts","Kontakte","Contatti"),
      icon: "users",
      kpis: [
        { label: t5("Total Contactos","Total Contacts","Total Contacts","Kontakte Gesamt","Contatti Totali"), value: "3,456", change: "+89", trend: "up" },
        { label: t5("Empresas","Companies","Entreprises","Unternehmen","Aziende"), value: "342", trend: "neutral" },
        { label: t5("Activos (30d)","Active (30d)","Actifs (30j)","Aktiv (30T)","Attivi (30g)"), value: "1,234", trend: "neutral" },
        { label: t5("Sin Actividad","Inactive","Sans Activité","Inaktiv","Senza Attività"), value: "567", trend: "down" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Nombre","Name","Nom","Name","Nome"), type: "avatar" },
          { key: "email", label: t5("Email","Email","Email","E-Mail","Email") },
          { key: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda") },
          { key: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono") },
          { key: "lastContact", label: t5("Último Contacto","Last Contact","Dernier Contact","Letzter Kontakt","Ultimo Contatto"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "Lead": "blue", "Inactivo": "gray", "VIP": "purple" } },
        ],
        rows: [
          { name: "Elena Rodríguez", email: "elena@techcorp.com", company: "TechCorp Inc.", phone: "+34 612-345-678", lastContact: "Mar 6, 2026", status: "VIP" },
          { name: "Marco Bianchi", email: "marco@globalmedia.it", company: "Global Media", phone: "+39 333-456-789", lastContact: "Mar 5, 2026", status: "Activo" },
          { name: "Sophie Müller", email: "sophie@startupxyz.de", company: "StartupXYZ", phone: "+49 176-789-012", lastContact: "Mar 4, 2026", status: "Lead" },
          { name: "David Park", email: "david@retailplus.com", company: "Retail Plus", phone: "+1 555-234-567", lastContact: "Feb 28, 2026", status: "Activo" },
          { name: "Laura Fernández", email: "laura@foodchain.es", company: "FoodChain SA", phone: "+34 655-123-456", lastContact: "Feb 20, 2026", status: "Inactivo" },
          { name: "James Wilson", email: "james@acme.co.uk", company: "ACME Corp", phone: "+44 7700-900-123", lastContact: "Mar 7, 2026", status: "Lead" },
        ],
        searchPlaceholder: t5("Buscar contactos...","Search contacts...","Rechercher des contacts...","Kontakte suchen...","Cerca contatti..."),
      },
      modal: {
        title: t5("Nuevo Contacto","New Contact","Nouveau Contact","Neuer Kontakt","Nuovo Contatto"),
        fields: [
          { name: "name", label: t5("Nombre Completo","Full Name","Nom Complet","Vollständiger Name","Nome Completo"), type: "text", required: true, placeholder: t5("Ej: Juan Pérez","E.g.: John Smith","Ex : Jean Dupont","Z.B.: Max Mustermann","Es.: Mario Rossi") },
          { name: "email", label: t5("Email","Email","Email","E-Mail","Email"), type: "email", required: true, placeholder: "email@empresa.com" },
          { name: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda"), type: "text", placeholder: t5("Nombre de la empresa","Company name","Nom de l'entreprise","Unternehmensname","Nome dell'azienda") },
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel", placeholder: "+34 600-000-000" },
          { name: "position", label: t5("Cargo","Position","Poste","Position","Ruolo"), type: "text", placeholder: t5("Ej: Director Comercial","E.g.: Sales Director","Ex : Directeur Commercial","Z.B.: Vertriebsleiter","Es.: Direttore Commerciale") },
          { name: "source", label: t5("Origen","Source","Source","Herkunft","Origine"), type: "select", options: [
            { value: "web", label: t5("Formulario Web","Web Form","Formulaire Web","Webformular","Modulo Web") }, { value: "linkedin", label: "LinkedIn" },
            { value: "referral", label: t5("Referido","Referral","Recommandation","Empfehlung","Referenza") }, { value: "event", label: t5("Evento","Event","Événement","Event","Evento") },
            { value: "cold", label: t5("Cold Outreach","Cold Outreach","Prospection à Froid","Kaltakquise","Contatto a Freddo") },
          ]},
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea", placeholder: t5("Notas sobre el contacto...","Notes about the contact...","Notes sur le contact...","Notizen zum Kontakt...","Note sul contatto...") },
        ],
      },
    },
    {
      id: "pipelines",
      label: t5("Pipelines","Pipelines","Pipelines","Pipelines","Pipeline"),
      icon: "chart",
      kpis: [
        { label: t5("Pipeline Total","Total Pipeline","Pipeline Total","Pipeline Gesamt","Pipeline Totale"), value: "$387,500", trend: "neutral" },
        { label: t5("Promedio por Deal","Average per Deal","Moyenne par Deal","Durchschnitt pro Deal","Media per Deal"), value: "$8,245", trend: "neutral" },
        { label: t5("Deals en Pipeline","Deals in Pipeline","Deals dans le Pipeline","Deals in der Pipeline","Deal nella Pipeline"), value: "47", change: "+5", trend: "up" },
        { label: t5("Cierre Estimado","Estimated Close","Clôture Estimée","Geschätzter Abschluss","Chiusura Stimata"), value: "$131,750", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "deal", label: t5("Deal","Deal","Affaire","Deal","Affare"), type: "avatar" },
          { key: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda") },
          { key: "value", label: t5("Valor","Value","Valeur","Wert","Valore"), type: "currency" },
          { key: "probability", label: t5("Probabilidad","Probability","Probabilité","Wahrscheinlichkeit","Probabilità") },
          { key: "stage", label: t5("Etapa","Stage","Étape","Phase","Fase"), type: "badge", badgeColors: { "Cualificación": "blue", "Propuesta": "yellow", "Negociación": "orange", "Cierre": "green" } },
          { key: "closeDate", label: t5("Fecha Cierre","Close Date","Date de Clôture","Abschlussdatum","Data Chiusura"), type: "date" },
        ],
        rows: [
          { deal: "Cloud Migration", company: "TechCorp", value: "$45,000", probability: "75%", stage: "Negociación", closeDate: "Mar 15, 2026" },
          { deal: "Enterprise License", company: "Global Media", value: "$28,000", probability: "50%", stage: "Propuesta", closeDate: "Mar 20, 2026" },
          { deal: "Consulting Pack", company: "StartupXYZ", value: "$12,500", probability: "25%", stage: "Cualificación", closeDate: "Apr 1, 2026" },
          { deal: "Annual Support", company: "Retail Plus", value: "$8,400", probability: "60%", stage: "Propuesta", closeDate: "Mar 25, 2026" },
          { deal: "Data Analytics", company: "BioPharm Ltd", value: "$34,000", probability: "40%", stage: "Cualificación", closeDate: "Apr 10, 2026" },
          { deal: "Security Audit", company: "FinBank", value: "$22,000", probability: "80%", stage: "Cierre", closeDate: "Mar 10, 2026" },
        ],
        searchPlaceholder: t5("Buscar deals...","Search deals...","Rechercher des deals...","Deals suchen...","Cerca deal..."),
      },
      tabs: [
        { id: "all", label: t5("Todos","All","Tous","Alle","Tutti"), filterField: "4", filterValue: "all" },
        { id: "qual", label: t5("Cualificación","Qualification","Qualification","Qualifizierung","Qualificazione"), filterField: "4", filterValue: "Cualificación" },
        { id: "prop", label: t5("Propuesta","Proposal","Proposition","Angebot","Proposta"), filterField: "4", filterValue: "Propuesta" },
        { id: "nego", label: t5("Negociación","Negotiation","Négociation","Verhandlung","Negoziazione"), filterField: "4", filterValue: "Negociación" },
        { id: "close", label: t5("Cierre","Closing","Clôture","Abschluss","Chiusura"), filterField: "4", filterValue: "Cierre" },
      ],
      modal: {
        title: t5("Nuevo Deal","New Deal","Nouveau Deal","Neuer Deal","Nuovo Deal"),
        fields: [
          { name: "deal", label: t5("Nombre del Deal","Deal Name","Nom du Deal","Dealname","Nome del Deal"), type: "text", required: true, placeholder: t5("Ej: Implementación CRM","E.g.: CRM Implementation","Ex : Implémentation CRM","Z.B.: CRM-Implementierung","Es.: Implementazione CRM") },
          { name: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda"), type: "text", required: true },
          { name: "value", label: t5("Valor ($)","Value ($)","Valeur ($)","Wert ($)","Valore ($)"), type: "number", required: true, placeholder: "0" },
          { name: "stage", label: t5("Etapa","Stage","Étape","Phase","Fase"), type: "select", required: true, options: [
            { value: "Cualificación", label: t5("Cualificación","Qualification","Qualification","Qualifizierung","Qualificazione") }, { value: "Propuesta", label: t5("Propuesta","Proposal","Proposition","Angebot","Proposta") },
            { value: "Negociación", label: t5("Negociación","Negotiation","Négociation","Verhandlung","Negoziazione") }, { value: "Cierre", label: t5("Cierre","Closing","Clôture","Abschluss","Chiusura") },
          ]},
          { name: "owner", label: t5("Responsable","Owner","Responsable","Verantwortlicher","Responsabile"), type: "select", options: [
            { value: "Ana García", label: "Ana García" }, { value: "Carlos Ruiz", label: "Carlos Ruiz" },
            { value: "María López", label: "María López" }, { value: "Luis Torres", label: "Luis Torres" },
          ]},
          { name: "closeDate", label: t5("Fecha Estimada de Cierre","Estimated Close Date","Date de Clôture Estimée","Geschätztes Abschlussdatum","Data di Chiusura Stimata"), type: "date" },
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea" },
        ],
      },
    },
    {
      id: "deals",
      label: t5("Deals","Deals","Deals","Deals","Deal"),
      icon: "dollar",
      kpis: [
        { label: t5("Cerrados (Mes)","Closed (Month)","Clôturés (Mois)","Abgeschlossen (Monat)","Chiusi (Mese)"), value: "12", change: "+3", trend: "up" },
        { label: t5("Revenue Cerrado","Closed Revenue","Revenu Clôturé","Abgeschlossener Umsatz","Ricavi Chiusi"), value: "$89,400", change: "+22%", trend: "up" },
        { label: t5("Perdidos","Lost","Perdus","Verloren","Persi"), value: "4", trend: "down" },
        { label: t5("Tiempo Promedio","Average Time","Temps Moyen","Durchschnittliche Zeit","Tempo Medio"), value: t5("18 días","18 days","18 jours","18 Tage","18 giorni"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "deal", label: t5("Deal","Deal","Affaire","Deal","Affare"), type: "avatar" },
          { key: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda") },
          { key: "value", label: t5("Valor","Value","Valeur","Wert","Valore"), type: "currency" },
          { key: "closedDate", label: t5("Fecha Cierre","Close Date","Date de Clôture","Abschlussdatum","Data Chiusura"), type: "date" },
          { key: "owner", label: t5("Responsable","Owner","Responsable","Verantwortlicher","Responsabile") },
          { key: "result", label: t5("Resultado","Result","Résultat","Ergebnis","Risultato"), type: "badge", badgeColors: { "Ganado": "green", "Perdido": "red", "En Proceso": "yellow" } },
        ],
        rows: [
          { deal: "Implementación ERP", company: "FoodChain SA", value: "$67,000", closedDate: "Mar 5, 2026", owner: "Ana García", result: "Ganado" },
          { deal: "Website Redesign", company: "ModeShop", value: "$15,000", closedDate: "Mar 3, 2026", owner: "Carlos Ruiz", result: "Ganado" },
          { deal: "App Mobile", company: "FitLife", value: "$32,000", closedDate: "Mar 1, 2026", owner: "María López", result: "Perdido" },
          { deal: "Security Audit", company: "FinBank", value: "$22,000", closedDate: "Feb 28, 2026", owner: "Ana García", result: "Ganado" },
          { deal: "Cloud Migration", company: "OldTech Inc", value: "$41,000", closedDate: "Feb 25, 2026", owner: "Luis Torres", result: "Ganado" },
        ],
        searchPlaceholder: t5("Buscar deals cerrados...","Search closed deals...","Rechercher des deals clôturés...","Abgeschlossene Deals suchen...","Cerca deal chiusi..."),
      },
      tabs: [
        { id: "all", label: t5("Todos","All","Tous","Alle","Tutti"), filterField: "5", filterValue: "all" },
        { id: "won", label: t5("Ganados","Won","Gagnés","Gewonnen","Vinti"), filterField: "5", filterValue: "Ganado" },
        { id: "lost", label: t5("Perdidos","Lost","Perdus","Verloren","Persi"), filterField: "5", filterValue: "Perdido" },
      ],
    },
    {
      id: "analytics",
      label: t5("Analytics","Analytics","Analytique","Analytik","Analitica"),
      icon: "chart",
      kpis: [
        { label: t5("Conversión Global","Global Conversion","Conversion Globale","Globale Konversion","Conversione Globale"), value: "34%", change: "+2.1%", trend: "up" },
        { label: t5("Emails Enviados","Emails Sent","Emails Envoyés","Gesendete E-Mails","Email Inviate"), value: "2,456", trend: "neutral" },
        { label: t5("Tasa Apertura","Open Rate","Taux d'Ouverture","Öffnungsrate","Tasso di Apertura"), value: "42%", change: "+5%", trend: "up" },
        { label: t5("Reuniones (Sem)","Meetings (Week)","Réunions (Sem)","Meetings (Woche)","Riunioni (Sett)"), value: "28", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "rep", label: t5("Representante","Representative","Représentant","Vertreter","Rappresentante"), type: "avatar" },
          { key: "deals", label: t5("Deals","Deals","Deals","Deals","Deal") },
          { key: "revenue", label: t5("Revenue","Revenue","Revenu","Umsatz","Ricavi"), type: "currency" },
          { key: "calls", label: t5("Llamadas","Calls","Appels","Anrufe","Chiamate") },
          { key: "emails", label: t5("Emails","Emails","Emails","E-Mails","Email") },
          { key: "conversion", label: t5("Conversión","Conversion","Conversion","Konversion","Conversione"), type: "badge", badgeColors: { "Excelente": "green", "Bueno": "blue", "Regular": "yellow", "Bajo": "red" } },
        ],
        rows: [
          { rep: "Ana García", deals: "8", revenue: "$142,000", calls: "45", emails: "120", conversion: "Excelente" },
          { rep: "Carlos Ruiz", deals: "5", revenue: "$67,500", calls: "38", emails: "95", conversion: "Bueno" },
          { rep: "María López", deals: "3", revenue: "$44,500", calls: "52", emails: "140", conversion: "Regular" },
          { rep: "Luis Torres", deals: "6", revenue: "$89,400", calls: "41", emails: "110", conversion: "Bueno" },
        ],
        searchPlaceholder: t5("Buscar representante...","Search representative...","Rechercher un représentant...","Vertreter suchen...","Cerca rappresentante..."),
      },
    },
    {
      id: "tasks",
      label: t5("Tareas","Tasks","Tâches","Aufgaben","Attività"),
      icon: "clipboard",
      kpis: [
        { label: t5("Pendientes","Pending","En Attente","Ausstehend","In Sospeso"), value: "23", trend: "neutral" },
        { label: t5("Vencidas","Overdue","En Retard","Überfällig","Scadute"), value: "4", change: "+2", trend: "down" },
        { label: t5("Completadas (Sem)","Completed (Week)","Complétées (Sem)","Erledigt (Woche)","Completate (Sett)"), value: "31", trend: "up" },
        { label: t5("Total Activas","Total Active","Total Actives","Gesamt Aktiv","Totale Attive"), value: "56", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "task", label: t5("Tarea","Task","Tâche","Aufgabe","Attività") },
          { key: "contact", label: t5("Contacto","Contact","Contact","Kontakt","Contatto"), type: "avatar" },
          { key: "deal", label: t5("Deal","Deal","Affaire","Deal","Affare") },
          { key: "due", label: t5("Vencimiento","Due Date","Échéance","Fälligkeitsdatum","Scadenza"), type: "date" },
          { key: "priority", label: t5("Prioridad","Priority","Priorité","Priorität","Priorità"), type: "badge", badgeColors: { "Alta": "red", "Media": "yellow", "Baja": "green" } },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Pendiente": "yellow", "En Progreso": "blue", "Completada": "green", "Vencida": "red" } },
        ],
        rows: [
          { task: "Enviar propuesta revisada", contact: "Elena Rodríguez", deal: "Cloud Migration", due: "Mar 8, 2026", priority: "Alta", status: "Pendiente" },
          { task: "Llamada de seguimiento", contact: "Marco Bianchi", deal: "Enterprise License", due: "Mar 9, 2026", priority: "Media", status: "Pendiente" },
          { task: "Demo del producto", contact: "Sophie Müller", deal: "Consulting Pack", due: "Mar 7, 2026", priority: "Alta", status: "Vencida" },
          { task: "Revisar contrato", contact: "David Park", deal: "Annual Support", due: "Mar 10, 2026", priority: "Alta", status: "En Progreso" },
          { task: "Enviar caso de éxito", contact: "James Wilson", deal: "Data Analytics", due: "Mar 12, 2026", priority: "Baja", status: "Pendiente" },
        ],
        searchPlaceholder: t5("Buscar tareas...","Search tasks...","Rechercher des tâches...","Aufgaben suchen...","Cerca attività..."),
      },
      modal: {
        title: t5("Nueva Tarea","New Task","Nouvelle Tâche","Neue Aufgabe","Nuova Attività"),
        fields: [
          { name: "task", label: t5("Descripción","Description","Description","Beschreibung","Descrizione"), type: "text", required: true, placeholder: t5("Ej: Llamar al cliente","E.g.: Call the client","Ex : Appeler le client","Z.B.: Kunden anrufen","Es.: Chiamare il cliente") },
          { name: "contact", label: t5("Contacto","Contact","Contact","Kontakt","Contatto"), type: "text" },
          { name: "deal", label: t5("Deal Asociado","Associated Deal","Deal Associé","Zugehöriger Deal","Deal Associato"), type: "text" },
          { name: "due", label: t5("Fecha Límite","Due Date","Date Limite","Fälligkeitsdatum","Data di Scadenza"), type: "date", required: true },
          { name: "priority", label: t5("Prioridad","Priority","Priorité","Priorität","Priorità"), type: "select", required: true, options: [
            { value: "Alta", label: t5("Alta","High","Haute","Hoch","Alta") }, { value: "Media", label: t5("Media","Medium","Moyenne","Mittel","Media") }, { value: "Baja", label: t5("Baja","Low","Basse","Niedrig","Bassa") },
          ]},
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea" },
        ],
      },
    },
  ],
  superAdmin: {
    modules: [
      {
        id: "tenants",
        label: t5("Tenants","Tenants","Tenants","Mandanten","Tenant"),
        icon: "building",
        kpis: [
          { label: t5("Total Empresas","Total Companies","Total Entreprises","Unternehmen Gesamt","Aziende Totali"), value: "89", change: "+7", trend: "up" },
          { label: "MRR", value: "$5,251", change: "+12%", trend: "up" },
          { label: t5("Usuarios Activos","Active Users","Utilisateurs Actifs","Aktive Benutzer","Utenti Attivi"), value: "456", trend: "neutral" },
          { label: "Churn", value: "1.8%", change: "-0.5%", trend: "up" },
        ],
        table: {
          columns: [
            { key: "company", label: t5("Empresa","Company","Entreprise","Unternehmen","Azienda"), type: "avatar" },
            { key: "plan", label: t5("Plan","Plan","Forfait","Plan","Piano"), type: "badge", badgeColors: { "Pro": "purple", "Basic": "blue", "Enterprise": "green" } },
            { key: "users", label: t5("Usuarios","Users","Utilisateurs","Benutzer","Utenti") },
            { key: "mrr", label: "MRR", type: "currency" },
            { key: "since", label: t5("Desde","Since","Depuis","Seit","Dal"), type: "date" },
            { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activa": "green", "Trial": "yellow", "Suspendida": "red" } },
          ],
          rows: [
            { company: "Innovatech", plan: "Enterprise", users: "45", mrr: "$99/mo", since: "Jan 2024", status: "Activa" },
            { company: "Digital Solutions", plan: "Pro", users: "12", mrr: "$59/mo", since: "Jun 2024", status: "Activa" },
            { company: "GrowthCo", plan: "Pro", users: "8", mrr: "$59/mo", since: "Nov 2025", status: "Activa" },
            { company: "StartupHub", plan: "Basic", users: "3", mrr: "$29/mo", since: "Feb 2026", status: "Trial" },
            { company: "MegaCorp", plan: "Enterprise", users: "120", mrr: "$199/mo", since: "Mar 2023", status: "Activa" },
          ],
          searchPlaceholder: t5("Buscar empresas...","Search companies...","Rechercher des entreprises...","Unternehmen suchen...","Cerca aziende..."),
        },
        modal: {
          title: t5("Nueva Empresa","New Company","Nouvelle Entreprise","Neues Unternehmen","Nuova Azienda"),
          fields: [
            { name: "company", label: t5("Nombre","Name","Nom","Name","Nome"), type: "text", required: true },
            { name: "email", label: t5("Email Admin","Admin Email","Email Admin","Admin-E-Mail","Email Admin"), type: "email", required: true },
            { name: "plan", label: t5("Plan","Plan","Forfait","Plan","Piano"), type: "select", required: true, options: [
              { value: "Basic", label: "Basic — $29/mo" }, { value: "Pro", label: "Pro — $59/mo" }, { value: "Enterprise", label: "Enterprise — $99/mo" },
            ]},
          ],
        },
      },
    ],
  },
};
