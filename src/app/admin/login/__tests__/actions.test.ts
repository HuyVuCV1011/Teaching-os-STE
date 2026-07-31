import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserClient, signInWithPassword, signOut, redirect } = vi.hoisted(() => ({
  getUserClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: getUserClient,
}))

vi.mock('next/navigation', () => ({ redirect }))

import { loginAdminAction } from '../actions'

function formData(email = 'teacher@example.com', password = 'StrongPassword!123', next = '/admin') {
  const data = new FormData()
  data.set('email', email)
  data.set('password', password)
  data.set('next', next)
  return data
}

describe('loginAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserClient.mockResolvedValue({ auth: { signInWithPassword, signOut } })
    signOut.mockResolvedValue({ error: null })
  })

  it('rejects malformed credentials before calling Supabase', async () => {
    const result = await loginAdminAction({ error: null }, formData('invalid', 'short'))
    expect(result.error).toMatch(/không hợp lệ/i)
    expect(getUserClient).not.toHaveBeenCalled()
  })

  it('signs out authenticated users without an allowed admin role', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-1', app_metadata: { role: 'student' } },
        session: { access_token: 'test' },
      },
      error: null,
    })

    const result = await loginAdminAction({ error: null }, formData())
    expect(result.error).toMatch(/tài khoản quản trị/i)
    expect(signOut).toHaveBeenCalledOnce()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects an allowed role to a safe admin destination', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'admin-1', app_metadata: { role: 'teacher' } },
        session: { access_token: 'test' },
      },
      error: null,
    })

    await loginAdminAction({ error: null }, formData('teacher@example.com', 'StrongPassword!123', '/admin/grading'))
    expect(redirect).toHaveBeenCalledWith('/admin/grading')
  })

  it('falls back to the dashboard for a login-loop destination', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'admin-1', app_metadata: { role: 'admin' } },
        session: { access_token: 'test' },
      },
      error: null,
    })

    await loginAdminAction({ error: null }, formData('admin@example.com', 'StrongPassword!123', '/admin/login?next=/admin'))
    expect(redirect).toHaveBeenCalledWith('/admin')
  })
})
