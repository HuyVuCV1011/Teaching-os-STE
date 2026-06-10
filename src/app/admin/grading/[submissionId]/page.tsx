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

const getConfidenceGraph = (confidence: number) => {
  const barCount = 10
  const filledCount = Math.round(confidence * barCount)
  const filled = '█'.repeat(Math.max(0, Math.min(barCount, filledCount)))
  const empty = '░'.repeat(Math.max(0, Math.min(barCount, barCount - filledCount)))
  const pct = Math.round(confidence * 100)
  
  let color = '#FF2A2A' // low (hazard red)
  let text = 'LOW_CONF'
  if (confidence >= 0.8) {
    color = '#4AF626' // high (emerald green)
    text = 'HIGH_CONF'
  } else if (confidence >= 0.5) {
    color = '#EAB308' // medium (amber)
    text = 'MID_CONF'
  }
  
  return { filled, empty, pct, color, text }
}

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
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [submission, setSubmission] = useState<any>(null)
  const [showcaseApproved, setShowcaseApproved] = useState(false)
  const [togglingShowcase, setTogglingShowcase] = useState(false)

  useEffect(() => {
    if (submission) {
      setShowcaseApproved(submission.showcase_approved || false)
    }
  }, [submission])

  const handleToggleShowcase = async () => {
    setTogglingShowcase(true)
    try {
      const nextVal = !showcaseApproved
      const { error } = await supabase
        .from('submissions')
        .update({ showcase_approved: nextVal })
        .eq('id', submissionId)

      if (error) throw error
      setShowcaseApproved(nextVal)
      alert(nextVal ? 'Approved for Public Showcase!' : 'Showcase approval revoked.')
    } catch (err: any) {
      alert(`Failed to update showcase: ${err.message}`)
    } finally {
      setTogglingShowcase(false)
    }
  }

  // Data states
  const [rubric, setRubric] = useState<any>(null)
  const [criteria, setCriteria] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [applyLatePenalty, setApplyLatePenalty] = useState(true)

  // CRT Dossier state
  const [showDossier, setShowDossier] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({})
  const [showRawEvidence, setShowRawEvidence] = useState(false)

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
        
        // Auto-select all suggestions for injection
        const initialSelected: Record<string, boolean> = {}
        res.suggestions.forEach((s: any) => {
          initialSelected[s.id] = true
        })
        setSelectedSuggestions(initialSelected)
        setShowDossier(true)
      } else {
        alert(`Failed to get suggestions: ${(res as any).error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`AI suggestion error: ${err.message}`)
    } finally {
      setAiGrading(false)
    }
  }

  const handleOpenDossier = () => {
    const initialSelected: Record<string, boolean> = {}
    suggestions.forEach((s: any) => {
      initialSelected[s.id] = selectedSuggestions[s.id] !== undefined ? selectedSuggestions[s.id] : true
    })
    setSelectedSuggestions(initialSelected)
    setShowDossier(true)
  }

  const handleInjectTelemetry = () => {
    const updatedScores = { ...scores }
    const updatedFeedbacks = { ...feedbacks }
    
    suggestions.forEach((s: any) => {
      if (selectedSuggestions[s.id]) {
        updatedScores[s.rubric_criterion_id] = parseFloat(s.suggested_score)
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
              className="px-3 py-2 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-950/20 text-rose-500 hover:text-rose-450 font-mono text-xs flex items-center gap-1.5 transition-all"
            >
              <span>[ DECLASSIFIED DOSSIER ({suggestions.length}) ]</span>
            </button>
          )}

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

          {submission?.showcase_requested && (
            <button
              onClick={handleToggleShowcase}
              disabled={togglingShowcase}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                showcaseApproved
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/10'
                  : 'border border-slate-705 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white'
              }`}
            >
              <span>{showcaseApproved ? 'Showcase Approved ✓' : 'Approve for Showcase'}</span>
            </button>
          )}

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

      {showDossier && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] font-mono select-none crt-screen" 
          style={{ color: '#EAEAEA' }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes crt-flicker {
              0% { opacity: 0.985; }
              50% { opacity: 0.975; }
              100% { opacity: 0.985; }
            }
            @keyframes blink-slow {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
            .crt-glow {
              text-shadow: 0 0 5px rgba(74, 246, 38, 0.4);
            }
            .crt-glow-red {
              text-shadow: 0 0 5px rgba(255, 42, 42, 0.4);
            }
            .crt-screen {
              animation: crt-flicker 0.15s infinite;
            }
            .blink-green {
              animation: blink-slow 1.5s infinite;
            }
            .custom-sb::-webkit-scrollbar {
              width: 6px;
            }
            .custom-sb::-webkit-scrollbar-track {
              background: #0D0D0D;
            }
            .custom-sb::-webkit-scrollbar-thumb {
              background: #333;
            }
            .custom-sb::-webkit-scrollbar-thumb:hover {
              background: #555;
            }
          `}} />

          {/* Green CRT Phosphor Scanline Filter */}
          <div 
            className="pointer-events-none fixed inset-0 z-50 opacity-[0.06]"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #4AF626 2px, #4AF626 4px)'
            }}
          />

          {/* Top Industrial Hazard Bar */}
          <div className="h-3 w-full" style={{
            backgroundImage: 'linear-gradient(45deg, #FF2A2A 25%, #000 25%, #000 50%, #FF2A2A 50%, #FF2A2A 75%, #000 75%, #000)',
            backgroundSize: '24px 24px'
          }} />

          <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            {/* Dossier Header */}
            <div className="border border-[#FF2A2A] bg-black p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#FF2A2A] rounded-none animate-pulse" />
                  <h2 className="text-xl md:text-2xl font-black text-[#FF2A2A] tracking-wider uppercase crt-glow-red">
                    [ DECLASSIFIED AI EVALUATION DOSSIER - LEVEL 3 ]
                  </h2>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-mono">
                  SECURITY CLASSIFICATION: RESTRICTED // INTEL SCAN: ACTIVE // CORE INTEGRITY: STABLE
                </p>
              </div>
              <div className="border border-slate-800 p-2 text-right bg-[#0D0D0D]">
                <span className="text-[10px] block text-slate-500 uppercase tracking-widest">TRANSMISSION TIME</span>
                <span className="text-xs font-bold text-slate-350">{new Date().toISOString().replace('T', ' ').slice(0, 19)}</span>
              </div>
            </div>

            {/* Metadata Readout Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-l border-t border-slate-800 bg-[#0A0A0A] text-xs">
              <div className="border-r border-b border-slate-800 p-3">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">COHORT_ID</span>
                <span className="font-bold text-slate-300 truncate block mt-0.5">{submission?.classes?.name?.toUpperCase() || 'STE_COHORT'}</span>
              </div>
              <div className="border-r border-b border-slate-800 p-3">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">STUDENT_IDENTIFIER</span>
                <span className="font-bold text-slate-300 truncate block mt-0.5">{submission?.student_identifier?.toUpperCase()}</span>
              </div>
              <div className="border-r border-b border-slate-800 p-3">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">AI_INTELLIGENCE_MODEL</span>
                <span className="font-bold text-[#4AF626] block mt-0.5 crt-glow">{selectedModel.toUpperCase()}</span>
              </div>
              <div className="border-r border-b border-slate-800 p-3">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider">CRITERIA_SCAN_COUNT</span>
                <span className="font-bold text-slate-300 block mt-0.5">{criteria.length} UNITS</span>
              </div>
            </div>

            {/* Main Grid: suggestions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-[#4AF626] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#4AF626] rounded-none blink-green" />
                  CRITERION EVALUATION METRIC ANALYSIS MATRIX
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  [ SELECT FOR DIRECT SCORE INJECTION ]
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {criteria.map((c) => {
                  const sug = suggestions.find(s => s.rubric_criterion_id === c.id)
                  if (!sug) return null

                  const isChecked = !!selectedSuggestions[sug.id]
                  const graph = getConfidenceGraph(parseFloat(sug.confidence))

                  return (
                    <div 
                      key={c.id} 
                      className={`border bg-black transition-all p-4 flex flex-col md:flex-row gap-4 items-start ${
                        isChecked ? 'border-slate-700 hover:border-slate-600' : 'border-slate-900 opacity-50 hover:opacity-70'
                      }`}
                    >
                      {/* Injection selector */}
                      <button
                        type="button"
                        onClick={() => setSelectedSuggestions(prev => ({ ...prev, [sug.id]: !isChecked }))}
                        className={`w-12 h-12 flex items-center justify-center border font-bold text-lg select-none shrink-0 ${
                          isChecked 
                            ? 'border-[#4AF626] bg-[#4AF626]/5 text-[#4AF626] crt-glow' 
                            : 'border-slate-800 text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        {isChecked ? '[X]' : '[ ]'}
                      </button>

                      {/* Score telemetry and explanation */}
                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">UNIT_CRIT: {c.id.slice(0,8).toUpperCase()}</span>
                            <h4 className="text-sm font-black text-slate-100 tracking-wide uppercase mt-0.5">
                              {c.name}
                            </h4>
                          </div>
                          
                          {/* Confidence Indicator */}
                          <div className="text-[11px] font-mono whitespace-nowrap flex items-center gap-1.5">
                            <span className="text-slate-500 uppercase">CONF:</span>
                            <span style={{ color: graph.color }} className="font-bold">
                              [{graph.filled}{graph.empty}] {graph.pct}% {graph.text}
                            </span>
                          </div>
                        </div>

                        {/* Teletype AI suggest text */}
                        <div className="p-3 bg-[#080808] border border-slate-900 text-xs text-slate-350 leading-relaxed font-mono whitespace-pre-line relative">
                          <div className="absolute top-0 right-0 border-l border-b border-slate-900 px-1 py-0.5 text-[8px] text-slate-600 uppercase font-mono">
                            EXPLANATION DOSSIER
                          </div>
                          {sug.suggested_feedback ? sug.suggested_feedback : 'NO FEEDBACK SUGGESTED BY ENGINE.'}
                        </div>

                        {/* Expected scores */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 uppercase tracking-widest">SUGGESTED SCORE TRANSMISSION</span>
                          <span className="font-extrabold text-[#4AF626] crt-glow">
                            {parseFloat(sug.suggested_score).toFixed(1)} / {c.max_points.toFixed(1)} PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Raw Evidence Accordion Box */}
            <div className="border border-slate-800 bg-black">
              <button
                type="button"
                onClick={() => setShowRawEvidence(!showRawEvidence)}
                className="w-full flex justify-between items-center p-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider bg-[#080808] select-none"
              >
                <span>[ {showRawEvidence ? '-' : '+'} ] VIEW RAW COMPILED EVIDENCE TRANSMISSION DATA</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {submission?.submitted_text ? 'TEXT PRESENT' : 'NO TEXT'} // {submission?.submitted_files?.length || 0} ATTACHMENTS
                </span>
              </button>

              {showRawEvidence && (
                <div className="p-4 border-t border-slate-800 space-y-4 max-h-[300px] overflow-y-auto custom-sb bg-[#050505]">
                  {submission?.submitted_text && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">STUDENT COMMENTARY TRANSMISSION:</span>
                      <pre className="p-3 bg-[#0A0A0A] border border-slate-900 text-[11px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {submission.submitted_text}
                      </pre>
                    </div>
                  )}

                  {submission?.submitted_files && submission.submitted_files.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">ATTACHED BINARY METADATA:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        {submission.submitted_files.map((file: string, idx: number) => (
                          <div key={idx} className="p-2 border border-slate-900 bg-[#0A0A0A] flex items-center justify-between">
                            <span className="truncate text-slate-350 pr-2">{file.split('/').pop()}</span>
                            <span className="text-slate-500 shrink-0 font-mono text-[9px] uppercase">[STORAGE_OK]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!submission?.submitted_text && (!submission?.submitted_files || submission.submitted_files.length === 0) && (
                    <p className="text-xs text-slate-500 italic font-mono uppercase">NO TRANSMISSIONS ATTACHED TO THIS SUBMISSION.</p>
                  )}
                </div>
              )}
            </div>

            {/* Control Actions System */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t border-slate-900">
              <button
                type="button"
                onClick={() => setShowDossier(false)}
                className="w-full sm:w-auto px-6 py-3 border border-[#FF2A2A] hover:bg-[#FF2A2A]/10 text-[#FF2A2A] font-bold text-xs uppercase tracking-widest text-center transition-colors"
              >
                [ ABORT OPERATION ]
              </button>
              <button
                type="button"
                onClick={handleInjectTelemetry}
                className="w-full sm:w-auto px-8 py-3 bg-[#4AF626] hover:bg-[#3ecb20] text-black font-bold text-xs uppercase tracking-widest text-center transition-colors blink-green"
                style={{ boxShadow: '0 0 15px rgba(74, 246, 38, 0.3)' }}
              >
                [ INJECT AI TELEMETRY INTO CANVAS ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
