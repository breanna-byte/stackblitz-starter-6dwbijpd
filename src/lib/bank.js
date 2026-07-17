import { supabase } from '../supabaseClient'

export function rowToBankAccount(r) {
  return { id: r.id, tellerEnrollmentId: r.teller_enrollment_id, name: r.name, mask: r.mask, type: r.type, subtype: r.subtype }
}

// Thin wrappers over the two Edge Functions in supabase/functions/ — see
// that folder for what each one actually does server-side. Errors from
// supabase.functions.invoke land in `error`, not a thrown exception, so
// each wrapper normalizes that into a thrown Error the caller can catch
// with a plain try/catch.

export async function storeEnrollment({ accessToken, enrollmentId, institutionName }) {
  const { data, error } = await supabase.functions.invoke('teller-store-enrollment', {
    body: { accessToken, enrollmentId, institutionName },
  })
  if (error) throw new Error(error.message || 'Failed to finish bank connection')
  return data
}

export async function syncTransactions() {
  const { data, error } = await supabase.functions.invoke('teller-sync-transactions')
  if (error) throw new Error(error.message || 'Failed to sync transactions')
  return data
}
