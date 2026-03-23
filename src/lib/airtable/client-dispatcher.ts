/**
 * Airtable Client Dispatcher — for React frontend components
 * Sends records to Airtable via a lightweight API route (avoids exposing API key in browser)
 */

export function sendToAirtableFromClient(
  table: string,
  fields: Record<string, unknown>
): void {
  fetch('/api/airtable/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, fields }),
  }).catch((err) => {
    console.error(`[Airtable Client] Failed to sync ${table}:`, err)
  })
}
