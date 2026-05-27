'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RichTextEditor from '@/components/RichTextEditor'
import { calculateFileHash } from '@/lib/hash'
import { checkMaterialDeduplication, registerCanonicalMaterial } from '@/app/admin/library/actions/materials'
import { saveAssignmentAction, deleteAssignmentAction } from '@/app/admin/library/actions/assignments'
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
} from 'lucide-react'

function LessonEditorInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lessonId = searchParams.get('lessonId')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

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

  // Assignments state
  const [assignments, setAssignments] = useState<any[]>([])
  const [rubrics, setRubrics] = useState<any[]>([])
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState({
    id: '',
    title: '',
    instructions: '',
    rubricId: '',
    maxScore: 100,
    maxFiles: 3,
    maxTotalSizeMb: 50,
    autoPublishGrades: false,
    gracePeriodHours: 0,
    penaltyPercentPerDay: 0
  })

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
        { data: rubricsData },
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
          .select('*, rubrics(id, title)')
          .eq('lesson_id', lessonId)
          .order('created_at'),
        supabase
          .from('rubrics')
          .select('id, title')
          .order('created_at', { ascending: false }),
      ])

      if (lessonData) {
        setLesson(lessonData)
        setTitle(lessonData.title)
        setContent(lessonData.content || '')
      }
      setMaterials(materialsData || [])
      setAssignments(assignmentsData || [])
      setRubrics(rubricsData || [])
    } catch (error) {
      console.error('Failed to load lesson metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLesson = async () => {
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
      alert('Lesson draft saved and version incremented!')
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

        // 1. Calculate File Hash
        const hash = await calculateFileHash(uploadFile)
        calculatedHash = hash

        // 2. Query Deduplication Check Server Action
        const duplicate = await checkMaterialDeduplication(hash)
        if (duplicate) {
          alert(`Deduplication: Duplicate asset "${duplicate.title}" detected. Reusing existing file storage URL!`)
          finalStorageUrl = duplicate.storage_url
        } else {
          // 3. Upload unique file to private bucket
          const ext = uploadFile.name.split('.').pop()
          const subjectSlug = lesson.modules.courses.subjects.slug
          const courseSlug = lesson.modules.courses.slug
          const lessonOrder = String(lesson.order_index).padStart(2, '0')
          const fileName = `subjects/${subjectSlug}/${courseSlug}/${lessonOrder}_${hash}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('teaching-materials')
            .upload(fileName, uploadFile, { upsert: false })

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`)
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

      // 4. Register in canonical_materials DB table
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

      // Reset Form & Refresh
      setMaterialForm({ title: '', type: 'pdf', linkUrl: '' })
      setUploadFile(null)
      setShowMaterialForm(false)
      fetchLessonDetails()
    } catch (err: any) {
      // Transactional cleanup rollback
      if (isNewUpload && finalStorageUrl) {
        try {
          await supabase.storage.from('teaching-materials').remove([finalStorageUrl])
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

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignmentForm.title || !lessonId || !assignmentForm.instructions) return

    setSavingAssignment(true)
    try {
      const res = await saveAssignmentAction({
        id: assignmentForm.id || undefined,
        lessonId,
        title: assignmentForm.title,
        instructions: assignmentForm.instructions,
        rubricId: assignmentForm.rubricId || null,
        maxScore: assignmentForm.maxScore,
        maxFiles: assignmentForm.maxFiles,
        maxTotalSizeMb: assignmentForm.maxTotalSizeMb,
        autoPublishGrades: assignmentForm.autoPublishGrades,
        gracePeriodHours: assignmentForm.gracePeriodHours,
        penaltyPercentPerDay: assignmentForm.penaltyPercentPerDay
      })

      if (!res.success) {
        throw new Error(res.error)
      }

      setAssignmentForm({
        id: '',
        title: '',
        instructions: '',
        rubricId: '',
        maxScore: 100,
        maxFiles: 3,
        maxTotalSizeMb: 50,
        autoPublishGrades: false,
        gracePeriodHours: 0,
        penaltyPercentPerDay: 0
      })
      setShowAssignmentForm(false)
      fetchLessonDetails()
    } catch (err: any) {
      alert(`Save assignment failed: ${err.message}`)
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment? Student submissions will be affected.')) return
    try {
      const res = await deleteAssignmentAction(id)
      if (!res.success) throw new Error(res.error)
      fetchLessonDetails()
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  const handleEditAssignment = (assign: any) => {
    const policy = assign.late_policy || {}
    setAssignmentForm({
      id: assign.id,
      title: assign.title,
      instructions: assign.instructions,
      rubricId: assign.rubric_id || '',
      maxScore: assign.max_score,
      maxFiles: assign.max_files ?? 3,
      maxTotalSizeMb: assign.max_total_size_mb ?? 50,
      autoPublishGrades: assign.auto_publish_grades || false,
      gracePeriodHours: policy.grace_period_hours || 0,
      penaltyPercentPerDay: policy.penalty_percent_per_day || 0
    })
    setShowAssignmentForm(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Retrieving lesson workspace...</span>
      </div>
    )
  }

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return FileText
      case 'link':
        return LinkIcon
      case 'code_repo':
        return CodeIcon
      case 'flow_diagram':
        return Network
      default:
        return FileText
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back & Save Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/library?tab=courses')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-500 text-slate-400 hover:text-white hover:border-slate-400 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-xs text-slate-500 font-semibold">
              Course: {lesson?.modules?.courses?.title} / Module: {lesson?.modules?.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-2xl font-bold text-white">Lesson Editor</h1>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-750 text-[10px] font-mono text-slate-400">
                v{lesson?.version || 1}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveLesson}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Lesson Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Lesson Syllabus Content
            </label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* Materials Panel */}
        <div className="space-y-6">
          {/* Deliverables Card */}
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <h3 className="font-bold text-white text-sm">Lesson Deliverables</h3>
              <button
                onClick={() => setShowMaterialForm(!showMaterialForm)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Map New Resource"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Material Form */}
            {showMaterialForm && (
              <form onSubmit={handleCreateMaterial} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Material Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Slide Guide"
                    value={materialForm.title}
                    onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Resource Type
                  </label>
                  <select
                    value={materialForm.type}
                    onChange={(e: any) => setMaterialForm({ ...materialForm, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="pdf">PDF File upload</option>
                    <option value="docx">Word Document (.docx)</option>
                    <option value="csv">CSV Spreadsheet (.csv)</option>
                    <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    <option value="link">General Web Link</option>
                    <option value="code_repo">Code Repository</option>
                  </select>
                </div>

                {['pdf', 'docx', 'csv', 'xlsx'].includes(materialForm.type) ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Choose {materialForm.type.toUpperCase()} File
                    </label>
                    <input
                      type="file"
                      accept={
                        materialForm.type === 'pdf' ? '.pdf' :
                        materialForm.type === 'docx' ? '.docx' :
                        materialForm.type === 'xlsx' ? '.xlsx' : '.csv'
                      }
                      required
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-450 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-600 hover:file:bg-blue-600/20"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Resource URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      value={materialForm.linkUrl}
                      onChange={(e) => setMaterialForm({ ...materialForm, linkUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading & Checking...</span>
                    </>
                  ) : (
                    <span>Register Deliverable</span>
                  )}
                </button>
              </form>
            )}

            {/* Materials List */}
            {materials.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No active resources mapped.
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((m) => {
                  const Icon = getMaterialIcon(m.type)
                  return (
                    <div
                      key={m.id}
                      className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-200 truncate">
                            {m.title}
                          </span>
                          <span className="block text-[10px] text-slate-550 capitalize mt-0.5">
                            {m.type}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Assignments Panel */}
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-400" />
                Lesson Assignments
              </h3>
              <button
                onClick={() => {
                  setAssignmentForm({
                    id: '',
                    title: '',
                    instructions: '',
                    rubricId: '',
                    maxScore: 100,
                    maxFiles: 3,
                    maxTotalSizeMb: 50,
                    autoPublishGrades: false,
                    gracePeriodHours: 0,
                    penaltyPercentPerDay: 0
                  })
                  setShowAssignmentForm(!showAssignmentForm)
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Create Assignment"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Assignment Form */}
            {showAssignmentForm && (
              <form onSubmit={handleCreateAssignment} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Project Deliverable"
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Guidelines & Instructions *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide guidelines for submissions..."
                    value={assignmentForm.instructions}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none resize-none font-sans leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Max Score
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={assignmentForm.maxScore}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: parseInt(e.target.value) || 100 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Link Rubric
                    </label>
                    <select
                      value={assignmentForm.rubricId}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, rubricId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    >
                      <option value="">No Rubric Linked</option>
                      {rubrics.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Max Files
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={assignmentForm.maxFiles}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, maxFiles: parseInt(e.target.value) || 3 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Max Size (MB)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={assignmentForm.maxTotalSizeMb}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, maxTotalSizeMb: parseInt(e.target.value) || 50 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Grace Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={assignmentForm.gracePeriodHours}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, gracePeriodHours: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Late Penalty (%/day)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={assignmentForm.penaltyPercentPerDay}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, penaltyPercentPerDay: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="editor_auto_publish"
                    type="checkbox"
                    checked={assignmentForm.autoPublishGrades}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, autoPublishGrades: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-800 text-blue-600 bg-slate-900 focus:ring-blue-500/50"
                  />
                  <label htmlFor="editor_auto_publish" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer select-none">
                    Auto-Publish Grades
                  </label>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignmentForm(false)
                    }}
                    className="px-2.5 py-1 rounded text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAssignment}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1"
                  >
                    {savingAssignment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Task</span>
                  </button>
                </div>
              </form>
            )}

            {/* Assignments List */}
            {assignments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No assignments linked to this lesson.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((as) => (
                  <div
                    key={as.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all space-y-2.5 animate-fadeIn"
                  >
                    <div className="flex justify-between items-start gap-2.5 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-200 truncate">
                            {as.title}
                          </span>
                          <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                            Max score: {as.max_score} pts | Rubric: {as.rubrics?.title || 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditAssignment(as)}
                          className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(as.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
