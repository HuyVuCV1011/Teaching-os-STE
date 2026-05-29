'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Briefcase,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'

const navigationItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Library CMS', href: '/admin/library', icon: BookOpen },
  { name: 'Classes', href: '/admin/classes', icon: Users },
  { name: 'Grading', href: '/admin/grading', icon: GraduationCap },
  { name: 'Projects CMS', href: '/admin/projects', icon: Briefcase },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-700 bg-slate-900/40 backdrop-blur-xl flex flex-col justify-between shrink-0 sticky top-0 h-screen z-10">
        <div>
          {/* Header/Logo */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block text-xs">Teaching OS</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block">Admin Panel</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-l-2 border-blue-500 text-blue-600 bg-slate-900/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer/Profile */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
              AD
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-slate-300 truncate">Administrator</span>
              <span className="block text-[10px] text-slate-500 truncate">admin@ste-education.org</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen relative z-20">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-700 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">System Mode:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live & Secure
            </span>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            Return to Showcase
          </Link>
        </header>

        {/* Child Pages Wrapper */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
