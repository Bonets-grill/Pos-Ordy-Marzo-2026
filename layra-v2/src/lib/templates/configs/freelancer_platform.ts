import { t5 } from "../types";
import type { SystemConfig } from "../types";

export const freelancerPlatformConfig: SystemConfig = {
  name: "FreelanceHub",
  subtitle: t5("Plataforma Freelancer", "Freelancer Platform", "Plateforme Freelance", "Freelancer-Plattform", "Piattaforma Freelancer"),
  brandColor: "#0891b2",
  icon: "💼",
  modules: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      kpis: [
        { label: t5("Ingresos (Mes)", "Revenue (Month)", "Revenus (Mois)", "Einnahmen (Monat)", "Entrate (Mese)"), value: "$8,450", change: "+24%", trend: "up" },
        { label: t5("Proyectos Activos", "Active Projects", "Projets Actifs", "Aktive Projekte", "Progetti Attivi"), value: "5", change: "+1", trend: "up" },
        { label: t5("Horas Facturables", "Billable Hours", "Heures Facturables", "Abrechenbare Stunden", "Ore Fatturabili"), value: "124h", change: "+12%", trend: "up" },
        { label: t5("Tarifa Promedio", "Average Rate", "Tarif Moyen", "Durchschnittstarif", "Tariffa Media"), value: "$68/h", change: "+$5", trend: "up" },
      ],
      table: {
        columns: [
          { key: "activity", label: t5("Actividad Reciente", "Recent Activity", "Activité Récente", "Letzte Aktivität", "Attività Recente") },
          { key: "project", label: t5("Proyecto", "Project", "Projet", "Projekt", "Progetto") },
          { key: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente") },
          { key: "type", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { "Pago": "green", "Entrega": "blue", "Propuesta": "purple", "Feedback": "yellow" } },
          { key: "date", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
        ],
        rows: [
          { activity: "Pago recibido - Sprint 3", project: "App Fitness", client: "GymPro SA", type: "Pago", date: "Mar 7, 2026" },
          { activity: "Entrega de wireframes aprobada", project: "Tienda Online", client: "Artesanía Maya", type: "Entrega", date: "Mar 7, 2026" },
          { activity: "Propuesta enviada - Landing page", project: "Landing Producto", client: "NovaBio Labs", type: "Propuesta", date: "Mar 6, 2026" },
          { activity: "Feedback recibido del cliente", project: "Dashboard Analytics", client: "DataViz Corp", type: "Feedback", date: "Mar 6, 2026" },
          { activity: "Entrega final del logotipo", project: "Branding Completo", client: "Café Orgánico", type: "Entrega", date: "Mar 5, 2026" },
        ],
        searchPlaceholder: t5("Buscar actividad...", "Search activity...", "Rechercher une activité...", "Aktivität suchen...", "Cerca attività..."),
      },
    },
    {
      id: "projects",
      label: t5("Proyectos", "Projects", "Projets", "Projekte", "Progetti"),
      icon: "briefcase",
      kpis: [
        { label: t5("Total Proyectos", "Total Projects", "Total Projets", "Projekte Gesamt", "Totale Progetti"), value: "23", trend: "neutral" },
        { label: t5("Activos", "Active", "Actifs", "Aktiv", "Attivi"), value: "5", trend: "neutral" },
        { label: t5("Completados", "Completed", "Terminés", "Abgeschlossen", "Completati"), value: "15", change: "+2", trend: "up" },
        { label: t5("Revenue Total", "Total Revenue", "Revenu Total", "Gesamtumsatz", "Entrate Totali"), value: "$67,800", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Proyecto", "Project", "Projet", "Projekt", "Progetto"), type: "avatar" },
          { key: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente") },
          { key: "budget", label: t5("Presupuesto", "Budget", "Budget", "Budget", "Budget"), type: "currency" },
          { key: "hours", label: t5("Horas", "Hours", "Heures", "Stunden", "Ore") },
          { key: "progress", label: t5("Progreso", "Progress", "Progrès", "Fortschritt", "Progresso") },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activo": "green", "Completado": "blue", "Propuesta": "purple", "En Espera": "yellow" } },
        ],
        rows: [
          { name: "App Fitness - React Native", client: "GymPro SA", budget: "$12,000", hours: "85/140h", progress: "61%", status: "Activo" },
          { name: "Tienda Online Shopify", client: "Artesanía Maya", budget: "$4,500", hours: "32/60h", progress: "53%", status: "Activo" },
          { name: "Dashboard Analytics", client: "DataViz Corp", budget: "$8,200", hours: "45/80h", progress: "56%", status: "Activo" },
          { name: "Landing Producto SaaS", client: "NovaBio Labs", budget: "$2,800", hours: "0/35h", progress: "0%", status: "Propuesta" },
          { name: "Branding Completo", client: "Café Orgánico", budget: "$3,500", hours: "48/48h", progress: "100%", status: "Completado" },
          { name: "API REST Inventario", client: "LogiTrack SL", budget: "$6,000", hours: "20/75h", progress: "27%", status: "En Espera" },
        ],
        searchPlaceholder: t5("Buscar proyectos...", "Search projects...", "Rechercher des projets...", "Projekte suchen...", "Cerca progetti..."),
      },
      tabs: [
        { id: "all", label: t5("Todos", "All", "Tous", "Alle", "Tutti"), filterField: "status", filterValue: "all" },
        { id: "active", label: t5("Activos", "Active", "Actifs", "Aktiv", "Attivi"), filterField: "status", filterValue: "Activo" },
        { id: "completed", label: t5("Completados", "Completed", "Terminés", "Abgeschlossen", "Completati"), filterField: "status", filterValue: "Completado" },
        { id: "proposal", label: t5("Propuestas", "Proposals", "Propositions", "Vorschläge", "Proposte"), filterField: "status", filterValue: "Propuesta" },
        { id: "waiting", label: t5("En Espera", "On Hold", "En Attente", "Wartend", "In Attesa"), filterField: "status", filterValue: "En Espera" },
      ],
      modal: {
        title: t5("Nuevo Proyecto", "New Project", "Nouveau Projet", "Neues Projekt", "Nuovo Progetto"),
        fields: [
          { name: "name", label: t5("Nombre del Proyecto", "Project Name", "Nom du Projet", "Projektname", "Nome del Progetto"), type: "text", required: true, placeholder: t5("Ej: Redesign App Móvil", "E.g.: Mobile App Redesign", "Ex : Redesign App Mobile", "Z.B.: Mobile App Redesign", "Es.: Redesign App Mobile") },
          { name: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente"), type: "text", required: true, placeholder: t5("Nombre del cliente", "Client name", "Nom du client", "Kundenname", "Nome del cliente") },
          { name: "budget", label: t5("Presupuesto ($)", "Budget ($)", "Budget ($)", "Budget ($)", "Budget ($)"), type: "number", required: true, placeholder: "0" },
          { name: "estimatedHours", label: t5("Horas Estimadas", "Estimated Hours", "Heures Estimées", "Geschätzte Stunden", "Ore Stimate"), type: "number", placeholder: "0" },
          { name: "deadline", label: t5("Fecha Límite", "Deadline", "Date Limite", "Frist", "Scadenza"), type: "date" },
          { name: "description", label: t5("Descripción", "Description", "Description", "Beschreibung", "Descrizione"), type: "textarea", placeholder: t5("Descripción del proyecto...", "Project description...", "Description du projet...", "Projektbeschreibung...", "Descrizione del progetto...") },
        ],
      },
    },
    {
      id: "clients",
      label: t5("Clientes", "Clients", "Clients", "Kunden", "Clienti"),
      icon: "users",
      kpis: [
        { label: t5("Total Clientes", "Total Clients", "Total Clients", "Kunden Gesamt", "Totale Clienti"), value: "18", change: "+2", trend: "up" },
        { label: t5("Activos", "Active", "Actifs", "Aktiv", "Attivi"), value: "8", trend: "neutral" },
        { label: t5("Recurrentes", "Recurring", "Récurrents", "Wiederkehrend", "Ricorrenti"), value: "6", trend: "neutral" },
        { label: t5("Ingreso Promedio", "Average Revenue", "Revenu Moyen", "Durchschnittlicher Umsatz", "Entrata Media"), value: "$3,767", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "email", label: "Email" },
          { key: "projects", label: t5("Proyectos", "Projects", "Projets", "Projekte", "Progetti") },
          { key: "totalPaid", label: t5("Total Pagado", "Total Paid", "Total Payé", "Gesamt Bezahlt", "Totale Pagato"), type: "currency" },
          { key: "lastProject", label: t5("Último Proyecto", "Last Project", "Dernier Projet", "Letztes Projekt", "Ultimo Progetto"), type: "date" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activo": "green", "Inactivo": "gray", "Nuevo": "blue" } },
        ],
        rows: [
          { name: "GymPro SA", email: "dev@gympro.com", projects: "3", totalPaid: "$28,500", lastProject: "Mar 7, 2026", status: "Activo" },
          { name: "Artesanía Maya", email: "info@artmaya.com", projects: "1", totalPaid: "$2,200", lastProject: "Mar 7, 2026", status: "Activo" },
          { name: "DataViz Corp", email: "tech@dataviz.io", projects: "2", totalPaid: "$14,600", lastProject: "Mar 6, 2026", status: "Activo" },
          { name: "NovaBio Labs", email: "hello@novabio.com", projects: "0", totalPaid: "$0", lastProject: "—", status: "Nuevo" },
          { name: "Café Orgánico", email: "marca@cafeorganico.es", projects: "1", totalPaid: "$3,500", lastProject: "Mar 5, 2026", status: "Activo" },
          { name: "LogiTrack SL", email: "ops@logitrack.es", projects: "2", totalPaid: "$9,200", lastProject: "Feb 10, 2026", status: "Inactivo" },
        ],
        searchPlaceholder: t5("Buscar clientes...", "Search clients...", "Rechercher des clients...", "Kunden suchen...", "Cerca clienti..."),
      },
      modal: {
        title: t5("Nuevo Cliente", "New Client", "Nouveau Client", "Neuer Kunde", "Nuovo Cliente"),
        fields: [
          { name: "name", label: t5("Nombre / Empresa", "Name / Company", "Nom / Entreprise", "Name / Unternehmen", "Nome / Azienda"), type: "text", required: true, placeholder: t5("Ej: Empresa SL", "E.g.: Company LLC", "Ex : Entreprise SARL", "Z.B.: Firma GmbH", "Es.: Azienda SRL") },
          { name: "email", label: "Email", type: "email", required: true, placeholder: "contacto@empresa.com" },
          { name: "phone", label: t5("Teléfono", "Phone", "Téléphone", "Telefon", "Telefono"), type: "tel", placeholder: "+34 600-000-000" },
          { name: "source", label: t5("Origen", "Source", "Origine", "Herkunft", "Origine"), type: "select", options: [
            { value: "referral", label: t5("Referido", "Referral", "Recommandation", "Empfehlung", "Referenza") },
            { value: "linkedin", label: "LinkedIn" },
            { value: "upwork", label: "Upwork" },
            { value: "web", label: t5("Sitio Web", "Website", "Site Web", "Webseite", "Sito Web") },
            { value: "other", label: t5("Otro", "Other", "Autre", "Andere", "Altro") },
          ]},
          { name: "notes", label: t5("Notas", "Notes", "Notes", "Notizen", "Note"), type: "textarea", placeholder: t5("Información del cliente...", "Client information...", "Informations du client...", "Kundeninformationen...", "Informazioni del cliente...") },
        ],
      },
    },
    {
      id: "proposals",
      label: t5("Propuestas", "Proposals", "Propositions", "Vorschläge", "Proposte"),
      icon: "send",
      kpis: [
        { label: t5("Propuestas Enviadas", "Proposals Sent", "Propositions Envoyées", "Gesendete Vorschläge", "Proposte Inviate"), value: "32", trend: "neutral" },
        { label: t5("Tasa de Aceptación", "Acceptance Rate", "Taux d'Acceptation", "Annahmequote", "Tasso di Accettazione"), value: "56%", change: "+4%", trend: "up" },
        { label: t5("Valor Pendiente", "Pending Value", "Valeur en Attente", "Ausstehender Wert", "Valore in Sospeso"), value: "$18,300", trend: "neutral" },
        { label: t5("Tiempo Respuesta", "Response Time", "Temps de Réponse", "Antwortzeit", "Tempo di Risposta"), value: t5("3.5 días", "3.5 days", "3.5 jours", "3.5 Tage", "3.5 giorni"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "title", label: t5("Propuesta", "Proposal", "Proposition", "Vorschlag", "Proposta") },
          { key: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "value", label: t5("Valor", "Value", "Valeur", "Wert", "Valore"), type: "currency" },
          { key: "sentDate", label: t5("Enviada", "Sent", "Envoyée", "Gesendet", "Inviata"), type: "date" },
          { key: "platform", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma") },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Aceptada": "green", "Enviada": "blue", "Rechazada": "red", "Borrador": "gray" } },
        ],
        rows: [
          { title: "Landing Producto SaaS", client: "NovaBio Labs", value: "$2,800", sentDate: "Mar 6, 2026", platform: "Directo", status: "Enviada" },
          { title: "Migración WordPress a Next.js", client: "Blog Viajero", value: "$5,500", sentDate: "Mar 4, 2026", platform: "Upwork", status: "Enviada" },
          { title: "App Fitness - Sprint 4", client: "GymPro SA", value: "$4,000", sentDate: "Mar 2, 2026", platform: "Directo", status: "Aceptada" },
          { title: "Chatbot IA para soporte", client: "SoporteYa", value: "$6,000", sentDate: "Feb 28, 2026", platform: "LinkedIn", status: "Rechazada" },
          { title: "Rediseño Dashboard", client: "DataViz Corp", value: "$3,200", sentDate: "Feb 25, 2026", platform: "Directo", status: "Aceptada" },
        ],
        searchPlaceholder: t5("Buscar propuestas...", "Search proposals...", "Rechercher des propositions...", "Vorschläge suchen...", "Cerca proposte..."),
      },
      modal: {
        title: t5("Nueva Propuesta", "New Proposal", "Nouvelle Proposition", "Neuer Vorschlag", "Nuova Proposta"),
        fields: [
          { name: "title", label: t5("Título", "Title", "Titre", "Titel", "Titolo"), type: "text", required: true, placeholder: t5("Ej: Desarrollo App React Native", "E.g.: React Native App Development", "Ex : Développement App React Native", "Z.B.: React Native App-Entwicklung", "Es.: Sviluppo App React Native") },
          { name: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente"), type: "text", required: true, placeholder: t5("Nombre del cliente", "Client name", "Nom du client", "Kundenname", "Nome del cliente") },
          { name: "value", label: t5("Valor ($)", "Value ($)", "Valeur ($)", "Wert ($)", "Valore ($)"), type: "number", required: true, placeholder: "0" },
          { name: "platform", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "select", options: [
            { value: "Directo", label: t5("Directo", "Direct", "Direct", "Direkt", "Diretto") },
            { value: "Upwork", label: "Upwork" },
            { value: "LinkedIn", label: "LinkedIn" },
            { value: "Fiverr", label: "Fiverr" },
          ]},
          { name: "description", label: t5("Descripción", "Description", "Description", "Beschreibung", "Descrizione"), type: "textarea", required: true, placeholder: t5("Detalle de la propuesta...", "Proposal details...", "Détails de la proposition...", "Details des Vorschlags...", "Dettagli della proposta...") },
        ],
      },
    },
    {
      id: "invoicing",
      label: t5("Facturación", "Invoicing", "Facturation", "Rechnungsstellung", "Fatturazione"),
      icon: "dollar",
      kpis: [
        { label: t5("Facturado (Mes)", "Invoiced (Month)", "Facturé (Mois)", "Abgerechnet (Monat)", "Fatturato (Mese)"), value: "$8,450", change: "+24%", trend: "up" },
        { label: t5("Pendiente", "Pending", "En Attente", "Ausstehend", "In Sospeso"), value: "$4,200", trend: "neutral" },
        { label: t5("Cobrado (Mes)", "Collected (Month)", "Encaissé (Mois)", "Eingezogen (Monat)", "Incassato (Mese)"), value: "$6,700", trend: "up" },
        { label: t5("Facturas Emitidas", "Invoices Issued", "Factures Émises", "Ausgestellte Rechnungen", "Fatture Emesse"), value: "8", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "number", label: t5("Nº Factura", "Invoice #", "Nº Facture", "Rechnungs-Nr.", "N° Fattura") },
          { key: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "concept", label: t5("Concepto", "Concept", "Concept", "Konzept", "Concetto") },
          { key: "amount", label: t5("Importe", "Amount", "Montant", "Betrag", "Importo"), type: "currency" },
          { key: "date", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Pagada": "green", "Pendiente": "yellow", "Vencida": "red", "Borrador": "gray" } },
        ],
        rows: [
          { number: "FH-2026-024", client: "GymPro SA", concept: "Sprint 3 - App Fitness", amount: "$4,000", date: "Mar 7, 2026", status: "Pagada" },
          { number: "FH-2026-023", client: "DataViz Corp", concept: "Dashboard - Fase 2", amount: "$3,200", date: "Mar 3, 2026", status: "Pendiente" },
          { number: "FH-2026-022", client: "Café Orgánico", concept: "Branding Completo", amount: "$3,500", date: "Mar 1, 2026", status: "Pagada" },
          { number: "FH-2026-021", client: "Artesanía Maya", concept: "Tienda Online - Diseño", amount: "$1,800", date: "Feb 25, 2026", status: "Pendiente" },
          { number: "FH-2026-020", client: "LogiTrack SL", concept: "API Inventario - Parcial", amount: "$3,000", date: "Feb 15, 2026", status: "Vencida" },
        ],
        searchPlaceholder: t5("Buscar facturas...", "Search invoices...", "Rechercher des factures...", "Rechnungen suchen...", "Cerca fatture..."),
      },
      modal: {
        title: t5("Nueva Factura", "New Invoice", "Nouvelle Facture", "Neue Rechnung", "Nuova Fattura"),
        fields: [
          { name: "client", label: t5("Cliente", "Client", "Client", "Kunde", "Cliente"), type: "select", required: true, options: [
            { value: "GymPro SA", label: "GymPro SA" }, { value: "DataViz Corp", label: "DataViz Corp" },
            { value: "Artesanía Maya", label: "Artesanía Maya" }, { value: "Café Orgánico", label: "Café Orgánico" },
          ]},
          { name: "concept", label: t5("Concepto", "Concept", "Concept", "Konzept", "Concetto"), type: "text", required: true, placeholder: t5("Descripción del servicio", "Service description", "Description du service", "Servicebeschreibung", "Descrizione del servizio") },
          { name: "amount", label: t5("Importe ($)", "Amount ($)", "Montant ($)", "Betrag ($)", "Importo ($)"), type: "number", required: true, placeholder: "0" },
          { name: "dueDate", label: t5("Fecha de Vencimiento", "Due Date", "Date d'Échéance", "Fälligkeitsdatum", "Data di Scadenza"), type: "date", required: true },
        ],
      },
    },
    {
      id: "time_tracking",
      label: t5("Control de Tiempo", "Time Tracking", "Suivi du Temps", "Zeiterfassung", "Monitoraggio Tempo"),
      icon: "clock",
      kpis: [
        { label: t5("Horas Hoy", "Hours Today", "Heures Aujourd'hui", "Stunden Heute", "Ore Oggi"), value: "6.5h", trend: "neutral" },
        { label: t5("Horas Semana", "Hours This Week", "Heures Semaine", "Stunden Woche", "Ore Settimana"), value: "32h", change: "+4h", trend: "up" },
        { label: t5("Tasa Facturable", "Billable Rate", "Taux Facturable", "Abrechnungsquote", "Tasso Fatturabile"), value: "88%", change: "+5%", trend: "up" },
        { label: "Revenue/h", value: "$68", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "project", label: t5("Proyecto", "Project", "Projet", "Projekt", "Progetto") },
          { key: "task", label: t5("Tarea", "Task", "Tâche", "Aufgabe", "Attività") },
          { key: "hours", label: t5("Horas", "Hours", "Heures", "Stunden", "Ore") },
          { key: "rate", label: t5("Tarifa/h", "Rate/h", "Tarif/h", "Satz/h", "Tariffa/h"), type: "currency" },
          { key: "date", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "billable", label: t5("Facturable", "Billable", "Facturable", "Abrechenbar", "Fatturabile"), type: "badge", badgeColors: { "Sí": "green", "No": "gray" } },
        ],
        rows: [
          { project: "App Fitness", task: "Desarrollo pantalla workout", hours: "4.0", rate: "$75", date: "Mar 7, 2026", billable: "Sí" },
          { project: "Tienda Online", task: "Configuración Shopify theme", hours: "3.5", rate: "$65", date: "Mar 7, 2026", billable: "Sí" },
          { project: "Dashboard Analytics", task: "Integración API Charts", hours: "5.0", rate: "$70", date: "Mar 6, 2026", billable: "Sí" },
          { project: "—", task: "Actualizar portfolio personal", hours: "2.0", rate: "$0", date: "Mar 6, 2026", billable: "No" },
          { project: "App Fitness", task: "Bug fixes navegación", hours: "2.5", rate: "$75", date: "Mar 5, 2026", billable: "Sí" },
        ],
        searchPlaceholder: t5("Buscar registros...", "Search records...", "Rechercher des enregistrements...", "Einträge suchen...", "Cerca registri..."),
      },
      modal: {
        title: t5("Registrar Tiempo", "Log Time", "Enregistrer le Temps", "Zeit Erfassen", "Registra Tempo"),
        fields: [
          { name: "project", label: t5("Proyecto", "Project", "Projet", "Projekt", "Progetto"), type: "select", required: true, options: [
            { value: "App Fitness", label: "App Fitness" }, { value: "Tienda Online", label: "Tienda Online" },
            { value: "Dashboard Analytics", label: "Dashboard Analytics" }, { value: "Otro", label: t5("Otro / Personal", "Other / Personal", "Autre / Personnel", "Andere / Persönlich", "Altro / Personale") },
          ]},
          { name: "task", label: t5("Tarea", "Task", "Tâche", "Aufgabe", "Attività"), type: "text", required: true, placeholder: t5("Descripción de la actividad", "Activity description", "Description de l'activité", "Aktivitätsbeschreibung", "Descrizione dell'attività") },
          { name: "hours", label: t5("Horas", "Hours", "Heures", "Stunden", "Ore"), type: "number", required: true, placeholder: "0" },
          { name: "date", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date", required: true },
          { name: "billable", label: t5("Facturable", "Billable", "Facturable", "Abrechenbar", "Fatturabile"), type: "checkbox" },
        ],
      },
    },
  ],
  superAdmin: {
    modules: [
      {
        id: "tenants",
        label: "Tenants",
        icon: "building",
        kpis: [
          { label: "Total Freelancers", value: "312", change: "+28", trend: "up" },
          { label: "MRR", value: "$6,240", change: "+18%", trend: "up" },
          { label: t5("Usuarios Activos", "Active Users", "Utilisateurs Actifs", "Aktive Benutzer", "Utenti Attivi"), value: "245", trend: "neutral" },
          { label: "Churn", value: "3.1%", change: "-0.8%", trend: "up" },
        ],
        table: {
          columns: [
            { key: "company", label: "Freelancer", type: "avatar" },
            { key: "plan", label: "Plan", type: "badge", badgeColors: { "Pro": "purple", "Basic": "blue", "Enterprise": "green" } },
            { key: "users", label: t5("Usuarios", "Users", "Utilisateurs", "Benutzer", "Utenti") },
            { key: "mrr", label: "MRR", type: "currency" },
            { key: "since", label: t5("Desde", "Since", "Depuis", "Seit", "Dal"), type: "date" },
            { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activa": "green", "Trial": "yellow", "Suspendida": "red" } },
          ],
          rows: [
            { company: "María Dev Studio", plan: "Pro", users: "1", mrr: "$19/mo", since: "Jun 2024", status: "Activa" },
            { company: "Carlos Design", plan: "Pro", users: "1", mrr: "$19/mo", since: "Sep 2024", status: "Activa" },
            { company: "Studio Creativo JL", plan: "Basic", users: "1", mrr: "$9/mo", since: "Ene 2026", status: "Activa" },
            { company: "Ana Copywriter", plan: "Basic", users: "1", mrr: "$9/mo", since: "Mar 2026", status: "Trial" },
            { company: "DevTeam Asociados", plan: "Enterprise", users: "5", mrr: "$49/mo", since: "Abr 2023", status: "Activa" },
          ],
          searchPlaceholder: t5("Buscar freelancers...", "Search freelancers...", "Rechercher des freelances...", "Freelancer suchen...", "Cerca freelancer..."),
        },
        modal: {
          title: t5("Nuevo Freelancer", "New Freelancer", "Nouveau Freelance", "Neuer Freelancer", "Nuovo Freelancer"),
          fields: [
            { name: "company", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "plan", label: "Plan", type: "select", required: true, options: [
              { value: "Basic", label: "Basic — $9/mo" }, { value: "Pro", label: "Pro — $19/mo" }, { value: "Enterprise", label: "Enterprise — $49/mo" },
            ]},
          ],
        },
      },
    ],
  },
};
