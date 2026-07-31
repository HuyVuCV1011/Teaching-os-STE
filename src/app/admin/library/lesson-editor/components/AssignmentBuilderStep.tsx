'use client'

import React, { useState } from 'react'
import { Sparkles, Upload, FileText, Database, BookOpen, Trash2, FileUp, Loader2 } from 'lucide-react'
import { SemanticSearchDrawer } from '@/components/knowledge/SemanticSearchDrawer'

interface AssignmentFileItem {
  name: string
  size: number
  storage_path?: string
  file?: File | null
  downloadable: boolean
  previewable: boolean
}

interface QuestionItem {
  id: string | number
  content: string
  options?: string[]
  answer?: string
  status: 'pending' | 'approved' | 'rejected'
  answerFormat?: 'text' | 'file' | 'both'
  answerSource?: 'ai_generated' | 'file_import' | 'teacher_edit'
  data?: unknown
  source: 'ai_generator' | 'file_import'
  source_file?: string | null
  points?: number
}

interface BatchItem {
  id: number
  type: 'multiple_choice' | 'essay'
  category: 'theory' | 'code'
  defaultAnswerFormat: 'text' | 'file' | 'both'
  questions: QuestionItem[]
}

const AI_MODEL_OPTIONS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Google)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Google)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Google)' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq)' },
  { value: 'openrouter/deepseek/deepseek-chat', label: 'DeepSeek V3 (OpenRouter)' },
  { value: 'openrouter/google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (OpenRouter)' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Free (OpenRouter)' },
  { value: 'ollama', label: 'Ollama (Local Llama)' },
]

interface AssignmentBuilderStepProps {
  hasAssignment: boolean
  setHasAssignment: (val: boolean) => void
  assignmentForm: AssignmentForm
  setAssignmentForm: React.Dispatch<React.SetStateAction<AssignmentForm>>
  title: string
  assignmentId: string
  batches: BatchItem[]
  dataFiles: AssignmentFileItem[]
  setDataFiles: React.Dispatch<React.SetStateAction<AssignmentFileItem[]>>
  referenceFiles: AssignmentFileItem[]
  setReferenceFiles: React.Dispatch<React.SetStateAction<AssignmentFileItem[]>>
  asgDragActive: boolean
  setModalStep: (val: number) => void
  setShowAiModal: (val: boolean) => void
  handleDeleteBatch: (bIdx: number) => void
  setShowBatchSummaryModal: (val: boolean) => void
  handleAsgDrag: (e: React.DragEvent) => void
  handleAsgDrop: (e: React.DragEvent) => void
  setClassifyFile: (val: File | null) => void
  setClassifyType: (val: 'data' | 'reference' | 'question') => void
  setClassifyDownloadable: (val: boolean) => void
  setClassifyPreviewable: (val: boolean) => void
  setClassifyModalOpen: (val: boolean) => void
  pinnedChunks?: PinnedKnowledgeChunk[]
  setPinnedChunks?: React.Dispatch<React.SetStateAction<PinnedKnowledgeChunk[]>>
  setActiveBatchIndex: (val: number) => void
  promptFile: File | null
  setPromptFile: (val: File | null) => void
  promptStoragePath: string
  setPromptStoragePath: (val: string) => void
  solutionFile: File | null
  setSolutionFile: (val: File | null) => void
  solutionStoragePath: string
  setSolutionStoragePath: (val: string) => void
  setSolutionMode: (val: 'upload' | 'ai') => void
  handleParsePromptFile: () => Promise<void>
  isParsingFile: boolean
  selectedModel: string
  setSelectedModel: (val: string) => void
}

interface AssignmentForm {
  title: string
  maxScore: number
  maxFiles: number
  maxTotalSizeMb: number
  autoPublishGrades: boolean
  gracePeriodHours: number
  penaltyPercentPerDay: number
  mcqWeightPercent: number
  essayWeightPercent: number
  instructions: string
}

interface PinnedKnowledgeChunk {
  chunk_id: string
  content: string
  score?: number | string | null
  citation?: {
    knowledge_source_title?: string | null
  } | null
}

