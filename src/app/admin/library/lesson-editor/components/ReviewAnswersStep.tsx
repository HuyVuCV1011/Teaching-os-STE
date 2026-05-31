'use client'

import React from 'react'
import { ClipboardList, CheckCircle, Sparkles, Loader2, Eye, FileCode, BookOpen, Brain, Paperclip, FileCheck } from 'lucide-react'
import { getSignedUrlAction } from '@/app/admin/library/actions/materials'
import { cleanOptionText } from '../hooks/useLessonEditorState'

const AI_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Google)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Google)' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq)' },
  { value: 'openrouter/deepseek/deepseek-chat', label: 'DeepSeek V3 (OpenRouter)' },
  { value: 'openrouter/google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (OpenRouter)' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Free (OpenRouter)' },
  { value: 'ollama', label: 'Ollama (Local Llama)' },
]

interface QuestionItem {
  id: number
  content: string
  options?: string[]
  answer?: string
  status: 'pending' | 'approved' | 'rejected'
  answerFormat?: 'text' | 'file' | 'both'
  answerSource?: 'ai_generated' | 'file_import' | 'teacher_edit'
  data?: any
  source: 'ai_generator' | 'file_import'
  source_file?: string | null
  points?: number
  batchDefaultFormat?: 'text' | 'file' | 'both'
  batchType?: 'multiple_choice' | 'essay'
}

interface BatchItem {
  id: number
  type: 'multiple_choice' | 'essay'
  category: 'theory' | 'code'
  defaultAnswerFormat: 'text' | 'file' | 'both'
  questions: QuestionItem[]
}

interface AssignmentFileItem {
  name: string
  size: number
  storage_path?: string
  file?: File | null
  downloadable: boolean
  previewable: boolean
}

interface ReviewAnswersStepProps {
  batches: BatchItem[]
  activeReviewQsIdx: number
  setActiveReviewQsIdx: (val: number) => void
  selectedModel: string
  setSelectedModel: (val: string) => void
  suggestingAnsIdx: number | null
  isSuggestingAll: boolean
  saving: boolean
  dataFiles: AssignmentFileItem[]
  referenceFiles: AssignmentFileItem[]
  simulatedAnswers: Record<number, string>
  setSimulatedAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>
  assignmentForm: any
  handleSuggestAnswer: (approvedQIndex: number) => Promise<void>
  handleSuggestAllMissingAnswers: () => Promise<void>
  handleSaveComposer: (mode: 'draft' | 'official') => Promise<void>
  updateQuestionInBatches: (qId: number, fields: Partial<QuestionItem>) => void
}

