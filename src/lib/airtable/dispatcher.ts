/**
 * Airtable Dispatcher — Direct POS → Airtable integration
 * No Zapier needed. Sends records directly via Airtable REST API.
 * Multi-tenant: resolves tenant name dynamically per request.
 */

import { createServiceClient } from '@/lib/supabase-server'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID

// In-memory tenant name cache (avoids repeated DB lookups)
const tenantNameCache = new Map<string, { name: string; expiry: number }>()

/**
 * Resolve tenant name from tenant ID (cached for 5 minutes)
 */
export async function getTenantName(tenantId: string): Promise<string> {
  const cached = tenantNameCache.get(tenantId)
  if (cached && cached.expiry > Date.now()) return cached.name

  try {
    const svc = createServiceClient()
    const { data } = await svc.from('tenants').select('name').eq('id', tenantId).single()
    const name = data?.name || tenantId
    tenantNameCache.set(tenantId, { name, expiry: Date.now() + 5 * 60 * 1000 })
    return name
  } catch {
    return tenantId
  }
}

// Table names as they appear in Airtable (used directly in API URL)
const TABLE_NAMES: Record<string, string> = {
  orders: 'Orders',
  order_items: 'Order Items',
  payments: 'payments',
  whatsapp_messages: 'whatsapp_messages',
  reservations: 'reservations',
  loyalty: 'loyalty',
  daily_summaries: 'daily_summaries',
  system_alerts: 'system_alerts',
  menu_changes: 'menu_changes',
  cash_shifts: 'Cash Shifts',
  cash_movements: 'Cash Movements',
  kds_events: 'KDS Events',
  menu_items: 'Menu Items',
  menu_categories: 'Menu Categories',
  modifier_groups: 'Modifier Groups',
  modifiers: 'Modifiers',
  loyalty_customers: 'Loyalty Customers',
  loyalty_tiers: 'Loyalty Tiers',
  loyalty_rewards: 'Loyalty Rewards',
  loyalty_campaigns: 'Loyalty Campaigns',
  restaurant_tables: 'Restaurant Tables',
  zones: 'Zones',
  staff: 'Staff',
  kds_stations: 'KDS Stations',
  wa_sessions: 'WhatsApp Sessions',
}

/**
 * Send a single record to an Airtable table
 */
export async function sendToAirtable(
  table: keyof typeof TABLE_NAMES,
  fields: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[Airtable] Missing API key or Base ID — skipping')
    return { success: false, error: 'Missing config' }
  }

  const tableName = TABLE_NAMES[table]
  if (!tableName) {
    console.warn(`[Airtable] No table name for "${table}" — skipping`)
    return { success: false, error: `Unknown table: ${table}` }
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ fields }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Airtable] Error writing to ${table}:`, err)
      return { success: false, error: err }
    }

    const data = await res.json()
    const recordId = data.records?.[0]?.id
    return { success: true, id: recordId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Airtable] Network error for ${table}:`, message)
    return { success: false, error: message }
  }
}

/**
 * Send multiple records to an Airtable table (batch, max 10 per request)
 */
export async function sendBatchToAirtable(
  table: keyof typeof TABLE_NAMES,
  records: Record<string, unknown>[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { success: false, error: 'Missing config' }
  }

  const tableName = TABLE_NAMES[table]
  if (!tableName) {
    return { success: false, error: `Unknown table: ${table}` }
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`
  const batches: Record<string, unknown>[][] = []

  // Airtable allows max 10 records per request
  for (let i = 0; i < records.length; i += 10) {
    batches.push(records.slice(i, i + 10))
  }

  let totalCreated = 0

  for (const batch of batches) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: batch.map((fields) => ({ fields })),
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error(`[Airtable] Batch error for ${table}:`, err)
        return { success: false, count: totalCreated, error: err }
      }

      const data = await res.json()
      totalCreated += data.records?.length ?? 0
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[Airtable] Batch network error for ${table}:`, message)
      return { success: false, count: totalCreated, error: message }
    }
  }

  return { success: true, count: totalCreated }
}

/**
 * Fire-and-forget: send to Airtable without blocking the API response
 * Use this in API routes so the user doesn't wait for Airtable
 */
export function sendToAirtableAsync(
  table: keyof typeof TABLE_NAMES,
  fields: Record<string, unknown>
): void {
  sendToAirtable(table, fields).catch((err) => {
    console.error(`[Airtable] Async dispatch failed for ${table}:`, err)
  })
}
