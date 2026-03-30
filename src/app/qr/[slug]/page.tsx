"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Lang = "es" | "en" | "fr" | "de" | "it";
type OrderMode = "dine_in" | "takeaway" | "delivery";

const LANG_FLAGS: Record<Lang, string> = { es: "\u{1F1EA}\u{1F1F8}", en: "\u{1F1EC}\u{1F1E7}", fr: "\u{1F1EB}\u{1F1F7}", de: "\u{1F1E9}\u{1F1EA}", it: "\u{1F1EE}\u{1F1F9}" };
const LANGS: Lang[] = ["es", "en", "fr", "de", "it"];

const UI: Record<Lang, Record<string, string>> = {
  es: {
    loading: "Cargando...",
    not_found: "Restaurante no encontrado",
    select_mode: "¿Cómo quieres pedir?",
    dine_in: "Comer aquí",
    dine_in_desc: "Escanea desde tu mesa",
    takeaway: "Para llevar",
    takeaway_desc: "Recoge tu pedido en el local",
    delivery: "A domicilio",
    delivery_desc: "Te lo llevamos a casa",
    select_table: "Selecciona tu mesa",
    continue: "Continuar",
    your_name: "Tu nombre",
    your_phone: "Tu teléfono",
    your_address: "Dirección de entrega",
    required: "obligatorio",
    closed_now: "Cerrado ahora",
    opens_at: "Abre a las",
  },
  en: {
    loading: "Loading...",
    not_found: "Restaurant not found",
    select_mode: "How would you like to order?",
    dine_in: "Dine in",
    dine_in_desc: "Scan from your table",
    takeaway: "Takeaway",
    takeaway_desc: "Pick up at the restaurant",
    delivery: "Delivery",
    delivery_desc: "We deliver to your door",
    select_table: "Select your table",
    continue: "Continue",
    your_name: "Your name",
    your_phone: "Your phone",
    your_address: "Delivery address",
    required: "required",
    closed_now: "Closed now",
    opens_at: "Opens at",
  },
  fr: {
    loading: "Chargement...",
    not_found: "Restaurant introuvable",
    select_mode: "Comment souhaitez-vous commander ?",
    dine_in: "Sur place",
    dine_in_desc: "Scannez depuis votre table",
    takeaway: "À emporter",
    takeaway_desc: "Récupérez au restaurant",
    delivery: "Livraison",
    delivery_desc: "On vous livre chez vous",
    select_table: "Sélectionnez votre table",
    continue: "Continuer",
    your_name: "Votre nom",
    your_phone: "Votre téléphone",
    your_address: "Adresse de livraison",
    required: "obligatoire",
    closed_now: "Fermé maintenant",
    opens_at: "Ouvre à",
  },
  de: {
    loading: "Laden...",
    not_found: "Restaurant nicht gefunden",
    select_mode: "Wie möchten Sie bestellen?",
    dine_in: "Vor Ort essen",
    dine_in_desc: "Scannen Sie an Ihrem Tisch",
    takeaway: "Zum Mitnehmen",
    takeaway_desc: "Abholung im Restaurant",
    delivery: "Lieferung",
    delivery_desc: "Wir liefern zu Ihnen",
    select_table: "Wählen Sie Ihren Tisch",
    continue: "Weiter",
    your_name: "Ihr Name",
    your_phone: "Ihre Telefonnummer",
    your_address: "Lieferadresse",
    required: "erforderlich",
    closed_now: "Jetzt geschlossen",
    opens_at: "Öffnet um",
  },
  it: {
    loading: "Caricamento...",
    not_found: "Ristorante non trovato",
    select_mode: "Come vuoi ordinare?",
    dine_in: "Mangiare qui",
    dine_in_desc: "Scansiona dal tuo tavolo",
    takeaway: "Da asporto",
    takeaway_desc: "Ritiro al ristorante",
    delivery: "Consegna",
    delivery_desc: "Consegniamo a casa tua",
    select_table: "Seleziona il tuo tavolo",
    continue: "Continua",
    your_name: "Il tuo nome",
    your_phone: "Il tuo telefono",
    your_address: "Indirizzo di consegna",
    required: "obbligatorio",
    closed_now: "Chiuso adesso",
    opens_at: "Apre alle",
  },
};

const MODE_ICONS: Record<OrderMode, string> = {
  dine_in: "\u{1F37D}\u{FE0F}",
  takeaway: "\u{1F6CD}\u{FE0F}",
  delivery: "\u{1F6F5}",
};

interface Tenant {
  name: string;
  slug: string;
  logo_url: string | null;
  business_hours: Record<string, { open: string; close: string; closed: boolean; shifts?: { open: string; close: string }[] }> | null;
}

interface Table {
  number: string;
  label: string | null;
}

