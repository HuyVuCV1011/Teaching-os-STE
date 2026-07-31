'use client'

import React, { useCallback, useEffect, useRef, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  getGradingDetailAdminAction,
  saveGradingResultAction,
  suggestAIScoresAction,
  updateSubmissionShowcaseAdminAction,
} from './actions'
import { ArrowLeft, Save, CheckCircle, Loader2, Sparkles, Cpu, X, AlertCircle } from 'lucide-react'

// Import extracted components
import { StudentIdentityNotes } from './components/StudentIdentityNotes'
import { UploadedDeliverables } from './components/UploadedDeliverables'
import { RubricMatrixPanel } from './components/RubricMatrixPanel'

function useDialogAccessibility(
  isOpen: boolean,
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const getFocusableElements = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ) || []
    )

    getFocusableElements()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

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
      previouslyFocused?.focus()
    }
  }, [isOpen, setIsOpen])

  return dialogRef
}

interface GradingPageProps {
  params: Promise<{
    submissionId: string
  }>
}

interface RubricCriterion {
  id: string
  name?: string | null
  description?: string | null
  weight?: string | number | null
  max_points?: number | null
}

interface RubricDetail {
  max_points?: number | null
  rubric_criteria?: RubricCriterion[] | null
}

interface RubricSuggestion {
  id: string
  rubric_criterion_id?: string | null
  suggested_score?: string | number | null
  suggested_feedback?: string | null
  confidence?: string | number | null
}

interface GradingScoreRow {
  rubric_criterion_id: string
  score?: string | number | null
  feedback?: string | null
  override_reason?: string | null
}

interface SubmissionDetail {
  id: string
  class_id?: string | null
  student_identifier?: string | null
  submitted_at?: string | null
  submitted_text?: string | null
  submitted_files?: string[] | null
  showcase_requested?: boolean | null
  showcase_approved?: boolean | null
  rubric_snapshot_id?: string | null
  assignments?: {
    title?: string | null
    lesson_id?: string | null
    rubric_snapshot_id?: string | null
    rubrics?: RubricDetail | null
    late_policy?: {
      grace_period_hours?: number | null
      penalty_percent_per_day?: number | null
    } | null
  } | null
  classes?: {
    name?: string | null
  } | null
}

interface GradingResultRow {
  id: string
  overall_feedback?: string | null
  rubric_scores?: GradingScoreRow[] | null
}

interface AISuggestionsResponse {
  success?: boolean
  suggestions?: RubricSuggestion[]
  error?: string
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

export default function GradingPage({ params }: GradingPageProps) {
  const resolvedParams = use(params)
  const submissionId = resolvedParams.submissionId
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [aiGrading, setAiGrading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [signedFileUrls, setSignedFileUrls] = useState<Record<string, string>>({})
  const [showcaseApproved, setShowcaseApproved] = useState(false)
  const [togglingShowcase, setTogglingShowcase] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (submission) {
      setShowcaseApproved(submission.showcase_approved || false)
    }
  }, [submission])

  const handleToggleShowcase = async () => {
    setTogglingShowcase(true)
    try {
      const nextVal = !showcaseApproved
      const result = await updateSubmissionShowcaseAdminAction(submissionId, nextVal)
      if (!result.success) throw new Error(result.error)
      setShowcaseApproved(nextVal)
      showToast(nextVal ? 'Đã duyệt hiển thị công khai bài làm học sinh!' : 'Đã hủy quyền hiển thị công khai.')
    } catch (err) {
      showToast(`Không thể cập nhật showcase: ${getErrorMessage(err, 'Lỗi không rõ')}`, 'error')
    } finally {
      setTogglingShowcase(false)
    }
  }

