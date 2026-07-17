// Thin wrapper over Teller's REST API. Teller authenticates each request
// with HTTP Basic auth: the access token as the username, blank password
// — there's no separate client_id/secret exchange step like Plaid.
//
// VERIFY BEFORE DEPLOYING: Teller's production environment (not sandbox)
// is documented as requiring mutual TLS — a client certificate issued
// from your Teller dashboard — in addition to this Basic auth header.
// Deno's fetch supports client certs via Deno.createHttpClient, but that
// isn't wired up here since it can't be tested without a real cert. If
// `teller-sync-transactions` / `teller-store-enrollment` get TLS errors
// in production (sandbox should work fine without this), that's almost
// certainly why — check https://teller.io/docs/api/authentication for
// the current requirement and add the cert via Deno.createHttpClient.

const BASE_URL = 'https://api.teller.io'

export async function tellerFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Basic ${btoa(`${accessToken}:`)}`,
    },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(`Teller ${path} failed: ${res.status} — ${json.error?.message || 'unknown error'}`)
  }
  return json
}
