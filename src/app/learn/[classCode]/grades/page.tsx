'use client'

import React, { useEffect, useState, use } from 'react'
import { fetchStudentGradesAction } from '../assignments/[assignmentId]/actions'
import {
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

interface GradesPageProps {
  params: Promise<{
    classCode: string
  }>
}

export default function StudentGradesPage({ params }: GradesPageProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode

  const [loading, setLoading] = useState(true)
  const [studentEmail, setStudentEmail] = useState('')
  const [gradesData, setGradesData] = useState<any[]>([])
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const email = getCookie(`student_email_${classCode}`)
    if (email) {
      setStudentEmail(email.trim().toLowerCase())
    }
  }, [classCode])

  useEffect(() => {
    if (studentEmail) {
      loadGradesData()
    } else {
      setLoading(false)
    }
  }, [studentEmail, classCode])

  const toggleRow = (assignmentId: string) => {
    setExpandedRows(prev => ({ ...prev, [assignmentId]: !prev[assignmentId] }))
  }

  async function loadGradesData() {
    setLoading(true)
    try {
      const res = await fetchStudentGradesAction(classCode)
      if (res.success && res.grades) {
        setGradesData(res.grades)
        if (res.email) {
          setStudentEmail(res.email)
        }
      } else {
        console.error('Failed to load secure student grades:', res.error)
      }
    } catch (err) {
      console.error('Failed to load student grade statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Assembling student gradebook...</span>
      </div>
    )
  }

  if (!studentEmail) {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <GraduationCap className="w-8 h-8 text-blue-600" />
          My Marks & Grades
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review your task submissions, check auto-evaluations, and read comments left by your instructor.
        </p>
      </div>

      {gradesData.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 text-sm gap-2">
          <FileSpreadsheet className="w-8 h-8 text-slate-650" />
          <span>No assignments registered for this class course syllabus yet.</span>
        </div>
      ) : (
        <div className="border border-slate-800 bg-slate-900/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/80">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6 text-left">Assignment Details</th>
                  <th className="py-4 px-6 text-left">Due Date</th>
                  <th className="py-4 px-6 text-left">Status</th>
                  <th className="py-4 px-6 text-center">Score</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 bg-slate-950/20 text-sm">
                {gradesData.map((row) => {
                  const hasSub = !!row.submission
                  const isGraded = !!row.grade
                  const isExpanded = !!expandedRows[row.id]

                  let statusText = 'Not Submitted'
                  let statusColor = 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                  let StatusIcon = AlertCircle

                  if (hasSub) {
                    if (isGraded) {
                      statusText = 'Graded'
                      statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                      StatusIcon = CheckCircle2
                    } else {
                      statusText = 'Pending Evaluation'
                      statusColor = 'bg-amber-500/10 border-amber-500/20 text-amber-450'
                      StatusIcon = Clock
                    }
                  }

                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-4 px-6">
                          <span className="block text-[10px] text-slate-500 font-semibold truncate max-w-[180px]">
                            {row.moduleTitle}
                          </span>
                          <span className="block font-bold text-white text-sm mt-0.5 max-w-sm truncate">
                            {row.title}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">
                            Lesson: {row.lessonTitle}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-450">
                          {row.dueDate ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-650" />
                              {new Date(row.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-600">No deadline</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}>
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            {statusText}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {isGraded ? (
                            <span className="text-sm font-extrabold text-blue-600">
                              {row.grade.total_score} <span className="text-slate-500 font-medium text-xs">/ {row.maxScore}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
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
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                            >
                              <span>Instructions</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Section (Rubric Feedback or instructions) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-slate-900/30 px-8 py-5 border-y border-slate-850">
                            {isGraded ? (
                              <div className="space-y-4 max-w-4xl">
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Overall Evaluator Feedback
                                  </h4>
                                  <p className="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                                    {row.grade.overall_feedback || 'No written summary comments registered.'}
                                  </p>
                                </div>

                                {row.grade.rubric_scores && row.grade.rubric_scores.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                      Rubric Criteria Breakdown
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {row.grade.rubric_scores.map((rs: any) => (
                                        <div key={rs.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                                          <div className="flex justify-between items-start gap-2">
                                            <span className="text-[11px] font-semibold text-slate-200 truncate">
                                              {rs.rubric_criteria?.name}
                                            </span>
                                            <span className="text-[11px] font-bold text-emerald-400">
                                              {rs.score} <span className="text-slate-550 font-normal">/ {rs.rubric_criteria?.max_points}</span>
                                            </span>
                                          </div>
                                          {rs.feedback && (
                                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                              "{rs.feedback}"
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2 max-w-4xl text-xs text-slate-400">
                                <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest">
                                  Task Guidelines
                                </h4>
                                <p className="whitespace-pre-line leading-relaxed">
                                  {row.title} requires you to upload files matching the guidelines on the classroom portal. Open the corresponding lesson page or click the link below to submit.
                                </p>
                                <button
                                  onClick={() => router.push(`/learn/${classCode}/assignments/${row.id}`)}
                                  className="mt-3 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer border-0"
                                >
                                  Go to Submission Workspace
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
