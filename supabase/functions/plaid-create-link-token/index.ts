// Called when the user clicks "Connect a bank account." Returns a
// short-lived link_token that the browser hands to Plaid Link — the
// browser never sees your Plaid client_id/secret.
import { corsHeaders } from '../_shared/cors.ts'
import { plaidFetch } from '../_shared/plaid.ts'
import { getCallerAndAdminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { user } = await getCallerAndAdminClient(req)

    const json = await plaidFetch('/link/token/create', {
      user: { client_user_id: user.id },
      client_name: 'FieldLedger',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    })

    return new Response(JSON.stringify({ link_token: json.link_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
