// ============================================================
// SIMULATION CONFIG — 10 tenant profiles
// ============================================================

// Read lazily — env must be loaded before first use
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}
export function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

export type SimLang = "es" | "en";

export interface TenantProfile {
  name: string;
  slug: string;
  currency: string;
  locale: SimLang;
  timezone: string;
  taxRate: number;
  taxIncluded: boolean;
  tableCount: number;
  menuCategories: CategorySeed[];
  staffCount: number;
}

export interface CategorySeed {
  nameEs: string;
  nameEn: string;
  items: MenuItemSeed[];
}

export interface MenuItemSeed {
  nameEs: string;
  nameEn: string;
  price: number;
  prepTime: number;
}

// ── 10 Simulated Tenants ──────────────────────────────────────

export const TENANTS: TenantProfile[] = [
  {
    name: "La Parrilla de Juan",
    slug: "sim-parrilla-juan",
    currency: "EUR",
    locale: "es",
    timezone: "Europe/Madrid",
    taxRate: 10,
    taxIncluded: true,
    tableCount: 8,
    staffCount: 3,
    menuCategories: [
      {
        nameEs: "Entrantes",
        nameEn: "Starters",
        items: [
          { nameEs: "Patatas bravas", nameEn: "Spicy potatoes", price: 6.5, prepTime: 8 },
          { nameEs: "Croquetas caseras", nameEn: "Homemade croquettes", price: 8.0, prepTime: 10 },
          { nameEs: "Ensalada mixta", nameEn: "Mixed salad", price: 7.0, prepTime: 5 },
        ],
      },
      {
        nameEs: "Carnes",
        nameEn: "Meats",
        items: [
          { nameEs: "Entrecot a la brasa", nameEn: "Grilled ribeye", price: 22.0, prepTime: 18 },
          { nameEs: "Chuleton 500g", nameEn: "T-bone steak 500g", price: 28.0, prepTime: 20 },
          { nameEs: "Pollo al horno", nameEn: "Roasted chicken", price: 14.0, prepTime: 15 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Cerveza", nameEn: "Beer", price: 3.0, prepTime: 1 },
          { nameEs: "Vino tinto copa", nameEn: "Red wine glass", price: 4.5, prepTime: 1 },
          { nameEs: "Agua mineral", nameEn: "Mineral water", price: 2.0, prepTime: 1 },
        ],
      },
    ],
  },
  {
    name: "Burger Factory",
    slug: "sim-burger-factory",
    currency: "EUR",
    locale: "en",
    timezone: "Europe/London",
    taxRate: 20,
    taxIncluded: false,
    tableCount: 12,
    staffCount: 4,
    menuCategories: [
      {
        nameEs: "Hamburguesas",
        nameEn: "Burgers",
        items: [
          { nameEs: "Clasica", nameEn: "Classic Burger", price: 12.0, prepTime: 12 },
          { nameEs: "BBQ Bacon", nameEn: "BBQ Bacon Burger", price: 14.5, prepTime: 14 },
          { nameEs: "Veggie", nameEn: "Veggie Burger", price: 11.0, prepTime: 10 },
        ],
      },
      {
        nameEs: "Acompañamientos",
        nameEn: "Sides",
        items: [
          { nameEs: "Patatas fritas", nameEn: "French fries", price: 4.5, prepTime: 6 },
          { nameEs: "Aros de cebolla", nameEn: "Onion rings", price: 5.0, prepTime: 7 },
          { nameEs: "Coleslaw", nameEn: "Coleslaw", price: 3.5, prepTime: 2 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Refresco", nameEn: "Soda", price: 3.0, prepTime: 1 },
          { nameEs: "Batido", nameEn: "Milkshake", price: 5.5, prepTime: 3 },
        ],
      },
    ],
  },
  {
    name: "Sushi Zen",
    slug: "sim-sushi-zen",
    currency: "EUR",
    locale: "es",
    timezone: "Europe/Madrid",
    taxRate: 10,
    taxIncluded: true,
    tableCount: 10,
    staffCount: 3,
    menuCategories: [
      {
        nameEs: "Nigiri",
        nameEn: "Nigiri",
        items: [
          { nameEs: "Salmon nigiri (2u)", nameEn: "Salmon nigiri (2pc)", price: 5.0, prepTime: 5 },
          { nameEs: "Atun nigiri (2u)", nameEn: "Tuna nigiri (2pc)", price: 6.0, prepTime: 5 },
          { nameEs: "Gamba nigiri (2u)", nameEn: "Shrimp nigiri (2pc)", price: 5.5, prepTime: 5 },
        ],
      },
      {
        nameEs: "Rolls",
        nameEn: "Rolls",
        items: [
          { nameEs: "California roll", nameEn: "California roll", price: 10.0, prepTime: 8 },
          { nameEs: "Dragon roll", nameEn: "Dragon roll", price: 14.0, prepTime: 10 },
          { nameEs: "Tempura roll", nameEn: "Tempura roll", price: 12.0, prepTime: 9 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Sake", nameEn: "Sake", price: 6.0, prepTime: 1 },
          { nameEs: "Te verde", nameEn: "Green tea", price: 3.0, prepTime: 2 },
        ],
      },
    ],
  },
  {
    name: "Pizzeria Napoli",
    slug: "sim-pizzeria-napoli",
    currency: "EUR",
    locale: "es",
    timezone: "Europe/Rome",
    taxRate: 10,
    taxIncluded: true,
    tableCount: 6,
    staffCount: 2,
    menuCategories: [
      {
        nameEs: "Pizzas",
        nameEn: "Pizzas",
        items: [
          { nameEs: "Margherita", nameEn: "Margherita", price: 10.0, prepTime: 12 },
          { nameEs: "Quattro Formaggi", nameEn: "Four cheese", price: 13.0, prepTime: 14 },
          { nameEs: "Diavola", nameEn: "Diavola", price: 12.0, prepTime: 12 },
        ],
      },
      {
        nameEs: "Pastas",
        nameEn: "Pastas",
        items: [
          { nameEs: "Carbonara", nameEn: "Carbonara", price: 11.0, prepTime: 10 },
          { nameEs: "Bolognesa", nameEn: "Bolognese", price: 10.5, prepTime: 10 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Chianti copa", nameEn: "Chianti glass", price: 5.0, prepTime: 1 },
          { nameEs: "Limonada", nameEn: "Lemonade", price: 3.5, prepTime: 2 },
        ],
      },
    ],
  },
  {
    name: "Taco Loco",
    slug: "sim-taco-loco",
    currency: "EUR",
    locale: "es",
    timezone: "Europe/Madrid",
    taxRate: 10,
    taxIncluded: true,
    tableCount: 6,
    staffCount: 2,
    menuCategories: [
      {
        nameEs: "Tacos",
        nameEn: "Tacos",
        items: [
          { nameEs: "Taco al pastor", nameEn: "Al pastor taco", price: 4.5, prepTime: 6 },
          { nameEs: "Taco de carnitas", nameEn: "Carnitas taco", price: 5.0, prepTime: 7 },
          { nameEs: "Taco de pollo", nameEn: "Chicken taco", price: 4.0, prepTime: 6 },
        ],
      },
      {
        nameEs: "Burritos",
        nameEn: "Burritos",
        items: [
          { nameEs: "Burrito mixto", nameEn: "Mixed burrito", price: 9.0, prepTime: 8 },
          { nameEs: "Burrito vegetal", nameEn: "Veggie burrito", price: 8.0, prepTime: 7 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Margarita", nameEn: "Margarita", price: 7.0, prepTime: 3 },
          { nameEs: "Horchata", nameEn: "Horchata", price: 4.0, prepTime: 2 },
        ],
      },
    ],
  },
  {
    name: "The Breakfast Club",
    slug: "sim-breakfast-club",
    currency: "GBP",
    locale: "en",
    timezone: "Europe/London",
    taxRate: 20,
    taxIncluded: false,
    tableCount: 8,
    staffCount: 3,
    menuCategories: [
      {
        nameEs: "Desayunos",
        nameEn: "Breakfasts",
        items: [
          { nameEs: "Full English", nameEn: "Full English", price: 12.0, prepTime: 15 },
          { nameEs: "Tortitas", nameEn: "Pancake Stack", price: 9.0, prepTime: 10 },
          { nameEs: "Huevos Benedict", nameEn: "Eggs Benedict", price: 11.0, prepTime: 12 },
        ],
      },
      {
        nameEs: "Bebidas calientes",
        nameEn: "Hot Drinks",
        items: [
          { nameEs: "Cafe latte", nameEn: "Latte", price: 3.5, prepTime: 3 },
          { nameEs: "Capuccino", nameEn: "Cappuccino", price: 3.5, prepTime: 3 },
          { nameEs: "Te ingles", nameEn: "English Tea", price: 2.5, prepTime: 2 },
        ],
      },
    ],
  },
  {
    name: "Wok Express",
    slug: "sim-wok-express",
    currency: "EUR",
    locale: "en",
    timezone: "Europe/Berlin",
    taxRate: 19,
    taxIncluded: true,
    tableCount: 10,
    staffCount: 3,
    menuCategories: [
      {
        nameEs: "Woks",
        nameEn: "Woks",
        items: [
          { nameEs: "Pad Thai", nameEn: "Pad Thai", price: 11.0, prepTime: 10 },
          { nameEs: "Arroz frito", nameEn: "Fried rice", price: 9.5, prepTime: 8 },
          { nameEs: "Noodles con pollo", nameEn: "Chicken noodles", price: 10.0, prepTime: 9 },
        ],
      },
      {
        nameEs: "Entrantes",
        nameEn: "Starters",
        items: [
          { nameEs: "Gyozas (6u)", nameEn: "Gyoza (6pc)", price: 7.0, prepTime: 8 },
          { nameEs: "Edamame", nameEn: "Edamame", price: 5.0, prepTime: 3 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Cerveza japonesa", nameEn: "Japanese beer", price: 4.5, prepTime: 1 },
          { nameEs: "Bubble tea", nameEn: "Bubble tea", price: 5.0, prepTime: 4 },
        ],
      },
    ],
  },
  {
    name: "Ristorante Da Marco",
    slug: "sim-da-marco",
    currency: "EUR",
    locale: "es",
    timezone: "Europe/Rome",
    taxRate: 10,
    taxIncluded: true,
    tableCount: 10,
    staffCount: 4,
    menuCategories: [
      {
        nameEs: "Antipasti",
        nameEn: "Antipasti",
        items: [
          { nameEs: "Bruschetta", nameEn: "Bruschetta", price: 7.0, prepTime: 5 },
          { nameEs: "Carpaccio", nameEn: "Carpaccio", price: 12.0, prepTime: 5 },
        ],
      },
      {
        nameEs: "Primi",
        nameEn: "First Courses",
        items: [
          { nameEs: "Risotto ai funghi", nameEn: "Mushroom risotto", price: 14.0, prepTime: 15 },
          { nameEs: "Lasagna", nameEn: "Lasagna", price: 13.0, prepTime: 12 },
          { nameEs: "Ravioli al tartufo", nameEn: "Truffle ravioli", price: 16.0, prepTime: 14 },
        ],
      },
      {
        nameEs: "Vinos",
        nameEn: "Wines",
        items: [
          { nameEs: "Chianti Classico", nameEn: "Chianti Classico", price: 6.0, prepTime: 1 },
          { nameEs: "Prosecco copa", nameEn: "Prosecco glass", price: 5.0, prepTime: 1 },
        ],
      },
    ],
  },
  {
    name: "Fish & Chips Corner",
    slug: "sim-fish-chips",
    currency: "GBP",
    locale: "en",
    timezone: "Europe/London",
    taxRate: 20,
    taxIncluded: false,
    tableCount: 6,
    staffCount: 2,
    menuCategories: [
      {
        nameEs: "Pescados",
        nameEn: "Fish",
        items: [
          { nameEs: "Cod & Chips", nameEn: "Cod & Chips", price: 11.0, prepTime: 12 },
          { nameEs: "Haddock & Chips", nameEn: "Haddock & Chips", price: 12.0, prepTime: 12 },
          { nameEs: "Scampi & Chips", nameEn: "Scampi & Chips", price: 10.0, prepTime: 10 },
        ],
      },
      {
        nameEs: "Extras",
        nameEn: "Extras",
        items: [
          { nameEs: "Mushy peas", nameEn: "Mushy peas", price: 2.0, prepTime: 2 },
          { nameEs: "Curry sauce", nameEn: "Curry sauce", price: 1.5, prepTime: 1 },
        ],
      },
      {
        nameEs: "Bebidas",
        nameEn: "Drinks",
        items: [
          { nameEs: "Pinta IPA", nameEn: "IPA Pint", price: 5.0, prepTime: 1 },
          { nameEs: "Limonada", nameEn: "Lemonade", price: 3.0, prepTime: 1 },
        ],
      },
    ],
  },
  {
    name: "La Taberna del Pulpo",
    slug: "sim-taberna-pulpo",
    currency: "EUR",
    locale: "es",
    timezone: "Europe/Madrid",
    taxRate: 10,
    taxIncluded: true,
    tableCount: 8,
    staffCount: 3,
    menuCategories: [
      {
        nameEs: "Mariscos",
        nameEn: "Seafood",
        items: [
          { nameEs: "Pulpo a la gallega", nameEn: "Galician octopus", price: 16.0, prepTime: 15 },
          { nameEs: "Gambas al ajillo", nameEn: "Garlic prawns", price: 14.0, prepTime: 10 },
          { nameEs: "Mejillones al vapor", nameEn: "Steamed mussels", price: 11.0, prepTime: 12 },
        ],
      },
      {
        nameEs: "Raciones",
        nameEn: "Sharing plates",
        items: [
          { nameEs: "Jamon iberico", nameEn: "Iberian ham", price: 18.0, prepTime: 3 },
          { nameEs: "Queso manchego", nameEn: "Manchego cheese", price: 10.0, prepTime: 3 },
        ],
      },
      {
        nameEs: "Vinos y cañas",
        nameEn: "Wines & beers",
        items: [
          { nameEs: "Albarino copa", nameEn: "Albarino glass", price: 5.0, prepTime: 1 },
          { nameEs: "Caña", nameEn: "Draft beer", price: 2.5, prepTime: 1 },
          { nameEs: "Tinto de verano", nameEn: "Summer red wine", price: 3.5, prepTime: 2 },
        ],
      },
    ],
  },
];

// ── Customer name pools ───────────────────────────────────────

export const CUSTOMER_NAMES_ES = [
  "Maria Garcia", "Carlos Lopez", "Ana Martinez", "Pedro Sanchez",
  "Laura Fernandez", "Miguel Torres", "Carmen Ruiz", "Javier Moreno",
  "Lucia Diaz", "Pablo Romero", "Sofia Navarro", "Diego Alvarez",
];

export const CUSTOMER_NAMES_EN = [
  "James Smith", "Emma Wilson", "Oliver Brown", "Sophia Taylor",
  "William Johnson", "Ava Davies", "Thomas Roberts", "Isabella Clark",
  "Henry Evans", "Mia Walker", "Jack Harris", "Charlotte Lewis",
];

// ── Simulation timing ─────────────────────────────────────────

export const SIM_CONFIG = {
  /** Seconds between order waves per tenant */
  orderIntervalSec: 4,
  /** Number of order waves per tenant */
  ordersPerTenant: 5,
  /** Seconds to wait between status transitions (simulates kitchen work) */
  kitchenDelayBaseSec: 2,
  /** Probability of QR order vs POS order (0-1) */
  qrOrderProbability: 0.3,
  /** Probability of takeaway order (0-1) */
  takeawayProbability: 0.15,
  /** Probability of delivery order (0-1) */
  deliveryProbability: 0.1,
  /** Max items per order */
  maxItemsPerOrder: 5,
  /** Min items per order */
  minItemsPerOrder: 1,
} as const;
