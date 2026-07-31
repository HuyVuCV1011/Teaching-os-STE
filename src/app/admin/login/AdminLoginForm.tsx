'use client'

import { useActionState } from 'react'
import { LockKeyhole, LoaderCircle, Mail } from 'lucide-react'
import { loginAdminAction, type AdminLoginState } from './actions'

const initialState: AdminLoginState = { error: null }

export function AdminLoginForm({ destination }: { destination: string }) {
  const [state, formAction, pending] = useActionState(loginAdminAction, initialState)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={destination} />

      <div>
        <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-slate-200">
          Email quản trị
        </label>
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/40 pl-10 pr-4 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="teacher@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-200">
          Mật khẩu
        </label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={1024}
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/40 pl-10 pr-4 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Nhập mật khẩu"
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-0 bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <LockKeyhole aria-hidden="true" className="h-4 w-4" />}
        {pending ? 'Đang xác thực…' : 'Đăng nhập quản trị'}
      </button>
    </form>
  )
}
