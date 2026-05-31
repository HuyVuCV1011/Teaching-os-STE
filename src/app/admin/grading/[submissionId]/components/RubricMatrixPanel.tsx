'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

interface RubricMatrixPanelProps {
  criteria: any[]
  scores: Record<string, number>
  setScores: React.Dispatch<React.SetStateAction<Record<string, number>>>
  feedbacks: Record<string, string>
  setFeedbacks: React.Dispatch<React.SetStateAction<Record<string, string>>>
  overrideReasons: Record<string, string>
  setOverrideReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>
  overallFeedback: string
  setOverallFeedback: (val: string) => void
  suggestions: any[]
  lateInfo: any
  applyLatePenalty: boolean
  clientTotalScore: number
}

export function RubricMatrixPanel({
  criteria,
  scores,
  setScores,
  feedbacks,
  setFeedbacks,
  overrideReasons,
  setOverrideReasons,
  overallFeedback,
  setOverallFeedback,
  suggestions,
  lateInfo,
  applyLatePenalty,
  clientTotalScore,
}: RubricMatrixPanelProps) {
  return (
    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
      <div className="flex justify-between items-center pb-2 border-b border-slate-700">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" /> Rubric Matrix
        </h3>
        <div className="text-xs text-right">
          <span className="text-slate-500">Weighted Score:</span>{' '}
          {lateInfo && lateInfo.deductionPercent > 0 && applyLatePenalty ? (
            <span className="inline-flex flex-col items-end">
              <span className="flex items-center gap-2">
                <span className="text-xs line-through text-slate-500">
                  {clientTotalScore.toFixed(2)} pts
                </span>
                <span className="text-md font-extrabold text-rose-500">
                  {(clientTotalScore * (1 - lateInfo.deductionPercent / 100)).toFixed(2)} pts
                </span>
              </span>
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block mt-0.5">
                (-{lateInfo.deductionPercent}% late deduction applied)
              </span>
            </span>
          ) : (
            <span className="text-md font-extrabold text-blue-600">
              {clientTotalScore.toFixed(2)} pts
            </span>
          )}
        </div>
      </div>

      {criteria.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No criteria defined in the rubric template.</p>
      ) : (
        <div className="space-y-6">
          {criteria.map((c) => {
            const suggestion = suggestions.find((s) => s.rubric_criterion_id === c.id)
            const isOverridden =
              suggestion &&
              ((scores[c.id] !== undefined && scores[c.id] !== parseFloat(suggestion.suggested_score)) ||
                (feedbacks[c.id] !== undefined && feedbacks[c.id] !== (suggestion.suggested_feedback || '')))

            return (
              <div key={c.id} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">{c.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description || 'No description.'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-100">
                      {(scores[c.id] || 0).toFixed(1)} / {c.max_points} pts
                    </span>
                    <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                      wt: {c.weight}
                    </span>
                  </div>
                </div>

                {/* AI Suggestion Box */}
                {suggestion && (
                  <div className="p-3 bg-blue-600/5 border border-blue-500/20 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-700">
                        AI Suggested Score: {parseFloat(suggestion.suggested_score).toFixed(1)} pts
                      </span>
                      {suggestion.confidence !== undefined && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          Confidence: {Math.round(parseFloat(suggestion.confidence) * 100)}%
                        </span>
                      )}
                    </div>
                    {suggestion.suggested_feedback && (
                      <p className="text-[11px] text-slate-500 italic">"{suggestion.suggested_feedback}"</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setScores((prev) => ({ ...prev, [c.id]: parseFloat(suggestion.suggested_score) }))
                        setFeedbacks((prev) => ({ ...prev, [c.id]: suggestion.suggested_feedback || '' }))
                      }}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-500 flex items-center gap-1 mt-1 cursor-pointer bg-transparent border-0 p-0"
                    >
                      Accept AI Suggestion
                    </button>
                  </div>
                )}

                {/* Slider Input */}
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="0"
                    max={c.max_points}
                    step="0.5"
                    value={scores[c.id] || 0}
                    onChange={(e) => setScores({ ...scores, [c.id]: parseFloat(e.target.value) })}
                    className="flex-1 accent-blue-600 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max={c.max_points}
                    step="0.5"
                    value={scores[c.id] || 0}
                    onChange={(e) =>
                      setScores({
                        ...scores,
                        [c.id]: Math.min(c.max_points, Math.max(0, parseFloat(e.target.value) || 0)),
                      })
                    }
                    className="w-14 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-xs font-mono font-semibold focus:outline-none text-slate-100"
                  />
                </div>

                {/* Individual feedback comment */}
                <div>
                  <input
                    type="text"
                    placeholder="Criterion feedback notes..."
                    value={feedbacks[c.id] || ''}
                    onChange={(e) => setFeedbacks({ ...feedbacks, [c.id]: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Override Reason Box */}
                {isOverridden && (
                  <div className="space-y-1 mt-1.5">
                    <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                      Override Reason Required
                    </label>
                    <input
                      type="text"
                      placeholder="State reason for overriding the suggestion..."
                      required
                      value={overrideReasons[c.id] || ''}
                      onChange={(e) => setOverrideReasons({ ...overrideReasons, [c.id]: e.target.value })}
                      className="w-full bg-slate-950/60 border border-amber-500/30 rounded px-2.5 py-1 text-xs text-amber-750 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Overall Feedback */}
      <div className="pt-4 border-t border-slate-700 space-y-2">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
          Overall Feedback Comments
        </label>
        <textarea
          value={overallFeedback}
          onChange={(e) => setOverallFeedback(e.target.value)}
          placeholder="Write total summary evaluation notes..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-550 h-28"
        />
      </div>
    </div>
  )
}
