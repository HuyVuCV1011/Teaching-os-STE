import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export const supabaseBrowser = supabase

export function getSupabaseServer(useServiceRole = false) {
  const key = useServiceRole
    ? (process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey)
    : supabaseKey

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

