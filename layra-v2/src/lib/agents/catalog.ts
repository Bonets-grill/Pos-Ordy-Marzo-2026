// AI Agent catalog — all available agents
import type { AgentCatalogItem } from "./types";
import { t5 } from "../templates/types";

export const AGENT_CATALOG: AgentCatalogItem[] = [
  // ═══════════════════════════════════════════
  // PREMIUM AGENTS (20)
  // ═══════════════════════════════════════════
  {
    id: "sales_sdr",
    name: t5("Agente SDR de Ventas", "Sales SDR Agent", "Agent SDR Commercial", "Vertriebs-SDR-Agent", "Agente SDR Vendite"),
    description: t5(
      "Prospección automática, emails personalizados, cualificación de leads y agendamiento de reuniones 24/7",
      "Automated prospecting, personalized emails, lead qualification and meeting scheduling 24/7",
      "Prospection automatique, emails personnalisés, qualification de leads et planification de réunions 24/7",
      "Automatische Akquise, personalisierte E-Mails, Lead-Qualifizierung und Terminplanung rund um die Uhr",
      "Prospezione automatica, email personalizzate, qualificazione lead e pianificazione riunioni 24/7"
    ),
    category: "premium",
    icon: "trending",
    brandColor: "#6366f1",
    priceMonthly: 299,
    trialDays: 14,
    tags: ["sales", "b2b", "leads"],
  },
  {
    id: "voice_callcenter",
    name: t5("Agente de Voz IA", "AI Voice Agent", "Agent Vocal IA", "KI-Sprachagent", "Agente Vocale IA"),
    description: t5(
      "Atiende llamadas entrantes y salientes, procesa pedidos, resuelve consultas y escala solo casos complejos",
      "Handles inbound/outbound calls, processes orders, resolves inquiries and escalates only complex cases",
      "Gère les appels entrants/sortants, traite les commandes, résout les demandes et escalade les cas complexes",
      "Bearbeitet eingehende/ausgehende Anrufe, verarbeitet Bestellungen, löst Anfragen und eskaliert nur komplexe Fälle",
      "Gestisce chiamate in entrata/uscita, elabora ordini, risolve richieste e scala solo i casi complessi"
    ),
    category: "premium",
    icon: "phone",
    brandColor: "#8b5cf6",
    priceMonthly: 349,
    trialDays: 14,
    tags: ["voice", "callcenter", "support"],
  },
  {
    id: "customer_support",
    name: t5("Agente de Soporte", "Support Agent", "Agent de Support", "Support-Agent", "Agente Supporto"),
    description: t5(
      "Resuelve tickets por chat, email y redes sociales. Procesa devoluciones, rastrea pedidos y gestiona quejas",
      "Resolves tickets via chat, email and social media. Processes returns, tracks orders and handles complaints",
      "Résout les tickets par chat, email et réseaux sociaux. Traite les retours, suit les commandes et gère les plaintes",
      "Löst Tickets per Chat, E-Mail und Social Media. Bearbeitet Retouren, verfolgt Bestellungen und bearbeitet Beschwerden",
      "Risolve ticket via chat, email e social media. Elabora resi, traccia ordini e gestisce reclami"
    ),
    category: "premium",
    icon: "headphones",
    brandColor: "#0ea5e9",
    priceMonthly: 199,
    trialDays: 14,
    tags: ["support", "tickets", "chat"],
  },
  {
    id: "insurance_claims",
    name: t5("Agente de Seguros", "Insurance Agent", "Agent d'Assurance", "Versicherungs-Agent", "Agente Assicurativo"),
    description: t5(
      "Procesa reclamaciones, detecta fraude, gestiona pólizas y auto-apela denegaciones",
      "Processes claims, detects fraud, manages policies and auto-appeals denials",
      "Traite les réclamations, détecte la fraude, gère les polices et conteste automatiquement les refus",
      "Verarbeitet Ansprüche, erkennt Betrug, verwaltet Policen und legt automatisch Widerspruch ein",
      "Elabora reclami, rileva frodi, gestisce polizze e contesta automaticamente i rifiuti"
    ),
    category: "premium",
    icon: "shield",
    brandColor: "#14b8a6",
    priceMonthly: 399,
    trialDays: 14,
    tags: ["insurance", "claims", "fraud"],
  },
  {
    id: "recruiting",
    name: t5("Agente de Reclutamiento", "Recruiting Agent", "Agent de Recrutement", "Recruiting-Agent", "Agente Reclutamento"),
    description: t5(
      "Busca candidatos, filtra CVs, realiza entrevistas iniciales y agenda entrevistas con el equipo",
      "Sources candidates, screens resumes, conducts initial interviews and schedules team interviews",
      "Recherche de candidats, tri des CV, entretiens initiaux et planification des entretiens d'équipe",
      "Sucht Kandidaten, prüft Lebensläufe, führt Erstgespräche und plant Teaminterviews",
      "Cerca candidati, filtra CV, conduce colloqui iniziali e pianifica colloqui con il team"
    ),
    category: "premium",
    icon: "users",
    brandColor: "#f59e0b",
    priceMonthly: 249,
    trialDays: 14,
    tags: ["hr", "recruiting", "talent"],
  },
  {
    id: "legal_contracts",
    name: t5("Agente Legal", "Legal Agent", "Agent Juridique", "Rechts-Agent", "Agente Legale"),
    description: t5(
      "Revisa contratos, extrae cláusulas, detecta riesgos y verifica cumplimiento normativo",
      "Reviews contracts, extracts clauses, detects risks and verifies regulatory compliance",
      "Révise les contrats, extrait les clauses, détecte les risques et vérifie la conformité réglementaire",
      "Prüft Verträge, extrahiert Klauseln, erkennt Risiken und überprüft die Einhaltung von Vorschriften",
      "Revisiona contratti, estrae clausole, rileva rischi e verifica la conformità normativa"
    ),
    category: "premium",
    icon: "file",
    brandColor: "#64748b",
    priceMonthly: 349,
    trialDays: 14,
    tags: ["legal", "contracts", "compliance"],
  },
  {
    id: "accounting",
    name: t5("Agente Contable", "Accounting Agent", "Agent Comptable", "Buchhaltungs-Agent", "Agente Contabile"),
    description: t5(
      "Automatiza facturación, conciliación bancaria, categorización de gastos y reportes fiscales",
      "Automates invoicing, bank reconciliation, expense categorization and tax reporting",
      "Automatise la facturation, la réconciliation bancaire, la catégorisation des dépenses et les rapports fiscaux",
      "Automatisiert Rechnungsstellung, Bankabstimmung, Ausgabenkategorisierung und Steuerberichte",
      "Automatizza fatturazione, riconciliazione bancaria, categorizzazione spese e report fiscali"
    ),
    category: "premium",
    icon: "dollar",
    brandColor: "#059669",
    priceMonthly: 249,
    trialDays: 14,
    tags: ["finance", "accounting", "tax"],
  },
  {
    id: "healthcare_admin",
    name: t5("Agente Clínico", "Healthcare Agent", "Agent Clinique", "Klinik-Agent", "Agente Clinico"),
    description: t5(
      "Documentación clínica, citas, pre-autorizaciones, codificación médica y seguimiento de pacientes",
      "Clinical documentation, appointments, pre-authorizations, medical coding and patient follow-up",
      "Documentation clinique, rendez-vous, pré-autorisations, codification médicale et suivi des patients",
      "Klinische Dokumentation, Termine, Vorabgenehmigungen, medizinische Kodierung und Patientennachsorge",
      "Documentazione clinica, appuntamenti, pre-autorizzazioni, codifica medica e follow-up pazienti"
    ),
    category: "premium",
    icon: "heart",
    brandColor: "#ef4444",
    priceMonthly: 349,
    trialDays: 14,
    tags: ["healthcare", "medical", "clinic"],
  },
  {
    id: "real_estate_agent",
    name: t5("Agente Inmobiliario IA", "AI Real Estate Agent", "Agent Immobilier IA", "KI-Immobilienmakler", "Agente Immobiliare IA"),
    description: t5(
      "Cualifica leads, agenda visitas, responde consultas 24/7 y genera análisis de mercado",
      "Qualifies leads, schedules showings, answers inquiries 24/7 and generates market analysis",
      "Qualifie les prospects, planifie les visites, répond aux demandes 24/7 et génère des analyses de marché",
      "Qualifiziert Leads, plant Besichtigungen, beantwortet Anfragen 24/7 und erstellt Marktanalysen",
      "Qualifica lead, pianifica visite, risponde alle richieste 24/7 e genera analisi di mercato"
    ),
    category: "premium",
    icon: "home",
    brandColor: "#d97706",
    priceMonthly: 279,
    trialDays: 14,
    tags: ["real-estate", "leads", "property"],
  },
  {
    id: "supply_chain",
    name: t5("Agente Supply Chain", "Supply Chain Agent", "Agent Chaîne d'Approvisionnement", "Lieferketten-Agent", "Agente Supply Chain"),
    description: t5(
      "Predice roturas de stock, optimiza rutas, gestiona inventario y automatiza órdenes de compra",
      "Predicts stockouts, optimizes routing, manages inventory and automates purchase orders",
      "Prédit les ruptures de stock, optimise les itinéraires, gère les stocks et automatise les commandes",
      "Prognostiziert Engpässe, optimiert Routen, verwaltet Lagerbestände und automatisiert Bestellungen",
      "Prevede esaurimenti scorte, ottimizza percorsi, gestisce inventario e automatizza ordini d'acquisto"
    ),
    category: "premium",
    icon: "truck",
    brandColor: "#0891b2",
    priceMonthly: 399,
    trialDays: 14,
    tags: ["logistics", "inventory", "supply-chain"],
  },
  {
    id: "compliance",
    name: t5("Agente de Compliance", "Compliance Agent", "Agent de Conformité", "Compliance-Agent", "Agente Compliance"),
    description: t5(
      "Monitorea cambios regulatorios, evalúa cumplimiento, genera reportes de auditoría y alerta violaciones",
      "Monitors regulatory changes, assesses compliance, generates audit reports and alerts violations",
      "Surveille les changements réglementaires, évalue la conformité, génère des rapports d'audit et alerte les violations",
      "Überwacht regulatorische Änderungen, bewertet Compliance, erstellt Prüfberichte und warnt vor Verstößen",
      "Monitora cambiamenti normativi, valuta conformità, genera report di audit e segnala violazioni"
    ),
    category: "premium",
    icon: "shield",
    brandColor: "#7c3aed",
    priceMonthly: 349,
    trialDays: 14,
    tags: ["compliance", "regulatory", "audit"],
  },
  {
    id: "fraud_detection",
    name: t5("Agente Anti-Fraude", "Fraud Detection Agent", "Agent Anti-Fraude", "Betrugserkennungs-Agent", "Agente Anti-Frode"),
    description: t5(
      "Monitorea transacciones en tiempo real, bloquea actividad fraudulenta y genera reportes de investigación",
      "Monitors transactions in real-time, blocks fraudulent activity and generates investigation reports",
      "Surveille les transactions en temps réel, bloque les activités frauduleuses et génère des rapports d'enquête",
      "Überwacht Transaktionen in Echtzeit, blockiert betrügerische Aktivitäten und erstellt Untersuchungsberichte",
      "Monitora transazioni in tempo reale, blocca attività fraudolente e genera report di indagine"
    ),
    category: "premium",
    icon: "lock",
    brandColor: "#dc2626",
    priceMonthly: 449,
    trialDays: 14,
    tags: ["fraud", "security", "fintech"],
  },
  {
    id: "ecommerce_ops",
    name: t5("Agente E-commerce", "E-commerce Agent", "Agent E-commerce", "E-Commerce-Agent", "Agente E-commerce"),
    description: t5(
      "Gestiona listings, pricing dinámico, sincronización de inventario y recomendaciones personalizadas",
      "Manages listings, dynamic pricing, inventory sync and personalized recommendations",
      "Gère les annonces, la tarification dynamique, la synchronisation des stocks et les recommandations personnalisées",
      "Verwaltet Angebote, dynamische Preisgestaltung, Bestandssynchronisation und personalisierte Empfehlungen",
      "Gestisce inserzioni, pricing dinamico, sincronizzazione inventario e raccomandazioni personalizzate"
    ),
    category: "premium",
    icon: "shopping",
    brandColor: "#ea580c",
    priceMonthly: 249,
    trialDays: 14,
    tags: ["ecommerce", "pricing", "catalog"],
  },
  {
    id: "marketing_content",
    name: t5("Agente de Marketing", "Marketing Agent", "Agent Marketing", "Marketing-Agent", "Agente Marketing"),
    description: t5(
      "Planifica contenido, escribe posts, gestiona campañas publicitarias y analiza rendimiento",
      "Plans content, writes posts, manages ad campaigns and analyzes performance",
      "Planifie le contenu, rédige des posts, gère les campagnes publicitaires et analyse les performances",
      "Plant Inhalte, schreibt Posts, verwaltet Werbekampagnen und analysiert die Leistung",
      "Pianifica contenuti, scrive post, gestisce campagne pubblicitarie e analizza le performance"
    ),
    category: "premium",
    icon: "speaker",
    brandColor: "#e11d48",
    priceMonthly: 199,
    trialDays: 14,
    tags: ["marketing", "content", "social"],
  },
  {
    id: "devops_aiops",
    name: t5("Agente DevOps", "DevOps Agent", "Agent DevOps", "DevOps-Agent", "Agente DevOps"),
    description: t5(
      "Monitorea infraestructura, auto-remedia incidentes, gestiona deploys y analiza causa raíz",
      "Monitors infrastructure, auto-remediates incidents, manages deployments and analyzes root cause",
      "Surveille l'infrastructure, résout automatiquement les incidents, gère les déploiements et analyse les causes",
      "Überwacht Infrastruktur, behebt Vorfälle automatisch, verwaltet Deployments und analysiert Ursachen",
      "Monitora infrastruttura, risolve automaticamente incidenti, gestisce deploy e analizza cause"
    ),
    category: "premium",
    icon: "server",
    brandColor: "#475569",
    priceMonthly: 349,
    trialDays: 14,
    tags: ["devops", "infrastructure", "monitoring"],
  },
  {
    id: "medspa_clinic",
    name: t5("Agente Clínica Estética", "Med Spa Agent", "Agent Clinique Esthétique", "Schönheitsklinik-Agent", "Agente Clinica Estetica"),
    description: t5(
      "Agenda citas, upsell de tratamientos, gestiona waitlists y re-engancha pacientes inactivos",
      "Books appointments, upsells treatments, manages waitlists and re-engages inactive patients",
      "Prend les rendez-vous, vend des soins additionnels, gère les listes d'attente et réengage les patients inactifs",
      "Bucht Termine, Upselling von Behandlungen, verwaltet Wartelisten und reaktiviert inaktive Patienten",
      "Prenota appuntamenti, upselling trattamenti, gestisce liste d'attesa e riattiva pazienti inattivi"
    ),
    category: "premium",
    icon: "star",
    brandColor: "#ec4899",
    priceMonthly: 199,
    trialDays: 14,
    tags: ["medspa", "beauty", "appointments"],
  },
  {
    id: "financial_advisor",
    name: t5("Agente Financiero", "Financial Agent", "Agent Financier", "Finanz-Agent", "Agente Finanziario"),
    description: t5(
      "Analiza portafolios, genera recomendaciones de inversión y rebalancea asignaciones",
      "Analyzes portfolios, generates investment recommendations and rebalances allocations",
      "Analyse les portefeuilles, génère des recommandations d'investissement et rééquilibre les allocations",
      "Analysiert Portfolios, generiert Anlageempfehlungen und rebalanciert Allokationen",
      "Analizza portafogli, genera raccomandazioni di investimento e ribilancia allocazioni"
    ),
    category: "premium",
    icon: "trending",
    brandColor: "#0d9488",
    priceMonthly: 399,
    trialDays: 14,
    tags: ["finance", "investment", "wealth"],
  },
  {
    id: "local_leads",
    name: t5("Agente de Leads Locales", "Local Leads Agent", "Agent Leads Locaux", "Lokale-Leads-Agent", "Agente Lead Locali"),
    description: t5(
      "Gestiona Google Business, responde reseñas, genera leads locales y automatiza seguimiento",
      "Manages Google Business, responds to reviews, generates local leads and automates follow-up",
      "Gère Google Business, répond aux avis, génère des leads locaux et automatise le suivi",
      "Verwaltet Google Business, antwortet auf Bewertungen, generiert lokale Leads und automatisiert Nachverfolgung",
      "Gestisce Google Business, risponde alle recensioni, genera lead locali e automatizza il follow-up"
    ),
    category: "premium",
    icon: "map",
    brandColor: "#4f46e5",
    priceMonthly: 149,
    trialDays: 14,
    tags: ["local", "seo", "reputation"],
  },
  {
    id: "hr_operations",
    name: t5("Agente de RRHH", "HR Agent", "Agent RH", "HR-Agent", "Agente HR"),
    description: t5(
      "Onboarding, consultas de políticas, gestión de PTO, encuestas de clima y beneficios",
      "Onboarding, policy inquiries, PTO management, pulse surveys and benefits enrollment",
      "Onboarding, demandes de politiques, gestion des congés, sondages et inscription aux avantages",
      "Onboarding, Richtlinienanfragen, Urlaubsverwaltung, Pulsbefragungen und Leistungsanmeldung",
      "Onboarding, richieste policy, gestione ferie, sondaggi e iscrizione benefit"
    ),
    category: "premium",
    icon: "briefcase",
    brandColor: "#7c3aed",
    priceMonthly: 199,
    trialDays: 14,
    tags: ["hr", "operations", "employee"],
  },
  {
    id: "bi_analytics",
    name: t5("Agente de BI/Analytics", "BI Analytics Agent", "Agent BI/Analytics", "BI-Analytics-Agent", "Agente BI/Analytics"),
    description: t5(
      "Consultas en lenguaje natural a bases de datos, genera reportes, identifica tendencias y anomalías",
      "Natural language queries to databases, generates reports, identifies trends and anomalies",
      "Requêtes en langage naturel aux bases de données, génère des rapports, identifie tendances et anomalies",
      "Natürlichsprachliche Datenbankabfragen, erstellt Berichte, identifiziert Trends und Anomalien",
      "Query in linguaggio naturale ai database, genera report, identifica tendenze e anomalie"
    ),
    category: "premium",
    icon: "chart",
    brandColor: "#2563eb",
    priceMonthly: 249,
    trialDays: 14,
    tags: ["analytics", "bi", "data"],
  },

  // ═══════════════════════════════════════════
  // BASIC AGENTS (15) — Local businesses
  // ═══════════════════════════════════════════
  {
    id: "barber_shop",
    name: t5("Agente de Barbería", "Barber Shop Agent", "Agent Barbier", "Barbershop-Agent", "Agente Barbiere"),
    description: t5(
      "Agenda citas por WhatsApp, envía recordatorios, gestiona lista de espera y atiende consultas de precios",
      "Books appointments via WhatsApp, sends reminders, manages waitlist and handles price inquiries",
      "Prend les rendez-vous par WhatsApp, envoie des rappels, gère la liste d'attente et répond aux demandes de prix",
      "Bucht Termine per WhatsApp, sendet Erinnerungen, verwaltet Warteliste und beantwortet Preisanfragen",
      "Prenota appuntamenti via WhatsApp, invia promemoria, gestisce lista d'attesa e risponde a richieste prezzi"
    ),
    category: "basic",
    icon: "scissors",
    brandColor: "#78716c",
    priceMonthly: 49,
    trialDays: 14,
    tags: ["barber", "appointments", "local"],
  },
  {
    id: "hair_salon",
    name: t5("Agente de Peluquería", "Hair Salon Agent", "Agent Salon de Coiffure", "Friseursalon-Agent", "Agente Parrucchiere"),
    description: t5(
      "Reservas online, recordatorios de citas, catálogo de servicios y seguimiento post-visita",
      "Online bookings, appointment reminders, service catalog and post-visit follow-up",
      "Réservations en ligne, rappels de rendez-vous, catalogue de services et suivi post-visite",
      "Online-Buchungen, Terminerinnerungen, Servicekatalog und Nachverfolgung nach dem Besuch",
      "Prenotazioni online, promemoria appuntamenti, catalogo servizi e follow-up post-visita"
    ),
    category: "basic",
    icon: "star",
    brandColor: "#db2777",
    priceMonthly: 49,
    trialDays: 14,
    tags: ["salon", "beauty", "appointments"],
  },
  {
    id: "auto_mechanic",
    name: t5("Agente de Taller Mecánico", "Auto Mechanic Agent", "Agent Garage Auto", "Autowerkstatt-Agent", "Agente Officina Meccanica"),
    description: t5(
      "Recibe solicitudes de reparación, agenda citas, envía presupuestos y notifica cuando el vehículo está listo",
      "Receives repair requests, schedules appointments, sends quotes and notifies when vehicle is ready",
      "Reçoit les demandes de réparation, planifie les rendez-vous, envoie des devis et notifie quand le véhicule est prêt",
      "Empfängt Reparaturanfragen, plant Termine, sendet Kostenvoranschläge und benachrichtigt bei Fertigstellung",
      "Riceve richieste di riparazione, pianifica appuntamenti, invia preventivi e notifica quando il veicolo è pronto"
    ),
    category: "basic",
    icon: "tool",
    brandColor: "#b45309",
    priceMonthly: 59,
    trialDays: 14,
    tags: ["mechanic", "auto", "repair"],
  },
  {
    id: "restaurant_agent",
    name: t5("Agente de Restaurante", "Restaurant Agent", "Agent Restaurant", "Restaurant-Agent", "Agente Ristorante"),
    description: t5(
      "Reservas, pedidos por WhatsApp, menú digital, confirmaciones automáticas y feedback post-comida",
      "Reservations, WhatsApp orders, digital menu, automatic confirmations and post-meal feedback",
      "Réservations, commandes WhatsApp, menu digital, confirmations automatiques et feedback post-repas",
      "Reservierungen, WhatsApp-Bestellungen, digitale Speisekarte, automatische Bestätigungen und Feedback",
      "Prenotazioni, ordini WhatsApp, menu digitale, conferme automatiche e feedback post-pasto"
    ),
    category: "basic",
    icon: "star",
    brandColor: "#dc2626",
    priceMonthly: 59,
    trialDays: 14,
    tags: ["restaurant", "orders", "reservations"],
  },
  {
    id: "dentist_agent",
    name: t5("Agente de Dentista", "Dentist Agent", "Agent Dentiste", "Zahnarzt-Agent", "Agente Dentista"),
    description: t5(
      "Agenda citas, recordatorios de revisiones, gestiona urgencias y envía instrucciones post-tratamiento",
      "Schedules appointments, review reminders, manages emergencies and sends post-treatment instructions",
      "Planifie les rendez-vous, rappels de contrôle, gère les urgences et envoie des instructions post-traitement",
      "Plant Termine, Kontrollerinnerungen, verwaltet Notfälle und sendet Nachbehandlungsanweisungen",
      "Pianifica appuntamenti, promemoria controlli, gestisce urgenze e invia istruzioni post-trattamento"
    ),
    category: "basic",
    icon: "heart",
    brandColor: "#0284c7",
    priceMonthly: 59,
    trialDays: 14,
    tags: ["dentist", "health", "appointments"],
  },
  {
    id: "vet_clinic",
    name: t5("Agente de Veterinaria", "Vet Clinic Agent", "Agent Vétérinaire", "Tierarzt-Agent", "Agente Veterinario"),
    description: t5(
      "Citas para mascotas, recordatorios de vacunas, urgencias y seguimiento de tratamientos",
      "Pet appointments, vaccine reminders, emergencies and treatment follow-up",
      "Rendez-vous pour animaux, rappels de vaccins, urgences et suivi de traitements",
      "Tierarzttermine, Impferinnerungen, Notfälle und Behandlungsnachsorge",
      "Appuntamenti per animali, promemoria vaccini, urgenze e follow-up trattamenti"
    ),
    category: "basic",
    icon: "heart",
    brandColor: "#16a34a",
    priceMonthly: 59,
    trialDays: 14,
    tags: ["vet", "pets", "clinic"],
  },
  {
    id: "gym_agent",
    name: t5("Agente de Gimnasio", "Gym Agent", "Agent Salle de Sport", "Fitnessstudio-Agent", "Agente Palestra"),
    description: t5(
      "Inscripciones, horarios de clases, renovaciones de membresía y motivación de asistencia",
      "Sign-ups, class schedules, membership renewals and attendance motivation",
      "Inscriptions, horaires de cours, renouvellements d'abonnement et motivation de présence",
      "Anmeldungen, Kurszeiten, Mitgliedschaftsverlängerungen und Anwesenheitsmotivation",
      "Iscrizioni, orari corsi, rinnovi abbonamento e motivazione frequenza"
    ),
    category: "basic",
    icon: "zap",
    brandColor: "#7c3aed",
    priceMonthly: 49,
    trialDays: 14,
    tags: ["gym", "fitness", "membership"],
  },
  {
    id: "spa_wellness",
    name: t5("Agente de Spa", "Spa Agent", "Agent Spa", "Spa-Agent", "Agente Spa"),
    description: t5(
      "Reservas de tratamientos, paquetes personalizados, recordatorios y programas de fidelización",
      "Treatment bookings, custom packages, reminders and loyalty programs",
      "Réservations de soins, forfaits personnalisés, rappels et programmes de fidélité",
      "Behandlungsbuchungen, individuelle Pakete, Erinnerungen und Treueprogramme",
      "Prenotazioni trattamenti, pacchetti personalizzati, promemoria e programmi fedeltà"
    ),
    category: "basic",
    icon: "heart",
    brandColor: "#a855f7",
    priceMonthly: 49,
    trialDays: 14,
    tags: ["spa", "wellness", "beauty"],
  },
  {
    id: "laundry_agent",
    name: t5("Agente de Lavandería", "Laundry Agent", "Agent Pressing", "Wäscherei-Agent", "Agente Lavanderia"),
    description: t5(
      "Recogida/entrega a domicilio, seguimiento de pedidos, precios y notificaciones de estado",
      "Home pickup/delivery, order tracking, pricing and status notifications",
      "Collecte/livraison à domicile, suivi des commandes, tarifs et notifications de statut",
      "Abholung/Lieferung, Auftragsverfolgung, Preise und Statusbenachrichtigungen",
      "Ritiro/consegna a domicilio, tracciamento ordini, prezzi e notifiche di stato"
    ),
    category: "basic",
    icon: "refresh",
    brandColor: "#0891b2",
    priceMonthly: 39,
    trialDays: 14,
    tags: ["laundry", "delivery", "local"],
  },
  {
    id: "flower_shop",
    name: t5("Agente de Florería", "Flower Shop Agent", "Agent Fleuriste", "Blumenladen-Agent", "Agente Fiorista"),
    description: t5(
      "Pedidos de arreglos, entregas programadas, catálogo por temporada y mensajes personalizados",
      "Arrangement orders, scheduled deliveries, seasonal catalog and personalized messages",
      "Commandes d'arrangements, livraisons programmées, catalogue saisonnier et messages personnalisés",
      "Arrangement-Bestellungen, geplante Lieferungen, saisonaler Katalog und personalisierte Nachrichten",
      "Ordini di composizioni, consegne programmate, catalogo stagionale e messaggi personalizzati"
    ),
    category: "basic",
    icon: "heart",
    brandColor: "#e11d48",
    priceMonthly: 39,
    trialDays: 14,
    tags: ["flowers", "delivery", "gifts"],
  },
  {
    id: "bakery_agent",
    name: t5("Agente de Panadería", "Bakery Agent", "Agent Boulangerie", "Bäckerei-Agent", "Agente Panetteria"),
    description: t5(
      "Pedidos de pasteles personalizados, encargos especiales, horarios y notificaciones de recogida",
      "Custom cake orders, special requests, schedules and pickup notifications",
      "Commandes de gâteaux personnalisés, demandes spéciales, horaires et notifications de retrait",
      "Individuelle Tortenbestellungen, Sonderwünsche, Öffnungszeiten und Abholbenachrichtigungen",
      "Ordini torte personalizzate, richieste speciali, orari e notifiche di ritiro"
    ),
    category: "basic",
    icon: "shopping",
    brandColor: "#ca8a04",
    priceMonthly: 39,
    trialDays: 14,
    tags: ["bakery", "orders", "food"],
  },
  {
    id: "hotel_agent",
    name: t5("Agente de Hotel", "Hotel Agent", "Agent Hôtel", "Hotel-Agent", "Agente Hotel"),
    description: t5(
      "Reservas, check-in/out, servicios de habitación, recomendaciones locales y feedback",
      "Reservations, check-in/out, room service, local recommendations and feedback",
      "Réservations, check-in/out, service de chambre, recommandations locales et feedback",
      "Reservierungen, Check-in/out, Zimmerservice, lokale Empfehlungen und Feedback",
      "Prenotazioni, check-in/out, servizio in camera, raccomandazioni locali e feedback"
    ),
    category: "basic",
    icon: "building",
    brandColor: "#1d4ed8",
    priceMonthly: 79,
    trialDays: 14,
    tags: ["hotel", "hospitality", "bookings"],
  },
  {
    id: "clothing_store",
    name: t5("Agente de Tienda de Ropa", "Clothing Store Agent", "Agent Boutique Vêtements", "Bekleidungsgeschäft-Agent", "Agente Negozio Abbigliamento"),
    description: t5(
      "Catálogo por WhatsApp, disponibilidad de tallas, reservas de prendas y notificaciones de ofertas",
      "WhatsApp catalog, size availability, garment reservations and offer notifications",
      "Catalogue WhatsApp, disponibilité des tailles, réservations de vêtements et notifications d'offres",
      "WhatsApp-Katalog, Größenverfügbarkeit, Kleidungsreservierungen und Angebotsbenachrichtigungen",
      "Catalogo WhatsApp, disponibilità taglie, prenotazioni capi e notifiche offerte"
    ),
    category: "basic",
    icon: "tag",
    brandColor: "#9333ea",
    priceMonthly: 49,
    trialDays: 14,
    tags: ["retail", "fashion", "catalog"],
  },
  {
    id: "nail_salon",
    name: t5("Agente de Uñas", "Nail Salon Agent", "Agent Manucure", "Nagelstudio-Agent", "Agente Salone Unghie"),
    description: t5(
      "Reservas de servicios, galería de diseños, precios, recordatorios y programa de puntos",
      "Service bookings, design gallery, pricing, reminders and points program",
      "Réservations de services, galerie de designs, tarifs, rappels et programme de points",
      "Servicebuchungen, Design-Galerie, Preise, Erinnerungen und Punkteprogramm",
      "Prenotazioni servizi, galleria design, prezzi, promemoria e programma punti"
    ),
    category: "basic",
    icon: "star",
    brandColor: "#f472b6",
    priceMonthly: 39,
    trialDays: 14,
    tags: ["nails", "beauty", "appointments"],
  },
  {
    id: "pharmacy_agent",
    name: t5("Agente de Farmacia", "Pharmacy Agent", "Agent Pharmacie", "Apotheken-Agent", "Agente Farmacia"),
    description: t5(
      "Consultas de disponibilidad, recordatorios de medicamentos, encargos y horarios de guardia",
      "Availability queries, medication reminders, orders and on-call schedules",
      "Demandes de disponibilité, rappels de médicaments, commandes et horaires de garde",
      "Verfügbarkeitsanfragen, Medikamentenerinnerungen, Bestellungen und Bereitschaftszeiten",
      "Richieste disponibilità, promemoria farmaci, ordini e orari di turno"
    ),
    category: "basic",
    icon: "pill",
    brandColor: "#16a34a",
    priceMonthly: 49,
    trialDays: 14,
    tags: ["pharmacy", "health", "medications"],
  },

  // ═══════════════════════════════════════════
  // CUSTOM AGENT (1)
  // ═══════════════════════════════════════════
  {
    id: "custom_agent",
    name: t5("Agente Personalizado", "Custom Agent", "Agent Personnalisé", "Benutzerdefinierter Agent", "Agente Personalizzato"),
    description: t5(
      "Diseña tu propio agente IA para cualquier nicho. Configura flujos, personalidad, conocimiento y canales",
      "Design your own AI agent for any niche. Configure flows, personality, knowledge and channels",
      "Concevez votre propre agent IA pour tout créneau. Configurez flux, personnalité, connaissances et canaux",
      "Gestalten Sie Ihren eigenen KI-Agenten für jede Nische. Konfigurieren Sie Abläufe, Persönlichkeit, Wissen und Kanäle",
      "Progetta il tuo agente IA per qualsiasi nicchia. Configura flussi, personalità, conoscenza e canali"
    ),
    category: "custom",
    icon: "sliders",
    brandColor: "#00e5b8",
    priceMonthly: 99,
    trialDays: 14,
    tags: ["custom", "configurable", "any-niche"],
  },
];

export function getAgentById(id: string): AgentCatalogItem | null {
  return AGENT_CATALOG.find((a) => a.id === id) ?? null;
}
