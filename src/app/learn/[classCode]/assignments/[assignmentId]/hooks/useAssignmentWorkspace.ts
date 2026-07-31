'use client'

import { useCallback, useEffect, useState } from 'react'
import { parseAssignmentInstructions, type ParsedAssignmentFile, type ParsedAssignmentQuestion } from '@/lib/assignment'
import {
  fetchAssignmentWorkspaceAction,
  fetchLatestGradingRunAction,
  submitAssignmentAction,
  getAssignmentPromptSignedUrlAction,
  parseAssignmentPromptAction,
  getStudentMaterialSignedUrlAction,
  parseStudentMaterialAction,
  rollbackStudentSubmissionFilesAction,
  uploadStudentSubmissionFilesAction,
} from '../actions'

export interface UseAssignmentWorkspaceProps {
  classCode: string
  assignmentId: string
}

type AssignmentRecord = {
  id?: string
  title?: string | null
  lesson_id?: string
  instructions?: string | null
  prompt_file_path?: string | null
  max_files?: number | null
  max_total_size_mb?: number | null
  max_score?: number | null
  lessons?: {
    title?: string | null
  } | null
  rubrics?: RubricRecord | RubricRecord[] | null
}

type RubricRecord = {
  title?: string | null
  description?: string | null
  rubric_criteria?: {
    id: string
    name?: string | null
    description?: string | null
    weight?: string | number | null
    max_points?: number | null
  }[]
}

type AssignmentSchedule = {
  lesson_id?: string
  due_date?: string | null
}

type ViewerArtifact = {
  viewer_html?: string
  headers?: string[]
  rows?: unknown[][]
  viewer_markdown?: string
  viewer_json?: unknown
  raw_text?: unknown
  [key: string]: unknown
}

type GradingResultRecord = {
  status?: string | null
  total_score?: number | null
  overall_feedback?: string | null
  rubric_scores?: {
    id: string
    score?: number | null
    rubric_criteria?: {
      name?: string | null
      max_points?: number | null
    } | null
  }[]
}

type StudentSubmissionRecord = {
  id: string
  submitted_at: string
  submitted_files?: string[] | null
  grading_results?: GradingResultRecord | null
}