export function ReviewAnswersStep({
  batches,
  activeReviewQsIdx,
  setActiveReviewQsIdx,
  selectedModel,
  setSelectedModel,
  suggestingAnsIdx,
  isSuggestingAll,
  saving,
  dataFiles,
  referenceFiles,
  simulatedAnswers,
  setSimulatedAnswers,
  assignmentForm,
  handleSuggestAnswer,
  handleSuggestAllMissingAnswers,
  handleSaveComposer,
  updateQuestionInBatches
}: ReviewAnswersStepProps) {
  const approvedQs: QuestionItem[] = []
  batches.forEach(b => {
    b.questions.forEach(q => {
      if (q.status === 'approved') {
        approvedQs.push({ ...q, batchDefaultFormat: b.defaultAnswerFormat, batchType: b.type })
      }
    })
  })

  const totalApproved = approvedQs.length
  const withAnswers = approvedQs.filter(q => q.answer && q.answer.trim() !== '').length
  const withoutAnswers = totalApproved - withAnswers
  const aiCount = approvedQs.filter(q => q.source === 'ai_generator').length
  const fileCount = approvedQs.filter(q => q.source === 'file_import').length

  const activeReviewIndex = Math.max(0, Math.min(activeReviewQsIdx, totalApproved - 1))
  const activeQ = approvedQs[activeReviewIndex]

  return (
    <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-slate-700">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-emerald-700 animate-pulse" />
            Review & Finalize Answers
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Ensure each question has a comprehensive, accurate model answer before publishing. Use AI to suggest missing keys or edit manually.
          </p>
        </div>
      </div>

      {totalApproved === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs">
          ⚠️ No approved questions found in this assignment yet. Go back to Tab 2 to approve some questions.
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px] overflow-hidden items-stretch">
            {/* Left Pane: Questions List */}
            <div className="lg:col-span-5 flex flex-col h-full bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  📋 QUESTIONS ({totalApproved})
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                {approvedQs.map((q, idx) => {
                  const isSelected = idx === activeReviewIndex
                  const hasAns = q.answer && q.answer.trim() !== ''
                  const qTypeLabel = q.batchType === 'multiple_choice' ? 'MC' : 'Essay'
                  const qCategoryLabel = q.category === 'theory' ? 'Theory' : 'Code'
                  
                  return (
                    <button
                      key={`q-review-${q.id || idx}-${idx}`}
                      type="button"
                      onClick={() => setActiveReviewQsIdx(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-semibold'
                          : 'bg-slate-900 border-slate-850 hover:bg-slate-850/60 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-bold tracking-wider font-mono">
                          Q{idx + 1}. {q.batchType === 'multiple_choice' ? 'MCQ' : 'ESSAY'}
                        </span>
                        {hasAns ? (
                          <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 font-mono">
                            <CheckCircle className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>SUCCESSFUL</span>
                          </div>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Missing Answer" />
                        )}
                      </div>
                      <p className="truncate w-full font-sans text-xs opacity-90">{q.content}</p>
                      
                      <div className="flex items-center justify-between w-full mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-400 uppercase tracking-wider">
                            {qTypeLabel}
                          </span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-855 text-slate-400 uppercase tracking-wider">
                            {qCategoryLabel}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                          {q.source === 'file_import' ? '📁 File' : '✨ AI'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Pane: Answer Worksheet */}
            <div className="lg:col-span-7 flex flex-col h-full bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  ✅ ANSWERS (QUESTION {activeReviewIndex + 1})
                </span>
              </div>

              {activeQ && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
                  {/* Answer Detail Header Block */}
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-950">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Current Answer:</span>
                        <span className="text-slate-200 font-bold">
                          {activeQ.answer && activeQ.answer.trim() !== '' ? (
                            activeQ.batchType === 'multiple_choice'
                              ? `Option ${activeQ.answer}`
                              : `${activeQ.answer.slice(0, 40)}${activeQ.answer.length > 40 ? '...' : ''}`
                          ) : (
                            <span className="text-rose-400 italic">Answer: (not yet)</span>
                          )}
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        activeQ.answerSource === 'teacher_edit'
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                          : activeQ.answerSource === 'file_import'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        Source: {activeQ.answerSource === 'teacher_edit' ? 'Teacher Edit' : activeQ.answerSource === 'file_import' ? 'File Import' : activeQ.answerSource === 'ai_generated' ? 'AI Generated' : 'Not Set'}
                      </span>
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-1">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 hover:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                      >
                        {AI_MODEL_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSuggestAnswer(activeReviewIndex)}
                        disabled={suggestingAnsIdx === activeReviewIndex}
                        className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-900 text-[10px] text-blue-600 hover:text-blue-700 font-bold border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                      >
                        {suggestingAnsIdx === activeReviewIndex ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                        )}
                        <span>Suggest AI</span>
                      </button>
                    </div>
                  </div>

                  {/* Question content card */}
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-2 select-text leading-relaxed">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Question:</span>
                    <p className="text-slate-200 whitespace-pre-wrap">{activeQ.content}</p>
                    {activeQ.options && Array.isArray(activeQ.options) && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-950">
                        {activeQ.options.map((opt, oIdx) => (
                          <div key={oIdx} className="text-[11px] text-slate-400 font-medium">
                            <strong className="text-blue-700">{String.fromCharCode(65 + oIdx)}.</strong> {cleanOptionText(opt, oIdx)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Answer input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Model Answer Workspace / Correct Key
                    </label>

                    {activeQ.batchType === 'multiple_choice' ? (
                      <div className="space-y-3 p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                        <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">Select Correct Option:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(activeQ.options || ['A', 'B', 'C', 'D']).map((_, oIdx) => {
                            const letter = String.fromCharCode(65 + oIdx)
                            const isCorrect = activeQ.answer === letter
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => {
                                  updateQuestionInBatches(activeQ.id, {
                                    answer: letter,
                                    answerSource: 'teacher_edit'
                                  })
                                }}
                                className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                                  isCorrect
                                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-md'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                }`}
                              >
                                Option {letter}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <textarea
                          id="model-answer-textarea"
                          rows={6}
                          placeholder="Type complete model answer text or essay response rubric expectation guidelines here..."
                          value={activeQ.answer || ''}
                          onChange={(e) => {
                            updateQuestionInBatches(activeQ.id, {
                              answer: e.target.value,
                              answerSource: 'teacher_edit'
                            })
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono resize-none leading-relaxed transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                        />
                        <div className="text-[10px] text-slate-500 text-right font-mono">
                          {(activeQ.answer || '').trim().split(/\s+/).filter(Boolean).length} words
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary row */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-semibold text-slate-400 shadow-sm">
            <div>
              Summary: <strong className="text-slate-200">{totalApproved}</strong> approved questions | With answers: <strong className="text-emerald-700">{withAnswers}</strong> | Missing: <strong className="text-amber-700">{withoutAnswers}</strong>
            </div>
            <div className="flex gap-4">
              <span>AI Generated: <strong className="text-slate-205">{aiCount}</strong></span>
              <span>File Imports: <strong className="text-slate-205">{fileCount}</strong></span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1 flex gap-2 items-stretch">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-400 hover:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
              >
                {AI_MODEL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSuggestAllMissingAnswers}
                disabled={isSuggestingAll || withoutAnswers === 0}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
              >
                {isSuggestingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-600" />
                )}
                <span>AI Suggest All Missing</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSaveComposer('official')}
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4 text-blue-200" />
              )}
              <span>Finalize & Save</span>
            </button>
          </div>

          {/* Final Preview Section */}
          <div className="mt-8 border-t border-slate-800 pt-8 space-y-6 select-none">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-805">
              <Eye className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                👁️ Final Preview (As Students Will See It)
              </h4>
            </div>

            <div className="border border-slate-800 bg-slate-950/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                      {assignmentForm.title || 'Assignment Deliverables'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Max Score: {assignmentForm.maxScore} pts | Files: Max {assignmentForm.maxFiles} ({assignmentForm.maxTotalSizeMb}MB)
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider select-none shrink-0 shadow-md">
                  Submit Deliverables
                </div>
              </div>

              {/* Section: Downloadable Data Files */}
              {dataFiles.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <FileCode className="w-3.5 h-3.5 text-blue-600" />
                    Attached Data Files (For Download)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dataFiles.map((fileItem, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-slate-200 truncate">
                            {fileItem.name}
                          </span>
                          <span className="block text-[9px] text-slate-500 font-mono">
                            {(fileItem.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {fileItem.downloadable && (
                          <a
                            href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                            download
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Reference Materials */}
              {referenceFiles.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Reference Materials (For Reading)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {referenceFiles.map((fileItem, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-slate-200 truncate">
                            {fileItem.name}
                          </span>
                          <span className="block text-[9px] text-slate-500 font-mono">
                            {(fileItem.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {fileItem.previewable && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (fileItem.storage_path) {
                                  const res = await getSignedUrlAction('teaching-materials', fileItem.storage_path)
                                  if (res.success && res.signedUrl) {
                                    window.open(res.signedUrl, '_blank')
                                  } else {
                                    alert('Could not open file preview.')
                                  }
                                }
                              }}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 text-[9px] font-bold transition-all"
                            >
                              Preview
                            </button>
                          )}
                          {fileItem.downloadable && (
                            <a
                              href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                              download
                              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Structured Questions List */}
              <div className="space-y-4 pt-4 border-t border-slate-805">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Brain className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  Assignment Questions ({approvedQs.length})
                </h5>

                <div className="space-y-4">
                  {approvedQs.map((q, idx) => {
                    const resolvedFormat = q.batchType === 'multiple_choice' ? 'text' : (q.answerFormat || q.batchDefaultFormat || 'text')
                    return (
                      <div key={`q-preview-${q.id || idx}-${idx}`} className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3 text-xs text-slate-200 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                            Question {idx + 1} ({q.batchType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'} — {q.source === 'file_import' ? 'File Import' : 'AI Generated'})
                          </span>
                        </div>
                        <p className="text-slate-200 font-semibold leading-relaxed whitespace-pre-wrap">
                          {q.content}
                        </p>

                        {q.batchType === 'essay' && (
                          <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 select-none font-mono">
                            <span>Format:</span>
                            {resolvedFormat === 'text' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📝 Text Only</span>}
                            {resolvedFormat === 'file' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📎 File Upload Only</span>}
                            {resolvedFormat === 'both' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">🔀 Both</span>}
                          </div>
                        )}

                        {q.batchType === 'essay' ? (
                          <div className="space-y-3">
                            {(resolvedFormat === 'text' || resolvedFormat === 'both') && (
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                  Your Answer (Text)
                                </label>
                                <textarea
                                  value={simulatedAnswers[idx] || ''}
                                  onChange={(e) => {
                                    setSimulatedAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                  }}
                                  placeholder="Type your simulated essay response..."
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 h-24 placeholder-slate-600 font-sans transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                                />
                              </div>
                            )}

                            {resolvedFormat === 'both' && (
                              <div className="flex items-center justify-center gap-3">
                                <div className="h-px bg-slate-850 flex-1" />
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">or</span>
                                <div className="h-px bg-slate-850 flex-1" />
                              </div>
                            )}

                            {(resolvedFormat === 'file' || resolvedFormat === 'both') && (
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                  {resolvedFormat === 'file' ? 'Upload your file:' : 'Upload file instead:'}
                                </label>
                                <div className="border border-dashed border-slate-700 bg-slate-900/40 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1 select-none">
                                  <Paperclip className="w-5 h-5 text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-200 font-sans">Drag & drop or click to upload</span>
                                  <span className="text-[9px] text-slate-500 font-mono">Supported: .py, .js, .ts, .pdf, .docx</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                            {q.options.map((opt, oIdx) => {
                              const letter = String.fromCharCode(65 + oIdx)
                              const isSelected = simulatedAnswers[idx] === letter
                              return (
                                <button
                                  type="button"
                                  key={oIdx}
                                  onClick={() => {
                                    setSimulatedAnswers(prev => ({ ...prev, [idx]: letter }))
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-bold'
                                      : 'bg-slate-900 border-slate-850 text-slate-350 hover:bg-slate-850/60 hover:border-slate-800'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-700 text-slate-600'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span>{cleanOptionText(opt, oIdx)}</span>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
