import type { SystemConfig } from "../types";
import { t5 } from "../types";

export const bookingConfig: SystemConfig = {
  name: "BookingPro",
  subtitle: t5("Sistema de Reservas y Citas","Appointment & Booking System","Système de Réservations","Termin- und Buchungssystem","Sistema di Prenotazioni"),
  brandColor: "#0ea5e9",
  icon: "📅",
  modules: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      kpis: [
        { label: t5("Reservas Hoy","Bookings Today","Réservations Aujourd'hui","Buchungen Heute","Prenotazioni Oggi"), value: "34", change: "+8", trend: "up" },
        { label: t5("Revenue Hoy","Revenue Today","Revenus Aujourd'hui","Umsatz Heute","Ricavi Oggi"), value: "$2,890", change: "+15%", trend: "up" },
        { label: t5("Tasa Ocupación","Occupancy Rate","Taux d'Occupation","Auslastungsrate","Tasso Occupazione"), value: "78%", change: "+5%", trend: "up" },
        { label: "No Shows", value: "2", trend: "down" },
      ],
      table: {
        columns: [
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "service", label: t5("Servicio","Service","Service","Dienstleistung","Servizio") },
          { key: "staff", label: t5("Profesional","Professional","Professionnel","Fachkraft","Professionista") },
          { key: "time", label: t5("Hora","Time","Heure","Uhrzeit","Ora") },
          { key: "duration", label: t5("Duración","Duration","Durée","Dauer","Durata") },
          { key: "price", label: t5("Precio","Price","Prix","Preis","Prezzo"), type: "currency" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Confirmada": "green", "Pendiente": "yellow", "En Curso": "blue", "Completada": "gray", "No Show": "red" } },
        ],
        rows: [
          { client: "Laura Martínez", service: "Corte + Color", staff: "Ana P.", time: "10:00 AM", duration: "90 min", price: "$85.00", status: "En Curso" },
          { client: "Carlos Ruiz", service: "Masaje Relajante", staff: "Pedro M.", time: "10:30 AM", duration: "60 min", price: "$65.00", status: "Confirmada" },
          { client: "Sophie Klein", service: "Manicure + Pedicure", staff: "María L.", time: "11:00 AM", duration: "75 min", price: "$55.00", status: "Pendiente" },
          { client: "David Park", service: "Facial Premium", staff: "Ana P.", time: "12:00 PM", duration: "45 min", price: "$95.00", status: "Confirmada" },
          { client: "Emma Wilson", service: "Corte Caballero", staff: "Luis G.", time: "12:30 PM", duration: "30 min", price: "$25.00", status: "Pendiente" },
        ],
        searchPlaceholder: t5("Buscar citas de hoy...","Search today's appointments...","Rechercher les rendez-vous du jour...","Heutige Termine suchen...","Cerca appuntamenti di oggi..."),
      },
    },
    {
      id: "services",
      label: t5("Servicios","Services","Services","Dienstleistungen","Servizi"),
      icon: "star",
      kpis: [
        { label: t5("Servicios Activos","Active Services","Services Actifs","Aktive Dienstleistungen","Servizi Attivi"), value: "24", trend: "neutral" },
        { label: t5("Más Popular","Most Popular","Le Plus Populaire","Am Beliebtesten","Più Popolare"), value: "Corte + Color", trend: "up" },
        { label: t5("Precio Promedio","Average Price","Prix Moyen","Durchschnittspreis","Prezzo Medio"), value: "$62.50", trend: "neutral" },
        { label: t5("Duración Prom.","Avg. Duration","Durée Moy.","Durchschn. Dauer","Durata Media"), value: "55 min", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "service", label: t5("Servicio","Service","Service","Dienstleistung","Servizio"), type: "avatar" },
          { key: "category", label: t5("Categoría","Category","Catégorie","Kategorie","Categoria"), type: "badge", badgeColors: { "Cabello": "purple", "Uñas": "pink", "Facial": "blue", "Cuerpo": "green", "Barba": "orange" } },
          { key: "duration", label: t5("Duración","Duration","Durée","Dauer","Durata") },
          { key: "price", label: t5("Precio","Price","Prix","Preis","Prezzo"), type: "currency" },
          { key: "bookings", label: t5("Reservas (Mes)","Bookings (Month)","Réservations (Mois)","Buchungen (Monat)","Prenotazioni (Mese)") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "Inactivo": "gray", "Nuevo": "blue" } },
        ],
        rows: [
          { service: "Corte + Color", category: "Cabello", duration: "90 min", price: "$85.00", bookings: "156", status: "Activo" },
          { service: "Masaje Relajante", category: "Cuerpo", duration: "60 min", price: "$65.00", bookings: "98", status: "Activo" },
          { service: "Manicure + Pedicure", category: "Uñas", duration: "75 min", price: "$55.00", bookings: "134", status: "Activo" },
          { service: "Facial Premium", category: "Facial", duration: "45 min", price: "$95.00", bookings: "67", status: "Activo" },
          { service: "Corte Caballero", category: "Cabello", duration: "30 min", price: "$25.00", bookings: "189", status: "Activo" },
          { service: "Barba Completa", category: "Barba", duration: "20 min", price: "$15.00", bookings: "145", status: "Activo" },
        ],
        searchPlaceholder: t5("Buscar servicios...","Search services...","Rechercher des services...","Dienstleistungen suchen...","Cerca servizi..."),
      },
      modal: {
        title: t5("Nuevo Servicio","New Service","Nouveau Service","Neue Dienstleistung","Nuovo Servizio"),
        fields: [
          { name: "service", label: t5("Nombre del Servicio","Service Name","Nom du Service","Dienstleistungsname","Nome del Servizio"), type: "text", required: true, placeholder: t5("Ej: Tratamiento Capilar","E.g.: Hair Treatment","Ex : Soin Capillaire","Z.B.: Haarbehandlung","Es.: Trattamento Capillare") },
          { name: "category", label: t5("Categoría","Category","Catégorie","Kategorie","Categoria"), type: "select", required: true, options: [
            { value: "Cabello", label: t5("Cabello","Hair","Cheveux","Haar","Capelli") }, { value: "Uñas", label: t5("Uñas","Nails","Ongles","Nägel","Unghie") },
            { value: "Facial", label: "Facial" }, { value: "Cuerpo", label: t5("Cuerpo","Body","Corps","Körper","Corpo") }, { value: "Barba", label: t5("Barba","Beard","Barbe","Bart","Barba") },
          ]},
          { name: "duration", label: t5("Duración (minutos)","Duration (minutes)","Durée (minutes)","Dauer (Minuten)","Durata (minuti)"), type: "number", required: true, placeholder: "60" },
          { name: "price", label: t5("Precio ($)","Price ($)","Prix ($)","Preis ($)","Prezzo ($)"), type: "number", required: true, placeholder: "0.00" },
          { name: "description", label: t5("Descripción","Description","Description","Beschreibung","Descrizione"), type: "textarea", placeholder: t5("Qué incluye el servicio...","What the service includes...","Ce que comprend le service...","Was die Dienstleistung beinhaltet...","Cosa include il servizio...") },
        ],
      },
    },
    {
      id: "calendar",
      label: t5("Agenda","Calendar","Agenda","Kalender","Agenda"),
      icon: "calendar",
      kpis: [
        { label: t5("Citas Hoy","Appointments Today","Rendez-vous Aujourd'hui","Termine Heute","Appuntamenti Oggi"), value: "34", trend: "neutral" },
        { label: t5("Disponibilidad","Availability","Disponibilité","Verfügbarkeit","Disponibilità"), value: "22%", trend: "neutral" },
        { label: t5("Próxima Libre","Next Available","Prochain Libre","Nächster Frei","Prossimo Libero"), value: "2:30 PM", trend: "neutral" },
        { label: t5("Horas Ocupadas","Busy Hours","Heures Occupées","Belegte Stunden","Ore Occupate"), value: "6.5h", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "time", label: t5("Hora","Time","Heure","Uhrzeit","Ora") },
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "service", label: t5("Servicio","Service","Service","Dienstleistung","Servizio") },
          { key: "staff", label: t5("Profesional","Professional","Professionnel","Fachkraft","Professionista") },
          { key: "duration", label: t5("Duración","Duration","Durée","Dauer","Durata") },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Confirmada": "green", "Pendiente": "yellow", "En Curso": "blue", "Completada": "gray", "Libre": "green" } },
        ],
        rows: [
          { time: "09:00 AM", client: "— Libre —", service: "—", staff: "Todos", duration: "—", status: "Libre" },
          { time: "10:00 AM", client: "Laura Martínez", service: "Corte + Color", staff: "Ana P.", duration: "90 min", status: "En Curso" },
          { time: "10:30 AM", client: "Carlos Ruiz", service: "Masaje Relajante", staff: "Pedro M.", duration: "60 min", status: "Confirmada" },
          { time: "11:00 AM", client: "Sophie Klein", service: "Manicure + Pedicure", staff: "María L.", duration: "75 min", status: "Pendiente" },
          { time: "12:00 PM", client: "David Park", service: "Facial Premium", staff: "Ana P.", duration: "45 min", status: "Confirmada" },
          { time: "12:30 PM", client: "Emma Wilson", service: "Corte Caballero", staff: "Luis G.", duration: "30 min", status: "Pendiente" },
          { time: "01:00 PM", client: "— Almuerzo —", service: "—", staff: "Todos", duration: "60 min", status: "Completada" },
          { time: "02:00 PM", client: "Ana López", service: "Corte + Mechas", staff: "Ana P.", duration: "120 min", status: "Confirmada" },
        ],
        searchPlaceholder: t5("Buscar en agenda...","Search calendar...","Rechercher dans l'agenda...","Im Kalender suchen...","Cerca in agenda..."),
      },
      modal: {
        title: t5("Nueva Cita","New Appointment","Nouveau Rendez-vous","Neuer Termin","Nuovo Appuntamento"),
        fields: [
          { name: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "text", required: true, placeholder: t5("Nombre del cliente","Client name","Nom du client","Name des Kunden","Nome del cliente") },
          { name: "service", label: t5("Servicio","Service","Service","Dienstleistung","Servizio"), type: "select", required: true, options: [
            { value: "Corte + Color", label: "Corte + Color (90 min — $85)" },
            { value: "Masaje Relajante", label: "Masaje Relajante (60 min — $65)" },
            { value: "Manicure + Pedicure", label: "Manicure + Pedicure (75 min — $55)" },
            { value: "Facial Premium", label: "Facial Premium (45 min — $95)" },
            { value: "Corte Caballero", label: "Corte Caballero (30 min — $25)" },
          ]},
          { name: "staff", label: t5("Profesional","Professional","Professionnel","Fachkraft","Professionista"), type: "select", required: true, options: [
            { value: "Ana P.", label: t5("Ana P. (Estilista)","Ana P. (Stylist)","Ana P. (Styliste)","Ana P. (Stylistin)","Ana P. (Stilista)") }, { value: "Pedro M.", label: t5("Pedro M. (Masajista)","Pedro M. (Masseuse)","Pedro M. (Masseur)","Pedro M. (Masseur)","Pedro M. (Massaggiatore)") },
            { value: "María L.", label: t5("María L. (Manicurista)","María L. (Manicurist)","María L. (Manucure)","María L. (Maniküristin)","María L. (Manicurista)") }, { value: "Luis G.", label: t5("Luis G. (Barbero)","Luis G. (Barber)","Luis G. (Barbier)","Luis G. (Friseur)","Luis G. (Barbiere)") },
          ]},
          { name: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date", required: true },
          { name: "time", label: t5("Hora","Time","Heure","Uhrzeit","Ora"), type: "time", required: true },
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel", placeholder: "+34 600-000-000" },
          { name: "reminder", label: t5("Enviar recordatorio SMS","Send SMS reminder","Envoyer rappel SMS","SMS-Erinnerung senden","Invia promemoria SMS"), type: "checkbox" },
          { name: "notes", label: t5("Notas","Notes","Notes","Notizen","Note"), type: "textarea", placeholder: t5("Preferencias, alergias...","Preferences, allergies...","Préférences, allergies...","Vorlieben, Allergien...","Preferenze, allergie...") },
        ],
      },
    },
    {
      id: "staff",
      label: t5("Equipo","Team","Équipe","Team","Team"),
      icon: "users",
      kpis: [
        { label: t5("Profesionales","Professionals","Professionnels","Fachkräfte","Professionisti"), value: "8", trend: "neutral" },
        { label: t5("Trabajando Hoy","Working Today","Travaillent Aujourd'hui","Heute Arbeitend","Al Lavoro Oggi"), value: "6", trend: "neutral" },
        { label: t5("Citas/Prof. (Prom)","Appts/Staff (Avg)","RDV/Prof. (Moy)","Termine/Mitarb. (Durchschn.)","App/Prof. (Media)"), value: "5.7", trend: "neutral" },
        { label: t5("Rating Promedio","Average Rating","Note Moyenne","Durchschnittsbewertung","Valutazione Media"), value: "4.8 ★", trend: "up" },
      ],
      table: {
        columns: [
          { key: "name", label: t5("Nombre","Name","Nom","Name","Nome"), type: "avatar" },
          { key: "role", label: t5("Rol","Role","Rôle","Rolle","Ruolo") },
          { key: "services", label: t5("Servicios","Services","Services","Dienstleistungen","Servizi") },
          { key: "todayAppts", label: t5("Citas Hoy","Appts Today","RDV Aujourd'hui","Termine Heute","App. Oggi") },
          { key: "rating", label: "Rating" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Disponible": "green", "Ocupado": "orange", "Libre Hoy": "gray", "Vacaciones": "blue" } },
        ],
        rows: [
          { name: "Ana Pérez", role: "Estilista Senior", services: "Corte, Color, Mechas", todayAppts: "7", rating: "4.9 ★", status: "Ocupado" },
          { name: "Pedro Martín", role: "Masajista", services: "Masaje, Reflexología", todayAppts: "5", rating: "4.8 ★", status: "Disponible" },
          { name: "María López", role: "Manicurista", services: "Manicure, Pedicure, Uñas Gel", todayAppts: "6", rating: "4.7 ★", status: "Ocupado" },
          { name: "Luis García", role: "Barbero", services: "Corte, Barba, Afeitado", todayAppts: "8", rating: "4.9 ★", status: "Ocupado" },
          { name: "Carmen Ruiz", role: "Esteticista", services: "Facial, Depilación, Tratamientos", todayAppts: "4", rating: "4.6 ★", status: "Disponible" },
          { name: "Roberto Díaz", role: "Estilista Junior", services: "Corte, Lavado, Peinado", todayAppts: "0", rating: "4.5 ★", status: "Libre Hoy" },
        ],
        searchPlaceholder: t5("Buscar profesionales...","Search professionals...","Rechercher des professionnels...","Fachkräfte suchen...","Cerca professionisti..."),
      },
      modal: {
        title: t5("Nuevo Profesional","New Professional","Nouveau Professionnel","Neue Fachkraft","Nuovo Professionista"),
        fields: [
          { name: "name", label: t5("Nombre Completo","Full Name","Nom Complet","Vollständiger Name","Nome Completo"), type: "text", required: true },
          { name: "role", label: t5("Rol","Role","Rôle","Rolle","Ruolo"), type: "select", required: true, options: [
            { value: "Estilista", label: t5("Estilista","Stylist","Styliste","Stylist","Stilista") }, { value: "Masajista", label: t5("Masajista","Masseuse","Masseur","Masseur","Massaggiatore") },
            { value: "Manicurista", label: t5("Manicurista","Manicurist","Manucure","Manikürist","Manicurista") }, { value: "Barbero", label: t5("Barbero","Barber","Barbier","Friseur","Barbiere") }, { value: "Esteticista", label: t5("Esteticista","Esthetician","Esthéticienne","Kosmetikerin","Estetista") },
          ]},
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), type: "tel" },
          { name: "services", label: t5("Servicios que ofrece","Services offered","Services proposés","Angebotene Dienstleistungen","Servizi offerti"), type: "textarea", placeholder: t5("Ej: Corte, Color, Mechas","E.g.: Cut, Color, Highlights","Ex : Coupe, Couleur, Mèches","Z.B.: Schnitt, Farbe, Strähnchen","Es.: Taglio, Colore, Meches") },
        ],
      },
    },
    {
      id: "bookings",
      label: t5("Reservas","Bookings","Réservations","Buchungen","Prenotazioni"),
      icon: "clipboard",
      kpis: [
        { label: t5("Este Mes","This Month","Ce Mois","Diesen Monat","Questo Mese"), value: "456", change: "+12%", trend: "up" },
        { label: "Online", value: "67%", change: "+8%", trend: "up" },
        { label: t5("Cancelaciones","Cancellations","Annulations","Stornierungen","Cancellazioni"), value: "4.2%", trend: "down" },
        { label: t5("Revenue (Mes)","Revenue (Month)","Revenus (Mois)","Umsatz (Monat)","Ricavi (Mese)"), value: "$28,500", change: "+18%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "service", label: t5("Servicio","Service","Service","Dienstleistung","Servizio") },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
          { key: "time", label: t5("Hora","Time","Heure","Uhrzeit","Ora") },
          { key: "staff", label: t5("Profesional","Professional","Professionnel","Fachkraft","Professionista") },
          { key: "price", label: t5("Precio","Price","Prix","Preis","Prezzo"), type: "currency" },
          { key: "source", label: t5("Origen","Source","Origine","Herkunft","Origine"), type: "badge", badgeColors: { "Online": "blue", "Teléfono": "green", "Walk-in": "gray", "App": "purple" } },
        ],
        rows: [
          { client: "Laura Martínez", service: "Corte + Color", date: "Mar 7, 2026", time: "10:00 AM", staff: "Ana P.", price: "$85.00", source: "Online" },
          { client: "Carlos Ruiz", service: "Masaje", date: "Mar 7, 2026", time: "10:30 AM", staff: "Pedro M.", price: "$65.00", source: "App" },
          { client: "Sophie Klein", service: "Manicure", date: "Mar 7, 2026", time: "11:00 AM", staff: "María L.", price: "$55.00", source: "Teléfono" },
          { client: "David Park", service: "Facial", date: "Mar 8, 2026", time: "10:00 AM", staff: "Carmen R.", price: "$95.00", source: "Online" },
          { client: "Emma Wilson", service: "Corte", date: "Mar 8, 2026", time: "11:00 AM", staff: "Luis G.", price: "$25.00", source: "Walk-in" },
        ],
        searchPlaceholder: t5("Buscar reservas...","Search bookings...","Rechercher des réservations...","Buchungen suchen...","Cerca prenotazioni..."),
      },
      tabs: [
        { id: "all", label: t5("Todas","All","Toutes","Alle","Tutte"), filterField: "6", filterValue: "all" },
        { id: "online", label: "Online", filterField: "6", filterValue: "Online" },
        { id: "phone", label: t5("Teléfono","Phone","Téléphone","Telefon","Telefono"), filterField: "6", filterValue: "Teléfono" },
        { id: "walkin", label: "Walk-in", filterField: "6", filterValue: "Walk-in" },
      ],
    },
    {
      id: "payments",
      label: t5("Pagos","Payments","Paiements","Zahlungen","Pagamenti"),
      icon: "dollar",
      kpis: [
        { label: t5("Revenue (Mes)","Revenue (Month)","Revenus (Mois)","Umsatz (Monat)","Ricavi (Mese)"), value: "$28,500", change: "+18%", trend: "up" },
        { label: t5("Pagos Hoy","Payments Today","Paiements Aujourd'hui","Zahlungen Heute","Pagamenti Oggi"), value: "$2,890", trend: "neutral" },
        { label: t5("Pendientes","Pending","En Attente","Ausstehend","In Sospeso"), value: "$450", trend: "neutral" },
        { label: t5("Propinas","Tips","Pourboires","Trinkgelder","Mance"), value: "$1,230", change: "+22%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "client", label: t5("Cliente","Client","Client","Kunde","Cliente"), type: "avatar" },
          { key: "service", label: t5("Servicio","Service","Service","Dienstleistung","Servizio") },
          { key: "amount", label: t5("Monto","Amount","Montant","Betrag","Importo"), type: "currency" },
          { key: "tip", label: t5("Propina","Tip","Pourboire","Trinkgeld","Mancia"), type: "currency" },
          { key: "method", label: t5("Método","Method","Méthode","Methode","Metodo"), type: "badge", badgeColors: { "Tarjeta": "purple", "Efectivo": "green", "Transferencia": "blue" } },
          { key: "date", label: t5("Fecha","Date","Date","Datum","Data"), type: "date" },
          { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Cobrado": "green", "Pendiente": "yellow", "Reembolso": "red" } },
        ],
        rows: [
          { client: "Laura Martínez", service: "Corte + Color", amount: "$85.00", tip: "$12.00", method: "Tarjeta", date: "Mar 7, 2026", status: "Cobrado" },
          { client: "Carlos Ruiz", service: "Masaje", amount: "$65.00", tip: "$10.00", method: "Efectivo", date: "Mar 7, 2026", status: "Cobrado" },
          { client: "Sophie Klein", service: "Manicure", amount: "$55.00", tip: "$0.00", method: "Tarjeta", date: "Mar 7, 2026", status: "Pendiente" },
          { client: "Marco Rossi", service: "Facial", amount: "$95.00", tip: "$15.00", method: "Transferencia", date: "Mar 6, 2026", status: "Cobrado" },
        ],
        searchPlaceholder: t5("Buscar pagos...","Search payments...","Rechercher des paiements...","Zahlungen suchen...","Cerca pagamenti..."),
      },
    },
  ],
  superAdmin: {
    modules: [
      {
        id: "tenants",
        label: t5("Negocios","Businesses","Entreprises","Unternehmen","Attività"),
        icon: "building",
        kpis: [
          { label: t5("Total Negocios","Total Businesses","Total Entreprises","Unternehmen Gesamt","Attività Totali"), value: "56", change: "+6", trend: "up" },
          { label: "MRR", value: "$3,304", change: "+14%", trend: "up" },
          { label: t5("Reservas/Día","Bookings/Day","Réservations/Jour","Buchungen/Tag","Prenotazioni/Giorno"), value: "890", trend: "neutral" },
          { label: "Churn", value: "2.1%", trend: "up" },
        ],
        table: {
          columns: [
            { key: "business", label: t5("Negocio","Business","Entreprise","Unternehmen","Attività"), type: "avatar" },
            { key: "type", label: t5("Tipo","Type","Type","Typ","Tipo") },
            { key: "plan", label: t5("Plan","Plan","Plan","Plan","Piano"), type: "badge", badgeColors: { "Pro": "purple", "Basic": "blue", "Enterprise": "green" } },
            { key: "mrr", label: "MRR", type: "currency" },
            { key: "status", label: t5("Estado","Status","Statut","Status","Stato"), type: "badge", badgeColors: { "Activo": "green", "Trial": "yellow" } },
          ],
          rows: [
            { business: "Glamour Studio", type: "Salón de Belleza", plan: "Pro", mrr: "$59/mo", status: "Activo" },
            { business: "ZenSpa", type: "Spa & Wellness", plan: "Enterprise", mrr: "$99/mo", status: "Activo" },
            { business: "BarberKing", type: "Barbería", plan: "Basic", mrr: "$29/mo", status: "Activo" },
            { business: "NailArt Pro", type: "Uñas", plan: "Pro", mrr: "$59/mo", status: "Trial" },
          ],
          searchPlaceholder: t5("Buscar negocios...","Search businesses...","Rechercher des entreprises...","Unternehmen suchen...","Cerca attività..."),
        },
        modal: {
          title: t5("Nuevo Negocio","New Business","Nouvelle Entreprise","Neues Unternehmen","Nuova Attività"),
          fields: [
            { name: "business", label: t5("Nombre","Name","Nom","Name","Nome"), type: "text", required: true },
            { name: "type", label: t5("Tipo de Negocio","Business Type","Type d'Entreprise","Unternehmenstyp","Tipo di Attività"), type: "select", required: true, options: [
              { value: "salon", label: t5("Salón de Belleza","Beauty Salon","Salon de Beauté","Schönheitssalon","Salone di Bellezza") }, { value: "spa", label: "Spa & Wellness" },
              { value: "barberia", label: t5("Barbería","Barbershop","Barbier","Barbershop","Barberia") }, { value: "uñas", label: t5("Centro de Uñas","Nail Center","Centre d'Ongles","Nagelstudio","Centro Unghie") },
              { value: "otro", label: t5("Otro","Other","Autre","Andere","Altro") },
            ]},
            { name: "email", label: "Email Admin", type: "email", required: true },
            { name: "plan", label: t5("Plan","Plan","Plan","Plan","Piano"), type: "select", required: true, options: [
              { value: "Basic", label: "Basic — $29/mo" }, { value: "Pro", label: "Pro — $59/mo" }, { value: "Enterprise", label: "Enterprise — $99/mo" },
            ]},
          ],
        },
      },
    ],
  },
};
