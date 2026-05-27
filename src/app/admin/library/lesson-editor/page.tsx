'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RichTextEditor from '@/components/RichTextEditor'
import { calculateFileHash } from '@/lib/hash'
import {
  checkMaterialDeduplication,
  registerCanonicalMaterial,
  uploadFileToStorageAction,
  deleteFileFromStorageAction,
  updateMaterialDisplayModeAction
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
  BookOpen
} from 'lucide-react'

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
    type: 'pdf' as 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link',
    linkUrl: '',
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [showMaterialForm, setShowMaterialForm] = useState(false)

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

  const handleFileSelection = (file: File) => {
    setUploadFile(file)
    const ext = file.name.split('.').pop()?.toLowerCase()
    let detectedType: 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link' = 'pdf'
    if (ext === 'pdf') detectedType = 'pdf'
    else if (ext === 'docx') detectedType = 'docx'
    else if (ext === 'csv') detectedType = 'csv'
    else if (ext === 'xlsx' || ext === 'xls') detectedType = 'xlsx'
    else if (ext === 'zip' || ext === 'js' || ext === 'py' || ext === 'ts') detectedType = 'code_repo'
    else if (ext === 'json') detectedType = 'flow_diagram'

    setMaterialForm({
      title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
      type: detectedType,
      linkUrl: ''
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
          .order('created_at'),
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
  }, [title, content, materials, hasAssignment, assignmentForm, solutionMode, solutionText, criteriaList])

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
    }
  }

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialForm.title || !lessonId) return

    setUploading(true)
    let isNewUpload = false
    let finalStorageUrl = ''
    try {
      let calculatedHash: string | undefined = undefined
      const isFileType = ['pdf', 'docx', 'csv', 'xlsx'].includes(materialForm.type)

      if (isFileType) {
        if (!uploadFile) {
          alert(`Please select a ${materialForm.type.toUpperCase()} file to upload`)
          setUploading(false)
          return
        }

        const hash = await calculateFileHash(uploadFile)
        calculatedHash = hash

        const duplicate = await checkMaterialDeduplication(hash)
        if (duplicate) {
          alert(`Deduplication: Duplicate asset "${duplicate.title}" detected. Reusing existing file storage url!`)
          finalStorageUrl = duplicate.storage_url
        } else {
          const ext = uploadFile.name.split('.').pop()
          const subjectSlug = lesson.modules.courses.subjects.slug
          const courseSlug = lesson.modules.courses.slug
          const lessonOrder = String(lesson.order_index).padStart(2, '0')
          const fileName = `subjects/${subjectSlug}/${courseSlug}/${lessonOrder}_${hash}.${ext}`

          const formData = new FormData()
          formData.append('bucket', 'teaching-materials')
          formData.append('path', fileName)
          formData.append('file', uploadFile)
          formData.append('upsert', 'false')

          const uploadRes = await uploadFileToStorageAction(formData)
          if (!uploadRes.success) {
            throw new Error(`Upload failed: ${uploadRes.error}`)
          }

          finalStorageUrl = fileName
          isNewUpload = true
        }
      } else {
        if (!materialForm.linkUrl) {
          alert('Please specify a URL link')
          setUploading(false)
          return
        }
        finalStorageUrl = materialForm.linkUrl
      }

      const regRes = await registerCanonicalMaterial({
        lessonId,
        title: materialForm.title,
        type: materialForm.type,
        storageUrl: finalStorageUrl,
        fileHash: calculatedHash,
      })

      if (!regRes.success) {
        throw new Error(regRes.error)
      }

      setMaterialForm({ title: '', type: 'pdf', linkUrl: '' })
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
          version: (lesson.version || 1) + 1,
        })
        .eq('id', lessonId)

      if (lessonErr) throw lessonErr

      if (hasAssignment) {
        if (!assignmentForm.title || !assignmentForm.instructions) {
          throw new Error('Assignment title and guidelines are required.')
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
    }
  }

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'docx':
        return FileText
      case 'csv':
      case 'xlsx':
        return FileDown
      case 'code_repo':
        return CodeIcon
      case 'flow_diagram':
        return Network
      default:
        return LinkIcon
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
            className="p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
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
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none hover:border-slate-700 transition-colors"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="ollama">Ollama (llama3.2)</option>
            </select>
          </div>

          <button
            onClick={handleSaveComposer}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Session Draft
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspace Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: LESSON MATERIALS & HANDOUTS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Lesson Heading Card */}
              <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Lesson Heading
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Handouts & Upload Card */}
              <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Handouts & Learning Materials
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Upload reading documents, code files, spreadsheets, or link websites.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMaterialForm({ title: '', type: 'pdf', linkUrl: '' })
                      setUploadFile(null)
                      setShowMaterialForm(!showMaterialForm)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 hover:border-slate-700 text-slate-350 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showMaterialForm ? 'Close Form' : 'Add Material'}</span>
                  </button>
                </div>

                {/* Form or Upload Drag and Drop Zone */}
                {showMaterialForm ? (
                  <form onSubmit={handleCreateMaterial} className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Material Title
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tutorial Slides"
                          value={materialForm.title}
                          onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Material Format
                        </label>
                        <select
                          value={materialForm.type}
                          onChange={(e: any) => setMaterialForm({ ...materialForm, type: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                        >
                          <option value="pdf">PDF Document</option>
                          <option value="docx">Word DOCX</option>
                          <option value="csv">CSV Sheet</option>
                          <option value="xlsx">Excel XLSX</option>
                          <option value="code_repo">Code Scripts (GitHub/Zip)</option>
                          <option value="flow_diagram">Flowchart Map (JSON)</option>
                          <option value="link">External Website Link</option>
                        </select>
                      </div>
                    </div>

                    {['pdf', 'docx', 'csv', 'xlsx'].includes(materialForm.type) ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Upload File
                        </label>
                        <div className="border border-dashed border-slate-700 bg-slate-950/20 p-6 rounded-xl text-center space-y-2">
                          <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                          <input
                            type="file"
                            onChange={handleFileInputChange}
                            className="text-xs text-slate-400 mx-auto block cursor-pointer"
                          />
                          {uploadFile && (
                            <span className="block text-[10px] text-emerald-400">
                              Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Link URL Address
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://example.com"
                          value={materialForm.linkUrl}
                          onChange={(e) => setMaterialForm({ ...materialForm, linkUrl: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMaterialForm(false)
                          setUploadFile(null)
                        }}
                        className="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Map File</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Drag & Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all min-h-[170px] ${
                        dragActive
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 bg-slate-950/20 hover:border-slate-700'
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
                      <p className="text-xs font-semibold text-white">
                        Drag and drop your learning material here
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supports PDF, Word (DOCX), CSV, Excel (XLSX), Code repos, Flowcharts
                      </p>
                      <span className="mt-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-medium text-slate-400">
                        Or click to browse files
                      </span>
                    </div>

                    {/* Mapped Resource List */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Currently Mapped Resources
                      </h4>
                      {materials.length === 0 ? (
                        <div className="text-center py-10 border border-slate-700 rounded-xl bg-slate-950/10 text-slate-500 text-[10px]">
                          No mapped resources. Drag a file on the left or add one manually.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                          {materials.map((m) => {
                            const Icon = getMaterialIcon(m.type)
                            return (
                              <div
                                key={m.id}
                                className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950/40 border border-slate-700 hover:border-slate-700 transition-all text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Icon className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                                  <span className="text-slate-300 truncate font-medium">{m.title}</span>
                                  <span className="text-[10px] uppercase tracking-wider bg-slate-950 px-1.5 py-0.5 rounded text-slate-450 border border-slate-700">
                                    {m.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      setVerifyMaterial(m)
                                      setVerifyDisplayMode(m.metadata?.display_mode || 'both')
                                    }}
                                    className="text-slate-400 hover:text-blue-500 p-0.5 transition-colors"
                                    title="Verify & Configure"
                                    type="button"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMaterial(m.id)}
                                    className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                                    title="Delete"
                                    type="button"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Lecture Content Card */}
              <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Lecture Content Editor
                </label>
                <RichTextEditor content={content} onChange={setContent} />
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNMENT DETAILS */}
          {currentStep === 2 && (
            <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Assignment Parameters
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    id="has_assignment_toggle"
                    type="checkbox"
                    checked={hasAssignment}
                    onChange={(e) => setHasAssignment(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-900 focus:ring-blue-500/50 cursor-pointer"
                  />
                  <label htmlFor="has_assignment_toggle" className="text-xs font-semibold text-slate-350 cursor-pointer">
                    Enable assignment for this lesson
                  </label>
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
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Max Score *
                      </label>
                      <input
                        type="number"
                        required
                        value={assignmentForm.maxScore}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: parseInt(e.target.value) || 100 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Guidelines & Instructions *
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Specify task guidelines, question statements, expected formats..."
                      value={assignmentForm.instructions}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Max Files
                      </label>
                      <input
                        type="number"
                        value={assignmentForm.maxFiles}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, maxFiles: parseInt(e.target.value) || 3 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Max Size (MB)
                      </label>
                      <input
                        type="number"
                        value={assignmentForm.maxTotalSizeMb}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, maxTotalSizeMb: parseInt(e.target.value) || 50 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Grace Hours
                      </label>
                      <input
                        type="number"
                        value={assignmentForm.gracePeriodHours}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, gracePeriodHours: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Late Penalty (%/day)
                    </label>
                    <input
                      type="number"
                      value={assignmentForm.penaltyPercentPerDay}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, penaltyPercentPerDay: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="asg_auto_pub"
                      type="checkbox"
                      checked={assignmentForm.autoPublishGrades}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, autoPublishGrades: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 text-blue-600 bg-slate-900 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <label htmlFor="asg_auto_pub" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                      Auto-Publish Grades
                    </label>
                  </div>

                  {/* Assignment Prompt File Upload Option */}
                  <div className="space-y-2 pt-4 border-t border-slate-700">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Upload Assignment Prompt File (Optional PDF/DOCX task sheet)
                    </label>
                    <div className="border border-dashed border-slate-700 bg-slate-950/20 p-5 rounded-xl text-center space-y-2">
                      <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                      <input
                        type="file"
                        onChange={(e) => setPromptFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-400 mx-auto block max-w-xs cursor-pointer"
                      />
                      {promptStoragePath && (
                        <span className="block text-[10px] text-emerald-400 font-medium">
                          Current uploaded prompt: {promptStoragePath.split('/').pop()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs">
                  This session does not have any assignment. Toggle checkbox above to include one.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOLUTION KEY */}
          {currentStep === 3 && (
            <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
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
                      <span className="block text-[10px] text-emerald-400">
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
                      {generatingSolution ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-indigo-400" />}
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
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
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
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white disabled:opacity-40"
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
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CodeIcon className="w-4 h-4" /> Regex sandbox matcher
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-450 uppercase mb-1">Select Metric</label>
                        <select
                          value={sandboxCriterionIdx}
                          onChange={(e) => setSandboxCriterionIdx(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
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
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-white"
                          />
                          <div className="flex items-center shrink-0">
                            {getSandboxResult() === null ? (
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">No rule</span>
                            ) : getSandboxResult() ? (
                              <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> MATCH
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] font-semibold flex items-center gap-1">
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
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-650 text-slate-400 hover:text-white font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveComposer}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-650 text-slate-350 hover:text-white font-semibold text-xs transition-all"
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
            <h3 className="text-xs font-bold text-white uppercase tracking-widest pb-2.5 border-b border-slate-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Verify Handout: {verifyMaterial.title}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Check the parsed results and configure how students can read this handout.
                </p>
              </div>
              <button
                onClick={() => setVerifyMaterial(null)}
                className="text-slate-400 hover:text-white text-xs transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-350">
              {/* Parse Preview */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Parsed Content Preview (Server Extraction)
                </span>
                
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto text-xs leading-relaxed">
                  {verifyMaterial.type === 'docx' ? (
                    verifyMaterial.metadata?.viewer_artifact?.viewer_html ? (
                      <div 
                        className="prose prose-invert max-w-none text-slate-300 text-xs"
                        dangerouslySetInnerHTML={{ __html: verifyMaterial.metadata.viewer_artifact.viewer_html }}
                      />
                    ) : (
                      <span className="text-slate-500 italic">No HTML parsing output generated for this Word document.</span>
                    )
                  ) : ['csv', 'xlsx'].includes(verifyMaterial.type) ? (
                    verifyMaterial.metadata?.viewer_artifact?.rows && verifyMaterial.metadata?.viewer_artifact?.rows.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-700 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-800 text-[10px]">
                          <thead className="bg-slate-900">
                            <tr>
                              {(verifyMaterial.metadata.viewer_artifact.headers || []).map((hdr: string, i: number) => (
                                <th key={i} className="px-3 py-1.5 text-left font-semibold text-slate-400 border-r border-slate-700 last:border-0 whitespace-nowrap">
                                  {hdr}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-950">
                            {(verifyMaterial.metadata.viewer_artifact.rows || []).slice(0, 15).map((row: any[], i: number) => (
                              <tr key={i} className="hover:bg-slate-900/50">
                                {row.map((cell: any, j: number) => (
                                  <td key={j} className="px-3 py-1.5 text-slate-300 border-r border-slate-700 last:border-0 whitespace-nowrap">
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
                      <LinkIcon className="w-8 h-8 text-slate-555" />
                      <span>External Resource Link</span>
                      <a href={verifyMaterial.storage_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline break-all">
                        {verifyMaterial.storage_url}
                      </a>
                    </div>
                  )}
                </div>
                {['csv', 'xlsx'].includes(verifyMaterial.type) && verifyMaterial.metadata?.viewer_artifact?.row_count > 15 && (
                  <span className="block text-xs text-slate-500 italic">
                    Showing first 15 of {verifyMaterial.metadata.viewer_artifact.row_count} rows.
                  </span>
                )}
              </div>

              {/* Student Display Mode settings */}
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Configure Student Visibility Option
                </span>
                <p className="text-[10px] text-slate-400">
                  Select what options should be visible to students in the class roadmap lessons page.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    verifyDisplayMode === 'both' 
                      ? 'bg-blue-600/10 border-blue-500 text-slate-250' 
                      : 'bg-slate-950/40 border-slate-700 text-slate-400 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <input
                        type="radio"
                        name="display_mode"
                        value="both"
                        checked={verifyDisplayMode === 'both'}
                        onChange={() => setVerifyDisplayMode('both')}
                        className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                      />
                      <span>Both (Default)</span>
                    </div>
                    <span className="block text-[10px] text-slate-400 mt-2">
                      Students can view the interactive preview AND download the original file.
                    </span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    verifyDisplayMode === 'web' 
                      ? 'bg-blue-600/10 border-blue-500 text-slate-250' 
                      : 'bg-slate-950/40 border-slate-700 text-slate-400 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <input
                        type="radio"
                        name="display_mode"
                        value="web"
                        checked={verifyDisplayMode === 'web'}
                        onChange={() => setVerifyDisplayMode('web')}
                        className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                      />
                      <span>Interactive Preview Only</span>
                    </div>
                    <span className="block text-[10px] text-slate-400 mt-2">
                      Students view the web reader but cannot download/access the original file.
                    </span>
                  </label>

                  <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    verifyDisplayMode === 'original' 
                      ? 'bg-blue-600/10 border-blue-500 text-slate-250' 
                      : 'bg-slate-950/40 border-slate-700 text-slate-400 hover:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <input
                        type="radio"
                        name="display_mode"
                        value="original"
                        checked={verifyDisplayMode === 'original'}
                        onChange={() => setVerifyDisplayMode('original')}
                        className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                      />
                      <span>File Download Only</span>
                    </div>
                    <span className="block text-[10px] text-slate-400 mt-2">
                      Students download the file directly, with no web-preview layout rendered.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-700 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setVerifyMaterial(null)}
                disabled={savingVerify}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-700 text-slate-400 hover:text-white font-semibold text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSavingVerify(true)
                  const res = await updateMaterialDisplayModeAction(verifyMaterial.id, verifyDisplayMode)
                  setSavingVerify(false)
                  if (res.success) {
                    alert('Student display mode configured successfully!')
                    setVerifyMaterial(null)
                    fetchLessonDetails()
                  } else {
                    alert(`Failed to save configuration: ${res.error}`)
                  }
                }}
                disabled={savingVerify}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
              >
                {savingVerify ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Save Settings</span>
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
