'use client'

import React from 'react'
import { User, AlertCircle } from 'lucide-react'

interface StudentIdentityNotesProps {
  submission: any
  dueDate: string | null
  lateInfo: any
  applyLatePenalty: boolean
  setApplyLatePenalty: (val: boolean) => void
}

export function StudentIdentityNotes({
  submission,
  dueDate,
  lateInfo,
  applyLatePenalty,
  setApplyLatePenalty,
}: StudentIdentityNotesProps) {
  return (
    <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
      <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
        <User className="w-4 h-4 text-slate-400" /> Student Identity & Notes
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Student Email</span>
          <span className="font-semibold text-slate-200">{submission?.student_identifier}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Submitted at</span>
          <span className="font-semibold text-slate-200">
            {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : ''}
          </span>
        </div>
        {dueDate && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Cohort Due Date</span>
            <span className="font-semibold text-slate-200">
              {new Date(dueDate).toLocaleString()}
            </span>
          </div>
        )}
        {lateInfo?.isLate && (
          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2 text-xs mt-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-600">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Late Submission Detected</span>
            </div>
            <p className="text-xs text-slate-505 leading-relaxed">
              Submitted {lateInfo.hoursLate.toFixed(1)} hours after deadline.
              {lateInfo.inGracePeriod ? (
                <span className="block text-emerald-600 mt-1 font-semibold">
                  Within grace period ({submission?.assignments?.late_policy?.grace_period_hours} hours). No penalty.
                </span>
              ) : (
                <span className="block text-rose-600 mt-1 font-semibold font-mono">
                  Overdue by {lateInfo.daysLate} day(s). Standard policy applies -{lateInfo.deductionPercent}% late deduction.
                </span>
              )}
            </p>
            {!lateInfo.inGracePeriod && (
              <label className="flex items-center gap-2 pt-2 border-t border-slate-700 text-xs text-slate-350 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyLatePenalty}
                  onChange={(e) => setApplyLatePenalty(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 accent-blue-500 cursor-pointer"
                />
                <span>Enforce late penalty deduction</span>
              </label>
            )}
          </div>
        )}
      </div>

      {submission?.submitted_text && (
        <div className="pt-4 border-t border-slate-700">
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Submission Commentary
          </span>
          <div className="p-4 bg-slate-955/60 border border-slate-700 rounded-xl text-slate-200 text-xs whitespace-pre-line leading-relaxed">
            {submission.submitted_text}
          </div>
        </div>
      )}
    </div>
  )
}
