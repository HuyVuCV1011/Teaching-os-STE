import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export const supabaseBrowser = supabase

export function getSupabaseServer(useServiceRole = false) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (useServiceRole && !serviceRoleKey) {
    throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required')
  }

  const key = useServiceRole ? serviceRoleKey! : supabaseKey

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

