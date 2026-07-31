import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { AdminLoginForm } from './AdminLoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập quản trị | Teaching OS',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const destination = typeof next === 'string' && next.startsWith('/admin') ? next : '/admin'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-xl sm:p-8" aria-labelledby="admin-login-title">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
          <ShieldCheck aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Teaching OS</p>
        <h1 id="admin-login-title" className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
          Đăng nhập quản trị
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Chỉ tài khoản đã được cấp vai trò quản trị hoặc giảng viên trong Supabase mới có thể truy cập.
        </p>

        <AdminLoginForm destination={destination} />

        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-200">
          Quay về trang Showcase
        </Link>
      </section>
    </main>
  )
}
