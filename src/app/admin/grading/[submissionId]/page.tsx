'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { saveGradingResultAction } from './actions'
import {
  ArrowLeft,
  User,
  FileText,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileDown,
  Sparkles,
} from 'lucide-react'

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

  // Data states
  const [submission, setSubmission] = useState<any>(null)
  const [rubric, setRubric] = useState<any>(null)
  const [criteria, setCriteria] = useState<any[]>([])

  // Grading states
  const [scores, setScores] = useState<Record<string, number>>({}) // criterion_id -> score
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({}) // criterion_id -> feedback
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

      const rubricData = subData.assignments?.rubrics
      setRubric(rubricData)
      setCriteria(rubricData?.rubric_criteria || [])

      // Initialize scores map with default 0 or rubric_criteria default max
      const initialScores: Record<string, number> = {}
      const initialFeedbacks: Record<string, string> = {}
      rubricData?.rubric_criteria?.forEach((c: any) => {
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
        })
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

  const handleSaveGrade = async (publish: boolean) => {
    setSaving(publish ? false : true)
    setPublishing(publish ? true : false)

    try {
      const rubricScoresData = criteria.map((c) => ({
        rubric_criterion_id: c.id,
        score: scores[c.id] || 0,
        feedback: feedbacks[c.id] || '',
      }))

      const result = await saveGradingResultAction({
        submissionId,
        gradingResultId,
        overallFeedback,
        publish,
        clientTotalScore,
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

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
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

        <div className="flex gap-3">
          <button
            onClick={() => handleSaveGrade(false)}
            disabled={saving || publishing}
            className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-750 bg-slate-900 text-slate-350 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSaveGrade(true)}
            disabled={saving || publishing}
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
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Student Identity & Notes
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Student Email</span>
                <span className="font-semibold text-slate-200">{submission?.student_identifier}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Submitted at</span>
                <span className="font-semibold text-slate-200">
                  {new Date(submission?.submitted_at).toLocaleString()}
                </span>
              </div>
            </div>

            {submission?.submitted_text && (
              <div className="pt-4 border-t border-slate-805/85">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Submission Commentary
                </span>
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-300 text-xs whitespace-pre-line leading-relaxed">
                  {submission.submitted_text}
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Uploaded Deliverables
            </h3>

            <div className="space-y-3">
              {submission?.submitted_files?.map((path: string, idx: number) => {
                const fileName = path.split('/').pop() || 'file'
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-200 truncate pr-4">{fileName}</span>
                    {/* Add download trigger or standard anchor */}
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zuwsvvpzivukrfegqgsp.supabase.co'}/storage/v1/object/sign/student-submissions/${path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                )
              })}
              {(!submission?.submitted_files || submission.submitted_files.length === 0) && (
                <p className="text-xs text-slate-500 italic">No files uploaded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Rubric Matrix Panel */}
        <div className="space-y-6">
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> Rubric Matrix
              </h3>
              <div className="text-xs">
                <span className="text-slate-500">Weighted Score:</span>{' '}
                <span className="text-md font-extrabold text-blue-400">{clientTotalScore.toFixed(2)} pts</span>
              </div>
            </div>

            {criteria.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No criteria defined in the rubric template.</p>
            ) : (
              <div className="space-y-6">
                {criteria.map((c) => (
                  <div key={c.id} className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850/80">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-200 text-xs">{c.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.description || 'No description.'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white">
                          {(scores[c.id] || 0).toFixed(1)} / {c.max_points} pts
                        </span>
                        <span className="block text-[9px] text-slate-500 font-semibold mt-0.5">
                          wt: {c.weight}
                        </span>
                      </div>
                    </div>

                    {/* Slider Input */}
                    <div className="flex gap-4 items-center">
                      <input
                        type="range"
                        min="0"
                        max={c.max_points}
                        step="0.5"
                        value={scores[c.id] || 0}
                        onChange={(e) =>
                          setScores({ ...scores, [c.id]: parseFloat(e.target.value) })
                        }
                        className="flex-1 accent-blue-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max={c.max_points}
                        step="0.5"
                        value={scores[c.id] || 0}
                        onChange={(e) =>
                          setScores({ ...scores, [c.id]: Math.min(c.max_points, Math.max(0, parseFloat(e.target.value) || 0)) })
                        }
                        className="w-14 bg-slate-950 border border-slate-850 rounded px-1 py-0.5 text-center text-xs font-mono font-semibold focus:outline-none"
                      />
                    </div>

                    {/* Individual feedback comment */}
                    <div>
                      <input
                        type="text"
                        placeholder="Criterion feedback notes..."
                        value={feedbacks[c.id] || ''}
                        onChange={(e) =>
                          setFeedbacks({ ...feedbacks, [c.id]: e.target.value })
                        }
                        className="w-full bg-slate-950/60 border border-slate-850 rounded px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overall Feedback */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Overall Feedback Comments
              </label>
              <textarea
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="Write total summary evaluation notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-550 h-28"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
