'use client'

import React, { useEffect, useRef, useState, use } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Map,
  GraduationCap,
  ChevronRight,
  LogOut,
  Sparkles,
  FileText,
  Menu,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { LearnerProvider, useLearner } from './LearnerContext'
import { toast } from 'react-hot-toast'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ classCode: string }>
}

export default function LearnerLayout({ children, params }: LayoutProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const pathname = usePathname()
  const router = useRouter()

  return (
    <LearnerProvider classCode={classCode} pathname={pathname} router={router}>
      <LearnerLayoutInner classCode={classCode} pathname={pathname} router={router}>
        {children}
      </LearnerLayoutInner>
    </LearnerProvider>
  )
}

function LearnerLayoutInner({
  children,
  classCode,
  pathname,
  router
}: {
  children: React.ReactNode
  classCode: string
  pathname: string
  router: any
}) {
  const { isAdminPreview, identityVerified, identityError, classInfo, loadingClassInfo } = useLearner()
  const [isZenMode, setIsZenMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileSidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Check initial state from localStorage
    const saved = localStorage.getItem('zen_mode') === 'true'
    setIsZenMode(saved)

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent
      setIsZenMode(customEvent.detail)
    }

    window.addEventListener('toggle-zen-mode', handleToggle)
    return () => window.removeEventListener('toggle-zen-mode', handleToggle)
  }, [])

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

  const navigationItems = [
    {
      name: 'Learning Roadmap',
      href: `/learn/${classCode}/dashboard`,
      icon: Map,
    },
    {
      name: 'Assignments',
      href: `/learn/${classCode}/assignments`,
      icon: FileText,
    },
    {
      name: 'My Marks & Grades',
      href: `/learn/${classCode}/grades`,
      icon: GraduationCap,
    },
  ]

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const response = await fetch('/api/v1/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classCode }),
      })

      if (!response.ok) {
        throw new Error('The server could not clear the classroom session.')
      }

      router.replace('/learn')
      router.refresh()
    } catch (err) {
      console.error('Secure logout failed:', err)
      toast.error('Không thể đăng xuất an toàn. Vui lòng thử lại.')
    } finally {
      setLoggingOut(false)
    }
  }

  if (identityError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center text-slate-400">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
        <span className="text-sm font-semibold text-slate-100">Không thể xác minh lớp học</span>
        <span className="max-w-lg text-xs text-slate-500">{identityError}</span>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-550"
          >
            Thử lại
          </button>
          <Link
            href="/learn"
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Về cổng lớp học
          </Link>
        </div>
      </div>
    )
  }

  // Prevent UI flash before verification is complete
  if (!identityVerified || (loadingClassInfo && !classInfo)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Đang xác thực quyền truy cập lớp học...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden">
      {/* Skip to content link */}
      <a
        href="#learner-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold"
      >
        Skip to content
      </a>

      {/* Subtle organic light mode glow accents in background */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-500/[0.03] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.03] blur-[130px] pointer-events-none" />

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Premium Floating White surface over off-white layout background */}
      <aside
        ref={mobileSidebarRef}
        id="learner-navigation"
        aria-label="Classroom navigation"
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between shrink-0 transition-transform duration-300 md:translate-x-0 md:sticky md:top-0 md:h-screen ${
        isZenMode
          ? 'w-0 opacity-0 -translate-x-full border-r-0 pointer-events-none'
          : isMobileMenuOpen
            ? 'translate-x-0 opacity-100'
            : '-translate-x-full md:translate-x-0 opacity-100'
      }`}
      >
        <div>
          {/* Header/Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-slate-100 block text-sm">STE Workspace</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Student Portal</span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-200 md:hidden border-0 cursor-pointer bg-transparent"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Class Cohort Identifier: Styled like a premium ID badge */}
          <div className="p-4 mx-4 my-4 rounded-xl bg-slate-900 border border-slate-800">
            {loadingClassInfo ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-2.5 w-12 bg-slate-800 rounded" />
                <div className="h-3.5 w-28 bg-slate-800 rounded" />
              </div>
            ) : classInfo ? (
              <>
                <span className="block text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                  Class: {classInfo.class_code}
                </span>
                <span className="block text-xs font-bold text-slate-100 truncate mt-1">
                  {classInfo.name}
                </span>
              </>
            ) : (
              <span className="block text-xs text-slate-500 italic">Cohorts offline</span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== `/learn/${classCode}/dashboard` && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden ${
                    isActive
                      ? 'text-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  {/* Sliding active tab indicator with spring physics */}
                  {isActive && (
                    <motion.div
                      layoutId="active-student-nav"
                      className="absolute inset-0 bg-blue-500/10 border-l-2 border-blue-600 rounded-xl z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3 z-10 relative">
                    <item.icon
                      className={`w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 ${
                        isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-100'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-blue-600 z-10 relative" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer/Logout Action */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-500/5 transition-all duration-200 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loggingOut ? 'Exiting...' : 'Exit Classroom'}</span>
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
          </motion.button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="learner-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10 focus:outline-none">
        {/* Mobile Header Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between px-4 md:hidden shrink-0">
          <div className="flex items-center gap-3">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-105 hover:bg-slate-900 border-0 cursor-pointer bg-transparent"
              aria-label="Open navigation menu"
              aria-controls="learner-navigation"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            {classInfo && (
              <div>
                <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                  Class: {classInfo.class_code}
                </span>
                <span className="block text-xs font-bold text-slate-100 truncate max-w-[180px]">
                  {classInfo.name}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all border-0 cursor-pointer bg-transparent disabled:opacity-50"
            aria-label="Exit classroom"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </header>

        {/* Global Admin Preview Banner */}
        {isAdminPreview && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-2.5 shrink-0 z-20">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-200 font-medium">
              Chế độ xem trước của giáo viên — dữ liệu tiến độ cá nhân không khả dụng
            </span>
          </div>
        )}

        {/* Child Pages Wrapper */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
