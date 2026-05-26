'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BookOpen,
  Users,
  GraduationCap,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Plus,
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    coursesCount: 0,
    classesCount: 0,
    submissionsPending: 0,
    subjectsCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Query database stats (handle errors gracefully since Supabase is resetting)
        const [
          { count: coursesCount },
          { count: classesCount },
          { count: submissionsCount },
          { count: subjectsCount },
        ] = await Promise.all([
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('subjects').select('*', { count: 'exact', head: true }),
        ])

        setStats({
          coursesCount: coursesCount || 0,
          classesCount: classesCount || 0,
          submissionsPending: submissionsCount || 0,
          subjectsCount: subjectsCount || 0,
        })
      } catch (err) {
        console.error('Failed to fetch dashboard statistics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const cards = [
    {
      title: 'Subjects Taxonomy',
      description: 'Define key learning paths and disciplines.',
      count: stats.subjectsCount,
      href: '/admin/library?tab=subjects',
      icon: FolderOpen,
      color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/20 text-cyan-400',
    },
    {
      title: 'Course Catalog',
      description: 'Manage syllabi, modules, and reusable lessons.',
      count: stats.coursesCount,
      href: '/admin/library?tab=courses',
      icon: BookOpen,
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-600',
    },
    {
      title: 'Active Class Cohorts',
      description: 'Set code locks, calendars, and schedules.',
      count: stats.classesCount,
      href: '/admin/classes',
      icon: Users,
      color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20 text-violet-400',
    },
    {
      title: 'Ungraded Submissions',
      description: 'Evaluate student tasks against rubrics.',
      count: stats.submissionsPending,
      href: '/admin/grading',
      icon: GraduationCap,
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-8 shadow-xl">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Welcome Back, Operator
          </h1>
          <p className="text-slate-400 max-w-xl text-sm">
            Configure subjects, course syllabi, release schedules, and grade student submissions from your central terminal.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`border rounded-2xl bg-gradient-to-br ${card.color} p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200 group relative`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <card.icon className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </span>
              </div>
              <div>
                {loading ? (
                  <div className="h-9 w-12 bg-slate-800 rounded animate-pulse" />
                ) : (
                  <span className="text-3xl font-extrabold text-slate-100">{card.count}</span>
                )}
                <h3 className="font-bold text-slate-200 mt-2">{card.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{card.description}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/20 flex justify-end">
              <Link
                href={card.href}
                className="text-xs font-semibold flex items-center gap-1 hover:text-slate-100 transition-colors"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Quick Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Actions */}
        <div className="lg:col-span-2 border border-slate-800 bg-slate-900/20 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Quick Setup Workflows
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/library?tab=courses&action=new"
              className="p-4 rounded-xl border border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-800/10 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-200 group-hover:text-slate-100">Create New Course</h4>
                <p className="text-xs text-slate-500 mt-0.5">Author a course syllabus and add modules.</p>
              </div>
            </Link>

            <Link
              href="/admin/classes?action=new"
              className="p-4 rounded-xl border border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-800/10 transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-200 group-hover:text-slate-100">Setup Cohort Access</h4>
                <p className="text-xs text-slate-500 mt-0.5">Generate class access codes & set dates.</p>
              </div>
            </Link>
          </div>
        </div>

        {/* System Logs / Info */}
        <div className="border border-slate-800 bg-slate-900/20 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">System Status</h2>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Database Engine</span>
              <span className="font-semibold text-slate-200">Supabase PG</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Next.js Framework</span>
              <span className="font-semibold text-slate-200">v15 App Router</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">File Storage Bucket</span>
              <span className="font-semibold text-slate-200">teaching-materials</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px]">
              <span className="text-slate-500">Security Standard</span>
              <span className="font-bold text-emerald-400 uppercase tracking-widest">RLS Activated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
