'use client'

import React from 'react'
import { BarChart3, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'

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

  return (
    <div className="space-y-8 animate-fade-in">
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
                          {new Date(sub.created_at).toLocaleDateString()}
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
