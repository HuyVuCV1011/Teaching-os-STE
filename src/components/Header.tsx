'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

const Header = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-24 items-center bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
      <div className="container flex w-full items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/10 transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-100">
              STE Workspace
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">
              Teaching OS & Portfolio
            </span>
          </div>
        </Link>

        <nav aria-label="Điều hướng portfolio" className="hidden items-center gap-6 md:flex">
          <Link
            href="#about"
            className="text-xs font-semibold text-slate-500 transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4"
          >
            Về tôi
          </Link>
          <Link
            href="/projects"
            className="text-xs font-semibold text-slate-500 transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4"
          >
            Dự án
          </Link>
          <Link
            href="#contact"
            className="text-xs font-semibold text-slate-500 transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4"
          >
            Liên hệ
          </Link>
        </nav>

        {/* Quick Links */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/learn"
            className="hidden text-xs font-semibold text-slate-500 transition-colors duration-300 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 sm:block"
          >
            Lớp học
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 shadow-sm transition-all duration-300 hover:bg-slate-850 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 active:scale-[0.98] sm:gap-1.5 sm:px-4"
          >
            <span className="sm:hidden">Admin</span>
            <span className="hidden sm:inline">Admin Panel</span>
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
