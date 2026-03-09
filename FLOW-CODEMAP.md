# ORDY POS - Order Flow Codemap (Diagnostic)

> Lock file: `flow-lock.sha256` | Verifier: `bash verify-flow-lock.sh`
> If a file shows CHANGED, use this map to go DIRECTLY to the fix.

---

## Flow Overview

```
QR Scan → Menu API → Customer UI (DE) → Order API → DB (ES) → KDS (ES) → Served → Payment → Receipt → Close
```

## File Index (15 locked files)

| # | File | Role | Lines |
|---|------|------|-------|
| 1 | `src/app/qr/[slug]/[table]/page.tsx` | Customer QR menu + ordering | ~700 |
| 2 | `src/app/api/public/menu/route.ts` | Public menu API (GET) | ~110 |
| 3 | `src/app/api/public/order/route.ts` | Public order API (POST/GET) | ~170 |
| 4 | `src/app/(app)/kds/page.tsx` | Kitchen display system | ~830 |
| 5 | `src/app/(app)/orders/page.tsx` | Order management | ~2900 |
| 6 | `src/app/(app)/payments/page.tsx` | Payment recording + refunds | ~700 |
| 7 | `src/lib/translate-memory.ts` | Translation localStorage cache | ~96 |
| 8 | `src/app/api/ai/translate-text/route.ts` | Single-term AI translation | ~36 |
| 9 | `src/app/api/ai/translate-menu/route.ts` | Bulk AI translation | ~120 |
| 10 | `src/middleware.ts` | Auth + public route allowlist | ~40 |
| 11 | `src/lib/supabase-browser.ts` | Supabase client (browser) | ~20 |
| 12 | `src/lib/api-auth.ts` | API auth helper | ~25 |
| 13 | `src/lib/i18n-provider.tsx` | Language context provider | ~60 |
| 14 | `src/lib/translations.ts` | UI translations (5 langs) | ~2500 |
| 15 | `src/lib/utils.ts` | formatCurrency, timeAgo, etc. | ~80 |

---

## Critical Functions by Step

### STEP 1: Customer scans QR → Menu loads

**File: `src/app/api/public/menu/route.ts`**

| Function | Line | What it does |
|----------|------|-------------|
| `GET()` | 4 | Resolves tenant by slug, fetches table, categories, items (all 5 langs), modifier groups, modifiers, item-modifier links |

- Tenant lookup: ~line 16-25
- Table lookup: ~line 32-39
- Categories fetch: ~line 43-48
- Items fetch (with name_es/en/fr/de/it, description_*): ~line 51-58
- Modifier groups + modifiers: ~line 60-91
- Response assembly: ~line 93-109

**If menu fails to load:** Check tenant.slug matches URL, check items.available=true, check RLS policies on menu_items/menu_categories.

---

### STEP 2: Customer browses menu in their language

**File: `src/app/qr/[slug]/[table]/page.tsx`**

| Function | Line | What it does |
|----------|------|-------------|
| `localName()` | 129 | Returns `name_{lang}` for customer display, fallback es→en |
| `localDesc()` | 134 | Returns `description_{lang}` for customer, fallback es→en |
| `tenantName()` | 139 | Returns `name_{tenantLocale}` for KDS. **THIS IS THE DUAL-LANGUAGE KEY** |
| `loadMenu()` | 192 | Fetches `/api/public/menu?slug&table`, populates state |
| `openDetail()` | 251 | Opens item modal with modifiers |
| `toggleMod()` | 265 | Toggles modifier selection (respects max_select) |
| `addToCart()` | 280 | Adds item + modifiers + qty + notes to cart |

**If items show wrong language:** Check `localName()` at line 129 — it reads `name_{lang}` key. If field is empty, falls back to `name_es`.

**If translations are missing:** Items need `name_de`, `name_fr`, etc. populated in DB. Run bulk translate: POST `/api/ai/translate-menu`.

---

### STEP 3: Customer submits order → Converted to tenant language

**File: `src/app/qr/[slug]/[table]/page.tsx`**

| Function | Line | What it does |
|----------|------|-------------|
| `sendOrder()` | 304 | **THE CRITICAL FUNCTION** — maps cart items via `tenantName()` to tenant's language, POSTs to order API |

```
Line 309: const tenantLang = (tenant.locale || "es") as Lang
Line 311: name: tenantName(item, tenantLang)       ← CONVERTS TO SPANISH
Line 314: name: tenantName(mod, tenantLang)         ← MODIFIERS TOO
Line 322: customerLang: lang                        ← STORES CUSTOMER LANG
```

**If KDS shows wrong language:** Check `tenantName()` at line 139, verify `tenant.locale` is "es". If tenant.locale is wrong, fix in DB: `UPDATE tenants SET locale='es' WHERE slug='bonets-grill'`.

---

### STEP 4: Order created in DB

**File: `src/app/api/public/order/route.ts`**

| Function | Line | What it does |
|----------|------|-------------|
| `POST()` | 15 | Creates order + order_items, marks table occupied |
| `GET()` | 142 | Returns order status for customer polling |

**POST critical points:**
- Payload extraction: ~line 17-31
- Tenant validation by slug: ~line 40-49
- Table resolution: ~line 52-62
- Tax calculation: ~line 65-72 (subtotal × tax_rate/100 if !tax_included)
- Order insert: ~line 75-97 (status="confirmed", metadata={customer_lang})
- Order items insert: ~line 100-121 (name in TENANT language, kds_status="pending")
- Table status → "occupied": ~line 124-129

**If order creation fails:** Check RLS on `orders` table (service role should bypass). Check all required columns: tenant_id, status, subtotal, total.

**If table not marked occupied:** Check line 124-129, verify table_id is resolved.

---

