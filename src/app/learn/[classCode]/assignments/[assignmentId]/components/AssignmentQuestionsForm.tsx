'use client'

import React from 'react'
import { Paperclip } from 'lucide-react'

interface Question {
  id?: string
  content: string
  type: 'essay' | 'multiple_choice'
  points?: number
  answerFormat?: 'text' | 'file' | 'both'
  options?: string[]
}

interface AssignmentQuestionsFormProps {
  questionsList: Question[]
  answers: Record<number, string>
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>
  disabled?: boolean
}

export function AssignmentQuestionsForm({
  questionsList,
  answers,
  setAnswers,
  disabled = false
}: AssignmentQuestionsFormProps) {
  if (questionsList.length === 0) return null

  return (
    <div className="space-y-4 pt-6 border-t border-slate-800/60">
      <h5 className="text-xs font-semibold text-slate-550 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Danh sách câu hỏi ({questionsList.length})
      </h5>
      <div className="space-y-4">
        {questionsList.map((q, idx) => (
          <div
            key={q.id || idx}
            className="border border-slate-800 bg-slate-950/30 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm text-slate-200 animate-fade-in"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-medium">
                      {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                    </span>
                    {q.points && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-850 text-slate-400 text-[10px] font-medium font-mono">
                        {q.points} điểm
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-200 leading-relaxed pt-1">
                    {q.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Options (if multiple choice) / Response field (if essay) */}
            {q.type === 'essay' ? (
              <div className="pl-8 space-y-2">
                <label className="block text-xs font-medium text-slate-500">
                  Câu trả lời của bạn
                </label>
                {q.answerFormat === 'file' ? (
                  <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 select-none shadow-inner">
                    <Paperclip className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-slate-200">
                        Yêu cầu nộp tệp bài làm
                      </span>
                      <span className="block text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                        Câu hỏi này yêu cầu tải lên tệp bài làm. Hãy sử dụng bảng tải lên ở góc phải để nộp tệp bài làm.
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={answers[idx] || ''}
                      onChange={(e) => {
                        if (disabled) return
                        setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                      }}
                      disabled={disabled}
                      placeholder="Nhập câu trả lời hoặc lời giải của bạn tại đây..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 h-28 leading-relaxed font-sans placeholder-slate-600 disabled:opacity-50"
                    />
                    <div className="flex justify-between items-center text-[10px]">
                      {q.answerFormat === 'both' ? (
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          💡 <span className="font-semibold text-blue-400">Gợi ý:</span> Bạn có thể nhập tóm tắt tại đây và tải lên các tệp tin bài làm ở khung bên phải.
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-slate-500 font-mono">
                        {(answers[idx] || '').trim().split(/\s+/).filter(Boolean).length} từ
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : q.options && Array.isArray(q.options) && q.options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                {q.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx)
                  const isSelected = answers[idx] === letter
                  return (
                    <button
                      type="button"
                      key={optIdx}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return
                        setAnswers((prev) => ({ ...prev, [idx]: letter }))
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-bold'
                          : 'bg-slate-950 border-slate-850 text-slate-350 hover:bg-slate-900/50 hover:border-slate-800'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-700 text-slate-550'
                        }`}
                      >
                        {letter}
                      </span>
                      <span>{opt}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="pl-8 space-y-2">
                <label className="block text-xs font-medium text-slate-500">
                  Câu trả lời của bạn
                </label>
                {q.answerFormat === 'file' ? (
                  <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 select-none shadow-inner">
                    <Paperclip className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-slate-200">
                        Yêu cầu nộp tệp bài làm
                      </span>
                      <span className="block text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                        Câu hỏi này yêu cầu tải lên tệp bài làm. Hãy sử dụng bảng tải lên ở góc phải để nộp tệp bài làm.
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={answers[idx] || ''}
                      onChange={(e) => {
                        if (disabled) return
                        setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                      }}
                      disabled={disabled}
                      placeholder="Nhập câu trả lời hoặc lời giải của bạn tại đây..."
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 h-28 leading-relaxed font-sans placeholder-slate-600 disabled:opacity-50"
                    />
                    {q.answerFormat === 'both' && (
                      <div className="text-[10px] text-slate-400 font-medium pt-1">
                        💡 <span className="font-semibold text-blue-400">Gợi ý:</span> Bạn có thể nhập tóm tắt tại đây và tải lên các tệp tin bài làm ở khung bên phải.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
