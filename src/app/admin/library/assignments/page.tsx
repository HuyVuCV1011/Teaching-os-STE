'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ClipboardList,
  ArrowLeft,
  Edit,
  Search,
  BookOpen,
  Sparkles,
  GraduationCap,
  FileText,
  Trash2,
} from 'lucide-react'
import { deleteAssignmentAction } from '../actions/assignments'

interface AssignmentRow {
  id: string
  title: string
  instructions: string
  max_score: number
  max_files: number
  max_total_size_mb: number
  auto_publish_grades: boolean
  late_policy: any
  ai_model_used: string
  created_at: string
  lesson: {
    id: string
    title: string
    module: {
      id: string
      title: string
      course: {
        id: string
        title: string
        subject: {
          name: string
        } | null
      } | null
    } | null
  } | null
}

export default function ManageAssignmentsPage() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAssignments()
  }, [])

  async function fetchAssignments() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          lesson:lessons (
            id,
            title,
            module:modules (
              id,
              title,
              course:courses (
                id,
                title,
                subject:subjects ( name )
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssignments(data || [])
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete assignment "${title}"?`)) return
    const res = await deleteAssignmentAction(id)
    if (res.success) {
      setAssignments(prev => prev.filter(a => a.id !== id))
    } else {
      alert(`Failed to delete: ${res.error}`)
    }
  }

  const filtered = assignments.filter(a =>
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.lesson?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.lesson?.module?.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.lesson?.module?.course?.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="p-1 rounded-[2rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 border border-slate-800/30 p-8 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-indigo-500/5 pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/library"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-slate-100 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
                <ClipboardList className="w-7 h-7 text-blue-600 shrink-0" /> Manage Assignments
              </h1>
            </div>
            <p className="text-slate-500 text-sm font-medium leading-relaxed ml-11">
              Overview of all assignments across courses. Click edit to configure in the lesson composer.
            </p>
          </div>
          <Link
            href="/admin/library"
            className="group px-5 py-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-100 font-semibold text-sm transition-all duration-300 flex items-center gap-2.5 shadow-sm active:scale-[0.98] z-10 shrink-0"
          >
            <BookOpen className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
            <span>Back to Library CMS</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search assignments, lessons, or courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-800/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-slate-950 transition-all font-medium shadow-inner"
        />
      </div>

      {/* Assignments List */}
      <div className="p-1 rounded-[2rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm">
        <div className="bg-slate-950 border border-slate-800/30 p-6 rounded-[calc(2rem-0.25rem)]">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-slate-500 text-sm font-semibold gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Loading assignments...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-800/80 rounded-2xl text-slate-500 text-sm font-medium flex flex-col items-center justify-center gap-4">
              <GraduationCap className="w-12 h-12 text-slate-700 animate-pulse" />
              <span>
                {searchQuery
                  ? `No assignments match "${searchQuery}"`
                  : 'No assignments created yet. Add one from the lesson composer.'}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((asg) => {
                const courseTitle = asg.lesson?.module?.course?.title || 'Unknown Course'
                const moduleTitle = asg.lesson?.module?.title || 'Unknown Module'
                const lessonTitle = asg.lesson?.title || 'Unknown Lesson'
                const subjectName = asg.lesson?.module?.course?.subject?.name || ''
                const policy = asg.late_policy || {}
                const graceHours = policy.grace_period_hours || 0
                const penaltyPct = policy.penalty_percent_per_day || 0

                return (
                  <div
                    key={asg.id}
                    className="p-1 rounded-2xl bg-slate-900/5 ring-1 ring-slate-800/5 hover:ring-slate-700/20 transition-all duration-300 group"
                  >
                    <div className="bg-slate-950 border border-slate-800/30 p-5 rounded-[calc(2rem-0.25rem)] flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

                      {/* Left: Icon */}
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-sm shrink-0 z-10">
                        <FileText className="w-5 h-5" />
                      </div>

                      {/* Center: Info */}
                      <div className="flex-1 min-w-0 z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-100 text-base group-hover:text-blue-600 transition-colors truncate">
                            {asg.title}
                          </h3>
                          {subjectName && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md border border-blue-500/20 shadow-sm shrink-0">
                              {subjectName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {courseTitle} → {moduleTitle} → {lessonTitle}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500" /> Max {asg.max_score} pts
                          </span>
                          <span>Files: {asg.max_files} ({asg.max_total_size_mb}MB)</span>
                          {graceHours > 0 && <span>Grace: {graceHours}h</span>}
                          {penaltyPct > 0 && <span>Penalty: {penaltyPct}%/day</span>}
                          <span className="capitalize">AI: {asg.ai_model_used || 'ollama'}</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 z-10">
                        <button
                          onClick={() => {
                            if (asg.lesson?.id) {
                              router.push(`/admin/library/lesson-editor?lessonId=${asg.lesson.id}`)
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit in Composer
                        </button>
                        <button
                          onClick={() => handleDelete(asg.id, asg.title)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-red-50 border border-slate-800 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all shadow-sm"
                          title="Delete Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
