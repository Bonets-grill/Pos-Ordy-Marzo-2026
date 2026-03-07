import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const agencyPlatformConfig: SystemConfig = {
  name: t5("AgencyOS","AgencyOS","AgencyOS","AgencyOS","AgencyOS"),
  subtitle: t5("Plataforma de Agencia","Agency Platform","Plateforme d'Agence","Agenturplattform","Piattaforma Agenzia"),
  brandColor: "#dc2626",
  icon: "🏢",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel","Dashboard","Tableau de Bord","Dashboard","Pannello"),
      icon: "dashboard",
      kpis: [
        { label: t5("Revenue (Mes)","Revenue (Month)","Revenu (Mois)","Umsatz (Monat)","Ricavi (Mese)"), value: "$156,400", change: "+22%", trend: "up" },
        { label: t5("Proyectos Activos","Active Projects","Projets Actifs","Aktive Projekte","Progetti Attivi"), value: "18", change: "+3", trend: "up" },
        { label: t5("Clientes Activos","Active Clients","Clients Actifs","Aktive Kunden","Clienti Attivi"), value: "34", change: "+2", trend: "up" },
        { label: t5("Utilización Equipo","Team Utilization","Utilisation Équipe","Teamauslastung","Utilizzo Team"), value: "82%", change: "+4%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "activity", label: t5("Actividad Reciente","Recent Activity","Activité Récente","Neueste Aktivität","Attività Recente") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente") },
          { key: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto") },
          { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo"), type: "badge", badgeColors: { "Entrega": "green", "Propuesta": "purple", "Contrato": "blue", "Factura": "orange" } },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
        ],
        rows: [
          { activity: "Entrega final aprobada por cliente", client: "FashionBrand Co", project: "Campaña Primavera", type: "Entrega", date: "Mar 7, 2026" },
          { activity: "Propuesta enviada para rebrand", client: "TechStartup Inc", project: "Rebranding Completo", type: "Propuesta", date: "Mar 7, 2026" },
          { activity: "Contrato firmado - Web corporativa", client: "Laboratorios Alfa", project: "Web Corporativa", type: "Contrato", date: "Mar 6, 2026" },
          { activity: "Factura emitida mes de febrero", client: "Hotel Mediterráneo", project: "Marketing Digital", type: "Factura", date: "Mar 6, 2026" },
          { activity: "Entrega de mockups aprobada", client: "Restaurante Élite", project: "App Reservas", type: "Entrega", date: "Mar 5, 2026" },
        ],
        searchPlaceholder: t5("Buscar actividad...","Search activity...","Rechercher une activité...","Aktivität suchen...","Cerca attività..."),
      },
    },
    {
      id: "clients",
      label: t5("Clientes","Clients","Clients","Kunden","Clienti"),
      icon: "users",
      kpis: [
        { label: t5("Total Clientes","Total Clients","Total Clients","Kunden Gesamt","Clienti Totali"), value: "56", change: "+4", trend: "up" },
        { label: t5("Activos","Active","Actifs","Aktiv","Attivi"), value: "34", trend: "neutral" },
        { label: t5("Revenue Promedio","Average Revenue","Revenu Moyen","Durchschnittlicher Umsatz","Ricavo Medio"), value: "$4,600/mo", trend: "neutral" },
        { label: t5("Retención Anual","Annual Retention","Rétention Annuelle","Jährliche Bindung","Ritenzione Annuale"), value: "88%", change: "+3%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "tier", label: t5("Nivel","Tier","Niveau","Stufe","Livello"), type: "badge", badgeColors: { "Enterprise": "purple", "Premium": "blue", "Standard": "green" } },
          { key: "projects", label: t5("Proyectos","Projects","Projets","Projekte","Progetti") },
          { key: "monthlyRevenue", label: t5("Revenue/Mes","Revenue/Month","Revenu/Mois","Umsatz/Monat","Ricavi/Mese"), type: "currency" },
          { key: "since", label: t5("Cliente Desde","Client Since","Client Depuis","Kunde Seit","Cliente Dal"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "En Pausa": "yellow", "Churned": "red" } },
        ],
        rows: [
          { name: "FashionBrand Co", tier: "Enterprise", projects: "4", monthlyRevenue: "$12,500", since: "Mar 2023", status: "Activo" },
          { name: "TechStartup Inc", tier: "Premium", projects: "2", monthlyRevenue: "$6,800", since: "Sep 2024", status: "Activo" },
          { name: "Laboratorios Alfa", tier: "Enterprise", projects: "3", monthlyRevenue: "$9,200", since: "Jun 2023", status: "Activo" },
          { name: "Hotel Mediterráneo", tier: "Premium", projects: "2", monthlyRevenue: "$4,500", since: "Ene 2025", status: "Activo" },
          { name: "Restaurante Élite", tier: "Standard", projects: "1", monthlyRevenue: "$2,200", since: "Nov 2025", status: "Activo" },
          { name: "MotoShop SA", tier: "Standard", projects: "1", monthlyRevenue: "$0", since: "Abr 2024", status: "En Pausa" },
        ],
        searchPlaceholder: t5("Buscar clientes...","Search clients...","Rechercher des clients...","Kunden suchen...","Cerca clienti..."),
      },
      modal: {
        title: t5("Nuevo Cliente","New Client","Nouveau Client","Neuer Kunde","Nuovo Cliente"),
        fields: [
          { name: "name", label: t5("Nombre / Empresa","Name / Company","Nom / Entreprise","Name / Unternehmen","Nome / Azienda"), type: "text", required: true, placeholder: t5("Ej: Empresa SL","E.g.: Company LLC","Ex : Société SARL","Z.B.: Firma GmbH","Es.: Azienda SRL") },
          { name: "email", label: t5("Email Contacto","Contact Email","Email de Contact","Kontakt-E-Mail","Email Contatto"), type: "email", required: true, placeholder: "contacto@empresa.com" },
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel", placeholder: "+34 600-000-000" },
          { name: "tier", label: t5("Nivel","Tier","Niveau","Stufe","Livello"), type: "select", required: true, options: [
            { value: "Enterprise", label: "Enterprise" }, { value: "Premium", label: "Premium" }, { value: "Standard", label: "Standard" },
          ]},
          { name: "industry", label: t5("Industria","Industry","Secteur","Branche","Settore"), type: "text", placeholder: t5("Ej: Moda, Tecnología, Hostelería","E.g.: Fashion, Technology, Hospitality","Ex : Mode, Technologie, Hôtellerie","Z.B.: Mode, Technologie, Gastronomie","Es.: Moda, Tecnologia, Ospitalità") },
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea", placeholder: t5("Información adicional del cliente...","Additional client information...","Informations supplémentaires sur le client...","Zusätzliche Kundeninformationen...","Informazioni aggiuntive sul cliente...") },
        ],
      },
    },
    {
      id: "projects",
      label: t5("Proyectos","Projects","Projets","Projekte","Progetti"),
      icon: "briefcase",
      kpis: [
        { label: t5("Total Proyectos","Total Projects","Total Projets","Projekte Gesamt","Progetti Totali"), value: "42", trend: "neutral" },
        { label: t5("Activos","Active","Actifs","Aktiv","Attivi"), value: "18", change: "+3", trend: "up" },
        { label: t5("Completados (Trimestre)","Completed (Quarter)","Complétés (Trimestre)","Abgeschlossen (Quartal)","Completati (Trimestre)"), value: "11", trend: "neutral" },
        { label: t5("Revenue Proyectos","Projects Revenue","Revenu Projets","Projektumsatz","Ricavi Progetti"), value: "$289,000", change: "+15%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Proyecto","Project","Projet","Projekt","Progetto"), type: "avatar" },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente") },
          { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo") },
          { key: "budget", label: t5("Presupuesto","Budget","Budget","Budget","Budget"), type: "currency" },
          { key: "progress", label: t5("Progreso","Progress","Progression","Fortschritt","Progresso") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "Propuesta": "purple", "Completado": "blue", "En Pausa": "yellow" } },
        ],
        rows: [
          { name: "Campaña Primavera 2026", client: "FashionBrand Co", type: "Campaña Digital", budget: "$28,000", progress: "90%", status: "Activo" },
          { name: "Rebranding Completo", client: "TechStartup Inc", type: "Branding", budget: "$18,500", progress: "0%", status: "Propuesta" },
          { name: "Web Corporativa", client: "Laboratorios Alfa", type: "Desarrollo Web", budget: "$32,000", progress: "15%", status: "Activo" },
          { name: "Marketing Digital Q1", client: "Hotel Mediterráneo", type: "Marketing", budget: "$13,500", progress: "65%", status: "Activo" },
          { name: "App de Reservas", client: "Restaurante Élite", type: "Desarrollo App", budget: "$22,000", progress: "40%", status: "Activo" },
          { name: "Catálogo Online", client: "MotoShop SA", type: "E-Commerce", budget: "$15,000", progress: "55%", status: "En Pausa" },
        ],
        searchPlaceholder: t5("Buscar proyectos...","Search projects...","Rechercher des projets...","Projekte suchen...","Cerca progetti..."),
      },
      tabs: [
        { id: "all", label: t5("Todos","All","Tous","Alle","Tutti"), filterField: "status", filterValue: "all" },
        { id: "active", label: t5("Activos","Active","Actifs","Aktiv","Attivi"), filterField: "status", filterValue: "Activo" },
        { id: "proposal", label: t5("Propuestas","Proposals","Propositions","Angebote","Proposte"), filterField: "status", filterValue: "Propuesta" },
        { id: "completed", label: t5("Completados","Completed","Complétés","Abgeschlossen","Completati"), filterField: "status", filterValue: "Completado" },
        { id: "paused", label: t5("En Pausa","Paused","En Pause","Pausiert","In Pausa"), filterField: "status", filterValue: "En Pausa" },
      ],
      modal: {
        title: t5("Nuevo Proyecto","New Project","Nouveau Projet","Neues Projekt","Nuovo Progetto"),
        fields: [
          { name: "name", label: t5("Nombre del Proyecto","Project Name","Nom du Projet","Projektname","Nome del Progetto"), type: "text", required: true, placeholder: t5("Ej: Campaña Verano 2026","E.g.: Summer Campaign 2026","Ex : Campagne Été 2026","Z.B.: Sommerkampagne 2026","Es.: Campagna Estate 2026") },
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "select", required: true, options: [
            { value: "FashionBrand Co", label: "FashionBrand Co" }, { value: "TechStartup Inc", label: "TechStartup Inc" },
            { value: "Laboratorios Alfa", label: "Laboratorios Alfa" }, { value: "Hotel Mediterráneo", label: "Hotel Mediterráneo" },
          ]},
          { name: "type", label: t5("Tipo de Proyecto","Project Type","Type de Projet","Projekttyp","Tipo di Progetto"), type: "select", required: true, options: [
            { value: "Branding", label: "Branding" }, { value: "Desarrollo Web", label: t5("Desarrollo Web","Web Development","Développement Web","Webentwicklung","Sviluppo Web") },
            { value: "Marketing", label: t5("Marketing Digital","Digital Marketing","Marketing Digital","Digitales Marketing","Marketing Digitale") }, { value: "Desarrollo App", label: t5("Desarrollo App","App Development","Développement App","App-Entwicklung","Sviluppo App") },
            { value: "E-Commerce", label: "E-Commerce" }, { value: "Campaña", label: t5("Campaña Digital","Digital Campaign","Campagne Digitale","Digitale Kampagne","Campagna Digitale") },
          ]},
          { name: "budget", label: t5("Presupuesto ($)","Budget ($)","Budget ($)","Budget ($)","Budget ($)"), type: "number", required: true, placeholder: "0" },
          { name: "deadline", label: t5("Fecha Límite","Deadline","Date Limite","Frist","Scadenza"), type: "date" },
          { name: "description", label: t5("Descripción","Description","Description","Beschreibung","Descrizione"), type: "textarea", placeholder: t5("Descripción del proyecto...","Project description...","Description du projet...","Projektbeschreibung...","Descrizione del progetto...") },
        ],
      },
    },
    {
      id: "proposals",
      label: t5("Propuestas","Proposals","Propositions","Angebote","Proposte"),
      icon: "send",
      kpis: [
        { label: t5("Propuestas Activas","Active Proposals","Propositions Actives","Aktive Angebote","Proposte Attive"), value: "9", trend: "neutral" },
        { label: t5("Tasa de Conversión","Conversion Rate","Taux de Conversion","Konversionsrate","Tasso di Conversione"), value: "62%", change: "+8%", trend: "up" },
        { label: t5("Valor Pipeline","Pipeline Value","Valeur Pipeline","Pipeline-Wert","Valore Pipeline"), value: "$124,500", trend: "neutral" },
        { label: t5("Tiempo Medio Respuesta","Average Response Time","Temps Moyen de Réponse","Durchschnittliche Antwortzeit","Tempo Medio di Risposta"), value: t5("4.2 días","4.2 days","4,2 jours","4,2 Tage","4,2 giorni"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "title", label: t5("Propuesta","Proposal","Proposition","Angebot","Proposta") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "value", label: t5("Valor","Value","Valeur","Wert","Valore"), type: "currency" },
          { key: "sentDate", label: t5("Enviada","Sent","Envoyée","Gesendet","Inviata"), type: "date" },
          { key: "validUntil", label: t5("Válida Hasta","Valid Until","Valide Jusqu'au","Gültig Bis","Valida Fino Al"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Aceptada": "green", "Enviada": "blue", "En Revisión": "yellow", "Rechazada": "red", "Expirada": "gray" } },
        ],
        rows: [
          { title: "Rebranding + Guía de Marca", client: "TechStartup Inc", value: "$18,500", sentDate: "Mar 7, 2026", validUntil: "Mar 21, 2026", status: "Enviada" },
          { title: "Gestión RRSS Q2 2026", client: "FashionBrand Co", value: "$9,600", sentDate: "Mar 5, 2026", validUntil: "Mar 19, 2026", status: "En Revisión" },
          { title: "Landing Pages Producto", client: "Laboratorios Alfa", value: "$7,200", sentDate: "Mar 3, 2026", validUntil: "Mar 17, 2026", status: "Aceptada" },
          { title: "Video Corporativo", client: "Hotel Mediterráneo", value: "$11,000", sentDate: "Feb 28, 2026", validUntil: "Mar 14, 2026", status: "Enviada" },
          { title: "SEO + SEM Anual", client: "Restaurante Élite", value: "$14,400", sentDate: "Feb 20, 2026", validUntil: "Mar 6, 2026", status: "Expirada" },
        ],
        searchPlaceholder: t5("Buscar propuestas...","Search proposals...","Rechercher des propositions...","Angebote suchen...","Cerca proposte..."),
      },
      modal: {
        title: t5("Nueva Propuesta","New Proposal","Nouvelle Proposition","Neues Angebot","Nuova Proposta"),
        fields: [
          { name: "title", label: t5("Título","Title","Titre","Titel","Titolo"), type: "text", required: true, placeholder: t5("Ej: Diseño Web + SEO","E.g.: Web Design + SEO","Ex : Design Web + SEO","Z.B.: Webdesign + SEO","Es.: Web Design + SEO") },
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "text", required: true, placeholder: t5("Nombre del cliente","Client name","Nom du client","Kundenname","Nome del cliente") },
          { name: "value", label: t5("Valor ($)","Value ($)","Valeur ($)","Wert ($)","Valore ($)"), type: "number", required: true, placeholder: "0" },
          { name: "validUntil", label: t5("Válida Hasta","Valid Until","Valide Jusqu'au","Gültig Bis","Valida Fino Al"), type: "date", required: true },
          { name: "description", label: t5("Descripción","Description","Description","Beschreibung","Descrizione"), type: "textarea", required: true, placeholder: t5("Detalle de la propuesta...","Proposal details...","Détail de la proposition...","Angebotsdetails...","Dettaglio della proposta...") },
        ],
      },
    },
    {
      id: "contracts",
      label: t5("Contratos","Contracts","Contrats","Verträge","Contratti"),
      icon: "shield",
      kpis: [
        { label: t5("Contratos Activos","Active Contracts","Contrats Actifs","Aktive Verträge","Contratti Attivi"), value: "28", trend: "neutral" },
        { label: t5("Valor Total Anual","Total Annual Value","Valeur Annuelle Totale","Jährlicher Gesamtwert","Valore Totale Annuale"), value: "$892,000", change: "+18%", trend: "up" },
        { label: t5("Renovaciones Próximas","Upcoming Renewals","Renouvellements à Venir","Kommende Verlängerungen","Rinnovi Imminenti"), value: "5", trend: "neutral" },
        { label: t5("Tasa de Renovación","Renewal Rate","Taux de Renouvellement","Verlängerungsrate","Tasso di Rinnovo"), value: "91%", change: "+3%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "type", label: t5("Tipo Contrato","Contract Type","Type de Contrat","Vertragstyp","Tipo Contratto") },
          { key: "value", label: t5("Valor Anual","Annual Value","Valeur Annuelle","Jährlicher Wert","Valore Annuale"), type: "currency" },
          { key: "startDate", label: t5("Inicio","Start","Début","Beginn","Inizio"), type: "date" },
          { key: "endDate", label: t5("Fin","End","Fin","Ende","Fine"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "Por Renovar": "yellow", "Finalizado": "gray", "Cancelado": "red" } },
        ],
        rows: [
          { client: "FashionBrand Co", type: "Retainer Mensual", value: "$150,000", startDate: "Ene 1, 2026", endDate: "Dic 31, 2026", status: "Activo" },
          { client: "Laboratorios Alfa", type: "Proyecto + Mantenimiento", value: "$110,400", startDate: "Mar 1, 2026", endDate: "Feb 28, 2027", status: "Activo" },
          { client: "Hotel Mediterráneo", type: "Marketing Mensual", value: "$54,000", startDate: "Ene 1, 2025", endDate: "Mar 31, 2026", status: "Por Renovar" },
          { client: "TechStartup Inc", type: "Proyecto Puntual", value: "$18,500", startDate: "Mar 15, 2026", endDate: "Jun 15, 2026", status: "Activo" },
          { client: "MotoShop SA", type: "Desarrollo Web", value: "$15,000", startDate: "Abr 1, 2024", endDate: "Sep 30, 2024", status: "Finalizado" },
        ],
        searchPlaceholder: t5("Buscar contratos...","Search contracts...","Rechercher des contrats...","Verträge suchen...","Cerca contratti..."),
      },
    },
    {
      id: "billing",
      label: t5("Facturación","Billing","Facturation","Abrechnung","Fatturazione"),
      icon: "dollar",
      kpis: [
        { label: t5("Facturado (Mes)","Billed (Month)","Facturé (Mois)","Fakturiert (Monat)","Fatturato (Mese)"), value: "$156,400", change: "+22%", trend: "up" },
        { label: t5("Pendiente de Cobro","Pending Collection","En Attente de Paiement","Ausstehende Zahlung","In Attesa di Pagamento"), value: "$34,200", trend: "down" },
        { label: t5("Cobrado (Mes)","Collected (Month)","Encaissé (Mois)","Eingezogen (Monat)","Incassato (Mese)"), value: "$122,200", change: "+18%", trend: "up" },
        { label: t5("Morosidad","Default Rate","Taux d'Impayés","Zahlungsverzugsrate","Tasso di Morosità"), value: "2.8%", change: "-0.5%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "invoice", label: t5("Factura","Invoice","Facture","Rechnung","Fattura") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "concept", label: t5("Concepto","Concept","Description","Beschreibung","Descrizione") },
          { key: "amount", label: t5("Importe","Amount","Montant","Betrag","Importo"), type: "currency" },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Pagada": "green", "Pendiente": "yellow", "Vencida": "red", "Borrador": "gray" } },
        ],
        rows: [
          { invoice: "AGN-2026-034", client: "FashionBrand Co", concept: "Retainer Marzo 2026", amount: "$12,500", date: "Mar 1, 2026", status: "Pagada" },
          { invoice: "AGN-2026-035", client: "Laboratorios Alfa", concept: "Web Corporativa - Fase 1", amount: "$16,000", date: "Mar 5, 2026", status: "Pendiente" },
          { invoice: "AGN-2026-036", client: "Hotel Mediterráneo", concept: "Marketing Digital Feb", amount: "$4,500", date: "Mar 3, 2026", status: "Pendiente" },
          { invoice: "AGN-2026-033", client: "Restaurante Élite", concept: "App Reservas - Diseño", amount: "$8,800", date: "Feb 28, 2026", status: "Pagada" },
          { invoice: "AGN-2026-030", client: "MotoShop SA", concept: "Catálogo Online - Parcial", amount: "$7,500", date: "Feb 15, 2026", status: "Vencida" },
        ],
        searchPlaceholder: t5("Buscar facturas...","Search invoices...","Rechercher des factures...","Rechnungen suchen...","Cerca fatture..."),
      },
      modal: {
        title: t5("Nueva Factura","New Invoice","Nouvelle Facture","Neue Rechnung","Nuova Fattura"),
        fields: [
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "select", required: true, options: [
            { value: "FashionBrand Co", label: "FashionBrand Co" }, { value: "TechStartup Inc", label: "TechStartup Inc" },
            { value: "Laboratorios Alfa", label: "Laboratorios Alfa" }, { value: "Hotel Mediterráneo", label: "Hotel Mediterráneo" },
          ]},
          { name: "concept", label: t5("Concepto","Concept","Description","Beschreibung","Descrizione"), type: "text", required: true, placeholder: t5("Descripción del servicio","Service description","Description du service","Dienstleistungsbeschreibung","Descrizione del servizio") },
          { name: "amount", label: t5("Importe ($)","Amount ($)","Montant ($)","Betrag ($)","Importo ($)"), type: "number", required: true, placeholder: "0" },
          { name: "dueDate", label: t5("Fecha de Vencimiento","Due Date","Date d'Échéance","Fälligkeitsdatum","Data di Scadenza"), type: "date", required: true },
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
          { label: t5("Total Agencias","Total Agencies","Total Agences","Agenturen Gesamt","Agenzie Totali"), value: "43", change: "+3", trend: "up" },
          { label: "MRR", value: "$3,180", change: "+10%", trend: "up" },
          { label: t5("Usuarios Activos","Active Users","Utilisateurs Actifs","Aktive Benutzer","Utenti Attivi"), value: "287", trend: "neutral" },
          { label: "Churn", value: "2.3%", change: "-0.4%", trend: "up" },
        ],
        table: {
          columns: [
            { key: "company", label: t5("Agencia","Agency","Agence","Agentur","Agenzia"), type: "avatar" },
            { key: "plan", label: t5("Plan","Plan","Forfait","Plan","Piano"), type: "badge", badgeColors: { "Pro": "purple", "Basic": "blue", "Enterprise": "green" } },
            { key: "users", label: t5("Usuarios","Users","Utilisateurs","Benutzer","Utenti") },
            { key: "mrr", label: "MRR", type: "currency" },
            { key: "since", label: t5("Desde","Since","Depuis","Seit","Dal"), type: "date" },
            { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activa": "green", "Trial": "yellow", "Suspendida": "red" } },
          ],
          rows: [
            { company: "Creative Force Agency", plan: "Enterprise", users: "32", mrr: "$99/mo", since: "May 2024", status: "Activa" },
            { company: "Digital Pulse", plan: "Pro", users: "14", mrr: "$59/mo", since: "Ago 2024", status: "Activa" },
            { company: "BrandMakers", plan: "Pro", users: "8", mrr: "$59/mo", since: "Dic 2025", status: "Activa" },
            { company: "Startup Agency", plan: "Basic", users: "3", mrr: "$29/mo", since: "Feb 2026", status: "Trial" },
            { company: "MediaGroup International", plan: "Enterprise", users: "78", mrr: "$199/mo", since: "Ene 2023", status: "Activa" },
          ],
          searchPlaceholder: t5("Buscar agencias...","Search agencies...","Rechercher des agences...","Agenturen suchen...","Cerca agenzie..."),
        },
        modal: {
          title: t5("Nueva Agencia","New Agency","Nouvelle Agence","Neue Agentur","Nuova Agenzia"),
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
