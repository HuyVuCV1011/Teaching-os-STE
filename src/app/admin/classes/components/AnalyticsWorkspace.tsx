'use client'

import React from 'react'
import { BarChart3, Loader2, AlertTriangle, ExternalLink, BookOpen, AlertCircle, Clock, UserX } from 'lucide-react'
import { formatDate } from '@/lib/date'

interface AnalyticsWorkspaceProps {
  selectedClass: any
  enrollments: any[]
  analyticsAssignments: any[]
  analyticsSubmissions: any[]
  analyticsLoading: boolean
}

export function AnalyticsWorkspace({
  selectedClass,
  enrollments,
  analyticsAssignments,
  analyticsSubmissions,
  analyticsLoading,
}: AnalyticsWorkspaceProps) {
  const enrolledCount = enrollments.length
  const assignmentCount = analyticsAssignments.length
  const totalExpectedSubmissions = enrolledCount * assignmentCount
  const actualSubmissionsCount = analyticsSubmissions.length
  const submissionRate = totalExpectedSubmissions > 0 ? Math.round((actualSubmissionsCount / totalExpectedSubmissions) * 100) : 0
  
  const gradedSubmissions = analyticsSubmissions.filter((s) => s.grading_results && s.grading_results.status === 'published')
  const averageScore = gradedSubmissions.length > 0 
    ? (gradedSubmissions.reduce((sum, s) => sum + parseFloat(s.grading_results.total_score), 0) / gradedSubmissions.length).toFixed(1)
    : 'N/A'
  
  const backlogCount = analyticsSubmissions.filter(
    (s) =>
      s.status === 'submitted' ||
      s.status === 'grading_in_progress' ||
      (s.grading_results && s.grading_results.status === 'draft')
  ).length

  // 1. Grade Histogram
  const brackets = [
    { label: '< 50%', min: 0, max: 49.99, count: 0, color: 'bg-red-500' },
    { label: '50 - 69%', min: 50, max: 69.99, count: 0, color: 'bg-amber-500' },
    { label: '70 - 84%', min: 70, max: 84.99, count: 0, color: 'bg-blue-500' },
    { label: '85 - 100%', min: 85, max: 100, count: 0, color: 'bg-emerald-500' },
  ]

  gradedSubmissions.forEach((sub) => {
    const score = parseFloat(sub.grading_results.total_score)
    for (const b of brackets) {
      if (score >= b.min && score <= b.max) {
        b.count++
        break
      }
    }
  })
  const maxBracketCount = Math.max(...brackets.map((b) => b.count), 1)

  // 2. Concept Difficulty Check
  const conceptScores: { [name: string]: { sum: number; count: number; max: number } } = {}
  gradedSubmissions.forEach((sub) => {
    const scores = sub.grading_results.rubric_scores || []
    scores.forEach((rs: any) => {
      const criterionName = rs.rubric_criteria?.name
      const maxPts = rs.rubric_criteria?.max_points
      if (criterionName && maxPts) {
        if (!conceptScores[criterionName]) {
          conceptScores[criterionName] = { sum: 0, count: 0, max: 0 }
        }
        conceptScores[criterionName].sum += parseFloat(rs.score)
        conceptScores[criterionName].count++
        conceptScores[criterionName].max += maxPts
      }
    })
  })

  const difficulties = Object.entries(conceptScores)
    .map(([name, data]) => {
      const avgPercent = data.max > 0 ? (data.sum / data.max) * 100 : 0
      return { name, avgPercent, count: data.count }
    })
    .sort((a, b) => a.avgPercent - b.avgPercent) // Hardest (lowest scoring) first

  // 3. At-risk Students
  const studentMetrics: {
    [email: string]: {
      email: string
      totalScore: number
      gradedCount: number
      lateCount: number
      missingCount: number
      submissions: any[]
    }
  } = {}

  // Initialize from enrollment list
  enrollments.forEach((enrollment) => {
    const email = enrollment.student_email
    studentMetrics[email] = {
      email,
      totalScore: 0,
      gradedCount: 0,
      lateCount: 0,
      missingCount: 0,
      submissions: [],
    }
  })

  // Populate from actual submissions
  analyticsSubmissions.forEach((sub) => {
    const email = sub.student_identifier
    if (!studentMetrics[email]) {
      studentMetrics[email] = {
        email,
        totalScore: 0,
        gradedCount: 0,
        lateCount: 0,
        missingCount: 0,
        submissions: [],
      }
    }
    studentMetrics[email].submissions.push(sub)
    if (sub.is_late) {
      studentMetrics[email].lateCount++
    }
    const grade = sub.grading_results
    if (grade && grade.status === 'published') {
      studentMetrics[email].totalScore += parseFloat(grade.total_score)
      studentMetrics[email].gradedCount++
    }
  })

  // Calculate missing submissions based on expected class assignments
  Object.keys(studentMetrics).forEach((email) => {
    const metrics = studentMetrics[email]
    const submittedAssignmentIds = new Set(metrics.submissions.map((s) => s.assignment_id))
    let missing = 0
    analyticsAssignments.forEach((assign) => {
      if (!submittedAssignmentIds.has(assign.id)) {
        missing++
      }
    })
    metrics.missingCount = missing
  })

  const atRiskStudents = Object.values(studentMetrics)
    .map((metrics) => {
      const avg = metrics.gradedCount > 0 ? metrics.totalScore / metrics.gradedCount : null
      const reasons: string[] = []
      if (avg !== null && avg < 60) {
        reasons.push(`Avg Grade ${avg.toFixed(0)}%`)
      }
      if (metrics.lateCount > 1) {
        reasons.push(`${metrics.lateCount} Late submissions`)
      }
      if (metrics.missingCount > 1) {
        reasons.push(`${metrics.missingCount} Missing assignments`)
      }
      return {
        email: metrics.email,
        avg,
        lateCount: metrics.lateCount,
        missingCount: metrics.missingCount,
        reasons,
        isAtRisk: reasons.length > 0,
      }
    })
    .filter((s) => s.isAtRisk)

  return (
    <div className="space-y-8 animate-fade-in text-xs">
      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-955/40 border border-slate-700">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Average Grade</span>
          <span className="text-xl font-extrabold text-blue-600 block mt-1">
            {averageScore}{averageScore !== 'N/A' && '%'}
          </span>
          <span className="text-[10px] text-slate-505 mt-1 block">From {gradedSubmissions.length} published marks</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-955/40 border border-slate-700">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Enrolled Students</span>
          <span className="text-xl font-extrabold text-white block mt-1">{enrolledCount}</span>
          <span className="text-[10px] text-slate-505 mt-1 block">Active on whitelist</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-955/40 border border-slate-700">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Submission Rate</span>
          <span className="text-xl font-extrabold text-emerald-500 block mt-1">{submissionRate}%</span>
          <span className="text-[10px] text-slate-505 mt-1 block">{actualSubmissionsCount} of {totalExpectedSubmissions} deliverables</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-955/40 border border-slate-700">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Grading Backlog</span>
          <span className="text-xl font-extrabold text-amber-500 block mt-1">{backlogCount}</span>
          <span className="text-[10px] text-slate-505 mt-1 block">Needs teacher review</span>
        </div>
      </div>

      {/* Analytics Insights Panels */}
      {!analyticsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Histogram & Difficulty */}
          <div className="space-y-6">
            {/* Grade Distribution Histogram */}
            <div className="p-5 rounded-xl border border-slate-700 bg-slate-955/20 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Grade Distribution
              </h4>
              {gradedSubmissions.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  No published grades to build distribution.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {brackets.map((b) => {
                    const percentage = Math.round((b.count / maxBracketCount) * 100)
                    return (
                      <div key={b.label} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                          <span>{b.label}</span>
                          <span>{b.count} student(s)</span>
                        </div>
                        <div className="w-full bg-slate-800/20 rounded-full h-3.5 overflow-hidden border border-slate-700/50">
                          <div
                            className={`h-full ${b.color} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Concept Difficulty List */}
            <div className="p-5 rounded-xl border border-slate-700 bg-slate-955/20 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-500" />
                Concept Difficulty Check
              </h4>
              {difficulties.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  No rubrics scores graded yet to extract concepts.
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {difficulties.map((diff) => {
                    // Color code by severity
                    let progressColor = 'bg-emerald-500'
                    if (diff.avgPercent < 60) progressColor = 'bg-red-500'
                    else if (diff.avgPercent < 75) progressColor = 'bg-amber-500'
                    else if (diff.avgPercent < 85) progressColor = 'bg-blue-500'

                    return (
                      <div key={diff.name} className="space-y-1 p-2 rounded-lg border border-slate-700 bg-slate-955/40">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-205 truncate max-w-[70%]">{diff.name}</span>
                          <span className="text-slate-350">{diff.avgPercent.toFixed(1)}% Avg</span>
                        </div>
                        <div className="w-full bg-slate-800/20 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${progressColor} rounded-full`}
                            style={{ width: `${diff.avgPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-505 block">From {diff.count} criterion ratings</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: At-risk Alerts */}
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-slate-700 bg-slate-955/20 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                At-Risk Student Alerts
              </h4>
              {atRiskStudents.length === 0 ? (
                <div className="text-center py-8 text-emerald-500 bg-emerald-500/5 rounded-lg border border-emerald-500/10 font-semibold">
                  ✓ No at-risk students flagged. Everyone is on track!
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {atRiskStudents.map((student) => (
                    <div key={student.email} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-205 break-all max-w-[70%]">{student.email}</span>
                        <UserX className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {student.reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-[10px] font-bold text-red-500"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submissions Detail List */}
      <div className="space-y-4 pt-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Recent Student Submissions
        </h4>

        {analyticsLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : analyticsSubmissions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
            No submissions received yet for this cohort.
          </div>
        ) : (
          <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-955/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-955/65 text-slate-400 font-bold">
                    <th className="p-3">Student Email</th>
                    <th className="p-3">Assignment</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsSubmissions.map((sub) => {
                    const grade = sub.grading_results
                    return (
                      <tr key={sub.id} className="border-b border-slate-700 hover:bg-slate-900/10">
                        <td className="p-3 font-medium text-slate-205 break-all max-w-[200px]">
                          {sub.student_identifier}
                        </td>
                        <td className="p-3 text-slate-355 font-semibold">{sub.assignments?.title}</td>
                        <td className="p-3 text-slate-505">
                          {formatDate(sub.created_at)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-200">
                          {grade ? `${parseFloat(grade.total_score).toFixed(0)}%` : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              sub.status === 'graded' && grade?.status === 'published'
                                ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-450'
                                : grade?.status === 'draft'
                                ? 'bg-amber-500/15 border border-amber-500/25 text-amber-450'
                                : 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-400'
                            }`}
                          >
                            {grade?.status === 'draft' ? 'draft' : sub.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <a
                            href={`/admin/grading/${sub.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
                          >
                            <span>Review</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {enrolledCount > 0 && assignmentCount > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-slate-205">Instructor Insight</h5>
            <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
              Ensure grading is completed and click <strong className="text-slate-300">"Publish"</strong> on drafts in order for grades to be included in the Class Average calculation and student dashboards.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
