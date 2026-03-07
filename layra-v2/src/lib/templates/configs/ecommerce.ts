import { t5 } from "../types";
import type { SystemConfig } from "../types";

export const ecommerceConfig: SystemConfig = {
  name: "ShopEngine",
  subtitle: t5("Plataforma E-Commerce", "E-Commerce Platform", "Plateforme E-Commerce", "E-Commerce-Plattform", "Piattaforma E-Commerce"),
  brandColor: "#8b5cf6",
  icon: "🛒",
  modules: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "dashboard",
      kpis: [
        { label: t5("Ventas Hoy", "Sales Today", "Ventes Aujourd'hui", "Verkäufe Heute", "Vendite Oggi"), value: "$8,456", change: "+22%", trend: "up" },
        { label: t5("Pedidos", "Orders", "Commandes", "Bestellungen", "Ordini"), value: "134", change: "+18", trend: "up" },
        { label: t5("Ticket Promedio", "Average Ticket", "Ticket Moyen", "Durchschnittlicher Bon", "Scontrino Medio"), value: "$63.10", change: "+$5.20", trend: "up" },
        { label: t5("Tasa Conversión", "Conversion Rate", "Taux de Conversion", "Konversionsrate", "Tasso di Conversione"), value: "3.8%", change: "+0.4%", trend: "up" },
      ],
      table: {
        columns: [
          { key: "order", label: t5("Pedido", "Order", "Commande", "Bestellung", "Ordine") },
          { key: "customer", label: t5("Cliente", "Customer", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "items", label: "Items" },
          { key: "total", label: "Total", type: "currency" },
          { key: "payment", label: t5("Pago", "Payment", "Paiement", "Zahlung", "Pagamento"), type: "badge", badgeColors: { "Stripe": "purple", "PayPal": "blue", "Transferencia": "green" } },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Pagado": "green", "Procesando": "yellow", "Enviado": "blue", "Entregado": "gray", "Reembolso": "red" } },
        ],
        rows: [
          { order: "#ORD-4521", customer: "Elena Vega", items: "3", total: "$127.50", payment: "Stripe", status: "Pagado" },
          { order: "#ORD-4520", customer: "Thomas Müller", items: "1", total: "$89.99", payment: "PayPal", status: "Enviado" },
          { order: "#ORD-4519", customer: "Marie Dubois", items: "5", total: "$234.00", payment: "Stripe", status: "Procesando" },
          { order: "#ORD-4518", customer: "Marco Rossi", items: "2", total: "$67.80", payment: "Transferencia", status: "Entregado" },
          { order: "#ORD-4517", customer: "Sarah Kim", items: "1", total: "$45.00", payment: "Stripe", status: "Reembolso" },
        ],
        searchPlaceholder: t5("Buscar pedidos recientes...", "Search recent orders...", "Rechercher des commandes récentes...", "Letzte Bestellungen suchen...", "Cerca ordini recenti..."),
      },
    },
    {
      id: "products",
      label: t5("Productos", "Products", "Produits", "Produkte", "Prodotti"),
      icon: "tag",
      kpis: [
        { label: t5("Total Productos", "Total Products", "Total Produits", "Produkte Gesamt", "Totale Prodotti"), value: "456", trend: "neutral" },
        { label: t5("Activos", "Active", "Actifs", "Aktiv", "Attivi"), value: "389", trend: "neutral" },
        { label: t5("Sin Stock", "Out of Stock", "Rupture de Stock", "Nicht auf Lager", "Esaurito"), value: "12", trend: "down" },
        { label: t5("Más Vendido", "Best Seller", "Plus Vendu", "Bestseller", "Più Venduto"), value: "Sneakers Pro", trend: "up" },
      ],
      table: {
        columns: [
          { key: "product", label: t5("Producto", "Product", "Produit", "Produkt", "Prodotto"), type: "avatar" },
          { key: "sku", label: "SKU" },
          { key: "price", label: t5("Precio", "Price", "Prix", "Preis", "Prezzo"), type: "currency" },
          { key: "stock", label: "Stock" },
          { key: "category", label: t5("Categoría", "Category", "Catégorie", "Kategorie", "Categoria"), type: "badge", badgeColors: { "Ropa": "blue", "Calzado": "purple", "Accesorios": "green", "Electrónica": "orange" } },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activo": "green", "Borrador": "gray", "Agotado": "red" } },
        ],
        rows: [
          { product: "Sneakers Pro X", sku: "SNK-001", price: "$89.99", stock: "234", category: "Calzado", status: "Activo" },
          { product: "Camiseta Urban", sku: "TSH-045", price: "$29.99", stock: "567", category: "Ropa", status: "Activo" },
          { product: "Reloj Smart V2", sku: "WCH-012", price: "$199.00", stock: "45", category: "Electrónica", status: "Activo" },
          { product: "Mochila Travel", sku: "BAG-078", price: "$65.00", stock: "0", category: "Accesorios", status: "Agotado" },
          { product: "Gafas Sol Premium", sku: "SUN-034", price: "$120.00", stock: "89", category: "Accesorios", status: "Activo" },
          { product: "Zapatillas Run Air", sku: "SNK-002", price: "$129.99", stock: "12", category: "Calzado", status: "Activo" },
        ],
        searchPlaceholder: t5("Buscar productos...", "Search products...", "Rechercher des produits...", "Produkte suchen...", "Cerca prodotti..."),
      },
      modal: {
        title: t5("Nuevo Producto", "New Product", "Nouveau Produit", "Neues Produkt", "Nuovo Prodotto"),
        fields: [
          { name: "product", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true, placeholder: t5("Ej: Camiseta Premium", "E.g.: Premium T-Shirt", "Ex : T-Shirt Premium", "Z.B.: Premium T-Shirt", "Es.: Maglietta Premium") },
          { name: "sku", label: "SKU", type: "text", required: true, placeholder: "XXX-000" },
          { name: "price", label: t5("Precio ($)", "Price ($)", "Prix ($)", "Preis ($)", "Prezzo ($)"), type: "number", required: true, placeholder: "0.00" },
          { name: "stock", label: t5("Stock Inicial", "Initial Stock", "Stock Initial", "Anfangsbestand", "Stock Iniziale"), type: "number", required: true, placeholder: "0" },
          { name: "category", label: t5("Categoría", "Category", "Catégorie", "Kategorie", "Categoria"), type: "select", required: true, options: [
            { value: "Ropa", label: t5("Ropa", "Clothing", "Vêtements", "Kleidung", "Abbigliamento") },
            { value: "Calzado", label: t5("Calzado", "Footwear", "Chaussures", "Schuhe", "Calzature") },
            { value: "Accesorios", label: t5("Accesorios", "Accessories", "Accessoires", "Zubehör", "Accessori") },
            { value: "Electrónica", label: t5("Electrónica", "Electronics", "Électronique", "Elektronik", "Elettronica") },
          ]},
          { name: "description", label: t5("Descripción", "Description", "Description", "Beschreibung", "Descrizione"), type: "textarea", placeholder: t5("Descripción del producto...", "Product description...", "Description du produit...", "Produktbeschreibung...", "Descrizione del prodotto...") },
        ],
      },
    },
    {
      id: "orders",
      label: t5("Pedidos", "Orders", "Commandes", "Bestellungen", "Ordini"),
      icon: "clipboard",
      kpis: [
        { label: t5("Pedidos Hoy", "Orders Today", "Commandes Aujourd'hui", "Bestellungen Heute", "Ordini Oggi"), value: "134", change: "+18", trend: "up" },
        { label: t5("Pendientes", "Pending", "En Attente", "Ausstehend", "In Sospeso"), value: "23", trend: "neutral" },
        { label: t5("En Envío", "In Shipping", "En Expédition", "Im Versand", "In Spedizione"), value: "45", trend: "neutral" },
        { label: t5("Devoluciones", "Returns", "Retours", "Retouren", "Resi"), value: "3", trend: "down" },
      ],
      table: {
        columns: [
          { key: "order", label: t5("Pedido", "Order", "Commande", "Bestellung", "Ordine") },
          { key: "customer", label: t5("Cliente", "Customer", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "date", label: t5("Fecha", "Date", "Date", "Datum", "Data"), type: "date" },
          { key: "items", label: "Items" },
          { key: "total", label: "Total", type: "currency" },
          { key: "shipping", label: t5("Envío", "Shipping", "Expédition", "Versand", "Spedizione") },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Nuevo": "blue", "Procesando": "yellow", "Enviado": "purple", "Entregado": "green", "Devuelto": "red" } },
        ],
        rows: [
          { order: "#ORD-4521", customer: "Elena Vega", date: "Mar 7, 2026", items: "3", total: "$127.50", shipping: "Express", status: "Nuevo" },
          { order: "#ORD-4520", customer: "Thomas Müller", date: "Mar 6, 2026", items: "1", total: "$89.99", shipping: "Standard", status: "Enviado" },
          { order: "#ORD-4519", customer: "Marie Dubois", date: "Mar 6, 2026", items: "5", total: "$234.00", shipping: "Express", status: "Procesando" },
          { order: "#ORD-4518", customer: "Marco Rossi", date: "Mar 5, 2026", items: "2", total: "$67.80", shipping: "Standard", status: "Entregado" },
          { order: "#ORD-4517", customer: "Sarah Kim", date: "Mar 4, 2026", items: "1", total: "$45.00", shipping: "Express", status: "Devuelto" },
          { order: "#ORD-4516", customer: "Luis Hernández", date: "Mar 4, 2026", items: "4", total: "$156.00", shipping: "Standard", status: "Entregado" },
        ],
        searchPlaceholder: t5("Buscar pedidos...", "Search orders...", "Rechercher des commandes...", "Bestellungen suchen...", "Cerca ordini..."),
      },
      tabs: [
        { id: "all", label: t5("Todos", "All", "Tous", "Alle", "Tutti"), filterField: "6", filterValue: "all" },
        { id: "new", label: t5("Nuevos", "New", "Nouveaux", "Neu", "Nuovi"), filterField: "6", filterValue: "Nuevo" },
        { id: "shipped", label: t5("Enviados", "Shipped", "Expédiés", "Versendet", "Spediti"), filterField: "6", filterValue: "Enviado" },
        { id: "delivered", label: t5("Entregados", "Delivered", "Livrés", "Zugestellt", "Consegnati"), filterField: "6", filterValue: "Entregado" },
      ],
    },
    {
      id: "inventory",
      label: t5("Inventario", "Inventory", "Inventaire", "Inventar", "Inventario"),
      icon: "home",
      kpis: [
        { label: t5("Valor Total", "Total Value", "Valeur Totale", "Gesamtwert", "Valore Totale"), value: "$234,500", trend: "neutral" },
        { label: t5("Productos", "Products", "Produits", "Produkte", "Prodotti"), value: "456", trend: "neutral" },
        { label: t5("Stock Bajo", "Low Stock", "Stock Faible", "Niedriger Bestand", "Scorte Basse"), value: "18", change: "+5", trend: "down" },
        { label: t5("Reorden Pendiente", "Pending Reorder", "Réapprovisionnement en Attente", "Nachbestellung Ausstehend", "Riordino in Sospeso"), value: "8", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "product", label: t5("Producto", "Product", "Produit", "Produkt", "Prodotto"), type: "avatar" },
          { key: "sku", label: "SKU" },
          { key: "stock", label: t5("Stock Actual", "Current Stock", "Stock Actuel", "Aktueller Bestand", "Stock Attuale") },
          { key: "minStock", label: t5("Stock Mínimo", "Minimum Stock", "Stock Minimum", "Mindestbestand", "Stock Minimo") },
          { key: "warehouse", label: t5("Almacén", "Warehouse", "Entrepôt", "Lager", "Magazzino") },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "OK": "green", "Bajo": "yellow", "Crítico": "red", "Sin Stock": "red" } },
        ],
        rows: [
          { product: "Sneakers Pro X", sku: "SNK-001", stock: "234", minStock: "50", warehouse: "Central", status: "OK" },
          { product: "Camiseta Urban", sku: "TSH-045", stock: "567", minStock: "100", warehouse: "Central", status: "OK" },
          { product: "Reloj Smart V2", sku: "WCH-012", stock: "45", minStock: "30", warehouse: "Central", status: "Bajo" },
          { product: "Mochila Travel", sku: "BAG-078", stock: "0", minStock: "20", warehouse: "—", status: "Sin Stock" },
          { product: "Gafas Sol Premium", sku: "SUN-034", stock: "89", minStock: "25", warehouse: "Norte", status: "OK" },
          { product: "Zapatillas Run Air", sku: "SNK-002", stock: "12", minStock: "30", warehouse: "Central", status: "Crítico" },
        ],
        searchPlaceholder: t5("Buscar inventario...", "Search inventory...", "Rechercher dans l'inventaire...", "Inventar durchsuchen...", "Cerca inventario..."),
      },
    },
    {
      id: "customers",
      label: t5("Clientes", "Customers", "Clients", "Kunden", "Clienti"),
      icon: "users",
      kpis: [
        { label: t5("Total Clientes", "Total Customers", "Total Clients", "Kunden Gesamt", "Totale Clienti"), value: "5,678", change: "+234", trend: "up" },
        { label: t5("Nuevos (Mes)", "New (Month)", "Nouveaux (Mois)", "Neu (Monat)", "Nuovi (Mese)"), value: "389", change: "+15%", trend: "up" },
        { label: t5("Recurrentes", "Recurring", "Récurrents", "Wiederkehrend", "Ricorrenti"), value: "42%", trend: "up" },
        { label: t5("LTV Promedio", "Average LTV", "LTV Moyen", "Durchschnittlicher LTV", "LTV Medio"), value: "$245", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "customer", label: t5("Cliente", "Customer", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "email", label: "Email" },
          { key: "orders", label: t5("Pedidos", "Orders", "Commandes", "Bestellungen", "Ordini") },
          { key: "spent", label: t5("Total Gastado", "Total Spent", "Total Dépensé", "Gesamt Ausgegeben", "Totale Speso"), type: "currency" },
          { key: "lastOrder", label: t5("Último Pedido", "Last Order", "Dernière Commande", "Letzte Bestellung", "Ultimo Ordine"), type: "date" },
          { key: "segment", label: t5("Segmento", "Segment", "Segment", "Segment", "Segmento"), type: "badge", badgeColors: { "VIP": "purple", "Regular": "blue", "Nuevo": "green", "Inactivo": "gray" } },
        ],
        rows: [
          { customer: "Elena Vega", email: "elena@email.com", orders: "23", spent: "$2,340", lastOrder: "Mar 7, 2026", segment: "VIP" },
          { customer: "Thomas Müller", email: "thomas@email.de", orders: "12", spent: "$890", lastOrder: "Mar 6, 2026", segment: "Regular" },
          { customer: "Marie Dubois", email: "marie@email.fr", orders: "45", spent: "$4,560", lastOrder: "Mar 6, 2026", segment: "VIP" },
          { customer: "Marco Rossi", email: "marco@email.it", orders: "5", spent: "$345", lastOrder: "Mar 5, 2026", segment: "Regular" },
          { customer: "Sarah Kim", email: "sarah@email.com", orders: "1", spent: "$45", lastOrder: "Mar 4, 2026", segment: "Nuevo" },
        ],
        searchPlaceholder: t5("Buscar clientes...", "Search customers...", "Rechercher des clients...", "Kunden suchen...", "Cerca clienti..."),
      },
      modal: {
        title: t5("Nuevo Cliente", "New Customer", "Nouveau Client", "Neuer Kunde", "Nuovo Cliente"),
        fields: [
          { name: "customer", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: t5("Teléfono", "Phone", "Téléphone", "Telefon", "Telefono"), type: "tel" },
          { name: "address", label: t5("Dirección", "Address", "Adresse", "Adresse", "Indirizzo"), type: "textarea", placeholder: t5("Dirección de envío...", "Shipping address...", "Adresse de livraison...", "Lieferadresse...", "Indirizzo di spedizione...") },
        ],
      },
    },
    {
      id: "shipping",
      label: t5("Envíos", "Shipping", "Expéditions", "Versand", "Spedizioni"),
      icon: "truck",
      kpis: [
        { label: t5("En Tránsito", "In Transit", "En Transit", "Im Transit", "In Transito"), value: "45", trend: "neutral" },
        { label: t5("Entregados Hoy", "Delivered Today", "Livrés Aujourd'hui", "Heute Zugestellt", "Consegnati Oggi"), value: "23", change: "+5", trend: "up" },
        { label: t5("Tiempo Promedio", "Average Time", "Temps Moyen", "Durchschnittliche Zeit", "Tempo Medio"), value: t5("3.2 días", "3.2 days", "3.2 jours", "3.2 Tage", "3.2 giorni"), change: "-0.5d", trend: "up" },
        { label: t5("Costo Envío Prom.", "Avg. Shipping Cost", "Coût Expédition Moy.", "Durchschn. Versandkosten", "Costo Spediz. Medio"), value: "$8.50", trend: "neutral" },
      ],
      table: {
        columns: [
          { key: "tracking", label: "Tracking" },
          { key: "order", label: t5("Pedido", "Order", "Commande", "Bestellung", "Ordine") },
          { key: "customer", label: t5("Cliente", "Customer", "Client", "Kunde", "Cliente"), type: "avatar" },
          { key: "carrier", label: "Carrier" },
          { key: "shipped", label: t5("Enviado", "Shipped", "Expédié", "Versendet", "Spedito"), type: "date" },
          { key: "eta", label: "ETA", type: "date" },
          { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "En Tránsito": "blue", "En Reparto": "orange", "Entregado": "green", "Problema": "red" } },
        ],
        rows: [
          { tracking: "TRK-89012", order: "#ORD-4520", customer: "Thomas Müller", carrier: "DHL", shipped: "Mar 6, 2026", eta: "Mar 9, 2026", status: "En Tránsito" },
          { tracking: "TRK-89011", order: "#ORD-4518", customer: "Marco Rossi", carrier: "FedEx", shipped: "Mar 5, 2026", eta: "Mar 7, 2026", status: "Entregado" },
          { tracking: "TRK-89010", order: "#ORD-4516", customer: "Luis Hernández", carrier: "UPS", shipped: "Mar 4, 2026", eta: "Mar 7, 2026", status: "En Reparto" },
          { tracking: "TRK-89009", order: "#ORD-4515", customer: "Ana López", carrier: "DHL", shipped: "Mar 3, 2026", eta: "Mar 6, 2026", status: "Problema" },
        ],
        searchPlaceholder: t5("Buscar envíos...", "Search shipments...", "Rechercher des expéditions...", "Sendungen suchen...", "Cerca spedizioni..."),
      },
    },
  ],
  superAdmin: {
    modules: [
      {
        id: "tenants",
        label: t5("Tiendas", "Stores", "Boutiques", "Shops", "Negozi"),
        icon: "building",
        kpis: [
          { label: t5("Total Tiendas", "Total Stores", "Total Boutiques", "Shops Gesamt", "Totale Negozi"), value: "67", change: "+8", trend: "up" },
          { label: "MRR", value: "$3,953", change: "+18%", trend: "up" },
          { label: "GMV Total", value: "$1.2M", trend: "neutral" },
          { label: "Churn", value: "1.5%", trend: "up" },
        ],
        table: {
          columns: [
            { key: "store", label: t5("Tienda", "Store", "Boutique", "Shop", "Negozio"), type: "avatar" },
            { key: "plan", label: "Plan", type: "badge", badgeColors: { "Pro": "purple", "Basic": "blue", "Enterprise": "green" } },
            { key: "products", label: t5("Productos", "Products", "Produits", "Produkte", "Prodotti") },
            { key: "mrr", label: "MRR", type: "currency" },
            { key: "status", label: t5("Estado", "Status", "Statut", "Status", "Stato"), type: "badge", badgeColors: { "Activa": "green", "Trial": "yellow" } },
          ],
          rows: [
            { store: "UrbanStyle", plan: "Pro", products: "456", mrr: "$59/mo", status: "Activa" },
            { store: "TechGadgets", plan: "Enterprise", products: "1,234", mrr: "$99/mo", status: "Activa" },
            { store: "SportZone", plan: "Basic", products: "89", mrr: "$29/mo", status: "Trial" },
          ],
          searchPlaceholder: t5("Buscar tiendas...", "Search stores...", "Rechercher des boutiques...", "Shops suchen...", "Cerca negozi..."),
        },
        modal: {
          title: t5("Nueva Tienda", "New Store", "Nouvelle Boutique", "Neuer Shop", "Nuovo Negozio"),
          fields: [
            { name: "store", label: t5("Nombre", "Name", "Nom", "Name", "Nome"), type: "text", required: true },
            { name: "email", label: "Email Admin", type: "email", required: true },
            { name: "plan", label: "Plan", type: "select", required: true, options: [
              { value: "Basic", label: "Basic — $29/mo" }, { value: "Pro", label: "Pro — $59/mo" }, { value: "Enterprise", label: "Enterprise — $99/mo" },
            ]},
          ],
        },
      },
    ],
  },
};
