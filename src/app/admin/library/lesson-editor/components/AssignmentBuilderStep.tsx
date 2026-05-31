'use client'

import React from 'react'
import { Sparkles, Upload } from 'lucide-react'

interface AssignmentFileItem {
  name: string
  size: number
  storage_path?: string
  file?: File | null
  downloadable: boolean
  previewable: boolean
}

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
}

interface BatchItem {
  id: number
  type: 'multiple_choice' | 'essay'
  category: 'theory' | 'code'
  defaultAnswerFormat: 'text' | 'file' | 'both'
  questions: QuestionItem[]
}

interface AssignmentBuilderStepProps {
  hasAssignment: boolean
  setHasAssignment: (val: boolean) => void
  assignmentForm: any
  setAssignmentForm: React.Dispatch<React.SetStateAction<any>>
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
  asgDragActive,
  setModalStep,
  setShowAiModal,
  handleDeleteBatch,
  setShowBatchSummaryModal,
  handleAsgDrag,
  handleAsgDrop,
  setClassifyFile,
  setClassifyType,
  setClassifyDownloadable,
  setClassifyPreviewable,
  setClassifyModalOpen
}: AssignmentBuilderStepProps) {
  return (
    <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
          Assignment Parameters
        </h3>
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
                  setAssignmentForm((prev: any) => ({ ...prev, title: title + ' Assignment' }))
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
              <button
                type="button"
                onClick={() => {
                  setModalStep(1)
                  setShowAiModal(true)
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Open AI Generator</span>
              </button>
            </div>

            {/* Right Column: Upload File Extractor */}
            <div className="bg-slate-955/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  Upload File
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Drag & drop your own assessment documents, markdown quiz sheets, code templates, or CSV tables. The AI will parse your file and import question sets directly as a structured batch.
                </p>
              </div>
              
              <div
                onDragEnter={handleAsgDrag}
                onDragOver={handleAsgDrag}
                onDragLeave={handleAsgDrag}
                onDrop={handleAsgDrop}
                className={`relative border-2 border-dashed rounded-xl p-3 text-center flex flex-col items-center justify-center transition-all ${
                  asgDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <input
                  type="file"
                  id="asg-file-upload"
                  multiple={false}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0]
                      setClassifyFile(file)
                      setClassifyType('data')
                      setClassifyDownloadable(true)
                      setClassifyPreviewable(true)
                      setClassifyModalOpen(true)
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.docx,.csv,.xlsx,.xls,.md,.json,.txt,.zip,.js,.ts,.py"
                />
                <Upload className="w-5 h-5 text-slate-500 mb-1" />
                <span className="text-[10px] font-semibold text-slate-350">
                  Drop file here or click to browse
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5 font-mono">
                  Supported: PDF, DOCX, CSV, MD, ZIP, PY
                </span>
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
                          onClick={() => setDataFiles((prev: any) => prev.filter((_: any, i: any) => i !== idx))}
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
                          onClick={() => setReferenceFiles((prev: any) => prev.filter((_: any, i: any) => i !== idx))}
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
                  className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                />
              </div>
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
                  className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
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
                  className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
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
                  className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
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
                className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
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
                      : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-300'
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
    </div>
  )
}
