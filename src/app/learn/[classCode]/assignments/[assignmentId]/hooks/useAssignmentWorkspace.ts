'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateFileHash } from '@/lib/hash'
import {
  fetchStudentSubmissionAction,
  submitAssignmentAction,
  getAssignmentPromptSignedUrlAction,
  parseAssignmentPromptAction,
  getStudentMaterialSignedUrlAction,
  parseStudentMaterialAction
} from '../actions'

export interface UseAssignmentWorkspaceProps {
  classCode: string
  assignmentId: string
}

export function useAssignmentWorkspace({ classCode, assignmentId }: UseAssignmentWorkspaceProps) {
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
        const allQuestions = parsedObj.questions || []
        questionsList = allQuestions.filter((q: any) => !q.status || q.status === 'approved')
      } catch (err) {}
    } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsedArr = JSON.parse(trimmed)
        if (Array.isArray(parsedArr)) {
          questionsList = parsedArr.filter((q: any) => !q.status || q.status === 'approved')
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

  return {
    loading,
    submitting,
    error,
    setError,
    success,
    setSuccess,
    assignment,
    promptDownloadUrl,
    parsedPromptContent,
    parsingPrompt,
    parsingPromptError,
    schedule,
    existingSubmission,
    gradingResult,
    gradingRun,
    polling,
    pollingMessage,
    email,
    text,
    setText,
    files,
    setFiles,
    answers,
    setAnswers,
    previewingFile,
    setPreviewingFile,
    previewContent,
    setPreviewContent,
    previewSignedUrl,
    setPreviewSignedUrl,
    previewLoading,
    previewError,
    setPreviewError,
    handlePreviewFile,
    handleFileChange,
    handleRemoveFile,
    handleSubmit,
    handleCheckSubmission
  }
}
