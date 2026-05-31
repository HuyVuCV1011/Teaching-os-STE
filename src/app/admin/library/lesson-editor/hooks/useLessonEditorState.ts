'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculateFileHash } from '@/lib/hash'
import {
  checkMaterialDeduplication,
  registerCanonicalMaterial,
  uploadFileToStorageAction,
  deleteFileFromStorageAction,
  getSignedUrlAction,
  reorderMaterialsAction,
  updateLessonLayoutAction
} from '@/app/admin/library/actions/materials'
import {
  saveAssignmentAction,
  deleteAssignmentAction,
  generateSolutionAction,
  generateRubricAction,
  parseAssignmentFileAction,
  readMaterialsTextAction,
  suggestQuestionAnswerAction,
  suggestBatchQuestionAnswersAction
} from '@/app/admin/library/actions/assignments'

export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  let md = html
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li>(.*?)<\/li>/gi, '- $1')
    .replace(/<ul>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<blockquote.*?>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<pre.*?><code.*?>(.*?)<\/code><\/pre>/gs, '```\n$1\n```\n\n')
  md = md.replace(/<[^>]+>/g, '')
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
  return md.trim()
}

export function cleanOptionText(opt: string, index: number): string {
  if (!opt) return ''
  const letter = String.fromCharCode(65 + index)
  const prefixRegex = new RegExp(`^(?:Option\\s+)?${letter}(?:[\\.\\s\\)\\-\\:]+)\\s*`, 'i')
  if (prefixRegex.test(opt)) {
    return opt.replace(prefixRegex, '').trim()
  }
  
  const generalRegex = /^[A-Z](?:[\\.\\s\\)\\-\\:]+)\\s*/i
  const trimmed = opt.trim()
  if (trimmed.length > 0) {
    const firstLetter = trimmed.charAt(0).toUpperCase()
    if (firstLetter === letter && generalRegex.test(trimmed)) {
      return trimmed.replace(generalRegex, '').trim()
    }
  }
  return opt
}

export interface QuestionItem {
  id: number
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
}

export interface BatchItem {
  id: number
  type: 'multiple_choice' | 'essay'
  category: 'theory' | 'code'
  defaultAnswerFormat: 'text' | 'file' | 'both'
  questions: QuestionItem[]
}

export interface AssignmentFileItem {
  name: string
  size: number
  storage_path?: string
  file?: File | null
  downloadable: boolean
  previewable: boolean
}

