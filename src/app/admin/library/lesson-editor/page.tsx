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
  generateRubricAction
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
  Globe
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
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash')
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

  const handleOpenStudentPreview = async () => {
    setPreviewUrlStatus({ loading: true, startedAt: Date.now(), elapsed: '0.0s' })
    setShowStudentPreview(true)
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
          instructions: activeAs.instructions,
          maxScore: activeAs.max_score,
          maxFiles: activeAs.max_files || 3,
          maxTotalSizeMb: activeAs.max_total_size_mb || 50,
          autoPublishGrades: activeAs.auto_publish_grades || false,
          gracePeriodHours: policy.grace_period_hours || 0,
          penaltyPercentPerDay: policy.penalty_percent_per_day || 0
        })
        setSolutionStoragePath(activeAs.solution_storage_path || '')
        setPromptStoragePath(activeAs.prompt_file_path || '')
        setSelectedModel(activeAs.ai_model_used || 'gemini-1.5-flash')

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
        if (!assignmentForm.title || !assignmentForm.instructions) {
          throw new Error('Assignment title and guidelines are required.')
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
          const hash = await calculateFileHash(promptFile)
          const ext = promptFile.name.split('.').pop()
          const fileName = `prompts/${lessonId}_${hash}.${ext}`

          const formData = new FormData()
          formData.append('bucket', 'teaching-materials')
          formData.append('path', fileName)
          formData.append('file', promptFile)
          formData.append('upsert', 'true')

          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Assignment prompt upload failed: ${uploadRes.error}`)
          }

          finalPromptPath = fileName
          isNewPromptUpload = true
        }

        // 2b. Upload Solution File if manual mode
        if (solutionMode === 'upload' && solutionFile) {
          const hash = await calculateFileHash(solutionFile)
          const ext = solutionFile.name.split('.').pop()
          const fileName = `solutions/${lessonId}_${hash}.${ext}`

          const formData = new FormData()
          formData.append('bucket', 'assignment-solutions')
          formData.append('path', fileName)
          formData.append('file', solutionFile)
          formData.append('upsert', 'true')

          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Solution upload failed: ${uploadRes.error}`)
          }

          finalSolutionPath = fileName
          isNewSolutionUpload = true
        }

        // 3. Save Assignment + Rubric Snapshots
        const assignmentPayload: any = {
          id: assignmentId || undefined,
          lessonId,
          title: assignmentForm.title,
          instructions: assignmentForm.instructions,
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
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="ollama">Ollama (llama3.2)</option>
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
                    onClick={handleOpenStudentPreview}
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
                      onClick={() => setHasAssignment(true)}
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Assignment Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={assignmentForm.title}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
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
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Guidelines & Instructions *
                    </label>
                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-955/20">
                      <RichTextEditor
                        content={assignmentForm.instructions}
                        onChange={(c) => setAssignmentForm({ ...assignmentForm, instructions: c })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs">
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
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
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
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
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
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
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
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none"
                    />
                    <p className="mt-1.5 text-[10px] text-slate-500 italic leading-relaxed">
                      Note: Assignment due dates are configured per cohort under Class Schedules. Grace Hours and Late Penalty settings configured here will apply relative to those deadlines.
                    </p>
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
                            : 'bg-slate-955 border-slate-700 text-slate-400 hover:text-slate-350'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Assignment Prompt File Upload Option */}
                  <div className="space-y-2 pt-4 border-t border-slate-700">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Upload Assignment Prompt File (Optional PDF/DOCX task sheet)
                    </label>
                    <div className="border border-dashed border-slate-700 bg-slate-955/20 p-5 rounded-xl text-center space-y-2">
                      <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                      <input
                        type="file"
                        onChange={(e) => setPromptFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-400 mx-auto block max-w-xs cursor-pointer"
                      />
                      {promptStoragePath && (
                        <span className="block text-[10px] text-emerald-600 font-medium">
                          Current uploaded prompt: {promptStoragePath.split('/').pop()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs">
                  This lesson does not have any assignment. Enable it above to configure.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOLUTION KEY */}
          {currentStep === 3 && (
            <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Assignment Solution Key
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSolutionMode('ai')}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      solutionMode === 'ai' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    AI Generator
                  </button>
                  <button
                    onClick={() => setSolutionMode('upload')}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      solutionMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Manual Upload
                  </button>
                </div>
              </div>

              {solutionMode === 'upload' ? (
                <div className="space-y-4 text-xs">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Upload Solution PDF / Code key
                  </label>
                  <div className="border border-dashed border-slate-700 bg-slate-950/20 p-8 rounded-xl text-center space-y-2">
                    <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                    <input
                      type="file"
                      onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-400 mx-auto block max-w-xs"
                    />
                    {solutionStoragePath && (
                      <span className="block text-[10px] text-emerald-600">
                        Current file path: {solutionStoragePath}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      AI Generated Solution Draft (Markdown)
                    </label>
                    <button
                      onClick={handleGenerateAISolution}
                      disabled={generatingSolution}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1"
                    >
                      {generatingSolution ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-indigo-600" />}
                      <span>Generate Solution</span>
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    placeholder="Click 'Generate Solution' or type manual keys..."
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RUBRIC GENERATOR */}
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
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-650 text-slate-350 hover:text-slate-200 font-semibold text-xs transition-all"
              >
                {saving ? 'Saving...' : 'Save Draft'}
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

      {/* Student View Simulator Modal */}
      {showStudentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  Student View Simulator
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This simulates what students see when accessing this lesson.
                </p>
              </div>
              <button
                onClick={() => setShowStudentPreview(false)}
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

                {/* 1. Deliverables Card CTA */}
                {hasAssignment && (
                  <div className="border border-indigo-500/20 bg-slate-950/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                          Lesson Deliverables: {assignmentForm.title || 'Assignment'}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Max Score: {assignmentForm.maxScore} pts | Files: Max {assignmentForm.maxFiles}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-[10px] uppercase tracking-wider select-none shrink-0">
                      Submit Deliverables
                    </div>
                  </div>
                )}

                {/* 2. Resources & Repositories list */}
                <div className="border border-slate-800 bg-slate-950/10 rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-slate-100 text-xs pb-2 border-b border-slate-800">
                    Resources & Repositories
                  </h3>
                  {materials.filter((m) => ['link', 'code_repo'].includes(m.type)).length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No additional links mapped to this lesson.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {materials
                        .filter((m) => ['link', 'code_repo'].includes(m.type))
                        .map((m) => {
                          const isRepo = m.type === 'code_repo'
                          const styles = getMaterialTypeStyles(m.type)
                          const Icon = getMaterialIcon(m.type)
                          return (
                            <a
                              key={m.id}
                              href={m.storage_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all group"
                            >
                              <div className={`w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center ${styles.iconColor} transition-colors`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-slate-200 truncate group-hover:text-slate-100 transition-colors">
                                  {m.title}
                                </span>
                                <span className={`inline-block text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold mt-1 ${styles.bg}`}>
                                  {isRepo ? 'Git Repository' : 'External Link'}
                                </span>
                              </div>
                            </a>
                          )
                        })}
                    </div>
                  )}
                </div>

                {/* 3. Grid-Mapped File Previews */}
                <div className={`grid gap-6 ${getGridColsClass(gridLayout)}`}>
                  {Array.from({ length: getLayoutCellCount(gridLayout) }).map((_, colIdx) => {
                    const colMaterialsList = Array.isArray(cellMaterials[colIdx]) ? cellMaterials[colIdx] : []
                    return (
                      <div key={colIdx} className={`space-y-6 flex flex-col ${getCellSpanClass(gridLayout, colIdx)}`}>
                        {colMaterialsList.length > 0 ? (
                          colMaterialsList.map((material: any) => (
                            <div key={material.id}>
                              {renderMaterialPreviewCard(material)}
                            </div>
                          ))
                        ) : (
                          <div className="border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center text-slate-500 text-xs">
                            <Upload className="w-5 h-5 mb-2 text-slate-600 animate-pulse" />
                            <span>Empty Column {colIdx + 1}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 4. Unplaced Fallback Materials */}
                {(() => {
                  const unplaced = materials.filter(m => 
                    ['pdf', 'docx', 'csv', 'xlsx', 'markdown', 'json'].includes(m.type) &&
                    !Object.values(cellMaterials).some((colList: any) => 
                      Array.isArray(colList) && colList.some((item: any) => item?.id === m.id)
                    )
                  )
                  if (unplaced.length === 0) return null
                  return (
                    <div className="pt-8 border-t border-slate-800 grid grid-cols-1 gap-6">
                      {unplaced.map((m) => renderMaterialPreviewCard(m))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowStudentPreview(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-all"
              >
                Close Preview
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