### STEP 5: KDS receives order in Spanish

**File: `src/app/(app)/kds/page.tsx`**

| Function | Line | What it does |
|----------|------|-------------|
| `fetchOrders()` | 160 | Loads confirmed/preparing/ready orders with their items |
| `markPreparing()` | 265 | Items → "preparing", order → "preparing" |
| `markReady()` | 278 | Items → "ready", order → "ready" (if ALL items ready) |
| `bumpOrder()` | 301 | Items → "served", order → "served" |
| `recallOrder()` | 317 | Undo bump — restores previous statuses |
| `playBeep()` | 73 | Audio alert (880Hz) for new orders |

**Realtime subscriptions:** ~line 213-242
- Channel `kds-orders`: listens to `orders` table → triggers fetchOrders()
- Channel `kds-items`: listens to `order_items` table → triggers fetchOrders()

**If KDS doesn't update in realtime:** Check Supabase realtime is enabled for `orders` and `order_items` tables. Check channel subscription at line 217-235.

**If orders don't appear:** Check fetchOrders() filter: `status IN (confirmed, preparing, ready)` at line 162-167. If order has different status, it won't show.

---

### STEP 6: Order lifecycle transitions

```
confirmed → preparing → ready → served → closed
                                    ↑ payment registered
```

**KDS controls:** confirmed → preparing → ready → served (via bumpOrder)
**Orders page controls:** Any status change, cancel, close
**Payments page controls:** Record payment → order.payment_status="paid"

---

### STEP 7: Payment

**File: `src/app/(app)/payments/page.tsx`**

| Function | Line | What it does |
|----------|------|-------------|
| `fetchData()` | 177 | Loads payments with daily summary |
| `openManualModal()` | 303 | Opens payment dialog, fetches unpaid orders |
| `handleManualPayment()` | 342 | Creates payment record, updates order |
| `handleRefund()` | 263 | Creates refund (negative), updates order status |
| `exportCsv()` | 374 | CSV export of payments |

**Payment record:** `{ order_id, method: "cash"|"card", amount, tip_amount, status: "completed" }`

**If payment fails:** Check `payments` table RLS, check order_id FK constraint.

---

## Symptom → Fix Quick Reference

| Symptom | File | Line | Fix |
|---------|------|------|-----|
| Menu doesn't load | api/public/menu/route.ts | 16-25 | Check tenant slug, active status |
| Items show in Spanish instead of customer lang | qr/.../page.tsx | 129 | Check `localName()` — field `name_{lang}` might be empty |
| KDS shows items in customer language, not Spanish | qr/.../page.tsx | 139 | Check `tenantName()` — verify `tenant.locale` = "es" |
| Order not created | api/public/order/route.ts | 75-97 | Check RLS on orders table, check required fields |
| Table not occupied after order | api/public/order/route.ts | 124-129 | Check table_id resolution |
| KDS doesn't show new order | kds/page.tsx | 160-167 | Check order.status is "confirmed", check realtime channels |
| KDS no audio alert | kds/page.tsx | 73 | Check playBeep(), browser might block AudioContext |
| KDS realtime stopped | kds/page.tsx | 213-242 | Check Supabase realtime enabled, check channel subscriptions |
| Status not updating for customer | api/public/order/route.ts | 142-166 | Check GET handler, verify orderId param |
| Payment not recording | payments/page.tsx | 342 | Check payments table RLS, check amount > 0 |
| Refund fails | payments/page.tsx | 263-299 | Check original payment exists, check order_id FK |
| Auth blocks QR pages | middleware.ts | 25-29 | Ensure /qr path is in public allowlist |
| Translation missing | translate-memory.ts | 74-96 | Run bulk translate or check localStorage cache |
| Wrong currency format | lib/utils.ts | formatCurrency | Check tenant.currency field |

---

## Database Tables in Flow

| Table | Key Columns | Role |
|-------|-------------|------|
| `tenants` | id, slug, locale, currency, tax_rate, tax_included | Restaurant config |
| `restaurant_tables` | id, number, status, current_order_id | Table tracking |
| `menu_categories` | name_es/en/fr/de/it, icon, sort_order | Menu structure |
| `menu_items` | name_es/en/fr/de/it, description_*, price, available | Products |
| `modifier_groups` | name_es/en/fr/de/it, required, min/max_select | Modifier groups |
| `modifiers` | name_es/en/fr/de/it, price_delta, group_id | Modifier options |
| `menu_item_modifier_groups` | item_id, group_id | Item↔Group links |
| `orders` | order_number, status, payment_status, metadata, table_id | Orders |
| `order_items` | name (TENANT LANG), quantity, modifiers, kds_status | Line items |
| `payments` | order_id, method, amount, tip_amount, status | Payments |

---

## Dual-Language Architecture

```
                    ┌──────────────────────┐
                    │   SUPABASE DB        │
                    │                      │
                    │  menu_items:         │
                    │    name_es: "Entrantes"│
                    │    name_de: "Vorspeisen"│
                    │    name_en: "Starters" │
                    │    name_fr: "Entrees"  │
                    │    name_it: "Antipasti" │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
          localName()    tenantName()    KDS display
          (line 129)     (line 139)     reads order_items.name
                │              │              │
        ┌───────┴──────┐ ┌────┴─────┐  ┌─────┴──────┐
        │ Customer UI  │ │ Order DB │  │  Kitchen   │
        │ Shows: DE    │ │ Stores:ES│  │  Shows: ES │
        │ "Vorspeisen" │ │"Entrantes│  │ "Entrantes"│
        └──────────────┘ └──────────┘  └────────────┘
```

**The key function is `tenantName()` at line 139 of the QR page.**
It ensures that regardless of what language the customer sees, the order is ALWAYS stored in the tenant's configured language.
