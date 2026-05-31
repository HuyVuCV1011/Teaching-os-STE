'use client'

import React from 'react'

interface GradingStatusPanelProps {
  gradingResult: any
  assignment: any
}

export function GradingStatusPanel({ gradingResult, assignment }: GradingStatusPanelProps) {
  if (!gradingResult) return null

  return (
    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
      <div className="flex justify-between items-center pb-2 border-b border-emerald-500/10">
        <h3 className="font-bold text-emerald-400 text-sm">Evaluation Summary</h3>
        <span className="text-2xl font-extrabold text-emerald-400">
          {gradingResult.total_score} / {assignment?.max_score}
        </span>
      </div>
      <div className="space-y-4">
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Teacher Feedback
          </span>
          <p className="text-xs text-slate-350 mt-1 whitespace-pre-line leading-relaxed">
            {gradingResult.overall_feedback || 'No written feedback logged.'}
          </p>
        </div>

        {/* Rubric scores */}
        {gradingResult.rubric_scores && Array.isArray(gradingResult.rubric_scores) && (
          <div className="space-y-2 pt-2 border-t border-emerald-500/10">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Criterion breakdown
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gradingResult.rubric_scores.map((rs: any) => (
                <div key={rs.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                  <span className="block text-[10px] font-semibold text-slate-400 truncate">
                    {rs.rubric_criteria?.name}
                  </span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xs font-bold text-slate-200">{rs.score} pts</span>
                    <span className="text-[10px] text-slate-500 font-mono">Max {rs.rubric_criteria?.max_points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
