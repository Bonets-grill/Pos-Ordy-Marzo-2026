import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const projectManagementConfig: SystemConfig = {
  name: t5("ProjectHub","ProjectHub","ProjectHub","ProjectHub","ProjectHub"),
  subtitle: t5("Gestión de Proyectos","Project Management","Gestion de Projets","Projektmanagement","Gestione Progetti"),
  brandColor: "#3b82f6",
  icon: "📊",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel","Dashboard","Tableau de Bord","Dashboard","Pannello"),
      icon: "dashboard",
      kpis: [
        { label: t5("Proyectos Activos","Active Projects","Projets Actifs","Aktive Projekte","Progetti Attivi"), value: "24", change: "+3", trend: "up" },
        { label: t5("Tareas Pendientes","Pending Tasks","Tâches en Attente","Ausstehende Aufgaben","Attività in Sospeso"), value: "187", change: "-12", trend: "up" },
        { label: t5("Horas Registradas (Sem)","Hours Logged (Week)","Heures Enregistrées (Sem)","Erfasste Stunden (Woche)","Ore Registrate (Sett)"), value: "342h", change: "+8%", trend: "up" },
        { label: t5("Entregas a Tiempo","On-Time Deliveries","Livraisons à Temps","Pünktliche Lieferungen","Consegne Puntuali"), value: "91%", change: "+2.5%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "activity", label: t5("Actividad Reciente","Recent Activity","Activité Récente","Neueste Aktivität","Attività Recente") },
          { key: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto") },
          { key: "user", label: t5("Usuario","User","Utilisateur","Benutzer","Utente"), type: "avatar" },
          { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo"), type: "badge", badgeColors: { "Tarea": "blue", "Comentario": "gray", "Entrega": "green", "Incidencia": "red" } },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
        ],
        rows: [
          { activity: "Completó diseño de wireframes", project: "App Móvil v2", user: "Laura Méndez", type: "Entrega", date: "Mar 7, 2026" },
          { activity: "Añadió comentario en sprint review", project: "Portal Web", user: "Diego Salazar", type: "Comentario", date: "Mar 7, 2026" },
          { activity: "Creó tarea de integración API", project: "Backend Services", user: "Carla Vega", type: "Tarea", date: "Mar 6, 2026" },
          { activity: "Reportó bug en checkout", project: "E-Commerce Redesign", user: "Tomás Herrera", type: "Incidencia", date: "Mar 6, 2026" },
          { activity: "Entregó documentación técnica", project: "Migración Cloud", user: "Sofía Paredes", type: "Entrega", date: "Mar 5, 2026" },
        ],
        searchPlaceholder: t5("Buscar actividad...","Search activity...","Rechercher une activité...","Aktivität suchen...","Cerca attività..."),
      },
    },
    {
      id: "projects",
      label: t5("Proyectos","Projects","Projets","Projekte","Progetti"),
      icon: "briefcase",
      kpis: [
        { label: t5("Total Proyectos","Total Projects","Total Projets","Projekte Gesamt","Progetti Totali"), value: "38", change: "+3", trend: "up" },
        { label: t5("En Progreso","In Progress","En Cours","In Bearbeitung","In Corso"), value: "18", trend: "neutral" },
        { label: t5("Completados (Mes)","Completed (Month)","Complétés (Mois)","Abgeschlossen (Monat)","Completati (Mese)"), value: "6", change: "+2", trend: "up" },
        { label: t5("Presupuesto Usado","Budget Used","Budget Utilisé","Genutztes Budget","Budget Utilizzato"), value: "72%", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Proyecto","Project","Projet","Projekt","Progetto"), type: "avatar" },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "En Progreso": "blue", "Completado": "green", "Pausado": "yellow", "Planificación": "purple" } },
          { key: "progress", label: t5("Progreso","Progress","Progression","Fortschritt","Progresso") },
          { key: "deadline", label: t5("Fecha Límite","Deadline","Date Limite","Frist","Scadenza"), type: "date" },
          { key: "lead", label: t5("Responsable","Lead","Responsable","Verantwortlicher","Responsabile") },
        ],
        rows: [
          { name: "App Móvil v2", client: "TechRetail SA", status: "En Progreso", progress: "68%", deadline: "Abr 15, 2026", lead: "Laura Méndez" },
          { name: "Portal Web Corporativo", client: "Global Finance", status: "En Progreso", progress: "45%", deadline: "May 1, 2026", lead: "Diego Salazar" },
          { name: "Migración Cloud AWS", client: "DataServ Inc", status: "Planificación", progress: "10%", deadline: "Jun 30, 2026", lead: "Carla Vega" },
          { name: "E-Commerce Redesign", client: "ModaPlus", status: "En Progreso", progress: "82%", deadline: "Mar 20, 2026", lead: "Tomás Herrera" },
          { name: "Sistema de Inventario", client: "LogiTrack", status: "Pausado", progress: "35%", deadline: "May 15, 2026", lead: "Sofía Paredes" },
          { name: "CRM Interno", client: "Interno", status: "Completado", progress: "100%", deadline: "Mar 1, 2026", lead: "Laura Méndez" },
        ],
        searchPlaceholder: t5("Buscar proyectos...","Search projects...","Rechercher des projets...","Projekte suchen...","Cerca progetti..."),
      },
      tabs: [
        { id: "all", label: t5("Todos","All","Tous","Alle","Tutti"), filterField: "status", filterValue: "all" },
        { id: "progress", label: t5("En Progreso","In Progress","En Cours","In Bearbeitung","In Corso"), filterField: "status", filterValue: "En Progreso" },
        { id: "completed", label: t5("Completados","Completed","Complétés","Abgeschlossen","Completati"), filterField: "status", filterValue: "Completado" },
        { id: "paused", label: t5("Pausados","Paused","En Pause","Pausiert","In Pausa"), filterField: "status", filterValue: "Pausado" },
        { id: "planning", label: t5("Planificación","Planning","Planification","Planung","Pianificazione"), filterField: "status", filterValue: "Planificación" },
      ],
      modal: {
        title: t5("Nuevo Proyecto","New Project","Nouveau Projet","Neues Projekt","Nuovo Progetto"),
        fields: [
          { name: "name", label: t5("Nombre del Proyecto","Project Name","Nom du Projet","Projektname","Nome del Progetto"), type: "text", required: true, placeholder: t5("Ej: App Móvil v3","E.g.: Mobile App v3","Ex : App Mobile v3","Z.B.: Mobile App v3","Es.: App Mobile v3") },
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "text", required: true, placeholder: t5("Nombre del cliente","Client name","Nom du client","Kundenname","Nome del cliente") },
          { name: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "select", required: true, options: [
            { value: "Planificación", label: t5("Planificación","Planning","Planification","Planung","Pianificazione") }, { value: "En Progreso", label: t5("En Progreso","In Progress","En Cours","In Bearbeitung","In Corso") },
            { value: "Pausado", label: t5("Pausado","Paused","En Pause","Pausiert","In Pausa") }, { value: "Completado", label: t5("Completado","Completed","Complété","Abgeschlossen","Completato") },
          ]},
          { name: "lead", label: t5("Responsable","Lead","Responsable","Verantwortlicher","Responsabile"), type: "select", options: [
            { value: "Laura Méndez", label: "Laura Méndez" }, { value: "Diego Salazar", label: "Diego Salazar" },
            { value: "Carla Vega", label: "Carla Vega" }, { value: "Tomás Herrera", label: "Tomás Herrera" },
          ]},
          { name: "deadline", label: t5("Fecha Límite","Deadline","Date Limite","Frist","Scadenza"), type: "date", required: true },
          { name: "budget", label: t5("Presupuesto ($)","Budget ($)","Budget ($)","Budget ($)","Budget ($)"), type: "number", placeholder: "0" },
          { name: "description", label: t5("Descripción","Description","Description","Beschreibung","Descrizione"), type: "textarea", placeholder: t5("Descripción del proyecto...","Project description...","Description du projet...","Projektbeschreibung...","Descrizione del progetto...") },
        ],
      },
    },
    {
      id: "tasks",
      label: t5("Tareas","Tasks","Tâches","Aufgaben","Attività"),
      icon: "clipboard",
      kpis: [
        { label: t5("Total Tareas","Total Tasks","Total Tâches","Aufgaben Gesamt","Attività Totali"), value: "312", trend: "neutral" },
        { label: t5("Pendientes","Pending","En Attente","Ausstehend","In Sospeso"), value: "87", change: "-5", trend: "up" },
        { label: t5("Completadas (Sem)","Completed (Week)","Complétées (Sem)","Erledigt (Woche)","Completate (Sett)"), value: "42", change: "+8", trend: "up" },
        { label: t5("Vencidas","Overdue","En Retard","Überfällig","Scadute"), value: "6", change: "-2", trend: "up" },
      ],
      table: {
        columns: [
          { key: "task", label: t5("Tarea","Task","Tâche","Aufgabe","Attività") },
          { key: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto") },
          { key: "assignee", label: t5("Asignado","Assignee","Assigné","Zugewiesen","Assegnato"), type: "avatar" },
          { key: "priority", label: t5("Prioridad","Priority","Priorité","Priorität","Priorità"), type: "badge", badgeColors: { "Alta": "red", "Media": "yellow", "Baja": "green", "Urgente": "purple" } },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Pendiente": "yellow", "En Progreso": "blue", "Completada": "green", "Bloqueada": "red" } },
          { key: "due", label: t5("Vencimiento","Due Date","Échéance","Fälligkeitsdatum","Scadenza"), type: "date" },
        ],
        rows: [
          { task: "Diseñar pantalla de login", project: "App Móvil v2", assignee: "Laura Méndez", priority: "Alta", status: "En Progreso", due: "Mar 9, 2026" },
          { task: "Configurar CI/CD pipeline", project: "Backend Services", assignee: "Carla Vega", priority: "Urgente", status: "Pendiente", due: "Mar 8, 2026" },
          { task: "Revisar copy landing page", project: "Portal Web", assignee: "Diego Salazar", priority: "Media", status: "Pendiente", due: "Mar 10, 2026" },
          { task: "Optimizar queries DB", project: "E-Commerce Redesign", assignee: "Tomás Herrera", priority: "Alta", status: "En Progreso", due: "Mar 11, 2026" },
          { task: "Actualizar documentación API", project: "Backend Services", assignee: "Sofía Paredes", priority: "Baja", status: "Completada", due: "Mar 6, 2026" },
          { task: "Test de carga servidor", project: "Migración Cloud", assignee: "Carla Vega", priority: "Alta", status: "Bloqueada", due: "Mar 7, 2026" },
        ],
        searchPlaceholder: t5("Buscar tareas...","Search tasks...","Rechercher des tâches...","Aufgaben suchen...","Cerca attività..."),
      },
      tabs: [
        { id: "all", label: t5("Todas","All","Toutes","Alle","Tutte"), filterField: "status", filterValue: "all" },
        { id: "pending", label: t5("Pendientes","Pending","En Attente","Ausstehend","In Sospeso"), filterField: "status", filterValue: "Pendiente" },
        { id: "progress", label: t5("En Progreso","In Progress","En Cours","In Bearbeitung","In Corso"), filterField: "status", filterValue: "En Progreso" },
        { id: "done", label: t5("Completadas","Completed","Complétées","Erledigt","Completate"), filterField: "status", filterValue: "Completada" },
      ],
      modal: {
        title: t5("Nueva Tarea","New Task","Nouvelle Tâche","Neue Aufgabe","Nuova Attività"),
        fields: [
          { name: "task", label: t5("Nombre de la Tarea","Task Name","Nom de la Tâche","Aufgabenname","Nome dell'Attività"), type: "text", required: true, placeholder: t5("Ej: Implementar autenticación","E.g.: Implement authentication","Ex : Implémenter l'authentification","Z.B.: Authentifizierung implementieren","Es.: Implementare autenticazione") },
          { name: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto"), type: "select", required: true, options: [
            { value: "App Móvil v2", label: "App Móvil v2" }, { value: "Portal Web", label: "Portal Web" },
            { value: "Backend Services", label: "Backend Services" }, { value: "E-Commerce Redesign", label: "E-Commerce Redesign" },
          ]},
          { name: "assignee", label: t5("Asignado a","Assigned To","Assigné à","Zugewiesen an","Assegnato a"), type: "select", options: [
            { value: "Laura Méndez", label: "Laura Méndez" }, { value: "Diego Salazar", label: "Diego Salazar" },
            { value: "Carla Vega", label: "Carla Vega" }, { value: "Tomás Herrera", label: "Tomás Herrera" },
          ]},
          { name: "priority", label: t5("Prioridad","Priority","Priorité","Priorität","Priorità"), type: "select", required: true, options: [
            { value: "Urgente", label: t5("Urgente","Urgent","Urgent","Dringend","Urgente") }, { value: "Alta", label: t5("Alta","High","Haute","Hoch","Alta") },
            { value: "Media", label: t5("Media","Medium","Moyenne","Mittel","Media") }, { value: "Baja", label: t5("Baja","Low","Basse","Niedrig","Bassa") },
          ]},
          { name: "due", label: t5("Fecha Límite","Due Date","Date Limite","Fälligkeitsdatum","Data di Scadenza"), type: "date", required: true },
          { name: "description", label: t5("Descripción","Description","Description","Beschreibung","Descrizione"), type: "textarea", placeholder: t5("Detalles de la tarea...","Task details...","Détails de la tâche...","Aufgabendetails...","Dettagli dell'attività...") },
        ],
      },
    },
    {
      id: "timelines",
      label: t5("Cronogramas","Timelines","Chronogrammes","Zeitpläne","Cronogrammi"),
      icon: "calendar",
      kpis: [
        { label: t5("Hitos Próximos","Upcoming Milestones","Jalons à Venir","Kommende Meilensteine","Traguardi Imminenti"), value: "8", trend: "neutral" },
        { label: t5("Entregas esta Semana","Deliveries This Week","Livraisons cette Semaine","Lieferungen diese Woche","Consegne questa Settimana"), value: "5", trend: "neutral" },
        { label: t5("Retrasos Activos","Active Delays","Retards Actifs","Aktive Verzögerungen","Ritardi Attivi"), value: "3", change: "+1", trend: "down" },
        { label: t5("Sprints Activos","Active Sprints","Sprints Actifs","Aktive Sprints","Sprint Attivi"), value: "4", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "milestone", label: t5("Hito","Milestone","Jalon","Meilenstein","Traguardo") },
          { key: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto") },
          { key: "startDate", label: t5("Inicio","Start","Début","Beginn","Inizio"), type: "date" },
          { key: "endDate", label: t5("Fin","End","Fin","Ende","Fine"), type: "date" },
          { key: "progress", label: t5("Avance","Progress","Avancement","Fortschritt","Avanzamento") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "A Tiempo": "green", "En Riesgo": "yellow", "Retrasado": "red", "Completado": "blue" } },
        ],
        rows: [
          { milestone: "MVP App Móvil", project: "App Móvil v2", startDate: "Feb 1, 2026", endDate: "Mar 15, 2026", progress: "72%", status: "A Tiempo" },
          { milestone: "Launch Portal", project: "Portal Web", startDate: "Mar 1, 2026", endDate: "Abr 30, 2026", progress: "30%", status: "A Tiempo" },
          { milestone: "Fase 1 Migración", project: "Migración Cloud", startDate: "Mar 10, 2026", endDate: "Abr 10, 2026", progress: "5%", status: "En Riesgo" },
          { milestone: "Go-Live E-Commerce", project: "E-Commerce Redesign", startDate: "Ene 15, 2026", endDate: "Mar 20, 2026", progress: "88%", status: "A Tiempo" },
          { milestone: "Beta Inventario", project: "Sistema de Inventario", startDate: "Feb 15, 2026", endDate: "Abr 1, 2026", progress: "35%", status: "Retrasado" },
        ],
        searchPlaceholder: t5("Buscar hitos...","Search milestones...","Rechercher des jalons...","Meilensteine suchen...","Cerca traguardi..."),
      },
    },
    {
      id: "team",
      label: t5("Equipo","Team","Équipe","Team","Team"),
      icon: "users",
      kpis: [
        { label: t5("Miembros","Members","Membres","Mitglieder","Membri"), value: "16", change: "+2", trend: "up" },
        { label: t5("Carga Promedio","Average Workload","Charge Moyenne","Durchschnittliche Auslastung","Carico Medio"), value: "78%", trend: "neutral" },
        { label: t5("Disponibilidad","Availability","Disponibilité","Verfügbarkeit","Disponibilità"), value: "4", trend: "neutral" },
        { label: t5("Horas/Semana Prom.","Avg Hours/Week","Heures/Sem Moy.","Std./Woche Durchschn.","Ore/Sett Media"), value: "38.5h", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Nombre","Name","Nom","Name","Nome"), type: "avatar" },
          { key: "role", label: t5("Rol","Role","Rôle","Rolle","Ruolo") },
          { key: "projects", label: t5("Proyectos Activos","Active Projects","Projets Actifs","Aktive Projekte","Progetti Attivi") },
          { key: "tasks", label: t5("Tareas Pendientes","Pending Tasks","Tâches en Attente","Ausstehende Aufgaben","Attività in Sospeso") },
          { key: "workload", label: t5("Carga","Workload","Charge","Auslastung","Carico") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Disponible": "green", "Ocupado": "yellow", "Sobrecargado": "red", "Vacaciones": "gray" } },
        ],
        rows: [
          { name: "Laura Méndez", role: "Lead Designer", projects: "3", tasks: "12", workload: "85%", status: "Ocupado" },
          { name: "Diego Salazar", role: "Frontend Developer", projects: "2", tasks: "8", workload: "65%", status: "Disponible" },
          { name: "Carla Vega", role: "DevOps Engineer", projects: "4", tasks: "15", workload: "95%", status: "Sobrecargado" },
          { name: "Tomás Herrera", role: "Backend Developer", projects: "2", tasks: "10", workload: "72%", status: "Ocupado" },
          { name: "Sofía Paredes", role: "Technical Writer", projects: "3", tasks: "6", workload: "50%", status: "Disponible" },
          { name: "Andrés Ríos", role: "QA Engineer", projects: "2", tasks: "9", workload: "70%", status: "Ocupado" },
        ],
        searchPlaceholder: t5("Buscar miembros...","Search members...","Rechercher des membres...","Mitglieder suchen...","Cerca membri..."),
      },
      modal: {
        title: t5("Nuevo Miembro","New Member","Nouveau Membre","Neues Mitglied","Nuovo Membro"),
        fields: [
          { name: "name", label: t5("Nombre Completo","Full Name","Nom Complet","Vollständiger Name","Nome Completo"), type: "text", required: true, placeholder: t5("Ej: Juan Pérez","E.g.: John Smith","Ex : Jean Dupont","Z.B.: Max Mustermann","Es.: Mario Rossi") },
          { name: "email", label: t5("Email","Email","Email","E-Mail","Email"), type: "email", required: true, placeholder: "email@empresa.com" },
          { name: "role", label: t5("Rol","Role","Rôle","Rolle","Ruolo"), type: "select", required: true, options: [
            { value: "Developer", label: "Developer" }, { value: "Designer", label: "Designer" },
            { value: "QA", label: "QA Engineer" }, { value: "DevOps", label: "DevOps" },
            { value: "PM", label: "Project Manager" },
          ]},
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel", placeholder: "+34 600-000-000" },
        ],
      },
    },
    {
      id: "time_tracking",
      label: t5("Control de Tiempo","Time Tracking","Suivi du Temps","Zeiterfassung","Monitoraggio Tempo"),
      icon: "clock",
      kpis: [
        { label: t5("Horas Hoy","Hours Today","Heures Aujourd'hui","Stunden Heute","Ore Oggi"), value: "67.5h", trend: "neutral" },
        { label: t5("Horas Semana","Hours This Week","Heures Semaine","Stunden Woche","Ore Settimana"), value: "342h", change: "+5%", trend: "up" },
        { label: t5("Tasa Facturable","Billable Rate","Taux Facturable","Abrechnungsrate","Tasso Fatturabile"), value: "84%", change: "+3%", trend: "up" },
        { label: t5("Promedio/Persona","Average/Person","Moyenne/Personne","Durchschnitt/Person","Media/Persona"), value: "7.2h", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "member", label: t5("Miembro","Member","Membre","Mitglied","Membro"), type: "avatar" },
          { key: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto") },
          { key: "task", label: t5("Tarea","Task","Tâche","Aufgabe","Attività") },
          { key: "hours", label: t5("Horas","Hours","Heures","Stunden","Ore") },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
          { key: "billable", label: t5("Facturable","Billable","Facturable","Abrechenbar","Fatturabile"), type: "badge", badgeColors: { "Sí": "green", "No": "gray" } },
        ],
        rows: [
          { member: "Laura Méndez", project: "App Móvil v2", task: "Diseño UI pantallas", hours: "6.5", date: "Mar 7, 2026", billable: "Sí" },
          { member: "Diego Salazar", project: "Portal Web", task: "Maquetación header", hours: "4.0", date: "Mar 7, 2026", billable: "Sí" },
          { member: "Carla Vega", project: "Migración Cloud", task: "Configuración AWS", hours: "8.0", date: "Mar 7, 2026", billable: "Sí" },
          { member: "Tomás Herrera", project: "E-Commerce Redesign", task: "Refactor checkout", hours: "5.5", date: "Mar 7, 2026", billable: "Sí" },
          { member: "Sofía Paredes", project: "Backend Services", task: "Documentación endpoints", hours: "3.0", date: "Mar 7, 2026", billable: "No" },
        ],
        searchPlaceholder: t5("Buscar registros...","Search entries...","Rechercher des entrées...","Einträge suchen...","Cerca registri..."),
      },
      modal: {
        title: t5("Registrar Tiempo","Log Time","Enregistrer le Temps","Zeit Erfassen","Registra Tempo"),
        fields: [
          { name: "project", label: t5("Proyecto","Project","Projet","Projekt","Progetto"), type: "select", required: true, options: [
            { value: "App Móvil v2", label: "App Móvil v2" }, { value: "Portal Web", label: "Portal Web" },
            { value: "Migración Cloud", label: "Migración Cloud" }, { value: "E-Commerce Redesign", label: "E-Commerce Redesign" },
          ]},
          { name: "task", label: t5("Tarea","Task","Tâche","Aufgabe","Attività"), type: "text", required: true, placeholder: t5("Descripción de la actividad","Activity description","Description de l'activité","Aktivitätsbeschreibung","Descrizione dell'attività") },
          { name: "hours", label: t5("Horas","Hours","Heures","Stunden","Ore"), type: "number", required: true, placeholder: "0" },
          { name: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date", required: true },
          { name: "billable", label: t5("Facturable","Billable","Facturable","Abrechenbar","Fatturabile"), type: "checkbox" },
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea", placeholder: t5("Detalles adicionales...","Additional details...","Détails supplémentaires...","Zusätzliche Details...","Dettagli aggiuntivi...") },
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
          { label: t5("Total Empresas","Total Companies","Total Entreprises","Unternehmen Gesamt","Aziende Totali"), value: "52", change: "+4", trend: "up" },
          { label: "MRR", value: "$3,870", change: "+9%", trend: "up" },
          { label: t5("Usuarios Activos","Active Users","Utilisateurs Actifs","Aktive Benutzer","Utenti Attivi"), value: "318", trend: "neutral" },
          { label: "Churn", value: "2.1%", change: "-0.3%", trend: "up" },
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
            { company: "DevFactory", plan: "Enterprise", users: "38", mrr: "$99/mo", since: "Abr 2024", status: "Activa" },
            { company: "CodeLab Studio", plan: "Pro", users: "15", mrr: "$59/mo", since: "Ago 2024", status: "Activa" },
            { company: "AgileWorks", plan: "Pro", users: "10", mrr: "$59/mo", since: "Dic 2025", status: "Activa" },
            { company: "NovaTech", plan: "Basic", users: "4", mrr: "$29/mo", since: "Feb 2026", status: "Trial" },
            { company: "BuildRight Inc", plan: "Enterprise", users: "85", mrr: "$199/mo", since: "Jun 2023", status: "Activa" },
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
