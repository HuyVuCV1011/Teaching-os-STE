'use client'

import React, { useEffect, useState, use, useCallback } from 'react'
import Link from 'next/link'
import { fetchStudentGradesAction } from '../assignments/[assignmentId]/actions'
import { formatDate } from '@/lib/date'
import { motion, AnimatePresence } from 'motion/react'
import {
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileSpreadsheet,
  Award
} from 'lucide-react'

import { useLearner } from '../LearnerContext'
import { checkCertificateEligibility } from '@/lib/certificate'
import { supabase } from '@/lib/supabase'

interface GradesPageProps {
  params: Promise<{
    classCode: string
  }>
}

interface GradeRow {
  id: string
  title: string
  lessonId?: string | null
  lessonTitle?: string | null
  moduleTitle?: string | null
  dueDate?: string | null
  maxScore?: number | null
  submission?: {
    id?: string | null
    status?: string | null
  } | null
  grade?: {
    id: string
    status?: string | null
    total_score?: string | number | null
    overall_feedback?: string | null
    rubric_scores?: RubricScore[]
  } | null
}

interface RubricScore {
  id: string
  score?: number | null
  feedback?: string | null
  rubric_criteria?: {
    name?: string | null
    max_points?: number | null
  } | null
}

interface ClassCourseRow {
  course_id?: string | null
}

interface LessonRow {
  id: string
  title?: string | null
  metadata?: {
    status?: string | null
  } | null
  modules?: LessonModule | LessonModule[] | null
}

interface LessonModule {
  title?: string | null
  course_id?: string | null
}

interface AssignmentRow {
  id: string
  title: string
  lesson_id: string
  max_score?: number | null
}

