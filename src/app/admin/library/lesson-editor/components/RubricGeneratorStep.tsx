'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Brain, Plus, Trash2, Code as CodeIcon, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react'
import { SemanticSearchDrawer } from '@/components/knowledge/SemanticSearchDrawer'
import { testGradeRubricAction } from '../../actions/assignments'

interface Criteria {
  key: string
  label: string
  description: string
  max_points: number
  weight: number
  evaluation_hints?: {
    rule_type: string
    expected_value: string | null
  }
  questionId?: string | number
}

interface QuestionItem {
  id: string | number
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
  batchType?: string
}

interface BatchItem {
  id: number
  type: 'multiple_choice' | 'essay'
  category: 'theory' | 'code'
  defaultAnswerFormat: 'text' | 'file' | 'both'
  questions: QuestionItem[]
}

interface RubricGeneratorStepProps {
  criteriaList: Criteria[]
  setCriteriaList: React.Dispatch<React.SetStateAction<Criteria[]>>
  generatingRubric: boolean
  handleGenerateAIRubric: () => Promise<void>
  sandboxCriterionIdx: number
  setSandboxCriterionIdx: (val: number) => void
  sandboxInput: string
  setSandboxInput: (val: string) => void
  getSandboxResult: () => boolean | null
  selectedModel: string
  setSelectedModel: (val: string) => void
  batches: BatchItem[]
  setBatches: React.Dispatch<React.SetStateAction<BatchItem[]>>
  assignmentForm: any
  pinnedChunks?: any[]
  setPinnedChunks?: React.Dispatch<React.SetStateAction<any[]>>
}