export function useLessonEditorState() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lessonId = searchParams.get('lessonId')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Step & Stepper state
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isDirty, setIsDirty] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  // Lesson outline & syllabus hierarchy
  const [lesson, setLesson] = useState<any>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')

  // Canonical materials state
  const [materials, setMaterials] = useState<any[]>([])
  const [materialForm, setMaterialForm] = useState({
    title: '',
    type: 'pdf' as 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link' | 'markdown' | 'json',
    linkUrl: '',
    creationMethod: 'upload' as 'upload' | 'write',
    uploadOption: 'file' as 'file' | 'link',
    manualContent: '',
    note: '',
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [showMaterialForm, setShowMaterialForm] = useState(false)

  // Download permission
  const [downloadAllowed, setDownloadAllowed] = useState(true)

  // Live status indicators
  const [uploadStatus, setUploadStatus] = useState({
    active: false,
    step: '' as 'hashing' | 'uploading' | 'parsing' | 'saving' | '',
    startedAt: 0,
    elapsed: '0.0s'
  })
  const [saveStatus, setSaveStatus] = useState({
    active: false,
    startedAt: 0,
    elapsed: '0.0s'
  })

  // Student view preview states
  const [showStudentPreview, setShowStudentPreview] = useState(false)
  const [showMaterialsPreview, setShowMaterialsPreview] = useState(false)
  const [showAssignmentPreview, setShowAssignmentPreview] = useState(false)
  const [previewSignedUrls, setPreviewSignedUrls] = useState<Record<string, string>>({})
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({})
  const [previewUrlStatus, setPreviewUrlStatus] = useState({
    loading: false,
    startedAt: 0,
    elapsed: '0.0s'
  })

  // Drag and drop templates/orders
  const [markdownTemplates, setMarkdownTemplates] = useState<Record<string, 'default' | 'dark' | 'accent'>>({})
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [gridLayout, setGridLayout] = useState<string>('1-col')
  const [cellMaterials, setCellMaterials] = useState<Record<number, any>>({})

  // Assignment states
  const [hasAssignment, setHasAssignment] = useState(false)
  const [assignmentId, setAssignmentId] = useState('')
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    instructions: '',
    maxScore: 100,
    maxFiles: 3,
    maxTotalSizeMb: 50,
    autoPublishGrades: false,
    gracePeriodHours: 0,
    penaltyPercentPerDay: 0
  })

  // AI config
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [solutionMode, setSolutionMode] = useState<'upload' | 'ai'>('ai')
  const [solutionText, setSolutionText] = useState('')
  const [solutionFile, setSolutionFile] = useState<File | null>(null)
  const [solutionStoragePath, setSolutionStoragePath] = useState('')
  const [promptFile, setPromptFile] = useState<File | null>(null)
  const [promptStoragePath, setPromptStoragePath] = useState('')
  const [generatingSolution, setGeneratingSolution] = useState(false)

  // Rubric snapshot states
  const [criteriaList, setCriteriaList] = useState<any[]>([])
  const [generatingRubric, setGeneratingRubric] = useState(false)

  // Verification modal states
  const [verifyMaterial, setVerifyMaterial] = useState<any | null>(null)
  const [verifyDisplayMode, setVerifyDisplayMode] = useState<'both' | 'web' | 'original'>('both')
  const [savingVerify, setSavingVerify] = useState(false)

  // Sandbox state
  const [sandboxCriterionIdx, setSandboxCriterionIdx] = useState<number>(0)
  const [sandboxInput, setSandboxInput] = useState('')

  // Drag & drop elements active
  const [dragActive, setDragActive] = useState(false)

  // AI Redesign assignment states
  const [aiType, setAiType] = useState<'multiple_choice' | 'essay'>('multiple_choice')
  const [aiCategory, setAiCategory] = useState<'theory' | 'code'>('theory')
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(10)
  const [aiSampleData, setAiSampleData] = useState<boolean>(false)
  const [aiDefaultAnswerFormat, setAiDefaultAnswerFormat] = useState<'text' | 'file' | 'both'>('text')
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [aiLanguage, setAiLanguage] = useState<'vietnamese' | 'english' | 'both'>('vietnamese')
  const [activeReviewQsIdx, setActiveReviewQsIdx] = useState<number>(0)
  const [suggestingAnsIdx, setSuggestingAnsIdx] = useState<number | null>(null)
  const [isSuggestingAll, setIsSuggestingAll] = useState<boolean>(false)
  const [isGeneratingRubric, setIsGeneratingRubric] = useState<boolean>(false)
  
  const [batches, setBatches] = useState<BatchItem[]>([])
  const [dataFiles, setDataFiles] = useState<AssignmentFileItem[]>([])
  const [referenceFiles, setReferenceFiles] = useState<AssignmentFileItem[]>([])
  const [simulatedAnswers, setSimulatedAnswers] = useState<Record<number, string>>({})
  
  // Question Editing states
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null)
  const [editingBatchIndex, setEditingBatchIndex] = useState<number | null>(null)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)
  
  // Classify popup states
  const [classifyModalOpen, setClassifyModalOpen] = useState(false)
  const [classifyFile, setClassifyFile] = useState<File | null>(null)
  const [classifyType, setClassifyType] = useState<'data' | 'reference' | 'question'>('data')
  const [classifyDownloadable, setClassifyDownloadable] = useState(true)
  const [classifyPreviewable, setClassifyPreviewable] = useState(true)
  const [parseDefaultAnswerFormat, setParseDefaultAnswerFormat] = useState<'text' | 'file' | 'both'>('text')
  const [showEssayFormatModal, setShowEssayFormatModal] = useState(false)
  const [parsedQuestionsTemp, setParsedQuestionsTemp] = useState<any[]>([])
  const [parsedFileNameTemp, setParsedFileNameTemp] = useState<string>('')
  const [isParsingFile, setIsParsingFile] = useState(false)

  // Step 1: Material Selection states
  const [aiSelectedMaterials, setAiSelectedMaterials] = useState<string[]>([])
  const [isReadingMaterials, setIsReadingMaterials] = useState(false)
  const [genStage, setGenStage] = useState<'reading' | 'generating' | 'sample_data'>('reading')

  // Modal control states
  const [showAiModal, setShowAiModal] = useState<boolean>(false)
  const [showBatchSummaryModal, setShowBatchSummaryModal] = useState<boolean>(false)
  const [previewBatchIndex, setPreviewBatchIndex] = useState<number | null>(null)
  const [modalStep, setModalStep] = useState<number>(1)
  const [genElapsed, setGenElapsed] = useState<number>(0)
  const [readingDuration, setReadingDuration] = useState<number | null>(null)
  const [generatingDuration, setGeneratingDuration] = useState<number | null>(null)
  const [sampleDataDuration, setSampleDataDuration] = useState<number | null>(null)
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0)
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false)
  const [asgDragActive, setAsgDragActive] = useState(false)
  const [saveStage, setSaveStage] = useState<string>('')
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFileSelection(file)
    }
  }

  useEffect(() => {
    if (!uploadStatus.active) return
    const interval = setInterval(() => {
      const diff = Date.now() - uploadStatus.startedAt
      setUploadStatus(prev => ({ ...prev, elapsed: (diff / 1000).toFixed(1) + 's' }))
    }, 200)
    return () => clearInterval(interval)
  }, [uploadStatus.active])

  useEffect(() => {
    if (!saveStatus.active) return
    const interval = setInterval(() => {
      const diff = Date.now() - saveStatus.startedAt
      setSaveStatus(prev => ({ ...prev, elapsed: (diff / 1000).toFixed(1) + 's' }))
    }, 200)
    return () => clearInterval(interval)
  }, [saveStatus.active])

  useEffect(() => {
    if (!previewUrlStatus.loading) return
    const interval = setInterval(() => {
      const diff = Date.now() - previewUrlStatus.startedAt
      setPreviewUrlStatus(prev => ({ ...prev, elapsed: (diff / 1000).toFixed(1) + 's' }))
    }, 200)
    return () => clearInterval(interval)
  }, [previewUrlStatus.loading])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDropItem = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const updatedMaterials = [...materials]
    const [draggedItem] = updatedMaterials.splice(draggedIndex, 1)
    updatedMaterials.splice(dropIndex, 0, draggedItem)

    const reordered = updatedMaterials.map((item, idx) => ({
      ...item,
      display_order: idx
    }))

    setMaterials(reordered)

    const updates = reordered.map((item) => ({
      id: item.id,
      display_order: item.display_order
    }))

    const res = await reorderMaterialsAction(updates)
    if (!res.success) {
      alert(`Failed to save new order: ${res.error}`)
      await fetchLessonDetails()
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragStartCell = (e: React.DragEvent, mId: string, sourceColIdx: number, sourceItemIdx: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ materialId: mId, sourceCol: sourceColIdx, sourceIdx: sourceItemIdx }))
  }

  const handleDropToColumn = async (e: React.DragEvent, targetColIdx: number, targetItemIdx?: number) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) return
      const { materialId, sourceCol, sourceIdx } = JSON.parse(dataStr)
      if (!materialId) return

      const matchedMaterial = materials.find(m => m.id === materialId)
      if (!matchedMaterial) return

      const updatedMapping = { ...cellMaterials }
      
      const maxCols = gridLayout === '3-cols' ? 3 : gridLayout === '2-cols' ? 2 : 1
      for (let i = 0; i < maxCols; i++) {
        if (!updatedMapping[i]) {
          updatedMapping[i] = []
        } else if (!Array.isArray(updatedMapping[i])) {
          updatedMapping[i] = updatedMapping[i] ? [updatedMapping[i]] : []
        }
      }

      // 1. Remove from source position
      if (sourceCol !== undefined && sourceCol !== -1) {
        const sourceList = [...(updatedMapping[sourceCol] || [])]
        if (sourceIdx !== undefined && sourceIdx !== -1) {
          sourceList.splice(sourceIdx, 1)
          updatedMapping[sourceCol] = sourceList
        }
      }

      // 2. Filter out duplicates
      Object.keys(updatedMapping).forEach((colKey) => {
        const c = parseInt(colKey)
        if (Array.isArray(updatedMapping[c])) {
          updatedMapping[c] = updatedMapping[c].filter((item: any) => item.id !== materialId)
        }
      })

      // 3. Insert into target column
      const targetList = [...(updatedMapping[targetColIdx] || [])]
      if (targetItemIdx !== undefined && targetItemIdx !== -1) {
        targetList.splice(targetItemIdx, 0, matchedMaterial)
      } else {
        targetList.push(matchedMaterial)
      }
      updatedMapping[targetColIdx] = targetList

      setCellMaterials(updatedMapping)

      const res = await updateLessonLayoutAction(lessonId, gridLayout, updatedMapping)
      if (!res.success) {
        alert(`Failed to save column layout: ${res.error}`)
      }
    } catch (err) {
      console.error('Column drop error:', err)
    }
  }

  const handleRemoveFromColumn = async (colIdx: number, itemIdx: number) => {
    const updatedMapping = { ...cellMaterials }
    if (updatedMapping[colIdx] && Array.isArray(updatedMapping[colIdx])) {
      const list = [...updatedMapping[colIdx]]
      list.splice(itemIdx, 1)
      updatedMapping[colIdx] = list
      setCellMaterials(updatedMapping)

      const res = await updateLessonLayoutAction(lessonId, gridLayout, updatedMapping)
      if (!res.success) {
        alert(`Failed to save column layout: ${res.error}`)
      }
    }
  }

  const handleLayoutChange = async (newLayout: string) => {
    setGridLayout(newLayout)
    const updatedMapping = { ...cellMaterials }
    const maxCols = newLayout === '3-cols' ? 3 : newLayout === '2-cols' ? 2 : 1
    
    Object.keys(updatedMapping).forEach((key) => {
      const k = parseInt(key)
      if (k >= maxCols) {
        delete updatedMapping[k]
      }
    })

    for (let i = 0; i < maxCols; i++) {
      if (!updatedMapping[i]) {
        updatedMapping[i] = []
      } else if (!Array.isArray(updatedMapping[i])) {
        updatedMapping[i] = [updatedMapping[i]]
      }
    }
    setCellMaterials(updatedMapping)

    const res = await updateLessonLayoutAction(lessonId, newLayout, updatedMapping)
    if (!res.success) {
      alert(`Failed to save column layout: ${res.error}`)
    }
  }

  const handleOpenMaterialsPreview = async () => {
    setPreviewUrlStatus({ loading: true, startedAt: Date.now(), elapsed: '0.0s' })
    setShowMaterialsPreview(true)
    const urls: Record<string, string> = {}
    const errors: Record<string, string> = {}
    
    setPreviewSignedUrls({})
    setPreviewErrors({})

    const uniqueMaterialsMap = new Map<string, any>()
    for (const m of materials) {
      if (m && m.id) {
        uniqueMaterialsMap.set(m.id, m)
      }
    }
    if (cellMaterials) {
      Object.values(cellMaterials).forEach((colList) => {
        if (Array.isArray(colList)) {
          colList.forEach((m) => {
            if (m && m.id && !uniqueMaterialsMap.has(m.id)) {
              uniqueMaterialsMap.set(m.id, m)
            }
          })
        }
      })
    }
    const allMaterials = Array.from(uniqueMaterialsMap.values())

    try {
      for (const m of allMaterials) {
        if (['pdf', 'docx', 'csv', 'xlsx'].includes(m.type)) {
          if (!m.storage_url) {
            errors[m.id] = 'Material missing storage URL path'
            continue
          }

          const result = await getSignedUrlAction('teaching-materials', m.storage_url, 300)

          if (result.success && result.signedUrl) {
            urls[m.id] = result.signedUrl
          } else {
            errors[m.id] = result.error || 'No signed URL returned from storage'
          }
        }
      }

      for (const m of allMaterials) {
        if (m.type === 'pdf' && !urls[m.id]) {
          if (!errors[m.id]) {
            errors[m.id] = 'Signed URL is empty or failed to generate'
          }
        }
      }

      setPreviewSignedUrls(urls)
      setPreviewErrors(errors)
    } catch (err: any) {
      console.error('[handleOpenStudentPreview] Unexpected error:', err)
    } finally {
      setPreviewUrlStatus(prev => ({ ...prev, loading: false }))
    }
  }

  const handleFileSelection = (file: File) => {
    setUploadFile(file)
    const ext = file.name.split('.').pop()?.toLowerCase()
    let detectedType: 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link' | 'markdown' | 'json' = 'pdf'
    if (ext === 'pdf') detectedType = 'pdf'
    else if (ext === 'docx') detectedType = 'docx'
    else if (ext === 'csv') detectedType = 'csv'
    else if (ext === 'xlsx' || ext === 'xls') detectedType = 'xlsx'
    else if (ext === 'zip' || ext === 'js' || ext === 'py' || ext === 'ts') detectedType = 'code_repo'
    else if (ext === 'json') detectedType = 'json'
    else if (ext === 'md' || ext === 'txt') detectedType = 'markdown'

    setMaterialForm({
      ...materialForm,
      title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
      type: detectedType,
      linkUrl: '',
      uploadOption: 'file'
    })
    setShowMaterialForm(true)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  useEffect(() => {
    if (lessonId) {
      fetchLessonDetails()
    }
  }, [lessonId])

  async function fetchLessonDetails(preferredAssignmentId?: string) {
    setLoading(true)
    try {
      const [
        { data: lessonData },
        { data: materialsData },
        { data: assignmentsData },
      ] = await Promise.all([
        supabase
          .from('lessons')
          .select('*, modules(*, courses(*, subjects(*)))')
          .eq('id', lessonId)
          .single(),
        supabase
          .from('canonical_materials')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('display_order', { ascending: true }),
        supabase
          .from('assignments')
          .select('*, rubric_snapshots(snapshot)')
          .eq('lesson_id', lessonId)
          .order('created_at'),
      ])

      if (lessonData) {
        setLesson(lessonData)
        setTitle(lessonData.title)
        setContent(lessonData.content || '')
        setDownloadAllowed(lessonData.download_allowed ?? true)
        setGridLayout(lessonData.grid_layout || '1-col')
        setCellMaterials(lessonData.metadata?.grid_cell_mapping || {})
      }
      setMaterials(materialsData || [])

      if (assignmentsData && assignmentsData.length > 0) {
        const activeAs =
          assignmentsData.find((item: any) => item.id === preferredAssignmentId) ||
          assignmentsData.find((item: any) => item.id === assignmentId) ||
          assignmentsData[0]
        setHasAssignment(true)
        setAssignmentId(activeAs.id)
        const policy = activeAs.late_policy || {}
        setAssignmentForm({
          title: activeAs.title,
          instructions: activeAs.instructions || '',
          maxScore: activeAs.max_score,
          maxFiles: activeAs.max_files || 3,
          maxTotalSizeMb: activeAs.max_total_size_mb || 50,
          autoPublishGrades: activeAs.auto_publish_grades || false,
          gracePeriodHours: policy.grace_period_hours || 0,
          penaltyPercentPerDay: policy.penalty_percent_per_day || 0
        })
        const storagePath = activeAs.solution_storage_path || ''
        setSolutionStoragePath(storagePath)
        if (storagePath) {
          if (storagePath.includes('_ai_draft.md') || storagePath.includes('_ai_solution.md')) {
            setSolutionMode('ai')
            try {
              const { data: fileData, error: fileErr } = await supabase.storage
                .from('assignment-solutions')
                .download(storagePath)
              if (!fileErr && fileData) {
                const text = await fileData.text()
                setSolutionText(text)
              }
            } catch (err) {
              console.error('Failed to download solution draft from storage:', err)
            }
          } else {
            setSolutionMode('upload')
            setSolutionText('')
          }
        } else {
          setSolutionMode('ai')
          setSolutionText('')
        }
        setPromptStoragePath(activeAs.prompt_file_path || '')
        setSelectedModel(activeAs.ai_model_used || 'gemini-2.5-flash')

        try {
          if (activeAs.instructions && activeAs.instructions.trim()) {
            const instr = activeAs.instructions.trim()
            if (instr.startsWith('{')) {
              const parsed = JSON.parse(instr)
              const dataFilesLoaded = parsed.data_files || []
              const referenceFilesLoaded = parsed.reference_files || []
              
              setDataFiles(dataFilesLoaded)
              setReferenceFiles(referenceFilesLoaded)
              
              const questions = parsed.questions || []
              const groupedBatches: BatchItem[] = []
              questions.forEach((q: any) => {
                const qItem: QuestionItem = {
                  id: q.id || Math.random(),
                  content: q.content || '',
                  options: q.options || undefined,
                  answer: q.answer || undefined,
                  status: q.status || 'approved',
                  answerFormat: q.answerFormat || undefined,
                  answerSource: q.answerSource || undefined,
                  data: q.data || undefined,
                  source: q.source || 'ai_generator',
                  source_file: q.source_file || null
                }
                
                const qType = q.type || (q.options && q.options.length > 0 ? 'multiple_choice' : 'essay')
                const qCategory = q.category || 'theory'
                
                let match = groupedBatches.find(b => {
                  if (qItem.source === 'file_import') {
                    return b.questions.some(bq => bq.source === 'file_import' && bq.source_file === qItem.source_file)
                  } else {
                    return b.type === qType && b.category === qCategory && b.questions.every(bq => bq.source !== 'file_import')
                  }
                })
                
                if (match) {
                  match.questions.push(qItem)
                } else {
                  groupedBatches.push({
                    id: Date.now() + Math.random(),
                    type: qType,
                    category: qCategory,
                    defaultAnswerFormat: q.answerFormat || 'text',
                    questions: [qItem]
                  })
                }
              })
              setBatches(groupedBatches)
            } else if (instr.startsWith('[')) {
              const parsed = JSON.parse(instr)
              if (Array.isArray(parsed) && parsed.length > 0) {
                const questions = parsed.map((q: any) => ({
                  id: q.id || Math.random(),
                  content: q.content || '',
                  options: q.options || undefined,
                  answer: q.answer || undefined,
                  status: 'approved' as const,
                  answerFormat: q.answerFormat || undefined,
                  answerSource: q.answerSource || undefined,
                  data: q.data || undefined,
                  source: 'ai_generator' as const,
                  source_file: null
                }))
                const hasOptions = questions.some(q => q.options && q.options.length > 0)
                setBatches([{
                  id: Date.now(),
                  type: hasOptions ? 'multiple_choice' : 'essay',
                  category: 'theory',
                  defaultAnswerFormat: questions[0]?.answerFormat || 'text',
                  questions
                }])
                setDataFiles([])
                setReferenceFiles([])
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse instructions JSON', e)
        }

        const snapshot = activeAs.rubric_snapshots?.snapshot
        if (snapshot && snapshot.criteria) {
          const formatted = snapshot.criteria.map((c: any) => ({
            key: c.id || c.key,
            label: c.name || c.label,
            description: c.description,
            max_points: c.max_points,
            weight: c.weight,
            evaluation_hints: c.evaluation_hints || { rule_type: 'none', expected_value: null }
          }))
          setCriteriaList(formatted)
        }
      } else {
        setHasAssignment(false)
        setAssignmentId('')
        setCriteriaList([])
        setSolutionText('')
        setSolutionStoragePath('')
        setPromptStoragePath('')
        setSolutionFile(null)
        setPromptFile(null)
        setBatches([])
      }
    } catch (error) {
      console.error('Failed to load lesson metadata:', error)
    } finally {
      setLoading(false)
      setTimeout(() => setInitialLoaded(true), 500)
    }
  }

  useEffect(() => {
    if (initialLoaded) {
      setIsDirty(true)
    }
  }, [title, content, materials, hasAssignment, assignmentForm, solutionMode, solutionText, criteriaList, downloadAllowed])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (hasAssignment) {
        setCurrentStep(3)
      } else {
        handleSaveComposer('official')
      }
    } else if (currentStep === 3) {
      setCurrentStep(4)
    } else if (currentStep === 4) {
      handleSaveComposer('official')
    }
  }

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(2)
    } else if (currentStep === 4) {
      setCurrentStep(3)
    }
  }

  const handleSaveLessonOnly = async () => {
    if (!title || !lessonId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title,
          content,
          download_allowed: downloadAllowed,
          version: (lesson.version || 1) + 1,
        })
        .eq('id', lessonId)

      if (error) throw error
      alert('Lesson draft saved successfully!')
      setIsDirty(false)
      await fetchLessonDetails()
      setIsDirty(false)
    } catch (err: any) {
      alert(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialForm.title || !lessonId) {
      alert('Please specify a material heading / title')
      return
    }

    setUploading(true)
    setUploadStatus({ active: true, step: 'hashing', startedAt: Date.now(), elapsed: '0.0s' })
    let isNewUpload = false
    let finalStorageUrl = ''
    let finalType = materialForm.type

    try {
      let calculatedHash: string | undefined = undefined
      let fileToUpload: File | null = null

      if (materialForm.creationMethod === 'write') {
        if (!materialForm.manualContent.trim()) {
          alert('Please enter some content in the rich text editor first')
          setUploading(false)
          setUploadStatus({ active: false, step: '', startedAt: 0, elapsed: '' })
          return
        }
        const mdContent = htmlToMarkdown(materialForm.manualContent)
        const fileName = `${materialForm.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.md`
        fileToUpload = new File([mdContent], fileName, { type: 'text/markdown' })
        finalType = 'markdown'
      } else {
        if (materialForm.uploadOption === 'file') {
          if (!uploadFile) {
            alert('Please select a file to upload')
            setUploading(false)
            setUploadStatus({ active: false, step: '', startedAt: 0, elapsed: '' })
            return
          }
          fileToUpload = uploadFile
          finalType = materialForm.type
        } else {
          if (!materialForm.linkUrl) {
            alert('Please specify a URL link')
            setUploading(false)
            setUploadStatus({ active: false, step: '', startedAt: 0, elapsed: '' })
            return
          }
          finalStorageUrl = materialForm.linkUrl
          const isGithub = materialForm.linkUrl.includes('github.com') || materialForm.linkUrl.includes('git')
          finalType = isGithub ? 'code_repo' : 'link'
        }
      }

      if (fileToUpload) {
        setUploadStatus(prev => ({ ...prev, step: 'hashing' }))
        const hash = await calculateFileHash(fileToUpload)
        calculatedHash = hash

        const duplicate = await checkMaterialDeduplication(hash)
        if (duplicate) {
          alert(`Deduplication: Duplicate asset "${duplicate.title}" detected. Reusing existing file storage url!`)
          finalStorageUrl = duplicate.storage_url
        } else {
          setUploadStatus(prev => ({ ...prev, step: 'uploading' }))
          const ext = fileToUpload.name.split('.').pop()
          const subjectSlug = lesson.modules.courses.subjects.slug
          const courseSlug = lesson.modules.courses.slug
          const lessonOrder = String(lesson.order_index).padStart(2, '0')
          const fileName = `subjects/${subjectSlug}/${courseSlug}/${lessonOrder}_${hash}.${ext}`

          const formData = new FormData()
          formData.append('bucket', 'teaching-materials')
          formData.append('path', fileName)
          formData.append('file', fileToUpload)
          formData.append('upsert', 'false')

          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Upload failed: ${uploadRes.error}`)
          }

          finalStorageUrl = fileName
          isNewUpload = true
        }
      }

      setUploadStatus(prev => ({ ...prev, step: 'saving' }))

      const metadata: Record<string, any> = {
        note: materialForm.note || ''
      }
      if (finalType === 'pdf') {
        metadata.display_mode = 'original'
      }

      const regRes = await registerCanonicalMaterial({
        lessonId,
        title: materialForm.title,
        type: finalType,
        storageUrl: finalStorageUrl,
        fileHash: calculatedHash,
        metadata
      })

      if (!regRes.success) {
        throw new Error(regRes.error)
      }

      setMaterialForm({
        title: '',
        type: 'pdf',
        linkUrl: '',
        creationMethod: 'upload',
        uploadOption: 'file',
        manualContent: '',
        note: ''
      })
      setUploadFile(null)
      setShowMaterialForm(false)
      fetchLessonDetails()
    } catch (err: any) {
      if (isNewUpload && finalStorageUrl) {
        try {
          await deleteFileFromStorageAction('teaching-materials', [finalStorageUrl])
        } catch (cleanupErr) {
          console.error('File cleanup failed:', cleanupErr)
        }
      }
      alert(`Asset mapping failed: ${err.message}`)
    } finally {
      setUploading(false)
      setUploadStatus({ active: false, step: '', startedAt: 0, elapsed: '' })
    }
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to remove this material from the lesson?')) return
    try {
      const { error } = await supabase.from('canonical_materials').delete().eq('id', id)
      if (error) throw error
      fetchLessonDetails()
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  const handleGenerateAISolution = async () => {
    if (!assignmentForm.instructions) {
      alert('Please enter assignment guidelines/instructions first, so the AI knows what to solve!')
      return
    }
    setGeneratingSolution(true)
    try {
      const res = await generateSolutionAction(assignmentForm.instructions, selectedModel)
      if (!res.success) throw new Error(res.error)
      setSolutionText(res.solutionKey || '')
      alert('AI Solution Key Draft generated! Review it under Tab 3.')
    } catch (err: any) {
      alert(`AI solution generation failed: ${err.message}`)
    } finally {
      setGeneratingSolution(false)
    }
  }

  const handleGenerateAIRubric = async () => {
    if (!assignmentForm.instructions) {
      alert('Please fill out assignment instructions first.')
      return
    }
    const finalSolText = solutionMode === 'ai' ? solutionText : (solutionFile ? solutionFile.name : '')
    if (!finalSolText) {
      alert('Please provide or generate a solution key first, so the AI can evaluate correctly!')
      return
    }

    setGeneratingRubric(true)
    try {
      const res = await generateRubricAction(assignmentForm.instructions, finalSolText, selectedModel)
      if (!res.success) throw new Error(res.error)
      setCriteriaList(res.criteria || [])
      alert('AI Rubric generated! Review and tweak it below.')
    } catch (err: any) {
      alert(`AI Rubric generation failed: ${err.message}`)
    } finally {
      setGeneratingRubric(false)
    }
  }

  const getSandboxResult = () => {
    const crit = criteriaList[sandboxCriterionIdx]
    if (!crit || !sandboxInput) return null
    const hint = crit.evaluation_hints
    if (!hint || hint.rule_type === 'none') return null
    const expected = hint.expected_value
    if (!expected) return null

    if (hint.rule_type === 'exact') {
      return sandboxInput.trim().toLowerCase() === expected.trim().toLowerCase()
    }

    if (hint.rule_type === 'regex') {
      try {
        const regex = new RegExp(expected, 'i')
        return regex.test(sandboxInput)
      } catch {
        return false
      }
    }
    return null
  }

  const clientGenerateQuestions = async (params: {
    modelChoice: string
    assignmentType: 'multiple_choice' | 'essay'
    category: 'theory' | 'code'
    questionCount: number
    generateSampleData: boolean
    lessonContent: string
  }) => {
    try {
      const res = await fetch('/api/v1/generate-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let errMsg = text
        try {
          const json = JSON.parse(text)
          errMsg = json.error || json.message || text
        } catch {}
        return { success: false, error: errMsg || `HTTP error ${res.status}` }
      }
      const data = await res.json()
      if (!data.success) {
        return { success: false, error: data.error || data.message || 'Generation failed' }
      }
      return { success: true, questions: data.questions }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const handleStartGenerating = async () => {
    setIsGeneratingBatch(true)
    setModalStep(2)
    setGenStage('reading')
    setGenElapsed(0)
    setReadingDuration(null)
    setGeneratingDuration(null)
    setSampleDataDuration(null)
    
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      setGenElapsed(elapsed)
    }, 200)

    try {
      let combinedContent = content || title
      
      const readingStartTime = Date.now()
      if (aiSelectedMaterials.length > 0) {
        const selectedPaths = materials
          .filter(m => aiSelectedMaterials.includes(m.id))
          .map(m => m.storage_url)
          .filter(Boolean)
          
        if (selectedPaths.length > 0) {
          const readRes = await readMaterialsTextAction(selectedPaths)
          if (readRes.success && readRes.combinedText) {
            combinedContent = readRes.combinedText
          }
        }
      }
      const readingEndTime = Date.now()
      setReadingDuration(readingEndTime - readingStartTime)

      setGenStage('generating')
      const generatingStartTime = Date.now()
      
      const difficultyText = aiDifficulty === 'easy' ? 'Easy (conceptual, basic definitions)' : aiDifficulty === 'hard' ? 'Hard (advanced code architecture, deep analysis)' : 'Medium (balanced application & details)'
      const languageText = aiLanguage === 'english' ? 'English ONLY' : aiLanguage === 'vietnamese' ? 'Vietnamese ONLY' : 'Bilingual (Vietnamese & English)'

      const combinedPayload = `AI INSTRUCTION CRITICAL:\n- Generate all questions and answers in ${languageText} language.\n- Set the overall difficulty level of questions to ${difficultyText}.\n\nSOURCE LESSON CONTENT/MATERIALS:\n${combinedContent}`

      const res = await clientGenerateQuestions({
        modelChoice: selectedModel,
        assignmentType: aiType,
        category: aiCategory,
        questionCount: aiQuestionCount,
        generateSampleData: aiSampleData,
        lessonContent: combinedPayload
      })
      
      const generatingEndTime = Date.now()
      setGeneratingDuration(generatingEndTime - generatingStartTime)
      
      if (res.success && res.questions) {
        if (aiSampleData) {
          setGenStage('sample_data')
          const sampleStartTime = Date.now()
          await new Promise(resolve => setTimeout(resolve, 1500))
          setSampleDataDuration(Date.now() - sampleStartTime)
        }

        clearInterval(timer)
        
        const newBatch: BatchItem = {
          id: Date.now(),
          type: aiType,
          category: aiCategory,
          defaultAnswerFormat: aiType === 'multiple_choice' ? 'text' : aiDefaultAnswerFormat,
          questions: res.questions.map((q: any) => ({
            id: q.id || Math.random(),
            content: q.content || '',
            options: q.options && Array.isArray(q.options)
              ? q.options.map((opt: string, oIdx: number) => cleanOptionText(opt, oIdx))
              : undefined,
            answer: q.answer || undefined,
            status: 'pending' as const,
            data: q.data || undefined,
            source: 'ai_generator',
            source_file: null
          }))
        }
        const nextBatches = [...batches, newBatch]
        setBatches(nextBatches)
        setActiveBatchIndex(nextBatches.length - 1)
        setActiveQuestionIndex(0)
        setModalStep(3)
      } else {
        clearInterval(timer)
        alert(`Generation failed: ${res.error}`)
        setModalStep(1)
      }
    } catch (err: any) {
      clearInterval(timer)
      alert(`Generation failed: ${err.message}`)
      setModalStep(1)
    } finally {
      setIsGeneratingBatch(false)
    }
  }

  const handleReviewAction = (status: 'approved' | 'rejected') => {
    if (activeBatchIndex < 0 || activeBatchIndex >= batches.length) return
    const updated = [...batches]
    const batch = updated[activeBatchIndex]
    if (!batch) return
    const questions = [...batch.questions]
    if (!questions[activeQuestionIndex]) return

    questions[activeQuestionIndex] = {
      ...questions[activeQuestionIndex],
      status
    }
    batch.questions = questions
    setBatches(updated)

    let found = false
    for (let qIdx = activeQuestionIndex + 1; qIdx < batch.questions.length; qIdx++) {
      if (batch.questions[qIdx].status === 'pending') {
        setActiveQuestionIndex(qIdx)
        found = true
        break
      }
    }
    if (!found) {
      for (let bIdx = activeBatchIndex + 1; bIdx < updated.length; bIdx++) {
        const nextBatch = updated[bIdx]
        const pendingIdx = nextBatch.questions.findIndex(q => q.status === 'pending')
        if (pendingIdx !== -1) {
          setActiveBatchIndex(bIdx)
          setActiveQuestionIndex(pendingIdx)
          found = true
          break
        }
      }
    }
    if (!found) {
      for (let bIdx = 0; bIdx <= activeBatchIndex; bIdx++) {
        const prevBatch = updated[bIdx]
        const limit = bIdx === activeBatchIndex ? activeQuestionIndex : prevBatch.questions.length
        for (let qIdx = 0; qIdx < limit; qIdx++) {
          if (prevBatch.questions[qIdx].status === 'pending') {
            setActiveBatchIndex(bIdx)
            setActiveQuestionIndex(qIdx)
            found = true
            break
          }
        }
        if (found) break
      }
    }
  }

  const handleDeleteQuestion = (bIdx: number, qIdx: number) => {
    const confirmed = window.confirm("Delete this question? This cannot be undone.")
    if (!confirmed) return

    setBatches(prev => {
      const next = [...prev]
      if (next[bIdx]) {
        const qs = [...next[bIdx].questions]
        qs.splice(qIdx, 1)
        next[bIdx] = {
          ...next[bIdx],
          questions: qs
        }
      }
      
      const totalQs = next[bIdx]?.questions.length || 0
      if (activeQuestionIndex >= totalQs && totalQs > 0) {
        setActiveQuestionIndex(totalQs - 1)
      } else if (totalQs === 0) {
        setActiveQuestionIndex(0)
      }
      return next
    })
  }

  const handleEditSave = (bIdx: number, qIdx: number, updatedQ: QuestionItem) => {
    setBatches(prev => {
      const next = [...prev]
      if (next[bIdx]) {
        const qs = [...next[bIdx].questions]
        qs[qIdx] = updatedQ
        next[bIdx] = {
          ...next[bIdx],
          questions: qs
        }
      }
      return next
    })
    setEditingQuestion(null)
    setEditingBatchIndex(null)
    setEditingQuestionIndex(null)
  }

  const handleRegenerateQuestion = async (bIdx: number, qIdx: number) => {
    if (bIdx < 0 || bIdx >= batches.length) return
    const batch = batches[bIdx]
    const original = batch.questions[qIdx]
    if (!original) return

    const updated = [...batches]
    const updatedQs = [...batch.questions]
    updatedQs[qIdx] = {
      ...original,
      content: 'Regenerating question...'
    }
    updated[bIdx].questions = updatedQs
    setBatches(updated)

    const res = await clientGenerateQuestions({
      modelChoice: selectedModel,
      assignmentType: batch.type,
      category: batch.category,
      questionCount: 1,
      generateSampleData: aiSampleData,
      lessonContent: content || title
    })

    if (res.success && res.questions && res.questions.length > 0) {
      const q = res.questions[0]
      const nextUpdated = [...batches]
      const nextUpdatedQs = [...nextUpdated[bIdx].questions]
      nextUpdatedQs[qIdx] = {
        id: original.id,
        content: q.content || '',
        options: q.options || undefined,
        answer: q.answer || undefined,
        status: 'pending',
        data: q.data || undefined,
        source: 'ai_generator',
        source_file: null
      }
      nextUpdated[bIdx].questions = nextUpdatedQs
      setBatches(nextUpdated)
    } else {
      alert(`Regeneration failed: ${res.error}`)
      const nextUpdated = [...batches]
      const nextUpdatedQs = [...nextUpdated[bIdx].questions]
      nextUpdatedQs[qIdx] = original
      nextUpdated[bIdx].questions = nextUpdatedQs
      setBatches(nextUpdated)
    }
  }

  const handleRegenAllRejected = async () => {
    let hasRejected = false
    batches.forEach(b => {
      if (b.questions.some(q => q.status === 'rejected')) hasRejected = true
    })
    if (!hasRejected) {
      alert('No rejected questions to regenerate.')
      return
    }

    const updated = [...batches]
    for (let bIdx = 0; bIdx < updated.length; bIdx++) {
      const batch = updated[bIdx]
      const rejectedIndices = batch.questions.map((q, idx) => q.status === 'rejected' ? idx : -1).filter(idx => idx !== -1)
      if (rejectedIndices.length === 0) continue

      const updatedQs = [...batch.questions]
      rejectedIndices.forEach(qIdx => {
        updatedQs[qIdx] = {
          ...updatedQs[qIdx],
          content: 'Regenerating question...'
        }
      })
      updated[bIdx].questions = updatedQs
      setBatches([...updated])

      const res = await clientGenerateQuestions({
        modelChoice: selectedModel,
        assignmentType: batch.type,
        category: batch.category,
        questionCount: rejectedIndices.length,
        generateSampleData: aiSampleData,
        lessonContent: content || title
      })

      if (res.success && res.questions) {
        const finalQs = [...updated[bIdx].questions]
        rejectedIndices.forEach((qIdx, arrIdx) => {
          const replacement = res.questions[arrIdx]
          if (replacement) {
            finalQs[qIdx] = {
              id: finalQs[qIdx].id,
              content: replacement.content || '',
              options: replacement.options || undefined,
              answer: replacement.answer || undefined,
              status: 'pending',
              data: replacement.data || undefined,
              source: 'ai_generator',
              source_file: null
            }
          }
        })
        updated[bIdx].questions = finalQs
        setBatches([...updated])
      } else {
        alert(`Regeneration failed for Batch ${bIdx + 1}: ${res.error}`)
      }
    }
  }

  const handleApproveAll = () => {
    const updated = batches.map(batch => ({
      ...batch,
      questions: batch.questions.map(q => q.status === 'pending' ? { ...q, status: 'approved' as const } : q)
    }))
    setBatches(updated)
  }

  const handleEditBatch = (batchIdx: number) => {
    setActiveBatchIndex(batchIdx)
    setActiveQuestionIndex(0)
    setModalStep(3)
  }

  const handleDeleteBatch = (batchIdx: number) => {
    const confirmed = window.confirm("Delete the ENTIRE batch? This will remove all questions in this batch. This cannot be undone.")
    if (!confirmed) return
    
    const nextBatches = batches.filter((_, idx) => idx !== batchIdx)
    setBatches(nextBatches)
    if (nextBatches.length === 0) {
      setActiveBatchIndex(0)
      setActiveQuestionIndex(0)
    } else if (activeBatchIndex >= nextBatches.length) {
      setActiveBatchIndex(nextBatches.length - 1)
    }
  }

  const handleQuestionFormatOverride = (qIdx: number, format: 'text' | 'file' | 'both' | undefined) => {
    setBatches(prev => {
      const next = [...prev]
      if (next[activeBatchIndex]) {
        const q = { ...next[activeBatchIndex].questions[qIdx] }
        if (format === undefined) {
          delete q.answerFormat
        } else {
          q.answerFormat = format
        }
        next[activeBatchIndex].questions[qIdx] = q
      }
      return next
    })
  }

  const handleInlineApprove = (bIdx: number, qIdx: number) => {
    setBatches(prev => {
      const next = [...prev]
      if (next[bIdx]) {
        const qs = [...next[bIdx].questions]
        qs[qIdx] = { ...qs[qIdx], status: 'approved' as const }
        next[bIdx] = { ...next[bIdx], questions: qs }
      }
      return next
    })
  }

  const handleInlineReject = (bIdx: number, qIdx: number) => {
    setBatches(prev => {
      const next = [...prev]
      if (next[bIdx]) {
        const qs = [...next[bIdx].questions]
        qs[qIdx] = { ...qs[qIdx], status: 'rejected' as const }
        next[bIdx] = { ...next[bIdx], questions: qs }
      }
      return next
    })
  }

  const handleSaveQuestionsToAssignment = () => {
    const approvedQuestions: any[] = []
    batches.forEach(b => {
      b.questions.forEach(q => {
        if (q.status === 'approved') {
          approvedQuestions.push({
            id: q.id,
            content: q.content,
            options: q.options || null,
            answer: q.answer || null,
            type: b.type,
            category: b.category,
            status: q.status,
            source: q.source || 'ai_generator',
            source_file: q.source_file || null,
            data: q.data || null,
            answerFormat: b.type === 'multiple_choice' ? 'text' : (q.answerFormat || b.defaultAnswerFormat || 'text'),
            answerSource: q.answerSource || (q.answer ? (q.source === 'file_import' ? 'file_import' : 'ai_generated') : null)
          })
        }
      })
    })

    const payload = {
      questions: approvedQuestions,
      data_files: dataFiles.map(f => ({
        name: f.name,
        size: f.size,
        storage_path: f.storage_path || null,
        downloadable: f.downloadable,
        previewable: f.previewable
      })),
      reference_files: referenceFiles.map(f => ({
        name: f.name,
        size: f.size,
        storage_path: f.storage_path || null,
        downloadable: f.downloadable,
        previewable: f.previewable
      }))
    }

    setAssignmentForm({
      ...assignmentForm,
      instructions: JSON.stringify(payload)
    })
    setHasAssignment(true)
    setShowAiModal(false)
  }

  const updateQuestionInBatches = (qId: number, fields: Partial<QuestionItem>) => {
    setBatches(prev => {
      return prev.map(b => {
        return {
          ...b,
          questions: b.questions.map(q => {
            if (q.id === qId) {
              return { ...q, ...fields }
            }
            return q
          })
        }
      })
    })
  }

  const handleSuggestAnswer = async (approvedQIndex: number) => {
    const approvedQs: QuestionItem[] = []
    batches.forEach(b => {
      b.questions.forEach(q => {
        if (q.status === 'approved') {
          approvedQs.push(q)
        }
      })
    })

    const activeQ = approvedQs[approvedQIndex]
    if (!activeQ) return

    setSuggestingAnsIdx(approvedQIndex)
    try {
      let materialsText = ''
      if (aiSelectedMaterials.length > 0) {
        const selectedPaths = materials
          .filter(m => aiSelectedMaterials.includes(m.id))
          .map(m => m.storage_url)
          .filter(Boolean)
          
        if (selectedPaths.length > 0) {
          const readRes = await readMaterialsTextAction(selectedPaths)
          if (readRes.success && readRes.combinedText) {
            materialsText = readRes.combinedText
          }
        }
      }

      const res = await suggestQuestionAnswerAction({
        questionContent: activeQ.content,
        materialsText: materialsText || undefined,
        lessonContext: content || title || undefined,
        modelChoice: selectedModel
      })

      if (res.success && res.answer) {
        updateQuestionInBatches(activeQ.id, {
          answer: res.answer,
          answerSource: 'ai_generated'
        })
      } else {
        alert(`AI Suggest failed: ${res.error || 'No answer returned'}`)
      }
    } catch (err: any) {
      alert(`AI Suggest failed: ${err.message}`)
    } finally {
      setSuggestingAnsIdx(null)
    }
  }

  const handleSuggestAllMissingAnswers = async () => {
    const approvedQs: QuestionItem[] = []
    batches.forEach(b => {
      b.questions.forEach(q => {
        if (q.status === 'approved') {
          approvedQs.push(q)
        }
      })
    })

    const missingQs = approvedQs.filter(q => !q.answer || q.answer.trim() === '')
    if (missingQs.length === 0) {
      alert('All approved questions already have answers!')
      return
    }

    setIsSuggestingAll(true)
    try {
      let materialsText = ''
      if (aiSelectedMaterials.length > 0) {
        const selectedPaths = materials
          .filter(m => aiSelectedMaterials.includes(m.id))
          .map(m => m.storage_url)
          .filter(Boolean)
          
        if (selectedPaths.length > 0) {
          const readRes = await readMaterialsTextAction(selectedPaths)
          if (readRes.success && readRes.combinedText) {
            materialsText = readRes.combinedText
          }
        }
      }

      const questionsPayload = missingQs.map(q => ({
        id: q.id,
        content: q.content
      }))

      const res = await suggestBatchQuestionAnswersAction({
        questions: questionsPayload,
        materialsText: materialsText || undefined,
        lessonContext: content || title || undefined,
        modelChoice: selectedModel
      })

      if (res.success && res.answers) {
        const answersMap: { [qId: number]: string } = {}
        let successfulCount = 0

        res.answers.forEach((ans: any) => {
          if (ans.answer && ans.answer.trim() !== '') {
            answersMap[ans.id] = ans.answer
            successfulCount++
          }
        })

        if (successfulCount > 0) {
          setBatches(prev => {
            return prev.map(b => ({
              ...b,
              questions: b.questions.map(q => {
                if (answersMap[q.id] !== undefined) {
                  return {
                    ...q,
                    answer: answersMap[q.id],
                    answerSource: 'ai_generated'
                  }
                }
                return q
              })
            }))
          })
          alert(`Successfully generated answers for ${successfulCount} question(s)!`)
        } else {
          alert('Could not suggest answers for any of the missing questions. Please verify your connection or model options.')
        }
      } else {
        alert(`AI Suggest failed: ${res.error || 'No answers returned'}`)
      }
    } catch (err: any) {
      alert(`Failed to suggest all answers: ${err.message}`)
    } finally {
      setIsSuggestingAll(false)
    }
  }

  const handleGenerateRubric = async () => {
    const approvedQs: QuestionItem[] = []
    batches.forEach(b => {
      b.questions.forEach(q => {
        if (q.status === 'approved') {
          approvedQs.push(q)
        }
      })
    })

    if (approvedQs.length === 0) {
      alert('Please approve at least one question first before generating a rubric!')
      return
    }

    setIsGeneratingRubric(true)
    try {
      const assignmentText = approvedQs.map((q, idx) => `Question ${idx + 1}: ${q.content}\nFormat: ${q.answerFormat || 'text'}`).join('\n\n')
      const solutionText = approvedQs.map((q, idx) => `Answer ${idx + 1}: ${q.answer || '(no answer)'}`).join('\n\n')

      const res = await generateRubricAction(assignmentText, solutionText, selectedModel)
      if (res.success && res.criteria) {
        const newCriteria = res.criteria.map((c: any) => ({
          key: c.key || `crit-${Date.now()}-${Math.random()}`,
          label: c.label || c.name || 'Criterion',
          description: c.description || '',
          max_points: c.max_points || c.maxPoints || 10,
          weight: c.weight || 1.0,
          evaluation_hints: c.evaluation_hints || c.evaluationHints || { rule_type: 'none', expected_value: null }
        }))
        setCriteriaList(newCriteria)
        alert('Rubric successfully generated from questions & answers! Check Tab 4.')
      } else {
        alert(`Rubric generation failed: ${res.error || 'No criteria returned'}`)
      }
    } catch (err: any) {
      alert(`Rubric generation failed: ${err.message}`)
    } finally {
      setIsGeneratingRubric(false)
    }
  }

  const handleConfirmClassification = async () => {
    if (!classifyFile) return

    if (classifyType === 'question') {
      setIsParsingFile(true)
      try {
        const formData = new FormData()
        formData.append('file', classifyFile)
        formData.append('modelChoice', selectedModel)

        const res = await parseAssignmentFileAction(formData)
        if (res.success && res.questions) {
          if (res.questions.length === 0) {
            alert("No questions were extracted from the uploaded file. Please make sure the document contains recognizable question patterns.");
            setClassifyModalOpen(false);
            setClassifyFile(null);
            return;
          }

          const mappedQuestions = res.questions.map((q: any) => {
            let detectedType = 'essay';
            const rawType = String(q.type || '').toLowerCase().trim();
            if (
              rawType.includes('choice') ||
              rawType.includes('mc') ||
              rawType.includes('select') ||
              (q.options && q.options.length > 0)
            ) {
              detectedType = 'multiple_choice';
            }

            return {
              id: q.id || Math.random(),
              content: q.content || '',
              options: q.options && Array.isArray(q.options)
                ? q.options.map((opt: string, oIdx: number) => cleanOptionText(opt, oIdx))
                : undefined,
              answer: q.answer || undefined,
              answerSource: q.answer ? (q.answer_source || 'file_import') : undefined,
              status: 'pending' as const,
              data: q.data || undefined,
              source: 'file_import' as const,
              source_file: classifyFile.name,
              detectedType
            };
          });

          const mcQuestions = mappedQuestions.filter((q: any) => q.detectedType === 'multiple_choice');
          const essayQuestions = mappedQuestions.filter((q: any) => q.detectedType === 'essay');

          let updatedBatches = [...batches];
          let mcBatchCreated = false;

          if (mcQuestions.length > 0) {
            const mcQuestionsWithFormat = mcQuestions.map((q: any) => {
              const { detectedType, ...rest } = q;
              return {
                ...rest,
                answerFormat: 'text' as const
              };
            });

            const newBatch: BatchItem = {
              id: Date.now(),
              type: 'multiple_choice',
              category: 'theory',
              defaultAnswerFormat: 'text',
              questions: mcQuestionsWithFormat
            };

            updatedBatches.push(newBatch);
            setBatches(updatedBatches);
            mcBatchCreated = true;
          }

          setClassifyModalOpen(false);
          setClassifyFile(null);

          if (essayQuestions.length > 0) {
            const essayQuestionsCleaned = essayQuestions.map((q: any) => {
              const { detectedType, ...rest } = q;
              return rest;
            });
            setParsedQuestionsTemp(essayQuestionsCleaned);
            setParsedFileNameTemp(classifyFile.name);
            setShowEssayFormatModal(true);
          } else if (mcBatchCreated) {
            setActiveBatchIndex(updatedBatches.length - 1);
            setActiveQuestionIndex(0);
            setModalStep(3);
            setShowAiModal(true);
          }
        } else {
          alert(`Parsing failed: ${res.error}`)
        }
      } catch (err: any) {
        alert(`Parsing failed: ${err.message}`)
      } finally {
        setIsParsingFile(false)
      }
    } else if (classifyType === 'data') {
      const newItem: AssignmentFileItem = {
        name: classifyFile.name,
        size: classifyFile.size,
        file: classifyFile,
        downloadable: classifyDownloadable,
        previewable: classifyPreviewable
      }
      setDataFiles(prev => [...prev, newItem])
      setClassifyModalOpen(false)
      setClassifyFile(null)
    } else if (classifyType === 'reference') {
      const newItem: AssignmentFileItem = {
        name: classifyFile.name,
        size: classifyFile.size,
        file: classifyFile,
        downloadable: classifyDownloadable,
        previewable: classifyPreviewable
      }
      setReferenceFiles(prev => [...prev, newItem])
      setClassifyModalOpen(false)
      setClassifyFile(null)
    }
  }

  const handleApplyEssayFormat = (format: 'text' | 'file' | 'both') => {
    if (parsedQuestionsTemp.length === 0) return

    const newQuestionsWithFormat = parsedQuestionsTemp.map((q: any) => ({
      ...q,
      answerFormat: format
    }))

    const newBatch: BatchItem = {
      id: Date.now(),
      type: 'essay',
      category: 'theory',
      defaultAnswerFormat: format,
      questions: newQuestionsWithFormat
    }

    const nextBatches = [...batches, newBatch]
    setBatches(nextBatches)
    setActiveBatchIndex(nextBatches.length - 1)
    setActiveQuestionIndex(0)

    setParsedQuestionsTemp([])
    setParsedFileNameTemp('')
    setShowEssayFormatModal(false)

    setModalStep(3)
    setShowAiModal(true)
  }

  const handleAsgDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setAsgDragActive(true)
    } else if (e.type === "dragleave") {
      setAsgDragActive(false)
    }
  }

  const handleAsgDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAsgDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setClassifyFile(file)
      setClassifyType('data')
      setClassifyDownloadable(true)
      setClassifyPreviewable(true)
      setClassifyModalOpen(true)
    }
  }

  const handleSaveComposer = async (mode: 'draft' | 'official' = 'official') => {
    if (!title || !lessonId) return
    const isOfficialSave = mode === 'official'
    setSaving(true)
    setSaveStatus({ active: true, startedAt: Date.now(), elapsed: '0.0s' })

    let isNewSolutionUpload = false
    let finalSolutionPath = solutionStoragePath
    let isNewPromptUpload = false
    let finalPromptPath = promptStoragePath
    let savedAssignmentIdForReload: string | undefined = assignmentId || undefined

    try {
      const { error: lessonErr } = await supabase
        .from('lessons')
        .update({
          title,
          content,
          download_allowed: downloadAllowed,
          version: (lesson.version || 1) + 1,
        })
        .eq('id', lessonId)

      if (lessonErr) throw lessonErr

      if (hasAssignment) {
        const approvedQuestions: any[] = []
        batches.forEach(b => {
          b.questions.forEach(q => {
            approvedQuestions.push({
              id: q.id,
              content: q.content,
              options: q.options || null,
              answer: q.answer || null,
              type: b.type,
              category: b.category,
              status: q.status || 'pending',
              source: q.source || 'ai_generator',
              source_file: q.source_file || null,
              data: q.data || null,
              answerFormat: b.type === 'multiple_choice' ? 'text' : (q.answerFormat || b.defaultAnswerFormat || 'text'),
              answerSource: q.answerSource || (q.answer ? (q.source === 'file_import' ? 'file_import' : 'ai_generated') : null)
            })
          })
        })

        const finalDataFiles = []
        for (const fileItem of dataFiles) {
          if (fileItem.file && isOfficialSave) {
            setSaveStage(`Uploading Data File ${fileItem.name}...`)
            const hash = await calculateFileHash(fileItem.file)
            const ext = fileItem.name.split('.').pop()
            const fileName = `data_files/${lessonId}_${hash}.${ext}`

            const formData = new FormData()
            formData.append('bucket', 'teaching-materials')
            formData.append('path', fileName)
            formData.append('file', fileItem.file)
            formData.append('upsert', 'true')

            const uploadRes = await uploadFileToStorageAction(formData)
            if (!uploadRes.success) {
              throw new Error(`Data file ${fileItem.name} upload failed: ${uploadRes.error}`)
            }
            finalDataFiles.push({
              name: fileItem.name,
              size: fileItem.size,
              storage_path: fileName,
              downloadable: fileItem.downloadable,
              previewable: fileItem.previewable
            })
          } else if (!fileItem.file || fileItem.storage_path) {
            finalDataFiles.push({
              name: fileItem.name,
              size: fileItem.size,
              storage_path: fileItem.storage_path,
              downloadable: fileItem.downloadable,
              previewable: fileItem.previewable
            })
          }
        }

        const finalReferenceFiles = []
        for (const fileItem of referenceFiles) {
          if (fileItem.file && isOfficialSave) {
            setSaveStage(`Uploading Reference File ${fileItem.name}...`)
            const hash = await calculateFileHash(fileItem.file)
            const ext = fileItem.name.split('.').pop()
            const fileName = `reference_files/${lessonId}_${hash}.${ext}`

            const formData = new FormData()
            formData.append('bucket', 'teaching-materials')
            formData.append('path', fileName)
            formData.append('file', fileItem.file)
            formData.append('upsert', 'true')

            const uploadRes = await uploadFileToStorageAction(formData)
            if (!uploadRes.success) {
              throw new Error(`Reference file ${fileItem.name} upload failed: ${uploadRes.error}`)
            }
            finalReferenceFiles.push({
              name: fileItem.name,
              size: fileItem.size,
              storage_path: fileName,
              downloadable: fileItem.downloadable,
              previewable: fileItem.previewable
            })
          } else if (!fileItem.file || fileItem.storage_path) {
            finalReferenceFiles.push({
              name: fileItem.name,
              size: fileItem.size,
              storage_path: fileItem.storage_path,
              downloadable: fileItem.downloadable,
              previewable: fileItem.previewable
            })
          }
        }

        const instructionsPayload = {
          questions: approvedQuestions,
          data_files: finalDataFiles,
          reference_files: finalReferenceFiles
        }
        let currentInstructions = JSON.stringify(instructionsPayload)

        const hasPromptFile = !!promptFile || !!promptStoragePath
        const hasAiQuestions = approvedQuestions.length > 0

        if (isOfficialSave && !hasPromptFile && !hasAiQuestions && finalDataFiles.length === 0 && finalReferenceFiles.length === 0) {
          throw new Error('Please generate AI questions, parse a question sheet, or upload files.')
        }

        if (!assignmentForm.title) {
          throw new Error('Assignment title is required.')
        }

        if (
          assignmentForm.maxScore < 0 ||
          assignmentForm.maxFiles < 0 ||
          assignmentForm.maxTotalSizeMb < 0 ||
          assignmentForm.gracePeriodHours < 0 ||
          assignmentForm.penaltyPercentPerDay < 0
        ) {
          throw new Error('Assignment parameters cannot be negative.')
        }

        if (promptFile && isOfficialSave) {
          setSaveStage('Hashing Prompt...')
          const hash = await calculateFileHash(promptFile)
          const ext = promptFile.name.split('.').pop()
          const fileName = `prompts/${lessonId}_${hash}.${ext}`

          const formData = new FormData()
          formData.append('bucket', 'teaching-materials')
          formData.append('path', fileName)
          formData.append('file', promptFile)
          formData.append('upsert', 'true')

          setSaveStage('Uploading Prompt...')
          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Assignment prompt upload failed: ${uploadRes.error}`)
          }

          finalPromptPath = fileName
          isNewPromptUpload = true
        }

        if (solutionMode === 'upload' && solutionFile && isOfficialSave) {
          setSaveStage('Hashing Solution...')
          const hash = await calculateFileHash(solutionFile)
          const ext = solutionFile.name.split('.').pop()
          const fileName = `solutions/${lessonId}_${hash}.${ext}`

          const formData = new FormData()
          formData.append('bucket', 'assignment-solutions')
          formData.append('path', fileName)
          formData.append('file', solutionFile)
          formData.append('upsert', 'true')

          setSaveStage('Uploading Solution...')
          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Solution upload failed: ${uploadRes.error}`)
          }

          finalSolutionPath = fileName
          isNewSolutionUpload = true
        }

        setSaveStage('Saving Assignment...')

        const assignmentPayload: any = {
          id: assignmentId || undefined,
          lessonId,
          title: assignmentForm.title,
          instructions: currentInstructions,
          rubricId: null,
          maxScore: assignmentForm.maxScore,
          maxFiles: assignmentForm.maxFiles,
          maxTotalSizeMb: assignmentForm.maxTotalSizeMb,
          autoPublishGrades: assignmentForm.autoPublishGrades,
          gracePeriodHours: assignmentForm.gracePeriodHours,
          penaltyPercentPerDay: assignmentForm.penaltyPercentPerDay,
          solutionStoragePath: finalSolutionPath || null,
          promptFilePath: finalPromptPath || null,
          aiModelUsed: selectedModel,
          customCriteria: criteriaList.length > 0 ? criteriaList : null
        }

        if (solutionMode === 'ai' && solutionText && (isOfficialSave || mode === 'draft')) {
          setSaveStage('Saving AI Solution...')
          const file = new File([solutionText], `${lessonId}_ai_solution.md`, { type: 'text/markdown' })
          const hash = await calculateFileHash(file)
          const fileName = `solutions/${lessonId}_${hash}_ai_solution.md`

          const formData = new FormData()
          formData.append('bucket', 'assignment-solutions')
          formData.append('path', fileName)
          formData.append('file', file)
          formData.append('upsert', 'true')

          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Failed to save AI solution to storage: ${uploadRes.error}`)
          }
          assignmentPayload.solutionStoragePath = fileName
        }

        const res = await saveAssignmentAction(assignmentPayload)
        if (!res.success) {
          throw new Error(res.error)
        }
        const savedAssignment = Array.isArray(res.data) ? res.data[0] : res.data
        if (savedAssignment?.id) {
          savedAssignmentIdForReload = savedAssignment.id
          setAssignmentId(savedAssignment.id)
        }
      } else {
        if (assignmentId) {
          const delRes = await deleteAssignmentAction(assignmentId)
          if (!delRes.success) throw new Error(delRes.error)
        }
      }

      alert('Composer updated successfully! Lesson details, assignment rules, and rubric criteria saved.')
      setIsDirty(false)
      await fetchLessonDetails(hasAssignment ? savedAssignmentIdForReload : undefined)
      setIsDirty(false)
    } catch (err: any) {
      if (isNewSolutionUpload && finalSolutionPath) {
        try {
          await deleteFileFromStorageAction('assignment-solutions', [finalSolutionPath])
        } catch (cleanup) {
          console.error('Solution cleanup failed:', cleanup)
        }
      }
      if (isNewPromptUpload && finalPromptPath) {
        try {
          await deleteFileFromStorageAction('teaching-materials', [finalPromptPath])
        } catch (cleanup) {
          console.error('Assignment file cleanup failed:', cleanup)
        }
      }
      alert(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
      setSaveStatus({ active: false, startedAt: 0, elapsed: '' })
      setSaveStage('')
    }
  }

  return {
    lessonId,
    loading,
    saving,
    uploading,
    currentStep,
    setCurrentStep,
    isDirty,
    setIsDirty,
    initialLoaded,
    lesson,
    content,
    setContent,
    title,
    setTitle,
    materials,
    setMaterials,
    materialForm,
    setMaterialForm,
    uploadFile,
    setUploadFile,
    showMaterialForm,
    setShowMaterialForm,
    downloadAllowed,
    setDownloadAllowed,
    uploadStatus,
    saveStatus,
    showStudentPreview,
    setShowStudentPreview,
    showMaterialsPreview,
    setShowMaterialsPreview,
    showAssignmentPreview,
    setShowAssignmentPreview,
    previewSignedUrls,
    previewErrors,
    previewUrlStatus,
    markdownTemplates,
    setMarkdownTemplates,
    draggedIndex,
    dragOverIndex,
    gridLayout,
    setGridLayout,
    cellMaterials,
    setCellMaterials,
    hasAssignment,
    setHasAssignment,
    assignmentId,
    setAssignmentId,
    assignmentForm,
    setAssignmentForm,
    selectedModel,
    setSelectedModel,
    solutionMode,
    setSolutionMode,
    solutionText,
    setSolutionText,
    solutionFile,
    setSolutionFile,
    solutionStoragePath,
    promptFile,
    setPromptFile,
    promptStoragePath,
    generatingSolution,
    criteriaList,
    setCriteriaList,
    generatingRubric,
    verifyMaterial,
    setVerifyMaterial,
    verifyDisplayMode,
    setVerifyDisplayMode,
    savingVerify,
    setSavingVerify,
    sandboxCriterionIdx,
    setSandboxCriterionIdx,
    sandboxInput,
    setSandboxInput,
    dragActive,
    aiType,
    setAiType,
    aiCategory,
    setAiCategory,
    aiQuestionCount,
    setAiQuestionCount,
    aiSampleData,
    setAiSampleData,
    aiDefaultAnswerFormat,
    setAiDefaultAnswerFormat,
    aiDifficulty,
    setAiDifficulty,
    aiLanguage,
    setAiLanguage,
    activeReviewQsIdx,
    setActiveReviewQsIdx,
    suggestingAnsIdx,
    isSuggestingAll,
    isGeneratingRubric,
    batches,
    setBatches,
    dataFiles,
    setDataFiles,
    referenceFiles,
    setReferenceFiles,
    simulatedAnswers,
    setSimulatedAnswers,
    editingQuestion,
    setEditingQuestion,
    editingBatchIndex,
    setEditingBatchIndex,
    editingQuestionIndex,
    setEditingQuestionIndex,
    classifyModalOpen,
    setClassifyModalOpen,
    classifyFile,
    setClassifyFile,
    classifyType,
    setClassifyType,
    classifyDownloadable,
    setClassifyDownloadable,
    classifyPreviewable,
    setClassifyPreviewable,
    parseDefaultAnswerFormat,
    showEssayFormatModal,
    setShowEssayFormatModal,
    parsedQuestionsTemp,
    parsedFileNameTemp,
    isParsingFile,
    aiSelectedMaterials,
    setAiSelectedMaterials,
    isReadingMaterials,
    genStage,
    showAiModal,
    setShowAiModal,
    showBatchSummaryModal,
    setShowBatchSummaryModal,
    previewBatchIndex,
    setPreviewBatchIndex,
    modalStep,
    setModalStep,
    genElapsed,
    readingDuration,
    generatingDuration,
    sampleDataDuration,
    activeBatchIndex,
    setActiveBatchIndex,
    activeQuestionIndex,
    setActiveQuestionIndex,
    isGeneratingBatch,
    asgDragActive,
    saveStage,
    regeneratingIndex,
    handleDrag,
    handleDrop,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDropItem,
    handleDragStartCell,
    handleDropToColumn,
    handleRemoveFromColumn,
    handleLayoutChange,
    handleOpenMaterialsPreview,
    handleFileSelection,
    handleFileInputChange,
    handleNextStep,
    handlePrevStep,
    handleSaveLessonOnly,
    handleCreateMaterial,
    handleDeleteMaterial,
    handleGenerateAISolution,
    handleGenerateAIRubric,
    getSandboxResult,
    handleStartGenerating,
    handleReviewAction,
    handleDeleteQuestion,
    handleEditSave,
    handleRegenerateQuestion,
    handleRegenAllRejected,
    handleApproveAll,
    handleEditBatch,
    handleDeleteBatch,
    handleQuestionFormatOverride,
    handleInlineApprove,
    handleInlineReject,
    handleSaveQuestionsToAssignment,
    handleSuggestAnswer,
    handleSuggestAllMissingAnswers,
    handleGenerateRubric,
    handleConfirmClassification,
    handleApplyEssayFormat,
    handleAsgDrag,
    handleAsgDrop,
    handleSaveComposer,
    fetchLessonDetails
  }
}
