import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// If no keys are set yet, the app runs in local demo mode (data lives in
// memory only) so it's usable immediately in StackBlitz before you connect
// a real Supabase project. Add your keys to .env to switch to real persistence.
export const hasSupabase = Boolean(url && key && !url.includes('YOUR-PROJECT-REF'))

export const supabase = hasSupabase ? createClient(url, key) : null
