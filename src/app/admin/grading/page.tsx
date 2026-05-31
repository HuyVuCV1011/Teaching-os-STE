'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  GraduationCap,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Cpu,
  Clock,
} from 'lucide-react'
import { triggerAIGradingAction } from './actions'

export default function GradingQueue() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [gradingStatus, setGradingStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'failed'>>({})

  useEffect(() => {
    fetchSubmissions()
  }, [])

  async function fetchSubmissions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*, classes(name, class_code), assignments(title)')
        .order('submitted_at', { ascending: false })

      setSubmissions(data || [])
    } catch (err) {
      console.error('Failed to load submissions queue:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSingleAIGrade = async (submissionId: string) => {
    setGradingStatus((prev) => ({ ...prev, [submissionId]: 'running' }))
    try {
      await triggerAIGradingAction(submissionId, selectedModel)
      setGradingStatus((prev) => ({ ...prev, [submissionId]: 'success' }))
      alert('AI grading run successfully completed!')
      fetchSubmissions()
    } catch (err: any) {
      console.error(err)
      setGradingStatus((prev) => ({ ...prev, [submissionId]: 'failed' }))
      alert(`AI grading failed: ${err.message}`)
    }
  }

  const handleBatchAIGrade = async () => {
    if (selectedSubmissions.length === 0) return
    const idsToGrade = [...selectedSubmissions]
    setSelectedSubmissions([])

    const initialStatuses = { ...gradingStatus }
    idsToGrade.forEach((id) => {
      initialStatuses[id] = 'running'
    })
    setGradingStatus(initialStatuses)

    let successCount = 0
    let failureCount = 0

    for (const submissionId of idsToGrade) {
      try {
        await triggerAIGradingAction(submissionId, selectedModel)
        setGradingStatus((prev) => ({ ...prev, [submissionId]: 'success' }))
        successCount++
      } catch (err) {
        console.error(`AI grading failed for ${submissionId}:`, err)
        setGradingStatus((prev) => ({ ...prev, [submissionId]: 'failed' }))
        failureCount++
      }
    }

    alert(`Batch AI grading finished. Successes: ${successCount}, Failures: ${failureCount}`)
    fetchSubmissions()
  }

  const toggleSelectSubmission = (id: string) => {
    setSelectedSubmissions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([])
    } else {
      setSelectedSubmissions(submissions.map((sub) => sub.id))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600">
            Submitted
          </span>
        )
      case 'grading_in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            Grading
          </span>
        )
      case 'graded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Graded
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Evaluation Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            Review, annotate, and grade student task deliverables against criteria templates.
          </p>
        </div>

        {submissions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/35 border border-slate-700/50 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                <option value="ollama">Ollama (Local Llama)</option>
              </select>
            </div>

            <button
              onClick={handleBatchAIGrade}
              disabled={selectedSubmissions.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-550 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 select-none shadow-md shadow-blue-600/10 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Grade Selected ({selectedSubmissions.length})</span>
            </button>
          </div>
        )}
      </div>

      <div className="border border-slate-700 bg-slate-900/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Loading submissions queue...
            </span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600" />
            <span>The grading queue is empty. No tasks submitted yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-350">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={submissions.length > 0 && selectedSubmissions.length === submissions.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-550 bg-slate-950 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Cohort / Access Code</th>
                  <th className="px-6 py-4">Assignment Topic</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-955/20">
                {submissions.map((sub) => {
                  const isSelected = selectedSubmissions.includes(sub.id)
                  const isGrading = gradingStatus[sub.id] === 'running'
                  return (
                    <tr key={sub.id} className={`hover:bg-slate-900/10 transition-colors ${isSelected ? 'bg-slate-900/5' : ''}`}>
                      <td className="px-6 py-4.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSubmission(sub.id)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-550 bg-slate-950 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-slate-200 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sub.student_identifier}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-slate-400">{sub.classes?.name}</span>
                        <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                          {sub.classes?.class_code}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-medium text-slate-200">
                        {sub.assignments?.title}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-slate-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {new Date(sub.submitted_at).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">{getStatusBadge(sub.status)}</td>
                      <td className="px-6 py-4.5 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSingleAIGrade(sub.id)}
                          disabled={isGrading}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white font-semibold transition-all text-[11px] disabled:opacity-50"
                        >
                          {isGrading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Grading...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                              <span>AI Grade</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/admin/grading/${sub.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-550 text-white font-semibold transition-colors text-[11px]"
                        >
                          <span>Grade Task</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
