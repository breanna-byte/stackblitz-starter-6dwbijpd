// Called right after Teller Connect succeeds in the browser. Unlike
// Plaid, Teller Connect's onSuccess callback already hands back a usable
// access token directly — there's no separate "exchange" call to Teller.
// This function's job is just to get that token off the client and into
// server-only storage, and pull the account list.
import { corsHeaders } from '../_shared/cors.ts'
import { tellerFetch } from '../_shared/teller.ts'
import { getCallerAndAdminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { user, adminClient } = await getCallerAndAdminClient(req)
    const { accessToken, enrollmentId, institutionName } = await req.json()
    if (!accessToken || !enrollmentId) throw new Error('Missing accessToken or enrollmentId')

    const { data: enrollment, error: enrollErr } = await adminClient
      .from('teller_enrollments')
      .insert({ owner: user.id, enrollment_id: enrollmentId, access_token: accessToken, institution_name: institutionName || null })
      .select()
      .single()
    if (enrollErr) throw enrollErr

    // VERIFY: response shape assumed as [{ id, name, last_four, type,
    // subtype, institution: { name } }, ...] per Teller's /accounts docs.
    const accounts = await tellerFetch('/accounts', accessToken)
    const rows = (accounts || []).map((a: any) => ({
      teller_enrollment_id: enrollment.id,
      account_id: a.id,
      name: a.name,
      mask: a.last_four,
      type: a.type,
      subtype: a.subtype,
    }))
    if (rows.length) {
      const { error: acctErr } = await adminClient.from('bank_accounts').upsert(rows, { onConflict: 'account_id' })
      if (acctErr) throw acctErr
    }

    return new Response(JSON.stringify({ ok: true, accounts: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
