'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react'

const navigationSections = [
  {
    label: 'Giảng dạy',
    items: [
      { name: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
      { name: 'Thư viện nội dung', href: '/admin/library', icon: BookOpen },
      { name: 'Lớp học', href: '/admin/classes', icon: Users },
      { name: 'Chấm bài', href: '/admin/grading', icon: GraduationCap },
    ],
  },
  {
    label: 'Showcase',
    items: [
      { name: 'Dự án công khai', href: '/admin/projects', icon: Briefcase },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [adminUser, setAdminUser] = useState<{ email?: string; role?: string } | null>(null)

  useEffect(() => {
    async function loadAdminUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setAdminUser({
            email: user.email,
            role: user.app_metadata?.role || 'Admin'
          })
        }
      } catch (err) {
        console.error('Error loading admin user metadata:', err)
      }
    }
    loadAdminUser()
  }, [])

  const initialAvatarLetters = adminUser?.email
    ? adminUser.email.slice(0, 2).toUpperCase()
    : 'OP'

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileSidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    const menuButton = mobileMenuButtonRef.current
    document.body.style.overflow = 'hidden'

    const sidebar = mobileSidebarRef.current
    const getFocusableElements = () => Array.from(
      sidebar?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    )

    getFocusableElements()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsMobileMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      menuButton?.focus()
    }
  }, [isMobileMenuOpen])

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold focus:shadow-lg focus:outline-none"
      >
        Đi tới nội dung chính
      </a>

      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={mobileSidebarRef}
        id="admin-navigation"
        aria-label="Điều hướng quản trị"
        className={`fixed inset-y-0 left-0 z-40 w-56 border-r border-slate-700 bg-slate-950 flex flex-col justify-between shrink-0 transition-transform duration-300 md:translate-x-0 md:sticky md:top-0 md:h-screen ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      >
        <div>
          {/* Header/Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-slate-100 block text-xs">Teaching OS</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Quản trị</span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-200 md:hidden border-0 cursor-pointer bg-transparent"
              aria-label="Đóng menu điều hướng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4 p-3">
            {navigationSections.map((section) => (
              <div key={section.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(item.href)

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group flex items-center justify-between rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                          isActive
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                            : 'border-transparent text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`h-4 w-4 ${
                              isActive ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>
                        {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-600" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer/Profile */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-350 border border-slate-700">
              {initialAvatarLetters}
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-slate-350 truncate">
                {adminUser?.role ? adminUser.role.charAt(0).toUpperCase() + adminUser.role.slice(1) : 'Administrator'}
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                {adminUser?.email || 'admin@ste-education.org'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 min-h-screen relative z-20 focus:outline-none">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-105 hover:bg-slate-900 md:hidden border-0 cursor-pointer bg-transparent"
              aria-label="Mở menu điều hướng"
              aria-controls="admin-navigation"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Môi trường:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600 shadow-sm flex items-center gap-1 uppercase tracking-wider">
                {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-105 transition-colors flex items-center gap-1.5 bg-slate-900 border border-slate-800/60 px-2.5 py-1.5 rounded-lg shadow-sm"
          >
            Về trang Showcase
          </Link>
        </header>

        {/* Child Pages Wrapper */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
