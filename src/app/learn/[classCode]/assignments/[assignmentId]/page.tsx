'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calculateFileHash } from '@/lib/hash'
import { sanitizeHtml } from '@/lib/sanitize'
import {
  triggerRubricoreGradingAction,
  fetchStudentSubmissionAction,
  submitAssignmentAction,
  getAssignmentPromptSignedUrlAction,
  parseAssignmentPromptAction,
  getStudentMaterialSignedUrlAction,
  parseStudentMaterialAction
} from './actions'
import DocumentViewer from '@/components/DocumentViewer'
import {
  ArrowLeft,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Calendar,
  FileCode,
  Paperclip,
} from 'lucide-react'

function renderSimpleMarkdown(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^# (.*?)$/gm, '<h1 class="text-lg font-bold text-slate-800 mt-4 mb-2 pb-1 border-b border-slate-200">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-slate-800 mt-3 mb-2 pb-0.5 border-b border-slate-150">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-slate-800 mt-2 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[11px]">$1</code>')
    .replace(/^&gt;\s*(.*?)$/gm, '<blockquote class="border-l-4 border-indigo-400 bg-indigo-50 pl-3 py-1.5 my-2 rounded-r text-slate-500 italic">$1</blockquote>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 underline transition-colors">$1</a>')
    .replace(/^[-*]\s+(.*?)$/gm, '<div class="flex items-start gap-1.5 my-1 text-slate-650"><span class="text-blue-500 font-bold shrink-0">•</span><span class="flex-1">$1</span></div>')
    .replace(/\n/g, '<br />')
  return html
}

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
  const [promptDownloadUrl, setPromptDownloadUrl] = useState<string | null>(null)
  const [parsedPromptContent, setParsedPromptContent] = useState<any>(null)
  const [parsingPrompt, setParsingPrompt] = useState(false)
  const [parsingPromptError, setParsingPromptError] = useState<string | null>(null)
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
  const [answers, setAnswers] = useState<Record<number, string>>({})

  // Student view interactive file preview states
  const [previewingFile, setPreviewingFile] = useState<any>(null)
  const [previewContent, setPreviewContent] = useState<any>(null)
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const handlePreviewFile = async (fileItem: any) => {
    setPreviewingFile(fileItem)
    setPreviewContent(null)
    setPreviewSignedUrl(null)
    setPreviewLoading(true)
    setPreviewError(null)

    const ext = fileItem.storage_path.split('.').pop()?.toLowerCase() || ''
    
    try {
      // 1. Get signed URL first (needed for PDFs or download links in previewer)
      const urlRes = await getStudentMaterialSignedUrlAction(classCode, fileItem.storage_path)
      if (urlRes.success && urlRes.signedUrl) {
        setPreviewSignedUrl(urlRes.signedUrl)
      } else {
        throw new Error(urlRes.error || 'Failed to generate signed preview URL')
      }

      // 2. Parse if previewable content type (docx, csv, xlsx, xls, md, markdown, json, txt, js, ts, py)
      if (['docx', 'doc', 'csv', 'xlsx', 'xls', 'md', 'markdown', 'json', 'txt', 'js', 'ts', 'py'].includes(ext)) {
        const parseRes = await parseStudentMaterialAction(classCode, fileItem.storage_path)
        if (parseRes.success) {
          setPreviewContent(parseRes.content)
        } else {
          setPreviewError(parseRes.error || 'Failed to parse file preview content.')
        }
      }
    } catch (err: any) {
      setPreviewError(err.message || 'An error occurred while loading the preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

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

    if (assignmentData?.prompt_file_path) {
      getAssignmentPromptSignedUrlAction(classCode, assignmentId).then((res) => {
        if (res.success && res.signedUrl) {
          setPromptDownloadUrl(res.signedUrl)
        }
      })

      const ext = assignmentData.prompt_file_path.split('.').pop()?.toLowerCase() || ''
      if (['docx', 'csv', 'xlsx', 'xls', 'md', 'markdown', 'json', 'txt', 'js', 'ts', 'py'].includes(ext)) {
        setParsingPrompt(true)
        parseAssignmentPromptAction(classCode, assignmentId).then((res) => {
          if (res.success) {
            setParsedPromptContent(res.content)
          } else {
            setParsingPromptError(res.error || 'Failed to parse assignment prompt file content.')
          }
          setParsingPrompt(false)
        }).catch((err) => {
          setParsingPromptError(err.message || 'Failed to parse assignment prompt file content.')
          setParsingPrompt(false)
        })
      }
    }

    // 2. Fetch class schedules for due_date
    if (assignmentData) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('class_code', classCode.toUpperCase())
        .single()

      if (classData) {
        const { data: scheduleData } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('class_id', classData.id)
          .eq('lesson_id', assignmentData.lesson_id)
          .maybeSingle()

        setSchedule(scheduleData)
      }
    }

    // Securely check/load student's submission from HTTP-Only cookie session
    const res = await fetchStudentSubmissionAction(classCode, assignmentId)
    if (res.success) {
      setEmail(res.email || '')
      if (res.submission) {
        setExistingSubmission(res.submission)
        if (res.submission.grading_results && res.submission.grading_results.status === 'published') {
          setGradingResult(res.submission.grading_results)
        }

        // Fetch latest grading run
        const { data: runData } = await supabase
          .from('grading_runs')
          .select('*')
          .eq('submission_id', res.submission.id)
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
      } else {
        setExistingSubmission(null)
        setGradingResult(null)
      }
    } else {
      setError(res.error || 'Failed to authenticate student session.')
    }
  }

  // Lookup existing submission matching email (fallback/manual)
  const handleCheckSubmission = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchAssignmentDataInner()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setError(null)

    const maxFiles = assignment?.max_files ?? 3
    const maxSizeMb = assignment?.max_total_size_mb ?? 50

    // Validation: Max files
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`You are permitted to upload a maximum of ${maxFiles} files per submission.`)
      return
    }

    // Validation: Total size limit
    const totalSize = [...files, ...selectedFiles].reduce((acc, f) => acc + f.size, 0)
    if (totalSize > maxSizeMb * 1024 * 1024) {
      setError(`The total upload size exceeds the ${maxSizeMb}MB payload limit.`)
      return
    }

    setFiles([...files, ...selectedFiles])
  }

  const handleRemoveFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse questions list from instructions
    let questionsList: any[] = []
    const instructionsStr = assignment?.instructions || ''
    const trimmed = instructionsStr.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsedObj = JSON.parse(trimmed)
        questionsList = parsedObj.questions || []
      } catch (err) {}
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsedArr = JSON.parse(trimmed)
        if (Array.isArray(parsedArr)) {
          questionsList = parsedArr
        }
      } catch (err) {}
    }

    if (!email.trim()) return
    if (files.length === 0 && questionsList.length === 0 && !text.trim()) {
      setError('Please provide at least one file or complete the assignment questions.')
      return
    }

    setSubmitting(true)
    setError(null)

    const uploadedUrls: string[] = []

    try {
      // Compute email hash using Web Crypto SHA-256 for folder path
      const emailBuffer = new TextEncoder().encode(email.trim().toLowerCase())
      const emailHashBuffer = await crypto.subtle.digest('SHA-256', emailBuffer)
      const emailHashHex = Array.from(new Uint8Array(emailHashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 10)

      // Upload files to Supabase Storage
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
      }

      // Prepare files list metadata for the backend insertion
      const fileData = files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))

      // Serialize questions and responses
      let finalSubmissionText = text
      if (questionsList.length > 0) {
        let answersSection = '\n\n--- CÂU TRẢ LỜI CỦA HỌC VIÊN ---\n'
        questionsList.forEach((q: any, idx: number) => {
          const ans = answers[idx] || '(Chưa trả lời)'
          const typeText = q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'
          answersSection += `Câu ${idx + 1} (${typeText}): ${ans}\n`
        })
        finalSubmissionText = text + answersSection
      }

      // Call secure transactional server action
      const submitRes = await submitAssignmentAction({
        classCode,
        assignmentId,
        text: finalSubmissionText,
        files: fileData,
        uploadedUrls
      })

      if (!submitRes.success) {
        // Rollback uploaded files
        for (const pathName of uploadedUrls) {
          await supabase.storage.from('student-submissions').remove([pathName])
        }
        throw new Error(submitRes.error)
      }

      setSuccess(true)
      
      // Setup polling for the new submission
      if (submitRes.submissionId) {
        setPolling(true)
        setPollingMessage('Waiting in grading queue...')
      }
      
      await fetchAssignmentDataInner()
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
            {(() => {
              const instructionsStr = assignment?.instructions || ''
              const trimmed = instructionsStr.trim()
              
              let questionsList: any[] = []
              let dataFiles: any[] = []
              let referenceFiles: any[] = []
              let isNewJsonFormat = false
              
              if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                  const parsedObj = JSON.parse(trimmed)
                  questionsList = parsedObj.questions || []
                  dataFiles = parsedObj.data_files || []
                  referenceFiles = parsedObj.reference_files || []
                  isNewJsonFormat = true
                } catch (e) {
                  console.error('Error parsing assignment instructions JSON:', e)
                }
              } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  const parsedArr = JSON.parse(trimmed)
                  if (Array.isArray(parsedArr)) {
                    questionsList = parsedArr
                  }
                } catch (e) {
                  console.error('Error parsing assignment instructions array:', e)
                }
              }

              if (isNewJsonFormat) {
                return (
                  <div className="space-y-6">
                    {/* Render standard instructions info/text if any (e.g. title/desc) */}
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</span>
                      <p className="text-sm text-slate-350 leading-relaxed font-medium">
                        Please review the attached reference materials, download/analyze the data files, and complete the questions below.
                      </p>
                    </div>

                    {/* Reference Materials List */}
                    {referenceFiles.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-805">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Reference Materials (For Reading)
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {referenceFiles.map((fileItem, idx) => (
                            <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-800 transition-all">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {fileItem.name}
                                </span>
                                <span className="block text-[9px] text-slate-500">
                                  {(fileItem.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {fileItem.previewable && (
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewFile(fileItem)}
                                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-355 hover:text-slate-100 text-[9px] font-bold transition-all"
                                  >
                                    Preview
                                  </button>
                                )}
                                {fileItem.downloadable && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (fileItem.storage_path) {
                                        const res = await getStudentMaterialSignedUrlAction(classCode, fileItem.storage_path)
                                        if (res.success && res.signedUrl) {
                                          window.open(res.signedUrl, '_blank')
                                        } else {
                                          alert('Could not download file.')
                                        }
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-bold border border-blue-500/20 transition-all"
                                  >
                                    Download
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Files List */}
                    {dataFiles.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-805">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Attached Data Files (For Download)
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dataFiles.map((fileItem, idx) => (
                            <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-800 transition-all">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {fileItem.name}
                                </span>
                                <span className="block text-[9px] text-slate-500">
                                  {(fileItem.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {fileItem.previewable && (
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewFile(fileItem)}
                                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-355 hover:text-slate-100 text-[9px] font-bold transition-all"
                                  >
                                    Preview
                                  </button>
                                )}
                                {fileItem.downloadable && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (fileItem.storage_path) {
                                        const res = await getStudentMaterialSignedUrlAction(classCode, fileItem.storage_path)
                                        if (res.success && res.signedUrl) {
                                          window.open(res.signedUrl, '_blank')
                                        } else {
                                          alert('Could not download file.')
                                        }
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-bold border border-blue-500/20 transition-all"
                                  >
                                    Download
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive File Preview Pane */}
                    {previewingFile && (
                      <div className="space-y-4 pt-4 border-t border-slate-805">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-200 truncate">{previewingFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewingFile(null)
                              setPreviewContent(null)
                              setPreviewSignedUrl(null)
                              setPreviewError(null)
                            }}
                            className="text-slate-400 hover:text-white text-xs transition-colors p-1 bg-slate-900 hover:bg-slate-850 rounded"
                          >
                            ✕ Close Preview
                          </button>
                        </div>

                        {previewLoading ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 font-mono text-xs border border-slate-850 rounded-xl bg-slate-950/30">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span>Loading preview artifact...</span>
                          </div>
                        ) : previewError ? (
                          <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600">
                            {previewError}
                          </div>
                        ) : (
                          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl overflow-hidden">
                            {(() => {
                              const ext = previewingFile.storage_path.split('.').pop()?.toLowerCase() || ''
                              
                              if (ext === 'pdf' && previewSignedUrl) {
                                return <DocumentViewer url={previewSignedUrl} title={previewingFile.name} />
                              }
                              
                              if (['docx', 'doc'].includes(ext) && previewContent) {
                                return (
                                  <div 
                                    className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700 max-h-[500px] overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.viewer_html || '') }}
                                  />
                                )
                              }
                              
                              if (['csv', 'xlsx', 'xls'].includes(ext) && previewContent) {
                                const headers = previewContent.headers || []
                                const rows = previewContent.rows || []
                                return (
                                  <div className="bg-white p-5 text-slate-800 space-y-4 h-[400px] overflow-y-auto flex flex-col shadow-sm">
                                    <div className="overflow-x-auto border border-slate-150 rounded-xl flex-1 overflow-y-auto">
                                      <table className="min-w-full divide-y divide-slate-150 text-xs">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                          <tr>
                                            {headers.map((hdr: string, i: number) => (
                                              <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 border-r border-slate-150 last:border-0 whitespace-nowrap bg-slate-50">
                                                {hdr}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                          {rows.map((row: any[], i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                              {row.map((cell: any, j: number) => (
                                                <td key={j} className="px-3 py-2 text-slate-650 border-r border-slate-100 last:border-0 whitespace-nowrap">
                                                  {cell}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )
                              }
                              
                              if (['md', 'markdown'].includes(ext) && previewContent) {
                                return (
                                  <div 
                                    className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700 max-h-[500px] overflow-y-auto"
                                    dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(previewContent) }}
                                  />
                                )
                              }
                              
                              if (['json', 'txt', 'js', 'ts', 'py'].includes(ext) && previewContent) {
                                const rawCode = typeof previewContent === 'object' ? JSON.stringify(previewContent, null, 2) : previewContent
                                const lines = rawCode.split('\n')
                                return (
                                  <div className="border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs max-h-[500px]">
                                    <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 flex">
                                      <div className="text-slate-600 select-none text-right pr-4 border-r border-slate-900 min-w-[2rem]">
                                        {lines.map((_, i) => (
                                          <div key={i}>{i + 1}</div>
                                        ))}
                                      </div>
                                      <pre className="pl-4 overflow-x-auto whitespace-pre text-slate-200 flex-1 leading-relaxed">
                                        {rawCode}
                                      </pre>
                                    </div>
                                  </div>
                                )
                              }

                              return (
                                <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl">
                                  No preview available. You can download the file to view its contents.
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assignment Questions List */}
                    <div className="space-y-4 pt-6 border-t border-slate-805">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Assignment Questions ({questionsList.length})
                      </h5>
                      <div className="space-y-4">
                        {questionsList.map((q: any, idx: number) => (
                          <div key={q.id || idx} className="border border-slate-800 bg-slate-950/30 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm text-slate-200 animate-fade-in">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-2.5">
                                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-wider">
                                      {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                                    </span>
                                    {q.points && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 text-[9px] font-bold">
                                        {q.points} Points
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-200 leading-relaxed pt-1">{q.content}</p>
                                </div>
                              </div>
                            </div>

                            {/* Options (if multiple choice) / Response field (if essay) */}
                            {q.type === 'essay' ? (
                              <div className="pl-8 space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  Your Response
                                </label>
                                {q.answerFormat === 'file' ? (
                                  <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 select-none shadow-inner">
                                    <Paperclip className="w-5 h-5 text-indigo-400 animate-pulse" />
                                    <div className="space-y-1">
                                      <span className="block text-xs font-bold text-slate-200">File Submission Required</span>
                                      <span className="block text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                                        This question requires a file upload. Please use the uploader on the right-hand side of the page to submit your files.
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <textarea
                                      value={answers[idx] || ''}
                                      onChange={(e) => {
                                        setAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                      }}
                                      placeholder="Type your essay or practice solution here..."
                                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-505 h-28 leading-relaxed font-sans placeholder-slate-600"
                                    />
                                    <div className="flex justify-between items-center text-[10px]">
                                      {q.answerFormat === 'both' ? (
                                        <span className="text-slate-400 font-medium flex items-center gap-1">
                                          💡 <span className="font-semibold text-blue-400">Tip:</span> You can type a summary here and upload supporting files in the uploader on the right.
                                        </span>
                                      ) : (
                                        <span />
                                      )}
                                      <span className="text-slate-500">
                                        {(answers[idx] || '').trim().split(/\s+/).filter(Boolean).length} words
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                {q.options.map((opt: string, optIdx: number) => {
                                  const letter = String.fromCharCode(65 + optIdx)
                                  const isSelected = answers[idx] === letter
                                  return (
                                    <button
                                      type="button"
                                      key={optIdx}
                                      onClick={() => {
                                        setAnswers(prev => ({ ...prev, [idx]: letter }))
                                      }}
                                      className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                                        isSelected
                                          ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-bold'
                                          : 'bg-slate-955 border-slate-850 text-slate-355 hover:bg-slate-900/50 hover:border-slate-800'
                                      }`}
                                    >
                                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                        isSelected
                                          ? 'bg-blue-500 border-blue-500 text-white'
                                          : 'border-slate-700 text-slate-550'
                                      }`}>
                                        {letter}
                                      </span>
                                      <span>{opt}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="pl-8 space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  Your Response
                                </label>
                                {q.answerFormat === 'file' ? (
                                  <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 select-none shadow-inner">
                                    <Paperclip className="w-5 h-5 text-indigo-400 animate-pulse" />
                                    <div className="space-y-1">
                                      <span className="block text-xs font-bold text-slate-200">File Submission Required</span>
                                      <span className="block text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                                        This question requires a file upload. Please use the uploader on the right-hand side of the page to submit your files.
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <textarea
                                      value={answers[idx] || ''}
                                      onChange={(e) => {
                                        setAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                      }}
                                      placeholder="Type your solution here..."
                                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 h-28 leading-relaxed font-sans placeholder-slate-600"
                                    />
                                    {q.answerFormat === 'both' && (
                                      <div className="text-[10px] text-slate-400 font-medium pt-1">
                                        💡 <span className="font-semibold text-blue-400">Tip:</span> You can type a summary here and upload supporting files in the uploader on the right.
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              if (questionsList.length > 0) {
                return (
                  <div className="space-y-6">
                    {questionsList.map((q: any, idx: number) => (
                      <div key={q.id || idx} className="border border-slate-800 bg-slate-950/30 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm text-slate-200 animate-fade-in">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-2.5">
                            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                              <p className="text-sm font-semibold text-slate-200 leading-relaxed">{q.content}</p>
                            </div>
                          </div>
                        </div>

                        {/* Options (if multiple choice) / Response field (if essay) */}
                        {q.type === 'essay' ? (
                          <div className="pl-8 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Your Response
                            </label>
                            {q.answerFormat === 'file' ? (
                              <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 select-none shadow-inner">
                                <Paperclip className="w-5 h-5 text-indigo-400 animate-pulse" />
                                <div className="space-y-1">
                                  <span className="block text-xs font-bold text-slate-200">File Submission Required</span>
                                  <span className="block text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                                    This question requires a file upload. Please use the uploader on the right-hand side of the page to submit your files.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <textarea
                                  value={answers[idx] || ''}
                                  onChange={(e) => {
                                    setAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                  }}
                                  placeholder="Type your essay or practice solution here..."
                                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 h-28 leading-relaxed font-sans placeholder-slate-600"
                                />
                                <div className="flex justify-between items-center text-[10px]">
                                  {q.answerFormat === 'both' ? (
                                    <span className="text-slate-400 font-medium flex items-center gap-1">
                                      💡 <span className="font-semibold text-blue-400">Tip:</span> You can type a summary here and upload supporting files in the uploader on the right.
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  <span className="text-slate-500">
                                    {(answers[idx] || '').trim().split(/\s+/).filter(Boolean).length} words
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ) : q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                            {q.options.map((opt: string, optIdx: number) => {
                              const letter = String.fromCharCode(65 + optIdx)
                              const isSelected = answers[idx] === letter
                              return (
                                <button
                                  type="button"
                                  key={optIdx}
                                  onClick={() => {
                                    setAnswers(prev => ({ ...prev, [idx]: letter }))
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-bold'
                                      : 'bg-slate-950 border-slate-850 text-slate-350 hover:bg-slate-900/50 hover:border-slate-800'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-500 border-blue-500 text-white'
                                      : 'border-slate-700 text-slate-550'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span>{opt}</span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="pl-8 space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Your Response
                            </label>
                            {q.answerFormat === 'file' ? (
                              <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 select-none shadow-inner">
                                <Paperclip className="w-5 h-5 text-indigo-400 animate-pulse" />
                                <div className="space-y-1">
                                  <span className="block text-xs font-bold text-slate-200">File Submission Required</span>
                                  <span className="block text-[10px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                                    This question requires a file upload. Please use the uploader on the right-hand side of the page to submit your files.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <textarea
                                  value={answers[idx] || ''}
                                  onChange={(e) => {
                                    setAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                  }}
                                  placeholder="Type your solution here..."
                                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 h-28 leading-relaxed font-sans placeholder-slate-600"
                                />
                                {q.answerFormat === 'both' && (
                                  <div className="text-[10px] text-slate-400 font-medium pt-1">
                                    💡 <span className="font-semibold text-blue-400">Tip:</span> You can type a summary here and upload supporting files in the uploader on the right.
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }

              return (
                <div 
                  className="text-slate-300 text-sm leading-relaxed prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(instructionsStr) }}
                />
              )
            })()}

            {/* Uploaded File Presentation */}
            {promptDownloadUrl && (() => {
              const promptExt = assignment?.prompt_file_path?.split('.').pop()?.toLowerCase()
              
              if (promptExt === 'pdf') {
                return (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignment PDF Document</span>
                    <DocumentViewer url={promptDownloadUrl} title={assignment?.title} />
                  </div>
                )
              }
              
              if (promptExt === 'zip') {
                return (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-250 text-center space-y-3">
                    <FileText className="w-8 h-8 text-amber-500 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">ZIP Archive — download to view</h3>
                    <p className="text-xs text-slate-650">This assignment is packaged as a ZIP archive. Please download it using the button below to extract and view the contents.</p>
                    <a
                      href={promptDownloadUrl}
                      download
                      className="inline-flex px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors items-center gap-1.5"
                    >
                      Download ZIP Archive
                    </a>
                  </div>
                )
              }

              if (parsingPrompt) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400 font-mono text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Parsing assignment attachment...</span>
                  </div>
                )
              }

              if (parsingPromptError) {
                return (
                  <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600">
                    {parsingPromptError}
                  </div>
                )
              }

              if (parsedPromptContent) {
                if (['docx', 'doc'].includes(promptExt || '')) {
                  return (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document View (DOCX)</span>
                      <div 
                        className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(parsedPromptContent.viewer_html || '') }}
                      />
                    </div>
                  )
                }

                if (['csv', 'xlsx', 'xls'].includes(promptExt || '')) {
                  const headers = parsedPromptContent.headers || []
                  const rows = parsedPromptContent.rows || []
                  return (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sheet / Table View ({promptExt?.toUpperCase()})</span>
                      <div className="border border-slate-200 bg-white rounded-xl p-5 text-slate-800 space-y-4 h-[400px] overflow-y-auto flex flex-col shadow-sm">
                        <div className="overflow-x-auto border border-slate-150 rounded-xl flex-1 overflow-y-auto">
                          <table className="min-w-full divide-y divide-slate-150 text-xs">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                              <tr>
                                {headers.map((hdr: string, i: number) => (
                                  <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 border-r border-slate-150 last:border-0 whitespace-nowrap bg-slate-50">
                                    {hdr}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {rows.map((row: any[], i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  {row.map((cell: any, j: number) => (
                                    <td key={j} className="px-3 py-2 text-slate-650 border-r border-slate-100 last:border-0 whitespace-nowrap">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (['md', 'markdown'].includes(promptExt || '')) {
                  return (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Markdown Readme</span>
                      <div 
                        className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(parsedPromptContent) }}
                      />
                    </div>
                  )
                }

                if (['json', 'txt', 'js', 'ts', 'py'].includes(promptExt || '')) {
                  const rawCode = typeof parsedPromptContent === 'object' ? JSON.stringify(parsedPromptContent, null, 2) : parsedPromptContent
                  const lines = rawCode.split('\n')
                  return (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code File View</span>
                      <div className="border border-slate-200 bg-slate-950 rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs max-h-[500px]">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0 text-slate-400 font-semibold select-none">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>{assignment.prompt_file_path.split('/').pop()}</span>
                          </div>
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            {promptExt?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 flex">
                          <div className="text-slate-600 select-none text-right pr-4 border-r border-slate-900 min-w-[2rem]">
                            {lines.map((_, i) => (
                              <div key={i}>{i + 1}</div>
                            ))}
                          </div>
                          <pre className="pl-4 overflow-x-auto whitespace-pre text-slate-200 flex-1 leading-relaxed">
                            {rawCode}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )
                }
              }

              return (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="space-y-0.5">
                      <span className="block text-xs font-bold text-slate-800">Assignment File Attachment</span>
                      <span className="block text-[10px] text-slate-500">Download instructions/requirements document</span>
                    </div>
                  </div>
                  <a
                    href={promptDownloadUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    Download File
                  </a>
                </div>
              )
            })()}

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
                      Upload Files (Max {assignment?.max_files ?? 3}, Total {assignment?.max_total_size_mb ?? 50}MB)
                    </label>
                    <label className="border border-dashed border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
                      <Upload className="w-6 h-6 text-slate-500 mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Choose deliverables
                      </span>
                      <input
                        type="file"
                        multiple
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