  // Data states
  const [rubric, setRubric] = useState<RubricDetail | null>(null)
  const [criteria, setCriteria] = useState<RubricCriterion[]>([])
  const [suggestions, setSuggestions] = useState<RubricSuggestion[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [applyLatePenalty, setApplyLatePenalty] = useState(true)

  // CRT Dossier state
  const [showDossier, setShowDossier] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({})
  const [showRawEvidence, setShowRawEvidence] = useState(false)
  const dossierDialogRef = useDialogAccessibility(showDossier, setShowDossier)
  const publishDialogRef = useDialogAccessibility(showPublishConfirm, setShowPublishConfirm)

  // Grading states
  const [scores, setScores] = useState<Record<string, number>>({}) // criterion_id -> score
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({}) // criterion_id -> feedback
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({}) // criterion_id -> reason
  const [overallFeedback, setOverallFeedback] = useState('')
  const [gradingResultId, setGradingResultId] = useState<string | null>(null)

  const fetchSubmissionDetails = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getGradingDetailAdminAction(submissionId)
      if (!result.success) throw new Error(result.error)
      const subData = result.data.submission
      setSubmission(subData as SubmissionDetail)
      setSignedFileUrls(result.data.signedFileUrls || {})
      setDueDate(result.data.dueDate)

      const typedSubData = subData as SubmissionDetail
      const rubricData = typedSubData.assignments?.rubrics || null
      setRubric(rubricData)

      let rubricCriteria: RubricCriterion[] = []
      if (result.data.snapshot?.criteria) {
        rubricCriteria = result.data.snapshot.criteria as RubricCriterion[]
      }

      if (rubricCriteria.length === 0) {
        rubricCriteria = rubricData?.rubric_criteria || []
      }
      setCriteria(rubricCriteria)

      // Initialize scores map with default max
      const initialScores: Record<string, number> = {}
      const initialFeedbacks: Record<string, string> = {}
      rubricCriteria.forEach((c) => {
        initialScores[c.id] = c.max_points || 0
        initialFeedbacks[c.id] = ''
      })

      const resultData = result.data.gradingResult
      if (resultData) {
        const gradingResult = resultData as GradingResultRow
        setGradingResultId(gradingResult.id)
        setOverallFeedback(resultData.overall_feedback || '')
        gradingResult.rubric_scores?.forEach((rs) => {
          initialScores[rs.rubric_criterion_id] = toNumber(rs.score)
          initialFeedbacks[rs.rubric_criterion_id] = rs.feedback || ''
          if (rs.override_reason) {
            setOverrideReasons(prev => ({ ...prev, [rs.rubric_criterion_id]: rs.override_reason || '' }))
          }
        })
      }

      setSuggestions(result.data.suggestions as RubricSuggestion[])

      setScores(initialScores)
      setFeedbacks(initialFeedbacks)
    } catch (err) {
      console.error('Failed to load grading assets:', err)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    fetchSubmissionDetails()
  }, [fetchSubmissionDetails])

  // Pre-calculate running total score client-side for immediate feedback
  const clientTotalScore = Object.keys(scores).reduce((total, cid) => {
    const criterion = criteria.find((c) => c.id === cid)
    if (!criterion) return total
    return total + scores[cid] * toNumber(criterion.weight)
  }, 0)

  // Late calculations
  const calculateLateStatus = () => {
    if (!dueDate || !submission?.submitted_at) return null
    const submittedAt = new Date(submission.submitted_at)
    const limitDate = new Date(dueDate)

    if (submittedAt <= limitDate) return null

    const diffMs = submittedAt.getTime() - limitDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    const policy = submission.assignments?.late_policy || {}
    const gracePeriod = policy.grace_period_hours || 0
    const penaltyPerDay = policy.penalty_percent_per_day || 0

    if (diffHours <= gracePeriod) {
      return {
        isLate: true,
        hoursLate: diffHours,
        inGracePeriod: true,
        deductionPercent: 0
      }
    }

    const hoursAfterGrace = diffHours - gracePeriod
    const daysLate = Math.ceil(hoursAfterGrace / 24)
    const deductionPercent = daysLate * penaltyPerDay

    return {
      isLate: true,
      hoursLate: diffHours,
      inGracePeriod: false,
      daysLate,
      deductionPercent
    }
  }

  const lateInfo = calculateLateStatus()

  const handleSaveGrade = async (publish: boolean) => {
    setSaving(publish ? false : true)
    setPublishing(publish ? true : false)

    try {
      const rubricScoresData = criteria.map((c) => {
        const suggestion = suggestions.find(s => s.rubric_criterion_id === c.id)
        const isOverridden = suggestion && (
          scores[c.id] !== toNumber(suggestion.suggested_score) ||
          feedbacks[c.id] !== (suggestion.suggested_feedback || '')
        )
        return {
          rubric_criterion_id: c.id,
          score: scores[c.id] || 0,
          feedback: feedbacks[c.id] || '',
          derived_from_suggestion_id: suggestion ? suggestion.id : null,
          override_reason: isOverridden ? (overrideReasons[c.id] || 'Manual override') : null,
        }
      })

      const finalScore = (lateInfo && lateInfo.deductionPercent > 0 && applyLatePenalty)
        ? clientTotalScore * (1 - lateInfo.deductionPercent / 100)
        : clientTotalScore

      const result = await saveGradingResultAction({
        submissionId,
        gradingResultId,
        overallFeedback,
        publish,
        clientTotalScore: finalScore,
        scores: rubricScoresData,
      })

      if (result.gradingResultId) {
        setGradingResultId(result.gradingResultId)
      }

      showToast(publish ? 'Đã công bố điểm số đánh giá thành công!' : 'Đã lưu bản nháp đánh giá.')
      setTimeout(() => {
        router.push('/admin/grading')
      }, 1000)
    } catch (err) {
      showToast(`Lỗi lưu kết quả chấm điểm: ${getErrorMessage(err, 'Lỗi không rõ')}`, 'error')
    } finally {
      setSaving(false)
      setPublishing(false)
    }
  }

  const handleSuggestAIScores = async () => {
    setAiGrading(true)
    try {
      const res = await suggestAIScoresAction(submissionId, selectedModel)
      if (res.success && res.suggestions) {
        setSuggestions(res.suggestions)

        // Auto-select all suggestions for injection
        const initialSelected: Record<string, boolean> = {}
        res.suggestions.forEach((s) => {
          initialSelected[s.id] = true
        })
        setSelectedSuggestions(initialSelected)
        setShowDossier(true)
        showToast('Đã nhận gợi ý chấm từ AI.')
      } else {
        showToast(`Không thể lấy gợi ý chấm: ${(res as AISuggestionsResponse).error || 'Lỗi không rõ'}`, 'error')
      }
    } catch (err) {
      showToast(`Lỗi gợi ý AI: ${getErrorMessage(err, 'Lỗi không rõ')}`, 'error')
    } finally {
      setAiGrading(false)
    }
  }

  const handleOpenDossier = () => {
    const initialSelected: Record<string, boolean> = {}
    suggestions.forEach((s) => {
      initialSelected[s.id] = selectedSuggestions[s.id] !== undefined ? selectedSuggestions[s.id] : true
    })
    setSelectedSuggestions(initialSelected)
    setShowDossier(true)
  }

  const handleInjectTelemetry = () => {
    const updatedScores = { ...scores }
    const updatedFeedbacks = { ...feedbacks }

    suggestions.forEach((s) => {
      if (selectedSuggestions[s.id]) {
        if (!s.rubric_criterion_id) return
        updatedScores[s.rubric_criterion_id] = toNumber(s.suggested_score)
        updatedFeedbacks[s.rubric_criterion_id] = s.suggested_feedback || ''
      }
    })

    setScores(updatedScores)
    setFeedbacks(updatedFeedbacks)
    setShowDossier(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Fetching student submission and rubric criteria...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/grading')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-500 text-slate-400 hover:text-white hover:border-slate-400 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs text-slate-500 font-semibold">
              Evaluate Task: {submission?.assignments?.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-2xl font-bold text-white">Manual Evaluation</h1>
              {submission?.showcase_requested && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  Showcase Requested
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/35 border border-slate-700/50 px-2 py-1.5 rounded-xl">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              <option value="ollama">Ollama (Local Llama)</option>
            </select>
          </div>

          {suggestions.length > 0 && (
            <button
              onClick={handleOpenDossier}
              className="px-3 py-2 rounded-xl border border-blue-500/30 hover:border-blue-500 bg-blue-950/20 text-blue-500 hover:text-blue-450 font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Xem gợi ý ({suggestions.length})</span>
            </button>
          )}

          <button
            onClick={handleSuggestAIScores}
            disabled={aiGrading || saving || publishing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-550 hover:to-indigo-550 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50 border-0 cursor-pointer"
          >
            {aiGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Gợi ý điểm bằng AI</span>
          </button>

          <button
            onClick={() => handleSaveGrade(false)}
            disabled={saving || publishing || aiGrading}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-350 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Lưu nháp</span>
          </button>

          {submission?.showcase_requested && (
            <button
              onClick={handleToggleShowcase}
              disabled={togglingShowcase}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                showcaseApproved
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/10 border-0'
                  : 'border border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white'
              }`}
            >
              <span>{showcaseApproved ? 'Đã duyệt Showcase ✓' : 'Duyệt Showcase'}</span>
            </button>
          )}

          <button
            onClick={() => setShowPublishConfirm(true)}
            disabled={saving || publishing || aiGrading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-550 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/10 disabled:opacity-50 border-0 cursor-pointer"
          >
            {publishing ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>Công bố điểm số</span>
          </button>
        </div>
      </div>

      {/* Split screen Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Student Submission details */}
        <div className="space-y-6">
          <StudentIdentityNotes
            submission={submission}
            dueDate={dueDate}
            lateInfo={lateInfo}
            applyLatePenalty={applyLatePenalty}
            setApplyLatePenalty={setApplyLatePenalty}
          />
          <UploadedDeliverables
            submittedFiles={submission?.submitted_files || null}
            signedFileUrls={signedFileUrls}
          />
        </div>

        {/* Right: Rubric Matrix Panel */}
        <RubricMatrixPanel
          criteria={criteria}
          scores={scores}
          setScores={setScores}
          feedbacks={feedbacks}
          setFeedbacks={setFeedbacks}
          overrideReasons={overrideReasons}
          setOverrideReasons={setOverrideReasons}
          overallFeedback={overallFeedback}
          setOverallFeedback={setOverallFeedback}
          suggestions={suggestions}
          lateInfo={lateInfo}
          applyLatePenalty={applyLatePenalty}
          clientTotalScore={clientTotalScore}
        />
      </div>

      {showDossier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={dossierDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-suggestions-title"
            aria-describedby="ai-suggestions-description"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200 motion-reduce:animate-none select-text text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 id="ai-suggestions-title" className="text-base font-bold text-white uppercase tracking-wider">
                  Gợi ý đánh giá từ trợ lý AI
                </h2>
              </div>
              <button
                onClick={() => setShowDossier(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-0 cursor-pointer bg-transparent"
                aria-label="Đóng bảng gợi ý"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
              <p id="ai-suggestions-description" className="sr-only">
                Chọn các gợi ý điểm và phản hồi của AI để áp dụng vào bản chấm hiện tại.
              </p>
              {/* Metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs text-slate-400">
                <div>Lớp học: <span className="font-semibold text-slate-200 block mt-0.5">{submission?.classes?.name || 'STE Cohort'}</span></div>
                <div>Học sinh: <span className="font-semibold text-slate-200 block mt-0.5">{submission?.student_identifier}</span></div>
                <div>Mô hình AI: <span className="font-semibold text-blue-500 block mt-0.5 uppercase">{selectedModel}</span></div>
              </div>

              {/* Suggestions Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                    Bảng phân tích tiêu chí chấm điểm
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Chọn các gợi ý muốn áp dụng vào bài chấm
                  </span>
                </div>

                <div className="space-y-4">
                  {criteria.map((c) => {
                    const sug = suggestions.find(s => s.rubric_criterion_id === c.id)
                    if (!sug) return null

                    const isChecked = !!selectedSuggestions[sug.id]
                    const confPct = Math.round(toNumber(sug.confidence) * 100)
                    let confColor = 'text-rose-500'
                    let confText = 'Thấp'
                    if (confPct >= 80) {
                      confColor = 'text-emerald-500'
                      confText = 'Cao'
                    } else if (confPct >= 50) {
                      confColor = 'text-amber-500'
                      confText = 'Trung bình'
                    }

                    return (
                      <div
                        key={c.id}
                        className={`border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start transition-all ${
                          isChecked
                            ? 'border-blue-500/50 bg-blue-500/[0.02]'
                            : 'border-slate-800 bg-slate-950/10 opacity-60 hover:opacity-80'
                        }`}
                      >
                        {/* Selector checkbox */}
                        <button
                          type="button"
                          onClick={() => setSelectedSuggestions(prev => ({ ...prev, [sug.id]: !isChecked }))}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border font-bold text-xs shrink-0 cursor-pointer ${
                            isChecked
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-700 hover:border-slate-600 text-transparent bg-slate-950'
                          }`}
                          aria-label={`Chọn gợi ý cho tiêu chí ${c.name}`}
                        >
                          {isChecked ? '✓' : ''}
                        </button>

                        {/* Telemetry and feedback details */}
                        <div className="flex-1 space-y-3 w-full text-xs">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                            <div>
                              <h4 className="font-bold text-slate-100 text-sm">
                                {c.name}
                              </h4>
                            </div>

                            {/* Confidence Level */}
                            <div className="font-medium whitespace-nowrap flex items-center gap-1">
                              <span className="text-slate-500">Độ tin cậy:</span>
                              <span className={`font-bold ${confColor}`}>
                                {confPct}% ({confText})
                              </span>
                            </div>
                          </div>

                          {/* AI suggest feedback text */}
                          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                            {sug.suggested_feedback ? sug.suggested_feedback : 'Không có nhận xét nào được đề xuất từ AI.'}
                          </div>

                          {/* Expected score */}
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-slate-500">Điểm AI đề xuất</span>
                            <span className="text-blue-500">
                              {toNumber(sug.suggested_score).toFixed(1)} / {toNumber(c.max_points).toFixed(1)} Điểm
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Raw Evidence Accordion */}
              <div className="border border-slate-800 bg-slate-950/20 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRawEvidence(!showRawEvidence)}
                  className="w-full flex justify-between items-center p-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider bg-slate-950/40 select-none border-0 cursor-pointer"
                >
                  <span>{showRawEvidence ? '[-]' : '[+]'} Xem nội dung bài nộp của học sinh</span>
                  <span className="text-[10px] text-slate-500 lowercase font-medium">
                    {submission?.submitted_text ? 'có nội dung text' : 'không có text'} · {submission?.submitted_files?.length || 0} tệp đính kèm
                  </span>
                </button>

                {showRawEvidence && (
                  <div className="p-4 border-t border-slate-800 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950/50">
                    {submission?.submitted_text && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Phần trả lời tự luận:</span>
                        <pre className="p-3 bg-slate-950 border border-slate-900 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed rounded-lg">
                          {submission.submitted_text}
                        </pre>
                      </div>
                    )}

                    {submission?.submitted_files && submission.submitted_files.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tệp đính kèm:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {submission.submitted_files.map((file: string, idx: number) => (
                            <div key={idx} className="p-2 border border-slate-800 bg-slate-950 rounded-lg flex items-center justify-between">
                              <span className="truncate text-slate-300 pr-2">{file.split('/').pop()}</span>
                              <span className="text-slate-500 shrink-0 font-medium text-[9px] uppercase">[lưu trữ ổn định]</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!submission?.submitted_text && (!submission?.submitted_files || submission.submitted_files.length === 0) && (
                      <p className="text-xs text-slate-500 italic font-mono uppercase">Học sinh không đính kèm tệp hay nội dung nào.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Control Buttons */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 p-5 border-t border-slate-800 shrink-0 bg-slate-950/20">
              <button
                type="button"
                onClick={() => setShowDossier(false)}
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center transition bg-slate-900 hover:bg-slate-850 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleInjectTelemetry}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-550 text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center transition shadow-lg shadow-blue-500/10 cursor-pointer border-0"
              >
                Áp dụng gợi ý chấm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog trước khi công bố */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={publishDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-grade-title"
            aria-describedby="publish-grade-description"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-slate-100"
          >
            <div className="flex items-center gap-2 text-blue-500 pb-2 border-b border-slate-800">
              <AlertCircle className="w-5 h-5" />
              <h3 id="publish-grade-title" className="text-base font-bold text-white">Xác nhận công bố điểm số</h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-350">
              <p id="publish-grade-description">Bạn đang thực hiện công bố điểm cho học sinh <span className="font-semibold text-white">{submission?.student_identifier}</span>.</p>
              <div className="p-3 bg-slate-950 rounded-lg space-y-2 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Điểm đánh giá:</span>
                  <span className="font-bold text-slate-200">{clientTotalScore.toFixed(1)} / {rubric?.max_points || 100}</span>
                </div>
                {lateInfo && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trạng thái nộp bài:</span>
                    <span className="text-rose-500 font-medium">Nộp muộn ({Math.ceil(lateInfo.hoursLate)}h)</span>
                  </div>
                )}
                {lateInfo && lateInfo.deductionPercent > 0 && applyLatePenalty && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Khấu trừ nộp muộn:</span>
                    <span className="text-rose-500 font-semibold">-{lateInfo.deductionPercent}%</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                  <span className="font-semibold text-slate-300">Điểm tổng kết cuối:</span>
                  <span className="font-black text-blue-500">
                    {((lateInfo && lateInfo.deductionPercent > 0 && applyLatePenalty)
                      ? clientTotalScore * (1 - lateInfo.deductionPercent / 100)
                      : clientTotalScore
                    ).toFixed(1)} Điểm
                  </span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] italic">Lưu ý: Điểm số sau khi công bố sẽ hiển thị trực tiếp trên trang cá nhân của học sinh.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPublishConfirm(false)
                  handleSaveGrade(true)
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-550 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/10 cursor-pointer border-0"
              >
                Xác nhận công bố
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
              : 'bg-rose-950 border-rose-800 text-rose-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
