import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const hrPlatformConfig: SystemConfig = {
  name: t5("PeopleOS","PeopleOS","PeopleOS","PeopleOS","PeopleOS"),
  subtitle: t5("Recursos Humanos","Human Resources","Ressources Humaines","Personalwesen","Risorse Umane"),
  brandColor: "#7c3aed",
  icon: "👥",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel","Dashboard","Tableau de Bord","Dashboard","Pannello"),
      icon: "dashboard",
      kpis: [
        { label: t5("Empleados Activos","Active Employees","Employés Actifs","Aktive Mitarbeiter","Dipendenti Attivi"), value: "234", change: "+8", trend: "up" },
        { label: t5("Nuevas Incorporaciones","New Hires","Nouvelles Embauches","Neueinstellungen","Nuove Assunzioni"), value: "12", change: "+4", trend: "up" },
        { label: t5("Tasa de Retención","Retention Rate","Taux de Rétention","Bindungsrate","Tasso di Ritenzione"), value: "94.2%", change: "+1.1%", trend: "up" },
        { label: t5("Solicitudes Pendientes","Pending Requests","Demandes en Attente","Ausstehende Anfragen","Richieste in Sospeso"), value: "18", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "activity", label: t5("Actividad Reciente","Recent Activity","Activité Récente","Neueste Aktivität","Attività Recente") },
          { key: "employee", label: t5("Empleado","Employee","Employé","Mitarbeiter","Dipendente"), type: "avatar" },
          { key: "department", label: t5("Departamento","Department","Département","Abteilung","Dipartimento") },
          { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo"), type: "badge", badgeColors: { "Incorporación": "green", "Ausencia": "yellow", "Evaluación": "blue", "Baja": "red" } },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
        ],
        rows: [
          { activity: "Incorporación completada", employee: "Lucía Fernández", department: "Tecnología", type: "Incorporación", date: "Mar 7, 2026" },
          { activity: "Solicitud de vacaciones aprobada", employee: "Roberto Castillo", department: "Marketing", type: "Ausencia", date: "Mar 7, 2026" },
          { activity: "Evaluación trimestral enviada", employee: "Marta Jiménez", department: "Ventas", type: "Evaluación", date: "Mar 6, 2026" },
          { activity: "Baja médica registrada", employee: "Fernando López", department: "Operaciones", type: "Baja", date: "Mar 6, 2026" },
          { activity: "Nuevo contrato firmado", employee: "Andrea Molina", department: "RRHH", type: "Incorporación", date: "Mar 5, 2026" },
        ],
        searchPlaceholder: t5("Buscar actividad...","Search activity...","Rechercher une activité...","Aktivität suchen...","Cerca attività..."),
      },
    },
    {
      id: "employees",
      label: t5("Empleados","Employees","Employés","Mitarbeiter","Dipendenti"),
      icon: "users",
      kpis: [
        { label: t5("Total Empleados","Total Employees","Total Employés","Mitarbeiter Gesamt","Dipendenti Totali"), value: "234", trend: "neutral" },
        { label: t5("Activos","Active","Actifs","Aktiv","Attivi"), value: "215", change: "+5", trend: "up" },
        { label: t5("En Prueba","On Probation","En Période d'Essai","In Probezeit","In Prova"), value: "12", trend: "neutral" },
        { label: t5("Antigüedad Media","Average Seniority","Ancienneté Moyenne","Durchschnittliche Betriebszugehörigkeit","Anzianità Media"), value: t5("3.2 años","3.2 years","3,2 ans","3,2 Jahre","3,2 anni"), trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Nombre","Name","Nom","Name","Nome"), type: "avatar" },
          { key: "position", label: t5("Cargo","Position","Poste","Position","Ruolo") },
          { key: "department", label: t5("Departamento","Department","Département","Abteilung","Dipartimento"), type: "badge", badgeColors: { "Tecnología": "blue", "Marketing": "purple", "Ventas": "green", "Operaciones": "orange", "RRHH": "indigo" } },
          { key: "startDate", label: t5("Fecha Alta","Start Date","Date d'Embauche","Eintrittsdatum","Data Assunzione"), type: "date" },
          { key: "email", label: t5("Email","Email","Email","E-Mail","Email") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "En Prueba": "yellow", "Vacaciones": "blue", "Baja": "red" } },
        ],
        rows: [
          { name: "Lucía Fernández", position: "Full Stack Developer", department: "Tecnología", startDate: "Mar 1, 2026", email: "lucia.f@empresa.com", status: "En Prueba" },
          { name: "Roberto Castillo", position: "Marketing Manager", department: "Marketing", startDate: "Jun 15, 2023", email: "roberto.c@empresa.com", status: "Vacaciones" },
          { name: "Marta Jiménez", position: "Account Executive", department: "Ventas", startDate: "Ene 10, 2024", email: "marta.j@empresa.com", status: "Activo" },
          { name: "Fernando López", position: "Logistics Coordinator", department: "Operaciones", startDate: "Sep 1, 2022", email: "fernando.l@empresa.com", status: "Baja" },
          { name: "Andrea Molina", position: "HR Specialist", department: "RRHH", startDate: "Mar 3, 2026", email: "andrea.m@empresa.com", status: "En Prueba" },
          { name: "Carlos Navarro", position: "Senior Backend Dev", department: "Tecnología", startDate: "Abr 20, 2021", email: "carlos.n@empresa.com", status: "Activo" },
        ],
        searchPlaceholder: t5("Buscar empleados...","Search employees...","Rechercher des employés...","Mitarbeiter suchen...","Cerca dipendenti..."),
      },
      tabs: [
        { id: "all", label: t5("Todos","All","Tous","Alle","Tutti"), filterField: "status", filterValue: "all" },
        { id: "active", label: t5("Activos","Active","Actifs","Aktiv","Attivi"), filterField: "status", filterValue: "Activo" },
        { id: "trial", label: t5("En Prueba","On Probation","En Période d'Essai","In Probezeit","In Prova"), filterField: "status", filterValue: "En Prueba" },
        { id: "vacation", label: t5("Vacaciones","Vacation","Vacances","Urlaub","Ferie"), filterField: "status", filterValue: "Vacaciones" },
        { id: "leave", label: t5("Baja","Leave","Congé","Abwesend","Congedo"), filterField: "status", filterValue: "Baja" },
      ],
      modal: {
        title: t5("Nuevo Empleado","New Employee","Nouvel Employé","Neuer Mitarbeiter","Nuovo Dipendente"),
        fields: [
          { name: "name", label: t5("Nombre Completo","Full Name","Nom Complet","Vollständiger Name","Nome Completo"), type: "text", required: true, placeholder: t5("Ej: María García López","E.g.: Mary Johnson","Ex : Marie Dupont","Z.B.: Maria Schmidt","Es.: Maria Rossi") },
          { name: "email", label: t5("Email Corporativo","Corporate Email","Email Professionnel","Firmen-E-Mail","Email Aziendale"), type: "email", required: true, placeholder: "nombre@empresa.com" },
          { name: "position", label: t5("Cargo","Position","Poste","Position","Ruolo"), type: "text", required: true, placeholder: t5("Ej: Frontend Developer","E.g.: Frontend Developer","Ex : Développeur Frontend","Z.B.: Frontend-Entwickler","Es.: Sviluppatore Frontend") },
          { name: "department", label: t5("Departamento","Department","Département","Abteilung","Dipartimento"), type: "select", required: true, options: [
            { value: "Tecnología", label: t5("Tecnología","Technology","Technologie","Technologie","Tecnologia") }, { value: "Marketing", label: "Marketing" },
            { value: "Ventas", label: t5("Ventas","Sales","Ventes","Vertrieb","Vendite") }, { value: "Operaciones", label: t5("Operaciones","Operations","Opérations","Betrieb","Operazioni") },
            { value: "RRHH", label: t5("RRHH","HR","RH","Personal","HR") },
          ]},
          { name: "startDate", label: t5("Fecha de Alta","Start Date","Date d'Embauche","Eintrittsdatum","Data di Assunzione"), type: "date", required: true },
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel", placeholder: "+34 600-000-000" },
          { name: "salary", label: t5("Salario Bruto Anual ($)","Gross Annual Salary ($)","Salaire Brut Annuel ($)","Bruttojahresgehalt ($)","Stipendio Lordo Annuale ($)"), type: "number", placeholder: "0" },
        ],
      },
    },
    {
      id: "payroll",
      label: t5("Nóminas","Payroll","Paie","Gehaltsabrechnung","Buste Paga"),
      icon: "dollar",
      kpis: [
        { label: t5("Nómina Mensual","Monthly Payroll","Paie Mensuelle","Monatliche Gehaltsabrechnung","Stipendio Mensile"), value: "$385,200", trend: "neutral" },
        { label: t5("Coste Empresa/Mes","Company Cost/Month","Coût Entreprise/Mois","Unternehmenskosten/Monat","Costo Azienda/Mese"), value: "$462,240", change: "+3.2%", trend: "down" },
        { label: t5("Nóminas Procesadas","Payrolls Processed","Paies Traitées","Abgerechnete Gehälter","Buste Paga Elaborate"), value: "234", trend: "neutral" },
        { label: t5("Incidencias","Issues","Incidents","Vorfälle","Anomalie"), value: "3", change: "-2", trend: "up" },
      ],
      table: {
        columns: [
          { key: "employee", label: t5("Empleado","Employee","Employé","Mitarbeiter","Dipendente"), type: "avatar" },
          { key: "department", label: t5("Departamento","Department","Département","Abteilung","Dipartimento") },
          { key: "grossSalary", label: t5("Bruto","Gross","Brut","Brutto","Lordo"), type: "currency" },
          { key: "deductions", label: t5("Deducciones","Deductions","Déductions","Abzüge","Detrazioni"), type: "currency" },
          { key: "netSalary", label: t5("Neto","Net","Net","Netto","Netto"), type: "currency" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Procesada": "green", "Pendiente": "yellow", "Incidencia": "red" } },
        ],
        rows: [
          { employee: "Carlos Navarro", department: "Tecnología", grossSalary: "$4,200", deductions: "$1,050", netSalary: "$3,150", status: "Procesada" },
          { employee: "Marta Jiménez", department: "Ventas", grossSalary: "$3,500", deductions: "$875", netSalary: "$2,625", status: "Procesada" },
          { employee: "Roberto Castillo", department: "Marketing", grossSalary: "$3,800", deductions: "$950", netSalary: "$2,850", status: "Pendiente" },
          { employee: "Lucía Fernández", department: "Tecnología", grossSalary: "$3,200", deductions: "$800", netSalary: "$2,400", status: "Procesada" },
          { employee: "Fernando López", department: "Operaciones", grossSalary: "$2,900", deductions: "$725", netSalary: "$2,175", status: "Incidencia" },
        ],
        searchPlaceholder: t5("Buscar nóminas...","Search payrolls...","Rechercher des paies...","Gehaltsabrechnungen suchen...","Cerca buste paga..."),
      },
    },
    {
      id: "time_off",
      label: t5("Ausencias","Time Off","Absences","Abwesenheiten","Assenze"),
      icon: "calendar",
      kpis: [
        { label: t5("Solicitudes Pendientes","Pending Requests","Demandes en Attente","Ausstehende Anfragen","Richieste in Sospeso"), value: "7", trend: "neutral" },
        { label: t5("De Vacaciones Hoy","On Vacation Today","En Vacances Aujourd'hui","Heute im Urlaub","In Ferie Oggi"), value: "5", trend: "neutral" },
        { label: t5("Bajas Activas","Active Leaves","Congés Actifs","Aktive Abwesenheiten","Congedi Attivi"), value: "3", trend: "down" },
        { label: t5("Días Prom. Disponibles","Avg Days Available","Jours Moy. Disponibles","Durchschn. Verfügbare Tage","Giorni Medi Disponibili"), value: "12.4", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "employee", label: t5("Empleado","Employee","Employé","Mitarbeiter","Dipendente"), type: "avatar" },
          { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo"), type: "badge", badgeColors: { "Vacaciones": "blue", "Baja Médica": "red", "Asuntos Propios": "purple", "Maternidad": "green", "Permiso": "orange" } },
          { key: "startDate", label: t5("Desde","From","Du","Von","Dal"), type: "date" },
          { key: "endDate", label: t5("Hasta","To","Au","Bis","Al"), type: "date" },
          { key: "days", label: t5("Días","Days","Jours","Tage","Giorni") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Aprobada": "green", "Pendiente": "yellow", "Rechazada": "red" } },
        ],
        rows: [
          { employee: "Roberto Castillo", type: "Vacaciones", startDate: "Mar 10, 2026", endDate: "Mar 21, 2026", days: "10", status: "Aprobada" },
          { employee: "Ana Ruiz", type: "Asuntos Propios", startDate: "Mar 12, 2026", endDate: "Mar 12, 2026", days: "1", status: "Pendiente" },
          { employee: "Fernando López", type: "Baja Médica", startDate: "Mar 3, 2026", endDate: "Mar 17, 2026", days: "11", status: "Aprobada" },
          { employee: "Elena Torres", type: "Maternidad", startDate: "Feb 1, 2026", endDate: "May 31, 2026", days: "120", status: "Aprobada" },
          { employee: "Pablo Sánchez", type: "Vacaciones", startDate: "Mar 15, 2026", endDate: "Mar 22, 2026", days: "6", status: "Pendiente" },
          { employee: "Isabel Reyes", type: "Permiso", startDate: "Mar 9, 2026", endDate: "Mar 9, 2026", days: "1", status: "Pendiente" },
        ],
        searchPlaceholder: t5("Buscar solicitudes...","Search requests...","Rechercher des demandes...","Anfragen suchen...","Cerca richieste..."),
      },
      modal: {
        title: t5("Nueva Solicitud de Ausencia","New Time Off Request","Nouvelle Demande d'Absence","Neue Abwesenheitsanfrage","Nuova Richiesta di Assenza"),
        fields: [
          { name: "employee", label: t5("Empleado","Employee","Employé","Mitarbeiter","Dipendente"), type: "text", required: true, placeholder: t5("Nombre del empleado","Employee name","Nom de l'employé","Mitarbeitername","Nome del dipendente") },
          { name: "type", label: t5("Tipo","Type","Type","Typ","Tipo"), type: "select", required: true, options: [
            { value: "Vacaciones", label: t5("Vacaciones","Vacation","Vacances","Urlaub","Ferie") }, { value: "Baja Médica", label: t5("Baja Médica","Sick Leave","Congé Maladie","Krankmeldung","Congedo Malattia") },
            { value: "Asuntos Propios", label: t5("Asuntos Propios","Personal Leave","Congé Personnel","Persönlicher Urlaub","Permesso Personale") }, { value: "Permiso", label: t5("Permiso","Permission","Autorisation","Genehmigung","Permesso") },
          ]},
          { name: "startDate", label: t5("Fecha Inicio","Start Date","Date de Début","Startdatum","Data Inizio"), type: "date", required: true },
          { name: "endDate", label: t5("Fecha Fin","End Date","Date de Fin","Enddatum","Data Fine"), type: "date", required: true },
          { name: "notes", label: t5("Observaciones","Observations","Observations","Bemerkungen","Osservazioni"), type: "textarea", placeholder: t5("Motivo o comentarios...","Reason or comments...","Motif ou commentaires...","Grund oder Kommentare...","Motivo o commenti...") },
        ],
      },
    },
    {
      id: "onboarding",
      label: t5("Onboarding","Onboarding","Intégration","Onboarding","Onboarding"),
      icon: "flag",
      kpis: [
        { label: t5("En Proceso","In Progress","En Cours","In Bearbeitung","In Corso"), value: "5", trend: "neutral" },
        { label: t5("Completados (Mes)","Completed (Month)","Complétés (Mois)","Abgeschlossen (Monat)","Completati (Mese)"), value: "3", change: "+1", trend: "up" },
        { label: t5("Tiempo Promedio","Average Time","Temps Moyen","Durchschnittliche Zeit","Tempo Medio"), value: t5("14 días","14 days","14 jours","14 Tage","14 giorni"), change: "-2d", trend: "up" },
        { label: t5("Satisfacción","Satisfaction","Satisfaction","Zufriedenheit","Soddisfazione"), value: "4.6/5", change: "+0.2", trend: "up" },
      ],
      table: {
        columns: [
          { key: "employee", label: t5("Nuevo Empleado","New Employee","Nouvel Employé","Neuer Mitarbeiter","Nuovo Dipendente"), type: "avatar" },
          { key: "position", label: t5("Cargo","Position","Poste","Position","Ruolo") },
          { key: "department", label: t5("Departamento","Department","Département","Abteilung","Dipartimento") },
          { key: "startDate", label: t5("Fecha Inicio","Start Date","Date de Début","Startdatum","Data Inizio"), type: "date" },
          { key: "progress", label: t5("Progreso","Progress","Progression","Fortschritt","Progresso") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "En Curso": "blue", "Completado": "green", "Atrasado": "red", "Pendiente": "yellow" } },
        ],
        rows: [
          { employee: "Lucía Fernández", position: "Full Stack Developer", department: "Tecnología", startDate: "Mar 1, 2026", progress: "75%", status: "En Curso" },
          { employee: "Andrea Molina", position: "HR Specialist", department: "RRHH", startDate: "Mar 3, 2026", progress: "60%", status: "En Curso" },
          { employee: "Javier Ortiz", position: "Data Analyst", department: "Tecnología", startDate: "Mar 5, 2026", progress: "30%", status: "En Curso" },
          { employee: "Sara Delgado", position: "Content Manager", department: "Marketing", startDate: "Feb 24, 2026", progress: "100%", status: "Completado" },
          { employee: "Miguel Ángel Ruiz", position: "Sales Rep", department: "Ventas", startDate: "Feb 17, 2026", progress: "100%", status: "Completado" },
        ],
        searchPlaceholder: t5("Buscar onboarding...","Search onboarding...","Rechercher une intégration...","Onboarding suchen...","Cerca onboarding..."),
      },
    },
    {
      id: "performance",
      label: t5("Rendimiento","Performance","Performance","Leistung","Rendimento"),
      icon: "target",
      kpis: [
        { label: t5("Evaluaciones Completadas","Evaluations Completed","Évaluations Complétées","Abgeschlossene Bewertungen","Valutazioni Completate"), value: "189", change: "+24", trend: "up" },
        { label: t5("Puntuación Media","Average Score","Score Moyen","Durchschnittliche Bewertung","Punteggio Medio"), value: "4.1/5", change: "+0.3", trend: "up" },
        { label: t5("Objetivos Cumplidos","Objectives Met","Objectifs Atteints","Erreichte Ziele","Obiettivi Raggiunti"), value: "78%", change: "+5%", trend: "up" },
        { label: t5("Pendientes de Revisión","Pending Review","En Attente de Révision","Ausstehende Überprüfung","In Attesa di Revisione"), value: "14", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "employee", label: t5("Empleado","Employee","Employé","Mitarbeiter","Dipendente"), type: "avatar" },
          { key: "department", label: t5("Departamento","Department","Département","Abteilung","Dipartimento") },
          { key: "score", label: t5("Puntuación","Score","Score","Bewertung","Punteggio") },
          { key: "objectives", label: t5("Objetivos Cumplidos","Objectives Met","Objectifs Atteints","Erreichte Ziele","Obiettivi Raggiunti") },
          { key: "period", label: t5("Periodo","Period","Période","Zeitraum","Periodo") },
          { key: "rating", label: t5("Calificación","Rating","Évaluation","Bewertung","Valutazione"), type: "badge", badgeColors: { "Excelente": "green", "Bueno": "blue", "Adecuado": "yellow", "Mejorable": "orange", "Insuficiente": "red" } },
        ],
        rows: [
          { employee: "Carlos Navarro", department: "Tecnología", score: "4.8/5", objectives: "95%", period: "Q1 2026", rating: "Excelente" },
          { employee: "Marta Jiménez", department: "Ventas", score: "4.2/5", objectives: "88%", period: "Q1 2026", rating: "Bueno" },
          { employee: "Roberto Castillo", department: "Marketing", score: "3.9/5", objectives: "75%", period: "Q1 2026", rating: "Bueno" },
          { employee: "Ana Ruiz", department: "Operaciones", score: "3.5/5", objectives: "68%", period: "Q1 2026", rating: "Adecuado" },
          { employee: "Pablo Sánchez", department: "Tecnología", score: "4.5/5", objectives: "92%", period: "Q1 2026", rating: "Excelente" },
        ],
        searchPlaceholder: t5("Buscar evaluaciones...","Search evaluations...","Rechercher des évaluations...","Bewertungen suchen...","Cerca valutazioni..."),
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
          { label: t5("Total Empresas","Total Companies","Total Entreprises","Unternehmen Gesamt","Aziende Totali"), value: "67", change: "+5", trend: "up" },
          { label: "MRR", value: "$4,530", change: "+11%", trend: "up" },
          { label: t5("Usuarios Activos","Active Users","Utilisateurs Actifs","Aktive Benutzer","Utenti Attivi"), value: "1,245", trend: "neutral" },
          { label: "Churn", value: "1.2%", change: "-0.6%", trend: "up" },
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
            { company: "Grupo Empresarial Sur", plan: "Enterprise", users: "320", mrr: "$199/mo", since: "Feb 2024", status: "Activa" },
            { company: "RRHH Digital SL", plan: "Pro", users: "45", mrr: "$59/mo", since: "Jul 2024", status: "Activa" },
            { company: "PeopleFirst", plan: "Pro", users: "22", mrr: "$59/mo", since: "Nov 2025", status: "Activa" },
            { company: "TalentUp", plan: "Basic", users: "8", mrr: "$29/mo", since: "Feb 2026", status: "Trial" },
            { company: "MegaCorp Industries", plan: "Enterprise", users: "580", mrr: "$299/mo", since: "Ene 2023", status: "Activa" },
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
