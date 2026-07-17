// Called right after Plaid Link succeeds in the browser, with the
// short-lived public_token it returned. Exchanges it for a permanent
// access_token (which never leaves this function) and records the
// linked accounts.
import { corsHeaders } from '../_shared/cors.ts'
import { plaidFetch } from '../_shared/plaid.ts'
import { getCallerAndAdminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { user, adminClient } = await getCallerAndAdminClient(req)
    const { public_token, institution_name } = await req.json()
    if (!public_token) throw new Error('Missing public_token')

    const exchange = await plaidFetch('/item/public_token/exchange', { public_token })
    const { access_token, item_id } = exchange

    const { data: item, error: itemErr } = await adminClient
      .from('plaid_items')
      .insert({ owner: user.id, item_id, access_token, institution_name: institution_name || null })
      .select()
      .single()
    if (itemErr) throw itemErr

    const accountsRes = await plaidFetch('/accounts/get', { access_token })
    const accounts = (accountsRes.accounts || []).map((a: any) => ({
      plaid_item_id: item.id,
      account_id: a.account_id,
      name: a.name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
    }))
    if (accounts.length) {
      const { error: acctErr } = await adminClient.from('bank_accounts').upsert(accounts, { onConflict: 'account_id' })
      if (acctErr) throw acctErr
    }

    return new Response(JSON.stringify({ ok: true, accounts: accounts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