export default function StudentGradesPage({ params }: GradesPageProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode

  const { isAdminPreview, identityVerified } = useLearner()

  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [gradesData, setGradesData] = useState<GradeRow[]>([])
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [issuedCertificate, setIssuedCertificate] = useState<{ id: string; grade_average: number | string | null } | null>(null)
  const [certificateEligibility, setCertificateEligibility] = useState<{ eligible: boolean; averageGrade: number; reason: string }>({
    eligible: false,
    averageGrade: 0,
    reason: ''
  })

  const toggleRow = (assignmentId: string) => {
    setExpandedRows(prev => ({ ...prev, [assignmentId]: !prev[assignmentId] }))
  }

  const loadGradesData = useCallback(async () => {
    if (!identityVerified) return
    setLoading(true)
    setErrorState(null)
    try {
      if (isAdminPreview) {
        // Teacher preview mode
        const { data: classData, error: classErr } = await supabase
          .from('classes')
          .select('id, course_id')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classErr) throw classErr

        const { data: junctionData, error: juncError } = await supabase
          .from('class_courses')
          .select('course_id')
          .eq('class_id', classData.id)

        if (juncError) throw juncError
        const courseIds = Array.from(new Set([
          classData.course_id,
          ...(((junctionData || []) as ClassCourseRow[]).map((c) => c.course_id) || []),
        ].filter(Boolean))) as string[]

        if (courseIds.length > 0) {
          const { data: lessonsData, error: lessonsErr } = await supabase
            .from('lessons')
            .select('id, title, order_index, metadata, modules(title, course_id)')
            .in('modules.course_id', courseIds)

          if (lessonsErr) throw lessonsErr

          const activeLessons = ((lessonsData || []) as LessonRow[]).filter((l) => l.modules && l.metadata?.status !== 'draft')
          const activeLessonIds = activeLessons.map(l => l.id)
          setTotalLessons(activeLessons.length)
          setCompletedLessons(0)

          if (activeLessonIds.length > 0) {
            const { data: assignmentsData, error: assignErr } = await supabase
              .from('assignments')
              .select('id, title, lesson_id, max_score')
              .in('lesson_id', activeLessonIds)

            if (assignErr) throw assignErr

            const formattedGrades = ((assignmentsData || []) as AssignmentRow[]).map((assign) => {
              const matchingLesson = activeLessons.find(l => l.id === assign.lesson_id)
              const matchingModule = Array.isArray(matchingLesson?.modules)
                ? matchingLesson.modules[0]
                : matchingLesson?.modules

              return {
                id: assign.id,
                title: assign.title,
                lessonTitle: matchingLesson?.title || 'Unknown lesson',
                moduleTitle: matchingModule?.title || 'Unknown module',
                dueDate: null,
                maxScore: assign.max_score,
                submission: null,
                grade: null
              }
            })
            setGradesData(formattedGrades)
          } else {
            setGradesData([])
          }
        } else {
          setGradesData([])
          setTotalLessons(0)
        }

        setCertificateEligibility({
          eligible: false,
          averageGrade: 0,
          reason: 'Chế độ xem trước của giáo viên — dữ liệu chứng chỉ không khả dụng.'
        })
        setIssuedCertificate(null)
        setLoading(false)
        return
      }

      // Student Mode
      const res = await fetchStudentGradesAction(classCode)
      if (res.success && res.grades) {
        setGradesData(res.grades)
        setTotalLessons(res.totalLessons || 0)
        setCompletedLessons(res.completedLessons || 0)
        setIssuedCertificate(res.issuedCertificate || null)

        // Evaluate certificate eligibility
        const submissions = (res.grades as GradeRow[]).map((g) => {
          let gradingResult = null
          if (g.grade) {
            gradingResult = {
              id: g.grade.id,
              status: g.grade.status || 'published',
              client_total_score: parseFloat(String(g.grade.total_score || '0'))
            }
          }
          return {
            id: g.submission?.id || '',
            assignment_id: g.id,
            status: g.submission?.status || '',
            grading_results: gradingResult
          }
        })

        const activeLessonIds = res.activeLessonIds || []
        const completedLessonIds = res.completedLessonIds || []
        const assignments = (res.grades as GradeRow[]).map((g) => ({
          id: g.id,
          lesson_id: g.lessonId || '',
          max_score: g.maxScore || 100
        }))

        const certResult = checkCertificateEligibility(
          activeLessonIds,
          completedLessonIds,
          assignments,
          submissions
        )

        setCertificateEligibility(certResult)
      } else {
        throw new Error(res.error || 'Failed to retrieve grades')
      }
    } catch (err) {
      console.error('Failed to load student grade statistics:', err)
      const message = err instanceof Error ? err.message : 'Unknown database retrieval error'
      setErrorState(message)
    } finally {
      setLoading(false)
    }
  }, [classCode, identityVerified, isAdminPreview])

  useEffect(() => {
    loadGradesData()
  }, [loadGradesData])

  if (errorState) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400 max-w-7xl mx-auto">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-200">Không thể tải học bạ học sinh</span>
        <span className="text-xs text-slate-500">{errorState}</span>
        <button
          onClick={loadGradesData}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer border-0"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Assembling student gradebook...</span>
      </div>
    )
  }

  const totalAssignments = gradesData.length
  const completedAssignments = gradesData.filter(g => !!g.submission).length
  const gradedAssignments = gradesData.filter(g => !!g.grade)
  const averageGrade = gradedAssignments.length > 0
    ? gradedAssignments.reduce((sum, gradeItem) => {
        const score = Number.parseFloat(String(gradeItem.grade?.total_score || '0'))
        const maxScore = Number(gradeItem.maxScore) > 0 ? Number(gradeItem.maxScore) : 100
        return sum + (score / maxScore) * 100
      }, 0) / gradedAssignments.length
    : 0
  const isEligibleForCertificate = certificateEligibility.eligible
  const hasCertificate = isEligibleForCertificate || !!issuedCertificate

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2.5">
          <GraduationCap className="w-8 h-8 text-blue-600" />
          My Marks & Grades
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review your task submissions, check auto-evaluations, and read comments left by your instructor.
        </p>
      </div>

      {/* Stats Cards Dashboard Row */}
      {gradesData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average Grade</span>
              <span className="block text-xl font-black text-slate-100 mt-0.5">
                {gradedAssignments.length > 0 ? `${averageGrade.toFixed(1)}%` : '—'}
              </span>
              <span className="block text-[9px] text-slate-500 font-semibold mt-0.5">
                {gradedAssignments.length} graded assignment(s)
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Task Completion</span>
              <span className="block text-xl font-black text-slate-100 mt-0.5">
                {completedAssignments} / {totalAssignments}
              </span>
              <span className="block text-[9px] text-slate-500 font-semibold mt-0.5">
                {totalAssignments - completedAssignments} pending assignment(s)
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasCertificate
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-sm' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Certificate Eligibility</span>
              <span className={`block text-xs font-bold mt-1 ${hasCertificate ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isEligibleForCertificate
                  ? 'Đủ điều kiện nhận chứng chỉ'
                  : issuedCertificate
                    ? 'Chứng chỉ đã được cấp'
                    : 'Chưa đủ điều kiện'}
              </span>
              <span className="block text-[9px] text-slate-500 font-semibold mt-0.5">
                {completedLessons} / {totalLessons} lessons complete
              </span>
              <span
                className="block text-[9px] text-slate-500 font-semibold mt-0.5"
                title={certificateEligibility.reason}
              >
                {issuedCertificate && !isEligibleForCertificate
                  ? 'Chứng chỉ đã cấp vẫn được lưu; điều kiện hiện tại chưa đạt.'
                  : certificateEligibility.reason || 'Cần hoàn thành 100% bài học và đạt trung bình từ 60%.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {gradesData.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 bg-slate-950 text-sm gap-2 shadow-sm">
          <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          <span>No assignments registered for this class course syllabus yet.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {gradesData.map((row) => {
              const hasSubmission = !!row.submission
              const grade = row.grade
              const isGraded = !!grade
              const isExpanded = !!expandedRows[row.id]
              const statusText = isGraded
                ? 'Đã công bố điểm'
                : hasSubmission
                  ? 'Đang chờ chấm'
                  : 'Chưa nộp'
              const statusColor = isGraded
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                : hasSubmission
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-600'

              return (
                <article key={row.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">{row.moduleTitle}</p>
                      <h2 className="mt-1 text-sm font-bold leading-snug text-slate-100">{row.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">Bài học: {row.lessonTitle}</p>
                    </div>
                    {grade && (
                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-blue-600">
                        {grade.total_score}
                        <span className="text-xs font-medium text-slate-500"> / {row.maxScore}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                    <div className="space-y-1.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor}`}>
                        {statusText}
                      </span>
                      <p className="text-xs text-slate-500">
                        {row.dueDate ? formatDate(row.dueDate) : 'Không có hạn nộp'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRow(row.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-grade-details-${row.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/10"
                    >
                      {isExpanded ? 'Ẩn chi tiết' : isGraded ? 'Xem phản hồi' : 'Xem hướng dẫn'}
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div id={`mobile-grade-details-${row.id}`} className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                      {grade ? (
                        <>
                          <div>
                            <h3 className="text-xs font-bold text-slate-300">Nhận xét tổng quan</h3>
                            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-500">
                              {grade.overall_feedback || 'Giáo viên chưa để lại nhận xét tổng quan.'}
                            </p>
                          </div>
                          {(grade.rubric_scores?.length || 0) > 0 && (
                            <div className="space-y-2">
                              {grade.rubric_scores?.map((score) => (
                                <div key={score.id} className="rounded-xl bg-slate-900 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-xs font-semibold text-slate-200">{score.rubric_criteria?.name}</span>
                                    <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-600">
                                      {score.score} / {score.rubric_criteria?.max_points}
                                    </span>
                                  </div>
                                  {score.feedback && (
                                    <p className="mt-2 text-xs leading-relaxed text-slate-500">“{score.feedback}”</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm leading-relaxed text-slate-500">
                            Mở khu vực nộp bài để xem đầy đủ yêu cầu và gửi bài làm.
                          </p>
                          <Link
                            href={`/learn/${classCode}/assignments/${row.id}`}
                            className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                          >
                            Mở khu vực nộp bài
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/80">
              <thead className="bg-slate-900 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 text-left">Assignment Details</th>
                  <th className="py-4 px-6 text-left">Due Date</th>
                  <th className="py-4 px-6 text-left">Status</th>
                  <th className="py-4 px-6 text-center">Score</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950 text-sm">
                {gradesData.map((row) => {
                  const hasSub = !!row.submission
                  const grade = row.grade
                  const isGraded = !!grade
                  const isExpanded = !!expandedRows[row.id]

                  let statusText = 'Not Submitted'
                  let statusColor = 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                  let StatusIcon = AlertCircle

                  if (hasSub) {
                    if (isGraded) {
                      statusText = 'Graded'
                      statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                      StatusIcon = CheckCircle2
                    } else {
                      statusText = 'Pending Evaluation'
                      statusColor = 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                      StatusIcon = Clock
                    }
                  }

                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-6">
                          <span className="block text-[10px] text-slate-500 font-bold truncate max-w-[180px]">
                            {row.moduleTitle}
                          </span>
                          <span className="block font-bold text-slate-100 text-sm mt-0.5 max-w-sm truncate">
                            {row.title}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-1">
                            Lesson: {row.lessonTitle}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {row.dueDate ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(row.dueDate)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-500">No deadline</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${statusColor}`}>
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            {statusText}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {grade ? (
                            <span className="text-sm font-extrabold text-blue-600">
                              {grade.total_score} <span className="text-slate-500 font-medium text-xs">/ {row.maxScore}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isGraded ? (
                            <button
                              onClick={() => toggleRow(row.id)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Feedback'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : hasSub ? (
                            <span className="text-xs text-slate-500 italic">Awaiting grade</span>
                          ) : (
                            <button
                              onClick={() => toggleRow(row.id)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                            >
                              <span>Instructions</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Animated Expanded Section (Rubric Feedback or instructions) */}
                      <tr className={isExpanded ? 'bg-slate-900/10' : 'hidden'}>
                        <td colSpan={5} className="p-0 border-y border-slate-800">
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden px-8 py-6"
                              >
                                {grade ? (
                                  <div className="space-y-4 max-w-4xl text-left">
                                    <div>
                                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Overall Evaluator Feedback
                                      </h4>
                                      <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
                                        {grade.overall_feedback || 'No written summary comments registered.'}
                                      </p>
                                    </div>

                                    {grade.rubric_scores && grade.rubric_scores.length > 0 && (
                                      <div className="space-y-2 pt-4 border-t border-slate-800/80">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                          Rubric Criteria Breakdown
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {grade.rubric_scores.map((rs) => (
                                            <div key={rs.id} className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                                              <div className="flex justify-between items-start gap-2">
                                                <span className="text-xs font-bold text-slate-100 truncate">
                                                  {rs.rubric_criteria?.name}
                                                </span>
                                                <span className="text-[11px] font-black text-emerald-600">
                                                  {rs.score} <span className="text-slate-500 font-normal">/ {rs.rubric_criteria?.max_points}</span>
                                                </span>
                                              </div>
                                              {rs.feedback && (
                                                <p className="text-[10px] text-slate-500 mt-1.5 italic leading-relaxed">
                                                  &ldquo;{rs.feedback}&rdquo;
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-w-4xl text-left text-xs text-slate-500">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                      Task Guidelines
                                    </h4>
                                    <p className="whitespace-pre-line leading-relaxed text-xs">
                                      {row.title} requires you to upload files matching the guidelines on the classroom portal. Open the corresponding lesson page or click the link below to submit.
                                    </p>
                                    <Link
                                      href={`/learn/${classCode}/assignments/${row.id}`}
                                      className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer border-0 shadow-md"
                                    >
                                      Go to Submission Workspace
                                    </Link>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
