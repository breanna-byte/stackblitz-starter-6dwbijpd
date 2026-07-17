// Called from the "Sync now" button (or could be put on a schedule
// later). Pulls new/changed/removed transactions for every connected
// bank account — shared across the whole team, not just the caller's own
// connections — and writes them straight into the transactions table.
//
// Sign convention (Plaid, depository/credit accounts): positive amount =
// money out (a purchase/payment), negative = money in (a deposit). That's
// converted to this app's { type: 'income'|'expense', amount: positive }
// shape below. Synced transactions only ever become 'income' or
// 'expense' — never 'bill', since a bill here means a due-date obligation
// tracked *before* it's paid, and a synced transaction already happened.
import { corsHeaders } from '../_shared/cors.ts'
import { plaidFetch } from '../_shared/plaid.ts'
import { getCallerAndAdminClient } from '../_shared/auth.ts'

const EXPENSE_MAP: Record<string, string> = {
  TRANSPORTATION: 'Fuel',
  GENERAL_MERCHANDISE: 'Materials',
  HOME_IMPROVEMENT: 'Materials',
  RENT_AND_UTILITIES: 'Office',
  GENERAL_SERVICES: 'Subcontractor',
}
const INCOME_MAP: Record<string, string> = {
  TRANSFER_IN: 'Deposit',
  INCOME: 'Job payment',
}

function categorize(amount: number, primary: string | undefined) {
  if (amount > 0) return { type: 'expense', category: EXPENSE_MAP[primary || ''] || 'Other', amount }
  return { type: 'income', category: INCOME_MAP[primary || ''] || 'Other', amount: -amount }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { adminClient } = await getCallerAndAdminClient(req)

    const { data: items, error: itemsErr } = await adminClient.from('plaid_items').select('*')
    if (itemsErr) throw itemsErr

    let added = 0, modified = 0, removed = 0

    for (const item of items || []) {
      const { data: accounts } = await adminClient
        .from('bank_accounts').select('id, account_id').eq('plaid_item_id', item.id)
      const accountIdByPlaidId = new Map((accounts || []).map((a: any) => [a.account_id, a.id]))

      let cursor = item.cursor || undefined
      let hasMore = true
      while (hasMore) {
        const page = await plaidFetch('/transactions/sync', { access_token: item.access_token, cursor })

        const upserts = [...page.added, ...page.modified].map((t: any) => {
          const cat = categorize(t.amount, t.personal_finance_category?.primary)
          return {
            plaid_transaction_id: t.transaction_id,
            bank_account_id: accountIdByPlaidId.get(t.account_id) || null,
            type: cat.type,
            category: cat.category,
            amount: cat.amount,
            vendor_or_source: t.merchant_name || t.name || 'Bank transaction',
            date: t.date,
            status: 'recorded',
            pending: Boolean(t.pending),
            notes: null,
          }
        })
        if (upserts.length) {
          const { error } = await adminClient.from('transactions').upsert(upserts, { onConflict: 'plaid_transaction_id' })
          if (error) throw error
          added += page.added.length
          modified += page.modified.length
        }

        if (page.removed?.length) {
          const ids = page.removed.map((t: any) => t.transaction_id)
          const { error } = await adminClient.from('transactions').delete().in('plaid_transaction_id', ids)
          if (error) throw error
          removed += ids.length
        }

        cursor = page.next_cursor
        hasMore = page.has_more
      }

      await adminClient.from('plaid_items').update({ cursor }).eq('id', item.id)
    }

    return new Response(JSON.stringify({ ok: true, added, modified, removed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
