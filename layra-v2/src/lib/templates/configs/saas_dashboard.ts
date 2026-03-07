import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const saasDashboard: SystemConfig = {
  name: t5("SaaSPanel", "SaaSPanel", "SaaSPanel", "SaaSPanel", "SaaSPanel"),
  subtitle: t5("Dashboard SaaS", "SaaS Dashboard", "Tableau de Bord SaaS", "SaaS-Dashboard", "Dashboard SaaS"),
  brandColor: "#6366f1",
  icon: "📈",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel Principal", "Main Dashboard", "Tableau Principal", "Hauptübersicht", "Pannello Principale"),
      icon: "dashboard",
      kpis: [
        { label: "MRR", value: "€47.800", change: "+16%", trend: "up" },
        { label: t5("Usuarios Activos", "Active Users", "Utilisateurs Actifs", "Aktive Benutzer", "Utenti Attivi"), value: "2.345", change: "+189", trend: "up" },
        { label: "Churn Rate", value: "2.1%", change: "-0.3%", trend: "down" },
        { label: t5("LTV Promedio", "Average LTV", "LTV Moyen", "Durchschnittlicher LTV", "LTV Medio"), value: "€1.240", change: "+€80", trend: "up" },
      ],
      table: {
        columns: [
          { key: "actividad", label: t5("Actividad", "Activity", "Activité", "Aktivität", "Attività"), type: "text" },
          { key: "usuario", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "text" },
          { key: "plan", label: "Plan", type: "badge", badgeColors: { "Free": "gray", "Starter": "blue", "Pro": "purple", "Enterprise": "indigo" } },
          { key: "fecha", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Completado": "green", "Pendiente": "yellow", "Error": "red" } },
        ],
        rows: [
          { actividad: "Upgrade a plan Pro", usuario: "carlos@empresa.com", plan: "Pro", fecha: "2026-03-07", estado: "Completado" },
          { actividad: "Nuevo registro", usuario: "laura@startup.io", plan: "Free", fecha: "2026-03-07", estado: "Completado" },
          { actividad: "Pago fallido - reintento", usuario: "admin@techco.es", plan: "Enterprise", fecha: "2026-03-06", estado: "Error" },
          { actividad: "Cancelación de suscripción", usuario: "info@smallbiz.com", plan: "Starter", fecha: "2026-03-06", estado: "Completado" },
          { actividad: "Solicitud API key Enterprise", usuario: "dev@bigcorp.com", plan: "Enterprise", fecha: "2026-03-06", estado: "Pendiente" },
        ],
        searchPlaceholder: t5("Buscar actividad reciente...", "Search recent activity...", "Rechercher une activité récente...", "Letzte Aktivität suchen...", "Cerca attività recente..."),
      },
    },
    {
      id: "users",
      label: t5("Usuarios", "Users", "Utilisateurs", "Benutzer", "Utenti"),
      icon: "users",
      kpis: [
        { label: t5("Total Usuarios", "Total Users", "Total Utilisateurs", "Benutzer Gesamt", "Utenti Totali"), value: "3.890", change: "+234", trend: "up" },
        { label: t5("Usuarios Activos", "Active Users", "Utilisateurs Actifs", "Aktive Benutzer", "Utenti Attivi"), value: "2.345", change: "+189", trend: "up" },
        { label: t5("En Trial", "On Trial", "En Essai", "In Testphase", "In Prova"), value: "456", change: "+67", trend: "up" },
        { label: t5("Conversión Trial", "Trial Conversion", "Conversion Essai", "Testkonversion", "Conversione Prova"), value: "34%", change: "+3%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "nombre", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "avatar" },
          { key: "email", label: "Email", type: "text" },
          { key: "plan", label: "Plan", type: "badge", badgeColors: { "Free": "gray", "Starter": "blue", "Pro": "purple", "Enterprise": "indigo" } },
          { key: "registro", label: t5("Registro", "Registered", "Inscription", "Registrierung", "Registrazione"), type: "date" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activo": "green", "Trial": "yellow", "Suspendido": "orange", "Cancelado": "red" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { nombre: "Carlos Mendoza", email: "carlos@empresa.com", plan: "Pro", registro: "2025-08-15", estado: "Activo" },
          { nombre: "Laura Vidal", email: "laura@startup.io", plan: "Free", registro: "2026-03-07", estado: "Trial" },
          { nombre: "Empresa TechCo", email: "admin@techco.es", plan: "Enterprise", registro: "2025-01-20", estado: "Activo" },
          { nombre: "SmallBiz S.L.", email: "info@smallbiz.com", plan: "Starter", registro: "2025-11-03", estado: "Cancelado" },
          { nombre: "BigCorp Global", email: "dev@bigcorp.com", plan: "Enterprise", registro: "2024-09-12", estado: "Activo" },
          { nombre: "Ana Prieto", email: "ana@freelance.dev", plan: "Starter", registro: "2026-02-18", estado: "Activo" },
        ],
        searchPlaceholder: t5("Buscar usuario por nombre o email...", "Search user by name or email...", "Rechercher un utilisateur par nom ou email...", "Benutzer nach Name oder E-Mail suchen...", "Cerca utente per nome o email..."),
      },
      modal: {
        title: t5("Nuevo Usuario", "New User", "Nouvel Utilisateur", "Neuer Benutzer", "Nuovo Utente"),
        fields: [
          { name: "nombre", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true, placeholder: t5("Nombre completo", "Full name", "Nom complet", "Vollständiger Name", "Nome completo") },
          { name: "email", label: "Email", type: "email", required: true, placeholder: t5("correo@ejemplo.com", "email@example.com", "email@exemple.com", "email@beispiel.com", "email@esempio.com") },
          { name: "plan", label: "Plan", type: "select", required: true, options: [
            { value: "free", label: "Free" },
            { value: "starter", label: "Starter" },
            { value: "pro", label: "Pro" },
            { value: "enterprise", label: "Enterprise" },
          ]},
          { name: "empresa", label: t5("Empresa", "Company", "Entreprise", "Unternehmen", "Azienda"), type: "text", placeholder: t5("Nombre de la empresa", "Company name", "Nom de l'entreprise", "Firmenname", "Nome dell'azienda") },
          { name: "telefono", label: t5("Teléfono", "Phone", "Téléphone", "Telefon", "Telefono"), type: "tel", placeholder: "+34 600 000 000" },
        ],
      },
      tabs: [
        { id: "todos", label: t5("Todos", "All", "Tous", "Alle", "Tutti"), filterField: "estado", filterValue: "" },
        { id: "activos", label: t5("Activos", "Active", "Actifs", "Aktiv", "Attivi"), filterField: "estado", filterValue: "Activo" },
        { id: "trial", label: "Trial", filterField: "estado", filterValue: "Trial" },
        { id: "suspendidos", label: t5("Suspendidos", "Suspended", "Suspendus", "Gesperrt", "Sospesi"), filterField: "estado", filterValue: "Suspendido" },
        { id: "cancelados", label: t5("Cancelados", "Cancelled", "Annulés", "Storniert", "Cancellati"), filterField: "estado", filterValue: "Cancelado" },
      ],
    },
    {
      id: "subscriptions",
      label: t5("Suscripciones", "Subscriptions", "Abonnements", "Abonnements", "Abbonamenti"),
      icon: "layers",
      kpis: [
        { label: t5("Suscripciones Activas", "Active Subscriptions", "Abonnements Actifs", "Aktive Abonnements", "Abbonamenti Attivi"), value: "1.890", change: "+78", trend: "up" },
        { label: "MRR", value: "€47.800", change: "+16%", trend: "up" },
        { label: "ARR", value: "€573.600", change: "+16%", trend: "up" },
        { label: "ARPU", value: "€25.30", change: "+€1.20", trend: "up" },
      ],
      table: {
        columns: [
          { key: "usuario", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "text" },
          { key: "plan", label: "Plan", type: "badge", badgeColors: { "Free": "gray", "Starter": "blue", "Pro": "purple", "Enterprise": "indigo" } },
          { key: "precio", label: t5("Precio/Mes", "Price/Month", "Prix/Mois", "Preis/Monat", "Prezzo/Mese"), type: "currency" },
          { key: "inicio", label: t5("Inicio", "Start", "Début", "Start", "Inizio"), type: "date" },
          { key: "renovacion", label: t5("Renovación", "Renewal", "Renouvellement", "Verlängerung", "Rinnovo"), type: "date" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activa": "green", "Trial": "yellow", "Cancelada": "red", "Pausada": "orange" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { usuario: "Carlos Mendoza", plan: "Pro", precio: "€49/mes", inicio: "2025-08-15", renovacion: "2026-04-15", estado: "Activa" },
          { usuario: "Empresa TechCo", plan: "Enterprise", precio: "€199/mes", inicio: "2025-01-20", renovacion: "2026-01-20", estado: "Activa" },
          { usuario: "BigCorp Global", plan: "Enterprise", precio: "€199/mes", inicio: "2024-09-12", renovacion: "2026-09-12", estado: "Activa" },
          { usuario: "Ana Prieto", plan: "Starter", precio: "€19/mes", inicio: "2026-02-18", renovacion: "2026-04-18", estado: "Activa" },
          { usuario: "Laura Vidal", plan: "Free", precio: "€0", inicio: "2026-03-07", renovacion: "-", estado: "Trial" },
          { usuario: "SmallBiz S.L.", plan: "Starter", precio: "€19/mes", inicio: "2025-11-03", renovacion: "2026-03-03", estado: "Cancelada" },
        ],
        searchPlaceholder: t5("Buscar suscripción...", "Search subscription...", "Rechercher un abonnement...", "Abonnement suchen...", "Cerca abbonamento..."),
      },
      modal: {
        title: t5("Nueva Suscripción", "New Subscription", "Nouvel Abonnement", "Neues Abonnement", "Nuovo Abbonamento"),
        fields: [
          { name: "usuario", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "text", required: true, placeholder: t5("Email del usuario", "User email", "Email de l'utilisateur", "E-Mail des Benutzers", "Email dell'utente") },
          { name: "plan", label: "Plan", type: "select", required: true, options: [
            { value: "free", label: "Free - €0/mes" },
            { value: "starter", label: "Starter - €19/mes" },
            { value: "pro", label: "Pro - €49/mes" },
            { value: "enterprise", label: "Enterprise - €199/mes" },
          ]},
          { name: "ciclo", label: t5("Ciclo de Facturación", "Billing Cycle", "Cycle de Facturation", "Abrechnungszyklus", "Ciclo di Fatturazione"), type: "select", required: true, options: [
            { value: "mensual", label: t5("Mensual", "Monthly", "Mensuel", "Monatlich", "Mensile") },
            { value: "anual", label: t5("Anual (-20%)", "Annual (-20%)", "Annuel (-20%)", "Jährlich (-20%)", "Annuale (-20%)") },
          ]},
          { name: "fecha_inicio", label: t5("Fecha de Inicio", "Start Date", "Date de Début", "Startdatum", "Data di Inizio"), type: "date", required: true },
          { name: "notas", label: t5("Notas", "Notes", "Notes", "Notizen", "Note"), type: "textarea", placeholder: t5("Condiciones especiales...", "Special conditions...", "Conditions spéciales...", "Besondere Bedingungen...", "Condizioni speciali...") },
        ],
      },
    },
    {
      id: "billing",
      label: t5("Facturación", "Billing", "Facturation", "Rechnungsstellung", "Fatturazione"),
      icon: "dollar",
      kpis: [
        { label: t5("Ingresos (Mes)", "Revenue (Month)", "Revenus (Mois)", "Einnahmen (Monat)", "Entrate (Mese)"), value: "€52.300", change: "+18%", trend: "up" },
        { label: t5("Pagos Fallidos", "Failed Payments", "Paiements Échoués", "Fehlgeschlagene Zahlungen", "Pagamenti Falliti"), value: "12", change: "+3", trend: "up" },
        { label: t5("Reembolsos", "Refunds", "Remboursements", "Rückerstattungen", "Rimborsi"), value: "€890", change: "-€200", trend: "down" },
        { label: t5("Tasa de Cobro", "Collection Rate", "Taux de Recouvrement", "Inkassoquote", "Tasso di Riscossione"), value: "97.8%", change: "+0.3%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "factura", label: t5("Nº Factura", "Invoice #", "Nº Facture", "Rechnungsnr.", "N. Fattura"), type: "text" },
          { key: "usuario", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "text" },
          { key: "concepto", label: t5("Concepto", "Concept", "Description", "Beschreibung", "Descrizione"), type: "text" },
          { key: "importe", label: t5("Importe", "Amount", "Montant", "Betrag", "Importo"), type: "currency" },
          { key: "fecha", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Pagada": "green", "Pendiente": "yellow", "Fallida": "red", "Reembolsada": "orange" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { factura: "INV-2026-1247", usuario: "Empresa TechCo", concepto: "Plan Enterprise - Marzo", importe: "€199.00", fecha: "2026-03-01", estado: "Pagada" },
          { factura: "INV-2026-1246", usuario: "Carlos Mendoza", concepto: "Plan Pro - Marzo", importe: "€49.00", fecha: "2026-03-01", estado: "Pagada" },
          { factura: "INV-2026-1245", usuario: "BigCorp Global", concepto: "Plan Enterprise - Marzo", importe: "€199.00", fecha: "2026-03-01", estado: "Pagada" },
          { factura: "INV-2026-1244", usuario: "Ana Prieto", concepto: "Plan Starter - Marzo", importe: "€19.00", fecha: "2026-03-01", estado: "Pendiente" },
          { factura: "INV-2026-1243", usuario: "SmallBiz S.L.", concepto: "Plan Starter - Marzo", importe: "€19.00", fecha: "2026-03-01", estado: "Fallida" },
        ],
        searchPlaceholder: t5("Buscar factura...", "Search invoice...", "Rechercher une facture...", "Rechnung suchen...", "Cerca fattura..."),
      },
    },
    {
      id: "api_keys",
      label: "API Keys",
      icon: "key",
      kpis: [
        { label: t5("Keys Activas", "Active Keys", "Clés Actives", "Aktive Schlüssel", "Chiavi Attive"), value: "567", change: "+34", trend: "up" },
        { label: t5("Peticiones/Día", "Requests/Day", "Requêtes/Jour", "Anfragen/Tag", "Richieste/Giorno"), value: "1.2M", change: "+15%", trend: "up" },
        { label: t5("Errores API (24h)", "API Errors (24h)", "Erreurs API (24h)", "API-Fehler (24h)", "Errori API (24h)"), value: "0.3%", change: "-0.1%", trend: "down" },
        { label: t5("Latencia Media", "Average Latency", "Latence Moyenne", "Durchschnittliche Latenz", "Latenza Media"), value: "124ms", change: "-12ms", trend: "down" },
      ],
      table: {
        columns: [
          { key: "nombre", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text" },
          { key: "usuario", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "text" },
          { key: "key_preview", label: "API Key", type: "text" },
          { key: "peticiones", label: t5("Peticiones/Día", "Requests/Day", "Requêtes/Jour", "Anfragen/Tag", "Richieste/Giorno"), type: "text" },
          { key: "creada", label: t5("Creada", "Created", "Créée", "Erstellt", "Creata"), type: "date" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activa": "green", "Revocada": "red", "Expirada": "gray" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { nombre: "Producción API v2", usuario: "BigCorp Global", key_preview: "sk_live_****7f3a", peticiones: "45.200", creada: "2025-06-15", estado: "Activa" },
          { nombre: "Integración CRM", usuario: "Empresa TechCo", key_preview: "sk_live_****2b8c", peticiones: "12.800", creada: "2025-09-20", estado: "Activa" },
          { nombre: "App Móvil", usuario: "Carlos Mendoza", key_preview: "sk_live_****9d1e", peticiones: "3.400", creada: "2026-01-10", estado: "Activa" },
          { nombre: "Testing Sandbox", usuario: "Ana Prieto", key_preview: "sk_test_****4a2f", peticiones: "890", creada: "2026-02-18", estado: "Activa" },
          { nombre: "Legacy v1 (deprecated)", usuario: "BigCorp Global", key_preview: "sk_live_****0c7b", peticiones: "0", creada: "2024-03-05", estado: "Revocada" },
        ],
        searchPlaceholder: t5("Buscar API key...", "Search API key...", "Rechercher une clé API...", "API-Schlüssel suchen...", "Cerca chiave API..."),
      },
      modal: {
        title: t5("Nueva API Key", "New API Key", "Nouvelle Clé API", "Neuer API-Schlüssel", "Nuova Chiave API"),
        fields: [
          { name: "nombre", label: t5("Nombre de la Key", "Key Name", "Nom de la Clé", "Schlüsselname", "Nome della Chiave"), type: "text", required: true, placeholder: t5("Ej: Producción API v2", "E.g.: Production API v2", "Ex : Production API v2", "Z.B.: Produktion API v2", "Es.: Produzione API v2") },
          { name: "usuario", label: t5("Usuario/Organización", "User/Organization", "Utilisateur/Organisation", "Benutzer/Organisation", "Utente/Organizzazione"), type: "text", required: true, placeholder: t5("Email del usuario", "User email", "Email de l'utilisateur", "E-Mail des Benutzers", "Email dell'utente") },
          { name: "entorno", label: t5("Entorno", "Environment", "Environnement", "Umgebung", "Ambiente"), type: "select", required: true, options: [
            { value: "live", label: t5("Producción (Live)", "Production (Live)", "Production (Live)", "Produktion (Live)", "Produzione (Live)") },
            { value: "test", label: "Sandbox (Test)" },
          ]},
          { name: "limite", label: t5("Límite Peticiones/Día", "Request Limit/Day", "Limite Requêtes/Jour", "Anfragenlimit/Tag", "Limite Richieste/Giorno"), type: "number", placeholder: "10000" },
          { name: "expiracion", label: t5("Fecha de Expiración", "Expiration Date", "Date d'Expiration", "Ablaufdatum", "Data di Scadenza"), type: "date" },
        ],
      },
    },
    {
      id: "analytics",
      label: t5("Analíticas", "Analytics", "Analytiques", "Analytik", "Analitiche"),
      icon: "chart",
      kpis: [
        { label: "DAU", value: "1.234", change: "+8%", trend: "up" },
        { label: "WAU", value: "2.890", change: "+12%", trend: "up" },
        { label: "MAU", value: "3.456", change: "+15%", trend: "up" },
        { label: t5("Retención (D30)", "Retention (D30)", "Rétention (J30)", "Retention (T30)", "Retention (G30)"), value: "72%", change: "+3%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "metrica", label: t5("Métrica", "Metric", "Métrique", "Metrik", "Metrica"), type: "text" },
          { key: "valor_actual", label: t5("Valor Actual", "Current Value", "Valeur Actuelle", "Aktueller Wert", "Valore Attuale"), type: "text" },
          { key: "valor_anterior", label: t5("Mes Anterior", "Previous Month", "Mois Précédent", "Vormonat", "Mese Precedente"), type: "text" },
          { key: "cambio", label: t5("Cambio", "Change", "Variation", "Änderung", "Variazione"), type: "text" },
          { key: "tendencia", label: t5("Tendencia", "Trend", "Tendance", "Trend", "Tendenza"), type: "badge", badgeColors: { "Subiendo": "green", "Bajando": "red", "Estable": "gray" } },
        ],
        rows: [
          { metrica: "Tasa de Conversión (Free → Paid)", valor_actual: "34%", valor_anterior: "31%", cambio: "+3%", tendencia: "Subiendo" },
          { metrica: "Tiempo Medio en Plataforma", valor_actual: "18 min", valor_anterior: "15 min", cambio: "+20%", tendencia: "Subiendo" },
          { metrica: "NPS (Net Promoter Score)", valor_actual: "72", valor_anterior: "68", cambio: "+4", tendencia: "Subiendo" },
          { metrica: "Churn Rate Mensual", valor_actual: "2.1%", valor_anterior: "2.4%", cambio: "-0.3%", tendencia: "Bajando" },
          { metrica: "CAC (Coste Adquisición)", valor_actual: "€45", valor_anterior: "€52", cambio: "-13%", tendencia: "Bajando" },
          { metrica: "Tickets Soporte / Usuario", valor_actual: "0.3", valor_anterior: "0.3", cambio: "0%", tendencia: "Estable" },
        ],
        searchPlaceholder: t5("Buscar métrica...", "Search metric...", "Rechercher une métrique...", "Metrik suchen...", "Cerca metrica..."),
      },
    },
  ],
  superAdmin: {
    modules: [
      {
        id: "tenants",
        label: t5("Plataformas SaaS", "SaaS Platforms", "Plateformes SaaS", "SaaS-Plattformen", "Piattaforme SaaS"),
        icon: "building",
        kpis: [
          { label: t5("Total Plataformas", "Total Platforms", "Total Plateformes", "Plattformen Gesamt", "Piattaforme Totali"), value: "28", change: "+4", trend: "up" },
          { label: t5("Activas", "Active", "Actives", "Aktiv", "Attive"), value: "25", change: "+3", trend: "up" },
          { label: t5("Usuarios Totales", "Total Users", "Utilisateurs Totaux", "Benutzer Gesamt", "Utenti Totali"), value: "34.500", change: "+2.100", trend: "up" },
          { label: t5("MRR Total", "Total MRR", "MRR Total", "MRR Gesamt", "MRR Totale"), value: "€124.000", change: "+21%", trend: "up" },
        ],
        table: {
          columns: [
            { key: "nombre", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "text" },
            { key: "plan", label: "Plan", type: "badge", badgeColors: { "Startup": "gray", "Scale": "blue", "Enterprise": "purple" } },
            { key: "usuarios", label: t5("Usuarios", "Users", "Utilisateurs", "Benutzer", "Utenti"), type: "text" },
            { key: "mrr", label: "MRR", type: "currency" },
            { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activo": "green", "Trial": "yellow", "Suspendido": "red" } },
            { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
          ],
          rows: [
            { nombre: "FinanceApp Pro", plan: "Enterprise", usuarios: "8.900", mrr: "€47.800", estado: "Activo" },
            { nombre: "HealthTracker SaaS", plan: "Scale", usuarios: "3.200", mrr: "€18.500", estado: "Activo" },
            { nombre: "EduPlatform Online", plan: "Scale", usuarios: "5.600", mrr: "€22.000", estado: "Activo" },
            { nombre: "LogiSuite", plan: "Startup", usuarios: "890", mrr: "€4.500", estado: "Trial" },
            { nombre: "HRCloud España", plan: "Enterprise", usuarios: "12.000", mrr: "€56.000", estado: "Activo" },
          ],
          searchPlaceholder: t5("Buscar plataforma...", "Search platform...", "Rechercher une plateforme...", "Plattform suchen...", "Cerca piattaforma..."),
        },
        modal: {
          title: t5("Nueva Plataforma SaaS", "New SaaS Platform", "Nouvelle Plateforme SaaS", "Neue SaaS-Plattform", "Nuova Piattaforma SaaS"),
          fields: [
            { name: "nombre", label: t5("Nombre de la Plataforma", "Platform Name", "Nom de la Plateforme", "Plattformname", "Nome della Piattaforma"), type: "text", required: true, placeholder: t5("Nombre del SaaS", "SaaS name", "Nom du SaaS", "SaaS-Name", "Nome del SaaS") },
            { name: "plan", label: "Plan", type: "select", required: true, options: [
              { value: "startup", label: "Startup" },
              { value: "scale", label: "Scale" },
              { value: "enterprise", label: "Enterprise" },
            ]},
            { name: "email_admin", label: t5("Email Administrador", "Admin Email", "Email Administrateur", "Admin-E-Mail", "Email Amministratore"), type: "email", required: true, placeholder: "admin@saas.com" },
            { name: "dominio", label: t5("Dominio", "Domain", "Domaine", "Domain", "Dominio"), type: "text", placeholder: t5("app.ejemplo.com", "app.example.com", "app.exemple.com", "app.beispiel.com", "app.esempio.com") },
          ],
        },
      },
    ],
  },
};
