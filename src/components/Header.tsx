'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

const Header = () => {
  return (
    <header className="absolute top-0 left-0 right-0 z-40 h-24 flex items-center">
      <div className="container flex justify-between items-center w-full">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10 transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-slate-100 text-sm block">
              STE Workspace
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
              Teaching OS & Portfolio
            </span>
          </div>
        </Link>

        {/* Quick Links */}
        <div className="flex items-center gap-4">
          <Link
            href="/learn"
            className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors duration-200 hidden sm:block"
          >
            Lớp học
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-100 hover:bg-slate-850 hover:text-slate-100 transition-all duration-200 shadow-sm flex items-center gap-1.5"
          >
            Admin Panel
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
