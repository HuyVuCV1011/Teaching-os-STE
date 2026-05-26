'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Map,
  BookOpen,
  GraduationCap,
  ChevronRight,
  LogOut,
  Sparkles,
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
  ]

  const handleLogout = () => {
    // Clear student session cookie
    document.cookie = `class_session_${classCode}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
    router.push('/learn')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur-xl flex flex-col justify-between shrink-0 sticky top-0 h-screen z-20">
        <div>
          {/* Header/Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block text-sm">STE Workspace</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Student Portal</span>
            </div>
          </div>

          {/* Class Cohort Identifier */}
          <div className="p-4 mx-4 my-3 rounded-xl bg-slate-900/50 border border-slate-850">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-16 bg-slate-850 rounded" />
                <div className="h-4 w-32 bg-slate-850 rounded" />
              </div>
            ) : classInfo ? (
              <>
                <span className="block text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                  Class: {classInfo.class_code}
                </span>
                <span className="block text-xs font-bold text-slate-200 truncate mt-0.5">
                  {classInfo.name}
                </span>
              </>
            ) : (
              <span className="block text-xs text-slate-500 italic">Cohorts offline</span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href

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

        {/* Footer/Logout Action */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-200"
          >
            <span>Exit Classroom</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
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
