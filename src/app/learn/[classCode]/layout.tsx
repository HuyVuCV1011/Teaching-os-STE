'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Map,
  BookOpen,
  GraduationCap,
  ChevronRight,
  LogOut,
  Sparkles,
  FileText,
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ classCode: string }>
}

export default function LearnerLayout({ children, params }: LayoutProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const pathname = usePathname()
  const router = useRouter()

  const [classInfo, setClassInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isZenMode, setIsZenMode] = useState(false)

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
    async function fetchClassInfo() {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (data) {
          setClassInfo(data)
        }
      } catch (err) {
        console.error('Error fetching cohort data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classCode) {
      fetchClassInfo()
    }
  }, [classCode])

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

  const handleLogout = () => {
    // Clear student session cookie
    document.cookie = `class_session_${classCode}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
    router.push('/learn')
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden">
      {/* Subtle organic light mode glow accents in background */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-500/[0.03] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.03] blur-[130px] pointer-events-none" />

      {/* Sidebar: Premium Floating White surface over off-white layout background */}
      <aside className={`border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between shrink-0 sticky top-0 h-screen z-20 shadow-[0_4px_30px_rgba(0,0,0,0.01)] transition-all duration-300 ${
        isZenMode ? 'w-0 opacity-0 -translate-x-full border-r-0 pointer-events-none' : 'w-64 opacity-100 translate-x-0'
      }`}>
        <div>
          {/* Header/Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-slate-100 block text-sm">STE Workspace</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Student Portal</span>
            </div>
          </div>

          {/* Class Cohort Identifier: Styled like a premium ID badge */}
          <div className="p-4 mx-4 my-4 rounded-xl bg-slate-900 border border-slate-800">
            {loading ? (
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
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
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
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-500/5 transition-all duration-200 border-0 cursor-pointer"
          >
            <span>Exit Classroom</span>
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        {/* Child Pages Wrapper */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
