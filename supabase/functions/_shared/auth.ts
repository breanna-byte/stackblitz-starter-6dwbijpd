import { createClient } from 'npm:@supabase/supabase-js@2'

// Every function needs two clients: one scoped to the caller (to verify
// who's asking, via their JWT) and one with the service role (to touch
// plaid_items, which has no client-facing RLS policy at all — see
// schema.sql). Mixing these up would either leak the service role's
// power to an unverified caller or fail to reach plaid_items at all.
export async function getCallerAndAdminClient(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing Authorization header')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await callerClient.auth.getUser()
  if (error || !data.user) throw new Error('Not signed in')

  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  return { user: data.user, adminClient }
}
