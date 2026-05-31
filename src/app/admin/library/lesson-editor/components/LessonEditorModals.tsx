'use client'

import React from 'react'
import {
  X,
  Loader2,
  Eye,
  BookOpen,
  ClipboardList,
  Trash2,
  Edit,
  Brain,
  Plus,
  FileText,
  Sparkles,
  CheckCircle,
  XCircle,
  Upload,
  FileCheck,
  Check,
  Minus,
  Lightbulb,
  Heart,
  Network,
  Paperclip,
  Link as LinkIcon,
  Code as CodeIcon,
  FileCode,
  RefreshCw
} from 'lucide-react'
import DocumentViewer from '@/components/DocumentViewer'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'
import { renderSimpleMarkdown } from '@/lib/markdown'
import { cleanOptionText } from '../hooks/useLessonEditorState'
import { getSignedUrlAction } from '@/app/admin/library/actions/materials'

interface LessonEditorModalsProps {
  state: any
}

export function LessonEditorModals({ state }: LessonEditorModalsProps) {
  const {
    verifyMaterial,
    setVerifyMaterial,
    verifyDisplayMode,
    setVerifyDisplayMode,
    savingVerify,
    setSavingVerify,
    showMaterialsPreview,
    setShowMaterialsPreview,
    showAssignmentPreview,
    setShowAssignmentPreview,
    previewSignedUrls,
    previewErrors,
    previewUrlStatus,
    markdownTemplates,
    setMarkdownTemplates,
    downloadAllowed,
    materials,
    title,
    hasAssignment,
    assignmentForm,
    batches,
    setBatches,
    activeBatchIndex,
    setActiveBatchIndex,
    activeQuestionIndex,
    setActiveQuestionIndex,
    modalStep,
    setModalStep,
    showAiModal,
    setShowAiModal,
    showBatchSummaryModal,
    setShowBatchSummaryModal,
    previewBatchIndex,
    setPreviewBatchIndex,
    editingQuestion,
    setEditingQuestion,
    editingBatchIndex,
    setEditingBatchIndex,
    editingQuestionIndex,
    setEditingQuestionIndex,
    classifyModalOpen,
    setClassifyModalOpen,
    classifyFile,
    setClassifyFile,
    classifyType,
    setClassifyType,
    classifyDownloadable,
    setClassifyDownloadable,
    classifyPreviewable,
    setClassifyPreviewable,
    selectedModel,
    setSelectedModel,
    isParsingFile,
    handleConfirmClassification,
    showEssayFormatModal,
    setShowEssayFormatModal,
    parsedQuestionsTemp,
    setParsedQuestionsTemp,
    parsedFileNameTemp,
    setParsedFileNameTemp,
    handleApplyEssayFormat,
    aiSelectedMaterials,
    setAiSelectedMaterials,
    aiType,
    setAiType,
    aiCategory,
    setAiCategory,
    aiQuestionCount,
    setAiQuestionCount,
    aiDefaultAnswerFormat,
    setAiDefaultAnswerFormat,
    aiDifficulty,
    setAiDifficulty,
    aiLanguage,
    setAiLanguage,
    aiSampleData,
    setAiSampleData,
    handleStartGenerating,
    genStage,
    genElapsed,
    readingDuration,
    generatingDuration,
    sampleDataDuration,
    handleRegenAllRejected,
    handleRegenerateQuestion,
    handleDeleteQuestion,
    handleEditSave,
    handleDeleteBatch,
    handleQuestionFormatOverride,
    handleInlineApprove,
    handleInlineReject,
    handleSaveQuestionsToAssignment,
    simulatedAnswers,
    setSimulatedAnswers,
    dataFiles,
    referenceFiles,
    regeneratingIndex,
    setRegeneratingIndex
  } = state

  return (
    <>
      {/* Verify & Configure Modal */}
      {verifyMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Verify Handout: {verifyMaterial.title}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Verify the parsed content results. Student download permission is controlled globally.
                </p>
              </div>
              <button
                onClick={() => setVerifyMaterial(null)}
                className="text-slate-400 hover:text-slate-200 text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-350">
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Parsed Content Preview (Server Extraction)
                </span>
                
                <div className="bg-slate-955 border border-slate-700 rounded-xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto text-xs leading-relaxed">
                  {verifyMaterial.type === 'docx' ? (
                    verifyMaterial.metadata?.viewer_artifact?.viewer_html ? (
                      <div 
                        className="prose max-w-none text-slate-200 text-xs"
                        dangerouslySetInnerHTML={{ __html: verifyMaterial.metadata.viewer_artifact.viewer_html }}
                      />
                    ) : (
                      <span className="text-slate-500 italic">No HTML parsing output generated for this Word document.</span>
                    )
                  ) : verifyMaterial.type === 'markdown' ? (
                    verifyMaterial.metadata?.viewer_artifact?.viewer_markdown ? (
                      <div 
                        className="prose max-w-none text-slate-200 text-xs"
                        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(verifyMaterial.metadata.viewer_artifact.viewer_markdown) }}
                      />
                    ) : (
                      <span className="text-slate-500 italic">No markdown preview content available.</span>
                    )
                  ) : verifyMaterial.type === 'json' ? (
                    <pre className="overflow-x-auto p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs whitespace-pre-wrap">
                      {JSON.stringify(verifyMaterial.metadata?.viewer_artifact?.viewer_json || verifyMaterial.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
                    </pre>
                  ) : ['csv', 'xlsx'].includes(verifyMaterial.type) ? (
                    verifyMaterial.metadata?.viewer_artifact?.rows && verifyMaterial.metadata?.viewer_artifact?.rows.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-700 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-800 text-[10px]">
                          <thead className="bg-slate-900">
                            <tr>
                              {(verifyMaterial.metadata.viewer_artifact.headers || []).map((hdr: string, i: number) => (
                                <th key={i} className="px-3 py-1.5 text-left font-semibold text-slate-100 border-r border-slate-700 last:border-0 whitespace-nowrap">
                                  {hdr}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-955">
                            {(verifyMaterial.metadata.viewer_artifact.rows || []).slice(0, 5).map((row: any[], i: number) => (
                              <tr key={i} className="hover:bg-slate-800/20">
                                {row.map((cell: any, j: number) => (
                                  <td key={j} className="px-3 py-1.5 text-slate-100 border-r border-slate-700 last:border-0 whitespace-nowrap">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No table dataset grid parsed for this spreadsheet.</span>
                    )
                  ) : verifyMaterial.type === 'pdf' ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <span>PDF Document Guide</span>
                      <span className="text-[10px] text-slate-500">Students will read this file via the secure PDF Document Viewer.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                      <LinkIcon className="w-8 h-8 text-slate-500" />
                      <span>External Resource Link</span>
                      <a href={verifyMaterial.storage_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline break-all">
                        {verifyMaterial.storage_url}
                      </a>
                    </div>
                  )}
                </div>
                {['csv', 'xlsx'].includes(verifyMaterial.type) && verifyMaterial.metadata?.viewer_artifact?.row_count > 5 && (
                  <span className="block text-xs text-slate-500 italic">
                    Showing first 5 of {verifyMaterial.metadata.viewer_artifact.row_count} rows.
                  </span>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setVerifyMaterial(null)}
                className="px-4 py-2 rounded-xl bg-slate-955 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials Preview Modal */}
      {showMaterialsPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  Materials & Handouts Preview
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This simulates what students see when reviewing lesson materials and study handouts.
                </p>
              </div>
              <button
                onClick={() => setShowMaterialsPreview(false)}
                className="text-slate-400 hover:text-slate-200 text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900 text-slate-100 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Lesson Header Simulation */}
                <div className="border-b border-slate-805 pb-4">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Lesson Reference Materials
                  </span>
                  <h1 className="text-xl font-bold text-slate-100 mt-1">{title || 'Untitled Lesson'}</h1>
                </div>

                {/* Handouts Materials List */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    Mapped Materials & Handouts ({materials.length})
                  </h5>

                  {materials.length === 0 ? (
                    <div className="text-center py-10 border border-slate-800 border-dashed rounded-xl bg-slate-955/20 text-slate-400 text-xs">
                      No materials mapped to this lesson yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {materials.map((m, idx) => {
                        const styles = getMaterialTypeStyles(m.type)
                        const Icon = getMaterialIcon(m.type)
                        return (
                          <div key={m.id || idx} className="p-4 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-800 transition-all">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`w-3.5 h-3.5 ${styles.iconColor} shrink-0`} />
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {m.title}
                                </span>
                              </div>
                              {m.note && (
                                <span className="block text-[10px] text-slate-400 truncate">
                                  {m.note}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {['pdf', 'docx', 'csv', 'xlsx'].includes(m.type) && previewSignedUrls[m.id] && (
                                <button
                                  type="button"
                                  onClick={() => window.open(previewSignedUrls[m.id], '_blank')}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-305 text-[10px] font-bold border border-slate-700 transition-all"
                                >
                                  Preview
                                </button>
                              )}
                              {['link', 'markdown', 'json'].includes(m.type) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (m.type === 'link') {
                                      window.open(m.metadata?.link_url || '#', '_blank')
                                    } else {
                                      alert(`Previewing custom content: ${m.title}`)
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-305 text-[10px] font-bold border border-slate-700 transition-all"
                                >
                                  Open
                                </button>
                              )}
                              {downloadAllowed && ['pdf', 'docx', 'csv', 'xlsx', 'json', 'markdown'].includes(m.type) && (
                                <a
                                  href={previewSignedUrls[m.id] || '#'}
                                  download={m.title}
                                  className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/20 transition-all"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowMaterialsPreview(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-205 font-semibold text-xs transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Preview Simulator Modal */}
      {showAssignmentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  Assignment View Simulator
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This simulates what students see when completing assignments on this lesson.
                </p>
              </div>
              <button
                onClick={() => setShowAssignmentPreview(false)}
                className="text-slate-400 hover:text-slate-200 text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900 text-slate-100 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Lesson Header Simulation */}
                <div className="border-b border-slate-805 pb-4">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Course Roadmap / Lesson Preview
                  </span>
                  <h1 className="text-xl font-bold text-slate-100 mt-1">{title || 'Untitled Lesson'}</h1>
                </div>

                {/* 1. Deliverables / Assignment Section */}
                {hasAssignment && (
                  <div className="border border-indigo-500/20 bg-slate-950/20 rounded-3xl p-6 md:p-8 space-y-6">
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
                          <p className="text-xs text-slate-400 mt-0.5">
                            Max Score: {assignmentForm.maxScore} pts | Files: Max {assignmentForm.maxFiles} ({assignmentForm.maxTotalSizeMb}MB)
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider select-none shrink-0 cursor-pointer shadow-lg transition-all hover:scale-[1.02]">
                        Submit Deliverables
                      </div>
                    </div>

                    {/* Section: Downloadable Data Files */}
                    {dataFiles.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-blue-500" />
                          Attached Data Files (For Download)
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dataFiles.map((fileItem, idx) => (
                            <div key={idx} className="p-3 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {fileItem.name}
                                </span>
                                <span className="block text-[9px] text-slate-500">
                                  {(fileItem.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              {fileItem.downloadable && (
                                <a
                                  href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                                  download
                                  className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/20 transition-all shrink-0"
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
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          Reference Materials (For Reading)
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {referenceFiles.map((fileItem, idx) => (
                            <div key={idx} className="p-3 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {fileItem.name}
                                </span>
                                <span className="block text-[9px] text-slate-500">
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
                                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-350 hover:text-slate-105 text-[9px] font-bold transition-all"
                                  >
                                    Preview
                                  </button>
                                )}
                                {fileItem.downloadable && (
                                  <a
                                    href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                                    download
                                    className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-bold border border-blue-500/20 transition-all"
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
                    {(() => {
                      const getAnswerFormat = (question: any, batch: any): 'text' | 'file' | 'both' => {
                        if (question.answerFormat) return question.answerFormat
                        return batch?.defaultAnswerFormat || 'text'
                      }

                      const approvedQs: any[] = []
                      batches.forEach(b => {
                        b.questions.forEach(q => {
                          if (q.status === 'approved') {
                            approvedQs.push({ ...q, batch: b })
                          }
                        })
                      })

                      if (approvedQs.length === 0) return null

                      return (
                        <div className="space-y-4 pt-4 border-t border-slate-800">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                            Assignment Questions ({approvedQs.length})
                          </h5>

                          <div className="space-y-4">
                            {approvedQs.map((q, idx) => {
                              const resolvedFormat = q.batch.type === 'multiple_choice' ? 'text' : getAnswerFormat(q, q.batch)
                              return (
                                <div key={`q-final-${q.id || idx}-${idx}`} className="p-5 bg-slate-955 border border-slate-850 rounded-2xl space-y-3 text-xs text-slate-200 animate-fade-in">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                      Question {idx + 1} ({q.batch.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'} — {q.batch.category === 'theory' ? 'Lý thuyết' : 'Code'})
                                    </span>
                                  </div>
                                  <p className="text-slate-200 font-semibold leading-relaxed">
                                    {q.content}
                                  </p>

                                  {/* Answer Format Indicator for Essay questions in Merged Preview */}
                                  {q.batch.type === 'essay' && (
                                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 select-none">
                                      <span>Format:</span>
                                      {resolvedFormat === 'text' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📝 Text Only</span>}
                                      {resolvedFormat === 'file' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📎 File Upload Only</span>}
                                      {resolvedFormat === 'both' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">🔀 Both</span>}
                                    </div>
                                  )}

                                  {/* Options (if multiple choice) / Response field (if essay) */}
                                  {q.batch.type === 'essay' ? (
                                    <div className="space-y-3">
                                      {/* Text input (for text or both) */}
                                      {(resolvedFormat === 'text' || resolvedFormat === 'both') && (
                                        <div className="space-y-1.5">
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            Your Answer (Text)
                                          </label>
                                          <textarea
                                            value={simulatedAnswers[idx] || ''}
                                            onChange={(e) => {
                                              setSimulatedAnswers((prev: any) => ({ ...prev, [idx]: e.target.value }))
                                            }}
                                            placeholder="Type your simulated essay response..."
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 h-24 placeholder-slate-600"
                                          />
                                          <div className="text-[10px] text-slate-500 text-right">
                                            {(simulatedAnswers[idx] || '').trim().split(/\s+/).filter(Boolean).length} words
                                          </div>
                                        </div>
                                      )}

                                      {/* Or separator (for both) */}
                                      {resolvedFormat === 'both' && (
                                        <div className="flex items-center justify-center gap-3">
                                          <div className="h-px bg-slate-850 flex-1" />
                                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">or</span>
                                          <div className="h-px bg-slate-850 flex-1" />
                                        </div>
                                      )}

                                      {/* File upload (for file or both) */}
                                      {(resolvedFormat === 'file' || resolvedFormat === 'both') && (
                                        <div className="space-y-1.5">
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            {resolvedFormat === 'file' ? 'Upload your file:' : 'Upload file instead:'}
                                          </label>
                                          <div className="border border-dashed border-slate-700 bg-slate-900/40 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1 select-none">
                                            <Paperclip className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-200">Drag & drop or click to upload</span>
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
                                              setSimulatedAnswers((prev: any) => ({ ...prev, [idx]: letter }))
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                                              isSelected
                                                ? 'bg-blue-600/10 border-blue-500 text-slate-105 shadow-sm ring-1 ring-blue-500/25 font-bold'
                                                : 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-850/60 hover:border-slate-800'
                                            }`}
                                          >
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                              isSelected
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-slate-700 text-slate-550'
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
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAssignmentPreview(false)}
                className="px-4 py-2 rounded-xl bg-slate-955 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-202 font-semibold text-xs transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classify File Modal */}
      {classifyModalOpen && classifyFile && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Classify Uploaded File
              </h3>
              <button
                type="button"
                onClick={() => {
                  setClassifyModalOpen(false)
                  setClassifyFile(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-202 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs text-slate-200">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Selected File
                </span>
                <span className="block text-xs font-semibold text-slate-200 truncate">
                  {classifyFile.name}
                </span>
                <span className="block text-[9px] text-slate-400 mt-0.5">
                  ({(classifyFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Classify As
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    classifyType === 'data'
                      ? 'bg-blue-600/10 border-blue-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                  }`}>
                    <input
                      type="radio"
                      name="classify_type"
                      checked={classifyType === 'data'}
                      onChange={() => {
                        setClassifyType('data')
                        setClassifyDownloadable(true)
                        setClassifyPreviewable(true)
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-200">Student Data File</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        Students download this file for assignments (e.g. datasets, CSVs, starting code).
                      </span>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    classifyType === 'reference'
                      ? 'bg-blue-600/10 border-blue-500 text-slate-105'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                  }`}>
                    <input
                      type="radio"
                      name="classify_type"
                      checked={classifyType === 'reference'}
                      onChange={() => {
                        setClassifyType('reference')
                        setClassifyDownloadable(true)
                        setClassifyPreviewable(true)
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-200">Reference Material</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        Students read this file inline (e.g. guide guide PDFs, cheat sheets, guidelines).
                      </span>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    classifyType === 'question'
                      ? 'bg-blue-600/10 border-blue-500 text-slate-105'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                  }`}>
                    <input
                      type="radio"
                      name="classify_type"
                      checked={classifyType === 'question'}
                      onChange={() => setClassifyType('question')}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-200">Assignment Question Sheet (AI Parse)</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        AI extracts questions from this file and appends them to your assignment.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {classifyType === 'question' && (
                <div className="space-y-2 pt-2 animate-fade-in">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    AI Model for Parsing
                  </label>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Select which artificial intelligence model to use for extracting structured questions from this sheet.
                  </p>
                  <select
                     value={selectedModel}
                     onChange={(e) => setSelectedModel(e.target.value)}
                     className="w-full bg-slate-955 border border-slate-808 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold shadow-inner cursor-pointer"
                  >
                     <option value="gemini-2.5-flash">Gemini 2.5 Flash (Google)</option>
                     <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google)</option>
                     <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Google)</option>
                     <option value="groq/llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                     <option value="groq/llama-3.1-8b-instant">Llama 3.1 8B (Groq)</option>
                     <option value="openrouter/deepseek/deepseek-chat">DeepSeek V3 (OpenRouter)</option>
                     <option value="openrouter/google/gemini-2.5-flash">Gemini 2.5 Flash (OpenRouter)</option>
                     <option value="openrouter/meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Free (OpenRouter)</option>
                     <option value="ollama">Ollama (Local Llama)</option>
                  </select>
                </div>
              )}

              {classifyType !== 'question' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Options
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={classifyDownloadable}
                        onChange={(e) => setClassifyDownloadable(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                      />
                      <span className="text-xs text-slate-300">Allow Download</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={classifyPreviewable}
                        onChange={(e) => setClassifyPreviewable(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                      />
                      <span className="text-xs text-slate-300">Allow Inline Preview</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setClassifyModalOpen(false)
                  setClassifyFile(null)
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isParsingFile}
                onClick={handleConfirmClassification}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5"
              >
                {isParsingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{classifyType === 'question' ? 'AI Parse Questions' : 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Post-Parse Essay Format Modal */}
      {showEssayFormatModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                Essay Questions Detected!
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEssayFormatModal(false)
                  setParsedQuestionsTemp([])
                  setParsedFileNameTemp('')
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-202 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs text-slate-200">
              <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Parsed File Source:
                </span>
                <span className="block text-xs font-semibold text-slate-200 truncate">
                  {parsedFileNameTemp}
                </span>
                <span className="block text-[9px] text-emerald-400 font-bold font-mono">
                  ✓ Successfully extracted {parsedQuestionsTemp.length} essay question(s)
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Choose Submission Answer Format
                </label>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Configure how you would like students to submit their answers for these parsed essay questions:
                </p>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApplyEssayFormat('text')}
                    className="p-3 bg-slate-955 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-2xl flex items-start gap-3 text-left transition-all group"
                  >
                    <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      📝
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-200">Text Input Only</span>
                      <span className="block text-[9px] text-slate-550 mt-0.5 leading-normal">
                        Students write their essay essay answers directly inside a rich textarea editor. Ideal for standard written responses.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyEssayFormat('file')}
                    className="p-3 bg-slate-955 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-2xl flex items-start gap-3 text-left transition-all group"
                  >
                    <div className="p-2 bg-amber-600/10 text-amber-505 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                      📎
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-200">File Upload Only</span>
                      <span className="block text-[9px] text-slate-550 mt-0.5 leading-normal">
                        Students upload a file submission (PDF, DOCX, ZIP, source code) to answer the questions. Ideal for lab reports or projects.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyEssayFormat('both')}
                    className="p-3 bg-slate-955 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 rounded-2xl flex items-start gap-3 text-left transition-all group"
                  >
                    <div className="p-2 bg-purple-600/10 text-purple-500 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                      🔀
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-200">Both Options Allowed</span>
                      <span className="block text-[9px] text-slate-550 mt-0.5 leading-normal">
                        Give students maximum flexibility: they can choose to write manually, upload a file, or do both.
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowEssayFormatModal(false)
                  setParsedQuestionsTemp([])
                  setParsedFileNameTemp('')
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel & Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  AI Assignment Generator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (modalStep === 3) {
                    const confirmed = window.confirm('Discard generated questions and close?')
                    if (!confirmed) return
                  }
                  setShowAiModal(false)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-202 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* STEP 1: UNIFIED SOURCE MATERIALS & CONFIGURATION */}
              {modalStep === 1 && (
                <div className="flex-1 overflow-y-auto p-6 w-full flex flex-col justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto w-full">
                    {/* Left Column: Source Materials (col-span-5) */}
                    <div className="md:col-span-5 space-y-4 flex flex-col">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📚</span>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                            Source Materials
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Select materials for the AI to read and reference for the assignment.
                        </p>
                      </div>

                      {materials.length === 0 ? (
                        <div className="flex-1 min-h-[250px] flex items-center justify-center p-8 border border-dashed border-slate-800 bg-slate-950/20 rounded-2xl text-center text-xs text-slate-500">
                          No materials uploaded for this lesson. The AI will generate questions using the lesson outline title and content.
                        </div>
                      ) : (
                        <div className="space-y-3 flex-1 flex flex-col">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                              Available Handouts / Files
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setAiSelectedMaterials(materials.map(m => m.id))}
                                className="text-[10px] text-blue-500 hover:text-blue-400 font-bold"
                              >
                                [Select All]
                              </button>
                              <span className="text-slate-700 text-[10px]">|</span>
                              <button
                                type="button"
                                onClick={() => setAiSelectedMaterials([])}
                                className="text-[10px] text-slate-400 hover:text-slate-350 font-bold"
                              >
                                [Deselect All]
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 max-h-[340px] overflow-y-auto space-y-2 pr-1">
                            {materials.map((m: any) => {
                              const Icon = getMaterialIcon(m.type)
                              const styles = getMaterialTypeStyles(m.type)
                              const isSelected = aiSelectedMaterials.includes(m.id)
                              return (
                                <label
                                  key={m.id}
                                  className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                                    isSelected
                                      ? styles.bg + ' border-current shadow-sm ring-1 ring-offset-0 ring-current/25'
                                      : 'bg-slate-955/30 border-slate-800 hover:bg-slate-900/50 text-slate-400 hover:text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0 pr-2">
                                    <div className="relative flex items-center justify-center shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAiSelectedMaterials((prev: any) => [...prev, m.id])
                                          } else {
                                            setAiSelectedMaterials((prev: any) => prev.filter((id: any) => id !== m.id))
                                          }
                                        }}
                                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer"
                                      />
                                    </div>
                                    <Icon className={`w-4 h-4 ${isSelected ? styles.iconColor : 'text-slate-505'} shrink-0`} />
                                    <div className="min-w-0">
                                      <span className={`block text-xs font-semibold truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                                        {m.title}
                                      </span>
                                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                                        {m.type}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                          
                          <div className="pt-2 border-t border-slate-850 shrink-0 text-right">
                            <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase font-mono">
                              {aiSelectedMaterials.length} of {materials.length} selected
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Configuration (col-span-7) */}
                    <div className="md:col-span-7 space-y-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⚙️</span>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                            Configuration
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Configure type, category, model, and questions count.
                        </p>
                      </div>

                      <div className="bg-slate-950/30 border border-slate-800 p-6 rounded-2xl space-y-5">
                        {/* Model Selector & Questions Count Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              AI Model
                            </label>
                            <select
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                            >
                              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Google)</option>
                              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google)</option>
                              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Google)</option>
                              <option value="groq/llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                              <option value="groq/llama-3.1-8b-instant">Llama 3.1 8B (Groq)</option>
                              <option value="openrouter/deepseek/deepseek-chat">DeepSeek V3 (OpenRouter)</option>
                              <option value="openrouter/google/gemini-2.5-flash">Gemini 2.5 Flash (OpenRouter)</option>
                              <option value="openrouter/meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Free (OpenRouter)</option>
                              <option value="ollama">Ollama (Local Llama)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              Number of Questions
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setAiQuestionCount((prev: any) => Math.max(1, prev - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg hover:text-slate-200 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={aiQuestionCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1
                                  setAiQuestionCount(Math.min(30, Math.max(1, val)))
                                }}
                                className="w-16 h-9 bg-slate-900 border border-slate-800 rounded-lg text-center text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setAiQuestionCount((prev: any) => Math.min(30, prev + 1))}
                                className="w-9 h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg hover:text-slate-200 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Question Type Visual Cards */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Question Type
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setAiType('multiple_choice')}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                aiType === 'multiple_choice'
                                  ? 'bg-blue-600/10 border-blue-505 text-white ring-1 ring-blue-500/30'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${
                                aiType === 'multiple_choice'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <ClipboardList className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="block text-xs font-bold">Multiple Choice</span>
                                <span className="block text-[9px] opacity-70">Single option selector</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAiType('essay')}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                aiType === 'essay'
                                  ? 'bg-purple-600/10 border-purple-500 text-white ring-1 ring-purple-500/30'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${
                                aiType === 'essay'
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="block text-xs font-bold">Essay / Practice</span>
                                <span className="block text-[9px] opacity-70">Rich text submission</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Category Visual Cards */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Category
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setAiCategory('theory')}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                aiCategory === 'theory'
                                  ? 'bg-amber-600/10 border-amber-500 text-white ring-1 ring-amber-500/30'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${
                                aiCategory === 'theory'
                                  ? 'bg-amber-500 text-slate-900'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <Lightbulb className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="block text-xs font-bold">Theory</span>
                                <span className="block text-[9px] opacity-70">Conceptual questions</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAiCategory('code')}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                aiCategory === 'code'
                                  ? 'bg-emerald-600/10 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                              }`}
                            >
                              <div className={`p-2 rounded-lg shrink-0 ${
                                aiCategory === 'code'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <Heart className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="block text-xs font-bold">Code Practice</span>
                                <span className="block text-[9px] opacity-70">Coding & scripting exercises</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {aiType === 'essay' && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              Default Answer Format
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                              <button
                                type="button"
                                onClick={() => setAiDefaultAnswerFormat('text')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                                  aiDefaultAnswerFormat === 'text'
                                    ? 'bg-blue-600/10 border-blue-505 text-white ring-1 ring-blue-500/30'
                                    : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                }`}
                              >
                                <span className="text-lg mb-1">📝</span>
                                <span className="block text-xs font-bold">Text Only</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setAiDefaultAnswerFormat('file')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                                  aiDefaultAnswerFormat === 'file'
                                    ? 'bg-amber-600/10 border-amber-500 text-white ring-1 ring-amber-500/30'
                                    : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                }`}
                              >
                                <span className="text-lg mb-1">📎</span>
                                <span className="block text-xs font-bold">File Only</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setAiDefaultAnswerFormat('both')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                                  aiDefaultAnswerFormat === 'both'
                                    ? 'bg-purple-600/10 border-purple-505 text-white ring-1 ring-purple-500/30'
                                    : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                }`}
                              >
                                <span className="text-lg mb-1">🔀</span>
                                <span className="block text-xs font-bold">Both</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Difficulty Level Button Group */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Difficulty Level
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setAiDifficulty('easy')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                aiDifficulty === 'easy'
                                  ? 'bg-emerald-600/10 border-emerald-500 text-white ring-1 ring-emerald-500/30 font-bold'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <span className="block text-xs">🟢 Easy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiDifficulty('medium')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                aiDifficulty === 'medium'
                                  ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/30 font-bold'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <span className="block text-xs">🔵 Medium</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiDifficulty('hard')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                aiDifficulty === 'hard'
                                  ? 'bg-rose-600/10 border-rose-500 text-white ring-1 ring-rose-500/30 font-bold'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <span className="block text-xs">🔴 Hard</span>
                            </button>
                          </div>
                        </div>

                        {/* Output Language Button Group */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Output Language
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setAiLanguage('vietnamese')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                aiLanguage === 'vietnamese'
                                  ? 'bg-blue-600/10 border-blue-505 text-white ring-1 ring-blue-500/30 font-bold'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <span className="block text-xs"> Tiếng Việt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiLanguage('english')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                aiLanguage === 'english'
                                  ? 'bg-blue-600/10 border-blue-505 text-white ring-1 ring-blue-500/30 font-bold'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <span className="block text-xs">🇺🇸 English</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAiLanguage('both')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                aiLanguage === 'both'
                                  ? 'bg-purple-600/10 border-purple-505 text-white ring-1 ring-purple-500/30 font-bold'
                                  : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                              }`}
                            >
                              <span className="block text-xs">🌐 Bilingual</span>
                            </button>
                          </div>
                        </div>

                        {/* Optional Sample Data Toggle */}
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-850">
                          <input
                            type="checkbox"
                            id="modal_ai_sample_data"
                            checked={aiSampleData}
                            onChange={(e) => setAiSampleData(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer"
                          />
                          <label htmlFor="modal_ai_sample_data" className="text-xs text-slate-350 cursor-pointer select-none">
                            Include sample output or test case templates for student answers
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Centered Large Generate Button Section */}
                    <div className="col-span-1 md:col-span-12 border-t border-slate-850 pt-6 flex flex-col items-center space-y-3">
                      {materials.length > 0 && aiSelectedMaterials.length === 0 && (
                        <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-1.5 animate-bounce">
                          ⚠️ Please select at least 1 source material to proceed
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={materials.length > 0 && aiSelectedMaterials.length === 0}
                        onClick={handleStartGenerating}
                        className={`group relative px-12 py-4 text-white rounded-2xl text-sm font-bold shadow-xl transition-all duration-300 flex items-center gap-3 overflow-hidden ${
                          materials.length > 0 && aiSelectedMaterials.length === 0
                            ? 'bg-slate-800 border border-slate-700 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 hover:scale-[1.03]'
                        }`}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <Sparkles className="w-5 h-5 text-white animate-pulse group-hover:rotate-12 transition-transform duration-300" />
                        <span>Generate Assignment</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: GENERATING LOAD SCREEN */}
              {modalStep === 2 && (
                <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-lg mx-auto w-full animate-fade-in">
                  <div className="w-full bg-slate-955 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                      <div className="relative flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                        Generating Assignment...
                      </h4>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Step 1: Reading Materials */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          {genStage === 'reading' ? (
                            <Loader2 className="w-4 h-4 text-blue-505 animate-spin shrink-0" />
                          ) : readingDuration !== null ? (
                            <CheckCircle className="w-4 h-4 text-emerald-505 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-700 inline-block shrink-0" />
                          )}
                          <span className={`font-semibold ${genStage === 'reading' ? 'text-slate-100' : 'text-slate-400'}`}>
                            Reading selected materials...
                            {genStage === 'reading' && ` (${((genElapsed) / 1000).toFixed(1)}s)`}
                            {readingDuration !== null && ` (${(readingDuration / 1000).toFixed(1)}s)`}
                          </span>
                        </div>
                        {readingDuration !== null && (
                          <div className="pl-7 text-[11px] text-slate-500">
                            ✓ Materials loaded ({(() => {
                              const selected = materials.filter((m: any) => aiSelectedMaterials.includes(m.id))
                              const fileCount = selected.length
                              const totalBytes = selected.reduce((sum: number, m: any) => sum + (m.metadata?.file_size || 0), 0)
                              const sizeStr = totalBytes < 1024 * 1024
                                ? `${(totalBytes / 1024).toFixed(1)} KB`
                                : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
                              return `${fileCount} file${fileCount > 1 ? 's' : ''}, ${sizeStr}`
                            })()})
                          </div>
                        )}
                      </div>

                      {/* Step 2: Generating Questions */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          {genStage === 'generating' ? (
                            <Loader2 className="w-4 h-4 text-blue-550 animate-spin shrink-0" />
                          ) : generatingDuration !== null ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-700 inline-block shrink-0" />
                          )}
                          <span className={`font-semibold ${genStage === 'generating' ? 'text-slate-100' : 'text-slate-400'}`}>
                            Generating questions...
                            {genStage === 'generating' && ` (${((genElapsed - (readingDuration || 0)) / 1000).toFixed(1)}s)`}
                            {generatingDuration !== null && ` (${(generatingDuration / 1000).toFixed(1)}s)`}
                          </span>
                        </div>
                      </div>

                      {/* Step 3: Creating Sample Data */}
                      {aiSampleData && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            {genStage === 'sample_data' ? (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                            ) : sampleDataDuration !== null ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-700 inline-block shrink-0" />
                            )}
                            <span className={`font-semibold ${genStage === 'sample_data' ? 'text-slate-100' : 'text-slate-400'}`}>
                              Creating sample data...
                              {genStage === 'sample_data' && ` (${((genElapsed - (readingDuration || 0) - (generatingDuration || 0)) / 1000).toFixed(1)}s)`}
                              {sampleDataDuration !== null && ` (${(sampleDataDuration / 1000).toFixed(1)}s)`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500 font-mono">
                      <span>ELAPSED TIME</span>
                      <span className="font-bold text-slate-300">{((genElapsed) / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & APPROVE MULTIPLE BATCHES */}
              {modalStep === 3 && batches.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-900 text-slate-100">
                  {/* Top Bar: Batch Selector tabs */}
                  <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0">
                    {batches.map((batch: any, idx: number) => {
                      const isActive = idx === activeBatchIndex
                      return (
                        <button
                          key={batch.id || idx}
                          type="button"
                          onClick={() => {
                            setActiveBatchIndex(idx)
                            setActiveQuestionIndex(0)
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm ring-1 ring-blue-500/25'
                              : 'bg-slate-900 border-slate-808 text-slate-400 hover:bg-slate-850'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            Batch {idx + 1}: {batch.type === 'multiple_choice' ? 'MC' : 'Essay'} {batch.category === 'theory' ? 'Theory' : 'Code'} ({batch.questions.length} Qs)
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Main List: Scrollable Questions Overview */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    {(() => {
                      const activeBatch = batches[activeBatchIndex]
                      if (!activeBatch || !activeBatch.questions || activeBatch.questions.length === 0) {
                        return (
                          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs py-12">
                            No questions available in this batch.
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-4 max-w-4xl mx-auto">
                          {activeBatch.questions.map((q: any, qIdx: number) => (
                            <div
                              key={q.id || qIdx}
                              className="p-5 bg-slate-955 border border-slate-800 rounded-2xl space-y-4 animate-fade-in relative hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] bg-slate-900 border border-slate-808 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                  Question {qIdx + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                  {q.source === 'file_import' && (
                                    <span className="text-[10px] bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded font-semibold border border-indigo-500/20 max-w-[200px] truncate">
                                      Source: {q.source_file || 'File Import'}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    q.status === 'approved'
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : q.status === 'rejected'
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    {q.status}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-205 leading-relaxed whitespace-pre-wrap">
                                  {q.content}
                                </p>

                                {/* Options if MC */}
                                {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                                    {q.options.map((opt: string, oIdx: number) => {
                                      const letter = String.fromCharCode(65 + oIdx)
                                      const isCorrect = q.answer === letter
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                                            isCorrect
                                              ? 'bg-emerald-600/5 border-emerald-500/30 text-slate-200 font-bold'
                                              : 'bg-slate-900 border-slate-850 text-slate-400'
                                          }`}
                                        >
                                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                                            isCorrect
                                              ? 'bg-emerald-500 border-emerald-500 text-white'
                                              : 'border-slate-700 text-slate-550'
                                          }`}>
                                            {letter}
                                          </span>
                                          <span className={isCorrect ? 'text-slate-200' : ''}>{cleanOptionText(opt, oIdx)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* Answer */}
                                {q.answer && (
                                  <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 font-medium">
                                    Correct Answer: {q.answer}
                                  </div>
                                )}

                                {/* Sample Data attached if exists */}
                                {q.data && (
                                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-[10px] text-slate-400 font-mono overflow-x-auto max-h-40 overflow-y-auto">
                                    <span className="block font-bold text-slate-355 uppercase tracking-widest mb-1 text-[9px]">Sample Data Attached</span>
                                    <pre>{JSON.stringify(q.data, null, 2)}</pre>
                                  </div>
                                )}
                              </div>

                              {/* Answer Format per-question override radio group */}
                              {activeBatch.type === 'essay' && (
                                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono select-none">
                                    Answer Format
                                  </span>
                                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-350 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === 'text'}
                                        onChange={() => handleQuestionFormatOverride(qIdx, 'text')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 cursor-pointer"
                                      />
                                      <span>📝 Text Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-355 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === 'file'}
                                        onChange={() => handleQuestionFormatOverride(qIdx, 'file')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 cursor-pointer"
                                      />
                                      <span>📎 File Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-355 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === 'both'}
                                        onChange={() => handleQuestionFormatOverride(qIdx, 'both')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-955 border-slate-700 cursor-pointer"
                                      />
                                      <span>🔀 Both</span>
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* Inline action buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-850/60">
                                <button
                                  type="button"
                                  onClick={() => handleInlineApprove(activeBatchIndex, qIdx)}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                                    q.status === 'approved'
                                      ? 'bg-emerald-600 text-white shadow-lg'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-500 border border-slate-808'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInlineReject(activeBatchIndex, qIdx)}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                                    q.status === 'rejected'
                                      ? 'bg-rose-600 text-white shadow-lg'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-808'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={regeneratingIndex === qIdx}
                                  onClick={() => {
                                    setRegeneratingIndex(qIdx)
                                    handleRegenerateQuestion(activeBatchIndex, qIdx).finally(() => setRegeneratingIndex(null))
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-808 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingIndex === qIdx ? 'animate-spin' : ''}`} />
                                  Regen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestion({
                                      ...q,
                                      options: q.options && Array.isArray(q.options)
                                        ? q.options.map((opt: string, oIdx: number) => cleanOptionText(opt, oIdx))
                                        : undefined
                                    })
                                    setEditingBatchIndex(activeBatchIndex)
                                    setEditingQuestionIndex(qIdx)
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-805 text-slate-400 hover:text-slate-200 border border-slate-808 font-bold text-xs flex items-center gap-1 transition-all"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(activeBatchIndex, qIdx)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-650/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 font-bold text-xs flex items-center gap-1 transition-all ml-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Bottom Stats & Actions bar */}
                  {(() => {
                    const activeBatch = batches[activeBatchIndex]
                    if (!activeBatch) return null

                    const totalQs = activeBatch.questions.length
                    const approvedQs = activeBatch.questions.filter((q: any) => q.status === 'approved').length
                    const pendingQs = activeBatch.questions.filter((q: any) => q.status === 'pending').length
                    const rejectedQs = activeBatch.questions.filter((q: any) => q.status === 'rejected').length

                    return (
                      <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-955 px-6 py-4 shrink-0">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                          <span>Active Batch Stats:</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold">Total: {totalQs}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold">{approvedQs} Approved</span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">{pendingQs} Pending</span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold">{rejectedQs} Rejected</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleRegenAllRejected}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Regen All Rejected
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBatches((prev: any) => {
                                const next = [...prev]
                                if (next[activeBatchIndex]) {
                                  next[activeBatchIndex] = {
                                    ...next[activeBatchIndex],
                                    questions: next[activeBatchIndex].questions.map((q: any) => ({ ...q, status: 'approved' as const }))
                                  }
                                }
                                return next
                              })
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Approve All
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveQuestionsToAssignment}
                            className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FileCheck className="w-4 h-4" />
                            Save to Assignment
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Summary Modal */}
      {showBatchSummaryModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  📋 All Batches
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBatchSummaryModal(false)
                  setPreviewBatchIndex(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
              {batches.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No batches generated or imported yet. Create one in Tab 2.
                </div>
              ) : (
                <div className="space-y-4">
                  {batches.map((batch: any, bIdx: number) => {
                    const approved = batch.questions.filter((q: any) => q.status === 'approved').length
                    const pending = batch.questions.filter((q: any) => q.status === 'pending').length
                    const rejected = batch.questions.filter((q: any) => q.status === 'rejected').length
                    const typeText = batch.type === 'multiple_choice' ? 'MC' : 'Essay'
                    const categoryText = batch.category === 'theory' ? 'Theory' : 'Code'
                    const isFileImport = batch.questions.some((q: any) => q.source === 'file_import')
                    const sourceText = isFileImport ? `From: ${batch.questions.find((q: any) => q.source_file)?.source_file || 'File'}` : 'AI Generated'
                    const isExpanded = previewBatchIndex === bIdx

                    return (
                      <div key={batch.id || bIdx} className="p-4 bg-slate-955/40 border border-slate-800 rounded-xl relative group transition-all hover:border-slate-700 flex flex-col justify-between shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="block text-xs font-bold text-slate-200">
                              Batch {bIdx + 1}: {typeText} {categoryText} ({batch.questions.length} questions)
                            </span>
                            <span className="block text-[10px] text-slate-500 font-medium truncate max-w-[300px]" title={sourceText}>
                              Source: {sourceText}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewBatchIndex(isExpanded ? null : bIdx)
                              }}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-808 hover:border-slate-700 text-[10px] font-bold text-slate-350 hover:text-slate-100 transition-colors animate-fade-in"
                            >
                              {isExpanded ? 'Hide Questions' : 'View Questions'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBatchIndex(bIdx)
                                setActiveQuestionIndex(0)
                                setModalStep(3)
                                setShowAiModal(true)
                                setShowBatchSummaryModal(false)
                                setPreviewBatchIndex(null)
                              }}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-808 hover:border-slate-700 text-[10px] font-bold text-blue-400 hover:text-blue-450 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteBatch(bIdx)
                                if (isExpanded) setPreviewBatchIndex(null)
                              }}
                              className="px-2 py-1 rounded bg-rose-650/10 border border-rose-500/20 text-[10px] font-bold text-rose-500 hover:bg-rose-655/20 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                          <span className="text-[10px] text-slate-400 font-mono">
                            ✅ <strong className="text-emerald-500">{approved}</strong> | ⏳ <strong className="text-amber-500">{pending}</strong> | ✗ <strong className="text-rose-500">{rejected}</strong>
                          </span>
                        </div>

                        {/* Inline Read-only Accordion Question Preview */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 pl-2 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Read-only Question Preview:</span>
                            {batch.questions.map((q: any, qIdx: number) => (
                              <div key={q.id || qIdx} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-slate-400 font-bold font-mono">Q{qIdx + 1}. {q.status.toUpperCase()}</span>
                                  {q.points && <span className="text-[9px] text-slate-500">{q.points} pts</span>}
                                </div>
                                <p className="text-slate-200 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{q.content}</p>
                                {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                    {q.options.map((opt: string, oIdx: number) => (
                                      <div key={oIdx} className="text-[10px] text-slate-400">
                                        <strong className="text-blue-500 font-bold">{String.fromCharCode(65 + oIdx)}.</strong> {cleanOptionText(opt, oIdx)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.answer && (
                                  <div className="text-[10px] text-emerald-500 font-mono pt-1">
                                    Answer Key: {q.answer}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-between items-center shrink-0 text-xs font-semibold text-slate-400">
              <div>
                Total: <strong className="text-slate-200">{batches.reduce((acc: number, b: any) => acc + b.questions.length, 0)}</strong> questions (<strong className="text-emerald-500">{batches.reduce((acc: number, b: any) => acc + b.questions.filter((q: any) => q.status === 'approved').length, 0)}</strong> approved)
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBatchSummaryModal(false)
                  setPreviewBatchIndex(null)
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && editingBatchIndex !== null && editingQuestionIndex !== null && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Edit Question
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null)
                  setEditingBatchIndex(null)
                  setEditingQuestionIndex(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-202 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs text-slate-200">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Question Content
                </label>
                <textarea
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 h-24"
                />
              </div>

              {editingQuestion.options && Array.isArray(editingQuestion.options) && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex justify-between items-center">
                    <span>Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        const opts = [...(editingQuestion.options || [])]
                        opts.push(`Option ${opts.length + 1}`)
                        setEditingQuestion({ ...editingQuestion, options: opts })
                      }}
                      className="text-[9px] text-blue-500 hover:text-blue-450 font-bold"
                    >
                      + Add Option
                    </button>
                  </label>
                  <div className="space-y-2">
                    {editingQuestion.options.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx)
                      return (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-505 w-4">{letter}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...(editingQuestion.options || [])]
                              opts[oIdx] = e.target.value
                              setEditingQuestion({ ...editingQuestion, options: opts })
                            }}
                            className="flex-1 bg-slate-955 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const opts = [...(editingQuestion.options || [])]
                              opts.splice(oIdx, 1)
                              setEditingQuestion({ ...editingQuestion, options: opts })
                            }}
                            className="p-1.5 hover:bg-slate-850 rounded text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Correct Answer
                  </label>
                  {editingQuestion.options && Array.isArray(editingQuestion.options) ? (
                    <select
                      value={editingQuestion.answer || 'A'}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-808 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      {editingQuestion.options.map((_: any, oIdx: number) => {
                        const letter = String.fromCharCode(65 + oIdx)
                        return (
                          <option key={letter} value={letter}>
                            Option {letter}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingQuestion.answer || ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-808 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      placeholder="Suggested answer/criteria"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Points (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingQuestion.points || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      setEditingQuestion({ ...editingQuestion, points: val > 0 ? val : undefined })
                    }}
                    className="w-full bg-slate-955 border border-slate-808 rounded-lg px-2.5 py-1.5 text-xs text-slate-202 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null)
                  setEditingBatchIndex(null)
                  setEditingQuestionIndex(null)
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleEditSave(editingBatchIndex, editingQuestionIndex, editingQuestion)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
