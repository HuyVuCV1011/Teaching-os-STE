'use client'

import React from 'react'
import { Loader2, Brain, Plus, Trash2, Code as CodeIcon, CheckCircle, XCircle } from 'lucide-react'

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
}

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
}

export function RubricGeneratorStep({
  criteriaList,
  setCriteriaList,
  generatingRubric,
  handleGenerateAIRubric,
  sandboxCriterionIdx,
  setSandboxCriterionIdx,
  sandboxInput,
  setSandboxInput,
  getSandboxResult,
  selectedModel,
  setSelectedModel
}: RubricGeneratorStepProps) {
  const [currentStageIdx, setCurrentStageIdx] = React.useState(0)
  const stages = [
    { label: 'Analyzing assignment questions & model answers', icon: '🔍' },
    { label: 'Calibrating scoring weights and point distributions', icon: '⚖️' },
    { label: 'Formulating qualitative evaluation guidelines', icon: '🧠' },
    { label: 'Constructing automated regex match patterns', icon: '⚙️' },
    { label: 'Verifying rubric schema structures', icon: '✨' }
  ]

  React.useEffect(() => {
    if (!generatingRubric) {
      setCurrentStageIdx(0)
      return
    }
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < stages.length - 1 ? prev + 1 : prev))
    }, 3200)
    return () => clearInterval(interval)
  }, [generatingRubric])

  return (
    <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center pb-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
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
            onClick={handleGenerateAIRubric}
            disabled={generatingRubric}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
          >
            {generatingRubric ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
            <span>Generate Rubric</span>
          </button>
          <button
            type="button"
            onClick={() => setCriteriaList([...criteriaList, { key: `custom-${Date.now()}`, label: 'New Metric', description: '', max_points: 10, weight: 1.0, evaluation_hints: { rule_type: 'none', expected_value: null } }])}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Metric</span>
          </button>
        </div>
      </div>

      {generatingRubric ? (
        <div className="p-8 border border-slate-700 bg-slate-950/50 rounded-2xl flex flex-col items-center justify-center space-y-6 text-center py-16 animate-fade-in select-none">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-600 animate-spin" />
            <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h4 className="text-sm font-bold text-slate-105 uppercase tracking-wider font-sans">
              AI Rubric Synthesis In Progress
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Selected Model: <span className="text-blue-600 font-bold uppercase tracking-wider">{selectedModel}</span>
            </p>
          </div>
          
          <div className="w-full max-w-sm space-y-3 pt-4 border-t border-slate-800">
            {stages.map((stage, idx) => {
              const isPending = idx > currentStageIdx
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
      ) : criteriaList.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs">
          Rubric is empty. Click "Generate Rubric" or add criteria manually.
        </div>
      ) : (
        <div className="space-y-4">
          {criteriaList.map((crit, idx) => (
            <div key={crit.key || idx} className="p-4 rounded-xl border border-slate-700 bg-slate-950/40 space-y-3 relative">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Criterion Label
                  </label>
                  <input
                    type="text"
                    value={crit.label}
                    onChange={(e) => {
                      const updated = [...criteriaList]
                      updated[idx].label = e.target.value
                      setCriteriaList(updated)
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Max Points
                  </label>
                  <input
                    type="number"
                    value={crit.max_points}
                    onChange={(e) => {
                      const updated = [...criteriaList]
                      updated[idx].max_points = parseInt(e.target.value) || 10
                      setCriteriaList(updated)
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={crit.description}
                    onChange={(e) => {
                      const updated = [...criteriaList]
                      updated[idx].description = e.target.value
                      setCriteriaList(updated)
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Weight (Decimal)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={crit.weight}
                    onChange={(e) => {
                      const updated = [...criteriaList]
                      updated[idx].weight = parseFloat(e.target.value) || 1.0
                      setCriteriaList(updated)
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
              </div>

              {/* Rule configuration */}
              <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-700">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Evaluation Rule
                  </label>
                  <select
                    value={crit.evaluation_hints?.rule_type || 'none'}
                    onChange={(e) => {
                      const updated = [...criteriaList]
                      updated[idx].evaluation_hints = {
                        rule_type: e.target.value,
                        expected_value: updated[idx].evaluation_hints?.expected_value || ''
                      }
                      setCriteriaList(updated)
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  >
                    <option value="none">LLM Evaluation (none)</option>
                    <option value="exact">Exact Text Match</option>
                    <option value="regex">Regex Match</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Expected Pattern / Value
                  </label>
                  <input
                    type="text"
                    disabled={crit.evaluation_hints?.rule_type === 'none'}
                    value={crit.evaluation_hints?.expected_value || ''}
                    onChange={(e) => {
                      const updated = [...criteriaList]
                      updated[idx].evaluation_hints!.expected_value = e.target.value
                      setCriteriaList(updated)
                    }}
                    placeholder={crit.evaluation_hints?.rule_type === 'regex' ? 'e.g. /pandas/i' : 'e.g. B'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
              </div>

              <button
                onClick={() => setCriteriaList(criteriaList.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20 rounded"
                title="Remove"
                aria-label={`Remove ${crit.label}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Sandbox testing widget */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
              <CodeIcon className="w-4 h-4" /> Regex sandbox matcher
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Select Metric</label>
                <select
                  value={sandboxCriterionIdx}
                  onChange={(e) => setSandboxCriterionIdx(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                >
                  {criteriaList.map((c, i) => (
                    <option key={i} value={i}>
                      {c.label} ({c.evaluation_hints?.rule_type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Test Input String</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type test student output..."
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                  <div className="flex items-center shrink-0">
                    {getSandboxResult() === null ? (
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">No rule</span>
                    ) : getSandboxResult() ? (
                      <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> MATCH
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> FAIL
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
