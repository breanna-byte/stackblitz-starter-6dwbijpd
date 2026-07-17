// Thin wrapper over Plaid's REST API — no SDK dependency, just fetch,
// since these functions only ever call three endpoints.

const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox' // 'sandbox' | 'development' | 'production'
const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
const PLAID_SECRET = Deno.env.get('PLAID_SECRET')

const BASE_URL = `https://${PLAID_ENV}.plaid.com`

export async function plaidFetch(path: string, body: Record<string, unknown>) {
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    throw new Error('PLAID_CLIENT_ID / PLAID_SECRET are not set. Run `supabase secrets set` for both.')
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, ...body }),
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(`Plaid ${path} failed: ${json.error_code || res.status} — ${json.error_message || 'unknown error'}`)
  }
  return json
}
