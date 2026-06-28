'use client'

import React, { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import { fetchStudentGradesAction } from './[assignmentId]/actions'
import { formatDate } from '@/lib/date'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Timer
} from 'lucide-react'
import { useLearner } from '../LearnerContext'
import { supabase } from '@/lib/supabase'

interface AssignmentsPageProps {
  params: Promise<{
    classCode: string
  }>
}

export default function StudentAssignmentsPage({ params }: AssignmentsPageProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const { studentEmail, isAdminPreview, identityVerified } = useLearner()

  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [tasksData, setTasksData] = useState<any[]>([])

  const loadTasksData = useCallback(async () => {
    if (!identityVerified) return

    setLoading(true)
    setErrorState(null)

    try {
      if (isAdminPreview) {
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, course_id')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classError || !classData) {
          throw classError || new Error('Không tìm thấy lớp học.')
        }

        const { data: mappedCourses, error: mappedCoursesError } = await supabase
          .from('class_courses')
          .select('course_id')
          .eq('class_id', classData.id)

        if (mappedCoursesError) throw mappedCoursesError

        const courseIds = Array.from(new Set([
          classData.course_id,
          ...(mappedCourses || []).map((course) => course.course_id),
        ].filter(Boolean))) as string[]

        if (courseIds.length === 0) {
          setTasksData([])
          return
        }

        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, metadata, modules(title, course_id)')
          .in('modules.course_id', courseIds)

        if (lessonsError) throw lessonsError

        const activeLessons = (lessons || []).filter(
          (lesson: any) => lesson.modules && lesson.metadata?.status !== 'draft'
        )
        const lessonIds = activeLessons.map((lesson) => lesson.id)

        if (lessonIds.length === 0) {
          setTasksData([])
          return
        }

        const [
          { data: assignments, error: assignmentsError },
          { data: schedules, error: schedulesError },
        ] = await Promise.all([
          supabase
            .from('assignments')
            .select('id, title, lesson_id, max_score')
            .in('lesson_id', lessonIds),
          supabase
            .from('class_schedules')
            .select('lesson_id, due_date')
            .eq('class_id', classData.id)
            .in('lesson_id', lessonIds),
        ])

        if (assignmentsError) throw assignmentsError
        if (schedulesError) throw schedulesError

        const scheduleMap = new Map((schedules || []).map((schedule) => [schedule.lesson_id, schedule]))
        setTasksData((assignments || []).map((assignment) => {
          const lesson = activeLessons.find((item) => item.id === assignment.lesson_id)
          const module = Array.isArray(lesson?.modules) ? lesson.modules[0] : lesson?.modules

          return {
            id: assignment.id,
            title: assignment.title,
            lessonId: assignment.lesson_id,
            lessonTitle: lesson?.title || 'Bài học chưa xác định',
            moduleTitle: module?.title || 'Học phần chưa xác định',
            dueDate: scheduleMap.get(assignment.lesson_id)?.due_date || null,
            maxScore: assignment.max_score,
            submission: null,
            grade: null,
          }
        }))
        return
      }

      if (!studentEmail) {
        throw new Error('Không tìm thấy danh tính học sinh trong phiên lớp học.')
      }

      const res = await fetchStudentGradesAction(classCode)
      if (res.success && res.grades) {
        setTasksData(res.grades)
      } else {
        throw new Error(res.error || 'Không thể tải danh sách bài tập.')
      }
    } catch (err: any) {
      console.error('Failed to load student tasks checklist:', err)
      setErrorState(err.message || 'Không thể tải danh sách bài tập.')
    } finally {
      setLoading(false)
    }
  }, [classCode, identityVerified, isAdminPreview, studentEmail])

  useEffect(() => {
    loadTasksData()
  }, [loadTasksData])

  // Loading skeleton matching layout exactly
  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
        <div>
          <div className="h-7 w-48 bg-slate-800 rounded mb-2" />
          <div className="h-4 w-96 bg-slate-800 rounded" />
        </div>
        <div className="border border-slate-800 bg-slate-950 rounded-2xl p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 border-b border-slate-900 last:border-b-0 gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-64 bg-slate-800 rounded" />
                <div className="h-3 w-40 bg-slate-800 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-800 rounded-full" />
              <div className="h-6 w-28 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (errorState) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4" role="alert">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-slate-100">Không thể tải danh sách bài tập</h2>
        <p className="text-slate-500 text-sm">{errorState}</p>
        <button
          type="button"
          onClick={loadTasksData}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (!studentEmail && !isAdminPreview) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-500" />
        <h2 className="text-xl font-bold text-white">Identity Missing</h2>
        <p className="text-slate-400 text-sm">
          Please log out and re-enter using your whitelisted class gateway to restore access.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2.5">
          <FileText className="w-8 h-8 text-blue-600" />
          Assignments & Tasks
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Track syllabus tasks, view deadlines, and open workspaces to draft and submit your deliverables.
        </p>
      </div>

      {tasksData.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 bg-slate-950 text-sm gap-2 shadow-sm">
          <FileText className="w-8 h-8 text-slate-400" />
          <span>No assignments registered for this class course syllabus yet.</span>
        </div>
      ) : (
        <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-sm p-6">
          <div className="divide-y divide-slate-800/80">
            {tasksData.map((row) => {
              const hasSub = !!row.submission
              const isGraded = !!row.grade

              let statusText = 'Not Submitted'
              let statusColor = 'bg-rose-500/10 border-rose-500/20 text-rose-600'
              let StatusIcon = AlertCircle

              if (hasSub) {
                if (isGraded) {
                  statusText = 'Graded'
                  statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                  StatusIcon = CheckCircle2
                } else {
                  statusText = 'Submitted (Pending)'
                  statusColor = 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                  StatusIcon = Clock
                }
              }

              // Compute deadline urgency badge
              let urgencyBadge = null
              if (row.dueDate) {
                const now = Date.now()
                const due = new Date(row.dueDate).getTime()
                const diffMs = due - now
                if (diffMs <= 0) {
                  urgencyBadge = { label: 'Overdue', color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' }
                } else {
                  const diffH = Math.floor(diffMs / 3600000)
                  const diffD = Math.floor(diffH / 24)
                  if (diffD <= 2) {
                    urgencyBadge = { label: 'Due soon', color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' }
                  }
                }
              }

              return (
                <div
                  key={row.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center py-5 first:pt-0 last:pb-0 gap-4 hover:bg-slate-900/10 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {row.moduleTitle}
                      </span>
                      {urgencyBadge && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${urgencyBadge.color}`}>
                          <Timer className="w-2.5 h-2.5" />
                          {urgencyBadge.label}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-100 text-sm truncate leading-snug">
                      {row.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Lesson: {row.lessonTitle}</span>
                      {row.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Hạn nộp: {formatDate(row.dueDate)}
                        </span>
                      ) : (
                        <span className="italic">No deadline</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                      {statusText}
                    </span>

                    <Link
                      href={`/learn/${classCode}/assignments/${row.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 border-0 cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