export function AssignmentBuilderStep({
  hasAssignment,
  setHasAssignment,
  assignmentForm,
  setAssignmentForm,
  title,
  assignmentId,
  batches,
  dataFiles,
  setDataFiles,
  referenceFiles,
  setReferenceFiles,
  setModalStep,
  setShowAiModal,
  handleDeleteBatch,
  setShowBatchSummaryModal,
  pinnedChunks = [],
  setPinnedChunks,
  setActiveBatchIndex,
  promptFile,
  setPromptFile,
  promptStoragePath,
  setPromptStoragePath,
  solutionFile,
  setSolutionFile,
  solutionStoragePath,
  setSolutionStoragePath,
  setSolutionMode,
  handleParsePromptFile,
  isParsingFile,
  selectedModel,
  setSelectedModel
}: AssignmentBuilderStepProps) {
  const [isRAGDrawerOpen, setIsRAGDrawerOpen] = useState(false)

  return (
    <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
          Assignment Parameters
        </h3>
        <div className="flex items-center gap-4">
          {hasAssignment && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-xl shadow-inner">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                AI Model:
              </span>
              <select
                value={selectedModel}
                disabled={isParsingFile}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 focus:ring-0 focus:outline-none cursor-pointer py-0.5 pr-2"
              >
                {AI_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-350 mr-2">
              Enable assignment for this lesson
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="asg_has_assignment_yes"
                onClick={() => {
                  setHasAssignment(true)
                  if (!assignmentForm.title) {
                    setAssignmentForm((prev) => ({ ...prev, title: title + ' Assignment' }))
                  }
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  hasAssignment
                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-extrabold shadow-md'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                id="asg_has_assignment_no"
                onClick={() => {
                  if (assignmentId) {
                    const confirmed = window.confirm(
                      'Disabling the assignment will delete it, along with its custom rubrics and solution keys, from the database upon saving. Are you sure you want to disable it?'
                    )
                    if (!confirmed) return
                  }
                  setHasAssignment(false)
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  !hasAssignment
                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-extrabold shadow-md'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-350'
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>

      {hasAssignment ? (
        <div className="space-y-6 animate-fade-in">
          {/* Side-by-Side Split Action Blocks Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: AI Generator Launcher */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                  AI Generator
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Let our advanced AI engine automatically generate structured, curriculum-aligned homework questions based on your Tab 1 handouts, lecture content, difficulty parameters, and custom target languages.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRAGDrawerOpen(true)}
                  className="w-1/2 py-2 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse animate-duration-1000" />
                  <span>RAG Drawer ({pinnedChunks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalStep(1)
                    setShowAiModal(true)
                  }}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>AI Gen</span>
                </button>
              </div>
            </div>

            {/* Right Column: Upload Assignment Resources */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  Assignment Files & Resources
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Tải lên tài liệu bài tập: Đề bài, đáp án mẫu, dữ liệu thực hành hoặc tài liệu đọc tham khảo.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Đề bài / Mô tả (Prompt file) */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Đề bài / Mô tả Bài tập (PDF/MD/Docx) <span className="text-rose-500">*</span>
                  </label>
                  {promptFile || promptStoragePath ? (
                    <div className="flex items-center justify-between text-xs bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-2 truncate pr-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-slate-200 truncate font-semibold">
                          {promptFile ? promptFile.name : promptStoragePath.split('/').pop()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isParsingFile}
                          onClick={handleParsePromptFile}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-md flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          {isParsingFile ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                          )}
                          <span>AI Trích xuất</span>
                        </button>
                        
                        <button
                          type="button"
                          disabled={isParsingFile}
                          onClick={() => {
                            setPromptFile(null)
                            setPromptStoragePath('')
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 text-rose-500 transition-colors disabled:opacity-50"
                          title="Xóa đề bài"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-800 rounded-xl p-2.5 text-center bg-slate-950/30 hover:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        id="prompt-file-upload"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPromptFile(e.target.files[0])
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.docx,.doc,.md,.txt,.zip"
                      />
                      <FileUp className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] text-slate-400 font-bold">Tải lên đề bài (.pdf, .docx, .md)</span>
                    </div>
                  )}
                </div>

                {/* 2. File đáp án chính thức (Solution key file) */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    File đáp án mẫu chính thức (Solution Key - .ipynb/.py/.pdf)
                  </label>
                  {solutionFile || solutionStoragePath ? (
                    <div className="flex items-center justify-between text-xs bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileUp className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-slate-200 truncate font-semibold">
                          {solutionFile ? solutionFile.name : solutionStoragePath.split('/').pop()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSolutionFile(null)
                          setSolutionStoragePath('')
                        }}
                        className="p-1 rounded bg-slate-900 border border-slate-850 hover:bg-slate-800 text-rose-500 transition-colors"
                        title="Xóa đáp án"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-800 rounded-xl p-2.5 text-center bg-slate-950/30 hover:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        id="solution-file-upload-tab2"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSolutionFile(e.target.files[0])
                            setSolutionMode('upload')
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".py,.ipynb,.csv,.xlsx,.xls,.pdf,.docx,.doc,.md,.txt,.zip"
                      />
                      <FileUp className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] text-slate-400 font-bold">Tải lên đáp án mẫu (.py, .ipynb, .pdf)</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-800/60 my-1"></div>

                {/* 3. File dữ liệu thực hành */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    File dữ liệu thực hành (CSV/Excel/JSON)
                  </label>
                  <div className="relative border border-dashed border-slate-800 rounded-xl p-2.5 text-center bg-slate-950/30 hover:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      id="data-file-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0]
                          setDataFiles((prev) => [
                            ...prev,
                            {
                              name: file.name,
                              size: file.size,
                              file: file,
                              downloadable: true,
                              previewable: true
                            }
                          ])
                          e.target.value = ''
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".csv,.xlsx,.xls,.json,.txt"
                    />
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-bold">Thêm dữ liệu thực hành (.csv, .xlsx)</span>
                  </div>
                </div>

                {/* 4. Tài liệu tham khảo đọc thêm */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Tài liệu tham khảo đọc thêm
                  </label>
                  <div className="relative border border-dashed border-slate-800 rounded-xl p-2.5 text-center bg-slate-950/30 hover:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      id="ref-file-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0]
                          setReferenceFiles((prev) => [
                            ...prev,
                            {
                              name: file.name,
                              size: file.size,
                              file: file,
                              downloadable: true,
                              previewable: true
                            }
                          ])
                          e.target.value = ''
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.docx,.doc,.txt"
                    />
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-bold">Thêm tài liệu tham khảo (.pdf, .docx)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Batches Grid Layout */}
          {batches.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1 font-mono">
                ── All Batches ──
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.map((batch, bIdx) => {
                  const approved = batch.questions.filter(q => q.status === 'approved').length
                  const pending = batch.questions.filter(q => q.status === 'pending').length
                  const rejected = batch.questions.filter(q => q.status === 'rejected').length
                  const typeText = batch.type === 'multiple_choice' ? 'MC Theory' : 'Essay Code'
                  const isFileImport = batch.questions.some(q => q.source === 'file_import')
                  const sourceText = isFileImport ? `File Import` : 'AI'
                  
                  return (
                    <div key={batch.id || bIdx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl relative group transition-colors hover:border-slate-700 flex flex-col justify-between min-h-[110px] shadow-sm">
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-slate-200">
                          Batch {bIdx + 1}: {sourceText}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium">
                          {typeText}({batch.questions.length})
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60">
                          <span className="text-[10px] text-slate-400 font-mono">
                          Approved <strong className="text-emerald-700">{approved}</strong> | Pending <strong className="text-amber-700">{pending}</strong> | Rejected <strong className="text-rose-600">{rejected}</strong>
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBatchIndex(bIdx)
                              setModalStep(3)
                              setShowAiModal(true)
                            }}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(bIdx)}
                            className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="text-xs text-slate-400 font-semibold select-none flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div>
                  Total: <strong className="text-slate-200">{batches.reduce((acc, b) => acc + b.questions.length, 0)}</strong> questions (<strong className="text-emerald-700">{batches.reduce((acc, b) => acc + b.questions.filter(q => q.status === 'approved').length, 0)}</strong> approved)
                </div>
              </div>
            </div>
          )}

          {/* Content Summary */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1 font-mono">
              ── Content Summary ──
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-350 bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl">
              <div>
                Questions: <strong className="text-slate-200">{batches.reduce((acc, b) => acc + b.questions.length, 0)}</strong> (AI: {batches.reduce((acc, b) => acc + b.questions.filter(q => q.source === 'ai_generator').length, 0)}, File: {batches.reduce((acc, b) => acc + b.questions.filter(q => q.source === 'file_import').length, 0)})
              </div>
              <button
                type="button"
                disabled={batches.length === 0}
                onClick={() => {
                  setShowBatchSummaryModal(true)
                }}
                className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-[10px] shadow-sm transition-colors"
              >
                [View All Batches]
              </button>
            </div>
          </div>

          {/* Attached Files */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none font-mono">
              ── Attached Files ──
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data files card */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3 shadow-sm">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  📂 Data Files:
                </span>
                {dataFiles.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic pl-1">No files uploaded</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {dataFiles.map((fileItem, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                        <span className="text-slate-300 truncate max-w-[180px] font-medium" title={fileItem.name}>
                          {fileItem.name} ({(fileItem.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setDataFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-700 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20 rounded"
                        >
                          [Delete]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference files card */}
              <div className="p-4 bg-slate-950 border border-slate-855 rounded-xl space-y-3 shadow-sm">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  📂 Reference Files:
                </span>
                {referenceFiles.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic pl-1">No files uploaded</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {referenceFiles.map((fileItem, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                        <span className="text-slate-305 truncate max-w-[180px] font-medium" title={fileItem.name}>
                          {fileItem.name} ({(fileItem.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setReferenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-700 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20 rounded"
                        >
                          [Delete]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Assignment Settings */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Assignment Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Max Score *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={assignmentForm.maxScore}
                  onChange={(e) => {
                    const val = e.target.value
                    setAssignmentForm({
                      ...assignmentForm,
                      maxScore: val === '' ? 100 : Math.max(0, parseFloat(val) || 0)
                    })
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                />
              </div>
            </div>

            {/* Section Weight Distribution */}
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                ⚖️ Section Weight Distribution
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Multiple Choice (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assignmentForm.mcqWeightPercent !== undefined ? assignmentForm.mcqWeightPercent : 50}
                    onChange={(e) => {
                      const mcqVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      setAssignmentForm({
                        ...assignmentForm,
                        mcqWeightPercent: mcqVal,
                        essayWeightPercent: 100 - mcqVal
                      })
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Essay & Code (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={assignmentForm.essayWeightPercent !== undefined ? assignmentForm.essayWeightPercent : 50}
                    onChange={(e) => {
                      const essayVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      setAssignmentForm({
                        ...assignmentForm,
                        essayWeightPercent: essayVal,
                        mcqWeightPercent: 100 - essayVal
                      })
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Weights must total 100%. These percentages determine the target points split between sections.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Max Files
                </label>
                <input
                  type="number"
                  min="0"
                  value={assignmentForm.maxFiles}
                  onChange={(e) => {
                    const val = e.target.value
                    setAssignmentForm({
                      ...assignmentForm,
                      maxFiles: val === '' ? 3 : Math.max(0, parseInt(val) || 0)
                    })
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Max Size (MB)
                </label>
                <input
                  type="number"
                  min="0"
                  value={assignmentForm.maxTotalSizeMb}
                  onChange={(e) => {
                    const val = e.target.value
                    setAssignmentForm({
                      ...assignmentForm,
                      maxTotalSizeMb: val === '' ? 50 : Math.max(0, parseInt(val) || 0)
                    })
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Grace Hours
                </label>
                <input
                  type="number"
                  min="0"
                  value={assignmentForm.gracePeriodHours}
                  onChange={(e) => {
                    const val = e.target.value
                    setAssignmentForm({
                      ...assignmentForm,
                      gracePeriodHours: val === '' ? 0 : Math.max(0, parseInt(val) || 0)
                    })
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Late Penalty (%/day)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={assignmentForm.penaltyPercentPerDay}
                onChange={(e) => {
                  const val = e.target.value
                  setAssignmentForm({
                    ...assignmentForm,
                    penaltyPercentPerDay: val === '' ? 0 : Math.max(0, parseFloat(val) || 0)
                  })
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
              />
            </div>

            <div className="shrink-0 flex flex-col gap-1.5 pt-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Auto-Publish Grades
              </label>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  id="asg_auto_publish_yes"
                  onClick={() => setAssignmentForm({ ...assignmentForm, autoPublishGrades: true })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    assignmentForm.autoPublishGrades
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-extrabold shadow-md'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  id="asg_auto_publish_no"
                  onClick={() => setAssignmentForm({ ...assignmentForm, autoPublishGrades: false })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    !assignmentForm.autoPublishGrades
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-extrabold shadow-md'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  No
                </button>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-500 italic leading-relaxed">
                Note: Assignment due dates are configured per cohort under Class Schedules. Grace Hours and Late Penalty settings configured here will apply relative to those deadlines.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500 text-xs">
          This lesson does not have any assignment. Enable it above to configure.
        </div>
      )}
      <SemanticSearchDrawer
        isOpen={isRAGDrawerOpen}
        onClose={() => setIsRAGDrawerOpen(false)}
        onPinChunk={(chunk) => {
          if (setPinnedChunks && !pinnedChunks.some(pc => pc.chunk_id === chunk.chunk_id)) {
            setPinnedChunks([...pinnedChunks, chunk])
          }
        }}
        pinnedChunks={pinnedChunks}
        onUnpinChunk={(chunkId) => {
          if (setPinnedChunks) {
            setPinnedChunks(pinnedChunks.filter(pc => pc.chunk_id !== chunkId))
          }
        }}
      />
    </div>
  )
}

