import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const socialMediaManager: SystemConfig = {
  name: "SocialPilot",
  subtitle: t5("Gestor de Redes Sociales", "Social Media Manager", "Gestionnaire de Réseaux Sociaux", "Social-Media-Manager", "Gestore dei Social Media"),
  brandColor: "#e11d48",
  icon: "📱",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel Principal", "Dashboard", "Tableau de Bord", "Übersicht", "Pannello Principale"),
      icon: "dashboard",
      kpis: [
        { label: t5("Publicaciones del Mes", "Monthly Posts", "Publications du Mois", "Beiträge im Monat", "Pubblicazioni del Mese"), value: "87", change: "+14", trend: "up" },
        { label: t5("Alcance Total", "Total Reach", "Portée Totale", "Gesamtreichweite", "Copertura Totale"), value: "245.6K", change: "+32%", trend: "up" },
        { label: "Engagement Rate", value: "4.8%", change: "+0.6%", trend: "up" },
        { label: t5("Seguidores Nuevos", "New Followers", "Nouveaux Abonnés", "Neue Follower", "Nuovi Follower"), value: "1.230", change: "+18%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "fecha", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "badge", badgeColors: { Instagram: "purple", Facebook: "blue", "Twitter/X": "gray", LinkedIn: "indigo", TikTok: "red" } },
          { key: "contenido", label: t5("Contenido", "Content", "Contenu", "Inhalt", "Contenuto"), type: "text" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Publicado: "green", Programado: "blue", Borrador: "yellow", Error: "red" } },
          { key: "interacciones", label: t5("Interacciones", "Interactions", "Interactions", "Interaktionen", "Interazioni"), type: "text" },
        ],
        rows: [
          { fecha: "2026-03-07", plataforma: "Instagram", contenido: "Reel: Detrás de cámaras oficina", estado: "Publicado", interacciones: "2.340" },
          { fecha: "2026-03-07", plataforma: "LinkedIn", contenido: "Artículo: Tendencias marketing 2026", estado: "Publicado", interacciones: "456" },
          { fecha: "2026-03-07", plataforma: "TikTok", contenido: "Video: Tutorial rápido producto", estado: "Programado", interacciones: "—" },
          { fecha: "2026-03-06", plataforma: "Twitter/X", contenido: "Hilo: 5 consejos productividad", estado: "Publicado", interacciones: "1.120" },
          { fecha: "2026-03-06", plataforma: "Facebook", contenido: "Evento: Webinar gratuito marzo", estado: "Error", interacciones: "—" },
        ],
        searchPlaceholder: t5("Buscar actividad reciente...", "Search recent activity...", "Rechercher activité récente...", "Letzte Aktivität suchen...", "Cerca attività recente..."),
      },
    },
    {
      id: "posts",
      label: t5("Publicaciones", "Posts", "Publications", "Beiträge", "Pubblicazioni"),
      icon: "edit",
      kpis: [
        { label: t5("Total Publicaciones", "Total Posts", "Total Publications", "Beiträge Gesamt", "Totale Pubblicazioni"), value: "342", change: "+87", trend: "up" },
        { label: t5("Publicados", "Published", "Publiés", "Veröffentlicht", "Pubblicati"), value: "298", change: "+73", trend: "up" },
        { label: t5("Programados", "Scheduled", "Programmés", "Geplant", "Programmati"), value: "28", change: "+8", trend: "up" },
        { label: t5("Tasa de Éxito", "Success Rate", "Taux de Réussite", "Erfolgsrate", "Tasso di Successo"), value: "97.3%", change: "+1.2%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "contenido", label: t5("Contenido", "Content", "Contenu", "Inhalt", "Contenuto"), type: "text" },
          { key: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "badge", badgeColors: { Instagram: "purple", Facebook: "blue", "Twitter/X": "gray", LinkedIn: "indigo", TikTok: "red" } },
          { key: "fecha", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "alcance", label: t5("Alcance", "Reach", "Portée", "Reichweite", "Copertura"), type: "text" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Publicado: "green", Programado: "blue", Borrador: "yellow", Error: "red" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { contenido: "Reel: Detrás de cámaras equipo", plataforma: "Instagram", fecha: "2026-03-07", alcance: "12.4K", estado: "Publicado" },
          { contenido: "Carousel: 5 tips de diseño UI", plataforma: "Instagram", fecha: "2026-03-07", alcance: "8.9K", estado: "Publicado" },
          { contenido: "Video: Demo nueva función", plataforma: "TikTok", fecha: "2026-03-08", alcance: "—", estado: "Programado" },
          { contenido: "Post: Caso de éxito cliente", plataforma: "LinkedIn", fecha: "2026-03-08", alcance: "—", estado: "Programado" },
          { contenido: "Hilo: Tendencias IA 2026", plataforma: "Twitter/X", fecha: "2026-03-06", alcance: "34.2K", estado: "Publicado" },
          { contenido: "Story: Encuesta producto", plataforma: "Facebook", fecha: "2026-03-06", alcance: "—", estado: "Borrador" },
        ],
        searchPlaceholder: t5("Buscar publicaciones...", "Search posts...", "Rechercher des publications...", "Beiträge suchen...", "Cerca pubblicazioni..."),
      },
      modal: {
        title: t5("Nueva Publicación", "New Post", "Nouvelle Publication", "Neuer Beitrag", "Nuova Pubblicazione"),
        fields: [
          { name: "contenido", label: t5("Contenido", "Content", "Contenu", "Inhalt", "Contenuto"), type: "textarea", required: true, placeholder: t5("Escribe tu publicación...", "Write your post...", "Écrivez votre publication...", "Schreiben Sie Ihren Beitrag...", "Scrivi la tua pubblicazione...") },
          { name: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "facebook", label: "Facebook" }, { value: "twitter", label: "Twitter/X" }, { value: "linkedin", label: "LinkedIn" }, { value: "tiktok", label: "TikTok" }] },
          { name: "fechaPublicacion", label: t5("Fecha de Publicación", "Publication Date", "Date de Publication", "Veröffentlichungsdatum", "Data di Pubblicazione"), type: "date", required: true },
          { name: "horaPublicacion", label: t5("Hora", "Time", "Heure", "Uhrzeit", "Ora"), type: "time", required: true },
          { name: "hashtags", label: "Hashtags", type: "text", placeholder: "#marketing #socialmedia" },
          { name: "enlace", label: t5("Enlace", "Link", "Lien", "Link", "Collegamento"), type: "text", placeholder: "https://..." },
        ],
      },
      tabs: [
        { id: "todos", label: t5("Todos", "All", "Tous", "Alle", "Tutti"), filterField: "estado", filterValue: "" },
        { id: "publicados", label: t5("Publicados", "Published", "Publiés", "Veröffentlicht", "Pubblicati"), filterField: "estado", filterValue: "Publicado" },
        { id: "programados", label: t5("Programados", "Scheduled", "Programmés", "Geplant", "Programmati"), filterField: "estado", filterValue: "Programado" },
        { id: "borradores", label: t5("Borradores", "Drafts", "Brouillons", "Entwürfe", "Bozze"), filterField: "estado", filterValue: "Borrador" },
        { id: "errores", label: t5("Errores", "Errors", "Erreurs", "Fehler", "Errori"), filterField: "estado", filterValue: "Error" },
      ],
    },
    {
      id: "calendar",
      label: t5("Calendario", "Calendar", "Calendrier", "Kalender", "Calendario"),
      icon: "calendar",
      kpis: [
        { label: t5("Posts Esta Semana", "Posts This Week", "Publications Cette Semaine", "Beiträge Diese Woche", "Post Questa Settimana"), value: "18", change: "+4", trend: "up" },
        { label: t5("Próxima Publicación", "Next Post", "Prochaine Publication", "Nächster Beitrag", "Prossima Pubblicazione"), value: t5("Hoy 18:00", "Today 18:00", "Aujourd'hui 18:00", "Heute 18:00", "Oggi 18:00"), trend: "neutral" },
        { label: t5("Huecos sin Contenido", "Content Gaps", "Créneaux sans Contenu", "Lücken ohne Inhalt", "Slot senza Contenuto"), value: "3", change: "-2", trend: "down" },
        { label: t5("Cobertura Semanal", "Weekly Coverage", "Couverture Hebdomadaire", "Wöchentliche Abdeckung", "Copertura Settimanale"), value: "85.7%", change: "+7%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "dia", label: t5("Día", "Day", "Jour", "Tag", "Giorno"), type: "date" },
          { key: "hora", label: t5("Hora", "Time", "Heure", "Uhrzeit", "Ora"), type: "text" },
          { key: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "badge", badgeColors: { Instagram: "purple", Facebook: "blue", "Twitter/X": "gray", LinkedIn: "indigo", TikTok: "red" } },
          { key: "contenido", label: t5("Contenido", "Content", "Contenu", "Inhalt", "Contenuto"), type: "text" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Confirmado: "green", Pendiente: "yellow", Cancelado: "red" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { dia: "2026-03-07", hora: "18:00", plataforma: "TikTok", contenido: "Video: Tutorial rápido producto", estado: "Confirmado" },
          { dia: "2026-03-08", hora: "10:00", plataforma: "LinkedIn", contenido: "Post: Caso de éxito cliente", estado: "Confirmado" },
          { dia: "2026-03-08", hora: "14:00", plataforma: "Instagram", contenido: "Carousel: Recap semanal", estado: "Pendiente" },
          { dia: "2026-03-09", hora: "09:00", plataforma: "Twitter/X", contenido: "Buenos días + tip del día", estado: "Confirmado" },
          { dia: "2026-03-09", hora: "17:00", plataforma: "Facebook", contenido: "Encuesta: Funcionalidad favorita", estado: "Pendiente" },
        ],
        searchPlaceholder: t5("Buscar en calendario...", "Search calendar...", "Rechercher dans le calendrier...", "Im Kalender suchen...", "Cerca nel calendario..."),
      },
    },
    {
      id: "analytics",
      label: t5("Analíticas", "Analytics", "Analytique", "Analytik", "Analitiche"),
      icon: "chart",
      kpis: [
        { label: t5("Impresiones Totales", "Total Impressions", "Impressions Totales", "Gesamtimpressionen", "Impressioni Totali"), value: "892K", change: "+24%", trend: "up" },
        { label: t5("Clics en Enlaces", "Link Clicks", "Clics sur Liens", "Link-Klicks", "Clic sui Link"), value: "4.560", change: "+18%", trend: "up" },
        { label: t5("Compartidos", "Shares", "Partages", "Geteilt", "Condivisioni"), value: "1.230", change: "+31%", trend: "up" },
        { label: t5("Mejor Hora", "Best Time", "Meilleure Heure", "Beste Uhrzeit", "Ora Migliore"), value: "18:00", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "badge", badgeColors: { Instagram: "purple", Facebook: "blue", "Twitter/X": "gray", LinkedIn: "indigo", TikTok: "red" } },
          { key: "seguidores", label: t5("Seguidores", "Followers", "Abonnés", "Follower", "Follower"), type: "text" },
          { key: "alcance", label: t5("Alcance/Mes", "Reach/Month", "Portée/Mois", "Reichweite/Monat", "Copertura/Mese"), type: "text" },
          { key: "engagement", label: "Engagement", type: "text" },
          { key: "crecimiento", label: t5("Crecimiento", "Growth", "Croissance", "Wachstum", "Crescita"), type: "text" },
        ],
        rows: [
          { plataforma: "Instagram", seguidores: "24.5K", alcance: "89.2K", engagement: "5.4%", crecimiento: "+3.2%" },
          { plataforma: "TikTok", seguidores: "18.3K", alcance: "156.8K", engagement: "7.1%", crecimiento: "+8.5%" },
          { plataforma: "Twitter/X", seguidores: "12.1K", alcance: "45.6K", engagement: "3.8%", crecimiento: "+1.4%" },
          { plataforma: "LinkedIn", seguidores: "8.7K", alcance: "23.4K", engagement: "4.2%", crecimiento: "+2.8%" },
          { plataforma: "Facebook", seguidores: "15.9K", alcance: "34.1K", engagement: "2.1%", crecimiento: "-0.3%" },
        ],
        searchPlaceholder: t5("Buscar analíticas...", "Search analytics...", "Rechercher analytique...", "Analytik suchen...", "Cerca analitiche..."),
      },
    },
    {
      id: "accounts",
      label: t5("Cuentas", "Accounts", "Comptes", "Konten", "Account"),
      icon: "users",
      kpis: [
        { label: t5("Cuentas Conectadas", "Connected Accounts", "Comptes Connectés", "Verbundene Konten", "Account Collegati"), value: "8", trend: "neutral" },
        { label: t5("Plataformas", "Platforms", "Plateformes", "Plattformen", "Piattaforme"), value: "5", trend: "neutral" },
        { label: t5("Tokens Válidos", "Valid Tokens", "Tokens Valides", "Gültige Tokens", "Token Validi"), value: "7", change: "-1", trend: "down" },
        { label: t5("Última Sincronización", "Last Sync", "Dernière Synchronisation", "Letzte Synchronisierung", "Ultima Sincronizzazione"), value: t5("Hace 2h", "2h ago", "Il y a 2h", "Vor 2 Std.", "2 ore fa"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "cuenta", label: t5("Cuenta", "Account", "Compte", "Konto", "Account"), type: "text" },
          { key: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "badge", badgeColors: { Instagram: "purple", Facebook: "blue", "Twitter/X": "gray", LinkedIn: "indigo", TikTok: "red" } },
          { key: "seguidores", label: t5("Seguidores", "Followers", "Abonnés", "Follower", "Follower"), type: "text" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Conectada: "green", Desconectada: "red", Expirando: "yellow" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { cuenta: "@miempresa", plataforma: "Instagram", seguidores: "24.5K", estado: "Conectada" },
          { cuenta: "@miempresa", plataforma: "TikTok", seguidores: "18.3K", estado: "Conectada" },
          { cuenta: "Mi Empresa Oficial", plataforma: "Facebook", seguidores: "15.9K", estado: "Expirando" },
          { cuenta: "@miempresa_es", plataforma: "Twitter/X", seguidores: "12.1K", estado: "Conectada" },
          { cuenta: "Mi Empresa S.L.", plataforma: "LinkedIn", seguidores: "8.7K", estado: "Conectada" },
        ],
        searchPlaceholder: t5("Buscar cuentas...", "Search accounts...", "Rechercher des comptes...", "Konten suchen...", "Cerca account..."),
      },
      modal: {
        title: t5("Conectar Cuenta", "Connect Account", "Connecter un Compte", "Konto Verbinden", "Collega Account"),
        fields: [
          { name: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "select", required: true, options: [{ value: "instagram", label: "Instagram" }, { value: "facebook", label: "Facebook" }, { value: "twitter", label: "Twitter/X" }, { value: "linkedin", label: "LinkedIn" }, { value: "tiktok", label: "TikTok" }] },
          { name: "nombreCuenta", label: t5("Nombre de Cuenta", "Account Name", "Nom du Compte", "Kontoname", "Nome Account"), type: "text", required: true, placeholder: "@usuario" },
          { name: "token", label: t5("Token de Acceso", "Access Token", "Jeton d'Accès", "Zugriffstoken", "Token di Accesso"), type: "text", required: true, placeholder: t5("Token API de la plataforma", "Platform API token", "Jeton API de la plateforme", "Plattform-API-Token", "Token API della piattaforma") },
        ],
      },
    },
    {
      id: "engagement",
      label: t5("Interacciones", "Interactions", "Interactions", "Interaktionen", "Interazioni"),
      icon: "heart",
      kpis: [
        { label: t5("Comentarios sin Responder", "Unanswered Comments", "Commentaires sans Réponse", "Unbeantwortete Kommentare", "Commenti senza Risposta"), value: "23", change: "+8", trend: "up" },
        { label: t5("Menciones del Mes", "Monthly Mentions", "Mentions du Mois", "Erwähnungen im Monat", "Menzioni del Mese"), value: "156", change: "+34%", trend: "up" },
        { label: t5("Tiempo Respuesta Medio", "Avg. Response Time", "Temps de Réponse Moyen", "Durchschn. Antwortzeit", "Tempo Medio di Risposta"), value: t5("42 min", "42 min", "42 min", "42 Min.", "42 min"), change: "-8 min", trend: "down" },
        { label: t5("Sentimiento Positivo", "Positive Sentiment", "Sentiment Positif", "Positive Stimmung", "Sentimento Positivo"), value: "87%", change: "+3%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "usuario", label: t5("Usuario", "User", "Utilisateur", "Benutzer", "Utente"), type: "text" },
          { key: "plataforma", label: t5("Plataforma", "Platform", "Plateforme", "Plattform", "Piattaforma"), type: "badge", badgeColors: { Instagram: "purple", Facebook: "blue", "Twitter/X": "gray", LinkedIn: "indigo", TikTok: "red" } },
          { key: "tipo", label: t5("Tipo", "Type", "Type", "Typ", "Tipo"), type: "badge", badgeColors: { Comentario: "blue", Mención: "purple", "Mensaje Directo": "green", Reseña: "orange" } },
          { key: "contenido", label: t5("Contenido", "Content", "Contenu", "Inhalt", "Contenuto"), type: "text" },
          { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Respondido: "green", Pendiente: "yellow", Archivado: "gray" } },
          { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
        ],
        rows: [
          { usuario: "@maria_design", plataforma: "Instagram", tipo: "Comentario", contenido: "Me encanta este diseño! Cómo lo hicieron?", estado: "Pendiente" },
          { usuario: "Pedro García", plataforma: "Facebook", tipo: "Reseña", contenido: "Excelente servicio, muy recomendable", estado: "Respondido" },
          { usuario: "@techblog_es", plataforma: "Twitter/X", tipo: "Mención", contenido: "Probando @miempresa y el resultado es increíble", estado: "Pendiente" },
          { usuario: "Laura CEO", plataforma: "LinkedIn", tipo: "Comentario", contenido: "Gran artículo, muy útil para nuestro equipo", estado: "Respondido" },
          { usuario: "@user_tiktok", plataforma: "TikTok", tipo: "Comentario", contenido: "Pueden hacer un tutorial más largo?", estado: "Pendiente" },
          { usuario: "Carlos M.", plataforma: "Facebook", tipo: "Mensaje Directo", contenido: "Hola, quisiera información sobre precios", estado: "Pendiente" },
        ],
        searchPlaceholder: t5("Buscar interacciones...", "Search interactions...", "Rechercher des interactions...", "Interaktionen suchen...", "Cerca interazioni..."),
      },
      tabs: [
        { id: "todas", label: t5("Todas", "All", "Toutes", "Alle", "Tutte"), filterField: "estado", filterValue: "" },
        { id: "pendientes", label: t5("Pendientes", "Pending", "En Attente", "Ausstehend", "In Sospeso"), filterField: "estado", filterValue: "Pendiente" },
        { id: "respondidas", label: t5("Respondidas", "Answered", "Répondues", "Beantwortet", "Risposte"), filterField: "estado", filterValue: "Respondido" },
        { id: "archivadas", label: t5("Archivadas", "Archived", "Archivées", "Archiviert", "Archiviate"), filterField: "estado", filterValue: "Archivado" },
      ],
    },
  ],
  superAdmin: {
    modules: [
      {
        id: "tenants",
        label: t5("Gestión de Tenants", "Tenant Management", "Gestion des Tenants", "Tenant-Verwaltung", "Gestione dei Tenant"),
        icon: "building",
        kpis: [
          { label: "Total Tenants", value: "234", change: "+28", trend: "up" },
          { label: t5("Tenants Activos", "Active Tenants", "Tenants Actifs", "Aktive Tenants", "Tenant Attivi"), value: "218", change: "+24", trend: "up" },
          { label: t5("Ingresos MRR", "MRR Revenue", "Revenus MRR", "MRR-Einnahmen", "Ricavi MRR"), value: "€18.720", change: "+26%", trend: "up" },
          { label: "Churn Rate", value: "2.4%", change: "-0.8%", trend: "down" },
        ],
        table: {
          columns: [
            { key: "nombre", label: t5("Marca / Agencia", "Brand / Agency", "Marque / Agence", "Marke / Agentur", "Marca / Agenzia"), type: "text" },
            { key: "plan", label: t5("Plan", "Plan", "Plan", "Plan", "Piano"), type: "badge", badgeColors: { Basic: "gray", Pro: "blue", Agency: "purple" } },
            { key: "cuentas", label: t5("Cuentas", "Accounts", "Comptes", "Konten", "Account"), type: "text" },
            { key: "posts", label: "Posts/Mes", type: "text" },
            { key: "estado", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { Activo: "green", Suspendido: "red", Trial: "yellow" } },
            { key: "acciones", label: t5("Acciones", "Actions", "Actions", "Aktionen", "Azioni"), type: "actions" },
          ],
          rows: [
            { nombre: "Agencia Digital 360", plan: "Agency", cuentas: "24", posts: "340", estado: "Activo" },
            { nombre: "Marca Moda Ibérica", plan: "Pro", cuentas: "5", posts: "120", estado: "Activo" },
            { nombre: "Restaurante Fusión", plan: "Basic", cuentas: "3", posts: "45", estado: "Activo" },
            { nombre: "Startup EdTech", plan: "Pro", cuentas: "4", posts: "80", estado: "Trial" },
            { nombre: "Influencer María G.", plan: "Basic", cuentas: "2", posts: "60", estado: "Suspendido" },
          ],
          searchPlaceholder: t5("Buscar tenants...", "Search tenants...", "Rechercher des tenants...", "Tenants suchen...", "Cerca tenant..."),
        },
        modal: {
          title: t5("Nuevo Tenant", "New Tenant", "Nouveau Tenant", "Neuer Tenant", "Nuovo Tenant"),
          fields: [
            { name: "nombre", label: t5("Nombre de Marca/Agencia", "Brand/Agency Name", "Nom de Marque/Agence", "Marken-/Agenturname", "Nome Marca/Agenzia"), type: "text", required: true, placeholder: t5("Nombre comercial", "Business name", "Nom commercial", "Handelsname", "Nome commerciale") },
            { name: "email", label: t5("Email Administrador", "Admin Email", "Email Administrateur", "Admin-E-Mail", "Email Amministratore"), type: "email", required: true, placeholder: "admin@marca.com" },
            { name: "plan", label: t5("Plan", "Plan", "Plan", "Plan", "Piano"), type: "select", required: true, options: [{ value: "basic", label: "Basic" }, { value: "pro", label: "Pro" }, { value: "agency", label: "Agency" }] },
            { name: "maxCuentas", label: t5("Máx. Cuentas Sociales", "Max Social Accounts", "Max Comptes Sociaux", "Max. Soziale Konten", "Max Account Social"), type: "number", placeholder: "5" },
          ],
        },
      },
    ],
  },
};