export default function QrLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [lang, setLang] = useState<Lang>("es");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<OrderMode | null>(null);
  const [selectedTable, setSelectedTable] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const t = UI[lang];

  // Auto-detect language
  useEffect(() => {
    const bl = navigator.language?.slice(0, 2) as Lang;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (LANGS.includes(bl)) setLang(bl);
  }, []);

  // Load tenant + tables
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/menu?slug=${slug}`);
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const data = await res.json();
      if (!data.tenant) { setNotFound(true); setLoading(false); return; }
      setTenant(data.tenant);
      // Load tables for dine-in selection
      setTables(data.tables || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleContinue = () => {
    if (mode === "dine_in" && selectedTable) {
      router.push(`/qr/${slug}/${selectedTable}`);
    } else if (mode === "takeaway" || mode === "delivery") {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (customerName) params.set("name", customerName);
      if (customerPhone) params.set("phone", customerPhone);
      if (mode === "delivery" && deliveryAddress) params.set("address", deliveryAddress);
      router.push(`/qr/${slug}/order?${params.toString()}`);
    }
  };

  const canContinue =
    (mode === "dine_in" && selectedTable) ||
    (mode === "takeaway" && customerPhone) ||
    (mode === "delivery" && customerPhone && deliveryAddress);

  // Check if currently open
  const isOpen = () => {
    if (!tenant?.business_hours) return true;
    const now = new Date();
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayKey = days[now.getDay()];
    const dayData = tenant.business_hours[dayKey];
    if (!dayData || dayData.closed) return false;

    const nowMin = now.getHours() * 60 + now.getMinutes();
    // Check shifts if available
    const shifts = dayData.shifts || [{ open: dayData.open, close: dayData.close }];
    return shifts.some((s) => {
      const [oh, om] = s.open.split(":").map(Number);
      const [ch, cm] = s.close.split(":").map(Number);
      const openMin = oh * 60 + om;
      let closeMin = ch * 60 + cm;
      if (closeMin <= openMin) closeMin += 24 * 60; // overnight
      return nowMin >= openMin && nowMin < closeMin;
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#999", fontSize: 18 }}>{UI[lang].loading}</p>
      </div>
    );
  }

  if (notFound || !tenant) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#f87171", fontSize: 18 }}>{UI[lang].not_found}</p>
      </div>
    );
  }

  const open = isOpen();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", position: "sticky", top: 0, background: "#0a0a0a", zIndex: 10 }}>
        <div>
          {tenant.logo_url && <img src={tenant.logo_url} alt="" style={{ height: 32, marginBottom: 4, borderRadius: 6 }} />}
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{tenant.name}</h1>
          {!open && (
            <p style={{ color: "#f87171", fontSize: 12, fontWeight: 600, margin: "4px 0 0" }}>{t.closed_now}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? "#f97316" : "#1a1a1a",
                border: lang === l ? "none" : "1px solid #333",
                borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 16, lineHeight: 1,
              }}
            >
              {LANG_FLAGS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Order mode selection */}
      <p style={{ color: "#ccc", fontSize: 16, fontWeight: 600, margin: "20px 0 16px", textAlign: "center" }}>{t.select_mode}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400, margin: "0 auto" }}>
        {(["dine_in", "takeaway", "delivery"] as OrderMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
              background: mode === m ? "rgba(249,115,22,0.15)" : "#111",
              border: mode === m ? "2px solid #f97316" : "1px solid #333",
              borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 32 }}>{MODE_ICONS[m]}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: mode === m ? "#f97316" : "#fff" }}>
                {t[m]}
              </div>
              <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>
                {t[`${m}_desc`]}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Dine-in: table selection */}
      {mode === "dine_in" && (
        <div style={{ maxWidth: 400, margin: "20px auto 0" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
            {t.select_table}
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333",
              borderRadius: 10, color: "#fff", fontSize: 15, outline: "none",
            }}
          >
            <option value="">—</option>
            {tables.map((tb) => (
              <option key={tb.number} value={tb.number}>
                {tb.number}{tb.label ? ` — ${tb.label}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Takeaway / Delivery: customer info */}
      {(mode === "takeaway" || mode === "delivery") && (
        <div style={{ maxWidth: 400, margin: "20px auto 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              {t.your_name}
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              {t.your_phone} <span style={{ color: "#f97316" }}>*</span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {mode === "delivery" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                {t.your_address} <span style={{ color: "#f97316" }}>*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                style={{
                  width: "100%", padding: "12px 14px", background: "#1a1a1a", border: "1px solid #333",
                  borderRadius: 10, color: "#fff", fontSize: 15, outline: "none", resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Continue button */}
      {mode && (
        <div style={{ maxWidth: 400, margin: "24px auto 40px" }}>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            style={{
              width: "100%", padding: "16px", background: canContinue ? "#f97316" : "#333",
              color: canContinue ? "#000" : "#666", border: "none", borderRadius: 12,
              fontSize: 16, fontWeight: 700, cursor: canContinue ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            {t.continue}
          </button>
        </div>
      )}
    </div>
  );
}
