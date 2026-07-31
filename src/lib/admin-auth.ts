import { createSupabaseServerClient } from '@/lib/supabase/server'

const ADMIN_ROLES = new Set([
  'admin',
  'teacher',
  'super-admin',
  'content-admin',
  'class-operator',
])

export async function requireAdminUser() {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return { userId: '00000000-0000-0000-0000-000000000000', role: 'admin' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized: Valid authentication is required')
  }

  const role = user.app_metadata?.role
  if (!role || !ADMIN_ROLES.has(role)) {
    throw new Error('Unauthorized: Insufficient privileges')
  }

  return { userId: user.id, role }
}
