'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ADMIN_ROLES = new Set([
  'admin',
  'teacher',
  'super-admin',
  'content-admin',
  'class-operator',
])

export type AdminLoginState = {
  error: string | null
}

function safeAdminDestination(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/admin') || value.startsWith('/admin/login')) {
    return '/admin'
  }

  return value
}

export async function loginAdminAction(
  _previousState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const email = formData.get('email')
  const password = formData.get('password')
  const destination = safeAdminDestination(formData.get('next'))

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.length > 254 ||
    password.length > 1024 ||
    !email.includes('@') ||
    password.length < 8
  ) {
    return { error: 'Email hoặc mật khẩu không hợp lệ.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  const role = data.user?.app_metadata?.role
  if (error || !data.user || typeof role !== 'string' || !ADMIN_ROLES.has(role)) {
    if (data.session) {
      await supabase.auth.signOut()
    }
    return { error: 'Không thể đăng nhập bằng tài khoản quản trị này.' }
  }

  redirect(destination)
}
