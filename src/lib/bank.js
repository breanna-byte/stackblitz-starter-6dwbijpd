import { supabase } from '../supabaseClient'

export function rowToBankAccount(r) {
  return { id: r.id, plaidItemId: r.plaid_item_id, name: r.name, mask: r.mask, type: r.type, subtype: r.subtype }
}

// Thin wrappers over the three Edge Functions in supabase/functions/ —
// see that folder for what each one actually does server-side. Errors
// from supabase.functions.invoke land in `error`, not a thrown exception,
// so each wrapper normalizes that into a thrown Error the caller can
// catch with a plain try/catch.

export async function createLinkToken() {
  const { data, error } = await supabase.functions.invoke('plaid-create-link-token')
  if (error) throw new Error(error.message || 'Failed to start bank connection')
  return data.link_token
}

export async function exchangePublicToken(publicToken, institutionName) {
  const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
    body: { public_token: publicToken, institution_name: institutionName },
  })
  if (error) throw new Error(error.message || 'Failed to finish bank connection')
  return data
}

export async function syncTransactions() {
  const { data, error } = await supabase.functions.invoke('plaid-sync-transactions')
  if (error) throw new Error(error.message || 'Failed to sync transactions')
  return data
}