type GradingRunRecord = {
  id?: string
  status?: string | null
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function useAssignmentWorkspace({ classCode, assignmentId }: UseAssignmentWorkspaceProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Data states
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(null)
  const [promptDownloadUrl, setPromptDownloadUrl] = useState<string | null>(null)
  const [parsedPromptContent, setParsedPromptContent] = useState<ViewerArtifact | string | null>(null)
  const [parsingPrompt, setParsingPrompt] = useState(false)
  const [parsingPromptError, setParsingPromptError] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<AssignmentSchedule | null>(null)
  const [existingSubmission, setExistingSubmission] = useState<StudentSubmissionRecord | null>(null)
  const [gradingResult, setGradingResult] = useState<GradingResultRecord | null>(null)
  const [gradingRun, setGradingRun] = useState<GradingRunRecord | null>(null)
  const [polling, setPolling] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')

  // Student inputs
  const [email, setEmail] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showcaseRequested, setShowcaseRequested] = useState(false)

  // Student view interactive file preview states
  const [previewingFile, setPreviewingFile] = useState<ParsedAssignmentFile | null>(null)
  const [previewContent, setPreviewContent] = useState<ViewerArtifact | string | null>(null)
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const handlePreviewFile = async (fileItem: ParsedAssignmentFile) => {
    if (!fileItem.storage_path) {
      setPreviewError('File preview path is unavailable.')
      return
    }

    setPreviewingFile(fileItem)
    setPreviewContent(null)
    setPreviewSignedUrl(null)
    setPreviewLoading(true)
    setPreviewError(null)

    const storagePath = fileItem.storage_path
    const ext = storagePath.split('.').pop()?.toLowerCase() || ''
    
    try {
      // 1. Get signed URL first (needed for PDFs or download links in previewer)
      const urlRes = await getStudentMaterialSignedUrlAction(classCode, storagePath)
      if (urlRes.success && urlRes.signedUrl) {
        setPreviewSignedUrl(urlRes.signedUrl)
      } else {
        throw new Error(urlRes.error || 'Failed to generate signed preview URL')
      }

      // 2. Parse if previewable content type (docx, csv, xlsx, xls, md, markdown, json, txt, js, ts, py)
      if (['docx', 'doc', 'csv', 'xlsx', 'xls', 'md', 'markdown', 'json', 'txt', 'js', 'ts', 'py'].includes(ext)) {
        const parseRes = await parseStudentMaterialAction(classCode, storagePath)
        if (parseRes.success) {
          setPreviewContent(parseRes.content)
        } else {
          setPreviewError(parseRes.error || 'Failed to parse file preview content.')
        }
      }
    } catch (err) {
      setPreviewError(getErrorMessage(err, 'An error occurred while loading the preview.'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const fetchAssignmentDataInner = useCallback(async () => {
    const workspaceRes = await fetchAssignmentWorkspaceAction(classCode, assignmentId)
    if (!workspaceRes.success) {
      throw new Error(workspaceRes.error || 'Failed to load assignment workspace.')
    }

    const assignmentData = workspaceRes.assignment as AssignmentRecord | null
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
          setParsingPromptError(getErrorMessage(err, 'Failed to parse assignment prompt file content.'))
          setParsingPrompt(false)
        })
      }
    }

    setSchedule(workspaceRes.schedule as AssignmentSchedule | null)
    setEmail(workspaceRes.email || '')

    const submission = workspaceRes.submission as StudentSubmissionRecord | null
    if (submission) {
      setExistingSubmission(submission)
      if (submission.grading_results && submission.grading_results.status === 'published') {
        setGradingResult(submission.grading_results)
      }

      if (workspaceRes.gradingRun) {
        const latestRun = workspaceRes.gradingRun as GradingRunRecord
        setGradingRun(latestRun)
        if (latestRun.status === 'queued' || latestRun.status === 'running') {
          setPolling(true)
          setPollingMessage(latestRun.status === 'queued' ? 'Waiting in grading queue...' : 'AI extraction and grading in progress...')
        } else {
          setPolling(false)
        }
      } else {
        setGradingRun(null)
        setPolling(false)
      }
    } else {
      setExistingSubmission(null)
      setGradingResult(null)
      setGradingRun(null)
      setPolling(false)
    }
  }, [assignmentId, classCode])

  const fetchAssignmentDataSilent = useCallback(async () => {
    try {
      await fetchAssignmentDataInner()
    } catch (err) {
      console.error('Silent reload failed:', err)
    }
  }, [fetchAssignmentDataInner])

  const fetchAssignmentData = useCallback(async () => {
    setLoading(true)
    try {
      await fetchAssignmentDataInner()
    } finally {
      setLoading(false)
    }
  }, [fetchAssignmentDataInner])

  useEffect(() => {
    fetchAssignmentData()
  }, [fetchAssignmentData])

  // Poll for grading runs
  useEffect(() => {
    if (!polling || !existingSubmission?.id) return

    let isMounted = true
    const intervalId = setInterval(async () => {
      try {
        const runRes = await fetchLatestGradingRunAction(classCode, existingSubmission.id)

        if (isMounted && runRes.success && runRes.gradingRun) {
          const latestRun = runRes.gradingRun as GradingRunRecord
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
  }, [polling, existingSubmission?.id, fetchAssignmentDataSilent, classCode])

  const handleCheckSubmission = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchAssignmentDataInner()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reload assignment data.'))
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

  const handleSubmit = async () => {
    // Parse questions list from instructions
    let questionsList: ParsedAssignmentQuestion[] = []
    const instructionsStr = assignment?.instructions || ''
    const parsedObj = parseAssignmentInstructions(instructionsStr)
    if (parsedObj) {
      if (Array.isArray(parsedObj)) {
        questionsList = parsedObj.filter((q) => !q.status || q.status === 'approved')
      } else {
        const allQuestions = parsedObj.questions || []
        questionsList = allQuestions.filter((q) => !q.status || q.status === 'approved')
      }
    }

    if (!email.trim()) return
    if (files.length === 0 && questionsList.length === 0 && !text.trim()) {
      setError('Please provide at least one file or complete the assignment questions.')
      return
    }

    setSubmitting(true)
    setError(null)

    let uploadedUrls: string[] = []

    try {
      const uploadFormData = new FormData()
      files.forEach((file) => uploadFormData.append('files', file))
      const uploadRes = await uploadStudentSubmissionFilesAction(classCode, assignmentId, uploadFormData)
      if (!uploadRes.success) {
        throw new Error(uploadRes.error)
      }

      uploadedUrls = uploadRes.uploadedUrls
      const fileData = uploadRes.files

      // Serialize questions and responses
      let finalSubmissionText = text
      if (questionsList.length > 0) {
        let answersSection = '\n\n--- CÂU TRẢ LỜI CỦA HỌC VIÊN ---\n'
        questionsList.forEach((q, idx) => {
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
        uploadedUrls,
        showcaseRequested
      })

      if (!submitRes.success) {
        await rollbackStudentSubmissionFilesAction(classCode, uploadedUrls)
        throw new Error(submitRes.error)
      }

      setSuccess(true)
      
      // Setup polling for the new submission
      if (submitRes.submissionId) {
        setPolling(true)
        setPollingMessage('Waiting in grading queue...')
      }
      
      await fetchAssignmentDataInner()
    } catch (err) {
      if (uploadedUrls.length > 0) {
        await rollbackStudentSubmissionFilesAction(classCode, uploadedUrls)
      }
      setError(getErrorMessage(err, 'Submission failed'))
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
    showcaseRequested,
    setShowcaseRequested,
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