// 📋 Reusable Inline Regex Match Sandbox for each Essay Card
function InlineRegexSandbox({ criteria }: { criteria: Criteria[] }) {
  const ruleCriteria = criteria.filter(c => c.evaluation_hints?.rule_type && c.evaluation_hints.rule_type !== 'none')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [testInput, setTestInput] = useState('')

  if (ruleCriteria.length === 0) {
    return (
      <div className="p-3.5 rounded-xl border border-slate-750 bg-slate-950/20 text-[10px] text-slate-500 font-mono leading-relaxed select-text">
        💡 Tip: All evaluation metrics for this question are currently graded by standard AI reasoning. To configure deterministic keyword matching, change an Evaluation Rule below to "Exact Text Match" or "Regex Match".
      </div>
    )
  }

  const activeCrit = ruleCriteria[selectedIdx] || ruleCriteria[0]
  const expected = activeCrit?.evaluation_hints?.expected_value || ''
  const ruleType = activeCrit?.evaluation_hints?.rule_type || 'none'

  const getMatchResult = () => {
    if (!activeCrit || !testInput.trim()) return null
    if (ruleType === 'exact') {
      return testInput.trim().toLowerCase() === expected.trim().toLowerCase()
    }
    if (ruleType === 'regex') {
      try {
        const regex = new RegExp(expected, 'i')
        return regex.test(testInput)
      } catch {
        return false
      }
    }
    return null
  }

  const match = getMatchResult()

  return (
    <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-2.5">
      <h5 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 font-mono">
        <CodeIcon className="w-3.5 h-3.5" /> Interactive Sandbox Matcher
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
        <div>
          <label className="block text-[9px] text-slate-500 uppercase mb-0.5 font-semibold">Select Metric Rule</label>
          <select
            value={selectedIdx}
            onChange={(e) => {
              setSelectedIdx(parseInt(e.target.value))
              setTestInput('')
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
          >
            {ruleCriteria.map((c, i) => (
              <option key={i} value={i}>
                {c.label} ({c.evaluation_hints?.rule_type})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[9px] text-slate-500 uppercase mb-0.5 font-semibold">Test Input String</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type test student answer..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 placeholder-slate-650 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
            />
            <div className="flex items-center shrink-0 min-w-[70px] justify-end">
              {match === null ? (
                <span className="text-[9px] text-slate-500 uppercase font-semibold">No input</span>
              ) : match ? (
                <span className="px-2.5 py-0.5 rounded bg-emerald-55/15 border border-emerald-500/30 text-emerald-600 text-[9px] font-extrabold flex items-center gap-0.5 select-none animate-fade-in">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> MATCH
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-rose-55/15 border border-rose-500/30 text-rose-600 text-[9px] font-extrabold flex items-center gap-0.5 select-none animate-fade-in">
                  <XCircle className="w-3 h-3 text-rose-600" /> FAIL
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 🧠 Reusable AI Grading Sandbox for each Essay Card
function AIGradingSandbox({ question, criteria, selectedModel }: { question: QuestionItem; criteria: Criteria[]; selectedModel?: string }) {
  const [studentAnswer, setStudentAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTestGrade = async () => {
    if (!studentAnswer.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await testGradeRubricAction({
        criteria,
        studentAnswer,
        assignmentInstructions: question.content,
        modelAnswer: question.answer || '',
        modelChoice: selectedModel
      })
      if (res.success) {
        setResult(res.grading)
      } else {
        setError(res.error || 'Stateless grading failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during test grading')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-3">
      <h5 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5 font-mono select-none">
        <Brain className="w-3.5 h-3.5" /> AI Rubric Grading Simulator
      </h5>
      <p className="text-[10px] text-slate-500 font-medium leading-relaxed select-none">
        Simulate how the AI will grade a student's answer using the qualitative rubric criteria defined above.
      </p>

      <div className="space-y-3">
        <textarea
          rows={3}
          placeholder="Paste or write a sample student answer to test grade..."
          value={studentAnswer}
          onChange={(e) => setStudentAnswer(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-650 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleTestGrade}
            disabled={loading || !studentAnswer.trim() || criteria.length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 shadow-sm"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 animate-pulse" />}
            <span>Run AI Test Grade</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-55/15 border border-rose-500/30 rounded-lg text-xs text-rose-600 font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3.5 animate-fade-in select-text">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Simulated Grading Output</span>
            <div className="text-sm font-black text-emerald-600">
              Total Score: {result.total_score || result.total_score === 0 ? result.total_score : 'N/A'} pts
            </div>
          </div>

          {result.overall_feedback && (
            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Overall Feedback</span>
              <p className="text-xs text-slate-300 leading-relaxed italic">{result.overall_feedback}</p>
            </div>
          )}

          {result.criterion_suggestions && result.criterion_suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Criteria Breakdown</span>
              <div className="space-y-2">
                {result.criterion_suggestions.map((s: any, idx: number) => {
                  const crit = criteria.find(c => c.key === s.criterion_key);
                  return (
                    <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{crit ? crit.label : `Criterion: ${s.criterion_key}`}</span>
                        <span className="font-mono text-[10px] font-bold text-indigo-400">Score: {s.score} pts</span>
                      </div>
                      {s.explanation && (
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{s.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 🎛️ Tabbed Sandbox Controller Panel (Regex vs AI Grader)
function QuestionSandboxPanel({ question, criteria, selectedModel }: { question: QuestionItem; criteria: Criteria[]; selectedModel?: string }) {
  const [activeTab, setActiveTab] = useState<'regex' | 'ai'>('regex')
  return (
    <div className="space-y-3">
      <div className="flex border-b border-slate-800 pb-1.5 gap-4 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('regex')}
          className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${
            activeTab === 'regex' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Rule Match Sandbox
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${
            activeTab === 'ai' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          AI Grader Sandbox
        </button>
      </div>
      {activeTab === 'regex' ? (
        <InlineRegexSandbox criteria={criteria} />
      ) : (
        <AIGradingSandbox question={question} criteria={criteria} selectedModel={selectedModel} />
      )}
    </div>
  )
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

export function RubricGeneratorStep({
  criteriaList,
  setCriteriaList,
  generatingRubric,
  handleGenerateAIRubric,
  selectedModel,
  setSelectedModel,
  batches,
  setBatches,
  assignmentForm,
  pinnedChunks = [],
  setPinnedChunks
}: RubricGeneratorStepProps) {
  const [isRAGDrawerOpen, setIsRAGDrawerOpen] = useState(false)
  const [mcqExpanded, setMcqExpanded] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Record<string | number, boolean>>({})
  const [currentStageIdx, setCurrentStageIdx] = useState(0)

  const stages = [
    { label: 'Analyzing assignment questions & model answers', icon: '🔍' },
    { label: 'Calibrating scoring weights and point distributions', icon: '⚖️' },
    { label: 'Formulating qualitative evaluation guidelines', icon: '🧠' },
    { label: 'Constructing automated regex match patterns', icon: '⚙️' },
    { label: 'Verifying rubric schema structures', icon: '✨' }
  ]

  // Gather approved questions grouped by section
  const approvedEssayQs: QuestionItem[] = []
  const approvedMCQs: QuestionItem[] = []

  batches.forEach(b => {
    b.questions.forEach(q => {
      if (q.status === 'approved') {
        if (b.type === 'essay') {
          approvedEssayQs.push({ ...q, batchType: b.type })
        } else {
          approvedMCQs.push({ ...q, batchType: b.type })
        }
      }
    })
  })

  // Expand all essay question cards by default on load
  useEffect(() => {
    const initial: Record<string | number, boolean> = {}
    approvedEssayQs.forEach(q => {
      initial[q.id] = true
    })
    setExpandedCards(initial)
  }, [approvedEssayQs.length])

  // Progress timer for AI generator
  useEffect(() => {
    if (!generatingRubric) {
      setCurrentStageIdx(0)
      return
    }
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < stages.length - 1 ? prev + 1 : prev))
    }, 3200)
    return () => clearInterval(interval)
  }, [generatingRubric])

  const toggleCard = (qId: string | number) => {
    setExpandedCards(prev => ({ ...prev, [qId]: !prev[qId] }))
  }

  // Update criterion fields globally
  const handleUpdateCriterion = (key: string, fields: Partial<Criteria>) => {
    setCriteriaList(prev => prev.map(c => (c.key === key ? { ...c, ...fields } : c)))
  }

  // Create a new criterion bound specifically to this question card
  const handleAddCriterionForQuestion = (qId: string | number) => {
    const newCrit: Criteria = {
      key: `custom-${Date.now()}-${Math.random()}`,
      label: 'New Metric',
      description: '',
      max_points: 10,
      weight: 1.0,
      evaluation_hints: { rule_type: 'none', expected_value: null },
      questionId: qId
    }
    setCriteriaList(prev => [...prev, newCrit])
  }

  // Remove criterion
  const handleRemoveCriterion = (key: string) => {
    setCriteriaList(prev => prev.filter(c => c.key !== key))
  }

  // Calculate dynamic weight and point allocations
  const totalQuestionsCount = approvedEssayQs.length + approvedMCQs.length
  const targetMaxScore = assignmentForm?.maxScore || 100
  
  const mcqWeightPercent = assignmentForm?.mcqWeightPercent !== undefined ? assignmentForm.mcqWeightPercent : 50
  const essayWeightPercent = assignmentForm?.essayWeightPercent !== undefined ? assignmentForm.essayWeightPercent : 50

  // Determine actual target splits
  let targetMcqTotal = 0
  let targetEssayTotal = 0

  if (approvedMCQs.length > 0 && approvedEssayQs.length > 0) {
    targetMcqTotal = targetMaxScore * (mcqWeightPercent / 100)
    targetEssayTotal = targetMaxScore * (essayWeightPercent / 100)
  } else if (approvedMCQs.length > 0) {
    targetMcqTotal = targetMaxScore
    targetEssayTotal = 0
  } else if (approvedEssayQs.length > 0) {
    targetMcqTotal = 0
    targetEssayTotal = targetMaxScore
  }

  // Calculate default MCQ points
  const defaultMcqPoints = approvedMCQs.length > 0
    ? Math.round((targetMcqTotal / approvedMCQs.length) * 10) / 10
    : 10
  
  // MCQ point summing (using q.points if set, else fallback to defaultMcqPoints)
  const mcqPointsTotal = approvedMCQs.reduce((sum, q) => sum + (q.points !== undefined && q.points !== null ? q.points : defaultMcqPoints), 0)
  
  // Essay qualitative weighted point summing
  const essayPointsTotal = criteriaList.reduce((sum, c) => {
    if (c.questionId && !approvedEssayQs.some(eq => eq.id === c.questionId)) return sum
    return sum + (c.max_points * c.weight)
  }, 0)

  const totalPointsRegistered = Math.round((mcqPointsTotal + essayPointsTotal) * 100) / 100
  const isPointsMatched = Math.abs(totalPointsRegistered - targetMaxScore) < 0.01

  const handleAutoCalibrate = () => {
    if (!setBatches) return

    // 1. Calibrate MCQs
    let updatedBatches = [...batches]
    if (approvedMCQs.length > 0) {
      const N = approvedMCQs.length
      const basePoints = Math.round((targetMcqTotal / N) * 10) / 10
      const newMcqPointsList = Array(N).fill(basePoints)
      const mcqSum = basePoints * N
      const mcqResidual = Math.round((targetMcqTotal - mcqSum) * 10) / 10
      if (Math.abs(mcqResidual) > 0.001) {
        newMcqPointsList[0] = Math.round((newMcqPointsList[0] + mcqResidual) * 10) / 10
      }

      // Map these back into updatedBatches
      let mcqCount = 0
      updatedBatches = updatedBatches.map(b => {
        if (b.type === 'multiple_choice') {
          return {
            ...b,
            questions: b.questions.map(q => {
              if (q.status !== 'approved') return q
              const pts = newMcqPointsList[mcqCount++]
              return { ...q, points: pts }
            })
          }
        }
        return b
      })
    }

    // 2. Calibrate Essay Criteria (Proportional Scaling)
    if (approvedEssayQs.length > 0 && criteriaList.length > 0) {
      const activeCriteria = criteriaList.filter(c => c.questionId && approvedEssayQs.some(eq => eq.id === c.questionId))
      
      if (activeCriteria.length > 0) {
        const currentEssayTotal = activeCriteria.reduce((sum, c) => sum + (c.max_points * c.weight), 0)
        
        if (currentEssayTotal > 0 && targetEssayTotal > 0) {
          const scaleFactor = targetEssayTotal / currentEssayTotal
          let scaledCriteria = criteriaList.map((c) => {
            const isActive = c.questionId && approvedEssayQs.some(eq => eq.id === c.questionId)
            if (!isActive) return c
            return {
              ...c,
              weight: Math.round(c.weight * scaleFactor * 100) / 100
            }
          })
          
          // Recalculate and apply residual to the highest valued active criterion
          const activeScaled = scaledCriteria.filter(c => c.questionId && approvedEssayQs.some(eq => eq.id === c.questionId))
          const scaledSum = activeScaled.reduce((sum, c) => sum + (c.max_points * c.weight), 0)
          const residual = targetEssayTotal - scaledSum
          
          if (Math.abs(residual) > 0.001 && activeScaled.length > 0) {
            let highestIdxInActive = 0
            let highestVal = -1
            activeScaled.forEach((c, idx) => {
              const val = c.max_points * c.weight
              if (val > highestVal) {
                highestVal = val
                highestIdxInActive = idx
              }
            })
            const targetKey = activeScaled[highestIdxInActive].key
            scaledCriteria = scaledCriteria.map(c => {
              if (c.key === targetKey) {
                const newWeight = Math.round(((c.max_points * c.weight + residual) / c.max_points) * 100) / 100
                return { ...c, weight: newWeight }
              }
              return c
            })
          }
          
          setCriteriaList(scaledCriteria)
        }
      }
    }

    setBatches(updatedBatches)
  }

  return (
    <div className="space-y-6">
      {/* 🚀 1. Allocation Header (Summary Bento Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bento Card 1: Overview */}
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-3 shadow-sm select-none">
          <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            📋 Assignment Structure
          </span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-950/40 rounded-xl">
              <span className="block text-lg font-black text-slate-100 tracking-tight leading-none">
                {totalQuestionsCount}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total Qs</span>
            </div>
            <div className="p-2 bg-slate-950/40 rounded-xl">
              <span className="block text-lg font-black text-slate-100 tracking-tight leading-none">
                {approvedMCQs.length}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">MCQs</span>
            </div>
            <div className="p-2 bg-slate-950/40 rounded-xl">
              <span className="block text-lg font-black text-slate-100 tracking-tight leading-none">
                {approvedEssayQs.length}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Essays</span>
            </div>
          </div>
        </div>

        {/* Bento Card 2: dynamic point weighting allocation */}
        <div className={`p-4 border rounded-2xl space-y-2 shadow-sm transition-colors duration-300 ${
          isPointsMatched ? 'bg-slate-900 border-slate-700' : 'bg-amber-600/5 border-amber-500/20'
        }`}>
          <div className="flex justify-between items-center select-none">
            <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              ⚖️ Score Weight Allocation
            </span>
            <div className="flex items-center gap-2">
              {!isPointsMatched && (
                <button
                  type="button"
                  onClick={handleAutoCalibrate}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-[8px] text-white font-extrabold rounded uppercase tracking-wider transition-colors shadow-sm focus:outline-none"
                >
                  ⚡ Auto-Calibrate
                </button>
              )}
              {isPointsMatched ? (
                <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-1.5 py-0.2 rounded uppercase font-extrabold tracking-wider">
                  ✓ ALLOCATED
                </span>
              ) : (
                <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-700 px-1.5 py-0.2 rounded uppercase font-extrabold tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> MISMATCH ({totalPointsRegistered}/{targetMaxScore} pts)
                </span>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-baseline pt-1 leading-none">
            <span className="text-xl font-black text-slate-100 tracking-tight">
              {totalPointsRegistered} <span className="text-xs font-bold text-slate-400">/ {targetMaxScore} pts</span>
            </span>
            <div className="text-[9px] text-slate-400 font-medium font-mono text-right">
              <span>MCQs: {mcqPointsTotal} pts</span>
              <span className="mx-1.5">|</span>
              <span>Qualitative: {essayPointsTotal} pts</span>
            </div>
          </div>
          
          {/* Progress visual bar */}
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex">
            <div 
              style={{ width: `${Math.min(100, (mcqPointsTotal / targetMaxScore) * 100)}%` }} 
              className="bg-blue-600 h-full transition-all"
              title={`MCQs: ${mcqPointsTotal} pts`}
            />
            <div 
              style={{ width: `${Math.min(100, (essayPointsTotal / targetMaxScore) * 100)}%` }} 
              className="bg-indigo-600 h-full border-l border-slate-950 transition-all"
              title={`Essay Rubrics: ${essayPointsTotal} pts`}
            />
          </div>
        </div>
      </div>

      {/* Header Controller row */}
      <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Brain className="w-4 h-4 text-blue-600" />
            AI Rubric Matrix Setup
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-350 hover:border-slate-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
            >
              {AI_MODEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              onClick={() => setIsRAGDrawerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-350 flex items-center gap-1 transition-colors focus-visible:outline-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>RAG ({pinnedChunks.length})</span>
            </button>
            <button
              onClick={handleGenerateAIRubric}
              disabled={generatingRubric}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 shadow-md"
            >
              {generatingRubric ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 animate-pulse" />}
              <span>Generate Rubric Matrix</span>
            </button>
          </div>
        </div>

        {generatingRubric ? (
          /* ⏳ Progressive synthesis loader block */
          <div className="p-8 border border-slate-750 bg-slate-950/50 rounded-2xl flex flex-col items-center justify-center space-y-6 text-center py-16 animate-fade-in select-none">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-600 animate-spin" />
              <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-sans">
                AI Rubric Synthesis In Progress
              </h4>
              <p className="text-[11px] text-slate-400 font-mono">
                Selected Model: <span className="text-blue-600 font-bold uppercase tracking-wider">{selectedModel}</span>
              </p>
            </div>
            
            <div className="w-full max-w-sm space-y-3 pt-4 border-t border-slate-800">
              {stages.map((stage, idx) => {
                const isActive = idx === currentStageIdx
                const isCompleted = idx < currentStageIdx
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3 text-left transition-all duration-300 px-3 py-2 rounded-xl border ${
                      isActive 
                        ? 'bg-blue-600/5 border-blue-500/30 text-slate-100 font-semibold ring-1 ring-blue-500/10 scale-[1.02]' 
                        : isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-slate-400'
                        : 'bg-transparent border-transparent text-slate-500 opacity-50'
                    }`}
                  >
                    <div className="text-xs shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 border border-slate-800">
                      {isCompleted ? (
                        <span className="text-[10px] text-emerald-600 font-bold">✓</span>
                      ) : isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-600">{idx + 1}</span>
                      )}
                    </div>
                    <span className="text-xs flex-1 truncate">{stage.label}</span>
                    <span className="text-xs shrink-0">{stage.icon}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 📋 2. Multiple-Choice Section Card */}
            {approvedMCQs.length > 0 && (
              <div className="border border-slate-700 bg-slate-950/20 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setMcqExpanded(!mcqExpanded)}
                  className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-850/60 border-b border-slate-700 transition-colors text-left focus-visible:outline-none select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-extrabold uppercase tracking-wider">
                      Auto-Graded
                    </span>
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono">
                      Multiple Choice Section ({approvedMCQs.length} Questions)
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      Total: {mcqPointsTotal} pts
                    </span>
                    {mcqExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {mcqExpanded && (
                  <div className="p-4 bg-slate-950/40 divide-y divide-slate-800 animate-fade-in max-h-[300px] overflow-y-auto custom-scrollbar select-text leading-relaxed">
                    {approvedMCQs.map((q, idx) => (
                      <div key={q.id || idx} className="py-3 first:pt-0 last:pb-0 text-xs flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                            Q{idx + 1}. MCQ Question
                          </span>
                          <p className="text-slate-350">{q.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-250 select-none">
                              Key: {q.answer || 'Not set'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono shrink-0 select-none">
                          {q.points !== undefined ? q.points : defaultMcqPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 📋 3. Essay & Code Section Contextual Question Cards */}
            {approvedEssayQs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs select-none">
                Rubric is empty. Build or approve essay questions, then click "Generate Rubric Matrix" at the top.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-t border-slate-750 pt-2 select-none">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    ✍️ Essay & Programming Rubrics ({approvedEssayQs.length} Questions)
                  </h4>
                </div>

                {approvedEssayQs.map((q, idx) => {
                  const cardExpanded = !!expandedCards[q.id]
                  const qCriteria = criteriaList.filter(c => c.questionId === q.id)
                  const totalQualPoints = qCriteria.reduce((s, c) => s + (c.max_points * c.weight), 0)

                  return (
                    <div 
                      key={q.id || idx} 
                      className={`border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                        cardExpanded ? 'border-slate-700 bg-slate-950/20' : 'border-slate-800 bg-slate-900/60'
                      }`}
                    >
                      {/* Card Header toggle click */}
                      <button
                        type="button"
                        onClick={() => toggleCard(q.id)}
                        className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-850/60 transition-colors text-left focus-visible:outline-none select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-extrabold uppercase tracking-wider">
                            Interactive Rubric
                          </span>
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono">
                            Question {idx + 1} ({q.answerFormat === 'both' ? 'Both' : q.answerFormat === 'file' ? 'File Upload' : 'Text Entry'})
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            Allocated: {totalQualPoints} pts
                          </span>
                          {cardExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {cardExpanded && (
                        <div className="p-5 space-y-5 animate-fade-in border-t border-slate-800 select-text leading-relaxed">
                          {/* Top Part: Question & Model Answer context */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                              <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono select-none">
                                Question Prompt
                              </span>
                              <p className="text-xs text-slate-200 whitespace-pre-wrap">{q.content}</p>
                            </div>
                            <div className="md:col-span-7 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                              <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono select-none">
                                Finalized Solution / Model Answer Key
                              </span>
                              {q.answer ? (
                                <pre className="text-[11px] text-slate-350 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar">
                                  {q.answer}
                                </pre>
                              ) : (
                                <span className="text-[11px] text-rose-400 italic">No solution key defined in Tab 3.</span>
                              )}
                            </div>
                          </div>

                          {/* Middle Part: AI Rubric Criteria list */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 select-none">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                📋 Evaluation Criteria Metrics ({qCriteria.length})
                              </h5>
                              <button
                                type="button"
                                onClick={() => handleAddCriterionForQuestion(q.id)}
                                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-850 text-[10px] font-semibold text-slate-300 hover:text-slate-100 flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Metric</span>
                              </button>
                            </div>

                            {qCriteria.length === 0 ? (
                              <div className="text-center py-6 text-slate-500 text-xs italic select-none">
                                No custom criteria metric is defined for this question yet. Click "Add Metric" or "Generate Rubric Matrix" at the top.
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {qCriteria.map((crit, cIdx) => {
                                  // Find the absolute global index of this criterion for React list updates
                                  const globalIdx = criteriaList.findIndex(item => item.key === crit.key)
                                  if (globalIdx === -1) return null

                                  return (
                                    <div key={crit.key || cIdx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3 relative hover:border-slate-700 transition-colors">
                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                        <div className="sm:col-span-2">
                                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 select-none">
                                            Criterion Label
                                          </label>
                                          <input
                                            type="text"
                                            value={crit.label}
                                            onChange={(e) => handleUpdateCriterion(crit.key, { label: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 select-none">
                                            Max Points
                                          </label>
                                          <input
                                            type="number"
                                            value={crit.max_points}
                                            onChange={(e) => handleUpdateCriterion(crit.key, { max_points: parseInt(e.target.value) || 10 })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 select-none">
                                            Weight (Decimal)
                                          </label>
                                          <input
                                            type="number"
                                            step="0.05"
                                            value={crit.weight}
                                            onChange={(e) => handleUpdateCriterion(crit.key, { weight: parseFloat(e.target.value) || 1.0 })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                        <div className="sm:col-span-2">
                                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 select-none">
                                            Description / What to Grade
                                          </label>
                                          <input
                                            type="text"
                                            value={crit.description}
                                            onChange={(e) => handleUpdateCriterion(crit.key, { description: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 select-none">
                                            Evaluation Rule
                                          </label>
                                          <select
                                            value={crit.evaluation_hints?.rule_type || 'none'}
                                            onChange={(e) => handleUpdateCriterion(crit.key, {
                                              evaluation_hints: {
                                                rule_type: e.target.value,
                                                expected_value: crit.evaluation_hints?.expected_value || ''
                                              }
                                            })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
                                          >
                                            <option value="none">LLM Reasoning (none)</option>
                                            <option value="exact">Exact Text Match</option>
                                            <option value="regex">Regex Match</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 select-none">
                                            Expected Pattern / Value
                                          </label>
                                          <input
                                            type="text"
                                            disabled={crit.evaluation_hints?.rule_type === 'none'}
                                            value={crit.evaluation_hints?.expected_value || ''}
                                            onChange={(e) => {
                                              const hints = crit.evaluation_hints || { rule_type: 'none', expected_value: '' }
                                              handleUpdateCriterion(crit.key, {
                                                evaluation_hints: {
                                                  ...hints,
                                                  expected_value: e.target.value
                                                }
                                              })
                                            }}
                                            placeholder={crit.evaluation_hints?.rule_type === 'regex' ? 'e.g. /pandas/i' : 'e.g. B'}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600/20"
                                          />
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCriterion(crit.key)}
                                        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20 rounded select-none"
                                        title="Remove Metric"
                                        aria-label={`Remove Metric ${crit.label}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Bottom Part: locally managed Sandbox testbed inside the question card */}
                          <div className="pt-2 border-t border-slate-800">
                            <QuestionSandboxPanel question={q} criteria={qCriteria} selectedModel={selectedModel} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
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

