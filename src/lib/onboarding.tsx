"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { createClient } from "@/lib/supabase-browser";
import {
  ChevronRight, ChevronLeft, X, LayoutDashboard, ShoppingCart,
  ChefHat, ClipboardList, UtensilsCrossed, Grid3X3, CreditCard,
  Heart, BarChart3, Calculator, Settings, Rocket, CheckCircle,
} from "lucide-react";
import type { Lang } from "@/lib/translations";

/* ═══════════════════════════════════════════════════════════
   ONBOARDING STEPS — 5 languages
   ═══════════════════════════════════════════════════════════ */

interface OnboardingStep {
  id: string;
  /** Route to navigate to for this step (null = stay on current page) */
  route: string | null;
  icon: typeof LayoutDashboard;
  /** i18n object: { es, en, fr, de, it } */
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  /** Optional: which side to show the tooltip panel */
  position?: "center" | "left" | "right";
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    icon: Rocket,
    position: "center",
    title: {
      es: "Bienvenido a Ordy POS",
      en: "Welcome to Ordy POS",
      fr: "Bienvenue sur Ordy POS",
      de: "Willkommen bei Ordy POS",
      it: "Benvenuto su Ordy POS",
    },
    description: {
      es: "Te guiaremos por las funciones principales de tu sistema POS. Este recorrido dura menos de 2 minutos y puedes repetirlo cuando quieras desde Configuracion.",
      en: "We'll guide you through the main features of your POS system. This tour takes less than 2 minutes and you can replay it anytime from Settings.",
      fr: "Nous allons vous guider a travers les fonctionnalites principales de votre systeme POS. Ce tour dure moins de 2 minutes et vous pouvez le refaire depuis les Parametres.",
      de: "Wir fuhren Sie durch die Hauptfunktionen Ihres POS-Systems. Diese Tour dauert weniger als 2 Minuten und kann jederzeit in den Einstellungen wiederholt werden.",
      it: "Vi guideremo attraverso le funzionalita principali del vostro sistema POS. Questo tour dura meno di 2 minuti e potete ripeterlo in qualsiasi momento dalle Impostazioni.",
    },
  },
  {
    id: "dashboard",
    route: "/dashboard",
    icon: LayoutDashboard,
    title: {
      es: "Dashboard",
      en: "Dashboard",
      fr: "Tableau de bord",
      de: "Dashboard",
      it: "Dashboard",
    },
    description: {
      es: "Aqui ves todo de un vistazo: pedidos de hoy, ventas, ticket medio, mesas ocupadas y pedidos en tiempo real. Es tu centro de control.",
      en: "Here you see everything at a glance: today's orders, revenue, average ticket, occupied tables and real-time orders. It's your control center.",
      fr: "Ici vous voyez tout en un coup d'oeil : commandes du jour, chiffre d'affaires, ticket moyen, tables occupees et commandes en temps reel. C'est votre centre de controle.",
      de: "Hier sehen Sie alles auf einen Blick: Bestellungen des Tages, Umsatz, Durchschnittsbon, besetzte Tische und Echtzeit-Bestellungen. Ihr Kontrollzentrum.",
      it: "Qui vedete tutto in un colpo d'occhio: ordini del giorno, fatturato, scontrino medio, tavoli occupati e ordini in tempo reale. Il vostro centro di controllo.",
    },
  },
  {
    id: "pos",
    route: "/pos",
    icon: ShoppingCart,
    title: {
      es: "Terminal POS",
      en: "POS Terminal",
      fr: "Terminal POS",
      de: "POS-Terminal",
      it: "Terminale POS",
    },
    description: {
      es: "Crea pedidos rapidamente: selecciona productos, elige mesa o tipo de pedido (sala, llevar, delivery), aplica descuentos y cobra en efectivo o tarjeta. Tambien puedes dividir cuentas.",
      en: "Create orders quickly: select products, choose table or order type (dine-in, takeaway, delivery), apply discounts and charge cash or card. You can also split bills.",
      fr: "Creez des commandes rapidement : selectionnez des produits, choisissez une table ou un type de commande (sur place, a emporter, livraison), appliquez des remises et encaissez en especes ou par carte. Vous pouvez aussi diviser l'addition.",
      de: "Erstellen Sie schnell Bestellungen: Produkte wahlen, Tisch oder Bestelltyp wahlen (vor Ort, zum Mitnehmen, Lieferung), Rabatte anwenden und bar oder mit Karte kassieren. Sie konnen auch Rechnungen teilen.",
      it: "Create ordini velocemente: selezionate prodotti, scegliete tavolo o tipo di ordine (sala, asporto, delivery), applicate sconti e incassate in contanti o carta. Potete anche dividere il conto.",
    },
  },
  {
    id: "kds",
    route: "/kds",
    icon: ChefHat,
    title: {
      es: "Cocina (KDS)",
      en: "Kitchen Display (KDS)",
      fr: "Affichage Cuisine (KDS)",
      de: "Kuchenanzeige (KDS)",
      it: "Display Cucina (KDS)",
    },
    description: {
      es: "La pantalla de cocina muestra los pedidos en tiempo real. Los cocineros marcan cada item como preparado y listo. Suena una alerta cuando llega un nuevo pedido.",
      en: "The kitchen display shows orders in real time. Cooks mark each item as preparing and ready. An alert sounds when a new order arrives.",
      fr: "L'ecran cuisine affiche les commandes en temps reel. Les cuisiniers marquent chaque article comme en preparation et pret. Une alerte sonne a l'arrivee d'une nouvelle commande.",
      de: "Das Kuchendisplay zeigt Bestellungen in Echtzeit. Koche markieren jeden Artikel als in Zubereitung und fertig. Ein Alarm ertont bei einer neuen Bestellung.",
      it: "Il display cucina mostra gli ordini in tempo reale. I cuochi segnano ogni articolo come in preparazione e pronto. Un avviso suona quando arriva un nuovo ordine.",
    },
  },
  {
    id: "orders",
    route: "/orders",
    icon: ClipboardList,
    title: {
      es: "Pedidos",
      en: "Orders",
      fr: "Commandes",
      de: "Bestellungen",
      it: "Ordini",
    },
    description: {
      es: "Gestiona todos los pedidos: filtra por estado, fecha o tipo. Puedes modificar items, aplicar descuentos, registrar pagos, hacer reembolsos y ver el historial completo.",
      en: "Manage all orders: filter by status, date or type. You can modify items, apply discounts, record payments, process refunds and view the complete history.",
      fr: "Gerez toutes les commandes : filtrez par statut, date ou type. Vous pouvez modifier les articles, appliquer des remises, enregistrer les paiements, traiter les remboursements et consulter l'historique complet.",
      de: "Verwalten Sie alle Bestellungen: Filtern Sie nach Status, Datum oder Typ. Sie konnen Artikel andern, Rabatte anwenden, Zahlungen erfassen, Erstattungen verarbeiten und den gesamten Verlauf einsehen.",
      it: "Gestite tutti gli ordini: filtrate per stato, data o tipo. Potete modificare articoli, applicare sconti, registrare pagamenti, elaborare rimborsi e consultare lo storico completo.",
    },
  },
  {
    id: "menu",
    route: "/menu",
    icon: UtensilsCrossed,
    title: {
      es: "Menu",
      en: "Menu",
      fr: "Menu",
      de: "Speisekarte",
      it: "Menu",
    },
    description: {
      es: "Configura tu carta: categorias, productos con precios, modificadores (extras, tamaños), alergenos e imagenes. La IA puede traducir tu menu a 5 idiomas y generar fotos profesionales automaticamente.",
      en: "Set up your menu: categories, products with prices, modifiers (extras, sizes), allergens and images. AI can translate your menu to 5 languages and generate professional photos automatically.",
      fr: "Configurez votre carte : categories, produits avec prix, modificateurs (supplements, tailles), allergenes et images. L'IA peut traduire votre menu en 5 langues et generer des photos professionnelles automatiquement.",
      de: "Richten Sie Ihre Speisekarte ein: Kategorien, Produkte mit Preisen, Modifikatoren (Extras, Grossen), Allergene und Bilder. KI kann Ihre Speisekarte in 5 Sprachen ubersetzen und automatisch professionelle Fotos erstellen.",
      it: "Configurate il vostro menu: categorie, prodotti con prezzi, modificatori (extra, dimensioni), allergeni e immagini. L'IA puo tradurre il vostro menu in 5 lingue e generare foto professionali automaticamente.",
    },
  },
  {
    id: "tables",
    route: "/tables",
    icon: Grid3X3,
    title: {
      es: "Mesas",
      en: "Tables",
      fr: "Tables",
      de: "Tische",
      it: "Tavoli",
    },
    description: {
      es: "Organiza tu restaurante en zonas y mesas. Arrastra para posicionar, cambia formas y tamaños. Cada mesa genera un QR unico para que los clientes pidan desde su movil.",
      en: "Organize your restaurant in zones and tables. Drag to position, change shapes and sizes. Each table generates a unique QR code so customers can order from their phone.",
      fr: "Organisez votre restaurant en zones et tables. Faites glisser pour positionner, changez les formes et tailles. Chaque table genere un QR unique pour que les clients commandent depuis leur telephone.",
      de: "Organisieren Sie Ihr Restaurant in Zonen und Tische. Ziehen Sie zum Positionieren, andern Sie Formen und Grossen. Jeder Tisch generiert einen eindeutigen QR-Code, damit Kunden von ihrem Handy bestellen konnen.",
      it: "Organizzate il vostro ristorante in zone e tavoli. Trascinate per posizionare, cambiate forme e dimensioni. Ogni tavolo genera un QR unico per permettere ai clienti di ordinare dal cellulare.",
    },
  },
  {
    id: "payments",
    route: "/payments",
    icon: CreditCard,
    title: {
      es: "Pagos",
      en: "Payments",
      fr: "Paiements",
      de: "Zahlungen",
      it: "Pagamenti",
    },
    description: {
      es: "Registra pagos en efectivo, tarjeta o mixtos. Gestiona turnos de caja con apertura y cierre, controla discrepancias y procesa reembolsos parciales o totales con motivo.",
      en: "Record cash, card or mixed payments. Manage cash shifts with opening and closing, control discrepancies and process partial or full refunds with reason.",
      fr: "Enregistrez les paiements en especes, par carte ou mixtes. Gerez les sessions de caisse avec ouverture et fermeture, controlez les ecarts et traitez les remboursements partiels ou totaux avec motif.",
      de: "Erfassen Sie Bar-, Karten- oder gemischte Zahlungen. Verwalten Sie Kassenschichten mit Eroffnung und Schliessung, kontrollieren Sie Abweichungen und verarbeiten Sie Teil- oder Vollerstattungen mit Begrundung.",
      it: "Registrate pagamenti in contanti, carta o misti. Gestite i turni di cassa con apertura e chiusura, controllate le discrepanze e processate rimborsi parziali o totali con motivazione.",
    },
  },
  {
    id: "loyalty",
    route: "/loyalty",
    icon: Heart,
    title: {
      es: "Fidelizacion",
      en: "Loyalty",
      fr: "Fidelite",
      de: "Treueprogramm",
      it: "Fedelta",
    },
    description: {
      es: "Programa de puntos completo: configura puntos por euro, crea niveles (bronce, plata, oro), define recompensas (descuentos, productos gratis) y lanza campañas de puntos dobles o bonus.",
      en: "Complete loyalty program: set points per euro, create tiers (bronze, silver, gold), define rewards (discounts, free products) and launch double points or bonus campaigns.",
      fr: "Programme de fidelite complet : definissez les points par euro, creez des niveaux (bronze, argent, or), definissez des recompenses (remises, produits gratuits) et lancez des campagnes de points doubles ou bonus.",
      de: "Komplettes Treueprogramm: Punkte pro Euro festlegen, Stufen erstellen (Bronze, Silber, Gold), Belohnungen definieren (Rabatte, Gratisprodukte) und Doppelpunkte- oder Bonus-Kampagnen starten.",
      it: "Programma fedelta completo: impostate punti per euro, create livelli (bronzo, argento, oro), definite premi (sconti, prodotti gratis) e lanciate campagne di punti doppi o bonus.",
    },
  },
  {
    id: "analytics",
    route: "/analytics",
    icon: BarChart3,
    title: {
      es: "Analitica",
      en: "Analytics",
      fr: "Analytique",
      de: "Analytik",
      it: "Analitica",
    },
    description: {
      es: "Visualiza ventas por periodo, metodos de pago, productos mas vendidos, ingresos por hora y deteccion de fraude (cancelaciones, reembolsos sospechosos). Exporta datos a CSV.",
      en: "View revenue by period, payment methods, top-selling products, hourly income and fraud detection (cancellations, suspicious refunds). Export data to CSV.",
      fr: "Visualisez le chiffre d'affaires par periode, methodes de paiement, produits les plus vendus, revenus par heure et detection de fraude (annulations, remboursements suspects). Exportez les donnees en CSV.",
      de: "Sehen Sie Umsatz nach Zeitraum, Zahlungsmethoden, meistverkaufte Produkte, stundliche Einnahmen und Betrugserkennung (Stornierungen, verdachtige Erstattungen). Exportieren Sie Daten als CSV.",
      it: "Visualizzate il fatturato per periodo, metodi di pagamento, prodotti piu venduti, entrate orarie e rilevamento frodi (cancellazioni, rimborsi sospetti). Esportate i dati in CSV.",
    },
  },
  {
    id: "escandallo",
    route: "/escandallo",
    icon: Calculator,
    title: {
      es: "Escandallos",
      en: "Costing",
      fr: "Couts",
      de: "Kalkulation",
      it: "Costi",
    },
    description: {
      es: "Controla el coste real de cada plato: gestiona ingredientes, proveedores, crea recetas tecnicas, calcula food cost y margenes, simula cambios de precio y recibe alertas cuando un plato deja de ser rentable.",
      en: "Control the real cost of each dish: manage ingredients, suppliers, create technical recipes, calculate food cost and margins, simulate price changes and receive alerts when a dish stops being profitable.",
      fr: "Controlez le cout reel de chaque plat : gerez les ingredients, fournisseurs, creez des recettes techniques, calculez le cout des aliments et les marges, simulez les changements de prix et recevez des alertes quand un plat n'est plus rentable.",
      de: "Kontrollieren Sie die realen Kosten jedes Gerichts: Zutaten verwalten, Lieferanten, technische Rezepte erstellen, Wareneinsatz und Margen berechnen, Preisanderungen simulieren und Warnungen erhalten, wenn ein Gericht unrentabel wird.",
      it: "Controllate il costo reale di ogni piatto: gestite ingredienti, fornitori, create ricette tecniche, calcolate food cost e margini, simulate cambiamenti di prezzo e ricevete avvisi quando un piatto non e piu redditizio.",
    },
  },
  {
    id: "settings",
    route: "/settings",
    icon: Settings,
    title: {
      es: "Configuracion",
      en: "Settings",
      fr: "Parametres",
      de: "Einstellungen",
      it: "Impostazioni",
    },
    description: {
      es: "Configura tu restaurante: nombre, moneda, impuestos, horarios, personal y roles, estaciones de cocina, impresora de recibos y notificaciones. Tambien puedes repetir este tour desde aqui.",
      en: "Configure your restaurant: name, currency, taxes, hours, staff and roles, kitchen stations, receipt printer and notifications. You can also replay this tour from here.",
      fr: "Configurez votre restaurant : nom, devise, taxes, horaires, personnel et roles, stations cuisine, imprimante de recus et notifications. Vous pouvez aussi refaire ce tour d'ici.",
      de: "Konfigurieren Sie Ihr Restaurant: Name, Wahrung, Steuern, Offnungszeiten, Personal und Rollen, Kuchenstationen, Bondrucker und Benachrichtigungen. Sie konnen diese Tour auch von hier wiederholen.",
      it: "Configurate il vostro ristorante: nome, valuta, tasse, orari, personale e ruoli, stazioni cucina, stampante scontrini e notifiche. Potete anche ripetere questo tour da qui.",
    },
  },
  {
    id: "qr",
    route: null,
    icon: CheckCircle,
    position: "center",
    title: {
      es: "QR para clientes",
      en: "QR for customers",
      fr: "QR pour clients",
      de: "QR fur Kunden",
      it: "QR per clienti",
    },
    description: {
      es: "Tus clientes escanean el QR de la mesa y pueden ver tu carta en su idioma, pedir y pagar desde su movil. Los pedidos llegan directo a tu cocina en tiempo real.",
      en: "Your customers scan the table QR and can view your menu in their language, order and pay from their phone. Orders arrive directly to your kitchen in real time.",
      fr: "Vos clients scannent le QR de la table et peuvent voir votre menu dans leur langue, commander et payer depuis leur telephone. Les commandes arrivent directement en cuisine en temps reel.",
      de: "Ihre Kunden scannen den Tisch-QR und konnen Ihre Speisekarte in ihrer Sprache sehen, bestellen und von ihrem Handy bezahlen. Bestellungen kommen in Echtzeit direkt in Ihre Kuche.",
      it: "I vostri clienti scansionano il QR del tavolo e possono vedere il menu nella loro lingua, ordinare e pagare dal cellulare. Gli ordini arrivano direttamente in cucina in tempo reale.",
    },
  },
  {
    id: "done",
    route: "/dashboard",
    icon: CheckCircle,
    position: "center",
    title: {
      es: "Listo! Ya conoces Ordy POS",
      en: "Done! You now know Ordy POS",
      fr: "Termine ! Vous connaissez Ordy POS",
      de: "Fertig! Sie kennen jetzt Ordy POS",
      it: "Fatto! Ora conosci Ordy POS",
    },
    description: {
      es: "Empieza creando tu menu, configura tus mesas y haz tu primer pedido. Si necesitas volver a ver este tour, ve a Configuracion. Buena suerte!",
      en: "Start by creating your menu, set up your tables and make your first order. If you need to see this tour again, go to Settings. Good luck!",
      fr: "Commencez par creer votre menu, configurez vos tables et passez votre premiere commande. Pour revoir ce tour, allez dans les Parametres. Bonne chance !",
      de: "Beginnen Sie mit der Erstellung Ihrer Speisekarte, richten Sie Ihre Tische ein und geben Sie Ihre erste Bestellung auf. Um diese Tour erneut zu sehen, gehen Sie zu Einstellungen. Viel Erfolg!",
      it: "Iniziate creando il vostro menu, configurate i tavoli e fate il primo ordine. Se avete bisogno di rivedere questo tour, andate nelle Impostazioni. Buona fortuna!",
    },
  },
];

