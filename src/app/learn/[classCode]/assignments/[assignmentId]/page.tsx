'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calculateFileHash } from '@/lib/hash'
import { triggerRubricoreGradingAction } from './actions'
import {
  ArrowLeft,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Calendar,
} from 'lucide-react'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

interface AssignmentPageProps {
  params: Promise<{
    classCode: string
    assignmentId: string
  }>
}

export default function AssignmentPage({ params }: AssignmentPageProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const assignmentId = resolvedParams.assignmentId
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Data states
  const [assignment, setAssignment] = useState<any>(null)
  const [schedule, setSchedule] = useState<any>(null)
  const [existingSubmission, setExistingSubmission] = useState<any>(null)
  const [gradingResult, setGradingResult] = useState<any>(null)
  const [gradingRun, setGradingRun] = useState<any>(null)
  const [polling, setPolling] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')

  // Student inputs
  const [email, setEmail] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    fetchAssignmentData()
  }, [assignmentId, classCode])

  // Poll for grading runs
  useEffect(() => {
    if (!polling || !existingSubmission?.id) return

    let isMounted = true
    const intervalId = setInterval(async () => {
      try {
        const { data: runData } = await supabase
          .from('grading_runs')
          .select('*')
          .eq('submission_id', existingSubmission.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (isMounted && runData && runData.length > 0) {
          const latestRun = runData[0]
          setGradingRun(latestRun)
          
          if (latestRun.status === 'succeeded' || latestRun.status === 'failed' || latestRun.status === 'cancelled') {
            setPolling(false)
            // Trigger data reload
            fetchAssignmentDataSilent()
          } else {
            setPollingMessage(latestRun.status === 'queued' ? 'Waiting in grading queue...' : 'AI extraction and grading in progress...')
          }
        }
      } catch (err) {
        console.error('Error polling grading run:', err)
      }
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [polling, existingSubmission?.id])

  async function fetchAssignmentData() {
    setLoading(true)
    try {
      await fetchAssignmentDataInner()
    } finally {
      setLoading(false)
    }
  }

  async function fetchAssignmentDataSilent() {
    try {
      await fetchAssignmentDataInner()
    } catch (err) {
      console.error('Silent reload failed:', err)
    }
  }

  async function fetchAssignmentDataInner() {
    // 1. Fetch assignment details
    const { data: assignmentData } = await supabase
      .from('assignments')
      .select('*, lessons(title)')
      .eq('id', assignmentId)
      .single()

    setAssignment(assignmentData)

    let resolvedClassId = null
    // 2. Fetch class schedules for due_date
    if (assignmentData) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCode.toUpperCase())
        .single()

      if (classData) {
        resolvedClassId = classData.id
        const { data: scheduleData } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('class_id', classData.id)
          .eq('lesson_id', assignmentData.lesson_id)
          .single()

        setSchedule(scheduleData)
      }
    }

    // Automatically check/load student's submission from cookie
    const savedEmail = getCookie(`student_email_${classCode}`)
    if (savedEmail) {
      const trimmedEmail = savedEmail.trim().toLowerCase()
      setEmail(trimmedEmail)

      if (resolvedClassId) {
        const { data: subData } = await supabase
          .from('submissions')
          .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*)))')
          .eq('class_id', resolvedClassId)
          .eq('assignment_id', assignmentId)
          .eq('student_identifier', trimmedEmail)
          .limit(1)

        if (subData && subData.length > 0) {
          const sub = subData[0]
          setExistingSubmission(sub)
          if (sub.grading_results && sub.grading_results.status === 'published') {
            setGradingResult(sub.grading_results)
          }

          // Fetch latest grading run
          const { data: runData } = await supabase
            .from('grading_runs')
            .select('*')
            .eq('submission_id', sub.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (runData && runData.length > 0) {
            const latestRun = runData[0]
            setGradingRun(latestRun)
            if (latestRun.status === 'queued' || latestRun.status === 'running') {
              setPolling(true)
              setPollingMessage(latestRun.status === 'queued' ? 'Waiting in grading queue...' : 'AI extraction and grading in progress...')
            } else {
              setPolling(false)
            }
          }
        }
      }
    }
  }

  // Lookup existing submission matching email (fallback/manual)
  const handleCheckSubmission = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCode.toUpperCase())
        .single()

      if (!classData) throw new Error('Class not found')

      const { data: subData, error: subError } = await supabase
        .from('submissions')
        .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*)))')
        .eq('class_id', classData.id)
        .eq('assignment_id', assignmentId)
        .eq('student_identifier', email.trim().toLowerCase())
        .limit(1)

      if (subData && subData.length > 0) {
        const sub = subData[0]
        setExistingSubmission(sub)
        if (sub.grading_results && sub.grading_results.status === 'published') {
          setGradingResult(sub.grading_results)
        }
      } else {
        setExistingSubmission(null)
        setGradingResult(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setError(null)

    // Validation: Max 3 files
    if (files.length + selectedFiles.length > 3) {
      setError('You are permitted to upload a maximum of 3 files per submission.')
      return
    }

    // Validation: Total size limit 50MB
    const totalSize = [...files, ...selectedFiles].reduce((acc, f) => acc + f.size, 0)
    if (totalSize > 50 * 1024 * 1024) {
      setError('The total upload size exceeds the 50MB payload limit.')
      return
    }

    setFiles([...files, ...selectedFiles])
  }

  const handleRemoveFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || files.length === 0) return

    setSubmitting(true)
    setError(null)

    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCode.toUpperCase())
        .single()

      if (!classData) throw new Error('Class not found')

      // Calculate if late
      const now = new Date()
      let isLate = false
      if (schedule?.due_date) {
        const dueDate = new Date(schedule.due_date)
        if (now > dueDate) {
          isLate = true
        }
      }

      // 1. Upload files to private student-submissions bucket and record metadata
      const fileMetadataList: any[] = []
      const uploadedUrls: string[] = []
      // Compute email hash using Web Crypto SHA-256 for folder path
      const emailBuffer = new TextEncoder().encode(email.trim().toLowerCase())
      const emailHashBuffer = await crypto.subtle.digest('SHA-256', emailBuffer)
      const emailHashHex = Array.from(new Uint8Array(emailHashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 10)

      for (const file of files) {
        const hash = await calculateFileHash(file)
        const pathName = `classes/${classCode}/${assignmentId}/${emailHashHex}/${hash}_${file.name}`

        const { error: uploadError } = await supabase.storage
          .from('student-submissions')
          .upload(pathName, file, { upsert: false })

        if (uploadError) {
          throw new Error(`Upload error: ${uploadError.message}`)
        }

        uploadedUrls.push(pathName)
        fileMetadataList.push({
          storage_bucket: 'student-submissions',
          storage_path: pathName,
          original_filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
          sha256: hash,
          processing_status: 'pending'
        })
      }

      // 2. Insert record to submissions table
      const nextAttempt = existingSubmission ? (existingSubmission.attempt_number + 1) : 1
      const { data: newSub, error: subError } = await supabase
        .from('submissions')
        .insert([
          {
            class_id: classData.id,
            assignment_id: assignmentId,
            student_identifier: email.trim().toLowerCase(),
            submitted_text: text,
            submitted_files: uploadedUrls,
            status: 'submitted',
            attempt_number: nextAttempt,
            is_late: isLate,
          },
        ])
        .select()
        .single()

      if (subError) throw subError

      // 3. Insert metadata records to submission_files
      if (fileMetadataList.length > 0 && newSub) {
        const filesToInsert = fileMetadataList.map(meta => ({
          ...meta,
          submission_id: newSub.id
        }))
        const { error: filesInsertError } = await supabase
          .from('submission_files')
          .insert(filesToInsert)

        if (filesInsertError) throw filesInsertError
      }

      setSuccess(true)
      if (newSub) {
        try {
          const res = await triggerRubricoreGradingAction(newSub.id)
          if (res.success) {
            setPolling(true)
            setPollingMessage('Waiting in grading queue...')
          }
        } catch (err) {
          console.error("Async grading trigger failed:", err)
        }
      }
      handleCheckSubmission()
    } catch (err: any) {
      setError(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Fetching assignment workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/learn/${classCode}/dashboard`}
          className="p-2 rounded-lg bg-slate-900 border border-slate-500 text-slate-400 hover:text-white hover:border-slate-400 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold">
            Cohort Lesson Task: {assignment?.lessons?.title}
          </span>
          <h1 className="text-2xl font-bold text-white mt-0.5">{assignment?.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Instructions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-800">
              Work Instructions
            </h2>
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {assignment?.instructions}
            </div>

            <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-slate-400 bg-slate-950/60 border border-slate-850 px-3.5 py-2 rounded-xl">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  Due Date:{' '}
                  {schedule?.due_date
                    ? new Date(schedule.due_date).toLocaleString()
                    : 'Not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 bg-slate-950/60 border border-slate-850 px-3.5 py-2 rounded-xl">
                <span className="font-bold text-blue-600">Max Points:</span>
                <span>{assignment?.max_score} points</span>
              </div>
            </div>
          </div>

          {/* Graded View if Published */}
          {gradingResult && (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-500/10">
                <h3 className="font-bold text-emerald-400 text-sm">Evaluation Summary</h3>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {gradingResult.total_score} / {assignment.max_score}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Teacher Feedback
                  </span>
                  <p className="text-xs text-slate-300 mt-1 whitespace-pre-line">
                    {gradingResult.overall_feedback || 'No written feedback logged.'}
                  </p>
                </div>

                {/* Rubric scores */}
                {gradingResult.rubric_scores && (
                  <div className="space-y-2 pt-2 border-t border-emerald-500/10">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Criterion breakdown
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {gradingResult.rubric_scores.map((rs: any) => (
                        <div key={rs.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                          <span className="block text-[10px] font-semibold text-slate-400 truncate">
                            {rs.rubric_criteria?.name}
                          </span>
                          <div className="flex justify-between items-baseline mt-1">
                            <span className="text-xs font-bold text-slate-200">{rs.score} pts</span>
                            <span className="text-[10px] text-slate-500">Max {rs.rubric_criteria?.max_points}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upload Terminal */}
        <div className="space-y-6">
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-6 shadow-xl">
            <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
              Submit Deliverables
            </h3>

            {/* Email Check Row */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Student Email Identifier
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  readOnly
                  disabled
                  className="flex-1 bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {existingSubmission ? (
              <div className="space-y-4">
                {polling ? (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 space-y-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-550" />
                      <span className="font-bold">{pollingMessage}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      The automated grading system is currently parsing and scoring your deliverables. This page will update automatically.
                    </p>
                  </div>
                ) : gradingRun?.status === 'failed' ? (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="font-bold">Automated Ingestion Alert</span>
                    </div>
                    <p className="text-[10px] text-slate-450">
                      The system could not parse the uploaded documents automatically (e.g. empty scan or unsupported format). A teacher has been notified for manual review.
                    </p>
                    {gradingRun.error_message && (
                      <pre className="text-[9px] font-mono p-2 bg-slate-950 border border-slate-850 text-slate-500 rounded overflow-x-auto whitespace-pre-wrap max-h-24">
                        {gradingRun.error_message}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-bold">Task successfully submitted!</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Submitted at: {new Date(existingSubmission.submitted_at).toLocaleString()}
                    </p>
                    <div className="mt-2 space-y-1">
                      <span className="block font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-1">
                        Uploaded Files
                      </span>
                      {existingSubmission.submitted_files.map((file: string, i: number) => (
                        <span key={i} className="block text-[10px] text-slate-350 truncate">
                          - {file.split('/').pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              email.trim() && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Text comments */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Submission Notes
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Input comments or links here..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 h-20"
                    />
                  </div>

                  {/* Drag-and-Drop files */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Upload Files (Max 3, Total 50MB)
                    </label>
                    <label className="border border-dashed border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
                      <Upload className="w-6 h-6 text-slate-500 mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Choose deliverables
                      </span>
                      <input
                        type="file"
                        multiple
                        required
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Files selection list */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-850 text-xs">
                          <span className="text-slate-300 truncate max-w-[150px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(i)}
                            className="text-rose-500 hover:bg-rose-500/10 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || files.length === 0}
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Finalize Submission</span>
                    )}
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
