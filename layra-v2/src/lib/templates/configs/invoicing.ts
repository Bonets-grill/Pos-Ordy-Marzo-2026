import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const invoicingConfig: SystemConfig = {
  name: t5("InvoiceFlow","InvoiceFlow","InvoiceFlow","InvoiceFlow","InvoiceFlow"),
  subtitle: t5("Facturación Inteligente","Smart Invoicing","Facturation Intelligente","Intelligente Rechnungsstellung","Fatturazione Intelligente"),
  brandColor: "#059669",
  icon: "💰",
  modules: [
    {
      id: "dashboard",
      label: t5("Panel","Dashboard","Tableau de Bord","Dashboard","Pannello"),
      icon: "dashboard",
      kpis: [
        { label: t5("Facturado (Mes)","Invoiced (Month)","Facturé (Mois)","Fakturiert (Monat)","Fatturato (Mese)"), value: "$87,350", change: "+14.5%", trend: "up" },
        { label: t5("Pendiente de Cobro","Pending Collection","En Attente de Paiement","Ausstehende Zahlung","In Attesa di Pagamento"), value: "$23,800", change: "-8%", trend: "up" },
        { label: t5("Facturas Emitidas","Invoices Issued","Factures Émises","Ausgestellte Rechnungen","Fatture Emesse"), value: "64", change: "+12", trend: "up" },
        { label: t5("Cobro Promedio","Average Collection","Délai Moyen de Paiement","Durchschnittliche Zahlungsfrist","Tempo Medio di Incasso"), value: t5("8 días","8 days","8 jours","8 Tage","8 giorni"), change: "-2d", trend: "up" },
      ],
      table: {
        columns: [
          { key: "activity", label: t5("Actividad Reciente","Recent Activity","Activité Récente","Neueste Aktivität","Attività Recente") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente") },
          { key: "amount", label: t5("Monto","Amount","Montant","Betrag","Importo"), type: "currency" },
          { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo"), type: "badge", badgeColors: { "Factura": "blue", "Pago": "green", "Presupuesto": "purple", "Gasto": "red" } },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
        ],
        rows: [
          { activity: "Pago recibido FAC-2026-089", client: "Distribuciones Norte", amount: "$4,500", type: "Pago", date: "Mar 7, 2026" },
          { activity: "Factura emitida FAC-2026-091", client: "Tech Solutions SL", amount: "$12,800", type: "Factura", date: "Mar 7, 2026" },
          { activity: "Presupuesto enviado PRE-045", client: "Grupo Alimentar", amount: "$8,200", type: "Presupuesto", date: "Mar 6, 2026" },
          { activity: "Gasto registrado combustible", client: "—", amount: "$185", type: "Gasto", date: "Mar 6, 2026" },
          { activity: "Factura vencida FAC-2026-072", client: "Construcciones Vega", amount: "$6,750", type: "Factura", date: "Mar 5, 2026" },
        ],
        searchPlaceholder: t5("Buscar actividad...","Search activity...","Rechercher une activité...","Aktivität suchen...","Cerca attività..."),
      },
    },
    {
      id: "invoices",
      label: t5("Facturas","Invoices","Factures","Rechnungen","Fatture"),
      icon: "file",
      kpis: [
        { label: t5("Total Facturas","Total Invoices","Total Factures","Rechnungen Gesamt","Fatture Totali"), value: "248", trend: "neutral" },
        { label: t5("Pagadas (Mes)","Paid (Month)","Payées (Mois)","Bezahlt (Monat)","Pagate (Mese)"), value: "52", change: "+8", trend: "up" },
        { label: t5("Pendientes","Pending","En Attente","Ausstehend","In Sospeso"), value: "18", trend: "neutral" },
        { label: t5("Vencidas","Overdue","En Retard","Überfällig","Scadute"), value: "5", change: "+1", trend: "down" },
      ],
      table: {
        columns: [
          { key: "number", label: t5("Nº Factura","Invoice #","Nº Facture","Rechnungs-Nr.","N. Fattura") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "amount", label: t5("Importe","Amount","Montant","Betrag","Importo"), type: "currency" },
          { key: "issueDate", label: t5("Emisión","Issue Date","Émission","Ausstellungsdatum","Emissione"), type: "date" },
          { key: "dueDate", label: t5("Vencimiento","Due Date","Échéance","Fälligkeitsdatum","Scadenza"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Pagada": "green", "Pendiente": "yellow", "Vencida": "red", "Borrador": "gray" } },
        ],
        rows: [
          { number: "FAC-2026-091", client: "Tech Solutions SL", amount: "$12,800", issueDate: "Mar 7, 2026", dueDate: "Abr 6, 2026", status: "Pendiente" },
          { number: "FAC-2026-090", client: "Distribuciones Norte", amount: "$4,500", issueDate: "Mar 5, 2026", dueDate: "Abr 4, 2026", status: "Pagada" },
          { number: "FAC-2026-089", client: "Logística Express", amount: "$7,200", issueDate: "Mar 3, 2026", dueDate: "Abr 2, 2026", status: "Pendiente" },
          { number: "FAC-2026-088", client: "Grupo Alimentar", amount: "$3,450", issueDate: "Mar 1, 2026", dueDate: "Mar 31, 2026", status: "Pagada" },
          { number: "FAC-2026-072", client: "Construcciones Vega", amount: "$6,750", issueDate: "Feb 15, 2026", dueDate: "Mar 5, 2026", status: "Vencida" },
          { number: "FAC-2026-093", client: "Farmacia Central", amount: "$2,100", issueDate: "—", dueDate: "—", status: "Borrador" },
        ],
        searchPlaceholder: t5("Buscar facturas...","Search invoices...","Rechercher des factures...","Rechnungen suchen...","Cerca fatture..."),
      },
      tabs: [
        { id: "all", label: t5("Todas","All","Toutes","Alle","Tutte"), filterField: "status", filterValue: "all" },
        { id: "pending", label: t5("Pendientes","Pending","En Attente","Ausstehend","In Sospeso"), filterField: "status", filterValue: "Pendiente" },
        { id: "paid", label: t5("Pagadas","Paid","Payées","Bezahlt","Pagate"), filterField: "status", filterValue: "Pagada" },
        { id: "overdue", label: t5("Vencidas","Overdue","En Retard","Überfällig","Scadute"), filterField: "status", filterValue: "Vencida" },
        { id: "draft", label: t5("Borrador","Draft","Brouillon","Entwurf","Bozza"), filterField: "status", filterValue: "Borrador" },
      ],
      modal: {
        title: t5("Nueva Factura","New Invoice","Nouvelle Facture","Neue Rechnung","Nuova Fattura"),
        fields: [
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "select", required: true, options: [
            { value: "Tech Solutions SL", label: "Tech Solutions SL" }, { value: "Distribuciones Norte", label: "Distribuciones Norte" },
            { value: "Logística Express", label: "Logística Express" }, { value: "Grupo Alimentar", label: "Grupo Alimentar" },
          ]},
          { name: "amount", label: t5("Importe ($)","Amount ($)","Montant ($)","Betrag ($)","Importo ($)"), type: "number", required: true, placeholder: "0.00" },
          { name: "issueDate", label: t5("Fecha de Emisión","Issue Date","Date d'Émission","Ausstellungsdatum","Data di Emissione"), type: "date", required: true },
          { name: "dueDate", label: t5("Fecha de Vencimiento","Due Date","Date d'Échéance","Fälligkeitsdatum","Data di Scadenza"), type: "date", required: true },
          { name: "paymentMethod", label: t5("Método de Pago","Payment Method","Méthode de Paiement","Zahlungsmethode","Metodo di Pagamento"), type: "select", options: [
            { value: "Transferencia", label: t5("Transferencia","Transfer","Virement","Überweisung","Bonifico") }, { value: "Tarjeta", label: t5("Tarjeta","Card","Carte","Karte","Carta") },
            { value: "PayPal", label: "PayPal" }, { value: "Efectivo", label: t5("Efectivo","Cash","Espèces","Bargeld","Contanti") },
          ]},
          { name: "concept", label: t5("Concepto","Concept","Description","Beschreibung","Descrizione"), type: "textarea", required: true, placeholder: t5("Descripción del servicio o producto...","Service or product description...","Description du service ou produit...","Beschreibung der Dienstleistung oder des Produkts...","Descrizione del servizio o prodotto...") },
        ],
      },
    },
    {
      id: "quotes",
      label: t5("Presupuestos","Quotes","Devis","Angebote","Preventivi"),
      icon: "tag",
      kpis: [
        { label: t5("Presupuestos Activos","Active Quotes","Devis Actifs","Aktive Angebote","Preventivi Attivi"), value: "14", trend: "neutral" },
        { label: t5("Aprobados (Mes)","Approved (Month)","Approuvés (Mois)","Genehmigt (Monat)","Approvati (Mese)"), value: "8", change: "+3", trend: "up" },
        { label: t5("Tasa de Aprobación","Approval Rate","Taux d'Approbation","Genehmigungsrate","Tasso di Approvazione"), value: "67%", change: "+5%", trend: "up" },
        { label: t5("Valor Total Pendiente","Total Pending Value","Valeur Totale en Attente","Ausstehender Gesamtwert","Valore Totale in Sospeso"), value: "$42,600", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "number", label: t5("Nº Presupuesto","Quote #","Nº Devis","Angebots-Nr.","N. Preventivo") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "amount", label: t5("Importe","Amount","Montant","Betrag","Importo"), type: "currency" },
          { key: "sentDate", label: t5("Enviado","Sent","Envoyé","Gesendet","Inviato"), type: "date" },
          { key: "validUntil", label: t5("Válido Hasta","Valid Until","Valide Jusqu'au","Gültig Bis","Valido Fino Al"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Aprobado": "green", "Enviado": "blue", "Rechazado": "red", "Borrador": "gray", "Expirado": "yellow" } },
        ],
        rows: [
          { number: "PRE-2026-045", client: "Grupo Alimentar", amount: "$8,200", sentDate: "Mar 6, 2026", validUntil: "Mar 20, 2026", status: "Enviado" },
          { number: "PRE-2026-044", client: "Inmobiliaria Costa", amount: "$15,400", sentDate: "Mar 4, 2026", validUntil: "Mar 18, 2026", status: "Aprobado" },
          { number: "PRE-2026-043", client: "Clínica Dental Sol", amount: "$5,600", sentDate: "Mar 2, 2026", validUntil: "Mar 16, 2026", status: "Enviado" },
          { number: "PRE-2026-042", client: "Restaurante La Plaza", amount: "$3,200", sentDate: "Feb 28, 2026", validUntil: "Mar 14, 2026", status: "Rechazado" },
          { number: "PRE-2026-041", client: "AutoMotor SA", amount: "$10,200", sentDate: "Feb 25, 2026", validUntil: "Mar 11, 2026", status: "Expirado" },
        ],
        searchPlaceholder: t5("Buscar presupuestos...","Search quotes...","Rechercher des devis...","Angebote suchen...","Cerca preventivi..."),
      },
      modal: {
        title: t5("Nuevo Presupuesto","New Quote","Nouveau Devis","Neues Angebot","Nuovo Preventivo"),
        fields: [
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "text", required: true, placeholder: t5("Nombre del cliente","Client name","Nom du client","Kundenname","Nome del cliente") },
          { name: "amount", label: t5("Importe ($)","Amount ($)","Montant ($)","Betrag ($)","Importo ($)"), type: "number", required: true, placeholder: "0.00" },
          { name: "validUntil", label: t5("Válido Hasta","Valid Until","Valide Jusqu'au","Gültig Bis","Valido Fino Al"), type: "date", required: true },
          { name: "concept", label: t5("Concepto","Concept","Description","Beschreibung","Descrizione"), type: "textarea", required: true, placeholder: t5("Descripción del presupuesto...","Quote description...","Description du devis...","Angebotsbeschreibung...","Descrizione del preventivo...") },
        ],
      },
    },
    {
      id: "expenses",
      label: t5("Gastos","Expenses","Dépenses","Ausgaben","Spese"),
      icon: "trending",
      kpis: [
        { label: t5("Gastos (Mes)","Expenses (Month)","Dépenses (Mois)","Ausgaben (Monat)","Spese (Mese)"), value: "$12,450", change: "+6%", trend: "down" },
        { label: t5("Gastos Fijos","Fixed Expenses","Charges Fixes","Fixkosten","Spese Fisse"), value: "$4,800", trend: "neutral" },
        { label: t5("Gastos Variables","Variable Expenses","Charges Variables","Variable Kosten","Spese Variabili"), value: "$7,650", change: "+12%", trend: "down" },
        { label: t5("Margen Neto","Net Margin","Marge Nette","Nettomarge","Margine Netto"), value: "85.7%", change: "+1.2%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "concept", label: t5("Concepto","Concept","Description","Beschreibung","Descrizione") },
          { key: "category", label: t5("Categoría","Category","Catégorie","Kategorie","Categoria"), type: "badge", badgeColors: { "Operaciones": "blue", "Software": "purple", "Oficina": "green", "Viajes": "orange", "Marketing": "indigo" } },
          { key: "amount", label: t5("Monto","Amount","Montant","Betrag","Importo"), type: "currency" },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
          { key: "paymentMethod", label: t5("Método","Method","Méthode","Methode","Metodo") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Aprobado": "green", "Pendiente": "yellow", "Rechazado": "red" } },
        ],
        rows: [
          { concept: "Licencia Adobe Creative", category: "Software", amount: "$599", date: "Mar 7, 2026", paymentMethod: "Tarjeta", status: "Aprobado" },
          { concept: "Vuelo Madrid-Barcelona", category: "Viajes", amount: "$185", date: "Mar 6, 2026", paymentMethod: "Tarjeta", status: "Aprobado" },
          { concept: "Material de oficina", category: "Oficina", amount: "$124", date: "Mar 5, 2026", paymentMethod: "Efectivo", status: "Pendiente" },
          { concept: "Hosting servidores AWS", category: "Operaciones", amount: "$2,340", date: "Mar 1, 2026", paymentMethod: "Transferencia", status: "Aprobado" },
          { concept: "Campaña Google Ads", category: "Marketing", amount: "$1,500", date: "Mar 1, 2026", paymentMethod: "Tarjeta", status: "Aprobado" },
        ],
        searchPlaceholder: t5("Buscar gastos...","Search expenses...","Rechercher des dépenses...","Ausgaben suchen...","Cerca spese..."),
      },
      modal: {
        title: t5("Nuevo Gasto","New Expense","Nouvelle Dépense","Neue Ausgabe","Nuova Spesa"),
        fields: [
          { name: "concept", label: t5("Concepto","Concept","Description","Beschreibung","Descrizione"), type: "text", required: true, placeholder: t5("Descripción del gasto","Expense description","Description de la dépense","Ausgabenbeschreibung","Descrizione della spesa") },
          { name: "category", label: t5("Categoría","Category","Catégorie","Kategorie","Categoria"), type: "select", required: true, options: [
            { value: "Operaciones", label: t5("Operaciones","Operations","Opérations","Betrieb","Operazioni") }, { value: "Software", label: "Software" },
            { value: "Oficina", label: t5("Oficina","Office","Bureau","Büro","Ufficio") }, { value: "Viajes", label: t5("Viajes","Travel","Voyages","Reisen","Viaggi") },
            { value: "Marketing", label: "Marketing" },
          ]},
          { name: "amount", label: t5("Monto ($)","Amount ($)","Montant ($)","Betrag ($)","Importo ($)"), type: "number", required: true, placeholder: "0.00" },
          { name: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date", required: true },
          { name: "paymentMethod", label: t5("Método de Pago","Payment Method","Méthode de Paiement","Zahlungsmethode","Metodo di Pagamento"), type: "select", options: [
            { value: "Transferencia", label: t5("Transferencia","Transfer","Virement","Überweisung","Bonifico") }, { value: "Tarjeta", label: t5("Tarjeta","Card","Carte","Karte","Carta") },
            { value: "PayPal", label: "PayPal" }, { value: "Efectivo", label: t5("Efectivo","Cash","Espèces","Bargeld","Contanti") },
          ]},
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea", placeholder: t5("Observaciones...","Observations...","Observations...","Bemerkungen...","Osservazioni...") },
        ],
      },
    },
    {
      id: "clients",
      label: t5("Clientes","Clients","Clients","Kunden","Clienti"),
      icon: "users",
      kpis: [
        { label: t5("Total Clientes","Total Clients","Total Clients","Kunden Gesamt","Clienti Totali"), value: "156", change: "+8", trend: "up" },
        { label: t5("Clientes Activos","Active Clients","Clients Actifs","Aktive Kunden","Clienti Attivi"), value: "89", trend: "neutral" },
        { label: t5("Facturación Media","Average Billing","Facturation Moyenne","Durchschnittliche Abrechnung","Fatturazione Media"), value: "$2,340", trend: "neutral" },
        { label: t5("Nuevos (Mes)","New (Month)","Nouveaux (Mois)","Neue (Monat)","Nuovi (Mese)"), value: "8", change: "+3", trend: "up" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "cif", label: "CIF/NIF" },
          { key: "email", label: t5("Email","Email","Email","E-Mail","Email") },
          { key: "totalBilled", label: t5("Total Facturado","Total Billed","Total Facturé","Gesamt Fakturiert","Totale Fatturato"), type: "currency" },
          { key: "pendingAmount", label: t5("Pendiente","Pending","En Attente","Ausstehend","In Sospeso"), type: "currency" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "Inactivo": "gray", "Moroso": "red" } },
        ],
        rows: [
          { name: "Tech Solutions SL", cif: "B12345678", email: "admin@techsolutions.es", totalBilled: "$45,600", pendingAmount: "$12,800", status: "Activo" },
          { name: "Distribuciones Norte", cif: "A98765432", email: "contabilidad@distnorte.com", totalBilled: "$28,900", pendingAmount: "$0", status: "Activo" },
          { name: "Logística Express", cif: "B55667788", email: "pagos@logiexpress.es", totalBilled: "$18,400", pendingAmount: "$7,200", status: "Activo" },
          { name: "Construcciones Vega", cif: "A11223344", email: "admin@vegaconstruct.com", totalBilled: "$32,100", pendingAmount: "$6,750", status: "Moroso" },
          { name: "Grupo Alimentar", cif: "B44556677", email: "finanzas@alimentar.es", totalBilled: "$15,800", pendingAmount: "$0", status: "Activo" },
          { name: "AutoMotor SA", cif: "A99887766", email: "admin@automotor.es", totalBilled: "$8,200", pendingAmount: "$0", status: "Inactivo" },
        ],
        searchPlaceholder: t5("Buscar clientes...","Search clients...","Rechercher des clients...","Kunden suchen...","Cerca clienti..."),
      },
      modal: {
        title: t5("Nuevo Cliente","New Client","Nouveau Client","Neuer Kunde","Nuovo Cliente"),
        fields: [
          { name: "name", label: t5("Nombre / Razón Social","Name / Company","Nom / Raison Sociale","Name / Firma","Nome / Ragione Sociale"), type: "text", required: true, placeholder: t5("Ej: Empresa SL","E.g.: Company LLC","Ex : Société SARL","Z.B.: Firma GmbH","Es.: Azienda SRL") },
          { name: "cif", label: "CIF/NIF", type: "text", required: true, placeholder: "B12345678" },
          { name: "email", label: t5("Email","Email","Email","E-Mail","Email"), type: "email", required: true, placeholder: "contacto@empresa.com" },
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel", placeholder: "+34 900-000-000" },
          { name: "address", label: t5("Dirección","Address","Adresse","Adresse","Indirizzo"), type: "textarea", placeholder: t5("Dirección fiscal completa...","Full fiscal address...","Adresse fiscale complète...","Vollständige Steueradresse...","Indirizzo fiscale completo...") },
        ],
      },
    },
    {
      id: "reports",
      label: t5("Informes","Reports","Rapports","Berichte","Report"),
      icon: "chart",
      kpis: [
        { label: t5("Ingresos (Trimestre)","Revenue (Quarter)","Revenus (Trimestre)","Einnahmen (Quartal)","Ricavi (Trimestre)"), value: "$245,800", change: "+18%", trend: "up" },
        { label: t5("Gastos (Trimestre)","Expenses (Quarter)","Dépenses (Trimestre)","Ausgaben (Quartal)","Spese (Trimestre)"), value: "$35,200", change: "+4%", trend: "down" },
        { label: t5("Beneficio Neto","Net Profit","Bénéfice Net","Nettogewinn","Utile Netto"), value: "$210,600", change: "+21%", trend: "up" },
        { label: t5("Facturas Impagadas","Unpaid Invoices","Factures Impayées","Unbezahlte Rechnungen","Fatture Non Pagate"), value: "$14,950", trend: "down" },
      ],
      table: {
        columns: [
          { key: "month", label: t5("Mes","Month","Mois","Monat","Mese") },
          { key: "income", label: t5("Ingresos","Income","Revenus","Einnahmen","Ricavi"), type: "currency" },
          { key: "expenses", label: t5("Gastos","Expenses","Dépenses","Ausgaben","Spese"), type: "currency" },
          { key: "profit", label: t5("Beneficio","Profit","Bénéfice","Gewinn","Utile"), type: "currency" },
          { key: "invoiceCount", label: t5("Facturas","Invoices","Factures","Rechnungen","Fatture") },
          { key: "trend", label: t5("Tendencia","Trend","Tendance","Trend","Tendenza"), type: "badge", badgeColors: { "Crecimiento": "green", "Estable": "blue", "Descenso": "red" } },
        ],
        rows: [
          { month: "Marzo 2026", income: "$87,350", expenses: "$12,450", profit: "$74,900", invoiceCount: "64", trend: "Crecimiento" },
          { month: "Febrero 2026", income: "$76,200", expenses: "$11,800", profit: "$64,400", invoiceCount: "58", trend: "Crecimiento" },
          { month: "Enero 2026", income: "$82,250", expenses: "$10,950", profit: "$71,300", invoiceCount: "61", trend: "Estable" },
          { month: "Diciembre 2025", income: "$69,400", expenses: "$13,200", profit: "$56,200", invoiceCount: "52", trend: "Descenso" },
          { month: "Noviembre 2025", income: "$74,800", expenses: "$11,600", profit: "$63,200", invoiceCount: "55", trend: "Estable" },
        ],
        searchPlaceholder: t5("Buscar periodo...","Search period...","Rechercher une période...","Zeitraum suchen...","Cerca periodo..."),
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
          { label: t5("Total Empresas","Total Companies","Total Entreprises","Unternehmen Gesamt","Aziende Totali"), value: "134", change: "+11", trend: "up" },
          { label: "MRR", value: "$7,860", change: "+15%", trend: "up" },
          { label: t5("Usuarios Activos","Active Users","Utilisateurs Actifs","Aktive Benutzer","Utenti Attivi"), value: "612", trend: "neutral" },
          { label: "Churn", value: "1.5%", change: "-0.4%", trend: "up" },
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
            { company: "Contabilidad Express", plan: "Enterprise", users: "28", mrr: "$99/mo", since: "Mar 2024", status: "Activa" },
            { company: "Factura Fácil SL", plan: "Pro", users: "9", mrr: "$59/mo", since: "Sep 2024", status: "Activa" },
            { company: "GestorPyme", plan: "Pro", users: "14", mrr: "$59/mo", since: "Ene 2025", status: "Activa" },
            { company: "NuevoNegocio", plan: "Basic", users: "2", mrr: "$29/mo", since: "Mar 2026", status: "Trial" },
            { company: "AuditGroup SA", plan: "Enterprise", users: "65", mrr: "$199/mo", since: "Jul 2023", status: "Activa" },
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
