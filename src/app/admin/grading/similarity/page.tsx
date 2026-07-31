'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import LinkNext from 'next/link'
import { getSupabaseFetchErrorMessage } from '@/lib/error-messages'
import {
  listSimilarityAssignmentsAdminAction,
  listSimilaritySubmissionsAdminAction,
} from '../actions'
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Users,
  Copy,
  FileCode,
  X,
  RefreshCw,
  Scale
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// Cosine similarity for vectors
function cosineSimilarity(vecA: number[], vecB: number[]) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0
  let dotProduct = 0.0
  let normA = 0.0
  let normB = 0.0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Jaccard similarity for token fallback
function jaccardSimilarity(str1: string, str2: string) {
  const getTokens = (str: string) =>
    new Set(
      str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2)
    )
  const s1 = getTokens(str1 || '')
  const s2 = getTokens(str2 || '')
  if (s1.size === 0 && s2.size === 0) return 1
  if (s1.size === 0 || s2.size === 0) return 0
  const intersection = new Set([...s1].filter((x) => s2.has(x)))
  const union = new Set([...s1, ...s2])
  return intersection.size / union.size
}

export default function SimilarityChecker() {
  type AssignmentRow = {
    id: string
    title?: string | null
    lessons?: {
      title?: string | null
      modules?: {
        title?: string | null
      } | null
    } | null
  }

  type SubmissionRow = {
    id: string
    student_identifier?: string | null
    submitted_text?: string | null
    submission_embeddings?: {
      embedding?: number[] | null
    }[] | null
  }

  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)
  const [metricMode, setMetricMode] = useState<'semantic' | 'lexical'>('semantic')

  // Selected cell for side-by-side comparison modal
  const [selectedPair, setSelectedPair] = useState<{
    studentA: string
    textA: string
    studentB: string
    textB: string
    score: number
    type: 'semantic' | 'lexical'
  } | null>(null)
  const comparisonDialogRef = useRef<HTMLDivElement>(null)
  const comparisonTriggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!selectedPair) return

    comparisonTriggerRef.current = document.activeElement as HTMLElement
    const dialog = comparisonDialogRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      : []
    focusableElements[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedPair(null)
        return
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      comparisonTriggerRef.current?.focus()
    }
  }, [selectedPair])

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true)
    setAssignmentsError(null)
    try {
      const result = await listSimilarityAssignmentsAdminAction()
      if (!result.success) throw new Error(result.error)
      setAssignments(result.data as AssignmentRow[])
      if (result.data.length > 0) {
        setSelectedAssignmentId(result.data[0].id)
      }
    } catch (err) {
      const message = getSupabaseFetchErrorMessage(err, 'Không thể tải danh sách bài tập.')
      console.warn('Unable to fetch assignments for similarity auditor:', message)
      setAssignmentsError(message)
    } finally {
      setLoadingAssignments(false)
    }
  }, [])

  const fetchSubmissions = useCallback(async (assignmentId: string) => {
    setLoadingSubmissions(true)
    try {
      const result = await listSimilaritySubmissionsAdminAction(assignmentId)
      if (!result.success) throw new Error(result.error)
      setSubmissions(result.data as SubmissionRow[])
    } catch (err) {
      const message = getSupabaseFetchErrorMessage(err, 'Không thể tải bài nộp.')
      console.warn('Unable to fetch submissions for similarity auditor:', message)
      toast.error(message)
    } finally {
      setLoadingSubmissions(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchSubmissions(selectedAssignmentId)
    } else {
      setSubmissions([])
    }
  }, [fetchSubmissions, selectedAssignmentId])

  // Calculate similarity matrix
  const matrixData: {
    studentA: string
    studentB: string
    semanticVal: number
    lexicalVal: number
    hasSemantic: boolean
    subA: SubmissionRow | undefined
    subB: SubmissionRow | undefined
  }[] = []

  // Unique list of student emails who have submitted
  const students = Array.from(new Set(submissions.map((s) => s.student_identifier).filter((email): email is string => Boolean(email))))

  for (let i = 0; i < students.length; i++) {
    for (let j = 0; j < students.length; j++) {
      const studentA = students[i]
      const studentB = students[j]

      const subA = submissions.find((s) => s.student_identifier === studentA)
      const subB = submissions.find((s) => s.student_identifier === studentB)

      const vecA = subA?.submission_embeddings?.[0]?.embedding
      const vecB = subB?.submission_embeddings?.[0]?.embedding

      const hasSemantic = !!(vecA && vecB)
      const semanticVal = hasSemantic ? cosineSimilarity(vecA, vecB) : 0
      const lexicalVal = jaccardSimilarity(subA?.submitted_text || '', subB?.submitted_text || '')

      matrixData.push({
        studentA,
        studentB,
        semanticVal,
        lexicalVal,
        hasSemantic,
        subA,
        subB,
      })
    }
  }

  const getCellDetails = (sA: string, sB: string) => {
    return matrixData.find((m) => m.studentA === sA && m.studentB === sB)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-xs pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <LinkNext
            href="/admin/grading"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-white font-bold transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Grading Queue</span>
          </LinkNext>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-500" />
            Pairwise Similarity Matrix
          </h1>
          <p className="text-slate-400 text-[11px]">
            Detect potential code plagiarism, semantic correlation, and student collaboration.
          </p>
        </div>

        {/* Metric Selector toggle */}
        <div className="flex bg-slate-900/35 border border-slate-700/50 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setMetricMode('semantic')}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
              metricMode === 'semantic'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semantic (Embeddings)
          </button>
          <button
            onClick={() => setMetricMode('lexical')}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
              metricMode === 'lexical'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lexical (Tokens)
          </button>
        </div>
      </div>

      {/* Control panel dropdowns */}
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-955/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Assignment Topic
          </label>
          {loadingAssignments ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading assignments...</span>
            </div>
          ) : assignmentsError ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-800">
              <p className="font-semibold">Không thể tải bài tập</p>
              <p className="mt-1 leading-relaxed text-amber-900/80">{assignmentsError}</p>
            </div>
          ) : (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
            >
              {assignments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.lessons?.modules?.title ? `${item.lessons.modules.title} / ` : ''}
                  {item.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedAssignmentId && (
          <button
            onClick={() => fetchSubmissions(selectedAssignmentId)}
            className="px-4 py-2 border border-slate-700 bg-slate-900 hover:bg-slate-850 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-end"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload data</span>
          </button>
        )}
      </div>

      {/* Grid Status / Loading */}
      {loadingSubmissions ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Loading submissions vector matrix...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-700 rounded-2xl text-slate-500">
          <Users className="w-8 h-8 mx-auto text-slate-700 mb-2" />
          <span>No submissions found for the selected assignment topic.</span>
        </div>
      ) : students.length < 2 ? (
        <div className="text-center py-20 border border-dashed border-slate-700 rounded-2xl text-slate-500 space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="font-bold text-white">Insufficient Submission Pool</p>
          <p className="max-w-md mx-auto text-[11px] text-slate-500">
            Plagiarism detection requires at least 2 submissions. Currently, only 1 student has submitted.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Legend Banner */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider p-3 bg-slate-955/20 border border-slate-700 rounded-xl">
            <span className="text-slate-505">Risk Index:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/35"></span>
              <span className="text-red-500">High (&ge;70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/35"></span>
              <span className="text-amber-500">Moderate (50-69%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-800/40 border border-slate-700"></span>
              <span className="text-slate-400">Low (&lt;50%)</span>
            </div>
          </div>

          {/* Matrix table container */}
          <div className="border border-slate-700 rounded-2xl overflow-hidden shadow-xl bg-slate-955/20">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-955/65 text-slate-400 font-bold">
                    {/* Corner header */}
                    <th className="p-3 text-left border-r border-slate-700 font-bold bg-slate-955/80 sticky left-0 min-w-[180px] truncate">
                      Student
                    </th>
                    {students.map((email) => (
                      <th key={email} className="p-3 text-[10px] font-semibold tracking-tight min-w-[120px] max-w-[150px] truncate" title={email}>
                        {email.split('@')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {students.map((emailA) => (
                    <tr key={emailA} className="hover:bg-slate-900/10">
                      {/* Left row header */}
                      <td className="p-3 text-left border-r border-slate-700 font-bold text-slate-205 bg-slate-955/80 sticky left-0 truncate max-w-[180px]" title={emailA}>
                        {emailA}
                      </td>
                      {/* Matrix cells */}
                      {students.map((emailB) => {
                        const cell = getCellDetails(emailA, emailB)
                        const isDiagonal = emailA === emailB

                        if (isDiagonal) {
                          return (
                            <td key={emailB} className="p-3 bg-slate-950/20 text-slate-505 font-mono select-none">
                              —
                            </td>
                          )
                        }

                        if (!cell) {
                          return (
                            <td key={emailB} className="p-3 text-slate-505 font-mono">
                              N/A
                            </td>
                          )
                        }

                        // Determine metrics value based on selected tab mode
                        const simVal = metricMode === 'semantic' ? cell.semanticVal : cell.lexicalVal
                        const displaySim = (simVal * 100).toFixed(0) + '%'
                        
                        // Decide styling
                        let cellBg = 'hover:bg-slate-800/10 text-slate-400'
                        let cellBorder = 'border-transparent'
                        let flashAnim = ''
                        
                        if (simVal >= 0.7) {
                          cellBg = 'bg-red-500/10 hover:bg-red-500/15 text-red-500 font-extrabold'
                          cellBorder = 'border-red-500/35 border'
                          flashAnim = 'animate-pulse'
                        } else if (simVal >= 0.5) {
                          cellBg = 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-500 font-bold'
                          cellBorder = 'border-amber-500/35 border'
                        }

                        const hasData = metricMode === 'semantic' ? cell.hasSemantic : true

                        return (
                          <td
                            key={emailB}
                            onClick={() => {
                              if (hasData) {
                                setSelectedPair({
                                  studentA: emailA,
                                  textA: cell.subA?.submitted_text || '',
                                  studentB: emailB,
                                  textB: cell.subB?.submitted_text || '',
                                  score: simVal,
                                  type: metricMode,
                                })
                              }
                            }}
                            className={`p-3 text-xs cursor-pointer select-none transition-all border-r border-slate-700/30 ${cellBg} ${cellBorder} ${flashAnim}`}
                            title={`Compare ${emailA.split('@')[0]} & ${emailB.split('@')[0]}`}
                          >
                            {!hasData ? (
                              <span className="text-[10px] text-slate-505 block italic">no vector</span>
                            ) : (
                              <span>{displaySim}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Dialog Modal */}
      {selectedPair && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in motion-reduce:animate-none"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPair(null)
          }}
        >
          <div
            ref={comparisonDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comparison-dialog-title"
            aria-describedby="comparison-dialog-description"
            className="bg-slate-955 border border-slate-750 w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-750 bg-slate-955/90 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <h3 id="comparison-dialog-title" className="font-bold text-white text-sm">
                    So sánh hai bài nộp
                  </h3>
                  <div
                    id="comparison-dialog-description"
                    className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-400"
                  >
                    <span>{selectedPair.studentA.split('@')[0]}</span>
                    <span className="text-slate-600 font-normal">và</span>
                    <span>{selectedPair.studentB.split('@')[0]}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-3.5 py-1.5 rounded-lg border bg-slate-900 border-slate-750 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                    {selectedPair.type} Similarity
                  </span>
                  <span
                    className={`font-extrabold ${
                      selectedPair.score >= 0.7
                        ? 'text-red-500'
                        : selectedPair.score >= 0.5
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }`}
                  >
                    {(selectedPair.score * 100).toFixed(1)}%
                  </span>
                </div>

                <button
                  onClick={() => setSelectedPair(null)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-450 hover:text-white transition-colors"
                  aria-label="Đóng hộp so sánh"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Side-by-side text content panes */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-750 overflow-hidden font-mono bg-slate-955/20 text-[11px] leading-relaxed">
              {/* Left Student Pane */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-2.5 bg-slate-900/40 border-b border-slate-750 text-[10px] font-bold text-slate-300 flex justify-between items-center">
                  <span>Student A: {selectedPair.studentA}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(selectedPair.textA)
                        .then(() => toast.success('Copied student text!'))
                        .catch(() => toast.error('Could not copy student text.'))
                    }}
                    className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
                    title="Copy full text"
                    aria-label={`Sao chép toàn bộ bài nộp của ${selectedPair.studentA}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 whitespace-pre-wrap select-text selection:bg-blue-500/20 text-slate-300">
                  {selectedPair.textA || (
                    <span className="text-slate-505 italic">Submission text is empty</span>
                  )}
                </div>
              </div>

              {/* Right Student Pane */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-2.5 bg-slate-900/40 border-b border-slate-750 text-[10px] font-bold text-slate-300 flex justify-between items-center">
                  <span>Student B: {selectedPair.studentB}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(selectedPair.textB)
                        .then(() => toast.success('Copied student text!'))
                        .catch(() => toast.error('Could not copy student text.'))
                    }}
                    className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors"
                    title="Copy full text"
                    aria-label={`Sao chép toàn bộ bài nộp của ${selectedPair.studentB}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 whitespace-pre-wrap select-text selection:bg-blue-500/20 text-slate-300">
                  {selectedPair.textB || (
                    <span className="text-slate-505 italic">Submission text is empty</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-955 border-t border-slate-750 text-right">
              <button
                onClick={() => setSelectedPair(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-300 border border-slate-700 font-bold transition-colors text-xs cursor-pointer"
              >
                Đóng so sánh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