/* ═══════════════════════════════════════════════════════════
   ONBOARDING CONTEXT
   ═══════════════════════════════════════════════════════════ */

interface OnboardingCtx {
  active: boolean;
  step: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  restart: () => void;
}

const Ctx = createContext<OnboardingCtx>({
  active: false, step: 0, totalSteps: STEPS.length,
  start: () => {}, next: () => {}, prev: () => {}, skip: () => {}, restart: () => {},
});

export function useOnboarding() { return useContext(Ctx); }

const STORAGE_KEY = "ordy-pos-onboarding-done";

/* ═══════════════════════════════════════════════════════════
   ONBOARDING PROVIDER + OVERLAY UI
   ═══════════════════════════════════════════════════════════ */

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useI18n();

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);

  // Check if user has completed onboarding — only show once ever
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) {
      setChecked(true);
      return;
    }
    // Only auto-start for brand new users on their first dashboard visit
    // Check if this user has any orders (existing user = skip tour)
    const checkNewUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setChecked(true); return; }
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true });
        if (count && count > 0) {
          // Existing user with orders — skip tour permanently
          localStorage.setItem(STORAGE_KEY, "auto-skipped");
          setChecked(true);
          return;
        }
      } catch {
        // On error, don't show tour
        localStorage.setItem(STORAGE_KEY, "auto-skipped");
        setChecked(true);
        return;
      }
      // Truly new user, no orders — show tour only on dashboard
      if (pathname === "/dashboard") {
        setTimeout(() => setActive(true), 800);
      }
      setChecked(true);
    };
    checkNewUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  const start = useCallback(() => { setStep(0); setActive(true); }, []);
  const skip = useCallback(() => { setActive(false); markDone(); }, [markDone]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      setActive(false);
      markDone();
      router.push("/dashboard");
      return;
    }
    const nextStep = step + 1;
    const nextRoute = STEPS[nextStep]?.route;
    if (nextRoute && nextRoute !== pathname) {
      router.push(nextRoute);
    }
    setStep(nextStep);
  }, [step, pathname, router, markDone]);

  const prev = useCallback(() => {
    if (step <= 0) return;
    const prevStep = step - 1;
    const prevRoute = STEPS[prevStep]?.route;
    if (prevRoute && prevRoute !== pathname) {
      router.push(prevRoute);
    }
    setStep(prevStep);
  }, [step, pathname, router]);

  const restart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStep(0);
    setActive(true);
    router.push("/dashboard");
  }, [router]);

  const ctx: OnboardingCtx = {
    active, step, totalSteps: STEPS.length,
    start, next, prev, skip, restart,
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {active && checked && <OnboardingOverlay step={step} lang={lang} onNext={next} onPrev={prev} onSkip={skip} />}
    </Ctx.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════
   OVERLAY COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface OverlayProps {
  step: number;
  lang: Lang;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const SKIP_LABELS: Record<Lang, string> = {
  es: "Saltar tour", en: "Skip tour", fr: "Passer le tour",
  de: "Tour uberspringen", it: "Salta il tour",
};
const NEXT_LABELS: Record<Lang, string> = {
  es: "Siguiente", en: "Next", fr: "Suivant", de: "Weiter", it: "Avanti",
};
const PREV_LABELS: Record<Lang, string> = {
  es: "Anterior", en: "Previous", fr: "Precedent", de: "Zuruck", it: "Indietro",
};
const FINISH_LABELS: Record<Lang, string> = {
  es: "Empezar!", en: "Let's go!", fr: "C'est parti !", de: "Los geht's!", it: "Iniziamo!",
};
const STEP_LABELS: Record<Lang, string> = {
  es: "Paso", en: "Step", fr: "Etape", de: "Schritt", it: "Passo",
};

function OnboardingOverlay({ step, lang, onNext, onPrev, onSkip }: OverlayProps) {
  const current = STEPS[step];
  if (!current) return null;

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;
  const position = current.position ?? "right";
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        zIndex: 9998, transition: "opacity 0.3s",
      }} />

      {/* Card */}
      <div style={{
        position: "fixed", zIndex: 9999,
        ...(position === "center" ? {
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        } : position === "left" ? {
          top: "50%", left: 40, transform: "translateY(-50%)",
        } : {
          top: "50%", right: 40, transform: "translateY(-50%)",
        }),
        width: "95vw", maxWidth: 440,
        background: "var(--bg-primary)", borderRadius: 20,
        border: "1px solid var(--border)",
        boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        overflow: "hidden",
        animation: "onb-slide-in 0.35s ease-out",
      }}>
        {/* Progress bar */}
        <div style={{ height: 4, background: "var(--bg-secondary)" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "var(--accent)", transition: "width 0.4s ease",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "var(--accent)1a", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={26} style={{ color: "var(--accent)" }} />
          </div>
          <button onClick={onSkip} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: 4, borderRadius: 8,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            {STEP_LABELS[lang]} {step + 1} / {STEPS.length}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px", lineHeight: 1.3 }}>
            {current.title[lang]}
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
            {current.description[lang]}
          </p>
        </div>

        {/* Actions */}
        <div style={{ padding: "20px 24px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button onClick={onSkip} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "var(--text-muted)", padding: "8px 0",
          }}>
            {SKIP_LABELS[lang]}
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {!isFirst && (
              <button onClick={onPrev} style={{
                background: "var(--bg-secondary)", color: "var(--text-secondary)",
                border: "1px solid var(--border)", borderRadius: 10,
                padding: "10px 16px", fontWeight: 600, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                <ChevronLeft size={16} /> {PREV_LABELS[lang]}
              </button>
            )}

            <button onClick={onNext} style={{
              background: "var(--accent)", color: "#000",
              border: "none", borderRadius: 10,
              padding: "10px 20px", fontWeight: 700, fontSize: 14,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              transition: "transform 0.1s",
            }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {isLast ? FINISH_LABELS[lang] : NEXT_LABELS[lang]}
              {!isLast && <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ padding: "0 24px 16px", display: "flex", justifyContent: "center", gap: 5 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? "var(--accent)" : i < step ? "var(--accent)66" : "var(--border)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes onb-slide-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
