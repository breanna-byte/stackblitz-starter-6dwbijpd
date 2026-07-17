// Called from the "Sync now" button. Pulls transactions for every
// connected account — shared across the whole team — and writes them
// into the transactions table.
//
// THIS FILE HAS NOT BEEN VERIFIED AGAINST A REAL TELLER RESPONSE (no
// network access to Teller from the environment this was built in).
// Three things to double-check against a real sandbox transaction the
// first time this runs — log one raw `t` object and compare:
//   1. Sign convention for `amount` — assumed here as Teller's documented
//      convention (negative = money out, positive = money in), the
//      OPPOSITE of Plaid's. If income/expenses come out swapped, this is
//      why.
//   2. `t.details.category` — assumed to hold a category string; exact
//      enum values are a best guess mapped below, unmapped ones land in
//      'Other' either way so a wrong guess here is low-risk, just less
//      accurate.
//   3. Pagination — assumed `count` + `from_id` query params per Teller's
//      docs. Capped at 20 pages/account/run as a safety valve in case
//      that assumption is wrong and the loop can't terminate itself.
import { corsHeaders } from '../_shared/cors.ts'
import { tellerFetch } from '../_shared/teller.ts'
import { getCallerAndAdminClient } from '../_shared/auth.ts'

const EXPENSE_MAP: Record<string, string> = {
  transportation: 'Fuel',
  fuel: 'Fuel',
  home: 'Materials',
  shopping: 'Materials',
  general: 'Office',
  utilities: 'Office',
  service: 'Subcontractor',
}
const INCOME_MAP: Record<string, string> = {
  income: 'Job payment',
  deposit: 'Deposit',
}

function categorize(amount: number, category: string | undefined) {
  const key = (category || '').toLowerCase()
  if (amount < 0) return { type: 'expense', category: EXPENSE_MAP[key] || 'Other', amount: -amount }
  return { type: 'income', category: INCOME_MAP[key] || 'Other', amount }
}

const MAX_PAGES_PER_ACCOUNT = 20

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { adminClient } = await getCallerAndAdminClient(req)

    const { data: enrollments, error: enrollErr } = await adminClient.from('teller_enrollments').select('*')
    if (enrollErr) throw enrollErr

    let added = 0

    for (const enrollment of enrollments || []) {
      const { data: accounts } = await adminClient
        .from('bank_accounts').select('id, account_id').eq('teller_enrollment_id', enrollment.id)

      for (const account of accounts || []) {
        let fromId: string | undefined
        for (let page = 0; page < MAX_PAGES_PER_ACCOUNT; page++) {
          const qs = new URLSearchParams({ count: '100', ...(fromId ? { from_id: fromId } : {}) })
          const txns = await tellerFetch(`/accounts/${account.account_id}/transactions?${qs}`, enrollment.access_token)
          if (!txns?.length) break

          const rows = txns.map((t: any) => {
            const cat = categorize(Number(t.amount), t.details?.category)
            return {
              teller_transaction_id: t.id,
              bank_account_id: account.id,
              type: cat.type,
              category: cat.category,
              amount: cat.amount,
              vendor_or_source: t.details?.counterparty?.name || t.description || 'Bank transaction',
              date: t.date,
              status: t.status === 'pending' ? 'recorded' : 'recorded',
              pending: t.status === 'pending',
              notes: null,
            }
          })
          const { error } = await adminClient.from('transactions').upsert(rows, { onConflict: 'teller_transaction_id' })
          if (error) throw error
          added += rows.length

          if (txns.length < 100) break
          fromId = txns[txns.length - 1].id
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, added }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
