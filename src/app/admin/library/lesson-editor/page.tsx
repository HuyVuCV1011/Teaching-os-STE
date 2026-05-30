'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RichTextEditor from '@/components/RichTextEditor'
import DocumentViewer from '@/components/DocumentViewer'
import { calculateFileHash } from '@/lib/hash'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'
import {
  checkMaterialDeduplication,
  registerCanonicalMaterial,
  uploadFileToStorageAction,
  deleteFileFromStorageAction,
  updateMaterialDisplayModeAction,
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
  suggestQuestionAnswerAction
} from '@/app/admin/library/actions/assignments'
import {
  ArrowLeft,
  Save,
  Plus,
  FileText,
  Link as LinkIcon,
  Code as CodeIcon,
  Network,
  Loader2,
  Trash2,
  FileDown,
  ClipboardList,
  Edit,
  Brain,
  Sparkles,
  CheckCircle,
  XCircle,
  FileCode,
  Upload,
  FileCheck,
  Check,
  BookOpen,
  GripVertical,
  Eye,
  Globe,
  X,
  RefreshCw,
  Lightbulb,
  Heart,
  Terminal,
  Minus,
  Paperclip
} from 'lucide-react'


function htmlToMarkdown(html: string): string {
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

function cleanOptionText(opt: string, index: number): string {
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

const GRID_LAYOUTS = [
  { id: '1-col', name: '1 Column', cols: 'grid-cols-1', cells: 1, icon: (
    <div className="grid grid-cols-1 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: '2-cols', name: '2 Columns', cols: 'grid-cols-2', cells: 2, icon: (
    <div className="grid grid-cols-2 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: '3-cols', name: '3 Columns', cols: 'grid-cols-3', cells: 3, icon: (
    <div className="grid grid-cols-3 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: 'asymmetric-2-1', name: 'Main + Sidebar (2:1)', cols: 'grid-cols-3', cells: 2, icon: (
    <div className="grid grid-cols-3 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm col-span-2"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: 'asymmetric-1-2', name: 'Sidebar + Main (1:2)', cols: 'grid-cols-3', cells: 2, icon: (
    <div className="grid grid-cols-3 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm col-span-2"></div>
    </div>
  )},
  { id: 'asymmetric-2-1-1', name: 'Main + 2 Stacked', cols: 'grid-cols-4', cells: 3, icon: (
    <div className="grid grid-cols-4 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm col-span-2"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )}
]

const getGridColsClass = (layout: string) => {
  switch (layout) {
    case '1-col': return 'grid-cols-1'
    case '2-cols': return 'grid-cols-1 sm:grid-cols-2'
    case '3-cols': return 'grid-cols-1 md:grid-cols-3'
    case 'asymmetric-2-1': return 'grid-cols-1 md:grid-cols-3'
    case 'asymmetric-1-2': return 'grid-cols-1 md:grid-cols-3'
    case 'asymmetric-2-1-1': return 'grid-cols-1 md:grid-cols-4'
    default: return 'grid-cols-1'
  }
}

const getCellSpanClass = (layout: string, colIdx: number) => {
  if (layout === 'asymmetric-2-1') {
    return colIdx === 0 ? 'md:col-span-2' : 'md:col-span-1'
  }
  if (layout === 'asymmetric-1-2') {
    return colIdx === 0 ? 'md:col-span-1' : 'md:col-span-2'
  }
  if (layout === 'asymmetric-2-1-1') {
    return colIdx === 0 ? 'md:col-span-2' : 'md:col-span-1'
  }
  return ''
}

const getLayoutCellCount = (layout: string) => {
  const lay = GRID_LAYOUTS.find(l => l.id === layout)
  return lay ? lay.cells : 1
}

function renderSimpleMarkdown(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^# (.*?)$/gm, '<h1 class="text-lg font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-200/30">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-slate-100 mt-3 mb-2 pb-0.5 border-b border-slate-200/20">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-slate-100 mt-2 mb-1">$1</h3>')
    // Bold & Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-slate-900/10 px-1 py-0.5 rounded text-rose-600 font-mono text-[11px]">$1</code>')
    // Blockquotes (the starting > is now escaped to &gt;)
    .replace(/^&gt;\s*(.*?)$/gm, '<blockquote class="border-l-4 border-indigo-400 bg-indigo-50/50 pl-3 py-1.5 my-2 rounded-r text-slate-600 italic">$1</blockquote>')
    // Links [Text](URL)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 underline transition-colors">$1</a>')
    // Bullet lists - or *
    .replace(/^[-*]\s+(.*?)$/gm, '<div class="flex items-start gap-1.5 my-1 text-slate-200"><span class="text-blue-500 font-bold shrink-0">•</span><span class="flex-1">$1</span></div>')
    // Line breaks
    .replace(/\n/g, '<br />')
  return html
}

function LessonEditorInner() {
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

  // Lesson & syllabus hierarchy data
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

  // Student view preview
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

  // HTML5 Drag and drop reordering states
  const [markdownTemplates, setMarkdownTemplates] = useState<Record<string, 'default' | 'dark' | 'accent'>>({})
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [gridLayout, setGridLayout] = useState<string>('1-col')
  const [cellMaterials, setCellMaterials] = useState<Record<number, any>>({})

  // Unified Assignment states
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

  // Rubric state
  const [criteriaList, setCriteriaList] = useState<any[]>([])
  const [generatingRubric, setGeneratingRubric] = useState(false)

  // Verification modal states
  const [verifyMaterial, setVerifyMaterial] = useState<any | null>(null)
  const [verifyDisplayMode, setVerifyDisplayMode] = useState<'both' | 'web' | 'original'>('both')
  const [savingVerify, setSavingVerify] = useState(false)

  // Sandbox state
  const [sandboxCriterionIdx, setSandboxCriterionIdx] = useState<number>(0)
  const [sandboxInput, setSandboxInput] = useState('')

  // Drag and drop state/handlers for materials
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
  const [suggestingAnsIdx, setSuggestingAnsIdx] = useState<number | null>(null) // showing loader for suggest action
  const [isSuggestingAll, setIsSuggestingAll] = useState<boolean>(false) // loader for suggest all
  const [isGeneratingRubric, setIsGeneratingRubric] = useState<boolean>(false) // loader for rubric generation
  
  interface QuestionItem {
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

  interface BatchItem {
    id: number
    type: 'multiple_choice' | 'essay'
    category: 'theory' | 'code'
    defaultAnswerFormat: 'text' | 'file' | 'both'
    questions: QuestionItem[]
  }

  interface AssignmentFileItem {
    name: string
    size: number
    storage_path?: string
    file?: File | null
    downloadable: boolean
    previewable: boolean
  }

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
      fetchLessonDetails()
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Grid layout builder drag & drop handlers
  // Grid layout builder drag & drop handlers
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

      // 1. Remove from source position if applicable
      if (sourceCol !== undefined && sourceCol !== -1) {
        const sourceList = [...(updatedMapping[sourceCol] || [])]
        if (sourceIdx !== undefined && sourceIdx !== -1) {
          sourceList.splice(sourceIdx, 1)
          updatedMapping[sourceCol] = sourceList
        }
      }

      // 2. Filter out to avoid duplicates
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

      // Auto save to database
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

      // Auto save to database
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

    // Auto save to database
    const res = await updateLessonLayoutAction(lessonId, newLayout, updatedMapping)
    if (!res.success) {
      alert(`Failed to save column layout: ${res.error}`)
    }
  }

  const renderMaterialPreviewCard = (m: any) => {
    const styles = getMaterialTypeStyles(m.type)
    const Icon = getMaterialIcon(m.type)
    
    return (
      <div key={m.id} className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
          {m.type.toUpperCase()} Document
        </h2>

        {/* PDF Preview */}
        {m.type === 'pdf' && (
          <div className="h-[450px] overflow-y-auto flex flex-col space-y-3">
            {previewUrlStatus.loading ? (
              <div className="flex-1 border border-slate-800 bg-slate-950/10 rounded-2xl text-center text-slate-400 text-xs flex items-center justify-center gap-2 min-h-[400px]">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Generating secure PDF URL... ({previewUrlStatus.elapsed})</span>
              </div>
            ) : previewSignedUrls[m.id] ? (
              <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-sm flex-1 min-h-[400px]">
                <DocumentViewer url={previewSignedUrls[m.id]} title={m.title} />
              </div>
            ) : (
              <div className="flex-1 border border-slate-800 bg-slate-950/10 rounded-2xl text-center text-slate-400 text-xs flex flex-col items-center justify-center p-6 gap-2 min-h-[400px]">
                <span className="font-semibold text-slate-200">Failed to load PDF secure preview URL.</span>
                {previewErrors[m.id] && (
                  <span className="text-[10px] text-rose-500 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded max-w-xs break-words">
                    {previewErrors[m.id]}
                  </span>
                )}
                <span className="text-slate-450 text-[10px] mt-1">Close and re-open preview to retry.</span>
              </div>
            )}
          </div>
        )}

        {/* DOCX Preview */}
        {m.type === 'docx' && (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={previewSignedUrls[m.id] || '#'}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-[10px] border border-blue-100 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>
            <div 
              className="prose max-w-none text-slate-200 leading-relaxed text-xs flex-1 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: m.metadata?.viewer_artifact?.viewer_html || '<p class="text-slate-450 italic">No HTML preview available.</p>' }}
            />
          </div>
        )}

        {/* CSV / XLSX tabular preview */}
        {['csv', 'xlsx'].includes(m.type) && (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={previewSignedUrls[m.id] || '#'}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-600 font-semibold text-[10px] border border-emerald-100 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>
            {m.metadata?.viewer_artifact?.rows && m.metadata?.viewer_artifact?.rows.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl flex-1 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-900 sticky top-0 z-10">
                    <tr>
                      {(m.metadata.viewer_artifact.headers || []).map((hdr: string, i: number) => (
                        <th key={i} className="px-3 py-2 text-left font-bold text-slate-100 border-r border-slate-200 last:border-0 whitespace-nowrap bg-slate-900">
                          {hdr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {(m.metadata.viewer_artifact.rows || []).slice(0, 5).map((row: any[], i: number) => (
                      <tr key={i} className="hover:bg-slate-850 transition-colors">
                        {row.map((cell: any, j: number) => (
                          <td key={j} className="px-3 py-2 text-slate-200 border-r border-slate-200 last:border-0 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No table data available.</p>
            )}
            {m.metadata?.viewer_artifact?.row_count > 5 && (
              <span className="block text-[10px] text-slate-400 italic shrink-0">
                Showing first 5 of {m.metadata.viewer_artifact.row_count} rows.
              </span>
            )}
          </div>
        )}

        {/* Markdown Preview */}
        {m.type === 'markdown' && (() => {
          const template = markdownTemplates[m.id] || 'default'
          
          let cardClasses = "border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
          let titleColor = "text-slate-100"
          let textColor = "text-slate-200"
          
          if (template === 'dark') {
            cardClasses = "border border-slate-950 bg-slate-100 rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
            titleColor = "text-slate-900 font-bold"
            textColor = "text-slate-900"
          } else if (template === 'accent') {
            cardClasses = "border border-indigo-200 bg-indigo-50/40 rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
            titleColor = "text-indigo-900 font-bold"
            textColor = "text-indigo-950"
          } else {
            cardClasses = "border border-slate-800 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
          }
          
          return (
            <div className={cardClasses}>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                  <h3 className={`font-bold text-sm ${titleColor}`}>
                    {m.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={template}
                    onChange={(e) => setMarkdownTemplates(prev => ({
                      ...prev,
                      [m.id]: e.target.value as 'default' | 'dark' | 'accent'
                    }))}
                    className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="accent">Accent</option>
                  </select>

                  {downloadAllowed && (
                    <a
                      href={`data:text/markdown;charset=utf-8,${encodeURIComponent(m.metadata?.viewer_artifact?.viewer_markdown || '')}`}
                      download={`${m.title}.md`}
                      className="px-2.5 py-1 rounded bg-violet-50 text-violet-600 font-semibold text-[10px] border border-violet-100 hover:bg-violet-100 transition-colors whitespace-nowrap shrink-0"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
              <div 
                className={`prose max-w-none text-xs flex-1 overflow-y-auto ${textColor}`}
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(m.metadata?.viewer_artifact?.viewer_markdown || '') }}
              />
            </div>
          )
        })()}

        {/* JSON Preview */}
        {m.type === 'json' && (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2))}`}
                  download={`${m.title}.json`}
                  className="px-2.5 py-1 rounded bg-amber-50 text-amber-600 font-semibold text-[10px] border border-amber-100 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>
            <pre className="overflow-x-auto p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-350 font-mono text-xs whitespace-pre-wrap flex-1 overflow-y-auto">
              {JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  const handleOpenMaterialsPreview = async () => {
    setPreviewUrlStatus({ loading: true, startedAt: Date.now(), elapsed: '0.0s' })
    setShowMaterialsPreview(true)
    const urls: Record<string, string> = {}
    const errors: Record<string, string> = {}
    
    // Clear old state
    setPreviewSignedUrls({})
    setPreviewErrors({})

    // Gather all materials from both materials array and cellMaterials layout
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

    console.log('[handleOpenStudentPreview] Total materials gathered for signed URL check:', allMaterials.length)

    try {
      for (const m of allMaterials) {
        if (['pdf', 'docx', 'csv', 'xlsx'].includes(m.type)) {
          console.log(`[handleOpenStudentPreview] Processing material: ID=${m.id}, Title="${m.title}", Type=${m.type}, storage_url="${m.storage_url}"`)
          
          if (!m.storage_url) {
            const errMsg = 'Material missing storage URL path'
            console.error(`[handleOpenStudentPreview] Error: ${errMsg}`)
            errors[m.id] = errMsg
            continue
          }

          const result = await getSignedUrlAction('teaching-materials', m.storage_url, 300)
          
          console.log(`[handleOpenStudentPreview] getSignedUrlAction result for ${m.id}: success=${result.success}, signedUrl=${result.signedUrl ? 'FOUND' : 'MISSING'}, error=${result.error || 'none'}`)

          if (result.success && result.signedUrl) {
            urls[m.id] = result.signedUrl
          } else {
            const errorMsg = result.error || 'No signed URL returned from storage'
            errors[m.id] = errorMsg
          }
        }
      }

      // Check if any PDF has a null/missing signed URL and mark an error
      for (const m of allMaterials) {
        if (m.type === 'pdf' && !urls[m.id]) {
          if (!errors[m.id]) {
            errors[m.id] = 'Signed URL is empty or failed to generate'
          }
          console.error(`[handleOpenStudentPreview] PDF material ${m.id} ("${m.title}") failed secure URL generation: ${errors[m.id]}`)
        }
      }

      setPreviewSignedUrls(urls)
      setPreviewErrors(errors)
    } catch (err: any) {
      console.error('[handleOpenStudentPreview] Unexpected error pre-fetching signed URLs:', err)
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

  async function fetchLessonDetails() {
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
          .order('display_order'),
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
        const activeAs = assignmentsData[0]
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
        setSolutionStoragePath(activeAs.solution_storage_path || '')
        setPromptStoragePath(activeAs.prompt_file_path || '')
        setSelectedModel(activeAs.ai_model_used || 'gemini-2.5-flash')

        // Load assignment questions into batches
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
                    defaultAnswerFormat: 'text',
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
                  data: q.data || undefined,
                  source: 'ai_generator' as const,
                  source_file: null
                }))
                const hasOptions = questions.some(q => q.options && q.options.length > 0)
                setBatches([{
                  id: Date.now(),
                  type: hasOptions ? 'multiple_choice' : 'essay',
                  category: 'theory',
                  defaultAnswerFormat: 'text',
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

        // Load rubric criteria from active snapshot
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
        handleSaveComposer()
      }
    } else if (currentStep === 3) {
      setCurrentStep(4)
    } else if (currentStep === 4) {
      handleSaveComposer()
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
      fetchLessonDetails()
    } catch (err: any) {
      alert(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
      setSaveStatus({ active: false, startedAt: 0, elapsed: '' })
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
        // Option B: manual text content
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
        // Option A: Upload local file or external link
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
          // URL link / git repo
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

      // If we are uploading a file (Option A File OR Option B Manual Text)
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

      // Force original display mode for pdf
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

  // AI actions
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

  // Sandbox testing logic
  const getSandboxResult = () => {
    const crit = criteriaList[sandboxCriterionIdx]
    if (!crit || !sandboxInput.strip) return null
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

  // AI Redesign assignment helper functions
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
      // Stage 1: Read selected materials
      if (aiSelectedMaterials.length > 0) {
        // Retrieve storage paths for the selected material IDs
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

      // Prepend difficulty and language instructions to the combinedContent payload
      const difficultyText = aiDifficulty === 'easy' ? 'Easy (conceptual, basic definitions)' : aiDifficulty === 'hard' ? 'Hard (advanced code architecture, deep analysis)' : 'Medium (balanced application & details)'
      const languageText = aiLanguage === 'english' ? 'English ONLY' : aiLanguage === 'vietnamese' ? 'Vietnamese ONLY' : 'Bilingual (Vietnamese & English)'

      combinedContent = `AI INSTRUCTION CRITICAL:\n- Generate all questions and answers in ${languageText} language.\n- Set the overall difficulty level of questions to ${difficultyText}.\n\nSOURCE LESSON CONTENT/MATERIALS:\n${combinedContent}`
      
      // Stage 2: Generate questions
      setGenStage('generating')
      const generatingStartTime = Date.now()
      
      const res = await clientGenerateQuestions({
        modelChoice: selectedModel,
        assignmentType: aiType,
        category: aiCategory,
        questionCount: aiQuestionCount,
        generateSampleData: aiSampleData,
        lessonContent: combinedContent
      })
      
      const generatingEndTime = Date.now()
      setGeneratingDuration(generatingEndTime - generatingStartTime)
      
      if (res.success && res.questions) {
        // Stage 3: Creating sample data
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
        setBatches(prev => {
          const nextBatches = [...prev, newBatch]
          setActiveBatchIndex(nextBatches.length - 1)
          setActiveQuestionIndex(0)
          return nextBatches
        })
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

    // Auto-advance to the next pending question across all batches
    let found = false
    // 1. Search same batch first
    for (let qIdx = activeQuestionIndex + 1; qIdx < batch.questions.length; qIdx++) {
      if (batch.questions[qIdx].status === 'pending') {
        setActiveQuestionIndex(qIdx)
        found = true
        break
      }
    }
    // 2. Search subsequent batches
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
    // 3. Search from start of all batches if not found
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
      
      // Keep selection bounds valid
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
        data: q.data || undefined
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

      // Set content to "Regenerating..." first for visual feedback
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
              data: replacement.data || undefined
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
    
    setBatches(prev => {
      const next = prev.filter((_, idx) => idx !== batchIdx)
      if (next.length === 0) {
        setActiveBatchIndex(0)
        setActiveQuestionIndex(0)
      } else if (activeBatchIndex >= next.length) {
        setActiveBatchIndex(next.length - 1)
      }
      return next
    })
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
            answerFormat: b.type === 'multiple_choice' ? 'text' : (q.answerFormat || b.defaultAnswerFormat || 'text')
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

      for (let i = 0; i < missingQs.length; i++) {
        const q = missingQs[i]
        const res = await suggestQuestionAnswerAction({
          questionContent: q.content,
          materialsText: materialsText || undefined,
          lessonContext: content || title || undefined,
          modelChoice: selectedModel
        })

        if (res.success && res.answer) {
          updateQuestionInBatches(q.id, {
            answer: res.answer,
            answerSource: 'ai_generated'
          })
        }
      }
      alert(`Successfully generated answers for ${missingQs.length} question(s)!`)
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
          const newQuestions = res.questions.map((q: any) => ({
            id: q.id || Math.random(),
            content: q.content || '',
            options: q.options && Array.isArray(q.options)
              ? q.options.map((opt: string, oIdx: number) => cleanOptionText(opt, oIdx))
              : undefined,
            answer: q.answer || undefined,
            status: 'pending' as const,
            data: q.data || undefined,
            source: 'file_import' as const,
            source_file: classifyFile.name
          }))

          const newBatch: BatchItem = {
            id: Date.now(),
            type: newQuestions.some(q => q.options && q.options.length > 0) ? 'multiple_choice' : 'essay',
            category: 'theory',
            questions: newQuestions
          }

          setBatches(prev => {
            const nextBatches = [...prev, newBatch]
            setActiveBatchIndex(nextBatches.length - 1)
            setActiveQuestionIndex(0)
            return nextBatches
          })

          setClassifyModalOpen(false)
          setClassifyFile(null)
          
          // Open AI Modal to Step 3 (Review)
          setModalStep(3)
          setShowAiModal(true)
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

  // Save the entire combined workflow
  const handleSaveComposer = async () => {
    if (!title || !lessonId) return
    setSaving(true)
    setSaveStatus({ active: true, startedAt: Date.now(), elapsed: '0.0s' })

    let isNewSolutionUpload = false
    let finalSolutionPath = solutionStoragePath
    let isNewPromptUpload = false
    let finalPromptPath = promptStoragePath

    try {
      // 1. Save Lesson Outline
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
        // Collect approved questions
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
                answerSource: q.answerSource || (q.source === 'file_import' ? 'file_import' : 'ai_generated')
              })
            }
          })
        })

        // Upload any local dataFiles
        const finalDataFiles = []
        for (const fileItem of dataFiles) {
          if (fileItem.file) {
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
          } else {
            finalDataFiles.push({
              name: fileItem.name,
              size: fileItem.size,
              storage_path: fileItem.storage_path,
              downloadable: fileItem.downloadable,
              previewable: fileItem.previewable
            })
          }
        }

        // Upload any local referenceFiles
        const finalReferenceFiles = []
        for (const fileItem of referenceFiles) {
          if (fileItem.file) {
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
          } else {
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

        if (!hasPromptFile && !hasAiQuestions && finalDataFiles.length === 0 && finalReferenceFiles.length === 0) {
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
          throw new Error('Assignment parameters (Max Score, Max Files, Max Size, Grace Hours, Late Penalty) cannot be negative.')
        }

        // 2a. Upload Assignment Prompt File if selected
        if (promptFile) {
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

        // 2b. Upload Solution File if manual mode
        if (solutionMode === 'upload' && solutionFile) {
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

        // 3. Save Assignment + Rubric Snapshots
        const assignmentPayload: any = {
          id: assignmentId || undefined,
          lessonId,
          title: assignmentForm.title,
          instructions: currentInstructions,
          rubricId: null, // Custom dynamic rubric is generated in action
          maxScore: assignmentForm.maxScore,
          maxFiles: assignmentForm.maxFiles,
          maxTotalSizeMb: assignmentForm.maxTotalSizeMb,
          autoPublishGrades: assignmentForm.autoPublishGrades,
          gracePeriodHours: assignmentForm.gracePeriodHours,
          penaltyPercentPerDay: assignmentForm.penaltyPercentPerDay,
          solutionStoragePath: finalSolutionPath || (solutionText ? `draft_ai_${lessonId}.md` : null),
          promptFilePath: finalPromptPath || null,
          aiModelUsed: selectedModel,
          customCriteria: criteriaList.length > 0 ? criteriaList : null
        }

        // If we generated solution via text, let's write it to storage as well
        if (solutionMode === 'ai' && solutionText) {
          setSaveStage('Saving AI Solution...')
          const file = new File([solutionText], `${lessonId}_ai_draft.md`, { type: 'text/markdown' })
          const fileName = `solutions/${lessonId}_ai_draft.md`

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
      } else {
        // Delete assignment if it was untoggled
        if (assignmentId) {
          const delRes = await deleteAssignmentAction(assignmentId)
          if (!delRes.success) throw new Error(delRes.error)
        }
      }

      alert('Composer updated successfully! Lesson details, assignment rules, and rubric criteria saved.')
      setIsDirty(false)
      fetchLessonDetails()
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


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 text-slate-400 text-xs gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Loading Session Composer Workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/library?tab=courses')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Session Composer Workspace
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure curriculum outlines, materials, assessments, solutions, and rubric rules inside a single page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              AI Engine
            </span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none hover:border-slate-700 transition-colors"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Google)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Google)</option>
              <option value="groq/llama-3.3-70b-specdec">Llama 3.3 70B (Groq)</option>
              <option value="openrouter/google/gemini-2.5-flash:free">OpenRouter Gemini 2.5 Flash Free</option>
              <option value="deepseek/deepseek-r1:free">DeepSeek R1 (OpenRouter Free)</option>
              <option value="ollama">Ollama (Local Llama)</option>
            </select>
          </div>


        </div>
      </div>

      {/* Visual Stepper Progress Bar */}
      <div className="flex border-b border-slate-700 pb-4 gap-6 text-xs justify-between items-center bg-slate-900/50 p-4 rounded-xl">
        <div className="flex gap-6 items-center">
          {[
            { id: 1, label: '1. Content & Handouts' },
            { id: 2, label: '2. Assignment Details' },
            { id: 3, label: '3. Solution Key', disabled: !hasAssignment },
            { id: 4, label: '4. Rubric Matrix', disabled: !hasAssignment }
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={s.disabled}
              onClick={() => setCurrentStep(s.id)}
              className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                s.disabled ? 'opacity-30 cursor-not-allowed border-transparent' : ''
              } ${
                currentStep === s.id
                  ? 'border-blue-500 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-450 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-400">
          Step {currentStep} of {hasAssignment ? 4 : 2}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Workspace Panels */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB 1: LESSON MATERIALS & HANDOUTS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Card A: Upload & Manage Materials */}
              <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between border-b border-slate-800 pb-6">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Lesson Heading / Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="shrink-0 flex flex-col gap-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Allow Student Downloads
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setDownloadAllowed(true)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          downloadAllowed
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDownloadAllowed(false)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          !downloadAllowed
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">
                      Material Source:
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaterialForm({ ...materialForm, creationMethod: 'upload' })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        materialForm.creationMethod === 'upload'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-955/20 border-slate-800 text-slate-450 hover:text-slate-300'
                      }`}
                    >
                      Upload File / Add Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialForm({ ...materialForm, creationMethod: 'write' })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        materialForm.creationMethod === 'write'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-955/20 border-slate-800 text-slate-450 hover:text-slate-300'
                      }`}
                    >
                      Write Manually (Rich Text)
                    </button>
                  </div>
                  
                  {materialForm.creationMethod === 'upload' ? (
                    <div className="space-y-4">
                      {/* Upload Option selection: File vs Link */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer">
                          <input
                            type="radio"
                            name="uploadOption"
                            checked={materialForm.uploadOption === 'file'}
                            onChange={() => setMaterialForm({ ...materialForm, uploadOption: 'file' })}
                            className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                          />
                          <span>Upload Local File</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer ml-4">
                          <input
                            type="radio"
                            name="uploadOption"
                            checked={materialForm.uploadOption === 'link'}
                            onChange={() => setMaterialForm({ ...materialForm, uploadOption: 'link' })}
                            className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                          />
                          <span>Add External Link / Git Repo</span>
                        </label>
                      </div>

                      {materialForm.uploadOption === 'file' ? (
                        <div className="space-y-4">
                          {/* File format selector */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Material Heading / Title
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Lab Guide"
                              value={materialForm.title}
                              onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          {/* Optional Note */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Extra Notes (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Required reading before lecture"
                              value={materialForm.note}
                              onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          {/* Drag & Drop Zone */}
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all min-h-[170px] ${
                              dragActive
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-slate-700 bg-slate-955/20 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="file"
                              id="drag-file-upload"
                              multiple={false}
                              onChange={handleFileInputChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-slate-500 mb-2" />
                            <p className="text-xs font-semibold text-slate-100">
                              Drag and drop your file here, or click to browse
                            </p>
                            {uploadFile && (
                              <span className="block text-[10px] text-emerald-600 font-semibold mt-2">
                                Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-slate-500 text-center -mt-2">
                            Supported formats: PDF, DOCX, CSV, XLSX, MD, JSON, TXT, ZIP, JS, TS, PY
                          </p>
                          
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={handleCreateMaterial}
                              disabled={uploading}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5"
                            >
                              {uploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>
                                    {uploadStatus.step === 'hashing' && `Hashing... (${uploadStatus.elapsed})`}
                                    {uploadStatus.step === 'uploading' && `Uploading... (${uploadStatus.elapsed})`}
                                    {uploadStatus.step === 'parsing' && `Parsing... (${uploadStatus.elapsed})`}
                                    {uploadStatus.step === 'saving' && `Saving... (${uploadStatus.elapsed})`}
                                  </span>
                                </>
                              ) : (
                                <span>Map Material File</span>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Link URL Options */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Link Title / Heading
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Project Repository"
                              value={materialForm.title}
                              onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              URL Address / Git Link
                            </label>
                            <input
                              type="url"
                              required
                              placeholder="https://github.com/..."
                              value={materialForm.linkUrl}
                              onChange={(e) => setMaterialForm({ ...materialForm, linkUrl: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          {/* Optional Note */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Extra Notes (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Link to codebase"
                              value={materialForm.note}
                              onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={handleCreateMaterial}
                              disabled={uploading}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5"
                            >
                              {uploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>
                                    {uploadStatus.step === 'hashing' && `Hashing... (${uploadStatus.elapsed})`}
                                    {uploadStatus.step === 'uploading' && `Uploading... (${uploadStatus.elapsed})`}
                                    {uploadStatus.step === 'parsing' && `Parsing... (${uploadStatus.elapsed})`}
                                    {uploadStatus.step === 'saving' && `Saving... (${uploadStatus.elapsed})`}
                                  </span>
                                </>
                              ) : (
                                <span>Map Resource URL</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Option B: Manual text composer */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Material Title / Heading
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lesson Lecture Note"
                          value={materialForm.title}
                          onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                        />
                      </div>

                      {/* Optional Note */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Extra Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lecture overview notes"
                          value={materialForm.note}
                          onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Write Handout Body (Rich Text Editor)
                        </label>
                        <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950/20">
                          <RichTextEditor content={materialForm.manualContent} onChange={(c) => setMaterialForm({ ...materialForm, manualContent: c })} />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleCreateMaterial}
                          disabled={uploading}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>
                                {uploadStatus.step === 'hashing' && `Hashing... (${uploadStatus.elapsed})`}
                                {uploadStatus.step === 'uploading' && `Uploading... (${uploadStatus.elapsed})`}
                                {uploadStatus.step === 'parsing' && `Parsing... (${uploadStatus.elapsed})`}
                                {uploadStatus.step === 'saving' && `Saving... (${uploadStatus.elapsed})`}
                              </span>
                            </>
                          ) : (
                            <span>Compose & Map Material</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card C: Currently Mapped Resources */}
              <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                      Currently Mapped Resources
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Drag and drop to reorder materials. These will render in this order for students.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenMaterialsPreview}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Student View</span>
                  </button>
                </div>
                
                {materials.length === 0 ? (
                  <div className="text-center py-10 border border-slate-750 border-dashed rounded-xl bg-slate-950/10 text-slate-400 text-xs">
                    No mapped resources. Add files or links above to populate the roadmap materials.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Grid Layout Template Selector */}
                    <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-xl space-y-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Grid Layout Builder Template
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {GRID_LAYOUTS.map((lay) => (
                          <button
                            key={lay.id}
                            type="button"
                            onClick={() => handleLayoutChange(lay.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-semibold ${
                              gridLayout === lay.id
                                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            {lay.icon}
                            <span>{lay.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2-Column builder workspace inside Card C */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                      {/* Column 1: Draggable Materials List */}
                      <div className="lg:col-span-1 space-y-2 border-r border-slate-800 pr-6">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Available handouts
                        </h4>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {materials.map((m) => {
                            const styles = getMaterialTypeStyles(m.type)
                            const Icon = getMaterialIcon(m.type)
                            const isPlaced = Object.values(cellMaterials).some(
                              colList => Array.isArray(colList) && colList.some((item: any) => item?.id === m.id)
                            )
                            return (
                              <div
                                key={m.id}
                                draggable
                                onDragStart={(e) => handleDragStartCell(e, m.id, -1, -1)}
                                className={`flex justify-between items-center p-2.5 rounded-xl border transition-all text-xs cursor-grab active:cursor-grabbing ${
                                  isPlaced
                                    ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80'
                                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <Icon className={`w-3.5 h-3.5 ${styles.iconColor} shrink-0`} />
                                  <span className="text-slate-200 truncate font-semibold">{m.title}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => setVerifyMaterial(m)}
                                    className="text-slate-400 hover:text-blue-400 p-1 transition-colors"
                                    title="Verify Handout"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMaterial(m.id)}
                                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {isPlaced && (
                                    <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                                      Placed
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Column 2 & 3: Columns Drop Arena */}
                      <div className="lg:col-span-2 space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Columns Builder Arena
                        </h4>
                        <div className={`grid gap-4 ${getGridColsClass(gridLayout)}`}>
                          {Array.from({ length: getLayoutCellCount(gridLayout) }).map((_, colIdx) => {
                            const colMaterialsList = Array.isArray(cellMaterials[colIdx]) ? cellMaterials[colIdx] : []
                            
                            return (
                              <div
                                key={colIdx}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDropToColumn(e, colIdx)}
                                className={`border border-dashed border-slate-800 bg-slate-950/10 rounded-2xl p-4 flex flex-col gap-3 min-h-[300px] transition-all relative ${getCellSpanClass(gridLayout, colIdx)}`}
                              >
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded w-fit">
                                  Column {colIdx + 1}
                                </span>

                                <div className="flex-1 flex flex-col gap-2">
                                  {colMaterialsList.length > 0 ? (
                                    colMaterialsList.map((material: any, itemIdx: number) => {
                                      const styles = getMaterialTypeStyles(material.type)
                                      const Icon = getMaterialIcon(material.type)
                                      
                                      return (
                                        <div
                                          key={material.id}
                                          draggable
                                          onDragStart={(e) => handleDragStartCell(e, material.id, colIdx, itemIdx)}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={(e) => {
                                            e.stopPropagation()
                                            handleDropToColumn(e, colIdx, itemIdx)
                                          }}
                                          className="w-full flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                            <Icon className={`w-3.5 h-3.5 ${styles.iconColor} shrink-0`} />
                                            <span className="text-xs font-semibold text-slate-200 truncate">{material.title}</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFromColumn(colIdx, itemIdx)}
                                            className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors shrink-0"
                                            title="Remove from column"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )
                                    })
                                  ) : (
                                    <div className="flex-1 flex flex-col justify-center items-center text-center py-10">
                                      <Upload className="w-4 h-4 text-slate-400 mb-1.5 animate-pulse" />
                                      <span className="block text-[10px] text-slate-500">Drop handouts here</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* TAB 2: ASSIGNMENT DETAILS */}
          {currentStep === 2 && (
            <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Assignment Parameters
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-350 mr-2">
                    Enable assignment for this lesson
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="asg_has_assignment_yes"
                      onClick={() => {
                        setHasAssignment(true)
                        if (!assignmentForm.title) {
                          setAssignmentForm(prev => ({ ...prev, title: title + ' Assignment' }))
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        hasAssignment
                          ? 'bg-blue-600 border-blue-500 text-white font-extrabold shadow-md'
                          : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-350'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      id="asg_has_assignment_no"
                      onClick={() => {
                        if (assignmentId) {
                          const confirmed = window.confirm(
                            'Disabling the assignment will delete it, along with its custom rubrics and solution keys, from the database upon saving. Are you sure you want to disable it?'
                          )
                          if (!confirmed) return
                        }
                        setHasAssignment(false)
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        !hasAssignment
                          ? 'bg-blue-600 border-blue-500 text-white font-extrabold shadow-md'
                          : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-355'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              {hasAssignment ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Side-by-Side Split Action Blocks Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Left Column: AI Generator Launcher */}
                    <div className="bg-slate-955/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-505 animate-pulse" />
                          ✨ AI Generator
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Let our advanced AI engine automatically generate structured, curriculum-aligned homework questions based on your Tab 1 handouts, lecture content, difficulty parameters, and custom target languages.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setModalStep(1)
                          setShowAiModal(true)
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                      >
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        <span>Open AI Generator</span>
                      </button>
                    </div>

                    {/* Right Column: Upload File Extractor */}
                    <div className="bg-slate-955/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors shadow-sm">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                          <Upload className="w-4 h-4 text-indigo-500" />
                          📁 Upload File
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Drag & drop your own assessment documents, markdown quiz sheets, code templates, or CSV tables. The AI will parse your file and import question sets directly as a structured batch.
                        </p>
                      </div>
                      
                      <div
                        onDragEnter={handleAsgDrag}
                        onDragOver={handleAsgDrag}
                        onDragLeave={handleAsgDrag}
                        onDrop={handleAsgDrop}
                        className={`relative border-2 border-dashed rounded-xl p-3 text-center flex flex-col items-center justify-center transition-all ${
                          asgDragActive
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-805 bg-slate-955/40 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="file"
                          id="asg-file-upload"
                          multiple={false}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0]
                              setClassifyFile(file)
                              setClassifyType('data')
                              setClassifyDownloadable(true)
                              setClassifyPreviewable(true)
                              setClassifyModalOpen(true)
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.docx,.csv,.xlsx,.xls,.md,.json,.txt,.zip,.js,.ts,.py"
                        />
                        <Upload className="w-5 h-5 text-slate-500 mb-1" />
                        <span className="text-[10px] font-semibold text-slate-205">
                          Drop file here or click to browse
                        </span>
                        <span className="text-[9px] text-slate-550 mt-0.5 font-mono">
                          Supported: PDF, DOCX, CSV, MD, ZIP, PY
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Batches Grid Layout */}
                  {batches.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                        ── All Batches ──
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {batches.map((batch, bIdx) => {
                          const approved = batch.questions.filter(q => q.status === 'approved').length
                          const pending = batch.questions.filter(q => q.status === 'pending').length
                          const rejected = batch.questions.filter(q => q.status === 'rejected').length
                          const typeText = batch.type === 'multiple_choice' ? 'MC Theory' : 'Essay Code'
                          const isFileImport = batch.questions.some(q => q.source === 'file_import')
                          const sourceText = isFileImport ? `File Import` : 'AI'
                          
                          return (
                            <div key={batch.id || bIdx} className="p-4 bg-slate-955/40 border border-slate-800 rounded-xl relative group transition-all hover:border-slate-700 flex flex-col justify-between min-h-[110px] shadow-sm">
                              <div className="space-y-1">
                                <span className="block text-xs font-bold text-slate-205">
                                  Batch {bIdx + 1}: {sourceText}
                                </span>
                                <span className="block text-[11px] text-slate-350 font-medium">
                                  {typeText}({batch.questions.length})
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900/60">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ✅ <strong className="text-emerald-500">{approved}</strong> | ⏳ <strong className="text-amber-500">{pending}</strong> | ✗ <strong className="text-rose-500">{rejected}</strong>
                                </span>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveBatchIndex(bIdx)
                                      setActiveQuestionIndex(0)
                                      setModalStep(3)
                                      setShowAiModal(true)
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-blue-450 hover:text-blue-400"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBatch(bIdx)}
                                    className="px-2 py-0.5 rounded bg-rose-650/10 border border-rose-500/20 text-[10px] font-bold text-rose-500 hover:bg-rose-650/20"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold select-none flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div>
                          Total: <strong className="text-slate-200">{batches.reduce((acc, b) => acc + b.questions.length, 0)}</strong> questions (<strong className="text-emerald-500">{batches.reduce((acc, b) => acc + b.questions.filter(q => q.status === 'approved').length, 0)}</strong> approved)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content Summary */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                      ── Content Summary ──
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-350 bg-slate-955/40 border border-slate-850/60 p-3.5 rounded-xl">
                      <div>
                        Questions: <strong className="text-slate-200">{batches.reduce((acc, b) => acc + b.questions.length, 0)}</strong> (AI: {batches.reduce((acc, b) => acc + b.questions.filter(q => q.source === 'ai_generator').length, 0)}, File: {batches.reduce((acc, b) => acc + b.questions.filter(q => q.source === 'file_import').length, 0)})
                      </div>
                      <button
                        type="button"
                        disabled={batches.length === 0}
                        onClick={() => {
                          setShowBatchSummaryModal(true)
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-[10px] shadow-sm transition-colors"
                      >
                        [View All Batches]
                      </button>
                    </div>
                  </div>

                  {/* Attached Files */}
                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      ── Attached Files ──
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Data files card */}
                      <div className="p-4 bg-slate-955/40 border border-slate-850/60 rounded-xl space-y-3 shadow-sm">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          📂 Data Files:
                        </span>
                        {dataFiles.length === 0 ? (
                          <p className="text-[11px] text-slate-550 italic pl-1">No files uploaded</p>
                        ) : (
                          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                            {dataFiles.map((fileItem, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-slate-955 border border-slate-900 px-3 py-2 rounded-lg">
                                <span className="text-slate-305 truncate max-w-[180px] font-medium" title={fileItem.name}>
                                  {fileItem.name} ({(fileItem.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDataFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-500 hover:text-rose-400 font-bold"
                                >
                                  [Delete]
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reference files card */}
                      <div className="p-4 bg-slate-955/40 border border-slate-855/60 rounded-xl space-y-3 shadow-sm">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          📂 Reference Files:
                        </span>
                        {referenceFiles.length === 0 ? (
                          <p className="text-[11px] text-slate-550 italic pl-1">No files uploaded</p>
                        ) : (
                          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                            {referenceFiles.map((fileItem, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-slate-955 border border-slate-900 px-3 py-2 rounded-lg">
                                <span className="text-slate-305 truncate max-w-[180px] font-medium" title={fileItem.name}>
                                  {fileItem.name} ({(fileItem.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReferenceFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-500 hover:text-rose-400 font-bold"
                                >
                                  [Delete]
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>



                  {/* Bottom Section: Assignment Settings */}
                  <div className="space-y-4 pt-6 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Assignment Settings
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Assignment Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={assignmentForm.title}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                          className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Max Score *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={assignmentForm.maxScore}
                          onChange={(e) => {
                            const val = e.target.value
                            setAssignmentForm({
                              ...assignmentForm,
                              maxScore: val === '' ? 100 : Math.max(0, parseFloat(val) || 0)
                            })
                          }}
                          className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Max Files
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={assignmentForm.maxFiles}
                          onChange={(e) => {
                            const val = e.target.value
                            setAssignmentForm({
                              ...assignmentForm,
                              maxFiles: val === '' ? 3 : Math.max(0, parseInt(val) || 0)
                            })
                          }}
                          className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Max Size (MB)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={assignmentForm.maxTotalSizeMb}
                          onChange={(e) => {
                            const val = e.target.value
                            setAssignmentForm({
                              ...assignmentForm,
                              maxTotalSizeMb: val === '' ? 50 : Math.max(0, parseInt(val) || 0)
                            })
                          }}
                          className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Grace Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={assignmentForm.gracePeriodHours}
                          onChange={(e) => {
                            const val = e.target.value
                            setAssignmentForm({
                              ...assignmentForm,
                              gracePeriodHours: val === '' ? 0 : Math.max(0, parseInt(val) || 0)
                            })
                          }}
                          className="w-full bg-slate-955 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Late Penalty (%/day)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={assignmentForm.penaltyPercentPerDay}
                        onChange={(e) => {
                          const val = e.target.value
                          setAssignmentForm({
                            ...assignmentForm,
                            penaltyPercentPerDay: val === '' ? 0 : Math.max(0, parseFloat(val) || 0)
                          })
                        }}
                        className="w-full bg-slate-955 border border-slate-705 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div className="shrink-0 flex flex-col gap-1.5 pt-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Auto-Publish Grades
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          id="asg_auto_publish_yes"
                          onClick={() => setAssignmentForm({ ...assignmentForm, autoPublishGrades: true })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            assignmentForm.autoPublishGrades
                              ? 'bg-blue-600 border-blue-500 text-white font-extrabold shadow-md'
                              : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-350'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          id="asg_auto_publish_no"
                          onClick={() => setAssignmentForm({ ...assignmentForm, autoPublishGrades: false })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            !assignmentForm.autoPublishGrades
                              ? 'bg-blue-600 border-blue-500 text-white font-extrabold shadow-md'
                              : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-355'
                          }`}
                        >
                          No
                        </button>
                      </div>
                      <p className="mt-2.5 text-[10px] text-slate-500 italic leading-relaxed">
                        Note: Assignment due dates are configured per cohort under Class Schedules. Grace Hours and Late Penalty settings configured here will apply relative to those deadlines.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-550 text-xs">
                  This lesson does not have any assignment. Enable it above to configure.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVIEW & FINALIZE (REPLACES SOLUTION KEY) */}
          {currentStep === 3 && (() => {
            const approvedQs: QuestionItem[] = []
            batches.forEach(b => {
              b.questions.forEach(q => {
                if (q.status === 'approved') {
                  approvedQs.push({ ...q, batchDefaultFormat: b.defaultAnswerFormat, batchType: b.type })
                }
              })
            })

            const totalApproved = approvedQs.length
            const withAnswers = approvedQs.filter(q => q.answer && q.answer.trim() !== '').length
            const withoutAnswers = totalApproved - withAnswers
            const aiCount = approvedQs.filter(q => q.source === 'ai_generator').length
            const fileCount = approvedQs.filter(q => q.source === 'file_import').length

            // Ensure index is within bounds
            const activeReviewIndex = Math.max(0, Math.min(activeReviewQsIdx, totalApproved - 1))
            const activeQ = approvedQs[activeReviewIndex]

            return (
              <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-emerald-500 animate-pulse" />
                      Review & Finalize Answers
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Ensure each question has a comprehensive, accurate model answer before publishing. Use AI to suggest missing keys or generate the rubric.
                    </p>
                  </div>
                </div>

                {totalApproved === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    ⚠️ No approved questions found in this assignment yet. Go back to Tab 2 to approve some questions.
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    {/* Split View */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px] overflow-hidden items-stretch">
                      {/* Left Pane: Questions List */}
                      <div className="lg:col-span-5 flex flex-col h-full bg-slate-955/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-slate-955 border-b border-slate-800 flex justify-between items-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-355 uppercase tracking-widest font-mono">
                            📋 QUESTIONS ({totalApproved})
                          </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                          {approvedQs.map((q, idx) => {
                            const isSelected = idx === activeReviewIndex
                            const hasAns = q.answer && q.answer.trim() !== ''
                            const qTypeLabel = q.batchType === 'multiple_choice' ? 'MC' : 'Essay'
                            const qCategoryLabel = q.category === 'theory' ? 'Theory' : 'Code'
                            
                            return (
                              <button
                                key={`q-review-${q.id || idx}-${idx}`}
                                type="button"
                                onClick={() => setActiveReviewQsIdx(idx)}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-1.5 ${
                                  isSelected
                                    ? 'bg-blue-605/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-semibold'
                                    : 'bg-slate-900 border-slate-850 hover:bg-slate-855/60 text-slate-400 hover:text-slate-305'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[9px] font-bold tracking-wider font-mono">
                                    Q{idx + 1}. {q.batchType === 'multiple_choice' ? 'MCQ' : 'ESSAY'}
                                  </span>
                                  <span className={`w-2 h-2 rounded-full ${hasAns ? 'bg-emerald-500' : 'bg-amber-500'}`} title={hasAns ? 'Has Answer' : 'Missing Answer'} />
                                </div>
                                <p className="truncate w-full font-sans text-xs opacity-90">{q.content}</p>
                                
                                <div className="flex items-center justify-between w-full mt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-455 uppercase tracking-wider">
                                      {qTypeLabel}
                                    </span>
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-955 border border-slate-855 text-slate-455 uppercase tracking-wider">
                                      {qCategoryLabel}
                                    </span>
                                  </div>
                                  <span className="text-[8px] font-mono text-slate-505 uppercase tracking-widest">
                                    {q.source === 'file_import' ? '📁 File' : '✨ AI'}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Right Pane: Answer Worksheet */}
                      <div className="lg:col-span-7 flex flex-col h-full bg-slate-955/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-slate-955 border-b border-slate-800 flex justify-between items-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-355 uppercase tracking-widest font-mono">
                            ✅ ANSWERS (QUESTION {activeReviewIndex + 1})
                          </span>
                        </div>

                        {activeQ && (
                          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
                            {/* Answer Detail Header Block */}
                            <div className="p-4 bg-slate-900 border border-slate-855 rounded-xl space-y-2 text-xs">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-950">
                                <div>
                                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Current Answer:</span>
                                  <span className="text-slate-205 font-bold">
                                    {activeQ.answer && activeQ.answer.trim() !== '' ? (
                                      activeQ.batchType === 'multiple_choice'
                                        ? `Option ${activeQ.answer}`
                                        : `${activeQ.answer.slice(0, 40)}${activeQ.answer.length > 40 ? '...' : ''}`
                                    ) : (
                                      <span className="text-rose-400 italic">Answer: (not yet)</span>
                                    )}
                                  </span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  activeQ.answerSource === 'teacher_edit'
                                    ? 'bg-indigo-650/10 text-indigo-400 border border-indigo-500/20'
                                    : activeQ.answerSource === 'file_import'
                                    ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20'
                                    : 'bg-blue-600/10 text-blue-400 border border-blue-505/20'
                                }`}>
                                  Source: {activeQ.answerSource === 'teacher_edit' ? 'Teacher Edit' : activeQ.source === 'file_import' ? 'File Import' : 'AI Generated'}
                                </span>
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSuggestAnswer(activeReviewIndex)}
                                  disabled={suggestingAnsIdx === activeReviewIndex}
                                  className="px-2.5 py-1 rounded bg-slate-955 hover:bg-slate-900 text-[10px] text-blue-450 hover:text-blue-405 font-bold border border-slate-850 hover:border-slate-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  {suggestingAnsIdx === activeReviewIndex ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 text-indigo-505" />
                                  )}
                                  <span>Suggest AI</span>
                                </button>
                              </div>
                            </div>

                            {/* Question content card */}
                            <div className="p-4 bg-slate-900 border border-slate-855 rounded-xl space-y-2 select-text leading-relaxed">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Question:</span>
                              <p className="text-slate-205 whitespace-pre-wrap">{activeQ.content}</p>
                              {activeQ.options && Array.isArray(activeQ.options) && (
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-950">
                                  {activeQ.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="text-[11px] text-slate-400 font-medium">
                                      <strong className="text-blue-500">{String.fromCharCode(65 + oIdx)}.</strong> {cleanOptionText(opt, oIdx)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Answer input */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                Model Answer Workspace / Correct Key
                              </label>

                              {activeQ.batchType === 'multiple_choice' ? (
                                <div className="space-y-3 p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                                  <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">Select Correct Option:</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(activeQ.options || ['A', 'B', 'C', 'D']).map((_, oIdx) => {
                                      const letter = String.fromCharCode(65 + oIdx)
                                      const isCorrect = activeQ.answer === letter
                                      return (
                                        <button
                                          key={letter}
                                          type="button"
                                          onClick={() => {
                                            updateQuestionInBatches(activeQ.id, {
                                              answer: letter,
                                              answerSource: 'teacher_edit'
                                            })
                                          }}
                                          className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                                            isCorrect
                                              ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                              : 'bg-slate-900 border-slate-800 text-slate-450 hover:bg-slate-850'
                                          }`}
                                        >
                                          Option {letter}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <textarea
                                    id="model-answer-textarea"
                                    rows={6}
                                    placeholder="Type complete model answer text or essay response rubric expectation guidelines here..."
                                    value={activeQ.answer || ''}
                                    onChange={(e) => {
                                      updateQuestionInBatches(activeQ.id, {
                                        answer: e.target.value,
                                        answerSource: 'teacher_edit'
                                      })
                                    }}
                                    className="w-full bg-slate-955 border border-slate-800 rounded-xl p-3 text-xs text-slate-205 font-mono focus:outline-none resize-none leading-relaxed"
                                  />
                                  <div className="text-[10px] text-slate-500 text-right">
                                    {(activeQ.answer || '').trim().split(/\s+/).filter(Boolean).length} words
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Simulated student view card preview */}
                            <div className="p-4 bg-slate-955/20 border border-slate-850/60 rounded-xl space-y-2.5 select-none shadow-sm">
                              <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Simulated Student View Preview:</span>
                              <div className="p-3.5 bg-slate-955 border border-slate-900 rounded-xl space-y-2">
                                <span className="block text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider w-fit">
                                  Question {activeReviewIndex + 1} ({activeQ.batchType === 'multiple_choice' ? 'MCQ' : 'Essay'})
                                </span>
                                <p className="font-semibold text-xs text-slate-200">{activeQ.content}</p>
                                
                                {activeQ.batchType === 'multiple_choice' ? (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {(activeQ.options || []).map((opt, oIdx) => {
                                      const letter = String.fromCharCode(65 + oIdx)
                                      return (
                                        <div key={letter} className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-855 rounded-lg text-[10px] text-slate-400">
                                          <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center font-bold text-[9px] shrink-0 text-slate-505 bg-slate-955">{letter}</span>
                                          <span className="truncate">{cleanOptionText(opt, oIdx)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-900">
                                    <div className="text-[9px] text-slate-455 font-semibold flex items-center gap-1.5">
                                      <span>Format:</span>
                                      <span className="text-slate-300 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">
                                        {activeQ.answerFormat === 'file' ? '📎 File Only' : activeQ.answerFormat === 'both' ? '🔀 Both' : '📝 Text Only'}
                                      </span>
                                    </div>
                                    <textarea
                                      disabled
                                      placeholder="Student types their answer here..."
                                      className="w-full bg-slate-900 border border-slate-855 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-505 h-10 resize-none"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="p-4 bg-slate-955/40 border border-slate-800 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-semibold text-slate-405 shadow-sm">
                      <div>
                        Summary: <strong className="text-slate-205">{totalApproved}</strong> approved questions | With answers: <strong className="text-emerald-500">{withAnswers}</strong> | Missing: <strong className="text-amber-500">{withoutAnswers}</strong>
                      </div>
                      <div className="flex gap-4">
                        <span>AI Generated: <strong className="text-slate-205">{aiCount}</strong></span>
                        <span>File Imports: <strong className="text-slate-205">{fileCount}</strong></span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleSuggestAllMissingAnswers}
                        disabled={isSuggestingAll || withoutAnswers === 0}
                        className="flex-1 py-3 bg-slate-900 hover:bg-slate-855 text-slate-250 border border-slate-800 hover:border-slate-700 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSuggestingAll ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-505" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-blue-455" />
                        )}
                        <span>AI Suggest All Missing</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateRubric}
                        disabled={isGeneratingRubric || totalApproved === 0}
                        className="flex-1 py-3 bg-slate-900 hover:bg-slate-855 text-slate-250 border border-slate-800 hover:border-slate-700 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingRubric ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-505" />
                        ) : (
                          <Brain className="w-4 h-4 text-indigo-400" />
                        )}
                        <span>AI Generate Rubric</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveComposer}
                        disabled={saving}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-505 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileCheck className="w-4 h-4 text-blue-200" />
                        )}
                        <span>Finalize & Save</span>
                      </button>
                    </div>

                    {/* Final Preview Section */}
                    <div className="mt-8 border-t border-slate-800 pt-8 space-y-6 select-none">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                        <Eye className="w-4.5 h-4.5 text-indigo-405 animate-pulse" />
                        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                          👁️ Final Preview (As Students Will See It)
                        </h4>
                      </div>

                      <div className="border border-slate-800 bg-slate-955/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                              <ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                                {assignmentForm.title || 'Assignment Deliverables'}
                              </h4>
                              <p className="text-xs text-slate-455 mt-0.5 font-mono">
                                Max Score: {assignmentForm.maxScore} pts | Files: Max {assignmentForm.maxFiles} ({assignmentForm.maxTotalSizeMb}MB)
                              </p>
                            </div>
                          </div>
                          <div className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-505 text-white font-bold text-xs uppercase tracking-wider select-none shrink-0 cursor-pointer shadow-lg transition-all hover:scale-[1.02]">
                            Submit Deliverables
                          </div>
                        </div>

                        {/* Section: Downloadable Data Files */}
                        {dataFiles.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                              <FileCode className="w-3.5 h-3.5 text-blue-505" />
                              Attached Data Files (For Download)
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {dataFiles.map((fileItem, idx) => (
                                <div key={idx} className="p-3 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-xs font-semibold text-slate-202 truncate">
                                      {fileItem.name}
                                    </span>
                                    <span className="block text-[9px] text-slate-500 font-mono">
                                      {(fileItem.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                  {fileItem.downloadable && (
                                    <a
                                      href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                                      download
                                      className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-405 text-[10px] font-bold border border-blue-505/20 transition-all shrink-0"
                                    >
                                      Download
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section: Reference Materials */}
                        {referenceFiles.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-505" />
                              Reference Materials (For Reading)
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {referenceFiles.map((fileItem, idx) => (
                                <div key={idx} className="p-3 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-xs font-semibold text-slate-202 truncate">
                                      {fileItem.name}
                                    </span>
                                    <span className="block text-[9px] text-slate-500 font-mono">
                                      {(fileItem.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    {fileItem.previewable && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (fileItem.storage_path) {
                                            const res = await getSignedUrlAction('teaching-materials', fileItem.storage_path)
                                            if (res.success && res.signedUrl) {
                                              window.open(res.signedUrl, '_blank')
                                            } else {
                                              alert('Could not open file preview.')
                                            }
                                          }
                                        }}
                                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-355 hover:text-slate-105 text-[9px] font-bold transition-all"
                                      >
                                        Preview
                                      </button>
                                    )}
                                    {fileItem.downloadable && (
                                      <a
                                        href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                                        download
                                        className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-405 text-[9px] font-bold border border-blue-505/20 transition-all"
                                      >
                                        Download
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section: Structured Questions List */}
                        <div className="space-y-4 pt-4 border-t border-slate-800">
                          <h5 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                            <Brain className="w-3.5 h-3.5 text-blue-505 animate-pulse" />
                            Assignment Questions ({approvedQs.length})
                          </h5>

                          <div className="space-y-4">
                            {approvedQs.map((q, idx) => {
                              const resolvedFormat = q.batchType === 'multiple_choice' ? 'text' : (q.answerFormat || q.batchDefaultFormat || 'text')
                              return (
                                <div key={`q-preview-${q.id || idx}-${idx}`} className="p-5 bg-slate-955 border border-slate-855 rounded-2xl space-y-3 text-xs text-slate-202 shadow-inner">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] bg-slate-900 text-slate-450 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                      Question {idx + 1} ({q.batchType === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'} — {q.source === 'file_import' ? 'File Import' : 'AI Generated'})
                                    </span>
                                  </div>
                                  <p className="text-slate-202 font-semibold leading-relaxed whitespace-pre-wrap">
                                    {q.content}
                                  </p>

                                  {/* Answer Format Indicator for Essay questions */}
                                  {q.batchType === 'essay' && (
                                    <div className="text-[10px] text-slate-455 font-semibold flex items-center gap-1.5 select-none font-mono">
                                      <span>Format:</span>
                                      {resolvedFormat === 'text' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📝 Text Only</span>}
                                      {resolvedFormat === 'file' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📎 File Upload Only</span>}
                                      {resolvedFormat === 'both' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">🔀 Both</span>}
                                    </div>
                                  )}

                                  {/* Options (if MCQ) / Response field (if Essay) */}
                                  {q.batchType === 'essay' ? (
                                    <div className="space-y-3">
                                      {(resolvedFormat === 'text' || resolvedFormat === 'both') && (
                                        <div className="space-y-1.5">
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            Your Answer (Text)
                                          </label>
                                          <textarea
                                            value={simulatedAnswers[idx] || ''}
                                            onChange={(e) => {
                                              setSimulatedAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                            }}
                                            placeholder="Type your simulated essay response..."
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-505 h-24 placeholder-slate-600 font-sans"
                                          />
                                        </div>
                                      )}

                                      {resolvedFormat === 'both' && (
                                        <div className="flex items-center justify-center gap-3">
                                          <div className="h-px bg-slate-850 flex-1" />
                                          <span className="text-[9px] text-slate-555 font-bold uppercase tracking-widest font-mono">or</span>
                                          <div className="h-px bg-slate-855 flex-1" />
                                        </div>
                                      )}

                                      {(resolvedFormat === 'file' || resolvedFormat === 'both') && (
                                        <div className="space-y-1.5">
                                          <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono">
                                            {resolvedFormat === 'file' ? 'Upload your file:' : 'Upload file instead:'}
                                          </label>
                                          <div className="border border-dashed border-slate-700 bg-slate-900/40 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1 select-none">
                                            <Paperclip className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-200 font-sans">Drag & drop or click to upload</span>
                                            <span className="text-[9px] text-slate-555 font-mono">Supported: .py, .js, .ts, .pdf, .docx</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                                      {q.options.map((opt, oIdx) => {
                                        const letter = String.fromCharCode(65 + oIdx)
                                        const isSelected = simulatedAnswers[idx] === letter
                                        return (
                                          <button
                                            type="button"
                                            key={oIdx}
                                            onClick={() => {
                                              setSimulatedAnswers(prev => ({ ...prev, [idx]: letter }))
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                                              isSelected
                                                ? 'bg-blue-600/10 border-blue-555 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-bold'
                                                : 'bg-slate-900 border-slate-855 text-slate-355 hover:bg-slate-850/60 hover:border-slate-800'
                                            }`}
                                          >
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                              isSelected
                                                ? 'bg-blue-505 border-blue-505 text-white'
                                                : 'border-slate-700 text-slate-550'
                                            }`}>
                                              {letter}
                                            </span>
                                            <span>{cleanOptionText(opt, oIdx)}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}{/* TAB 4: RUBRIC GENERATOR */}
          {currentStep === 4 && (
            <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  AI Rubric Matrix Setup
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateAIRubric}
                    disabled={generatingRubric}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1"
                  >
                    {generatingRubric ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                    <span>Generate Rubric</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCriteriaList([...criteriaList, { key: `custom-${Date.now()}`, label: 'New Metric', description: '', max_points: 10, weight: 1.0, evaluation_hints: { rule_type: 'none', expected_value: null } }])}
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-350 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Metric</span>
                  </button>
                </div>
              </div>

              {criteriaList.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  Rubric is empty. Click "Generate Rubric" or add criteria manually.
                </div>
              ) : (
                <div className="space-y-4">
                  {criteriaList.map((crit, idx) => (
                    <div key={crit.key || idx} className="p-4 rounded-xl border border-slate-700 bg-slate-950/40 space-y-3 relative">
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-1">
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-1">
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-1">
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-1">
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                          />
                        </div>
                      </div>

                      {/* Rule configuration */}
                      <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-700">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-1">
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none"
                          >
                            <option value="none">LLM Evaluation (none)</option>
                            <option value="exact">Exact Text Match</option>
                            <option value="regex">Regex Match</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-1">
                            Expected Pattern / Value
                          </label>
                          <input
                            type="text"
                            disabled={crit.evaluation_hints?.rule_type === 'none'}
                            value={crit.evaluation_hints?.expected_value || ''}
                            onChange={(e) => {
                              const updated = [...criteriaList]
                              updated[idx].evaluation_hints.expected_value = e.target.value
                              setCriteriaList(updated)
                            }}
                            placeholder={crit.evaluation_hints?.rule_type === 'regex' ? 'e.g. /pandas/i' : 'e.g. B'}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 disabled:opacity-40"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setCriteriaList(criteriaList.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Sandbox testing widget */}
                  <div className="p-5 rounded-2xl border border-indigo-900 bg-indigo-950/20 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-850 uppercase tracking-widest flex items-center gap-1.5">
                      <CodeIcon className="w-4 h-4" /> Regex sandbox matcher
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-450 uppercase mb-1">Select Metric</label>
                        <select
                          value={sandboxCriterionIdx}
                          onChange={(e) => setSandboxCriterionIdx(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                        >
                          {criteriaList.map((c, i) => (
                            <option key={i} value={i}>
                              {c.label} ({c.evaluation_hints?.rule_type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-450 uppercase mb-1">Test Input String</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type test student output..."
                            value={sandboxInput}
                            onChange={(e) => setSandboxInput(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-slate-100"
                          />
                          <div className="flex items-center shrink-0">
                            {getSandboxResult() === null ? (
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">No rule</span>
                            ) : getSandboxResult() ? (
                              <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> MATCH
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-semibold flex items-center gap-1">
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
          )}

          {/* Stepper Navigation Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-700 bg-slate-900/40 p-4 rounded-xl shadow-md">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={handlePrevStep}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-650 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveComposer}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-650 text-slate-350 hover:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{saveStage || 'Saving...'} ({saveStatus.elapsed})</span>
                  </>
                ) : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg"
              >
                {currentStep === 4 || (currentStep === 2 && !hasAssignment) ? 'Save & Finish' : 'Next Step →'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Right Panel */}
        <div className="space-y-6">
          {/* Syllabus Outline Context Card */}
          <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest pb-2.5 border-b border-slate-700">
              Syllabus Registry Context
            </h3>
            {lesson && (
              <div className="space-y-3 text-xs text-slate-350">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Course</span>
                  <span className="font-semibold text-slate-200">{lesson.modules?.courses?.title}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Module</span>
                  <span>{lesson.modules?.title}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Subject Path</span>
                  <span>{lesson.modules?.courses?.subjects?.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verify & Configure Modal */}
      {verifyMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Verify Handout: {verifyMaterial.title}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Verify the parsed content results. Student download permission is controlled globally.
                </p>
              </div>
              <button
                onClick={() => setVerifyMaterial(null)}
                className="text-slate-400 hover:text-slate-200 text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-350">
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Parsed Content Preview (Server Extraction)
                </span>
                
                <div className="bg-slate-955 border border-slate-700 rounded-xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto text-xs leading-relaxed">
                  {verifyMaterial.type === 'docx' ? (
                    verifyMaterial.metadata?.viewer_artifact?.viewer_html ? (
                      <div 
                        className="prose max-w-none text-slate-200 text-xs"
                        dangerouslySetInnerHTML={{ __html: verifyMaterial.metadata.viewer_artifact.viewer_html }}
                      />
                    ) : (
                      <span className="text-slate-500 italic">No HTML parsing output generated for this Word document.</span>
                    )
                  ) : verifyMaterial.type === 'markdown' ? (
                    verifyMaterial.metadata?.viewer_artifact?.viewer_markdown ? (
                      <div 
                        className="prose max-w-none text-slate-200 text-xs"
                        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(verifyMaterial.metadata.viewer_artifact.viewer_markdown) }}
                      />
                    ) : (
                      <span className="text-slate-500 italic">No markdown preview content available.</span>
                    )
                  ) : verifyMaterial.type === 'json' ? (
                    <pre className="overflow-x-auto p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs whitespace-pre-wrap">
                      {JSON.stringify(verifyMaterial.metadata?.viewer_artifact?.viewer_json || verifyMaterial.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
                    </pre>
                  ) : ['csv', 'xlsx'].includes(verifyMaterial.type) ? (
                    verifyMaterial.metadata?.viewer_artifact?.rows && verifyMaterial.metadata?.viewer_artifact?.rows.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-700 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-800 text-[10px]">
                          <thead className="bg-slate-900">
                            <tr>
                              {(verifyMaterial.metadata.viewer_artifact.headers || []).map((hdr: string, i: number) => (
                                <th key={i} className="px-3 py-1.5 text-left font-semibold text-slate-100 border-r border-slate-700 last:border-0 whitespace-nowrap">
                                  {hdr}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-955">
                            {(verifyMaterial.metadata.viewer_artifact.rows || []).slice(0, 5).map((row: any[], i: number) => (
                              <tr key={i} className="hover:bg-slate-880/20 hover:bg-slate-800/20">
                                {row.map((cell: any, j: number) => (
                                  <td key={j} className="px-3 py-1.5 text-slate-100 border-r border-slate-700 last:border-0 whitespace-nowrap">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No table dataset grid parsed for this spreadsheet.</span>
                    )
                  ) : verifyMaterial.type === 'pdf' ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <span>PDF Document Guide</span>
                      <span className="text-[10px] text-slate-500">Students will read this file via the secure PDF Document Viewer.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                      <LinkIcon className="w-8 h-8 text-slate-500" />
                      <span>External Resource Link</span>
                      <a href={verifyMaterial.storage_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline break-all">
                        {verifyMaterial.storage_url}
                      </a>
                    </div>
                  )}
                </div>
                {['csv', 'xlsx'].includes(verifyMaterial.type) && verifyMaterial.metadata?.viewer_artifact?.row_count > 5 && (
                  <span className="block text-xs text-slate-500 italic">
                    Showing first 5 of {verifyMaterial.metadata.viewer_artifact.row_count} rows.
                  </span>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setVerifyMaterial(null)}
                className="px-4 py-2 rounded-xl bg-slate-955 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials Preview Modal */}
      {showMaterialsPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  Materials & Handouts Preview
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This simulates what students see when reviewing lesson materials and study handouts.
                </p>
              </div>
              <button
                onClick={() => setShowMaterialsPreview(false)}
                className="text-slate-400 hover:text-slate-200 text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900 text-slate-100 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Lesson Header Simulation */}
                <div className="border-b border-slate-805 pb-4">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Lesson Reference Materials
                  </span>
                  <h1 className="text-xl font-bold text-slate-100 mt-1">{title || 'Untitled Lesson'}</h1>
                </div>

                {/* Handouts Materials List */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    Mapped Materials & Handouts ({materials.length})
                  </h5>

                  {materials.length === 0 ? (
                    <div className="text-center py-10 border border-slate-800 border-dashed rounded-xl bg-slate-950/20 text-slate-455 text-xs">
                      No materials mapped to this lesson yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {materials.map((m, idx) => {
                        const styles = getMaterialTypeStyles(m.type)
                        const Icon = getMaterialIcon(m.type)
                        return (
                          <div key={m.id || idx} className="p-4 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-800 transition-all">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`w-3.5 h-3.5 ${styles.iconColor} shrink-0`} />
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {m.title}
                                </span>
                              </div>
                              {m.note && (
                                <span className="block text-[10px] text-slate-455 truncate">
                                  {m.note}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {['pdf', 'docx', 'csv', 'xlsx'].includes(m.type) && previewSignedUrls[m.id] && (
                                <button
                                  type="button"
                                  onClick={() => window.open(previewSignedUrls[m.id], '_blank')}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-755 text-slate-300 text-[10px] font-bold border border-slate-700 transition-all"
                                >
                                  Preview
                                </button>
                              )}
                              {['link', 'markdown', 'json'].includes(m.type) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (m.type === 'link') {
                                      window.open(m.metadata?.link_url || '#', '_blank')
                                    } else {
                                      alert(`Previewing custom content: ${m.title}`)
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-755 text-slate-300 text-[10px] font-bold border border-slate-700 transition-all"
                                >
                                  Open
                                </button>
                              )}
                              {downloadAllowed && ['pdf', 'docx', 'csv', 'xlsx', 'json', 'markdown'].includes(m.type) && (
                                <a
                                  href={previewSignedUrls[m.id] || '#'}
                                  download={m.title}
                                  className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/20 transition-all"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowMaterialsPreview(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Preview Simulator Modal */}
      {showAssignmentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  Assignment View Simulator
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This simulates what students see when completing assignments on this lesson.
                </p>
              </div>
              <button
                onClick={() => setShowAssignmentPreview(false)}
                className="text-slate-400 hover:text-slate-200 text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900 text-slate-100 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Lesson Header Simulation */}
                <div className="border-b border-slate-805 pb-4">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Course Roadmap / Lesson Preview
                  </span>
                  <h1 className="text-xl font-bold text-slate-100 mt-1">{title || 'Untitled Lesson'}</h1>
                </div>

                {/* 1. Deliverables / Assignment Section */}
                {hasAssignment && (
                  <div className="border border-indigo-500/20 bg-slate-950/20 rounded-3xl p-6 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                            {assignmentForm.title || 'Assignment Deliverables'}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Max Score: {assignmentForm.maxScore} pts | Files: Max {assignmentForm.maxFiles} ({assignmentForm.maxTotalSizeMb}MB)
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider select-none shrink-0 cursor-pointer shadow-lg transition-all hover:scale-[1.02]">
                        Submit Deliverables
                      </div>
                    </div>

                    {/* Section: Downloadable Data Files */}
                    {dataFiles.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-blue-500" />
                          Attached Data Files (For Download)
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dataFiles.map((fileItem, idx) => (
                            <div key={idx} className="p-3 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {fileItem.name}
                                </span>
                                <span className="block text-[9px] text-slate-500">
                                  {(fileItem.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              {fileItem.downloadable && (
                                <a
                                  href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                                  download
                                  className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/20 transition-all shrink-0"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section: Reference Materials */}
                    {referenceFiles.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          Reference Materials (For Reading)
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {referenceFiles.map((fileItem, idx) => (
                            <div key={idx} className="p-3 bg-slate-955 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-slate-200 truncate">
                                  {fileItem.name}
                                </span>
                                <span className="block text-[9px] text-slate-500">
                                  {(fileItem.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                {fileItem.previewable && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (fileItem.storage_path) {
                                        const res = await getSignedUrlAction('teaching-materials', fileItem.storage_path)
                                        if (res.success && res.signedUrl) {
                                          window.open(res.signedUrl, '_blank')
                                        } else {
                                          alert('Could not open file preview.')
                                        }
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-350 hover:text-slate-100 text-[9px] font-bold transition-all"
                                  >
                                    Preview
                                  </button>
                                )}
                                {fileItem.downloadable && (
                                  <a
                                    href={fileItem.storage_path ? `/api/storage/teaching-materials/${fileItem.storage_path}` : '#'}
                                    download
                                    className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-bold border border-blue-500/20 transition-all"
                                  >
                                    Download
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section: Structured Questions List */}
                    {(() => {
                      const getAnswerFormat = (question: any, batch: any): 'text' | 'file' | 'both' => {
                        if (question.answerFormat) return question.answerFormat
                        return batch?.defaultAnswerFormat || 'text'
                      }

                      const approvedQs: any[] = []
                      batches.forEach(b => {
                        b.questions.forEach(q => {
                          if (q.status === 'approved') {
                            approvedQs.push({ ...q, batch: b })
                          }
                        })
                      })

                      if (approvedQs.length === 0) return null

                      return (
                        <div className="space-y-4 pt-4 border-t border-slate-800">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                            Assignment Questions ({approvedQs.length})
                          </h5>

                          <div className="space-y-4">
                            {approvedQs.map((q, idx) => {
                              const resolvedFormat = q.batch.type === 'multiple_choice' ? 'text' : getAnswerFormat(q, q.batch)
                              return (
                                <div key={`q-final-${q.id || idx}-${idx}`} className="p-5 bg-slate-955 border border-slate-855 rounded-2xl space-y-3 text-xs text-slate-200 animate-fade-in">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                      Question {idx + 1} ({q.batch.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'} — {q.batch.category === 'theory' ? 'Lý thuyết' : 'Code'})
                                    </span>
                                  </div>
                                  <p className="text-slate-205 font-semibold leading-relaxed">
                                    {q.content}
                                  </p>

                                  {/* Answer Format Indicator for Essay questions in Merged Preview */}
                                  {q.batch.type === 'essay' && (
                                    <div className="text-[10px] text-slate-450 font-semibold flex items-center gap-1.5 select-none">
                                      <span>Format:</span>
                                      {resolvedFormat === 'text' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📝 Text Only</span>}
                                      {resolvedFormat === 'file' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">📎 File Upload Only</span>}
                                      {resolvedFormat === 'both' && <span className="text-slate-300 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850">🔀 Both</span>}
                                    </div>
                                  )}

                                  {/* Options (if multiple choice) / Response field (if essay) */}
                                  {q.batch.type === 'essay' ? (
                                    <div className="space-y-3">
                                      {/* Text input (for text or both) */}
                                      {(resolvedFormat === 'text' || resolvedFormat === 'both') && (
                                        <div className="space-y-1.5">
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                            Your Answer (Text)
                                          </label>
                                          <textarea
                                            value={simulatedAnswers[idx] || ''}
                                            onChange={(e) => {
                                              setSimulatedAnswers(prev => ({ ...prev, [idx]: e.target.value }))
                                            }}
                                            placeholder="Type your simulated essay response..."
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-505 h-24 placeholder-slate-600"
                                          />
                                          <div className="text-[10px] text-slate-550 text-right">
                                            {(simulatedAnswers[idx] || '').trim().split(/\s+/).filter(Boolean).length} words
                                          </div>
                                        </div>
                                      )}

                                      {/* Or separator (for both) */}
                                      {resolvedFormat === 'both' && (
                                        <div className="flex items-center justify-center gap-3">
                                          <div className="h-px bg-slate-850 flex-1" />
                                          <span className="text-[9px] text-slate-550 font-bold uppercase tracking-widest">or</span>
                                          <div className="h-px bg-slate-850 flex-1" />
                                        </div>
                                      )}

                                      {/* File upload (for file or both) */}
                                      {(resolvedFormat === 'file' || resolvedFormat === 'both') && (
                                        <div className="space-y-1.5">
                                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">
                                            {resolvedFormat === 'file' ? 'Upload your file:' : 'Upload file instead:'}
                                          </label>
                                          <div className="border border-dashed border-slate-700 bg-slate-900/40 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1 select-none">
                                            <Paperclip className="w-5 h-5 text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-200">Drag & drop or click to upload</span>
                                            <span className="text-[9px] text-slate-500 font-mono">Supported: .py, .js, .ts, .pdf, .docx</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                                      {q.options.map((opt, oIdx) => {
                                        const letter = String.fromCharCode(65 + oIdx)
                                        const isSelected = simulatedAnswers[idx] === letter
                                        return (
                                          <button
                                            type="button"
                                            key={oIdx}
                                            onClick={() => {
                                              setSimulatedAnswers(prev => ({ ...prev, [idx]: letter }))
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200 ${
                                              isSelected
                                                ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-sm ring-1 ring-blue-500/25 font-bold'
                                                : 'bg-slate-900 border-slate-850 text-slate-350 hover:bg-slate-850/60 hover:border-slate-800'
                                            }`}
                                          >
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                              isSelected
                                                ? 'bg-blue-505 border-blue-505 text-white'
                                                : 'border-slate-700 text-slate-555'
                                            }`}>
                                              {letter}
                                            </span>
                                            <span>{cleanOptionText(opt, oIdx)}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAssignmentPreview(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classify File Modal */}
      {classifyModalOpen && classifyFile && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Classify Uploaded File
              </h3>
              <button
                type="button"
                onClick={() => {
                  setClassifyModalOpen(false)
                  setClassifyFile(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs text-slate-205">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Selected File
                </span>
                <span className="block text-xs font-semibold text-slate-200 truncate">
                  {classifyFile.name}
                </span>
                <span className="block text-[9px] text-slate-400 mt-0.5">
                  ({(classifyFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-widest">
                  Classify As
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    classifyType === 'data'
                      ? 'bg-blue-600/10 border-blue-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                  }`}>
                    <input
                      type="radio"
                      name="classify_type"
                      checked={classifyType === 'data'}
                      onChange={() => {
                        setClassifyType('data')
                        setClassifyDownloadable(true)
                        setClassifyPreviewable(true)
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-200">Student Data File</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        Students download this file for assignments (e.g. datasets, CSVs, starting code).
                      </span>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    classifyType === 'reference'
                      ? 'bg-blue-600/10 border-blue-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                  }`}>
                    <input
                      type="radio"
                      name="classify_type"
                      checked={classifyType === 'reference'}
                      onChange={() => {
                        setClassifyType('reference')
                        setClassifyDownloadable(true)
                        setClassifyPreviewable(true)
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-200">Reference Material</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        Students read this file inline (e.g. guide PDFs, cheat sheets, guidelines).
                      </span>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    classifyType === 'question'
                      ? 'bg-blue-600/10 border-blue-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50'
                  }`}>
                    <input
                      type="radio"
                      name="classify_type"
                      checked={classifyType === 'question'}
                      onChange={() => setClassifyType('question')}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-200">Assignment Question Sheet (AI Parse)</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        AI extracts questions from this file and appends them to your assignment.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {classifyType !== 'question' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-widest">
                    Options
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={classifyDownloadable}
                        onChange={(e) => setClassifyDownloadable(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                      />
                      <span className="text-xs text-slate-305">Allow Download</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={classifyPreviewable}
                        onChange={(e) => setClassifyPreviewable(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                      />
                      <span className="text-xs text-slate-305">Allow Inline Preview</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setClassifyModalOpen(false)
                  setClassifyFile(null)
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isParsingFile}
                onClick={handleConfirmClassification}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5"
              >
                {isParsingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{classifyType === 'question' ? 'AI Parse Questions' : 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  AI Assignment Generator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (modalStep === 3) {
                    const confirmed = window.confirm('Discard generated questions and close?')
                    if (!confirmed) return
                  }
                  setShowAiModal(false)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-205 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col">

                  {/* STEP 1: UNIFIED SOURCE MATERIALS & CONFIGURATION */}
                  {modalStep === 1 && (
                    <div className="flex-1 overflow-y-auto p-6 w-full flex flex-col justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto w-full">
                        {/* Left Column: Source Materials (col-span-5) */}
                        <div className="md:col-span-5 space-y-4 flex flex-col">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📚</span>
                              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                                Source Materials
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Select materials for the AI to read and reference for the assignment.
                            </p>
                          </div>

                          {materials.length === 0 ? (
                            <div className="flex-1 min-h-[250px] flex items-center justify-center p-8 border border-dashed border-slate-800 bg-slate-950/20 rounded-2xl text-center text-xs text-slate-500">
                              No materials uploaded for this lesson. The AI will generate questions using the lesson outline title and content.
                            </div>
                          ) : (
                            <div className="space-y-3 flex-1 flex flex-col">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                  Available Handouts / Files
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAiSelectedMaterials(materials.map(m => m.id))}
                                    className="text-[10px] text-blue-500 hover:text-blue-400 font-bold"
                                  >
                                    [Select All]
                                  </button>
                                  <span className="text-slate-700 text-[10px]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => setAiSelectedMaterials([])}
                                    className="text-[10px] text-slate-550 hover:text-slate-400 font-bold"
                                  >
                                    [Deselect All]
                                  </button>
                                </div>
                              </div>

                              <div className="flex-1 max-h-[340px] overflow-y-auto space-y-2 pr-1">
                                {materials.map((m) => {
                                  const Icon = getMaterialIcon(m.type)
                                  const styles = getMaterialTypeStyles(m.type)
                                  const isSelected = aiSelectedMaterials.includes(m.id)
                                  return (
                                    <label
                                      key={m.id}
                                      className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                                        isSelected
                                          ? styles.bg + ' border-current shadow-sm ring-1 ring-offset-0 ring-current/25'
                                          : 'bg-slate-950/30 border-slate-800 hover:bg-slate-900/50 text-slate-400 hover:text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0 pr-2">
                                        <div className="relative flex items-center justify-center shrink-0">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setAiSelectedMaterials(prev => [...prev, m.id])
                                              } else {
                                                setAiSelectedMaterials(prev => prev.filter(id => id !== m.id))
                                              }
                                            }}
                                            className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer"
                                          />
                                        </div>
                                        <Icon className={`w-4 h-4 ${isSelected ? styles.iconColor : 'text-slate-500'} shrink-0`} />
                                        <div className="min-w-0">
                                          <span className={`block text-xs font-semibold truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                                            {m.title}
                                          </span>
                                          <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                                            {m.type}
                                          </span>
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                              
                              <div className="pt-2 border-t border-slate-850 shrink-0 text-right">
                                <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase font-mono">
                                  {aiSelectedMaterials.length} of {materials.length} selected
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column: Configuration (col-span-7) */}
                        <div className="md:col-span-7 space-y-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⚙️</span>
                              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                                Configuration
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Configure type, category, model, and questions count.
                            </p>
                          </div>

                          <div className="bg-slate-950/30 border border-slate-800 p-6 rounded-2xl space-y-5">
                            {/* Model Selector & Questions Count Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                  AI Model
                                </label>
                                 <select
                                   value={selectedModel}
                                   onChange={(e) => setSelectedModel(e.target.value)}
                                   className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                 >
                                   <option value="gemini-2.5-flash">Gemini 2.5 Flash (Google)</option>
                                   <option value="gemini-2.5-pro">Gemini 2.5 Pro (Google)</option>
                                   <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Google)</option>
                                   <option value="groq/llama-3.3-70b-specdec">Llama 3.3 70B (Groq)</option>
                                   <option value="openrouter/google/gemini-2.5-flash:free">OpenRouter Gemini 2.5 Flash Free</option>
                                   <option value="deepseek/deepseek-r1:free">DeepSeek R1 (OpenRouter Free)</option>
                                   <option value="ollama">Ollama (Local Llama)</option>
                                 </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                  Number of Questions
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAiQuestionCount(prev => Math.max(1, prev - 1))}
                                    className="w-9 h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg hover:text-slate-200 transition-colors"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={aiQuestionCount}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1
                                      setAiQuestionCount(Math.min(30, Math.max(1, val)))
                                    }}
                                    className="w-16 h-9 bg-slate-900 border border-slate-800 rounded-lg text-center text-xs text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setAiQuestionCount(prev => Math.min(30, prev + 1))}
                                    className="w-9 h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg hover:text-slate-200 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Question Type Visual Cards */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                Question Type
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setAiType('multiple_choice')}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    aiType === 'multiple_choice'
                                      ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/30'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                    aiType === 'multiple_choice'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-800 text-slate-450'
                                  }`}>
                                    <ClipboardList className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="block text-xs font-bold">Multiple Choice</span>
                                    <span className="block text-[9px] opacity-70">Single option selector</span>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setAiType('essay')}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    aiType === 'essay'
                                      ? 'bg-purple-600/10 border-purple-500 text-white ring-1 ring-purple-500/30'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                    aiType === 'essay'
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-slate-800 text-slate-450'
                                  }`}>
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="block text-xs font-bold">Essay / Practice</span>
                                    <span className="block text-[9px] opacity-70">Rich text submission</span>
                                  </div>
                                </button>
                              </div>
                            </div>

                            {/* Category Visual Cards */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                Category
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setAiCategory('theory')}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    aiCategory === 'theory'
                                      ? 'bg-amber-600/10 border-amber-500 text-white ring-1 ring-amber-500/30'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                    aiCategory === 'theory'
                                      ? 'bg-amber-500 text-slate-900'
                                      : 'bg-slate-800 text-slate-450'
                                  }`}>
                                    <Lightbulb className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="block text-xs font-bold">Theory</span>
                                    <span className="block text-[9px] opacity-70">Conceptual questions</span>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setAiCategory('code')}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    aiCategory === 'code'
                                      ? 'bg-emerald-600/10 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                    aiCategory === 'code'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-450'
                                  }`}>
                                    <Heart className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="block text-xs font-bold">Code Practice</span>
                                    <span className="block text-[9px] opacity-70">Coding & scripting exercises</span>
                                  </div>
                                </button>
                              </div>
                            </div>

                            {aiType === 'essay' && (
                              <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                  Default Answer Format
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setAiDefaultAnswerFormat('text')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                                      aiDefaultAnswerFormat === 'text'
                                        ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/30'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                    }`}
                                  >
                                    <span className="text-lg mb-1">📝</span>
                                    <span className="block text-xs font-bold">Text Only</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setAiDefaultAnswerFormat('file')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                                      aiDefaultAnswerFormat === 'file'
                                        ? 'bg-amber-600/10 border-amber-500 text-white ring-1 ring-amber-500/30'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                    }`}
                                  >
                                    <span className="text-lg mb-1">📎</span>
                                    <span className="block text-xs font-bold">File Only</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setAiDefaultAnswerFormat('both')}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                                      aiDefaultAnswerFormat === 'both'
                                        ? 'bg-purple-600/10 border-purple-500 text-white ring-1 ring-purple-500/30'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                                    }`}
                                  >
                                    <span className="text-lg mb-1">🔀</span>
                                    <span className="block text-xs font-bold">Both</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Difficulty Level Button Group */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                Difficulty Level
                              </label>
                              <div className="grid grid-cols-3 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setAiDifficulty('easy')}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                    aiDifficulty === 'easy'
                                      ? 'bg-emerald-600/10 border-emerald-500 text-white ring-1 ring-emerald-500/30 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="block text-xs">🟢 Easy</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiDifficulty('medium')}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                    aiDifficulty === 'medium'
                                      ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/30 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="block text-xs">🔵 Medium</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiDifficulty('hard')}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                    aiDifficulty === 'hard'
                                      ? 'bg-rose-600/10 border-rose-500 text-white ring-1 ring-rose-500/30 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="block text-xs">🔴 Hard</span>
                                </button>
                              </div>
                            </div>

                            {/* Output Language Button Group */}
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                Output Language
                              </label>
                              <div className="grid grid-cols-3 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setAiLanguage('vietnamese')}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                    aiLanguage === 'vietnamese'
                                      ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/30 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="block text-xs"> Tiếng Việt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiLanguage('english')}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                    aiLanguage === 'english'
                                      ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/30 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="block text-xs">🇺🇸 English</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiLanguage('both')}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[60px] ${
                                    aiLanguage === 'both'
                                      ? 'bg-purple-600/10 border-purple-500 text-white ring-1 ring-purple-500/30 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="block text-xs">🌐 Bilingual</span>
                                </button>
                              </div>
                            </div>

                            {/* Optional Sample Data Toggle */}
                            <div className="flex items-center gap-3 pt-2 border-t border-slate-850">
                              <input
                                type="checkbox"
                                id="modal_ai_sample_data"
                                checked={aiSampleData}
                                onChange={(e) => setAiSampleData(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer"
                              />
                              <label htmlFor="modal_ai_sample_data" className="text-xs text-slate-350 cursor-pointer select-none">
                                Include sample output or test case templates for student answers
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Centered Large Generate Button Section */}
                        <div className="col-span-1 md:col-span-12 border-t border-slate-850 pt-6 flex flex-col items-center space-y-3">
                          {materials.length > 0 && aiSelectedMaterials.length === 0 && (
                            <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex items-center gap-1.5 animate-bounce">
                              ⚠️ Please select at least 1 source material to proceed
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={materials.length > 0 && aiSelectedMaterials.length === 0}
                            onClick={handleStartGenerating}
                            className={`group relative px-12 py-4 text-white rounded-2xl text-sm font-bold shadow-xl transition-all duration-300 flex items-center gap-3 overflow-hidden ${
                              materials.length > 0 && aiSelectedMaterials.length === 0
                                ? 'bg-slate-800 border border-slate-700 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 hover:scale-[1.03]'
                            }`}
                          >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <Sparkles className="w-5 h-5 text-white animate-pulse group-hover:rotate-12 transition-transform duration-300" />
                            <span>Generate Assignment</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

              {/* STEP 2: GENERATING LOAD SCREEN */}
              {modalStep === 2 && (
                <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-lg mx-auto w-full animate-fade-in">
                  <div className="w-full bg-slate-955 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                      <div className="relative flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                        Generating Assignment...
                      </h4>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Step 1: Reading Materials */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          {genStage === 'reading' ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                          ) : readingDuration !== null ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-700 inline-block shrink-0" />
                          )}
                          <span className={`font-semibold ${genStage === 'reading' ? 'text-slate-100' : 'text-slate-400'}`}>
                            Reading selected materials...
                            {genStage === 'reading' && ` (${((genElapsed) / 1000).toFixed(1)}s)`}
                            {readingDuration !== null && ` (${(readingDuration / 1000).toFixed(1)}s)`}
                          </span>
                        </div>
                        {readingDuration !== null && (
                          <div className="pl-7 text-[11px] text-slate-500">
                            ✓ Materials loaded ({(() => {
                              const selected = materials.filter(m => aiSelectedMaterials.includes(m.id))
                              const fileCount = selected.length
                              const totalBytes = selected.reduce((sum, m) => sum + (m.metadata?.file_size || 0), 0)
                              const sizeStr = totalBytes < 1024 * 1024
                                ? `${(totalBytes / 1024).toFixed(1)} KB`
                                : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
                              return `${fileCount} file${fileCount > 1 ? 's' : ''}, ${sizeStr}`
                            })()})
                          </div>
                        )}
                      </div>

                      {/* Step 2: Generating Questions */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          {genStage === 'generating' ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                          ) : generatingDuration !== null ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-700 inline-block shrink-0" />
                          )}
                          <span className={`font-semibold ${genStage === 'generating' ? 'text-slate-100' : 'text-slate-400'}`}>
                            Generating questions...
                            {genStage === 'generating' && ` (${((genElapsed - (readingDuration || 0)) / 1000).toFixed(1)}s)`}
                            {generatingDuration !== null && ` (${(generatingDuration / 1000).toFixed(1)}s)`}
                          </span>
                        </div>
                      </div>

                      {/* Step 3: Creating Sample Data */}
                      {aiSampleData && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            {genStage === 'sample_data' ? (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                            ) : sampleDataDuration !== null ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-700 inline-block shrink-0" />
                            )}
                            <span className={`font-semibold ${genStage === 'sample_data' ? 'text-slate-100' : 'text-slate-400'}`}>
                              Creating sample data...
                              {genStage === 'sample_data' && ` (${((genElapsed - (readingDuration || 0) - (generatingDuration || 0)) / 1000).toFixed(1)}s)`}
                              {sampleDataDuration !== null && ` (${(sampleDataDuration / 1000).toFixed(1)}s)`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500 font-mono">
                      <span>ELAPSED TIME</span>
                      <span className="font-bold text-slate-300">{((genElapsed) / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & APPROVE MULTIPLE BATCHES */}
              {modalStep === 3 && batches.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-900 text-slate-100">
                  {/* Top Bar: Batch Selector tabs */}
                  <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0">
                    {batches.map((batch, idx) => {
                      const isActive = idx === activeBatchIndex
                      return (
                        <button
                          key={batch.id || idx}
                          type="button"
                          onClick={() => {
                            setActiveBatchIndex(idx)
                            setActiveQuestionIndex(0)
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm ring-1 ring-blue-500/25'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            Batch {idx + 1}: {batch.type === 'multiple_choice' ? 'MC' : 'Essay'} {batch.category === 'theory' ? 'Theory' : 'Code'} ({batch.questions.length} Qs)
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Main List: Scrollable Questions Overview */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    {(() => {
                      const activeBatch = batches[activeBatchIndex]
                      if (!activeBatch || !activeBatch.questions || activeBatch.questions.length === 0) {
                        return (
                          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs py-12">
                            No questions available in this batch.
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-4 max-w-4xl mx-auto">
                          {activeBatch.questions.map((q, qIdx) => (
                            <div
                              key={q.id || qIdx}
                              className="p-5 bg-slate-955 border border-slate-800 rounded-2xl space-y-4 animate-fade-in relative hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                  Question {qIdx + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                  {q.source === 'file_import' && (
                                    <span className="text-[10px] bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded font-semibold border border-indigo-500/20 max-w-[200px] truncate">
                                      Source: {q.source_file || 'File Import'}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    q.status === 'approved'
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : q.status === 'rejected'
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    {q.status}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {q.content}
                                </p>

                                {/* Options if MC */}
                                {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                                    {q.options.map((opt, oIdx) => {
                                      const letter = String.fromCharCode(65 + oIdx)
                                      const isCorrect = q.answer === letter
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                                            isCorrect
                                              ? 'bg-emerald-600/5 border-emerald-500/30 text-slate-200 font-bold'
                                              : 'bg-slate-900 border-slate-850 text-slate-400'
                                          }`}
                                        >
                                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center font-extrabold text-[10px] shrink-0 ${
                                            isCorrect
                                              ? 'bg-emerald-500 border-emerald-500 text-white'
                                              : 'border-slate-700 text-slate-550'
                                          }`}>
                                            {letter}
                                          </span>
                                          <span className={isCorrect ? 'text-slate-200' : ''}>{cleanOptionText(opt, oIdx)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* Answer */}
                                {q.answer && (
                                  <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 font-medium">
                                    Correct Answer: {q.answer}
                                  </div>
                                )}

                                {/* Sample Data attached if exists */}
                                {q.data && (
                                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-[10px] text-slate-450 font-mono overflow-x-auto max-h-40 overflow-y-auto">
                                    <span className="block font-bold text-slate-355 uppercase tracking-widest mb-1 text-[9px]">Sample Data Attached</span>
                                    <pre>{JSON.stringify(q.data, null, 2)}</pre>
                                  </div>
                                )}
                              </div>

                              {/* Answer Format per-question override radio group */}
                              {activeBatch.type === 'essay' && (
                                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono select-none">
                                    Answer Format
                                  </span>
                                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-350 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === undefined}
                                        onChange={() => handleQuestionFormatOverride(qIdx, undefined)}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 cursor-pointer"
                                      />
                                      <span>
                                        Inherited:{' '}
                                        <strong className="text-slate-200 font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-slate-955 border border-slate-800">
                                          {activeBatch.defaultAnswerFormat === 'text' && '📝 Text Only'}
                                          {activeBatch.defaultAnswerFormat === 'file' && '📎 File Only'}
                                          {activeBatch.defaultAnswerFormat === 'both' && '🔀 Both'}
                                        </strong>
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-350 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === 'text'}
                                        onChange={() => handleQuestionFormatOverride(qIdx, 'text')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 cursor-pointer"
                                      />
                                      <span>📝 Text Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-350 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === 'file'}
                                        onChange={() => handleQuestionFormatOverride(qIdx, 'file')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 cursor-pointer"
                                      />
                                      <span>📎 File Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-350 hover:text-slate-100 transition-colors">
                                      <input
                                        type="radio"
                                        name={`q-format-${qIdx}-${activeBatch.id}`}
                                        checked={q.answerFormat === 'both'}
                                        onChange={() => handleQuestionFormatOverride(qIdx, 'both')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-700 cursor-pointer"
                                      />
                                      <span>🔀 Both</span>
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* Inline action buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-850/60">
                                <button
                                  type="button"
                                  onClick={() => handleInlineApprove(activeBatchIndex, qIdx)}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                                    q.status === 'approved'
                                      ? 'bg-emerald-600 text-white shadow-lg'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-500 border border-slate-800'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInlineReject(activeBatchIndex, qIdx)}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                                    q.status === 'rejected'
                                      ? 'bg-rose-600 text-white shadow-lg'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-800'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={regeneratingIndex === qIdx}
                                  onClick={() => {
                                    setRegeneratingIndex(qIdx)
                                    handleRegenerateQuestion(activeBatchIndex, qIdx).finally(() => setRegeneratingIndex(null))
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingIndex === qIdx ? 'animate-spin' : ''}`} />
                                  Regen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestion({
                                      ...q,
                                      options: q.options && Array.isArray(q.options)
                                        ? q.options.map((opt: string, oIdx: number) => cleanOptionText(opt, oIdx))
                                        : undefined
                                    })
                                    setEditingBatchIndex(activeBatchIndex)
                                    setEditingQuestionIndex(qIdx)
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-xs flex items-center gap-1 transition-all"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(activeBatchIndex, qIdx)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-650/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 font-bold text-xs flex items-center gap-1 transition-all ml-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Bottom Stats & Actions bar */}
                  {(() => {
                    const activeBatch = batches[activeBatchIndex]
                    if (!activeBatch) return null

                    const totalQs = activeBatch.questions.length
                    const approvedQs = activeBatch.questions.filter(q => q.status === 'approved').length
                    const pendingQs = activeBatch.questions.filter(q => q.status === 'pending').length
                    const rejectedQs = activeBatch.questions.filter(q => q.status === 'rejected').length

                    return (
                      <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-955 px-6 py-4 shrink-0">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                          <span>Active Batch Stats:</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold">Total: {totalQs}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold">{approvedQs} Approved</span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">{pendingQs} Pending</span>
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold">{rejectedQs} Rejected</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleRegenAllRejected}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Regen All Rejected
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBatches(prev => {
                                const next = [...prev]
                                if (next[activeBatchIndex]) {
                                  next[activeBatchIndex] = {
                                    ...next[activeBatchIndex],
                                    questions: next[activeBatchIndex].questions.map(q => ({ ...q, status: 'approved' as const }))
                                  }
                                }
                                return next
                              })
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Approve All
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveQuestionsToAssignment}
                            className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <FileCheck className="w-4 h-4" />
                            Save to Assignment
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Summary Modal */}
      {showBatchSummaryModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  📋 All Batches
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBatchSummaryModal(false)
                  setPreviewBatchIndex(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-205 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
              {batches.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No batches generated or imported yet. Create one in Tab 2.
                </div>
              ) : (
                <div className="space-y-4">
                  {batches.map((batch, bIdx) => {
                    const approved = batch.questions.filter(q => q.status === 'approved').length
                    const pending = batch.questions.filter(q => q.status === 'pending').length
                    const rejected = batch.questions.filter(q => q.status === 'rejected').length
                    const typeText = batch.type === 'multiple_choice' ? 'MC' : 'Essay'
                    const categoryText = batch.category === 'theory' ? 'Theory' : 'Code'
                    const isFileImport = batch.questions.some(q => q.source === 'file_import')
                    const sourceText = isFileImport ? `From: ${batch.questions.find(q => q.source_file)?.source_file || 'File'}` : 'AI Generated'
                    const isExpanded = previewBatchIndex === bIdx

                    return (
                      <div key={batch.id || bIdx} className="p-4 bg-slate-955/40 border border-slate-800 rounded-xl relative group transition-all hover:border-slate-700 flex flex-col justify-between shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="block text-xs font-bold text-slate-250">
                              Batch {bIdx + 1}: {typeText} {categoryText} ({batch.questions.length} questions)
                            </span>
                            <span className="block text-[10px] text-slate-505 font-medium truncate max-w-[300px]" title={sourceText}>
                              Source: {sourceText}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewBatchIndex(isExpanded ? null : bIdx)
                              }}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-300 hover:text-slate-100 transition-colors animate-fade-in"
                            >
                              {isExpanded ? 'Hide Questions' : 'View Questions'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBatchIndex(bIdx)
                                setActiveQuestionIndex(0)
                                setModalStep(3)
                                setShowAiModal(true)
                                setShowBatchSummaryModal(false)
                                setPreviewBatchIndex(null)
                              }}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-blue-450 hover:text-blue-400 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteBatch(bIdx)
                                if (isExpanded) setPreviewBatchIndex(null)
                              }}
                              className="px-2 py-1 rounded bg-rose-650/10 border border-rose-500/20 text-[10px] font-bold text-rose-500 hover:bg-rose-650/20 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                          <span className="text-[10px] text-slate-400 font-mono">
                            ✅ <strong className="text-emerald-500">{approved}</strong> | ⏳ <strong className="text-amber-500">{pending}</strong> | ✗ <strong className="text-rose-500">{rejected}</strong>
                          </span>
                        </div>

                        {/* Inline Read-only Accordion Question Preview */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 pl-2 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Read-only Question Preview:</span>
                            {batch.questions.map((q, qIdx) => (
                              <div key={q.id || qIdx} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-slate-405 font-bold font-mono">Q{qIdx + 1}. {q.status.toUpperCase()}</span>
                                  {q.points && <span className="text-[9px] text-slate-500">{q.points} pts</span>}
                                </div>
                                <p className="text-slate-205 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{q.content}</p>
                                {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                    {q.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="text-[10px] text-slate-400">
                                        <strong className="text-blue-500 font-bold">{String.fromCharCode(65 + oIdx)}.</strong> {cleanOptionText(opt, oIdx)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.answer && (
                                  <div className="text-[10px] text-emerald-500 font-mono pt-1">
                                    Answer Key: {q.answer}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-between items-center shrink-0 text-xs font-semibold text-slate-400">
              <div>
                Total: <strong className="text-slate-202">{batches.reduce((acc, b) => acc + b.questions.length, 0)}</strong> questions (<strong className="text-emerald-500">{batches.reduce((acc, b) => acc + b.questions.filter(q => q.status === 'approved').length, 0)}</strong> approved)
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBatchSummaryModal(false)
                  setPreviewBatchIndex(null)
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && editingBatchIndex !== null && editingQuestionIndex !== null && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Edit Question
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null)
                  setEditingBatchIndex(null)
                  setEditingQuestionIndex(null)
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs text-slate-205">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Question Content
                </label>
                <textarea
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 h-24"
                />
              </div>

              {editingQuestion.options && Array.isArray(editingQuestion.options) && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex justify-between items-center">
                    <span>Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        const opts = [...(editingQuestion.options || [])]
                        opts.push(`Option ${opts.length + 1}`)
                        setEditingQuestion({ ...editingQuestion, options: opts })
                      }}
                      className="text-[9px] text-blue-500 hover:text-blue-450 font-bold"
                    >
                      + Add Option
                    </button>
                  </label>
                  <div className="space-y-2">
                    {editingQuestion.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx)
                      return (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-500 w-4">{letter}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...(editingQuestion.options || [])]
                              opts[oIdx] = e.target.value
                              setEditingQuestion({ ...editingQuestion, options: opts })
                            }}
                            className="flex-1 bg-slate-955 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-250 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const opts = [...(editingQuestion.options || [])]
                              opts.splice(oIdx, 1)
                              setEditingQuestion({ ...editingQuestion, options: opts })
                            }}
                            className="p-1.5 hover:bg-slate-850 rounded text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Correct Answer
                  </label>
                  {editingQuestion.options && Array.isArray(editingQuestion.options) ? (
                    <select
                      value={editingQuestion.answer || 'A'}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      {editingQuestion.options.map((_, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx)
                        return (
                          <option key={letter} value={letter}>
                            Option {letter}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingQuestion.answer || ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      placeholder="Suggested answer/criteria"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Points (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingQuestion.points || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      setEditingQuestion({ ...editingQuestion, points: val > 0 ? val : undefined })
                    }}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null)
                  setEditingBatchIndex(null)
                  setEditingQuestionIndex(null)
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleEditSave(editingBatchIndex, editingQuestionIndex, editingQuestion)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LessonEditor() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm p-8">Loading workspace...</div>}>
      <LessonEditorInner />
    </Suspense>
  )
}
