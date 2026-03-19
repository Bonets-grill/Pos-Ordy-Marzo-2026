"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

/* ── Types ─────────────────────────────────── */
type Lang = "es" | "en" | "fr" | "de" | "it";

interface Tenant {
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  locale: string;
  tax_rate: number;
  tax_included: boolean;
}

interface TableInfo { id: string; number: string; label: string | null; }

interface Category {
  id: string;
  name_es: string; name_en: string; name_fr: string; name_de: string; name_it: string;
  icon: string | null; color: string | null; sort_order: number;
}

interface MenuItem {
  id: string; category_id: string | null;
  name_es: string; name_en: string; name_fr: string; name_de: string; name_it: string;
  description_es: string | null; description_en: string | null;
  description_fr: string | null; description_de: string | null; description_it: string | null;
  price: number; image_url: string | null; allergens: string[];
  prep_time_minutes: number | null; sort_order: number;
}

interface ModGroup {
  id: string; name_es: string; name_en: string; name_fr?: string; name_de?: string; name_it?: string;
  min_select: number; max_select: number; required: boolean;
}

interface Modifier {
  id: string; group_id: string; name_es: string; name_en: string; name_fr?: string; name_de?: string; name_it?: string; price_delta: number;
}

interface CartItem {
  menuItem: MenuItem;
  qty: number;
  selectedModifiers: Modifier[];
  notes: string;
}

/* ── i18n ─────────────────────────────────── */
const UI: Record<Lang, Record<string, string>> = {
  es: {
    menu: "Menu", cart: "Mi Pedido", empty_cart: "Tu pedido esta vacio",
    add: "Agregar", total: "Total", send: "Enviar Pedido", sending: "Enviando...",
    order_sent: "Pedido enviado!", order_number: "Pedido #",
    order_status: "Estado del pedido", close: "Cerrar", notes: "Notas especiales",
    your_table: "Mesa", allergies: "Alergenos", select_lang: "Idioma",
    required: "Obligatorio", optional: "Opcional", remove: "Quitar",
    preparing: "En preparacion", ready: "Listo!", confirmed: "Confirmado",
    open: "Recibido", served: "Servido", loading: "Cargando menu...",
    error: "Error al cargar", retry: "Reintentar", no_items: "Sin productos disponibles",
    name: "Tu nombre (opcional)", order_notes: "Notas del pedido",
    back_to_menu: "Volver al menu", view_order: "Ver pedido",
    items: "productos", choose: "Elige", up_to: "hasta",
  },
  en: {
    menu: "Menu", cart: "My Order", empty_cart: "Your order is empty",
    add: "Add", total: "Total", send: "Send Order", sending: "Sending...",
    order_sent: "Order sent!", order_number: "Order #",
    order_status: "Order Status", close: "Close", notes: "Special notes",
    your_table: "Table", allergies: "Allergens", select_lang: "Language",
    required: "Required", optional: "Optional", remove: "Remove",
    preparing: "Preparing", ready: "Ready!", confirmed: "Confirmed",
    open: "Received", served: "Served", loading: "Loading menu...",
    error: "Error loading", retry: "Retry", no_items: "No items available",
    name: "Your name (optional)", order_notes: "Order notes",
    back_to_menu: "Back to menu", view_order: "View order",
    items: "items", choose: "Choose", up_to: "up to",
  },
  fr: {
    menu: "Menu", cart: "Ma Commande", empty_cart: "Votre commande est vide",
    add: "Ajouter", total: "Total", send: "Envoyer", sending: "Envoi...",
    order_sent: "Commande envoyee!", order_number: "Commande #",
    order_status: "Statut", close: "Fermer", notes: "Notes speciales",
    your_table: "Table", allergies: "Allergenes", select_lang: "Langue",
    required: "Obligatoire", optional: "Optionnel", remove: "Retirer",
    preparing: "En preparation", ready: "Pret!", confirmed: "Confirme",
    open: "Recu", served: "Servi", loading: "Chargement...",
    error: "Erreur", retry: "Reessayer", no_items: "Aucun produit",
    name: "Votre nom (optionnel)", order_notes: "Notes",
    back_to_menu: "Retour au menu", view_order: "Voir commande",
    items: "produits", choose: "Choisissez", up_to: "jusqu'a",
  },
  de: {
    menu: "Speisekarte", cart: "Meine Bestellung", empty_cart: "Ihre Bestellung ist leer",
    add: "Hinzufugen", total: "Gesamt", send: "Bestellen", sending: "Senden...",
    order_sent: "Bestellung gesendet!", order_number: "Bestellung #",
    order_status: "Bestellstatus", close: "Schliessen", notes: "Besondere Hinweise",
    your_table: "Tisch", allergies: "Allergene", select_lang: "Sprache",
    required: "Pflicht", optional: "Optional", remove: "Entfernen",
    preparing: "In Zubereitung", ready: "Fertig!", confirmed: "Bestatigt",
    open: "Empfangen", served: "Serviert", loading: "Laden...",
    error: "Fehler", retry: "Erneut versuchen", no_items: "Keine Produkte",
    name: "Ihr Name (optional)", order_notes: "Notizen",
    back_to_menu: "Zuruck zum Menu", view_order: "Bestellung ansehen",
    items: "Produkte", choose: "Wahlen Sie", up_to: "bis zu",
  },
  it: {
    menu: "Menu", cart: "Il Mio Ordine", empty_cart: "Il tuo ordine e vuoto",
    add: "Aggiungi", total: "Totale", send: "Invia Ordine", sending: "Invio...",
    order_sent: "Ordine inviato!", order_number: "Ordine #",
    order_status: "Stato dell'ordine", close: "Chiudi", notes: "Note speciali",
    your_table: "Tavolo", allergies: "Allergeni", select_lang: "Lingua",
    required: "Obbligatorio", optional: "Opzionale", remove: "Rimuovere",
    preparing: "In preparazione", ready: "Pronto!", confirmed: "Confermato",
    open: "Ricevuto", served: "Servito", loading: "Caricamento...",
    error: "Errore", retry: "Riprova", no_items: "Nessun prodotto",
    name: "Il tuo nome (opzionale)", order_notes: "Note",
    back_to_menu: "Torna al menu", view_order: "Vedi ordine",
    items: "prodotti", choose: "Scegli", up_to: "fino a",
  },
};

