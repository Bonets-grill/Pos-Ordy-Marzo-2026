/**
 * SEED 5 DEMO TENANTS — Full restaurant data for live testing
 *
 * Creates 5 restaurants with menus, tables, 30+ orders each,
 * payments, and varied statuses. All visible in POS live.
 *
 * Usage: npx tsx scripts/seed-demo-tenants.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Missing env vars"); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── 5 Restaurant Definitions ─────────────────────────────

interface Restaurant {
  name: string;
  slug: string;
  currency: string;
  tax_rate: number;
  locale: string;
  plan: string;
  categories: { name_es: string; name_en: string; icon: string; color: string }[];
  items: { cat_idx: number; name_es: string; name_en: string; price: number; allergens?: string[]; prep_time?: number; station?: string }[];
  tables: number;
  zones: string[];
}

const RESTAURANTS: Restaurant[] = [
  {
    name: "La Pizzeria di Marco",
    slug: "pizzeria-marco",
    currency: "EUR",
    tax_rate: 10,
    locale: "it",
    plan: "pro",
    categories: [
      { name_es: "Pizzas", name_en: "Pizzas", icon: "🍕", color: "#e74c3c" },
      { name_es: "Pastas", name_en: "Pastas", icon: "🍝", color: "#f39c12" },
      { name_es: "Ensaladas", name_en: "Salads", icon: "🥗", color: "#27ae60" },
      { name_es: "Bebidas", name_en: "Drinks", icon: "🥤", color: "#3498db" },
      { name_es: "Postres", name_en: "Desserts", icon: "🍰", color: "#9b59b6" },
    ],
    items: [
      { cat_idx: 0, name_es: "Margherita", name_en: "Margherita", price: 9.50, allergens: ["gluten", "lactose"], prep_time: 12, station: "Horno" },
      { cat_idx: 0, name_es: "Pepperoni", name_en: "Pepperoni", price: 11.90, allergens: ["gluten", "lactose"], prep_time: 12, station: "Horno" },
      { cat_idx: 0, name_es: "Quattro Formaggi", name_en: "Four Cheese", price: 12.50, allergens: ["gluten", "lactose"], prep_time: 14, station: "Horno" },
      { cat_idx: 0, name_es: "Diavola", name_en: "Diavola", price: 12.90, allergens: ["gluten", "lactose"], prep_time: 12, station: "Horno" },
      { cat_idx: 0, name_es: "Prosciutto e Funghi", name_en: "Ham & Mushroom", price: 13.50, allergens: ["gluten", "lactose"], prep_time: 14, station: "Horno" },
      { cat_idx: 0, name_es: "Calzone", name_en: "Calzone", price: 11.50, allergens: ["gluten", "lactose"], prep_time: 15, station: "Horno" },
      { cat_idx: 1, name_es: "Spaghetti Carbonara", name_en: "Spaghetti Carbonara", price: 10.90, allergens: ["gluten", "eggs", "lactose"], prep_time: 10, station: "Cocina" },
      { cat_idx: 1, name_es: "Penne Arrabiata", name_en: "Penne Arrabiata", price: 9.50, allergens: ["gluten"], prep_time: 10, station: "Cocina" },
      { cat_idx: 1, name_es: "Lasagna", name_en: "Lasagna", price: 12.90, allergens: ["gluten", "lactose", "eggs"], prep_time: 15, station: "Cocina" },
      { cat_idx: 1, name_es: "Ravioli de Ricotta", name_en: "Ricotta Ravioli", price: 13.50, allergens: ["gluten", "lactose", "eggs"], prep_time: 12, station: "Cocina" },
      { cat_idx: 2, name_es: "Ensalada Caesar", name_en: "Caesar Salad", price: 8.90, allergens: ["gluten", "eggs", "fish"], prep_time: 5, station: "Cocina" },
      { cat_idx: 2, name_es: "Caprese", name_en: "Caprese", price: 7.50, allergens: ["lactose"], prep_time: 5, station: "Cocina" },
      { cat_idx: 3, name_es: "Coca Cola", name_en: "Coca Cola", price: 2.50, prep_time: 1, station: "Barra" },
      { cat_idx: 3, name_es: "Agua Mineral", name_en: "Mineral Water", price: 1.80, prep_time: 1, station: "Barra" },
      { cat_idx: 3, name_es: "Vino Tinto (copa)", name_en: "Red Wine (glass)", price: 4.50, prep_time: 1, station: "Barra" },
      { cat_idx: 3, name_es: "Cerveza Moretti", name_en: "Moretti Beer", price: 3.50, prep_time: 1, station: "Barra" },
      { cat_idx: 4, name_es: "Tiramisu", name_en: "Tiramisu", price: 6.50, allergens: ["eggs", "lactose", "gluten"], prep_time: 3, station: "Cocina" },
      { cat_idx: 4, name_es: "Panna Cotta", name_en: "Panna Cotta", price: 5.90, allergens: ["lactose"], prep_time: 3, station: "Cocina" },
    ],
    tables: 12,
    zones: ["Terraza", "Interior", "Barra"],
  },
  {
    name: "Sakura Sushi Bar",
    slug: "sakura-sushi",
    currency: "EUR",
    tax_rate: 10,
    locale: "es",
    plan: "pro",
    categories: [
      { name_es: "Sushi Rolls", name_en: "Sushi Rolls", icon: "🍣", color: "#e74c3c" },
      { name_es: "Nigiri", name_en: "Nigiri", icon: "🍙", color: "#f39c12" },
      { name_es: "Ramen", name_en: "Ramen", icon: "🍜", color: "#e67e22" },
      { name_es: "Entrantes", name_en: "Starters", icon: "🥟", color: "#27ae60" },
      { name_es: "Bebidas", name_en: "Drinks", icon: "🍵", color: "#3498db" },
    ],
    items: [
      { cat_idx: 0, name_es: "California Roll", name_en: "California Roll", price: 8.90, allergens: ["fish", "gluten"], prep_time: 8, station: "Sushi" },
      { cat_idx: 0, name_es: "Dragon Roll", name_en: "Dragon Roll", price: 12.90, allergens: ["fish", "gluten"], prep_time: 10, station: "Sushi" },
      { cat_idx: 0, name_es: "Salmon Avocado", name_en: "Salmon Avocado", price: 10.50, allergens: ["fish"], prep_time: 8, station: "Sushi" },
      { cat_idx: 0, name_es: "Spicy Tuna", name_en: "Spicy Tuna", price: 11.90, allergens: ["fish", "gluten"], prep_time: 8, station: "Sushi" },
      { cat_idx: 0, name_es: "Tempura Roll", name_en: "Tempura Roll", price: 10.90, allergens: ["fish", "gluten", "crustaceans"], prep_time: 10, station: "Sushi" },
      { cat_idx: 1, name_es: "Nigiri Salmon (2u)", name_en: "Salmon Nigiri (2pc)", price: 5.50, allergens: ["fish"], prep_time: 5, station: "Sushi" },
      { cat_idx: 1, name_es: "Nigiri Atun (2u)", name_en: "Tuna Nigiri (2pc)", price: 6.50, allergens: ["fish"], prep_time: 5, station: "Sushi" },
      { cat_idx: 1, name_es: "Nigiri Langostino (2u)", name_en: "Prawn Nigiri (2pc)", price: 6.90, allergens: ["crustaceans"], prep_time: 5, station: "Sushi" },
      { cat_idx: 2, name_es: "Ramen Tonkotsu", name_en: "Tonkotsu Ramen", price: 13.90, allergens: ["gluten", "eggs", "soy"], prep_time: 12, station: "Cocina" },
      { cat_idx: 2, name_es: "Ramen Miso", name_en: "Miso Ramen", price: 12.90, allergens: ["gluten", "soy"], prep_time: 12, station: "Cocina" },
      { cat_idx: 3, name_es: "Edamame", name_en: "Edamame", price: 4.50, allergens: ["soy"], prep_time: 3, station: "Cocina" },
      { cat_idx: 3, name_es: "Gyozas (6u)", name_en: "Gyoza (6pc)", price: 7.50, allergens: ["gluten", "soy"], prep_time: 8, station: "Cocina" },
      { cat_idx: 3, name_es: "Tempura Verduras", name_en: "Vegetable Tempura", price: 8.50, allergens: ["gluten"], prep_time: 7, station: "Cocina" },
      { cat_idx: 4, name_es: "Te Verde", name_en: "Green Tea", price: 2.50, prep_time: 2, station: "Barra" },
      { cat_idx: 4, name_es: "Sake", name_en: "Sake", price: 5.50, prep_time: 1, station: "Barra" },
      { cat_idx: 4, name_es: "Cerveza Asahi", name_en: "Asahi Beer", price: 3.90, prep_time: 1, station: "Barra" },
    ],
    tables: 10,
    zones: ["Barra Sushi", "Salon", "Privado"],
  },
  {
    name: "Café Central",
    slug: "cafe-central",
    currency: "EUR",
    tax_rate: 10,
    locale: "es",
    plan: "starter",
    categories: [
      { name_es: "Cafes", name_en: "Coffee", icon: "☕", color: "#6d4c41" },
      { name_es: "Desayunos", name_en: "Breakfast", icon: "🍳", color: "#ff9800" },
      { name_es: "Sandwiches", name_en: "Sandwiches", icon: "🥪", color: "#4caf50" },
      { name_es: "Dulces", name_en: "Sweets", icon: "🧁", color: "#e91e63" },
      { name_es: "Zumos", name_en: "Juices", icon: "🧃", color: "#ff5722" },
    ],
    items: [
      { cat_idx: 0, name_es: "Espresso", name_en: "Espresso", price: 1.50, prep_time: 2, station: "Barra" },
      { cat_idx: 0, name_es: "Cafe con Leche", name_en: "Latte", price: 2.20, allergens: ["lactose"], prep_time: 3, station: "Barra" },
      { cat_idx: 0, name_es: "Cappuccino", name_en: "Cappuccino", price: 2.50, allergens: ["lactose"], prep_time: 3, station: "Barra" },
      { cat_idx: 0, name_es: "Cafe Americano", name_en: "Americano", price: 1.80, prep_time: 2, station: "Barra" },
      { cat_idx: 0, name_es: "Flat White", name_en: "Flat White", price: 3.00, allergens: ["lactose"], prep_time: 3, station: "Barra" },
      { cat_idx: 1, name_es: "Tostada con Tomate", name_en: "Toast with Tomato", price: 3.50, allergens: ["gluten"], prep_time: 5, station: "Cocina" },
      { cat_idx: 1, name_es: "Tostada con Aguacate", name_en: "Avocado Toast", price: 5.50, allergens: ["gluten"], prep_time: 5, station: "Cocina" },
      { cat_idx: 1, name_es: "Huevos Revueltos", name_en: "Scrambled Eggs", price: 4.90, allergens: ["eggs"], prep_time: 7, station: "Cocina" },
      { cat_idx: 1, name_es: "Croissant", name_en: "Croissant", price: 2.20, allergens: ["gluten", "lactose", "eggs"], prep_time: 2, station: "Cocina" },
      { cat_idx: 2, name_es: "Club Sandwich", name_en: "Club Sandwich", price: 7.90, allergens: ["gluten", "eggs"], prep_time: 8, station: "Cocina" },
      { cat_idx: 2, name_es: "Sandwich Vegetal", name_en: "Veggie Sandwich", price: 6.50, allergens: ["gluten"], prep_time: 7, station: "Cocina" },
      { cat_idx: 3, name_es: "Tarta de Queso", name_en: "Cheesecake", price: 4.90, allergens: ["gluten", "lactose", "eggs"], prep_time: 2, station: "Cocina" },
      { cat_idx: 3, name_es: "Brownie", name_en: "Brownie", price: 3.90, allergens: ["gluten", "eggs", "lactose"], prep_time: 2, station: "Cocina" },
      { cat_idx: 4, name_es: "Zumo de Naranja", name_en: "Orange Juice", price: 3.50, prep_time: 3, station: "Barra" },
      { cat_idx: 4, name_es: "Smoothie de Frutas", name_en: "Fruit Smoothie", price: 4.50, prep_time: 4, station: "Barra" },
    ],
    tables: 8,
    zones: ["Terraza", "Interior"],
  },
  {
    name: "Taco Loco",
    slug: "taco-loco",
    currency: "EUR",
    tax_rate: 10,
    locale: "es",
    plan: "pro",
    categories: [
      { name_es: "Tacos", name_en: "Tacos", icon: "🌮", color: "#f44336" },
      { name_es: "Burritos", name_en: "Burritos", icon: "🌯", color: "#ff9800" },
      { name_es: "Quesadillas", name_en: "Quesadillas", icon: "🧀", color: "#ffc107" },
      { name_es: "Nachos & Extras", name_en: "Nachos & Extras", icon: "🫔", color: "#4caf50" },
      { name_es: "Bebidas", name_en: "Drinks", icon: "🍹", color: "#00bcd4" },
    ],
    items: [
      { cat_idx: 0, name_es: "Taco al Pastor", name_en: "Taco al Pastor", price: 3.50, prep_time: 5, station: "Plancha" },
      { cat_idx: 0, name_es: "Taco de Carnitas", name_en: "Carnitas Taco", price: 3.90, prep_time: 5, station: "Plancha" },
      { cat_idx: 0, name_es: "Taco de Pollo", name_en: "Chicken Taco", price: 3.50, prep_time: 5, station: "Plancha" },
      { cat_idx: 0, name_es: "Taco Vegano", name_en: "Vegan Taco", price: 3.90, prep_time: 5, station: "Plancha" },
      { cat_idx: 1, name_es: "Burrito de Carne", name_en: "Beef Burrito", price: 8.90, allergens: ["gluten", "lactose"], prep_time: 8, station: "Plancha" },
      { cat_idx: 1, name_es: "Burrito de Pollo", name_en: "Chicken Burrito", price: 8.50, allergens: ["gluten", "lactose"], prep_time: 8, station: "Plancha" },
      { cat_idx: 1, name_es: "Burrito Vegetal", name_en: "Veggie Burrito", price: 7.90, allergens: ["gluten"], prep_time: 7, station: "Plancha" },
      { cat_idx: 2, name_es: "Quesadilla de Queso", name_en: "Cheese Quesadilla", price: 6.50, allergens: ["gluten", "lactose"], prep_time: 6, station: "Plancha" },
      { cat_idx: 2, name_es: "Quesadilla Mixta", name_en: "Mixed Quesadilla", price: 8.50, allergens: ["gluten", "lactose"], prep_time: 7, station: "Plancha" },
      { cat_idx: 3, name_es: "Nachos con Guacamole", name_en: "Nachos with Guacamole", price: 7.90, allergens: ["gluten"], prep_time: 5, station: "Cocina" },
      { cat_idx: 3, name_es: "Elote en Vaso", name_en: "Corn Cup", price: 4.50, allergens: ["lactose"], prep_time: 3, station: "Cocina" },
      { cat_idx: 3, name_es: "Guacamole & Chips", name_en: "Guacamole & Chips", price: 6.90, prep_time: 4, station: "Cocina" },
      { cat_idx: 4, name_es: "Margarita", name_en: "Margarita", price: 6.50, prep_time: 3, station: "Barra" },
      { cat_idx: 4, name_es: "Corona", name_en: "Corona Beer", price: 3.50, prep_time: 1, station: "Barra" },
      { cat_idx: 4, name_es: "Agua de Jamaica", name_en: "Hibiscus Water", price: 2.50, prep_time: 1, station: "Barra" },
      { cat_idx: 4, name_es: "Horchata", name_en: "Horchata", price: 3.00, allergens: ["nuts"], prep_time: 1, station: "Barra" },
    ],
    tables: 10,
    zones: ["Terraza", "Barra", "Interior"],
  },
  {
    name: "Le Petit Bistro",
    slug: "petit-bistro",
    currency: "EUR",
    tax_rate: 10,
    locale: "fr",
    plan: "enterprise",
    categories: [
      { name_es: "Entrantes", name_en: "Starters", icon: "🥖", color: "#795548" },
      { name_es: "Platos Principales", name_en: "Main Courses", icon: "🍽️", color: "#9c27b0" },
      { name_es: "Mariscos", name_en: "Seafood", icon: "🦞", color: "#03a9f4" },
      { name_es: "Vinos", name_en: "Wines", icon: "🍷", color: "#880e4f" },
      { name_es: "Postres", name_en: "Desserts", icon: "🍮", color: "#e91e63" },
    ],
    items: [
      { cat_idx: 0, name_es: "Sopa de Cebolla", name_en: "French Onion Soup", price: 8.90, allergens: ["gluten", "lactose"], prep_time: 10, station: "Cocina" },
      { cat_idx: 0, name_es: "Foie Gras", name_en: "Foie Gras", price: 16.90, allergens: ["gluten"], prep_time: 5, station: "Cocina" },
      { cat_idx: 0, name_es: "Ensalada Nicoise", name_en: "Nicoise Salad", price: 10.50, allergens: ["fish", "eggs"], prep_time: 7, station: "Cocina" },
      { cat_idx: 1, name_es: "Magret de Pato", name_en: "Duck Breast", price: 22.90, prep_time: 18, station: "Cocina" },
      { cat_idx: 1, name_es: "Filet Mignon", name_en: "Filet Mignon", price: 28.90, prep_time: 20, station: "Cocina" },
      { cat_idx: 1, name_es: "Coq au Vin", name_en: "Coq au Vin", price: 19.90, allergens: ["gluten"], prep_time: 15, station: "Cocina" },
      { cat_idx: 1, name_es: "Ratatouille", name_en: "Ratatouille", price: 14.90, prep_time: 12, station: "Cocina" },
      { cat_idx: 2, name_es: "Salmón a la Plancha", name_en: "Grilled Salmon", price: 21.90, allergens: ["fish"], prep_time: 15, station: "Cocina" },
      { cat_idx: 2, name_es: "Bouillabaisse", name_en: "Bouillabaisse", price: 24.90, allergens: ["fish", "crustaceans", "gluten"], prep_time: 20, station: "Cocina" },
      { cat_idx: 3, name_es: "Bordeaux (copa)", name_en: "Bordeaux (glass)", price: 7.50, prep_time: 1, station: "Barra" },
      { cat_idx: 3, name_es: "Champagne (copa)", name_en: "Champagne (glass)", price: 12.00, prep_time: 1, station: "Barra" },
      { cat_idx: 3, name_es: "Chablis (copa)", name_en: "Chablis (glass)", price: 8.50, prep_time: 1, station: "Barra" },
      { cat_idx: 4, name_es: "Crème Brûlée", name_en: "Crème Brûlée", price: 7.90, allergens: ["eggs", "lactose"], prep_time: 5, station: "Cocina" },
      { cat_idx: 4, name_es: "Tarte Tatin", name_en: "Tarte Tatin", price: 8.50, allergens: ["gluten", "lactose", "eggs"], prep_time: 5, station: "Cocina" },
      { cat_idx: 4, name_es: "Mousse de Chocolate", name_en: "Chocolate Mousse", price: 6.90, allergens: ["eggs", "lactose"], prep_time: 3, station: "Cocina" },
    ],
    tables: 14,
    zones: ["Terraza", "Salon Principal", "Salon Privado", "Barra"],
  },
];

// ── Customer names for orders ────────────────────────────
const CUSTOMER_NAMES = [
  "Maria Garcia", "Carlos Lopez", "Ana Martinez", "Pedro Sanchez",
  "Laura Fernandez", "Diego Ruiz", "Sofia Torres", "Miguel Hernandez",
  "Carmen Diaz", "Javier Moreno", "Isabel Jimenez", "Alejandro Romero",
  "Paula Navarro", "Daniel Alonso", "Elena Gutierrez", "Francisco Molina",
  "Lucia Ortiz", "Alberto Serrano", "Marta Dominguez", "Ricardo Vazquez",
  "Andrea Gil", "Fernando Ramos", "Natalia Iglesias", "Pablo Medina",
  "Valentina Ruiz", "Raul Castro", "Eva Prieto", "Hugo Sanz",
  "Claudia Blanco", "Adrian Perez", "Rosa Morales", "Ivan Suarez",
];

const ORDER_TYPES = ["dine_in", "dine_in", "dine_in", "takeaway", "delivery", "qr"];
const SOURCES = ["pos", "pos", "pos", "takeaway", "delivery", "qr"];
const STATUSES = ["confirmed", "confirmed", "preparing", "preparing", "ready", "ready", "served", "served", "closed", "closed", "closed", "paid"];
const PAY_METHODS = ["cash", "cash", "card", "card", "card", "mixed"];

function randomEl<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomTime(hoursAgo: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - randomInt(0, hoursAgo * 60));
  return d.toISOString();
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   ORDY POS — SEEDING 5 DEMO RESTAURANTS        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  for (const rest of RESTAURANTS) {
    console.log(`\n🏪 ${rest.name} (${rest.slug})`);

    // ── 1. Create tenant ──────────────────────────────
    // Check if exists first
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", rest.slug)
      .single();

    let tenantId: string;

    if (existing) {
      tenantId = existing.id;
      console.log(`   ⚠️  Tenant already exists (${tenantId}), skipping creation`);
      // Clean existing data
      await supabase.from("payments").delete().eq("tenant_id", tenantId);
      await supabase.from("order_items").delete().eq("tenant_id", tenantId);
      await supabase.from("orders").delete().eq("tenant_id", tenantId);
      await supabase.from("menu_items").delete().eq("tenant_id", tenantId);
      await supabase.from("menu_categories").delete().eq("tenant_id", tenantId);
      await supabase.from("restaurant_tables").delete().eq("tenant_id", tenantId);
      console.log("   🗑️  Cleaned old data");
    } else {
      const { data: tenant, error } = await supabase
        .from("tenants")
        .insert({
          name: rest.name,
          slug: rest.slug,
          currency: rest.currency,
          tax_rate: rest.tax_rate,
          tax_included: true,
          locale: rest.locale,
          plan: rest.plan,
          active: true,
          settings: {
            order_modes: { dine_in: true, takeaway: true, delivery: true },
          },
          business_hours: {},
          receipt_config: { enabled: true, header_text: rest.name, footer_text: "¡Gracias por su visita!" },
        })
        .select("id")
        .single();

      if (error || !tenant) {
        console.error(`   ❌ Failed to create tenant:`, error?.message);
        continue;
      }
      tenantId = tenant.id;
      console.log(`   ✅ Tenant created (${tenantId})`);
    }

    // ── 2. Create categories ──────────────────────────
    const categoryIds: string[] = [];
    for (let i = 0; i < rest.categories.length; i++) {
      const cat = rest.categories[i];
      const { data, error } = await supabase
        .from("menu_categories")
        .insert({
          tenant_id: tenantId,
          name_es: cat.name_es,
          name_en: cat.name_en,
          name_fr: cat.name_en,
          name_de: cat.name_en,
          name_it: cat.name_en,
          icon: cat.icon,
          color: cat.color,
          sort_order: i,
          active: true,
        })
        .select("id")
        .single();

      if (data) categoryIds.push(data.id);
    }
    console.log(`   📂 ${categoryIds.length} categories created`);

    // ── 3. Create menu items ──────────────────────────
    const menuItemIds: { id: string; price: number; name: string; station: string | null }[] = [];
    for (const item of rest.items) {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          tenant_id: tenantId,
          category_id: categoryIds[item.cat_idx] || null,
          name_es: item.name_es,
          name_en: item.name_en,
          name_fr: item.name_en,
          name_de: item.name_en,
          name_it: item.name_en,
          price: item.price,
          allergens: item.allergens || [],
          prep_time_minutes: item.prep_time || 10,
          kds_station: item.station || null,
          available: true,
          active: true,
        })
        .select("id")
        .single();

      if (data) menuItemIds.push({ id: data.id, price: item.price, name: item.name_es, station: item.station || null });
    }
    console.log(`   🍽️  ${menuItemIds.length} menu items created`);

    // ── 4. Create tables ──────────────────────────────
    const tableIds: string[] = [];
    for (let i = 1; i <= rest.tables; i++) {
      const { data } = await supabase
        .from("restaurant_tables")
        .insert({
          tenant_id: tenantId,
          number: String(i),
          label: `Mesa ${i}`,
          capacity: randomInt(2, 8),
          shape: randomEl(["square", "round", "rectangle"]),
          status: "available",
          active: true,
          pos_x: ((i - 1) % 4) * 120 + 50,
          pos_y: Math.floor((i - 1) / 4) * 120 + 50,
        })
        .select("id")
        .single();

      if (data) tableIds.push(data.id);
    }
    console.log(`   🪑 ${tableIds.length} tables created`);

    // ── 5. Create 35 orders with items and payments ───
    let orderCount = 0;
    const TOTAL_ORDERS = 35;

    for (let o = 0; o < TOTAL_ORDERS; o++) {
      const orderType = randomEl(ORDER_TYPES);
      const source = orderType === "delivery" ? "delivery" : orderType === "takeaway" ? "takeaway" : orderType === "qr" ? "qr" : "pos";
      const status = randomEl(STATUSES);
      const customer = randomEl(CUSTOMER_NAMES);
      const tableId = orderType === "dine_in" ? randomEl(tableIds) : null;

      // Pick 1-5 random items
      const numItems = randomInt(1, 5);
      const orderItems: typeof menuItemIds[number][] = [];
      for (let i = 0; i < numItems; i++) {
        orderItems.push(randomEl(menuItemIds));
      }

      const subtotal = Math.round(orderItems.reduce((s, it) => s + it.price * randomInt(1, 2), 0) * 100) / 100;
      const taxAmount = 0; // tax included
      const tipAmount = Math.random() > 0.6 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
      const total = Math.round((subtotal + tipAmount) * 100) / 100;
      const payMethod = randomEl(PAY_METHODS);
      const isPaid = ["closed", "paid", "served"].includes(status);
      const createdAt = randomTime(48); // last 48 hours

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenantId,
          table_id: tableId,
          order_type: orderType,
          status,
          customer_name: customer,
          customer_phone: `+34${randomInt(600000000, 699999999)}`,
          subtotal,
          tax_amount: taxAmount,
          tip_amount: tipAmount,
          total,
          source,
          payment_status: isPaid ? "paid" : "pending",
          payment_method: isPaid ? payMethod : null,
          confirmed_at: createdAt,
          created_at: createdAt,
          metadata: orderType === "delivery" ? { delivery_address: `Calle ${randomInt(1, 100)}, ${randomInt(1, 50)}` } : {},
        })
        .select("id")
        .single();

      if (!order) continue;

      // Order items
      const itemRows = orderItems.map((it, idx) => {
        const qty = randomInt(1, 2);
        return {
          order_id: order.id,
          tenant_id: tenantId,
          menu_item_id: it.id,
          name: it.name,
          quantity: qty,
          unit_price: it.price,
          modifiers: [],
          modifiers_total: 0,
          subtotal: Math.round(it.price * qty * 100) / 100,
          kds_station: it.station,
          kds_status: status === "confirmed" ? "pending" : status === "preparing" ? "preparing" : "ready",
        };
      });

      await supabase.from("order_items").insert(itemRows);

      // Payment if paid
      if (isPaid) {
        await supabase.from("payments").insert({
          tenant_id: tenantId,
          order_id: order.id,
          amount: total,
          method: payMethod === "mixed" ? "cash" : payMethod,
          status: "completed",
          tip_amount: tipAmount,
          created_at: createdAt,
        });
      }

      orderCount++;
    }

    console.log(`   📦 ${orderCount} orders created (with items + payments)`);
    console.log(`   ✅ ${rest.name} — COMPLETE`);
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         ALL 5 RESTAURANTS SEEDED!               ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║                                                  ║");
  RESTAURANTS.forEach((r) => {
    console.log(`║  🏪 ${r.name.padEnd(42)}║`);
  });
  console.log("║                                                  ║");
  console.log("║  Each has: menu, tables, 35 orders, payments    ║");
  console.log("║                                                  ║");
  console.log("║  To login as each tenant, create a user in      ║");
  console.log("║  Supabase Auth linked to the tenant_id           ║");
  console.log("╚══════════════════════════════════════════════════╝");
}

main().catch(console.error);
