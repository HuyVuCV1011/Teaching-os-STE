'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { saveGradingResultAction, suggestAIScoresAction } from './actions'
import { ArrowLeft, Save, CheckCircle, Loader2, Sparkles, Cpu } from 'lucide-react'

// Import extracted components
import { StudentIdentityNotes } from './components/StudentIdentityNotes'
import { UploadedDeliverables } from './components/UploadedDeliverables'
import { RubricMatrixPanel } from './components/RubricMatrixPanel'

interface GradingPageProps {
  params: Promise<{
    submissionId: string
  }>
}

export default function GradingPage({ params }: GradingPageProps) {
  const resolvedParams = use(params)
  const submissionId = resolvedParams.submissionId
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [aiGrading, setAiGrading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')

  // Data states
  const [submission, setSubmission] = useState<any>(null)
  const [rubric, setRubric] = useState<any>(null)
  const [criteria, setCriteria] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [applyLatePenalty, setApplyLatePenalty] = useState(true)

  // Grading states
  const [scores, setScores] = useState<Record<string, number>>({}) // criterion_id -> score
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({}) // criterion_id -> feedback
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({}) // criterion_id -> reason
  const [overallFeedback, setOverallFeedback] = useState('')
  const [gradingResultId, setGradingResultId] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissionDetails()
  }, [submissionId])

  async function fetchSubmissionDetails() {
    setLoading(true)
    try {
      // 1. Fetch submission with parent structures
      const { data: subData } = await supabase
        .from('submissions')
        .select('*, classes(*), assignments(*, rubrics(*, rubric_criteria(*)))')
        .eq('id', submissionId)
        .single()

      if (!subData) throw new Error('Submission not found')
      setSubmission(subData)

      // Query due date from schedules
      if (subData?.class_id && subData?.assignments?.lesson_id) {
        const { data: sched } = await supabase
          .from('class_schedules')
          .select('due_date')
          .eq('class_id', subData.class_id)
          .eq('lesson_id', subData.assignments.lesson_id)
          .maybeSingle()
        if (sched?.due_date) {
          setDueDate(sched.due_date)
        }
      }

      const rubricData = subData.assignments?.rubrics
      setRubric(rubricData)

      let rubricCriteria = []
      const snapshotId = subData.rubric_snapshot_id || subData.assignments?.rubric_snapshot_id
      if (snapshotId) {
        const { data: snapshotData } = await supabase
          .from('rubric_snapshots')
          .select('*')
          .eq('id', snapshotId)
          .single()
        
        if (snapshotData && snapshotData.snapshot?.criteria) {
          rubricCriteria = snapshotData.snapshot.criteria
        }
      }

      if (rubricCriteria.length === 0) {
        rubricCriteria = rubricData?.rubric_criteria || []
      }
      setCriteria(rubricCriteria)

      // Initialize scores map with default max
      const initialScores: Record<string, number> = {}
      const initialFeedbacks: Record<string, string> = {}
      rubricCriteria.forEach((c: any) => {
        initialScores[c.id] = c.max_points
        initialFeedbacks[c.id] = ''
      })

      // 2. Fetch existing grading results and rubric scores
      const { data: resultData } = await supabase
        .from('grading_results')
        .select('*, rubric_scores(*)')
        .eq('submission_id', submissionId)
        .single()

      if (resultData) {
        setGradingResultId(resultData.id)
        setOverallFeedback(resultData.overall_feedback || '')
        resultData.rubric_scores?.forEach((rs: any) => {
          initialScores[rs.rubric_criterion_id] = parseFloat(rs.score)
          initialFeedbacks[rs.rubric_criterion_id] = rs.feedback || ''
          if (rs.override_reason) {
            setOverrideReasons(prev => ({ ...prev, [rs.rubric_criterion_id]: rs.override_reason }))
          }
        })
      }

      // 3. Fetch rubric score suggestions (AI grading results)
      const { data: suggestionsData } = await supabase
        .from('rubric_score_suggestions')
        .select('*')
        .eq('submission_id', submissionId)

      if (suggestionsData) {
        setSuggestions(suggestionsData)
      }

      setScores(initialScores)
      setFeedbacks(initialFeedbacks)
    } catch (err) {
      console.error('Failed to load grading assets:', err)
    } finally {
      setLoading(false)
    }
  }

  // Pre-calculate running total score client-side for immediate feedback
  const clientTotalScore = Object.keys(scores).reduce((total, cid) => {
    const criterion = criteria.find((c) => c.id === cid)
    if (!criterion) return total
    return total + scores[cid] * parseFloat(criterion.weight)
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
          scores[c.id] !== parseFloat(suggestion.suggested_score) || 
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

      alert(publish ? 'Evaluation score published successfully!' : 'Evaluation draft saved.')
      router.push('/admin/grading')
    } catch (err: any) {
      alert(`Grading write error: ${err.message}`)
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
        
        // Pre-fill scores and feedbacks immediately
        const updatedScores = { ...scores }
        const updatedFeedbacks = { ...feedbacks }
        res.suggestions.forEach((s: any) => {
          updatedScores[s.rubric_criterion_id] = parseFloat(s.suggested_score)
          updatedFeedbacks[s.rubric_criterion_id] = s.suggested_feedback || ''
        })
        setScores(updatedScores)
        setFeedbacks(updatedFeedbacks)
        alert('AI grading suggestions generated and pre-filled! Please review and justify any overrides before saving.')
      } else {
        alert(`Failed to get suggestions: ${res.error}`)
      }
    } catch (err: any) {
      alert(`AI suggestion error: ${err.message}`)
    } finally {
      setAiGrading(false)
    }
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
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              <option value="ollama">Ollama (Local Llama)</option>
            </select>
          </div>

          <button
            onClick={handleSuggestAIScores}
            disabled={aiGrading || saving || publishing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-550 hover:to-indigo-550 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            {aiGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Suggest AI Scores</span>
          </button>

          <button
            onClick={() => handleSaveGrade(false)}
            disabled={saving || publishing || aiGrading}
            className="px-4 py-2 rounded-xl border border-slate-500 hover:border-slate-400 bg-slate-900 text-slate-350 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSaveGrade(true)}
            disabled={saving || publishing || aiGrading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/10 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>Publish Scores</span>
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
          <UploadedDeliverables submittedFiles={submission?.submitted_files} />
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
    </div>
  )
}