const LANG_FLAGS: Record<Lang, string> = { es: "🇪🇸", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", it: "🇮🇹" };
const LANGS: Lang[] = ["es", "en", "fr", "de", "it"];

function localName(item: { name_es: string; name_en: string; name_fr?: string; name_de?: string; name_it?: string }, lang: Lang): string {
  const key = `name_${lang}` as keyof typeof item;
  return (item[key] as string) || item.name_es || item.name_en;
}

function localDesc(item: { description_es?: string | null; description_en?: string | null; description_fr?: string | null; description_de?: string | null; description_it?: string | null }, lang: Lang): string {
  const key = `description_${lang}` as keyof typeof item;
  return (item[key] as string) || item.description_es || item.description_en || "";
}

function tenantName(item: { name_es: string; name_en: string }, tenantLang: Lang): string {
  const key = `name_${tenantLang}` as keyof typeof item;
  return (item[key] as string) || item.name_es || item.name_en;
}

function fmtPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

/* ── Ad Banner ─────────────────────────────── */

interface AdBanner {
  id: string;
  image_url: string;
  link_url?: string;
  alt: string;
}

function AdBannerSlot({ ads, position }: { ads: AdBanner[]; position: "top" | "mid" | "bottom" }) {
  const [currentAd, setCurrentAd] = useState(0);
  const positionAds = ads.length > 0 ? ads : [];

  useEffect(() => {
    if (positionAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % positionAds.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [positionAds.length]);

  if (positionAds.length === 0) return null;
  const ad = positionAds[currentAd];

  const content = (
    <div style={{
      margin: position === "top" ? "0 0 8px" : "16px 0",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #222",
      position: "relative" as const,
    }}>
      <img
        src={ad.image_url}
        alt={ad.alt}
        style={{ width: "100%", height: "auto", display: "block", maxHeight: 120, objectFit: "cover" }}
      />
      <span style={{
        position: "absolute" as const, top: 4, right: 6,
        background: "rgba(0,0,0,0.6)", color: "#888",
        fontSize: 9, padding: "1px 5px", borderRadius: 4,
      }}>
        ad
      </span>
    </div>
  );

  if (ad.link_url) {
    return <a href={ad.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{content}</a>;
  }
  return content;
}

/* ── Component ─────────────────────────────── */

export default function QRMenuPage() {
  const params = useParams();
  const slug = params.slug as string;
  const tableNumber = (params.table as string) || "";

  // Detect takeaway/delivery mode from URL search params
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const orderMode = searchParams?.get("mode") as "takeaway" | "delivery" | null;
  const initialName = searchParams?.get("name") || "";
  const initialPhone = searchParams?.get("phone") || "";
  const initialAddress = searchParams?.get("address") || "";
  const isOffPremise = orderMode === "takeaway" || orderMode === "delivery";

  // State
  const [lang, setLang] = useState<Lang>("es");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [modGroups, setModGroups] = useState<ModGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [itemModLinks, setItemModLinks] = useState<{ item_id: string; group_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ads, setAds] = useState<AdBanner[]>([]);

  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState(initialName);
  const [orderNotes, setOrderNotes] = useState("");
  const [sending, setSending] = useState(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  // Detail modal
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailMods, setDetailMods] = useState<Record<string, string[]>>({});
  const [detailQty, setDetailQty] = useState(1);
  const [detailNotes, setDetailNotes] = useState("");

  const t = UI[lang];

  // Auto-detect language from browser
  useEffect(() => {
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    if (LANGS.includes(browserLang as Lang)) setLang(browserLang as Lang);
  }, []);

  // Load menu
  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/menu?slug=${slug}${tableNumber ? `&table=${tableNumber}` : ""}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setTenant(data.tenant);
      setTable(data.table);
      setCategories(data.categories);
      setItems(data.items);
      setModGroups(data.modifierGroups);
      setModifiers(data.modifiers);
      setItemModLinks(data.itemModLinks);
      if (data.ads) setAds(data.ads);
    } catch {
      setError("Restaurant not found");
    } finally {
      setLoading(false);
    }
  }, [slug, tableNumber]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // Poll order status
  useEffect(() => {
    if (!orderId) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/order?orderId=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrderStatus(data.order.status);
          if (["served", "closed", "cancelled"].includes(data.order.status)) {
            clearInterval(poll);
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [orderId]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (selectedCat === "all") return items;
    return items.filter((i) => i.category_id === selectedCat);
  }, [items, selectedCat]);

  // Cart helpers
  const cartTotal = useMemo(() =>
    cart.reduce((sum, c) => {
      const modTotal = c.selectedModifiers.reduce((s, m) => s + m.price_delta, 0);
      return sum + (c.menuItem.price + modTotal) * c.qty;
    }, 0),
    [cart]
  );

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);

  // Open item detail
  const openDetail = (item: MenuItem) => {
    setDetailItem(item);
    setDetailQty(1);
    setDetailNotes("");
    setDetailMods({});
  };

  // Get modifier groups for an item
  const getItemGroups = (itemId: string) => {
    const groupIds = itemModLinks.filter((l) => l.item_id === itemId).map((l) => l.group_id);
    return modGroups.filter((g) => groupIds.includes(g.id));
  };

  // Toggle modifier selection
  const toggleMod = (groupId: string, modId: string, maxSelect: number) => {
    setDetailMods((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(modId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [modId] };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, modId] };
    });
  };

  // Add to cart
  const addToCart = () => {
    if (!detailItem) return;
    const selectedMods: Modifier[] = [];
    Object.values(detailMods).forEach((ids) => {
      ids.forEach((id) => {
        const mod = modifiers.find((m) => m.id === id);
        if (mod) selectedMods.push(mod);
      });
    });

    setCart((prev) => [...prev, {
      menuItem: detailItem,
      qty: detailQty,
      selectedModifiers: selectedMods,
      notes: detailNotes,
    }]);
    setDetailItem(null);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Send order
  const sendOrder = async () => {
    if (!tenant || cart.length === 0) return;
    setSending(true);
    try {
      const tenantLang = (tenant.locale || "es") as Lang;
      const orderItems = cart.map((c) => ({
        menu_item_id: c.menuItem.id,
        quantity: c.qty,
        modifier_ids: c.selectedModifiers.map((m) => m.id),
        modifiers: c.selectedModifiers.map((m) => ({
          name: tenantName(m, tenantLang), // TENANT language for KDS
          price_delta: m.price_delta,
        })),
        notes: c.notes || undefined,
      }));

      const res = await fetch("/api/public/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: slug,
          tableNumber: isOffPremise ? undefined : tableNumber,
          orderType: orderMode || "qr",
          customerLang: lang,
          customerName: customerName || undefined,
          customerPhone: initialPhone || undefined,
          customerNotes: orderNotes || undefined,
          deliveryAddress: initialAddress || undefined,
          items: orderItems,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setOrderStatus("confirmed");
      setCart([]);
      setShowCart(false);
      idempotencyKeyRef.current = crypto.randomUUID();
    } catch {
      alert(t.error);
    } finally {
      setSending(false);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🍽️</div>
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#f87171" }}>
          <p style={{ fontSize: 20 }}>{t.error}</p>
          <button onClick={loadMenu} style={{ ...pillBtn, marginTop: 16 }}>{t.retry}</button>
        </div>
      </div>
    );
  }

  // Order confirmation screen
  if (orderId && orderNumber) {
    const statusEmoji: Record<string, string> = {
      confirmed: "✅", preparing: "🔥", ready: "🔔", served: "🍽️", open: "📋",
    };
    const statusText: Record<string, string> = {
      confirmed: t.confirmed, preparing: t.preparing, ready: t.ready,
      served: t.served, open: t.open,
    };

    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {statusEmoji[orderStatus || "confirmed"] || "✅"}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
            {t.order_sent}
          </h1>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#f97316", margin: "0 0 24px" }}>
            {t.order_number}{orderNumber}
          </p>
          {table && (
            <p style={{ color: "#999", fontSize: 16, margin: "0 0 32px" }}>
              {t.your_table}: {table.number}
            </p>
          )}

          <div style={{
            background: "#1a1a1a", borderRadius: 16, padding: "24px 20px",
            maxWidth: 340, margin: "0 auto", border: "1px solid #333",
          }}>
            <p style={{ color: "#999", fontSize: 14, margin: "0 0 8px" }}>{t.order_status}</p>
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>
              {statusEmoji[orderStatus || "confirmed"]} {statusText[orderStatus || "confirmed"] || orderStatus}
            </p>
          </div>

          <button
            onClick={() => { setOrderId(null); setOrderNumber(null); setOrderStatus(null); }}
            style={{ ...pillBtn, marginTop: 32, background: "#333", color: "#fff" }}
          >
            {t.back_to_menu}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "#0a0a0a",
        borderBottom: "1px solid #222", padding: "12px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
              {tenant.name}
            </h1>
            {table && (
              <p style={{ color: "#f97316", fontSize: 13, fontWeight: 600, margin: "2px 0 0" }}>
                {t.your_table}: {table.number}
              </p>
            )}
          </div>
          {/* Language selector */}
          <div style={{ display: "flex", gap: 4 }}>
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? "#f97316" : "#1a1a1a",
                  border: lang === l ? "none" : "1px solid #333",
                  borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                  fontSize: 16, lineHeight: 1,
                }}
              >
                {LANG_FLAGS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Categories horizontal scroll */}
        <div style={{
          display: "flex", gap: 8, overflowX: "auto", paddingTop: 12, paddingBottom: 4,
          scrollbarWidth: "none",
        }}>
          <button
            onClick={() => setSelectedCat("all")}
            style={{
              ...catPill,
              background: selectedCat === "all" ? "#f97316" : "#1a1a1a",
              color: selectedCat === "all" ? "#000" : "#ccc",
              border: selectedCat === "all" ? "none" : "1px solid #333",
            }}
          >
            🍽️ {t.menu}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              style={{
                ...catPill,
                background: selectedCat === cat.id ? "#f97316" : "#1a1a1a",
                color: selectedCat === cat.id ? "#000" : "#ccc",
                border: selectedCat === cat.id ? "none" : "1px solid #333",
              }}
            >
              {cat.icon || "🍴"} {localName(cat, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Ad Banner Top ── */}
      {ads.length > 0 && (
        <div style={{ padding: "8px 16px 0" }}>
          <AdBannerSlot ads={ads.slice(0, 2)} position="top" />
        </div>
      )}

      {/* ── Menu Items ── */}
      <div style={{ padding: "12px 16px 120px" }}>
        {filteredItems.length === 0 && (
          <p style={{ textAlign: "center", color: "#666", padding: 40 }}>{t.no_items}</p>
        )}

        {/* Group by category when showing "all" */}
        {selectedCat === "all" ? (
          categories.map((cat, catIdx) => {
            const catItems = items.filter((i) => i.category_id === cat.id);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id}>
                {/* Mid-scroll ad after 2nd category */}
                {catIdx === 2 && ads.length > 2 && (
                  <AdBannerSlot ads={ads.slice(2, 4)} position="mid" />
                )}
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{
                    fontSize: 16, fontWeight: 700, color: "#f97316",
                    margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {cat.icon} {localName(cat, lang)}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {catItems.map((item) => (
                      <ItemCard key={item.id} item={item} lang={lang} currency={tenant.currency} onTap={openDetail} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} lang={lang} currency={tenant.currency} onTap={openDetail} />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating cart button ── */}
      {cartCount > 0 && !showCart && !detailItem && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: "fixed", bottom: 20, left: 16, right: 16,
            background: "#f97316", color: "#000", border: "none",
            borderRadius: 16, padding: "16px 20px",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            zIndex: 40, boxShadow: "0 8px 32px rgba(249,115,22,0.4)",
          }}
        >
          <span>🛒 {t.view_order} ({cartCount} {t.items})</span>
          <span>{fmtPrice(cartTotal, tenant.currency)}</span>
        </button>
      )}

      {/* ── Item Detail Modal ── */}
      {detailItem && (
        <div style={overlayStyle} onClick={() => setDetailItem(null)}>
          <div style={bottomSheetStyle} onClick={(e) => e.stopPropagation()}>
            {detailItem.image_url && (
              <img
                src={detailItem.image_url}
                alt={localName(detailItem, lang)}
                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "16px 16px 0 0" }}
              />
            )}
            <div style={{ padding: "16px 20px 20px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
                {localName(detailItem, lang)}
              </h2>
              <p style={{ color: "#f97316", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
                {fmtPrice(detailItem.price, tenant.currency)}
              </p>
              {localDesc(detailItem, lang) && (
                <p style={{ color: "#999", fontSize: 14, margin: "0 0 16px", lineHeight: 1.4 }}>
                  {localDesc(detailItem, lang)}
                </p>
              )}

              {/* Allergens */}
              {detailItem.allergens && detailItem.allergens.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {detailItem.allergens.map((a) => (
                    <span key={a} style={{
                      background: "rgba(239,68,68,0.15)", color: "#f87171",
                      padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* Modifier groups */}
              {getItemGroups(detailItem.id).map((group) => {
                const groupMods = modifiers.filter((m) => m.group_id === group.id);
                const selected = detailMods[group.id] || [];
                return (
                  <div key={group.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
                        {localName(group, lang)}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "1px 8px", borderRadius: 999, fontWeight: 600,
                        background: group.required ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.06)",
                        color: group.required ? "#f97316" : "#888",
                      }}>
                        {group.required ? t.required : t.optional}
                        {group.max_select > 1 && ` · ${t.up_to} ${group.max_select}`}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {groupMods.map((mod) => {
                        const isSelected = selected.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleMod(group.id, mod.id, group.max_select)}
                            style={{
                              background: isSelected ? "rgba(249,115,22,0.12)" : "#1a1a1a",
                              border: isSelected ? "2px solid #f97316" : "1px solid #333",
                              borderRadius: 10, padding: "10px 14px",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              cursor: "pointer", color: "#fff",
                            }}
                          >
                            <span style={{ fontSize: 14 }}>{localName(mod, lang)}</span>
                            {mod.price_delta > 0 && (
                              <span style={{ color: "#f97316", fontWeight: 700, fontSize: 13 }}>
                                +{fmtPrice(mod.price_delta, tenant.currency)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Notes */}
              <textarea
                placeholder={t.notes}
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                style={{
                  width: "100%", background: "#1a1a1a", border: "1px solid #333",
                  borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14,
                  resize: "none", height: 60, boxSizing: "border-box", outline: "none",
                }}
              />

              {/* Quantity + Add */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 0,
                  background: "#1a1a1a", borderRadius: 12, border: "1px solid #333",
                }}>
                  <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    style={qtyBtn}>−</button>
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, width: 36, textAlign: "center" }}>
                    {detailQty}
                  </span>
                  <button onClick={() => setDetailQty(detailQty + 1)} style={qtyBtn}>+</button>
                </div>
                <button onClick={addToCart} style={{
                  flex: 1, background: "#f97316", color: "#000", border: "none",
                  borderRadius: 12, padding: "14px 20px", fontSize: 16, fontWeight: 700,
                  cursor: "pointer",
                }}>
                  {t.add} · {fmtPrice(
                    (detailItem.price + Object.values(detailMods).flat().reduce((s, id) => {
                      const m = modifiers.find((mod) => mod.id === id);
                      return s + (m?.price_delta || 0);
                    }, 0)) * detailQty,
                    tenant.currency
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {showCart && (
        <div style={overlayStyle} onClick={() => setShowCart(false)}>
          <div style={bottomSheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>
                  🛒 {t.cart}
                </h2>
                <button onClick={() => setShowCart(false)}
                  style={{ background: "none", border: "none", color: "#999", fontSize: 24, cursor: "pointer" }}>
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <p style={{ color: "#666", textAlign: "center", padding: 40 }}>{t.empty_cart}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {cart.map((c, i) => {
                    const modTotal = c.selectedModifiers.reduce((s, m) => s + m.price_delta, 0);
                    return (
                      <div key={i} style={{
                        background: "#1a1a1a", borderRadius: 12, padding: "12px 14px",
                        border: "1px solid #222",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                              {c.qty}x {localName(c.menuItem, lang)}
                            </span>
                            {c.selectedModifiers.length > 0 && (
                              <p style={{ color: "#888", fontSize: 12, margin: "4px 0 0" }}>
                                {c.selectedModifiers.map((m) => localName(m, lang)).join(", ")}
                              </p>
                            )}
                            {c.notes && (
                              <p style={{ color: "#666", fontSize: 12, margin: "2px 0 0", fontStyle: "italic" }}>
                                {c.notes}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ color: "#f97316", fontWeight: 700, fontSize: 14 }}>
                              {fmtPrice((c.menuItem.price + modTotal) * c.qty, tenant.currency)}
                            </span>
                            <button onClick={() => removeFromCart(i)}
                              style={{
                                display: "block", background: "none", border: "none",
                                color: "#f87171", fontSize: 12, cursor: "pointer", marginTop: 4,
                              }}>
                              {t.remove}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <input
                    placeholder={t.name}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={inputField}
                  />
                  <input
                    placeholder={t.order_notes}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    style={{ ...inputField, marginTop: 8 }}
                  />

                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginTop: 16, paddingTop: 16, borderTop: "1px solid #333",
                  }}>
                    <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{t.total}</span>
                    <span style={{ color: "#f97316", fontSize: 22, fontWeight: 800 }}>
                      {fmtPrice(cartTotal, tenant.currency)}
                    </span>
                  </div>

                  <button
                    onClick={sendOrder}
                    disabled={sending}
                    style={{
                      width: "100%", marginTop: 16,
                      background: sending ? "#666" : "#f97316",
                      color: sending ? "#999" : "#000",
                      border: "none", borderRadius: 14, padding: "16px",
                      fontSize: 17, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer",
                    }}
                  >
                    {sending ? t.sending : `${t.send} · ${fmtPrice(cartTotal, tenant.currency)}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Item Card component ── */
function ItemCard({ item, lang, currency, onTap }: {
  item: MenuItem; lang: Lang; currency: string; onTap: (item: MenuItem) => void;
}) {
  return (
    <button
      onClick={() => onTap(item)}
      style={{
        background: "#111", borderRadius: 14, padding: 0, border: "1px solid #222",
        display: "flex", overflow: "hidden", cursor: "pointer", textAlign: "left",
        width: "100%",
      }}
    >
      <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
        <h3 style={{
          color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 4px",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {localName(item, lang)}
        </h3>
        {localDesc(item, lang) && (
          <p style={{
            color: "#888", fontSize: 12, margin: "0 0 8px", lineHeight: 1.3,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {localDesc(item, lang)}
          </p>
        )}
        <span style={{ color: "#f97316", fontWeight: 700, fontSize: 15 }}>
          {fmtPrice(item.price, currency)}
        </span>
      </div>
      {item.image_url && (
        <img
          src={item.image_url}
          alt=""
          style={{ width: 100, height: 100, objectFit: "cover", flexShrink: 0 }}
        />
      )}
    </button>
  );
}

/* ── Styles ── */
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a0a",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const catPill: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const pillBtn: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  background: "#f97316",
  color: "#000",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  zIndex: 100,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

const bottomSheetStyle: React.CSSProperties = {
  background: "#111",
  borderRadius: "20px 20px 0 0",
  width: "100%",
  maxWidth: 500,
  maxHeight: "90vh",
  overflowY: "auto",
};

const qtyBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#f97316",
  fontSize: 20,
  fontWeight: 700,
  padding: "8px 14px",
  cursor: "pointer",
};

const inputField: React.CSSProperties = {
  width: "100%",
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
