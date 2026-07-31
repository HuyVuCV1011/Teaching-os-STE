'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseFetchErrorMessage } from '@/lib/error-messages'
import { AlertCircle, BookOpen, ClipboardList, Sparkles, FolderOpen } from 'lucide-react'
import { toast } from 'react-hot-toast'

// Import extracted subcomponents
import { CourseRegistrySidebar } from './components/CourseRegistrySidebar'
import { SyllabusTimelineCanvas } from './components/SyllabusTimelineCanvas'
import { SubjectsTaxonomyBento } from './components/SubjectsTaxonomyBento'
import { RefinedKnowledgeTab } from './components/RefinedKnowledgeTab'
import {
  createCourseAdminAction,
  createLessonAdminAction,
  createModuleAdminAction,
  createSubjectAdminAction,
  duplicateCourseAction,
  getCourseSyllabusAdminAction,
  listLibraryAdminAction,
  saveSyllabusStructureAction,
  swapLessonOrderAdminAction,
  swapModuleOrderAdminAction,
} from './actions/courses'

interface Subject {
  id: string
  name: string
  slug: string
  description?: string
}

interface Course {
  id: string
  title: string
  slug: string
  subject_id: string
  description?: string
  status: string
  subjects?: {
    name: string
  }
}

interface Lesson {
  id: string
  module_id: string
  title: string
  order_index: number
  content: string
}

interface Module {
  id: string
  course_id: string
  title: string
  order_index: number
  lessons?: Lesson[]
}

type SyllabusStructureUpdate = {
  moduleId: string
  orderIndex: number
  lessonIds: string[]
}

interface SubjectForm {
  name: string
  slug: string
  description: string
}

interface CourseForm {
  title: string
  slug: string
  subject_id: string
  description: string
  status: string
}

function AdminLibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTabParam = searchParams.get('tab') || 'courses'

  const [activeTab, setActiveTab] = useState(activeTabParam)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)

  // Database lists
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  // Form states
  const [subjectForm, setSubjectForm] = useState<SubjectForm>({ name: '', slug: '', description: '' })
  const [courseForm, setCourseForm] = useState<CourseForm>({ title: '', slug: '', subject_id: '', description: '', status: 'draft' })

  // UI state
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)

  // Syllabus configuration state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [courseModules, setCourseModules] = useState<Module[]>([])
  const [moduleForm, setModuleForm] = useState({ title: '', order_index: 1 })
  const [lessonForm, setLessonForm] = useState({ title: '', order_index: 1, moduleId: '' })
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [redirectToEditor, setRedirectToEditor] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
    const action = searchParams.get('action')
    if (action === 'new') {
      setShowCourseForm(true)
    }
  }, [searchParams])

  async function fetchData() {
    setLoading(true)
    setErrorState(null)

    try {
      const result = await listLibraryAdminAction()
      if (!result.success) throw new Error(result.error)
      setSubjects(result.data.subjects as Subject[])
      setCourses(result.data.courses as Course[])
    } catch (error) {
      const message = getSupabaseFetchErrorMessage(error, 'Không thể tải dữ liệu thư viện.')
      console.warn('Unable to fetch CMS data:', message)
      setErrorState(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateCourse = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to duplicate this course and all its syllabus content (modules, lessons, materials, assignments)?')) {
      return
    }

    setLoading(true)
    try {
      const res = await duplicateCourseAction(courseId)
      if (res.success) {
        toast.success('Course duplicated successfully!')
        await fetchData()
      } else {
        toast.error(`Failed to duplicate course: ${res.error}`)
      }
    } catch (err) {
      const error = err as Error
      toast.error(`An error occurred: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle Tab sync with query param
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.replace(`/admin/library?tab=${tab}`)
  }

  // Subject actions
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectForm.name || !subjectForm.slug) return

    try {
      const result = await createSubjectAdminAction(subjectForm)
      if (!result.success) throw new Error(result.error)
      setSubjectForm({ name: '', slug: '', description: '' })
      setShowSubjectForm(false)
      await fetchData()
    } catch (err) {
      const error = err as Error
      toast.error(`Failed to create subject: ${error.message}`)
    }
  }

  // Course actions
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseForm.title || !courseForm.slug || !courseForm.subject_id) return

    try {
      const result = await createCourseAdminAction(courseForm)
      if (!result.success) throw new Error(result.error)
      setCourseForm({ title: '', slug: '', subject_id: '', description: '', status: 'draft' })
      setShowCourseForm(false)
      await fetchData()
    } catch (err) {
      const error = err as Error
      toast.error(`Failed to create course: ${error.message}`)
    }
  }

  const handleSaveSyllabusStructure = async (updatedModules: Module[]) => {
    setCourseModules(updatedModules)
    setLoading(true)
    try {
      const structure: SyllabusStructureUpdate[] = updatedModules.map((m, idx) => ({
        moduleId: m.id,
        orderIndex: idx + 1,
        lessonIds: m.lessons?.map((l) => l.id) || []
      }))
      const res = await saveSyllabusStructureAction(selectedCourse!.id, structure)
      if (res.success) {
        // reload details
        await handleSelectCourse(selectedCourse!)
      } else {
        toast.error(`Failed to save syllabus structure: ${res.error}`)
      }
    } catch (err) {
      const error = err as Error
      toast.error(`Error saving syllabus structure: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Fetch course modules and lessons for syllabus mapper
  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course)
    setLoading(true)
    try {
      const result = await getCourseSyllabusAdminAction(course.id)
      if (!result.success) throw new Error(result.error)
      setCourseModules(result.data as Module[])
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse || !moduleForm.title) return

    try {
      const result = await createModuleAdminAction(
        selectedCourse.id,
        moduleForm.title,
        moduleForm.order_index,
      )
      if (!result.success) throw new Error(result.error)
      setModuleForm({ title: '', order_index: courseModules.length + 2 })
      setShowModuleForm(false)
      await handleSelectCourse(selectedCourse)
    } catch (err) {
      const error = err as Error
      toast.error(`Failed to add module: ${error.message}`)
    }
  }

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonForm.title || !lessonForm.moduleId) return

    try {
      const result = await createLessonAdminAction(
        lessonForm.moduleId,
        lessonForm.title,
        lessonForm.order_index,
      )
      if (!result.success) throw new Error(result.error)
      const newLessonId = result.data?.id

      setLessonForm({ title: '', order_index: 1, moduleId: '' })
      setShowLessonForm(false)

      if (redirectToEditor && newLessonId) {
        router.push(`/admin/library/lesson-editor?lessonId=${newLessonId}`)
      } else {
        await handleSelectCourse(selectedCourse!)
      }
    } catch (err) {
      const error = err as Error
      toast.error(`Failed to add lesson: ${error.message}`)
    }
  }

  // Move Module (Up / Down)
  const handleMoveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIdx = courseModules.findIndex(m => m.id === moduleId)
    if (currentIdx === -1) return

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (targetIdx < 0 || targetIdx >= courseModules.length) return

    const currentMod = courseModules[currentIdx]
    const targetMod = courseModules[targetIdx]

    setLoading(true)
    try {
      const result = await swapModuleOrderAdminAction(
        selectedCourse!.id,
        { id: currentMod.id, orderIndex: currentMod.order_index },
        { id: targetMod.id, orderIndex: targetMod.order_index },
      )
      if (!result.success) throw new Error(result.error)

      if (selectedCourse) {
        await handleSelectCourse(selectedCourse)
      }
    } catch (err) {
      const error = err as Error
      toast.error(`Failed to move module: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Move Lesson (Up / Down)
  const handleMoveLesson = async (lessonId: string, direction: 'up' | 'down') => {
    let targetModule: Module | null = null
    let currentIdx = -1
    for (const mod of courseModules) {
      currentIdx = mod.lessons?.findIndex((l) => l.id === lessonId) ?? -1
      if (currentIdx !== -1) {
        targetModule = mod
        break
      }
    }

    if (!targetModule || currentIdx === -1) return

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    const lessonsList = targetModule.lessons || []
    if (targetIdx < 0 || targetIdx >= lessonsList.length) return

    const currentLess = lessonsList[currentIdx]
    const targetLess = lessonsList[targetIdx]

    setLoading(true)
    try {
      const result = await swapLessonOrderAdminAction(
        targetModule.id,
        { id: currentLess.id, orderIndex: currentLess.order_index },
        { id: targetLess.id, orderIndex: targetLess.order_index },
      )
      if (!result.success) throw new Error(result.error)

      if (selectedCourse) {
        await handleSelectCourse(selectedCourse)
      }
    } catch (err) {
      const error = err as Error
      toast.error(`Failed to move lesson: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto px-6 py-8">
      {/* Page Title & Navigation Header (Double-Bezel Outer Shell) */}
      <div className="p-1 rounded-[2rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 border border-slate-800/30 p-8 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-indigo-500/5 pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-blue-650 animate-pulse shrink-0" /> Educational CMS Workspace
            </h1>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Configure course syllabus mapping, subjects taxonomy, and reusable lesson structures.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 z-10 shrink-0">
            <Link
              href="/admin/library/assignments"
              className="group px-5 py-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800/85 hover:border-slate-700 text-slate-100 font-semibold text-sm transition-all duration-300 flex items-center gap-2.5 shadow-sm active:scale-[0.98]"
            >
              <ClipboardList className="w-4 h-4 text-blue-650 transition-transform group-hover:scale-110" /> 
              <span>Manage Assignments</span>
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-[10px] text-blue-650 flex items-center justify-center font-bold">→</span>
            </Link>
            <Link
              href="/admin/library/knowledge"
              className="group px-5 py-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800/85 hover:border-slate-700 text-slate-100 font-semibold text-sm transition-all duration-300 flex items-center gap-2.5 shadow-sm active:scale-[0.98]"
            >
              <FolderOpen className="w-4 h-4 text-indigo-500 transition-transform group-hover:scale-110" /> 
              <span>RAG Knowledge Hub</span>
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-[10px] text-indigo-500 flex items-center justify-center font-bold">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modern Tab Capsule Navigation */}
      <div className="flex bg-slate-900/10 p-1.5 rounded-full border border-slate-800/20 backdrop-blur-md w-fit gap-2 shadow-sm">
        <button
          onClick={() => handleTabChange('courses')}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-base font-semibold transition-all duration-300 ease-premium-soft ${
            activeTab === 'courses'
              ? 'bg-slate-955 border border-slate-800/40 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900/10'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses & Syllabus</span>
        </button>

        <button
          onClick={() => handleTabChange('subjects')}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-base font-semibold transition-all duration-300 ease-premium-soft ${
            activeTab === 'subjects'
              ? 'bg-slate-955 border border-slate-800/40 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900/10'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Subjects Taxonomy</span>
        </button>

        <button
          onClick={() => handleTabChange('knowledge')}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-base font-semibold transition-all duration-300 ease-premium-soft ${
            activeTab === 'knowledge'
              ? 'bg-slate-955 border border-slate-800/40 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900/10'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Knowledge Base</span>
        </button>
      </div>

      {/* Tab Content Workspace */}
      <div className="min-h-[400px]">
        {errorState ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" role="alert">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-slate-100">Không thể tải thư viện nội dung</p>
              <p className="mt-1 text-xs text-slate-500">{errorState}</p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Thử lại
            </button>
          </div>
        ) : loading && !selectedCourse ? (
          <div className="flex justify-center items-center py-20 text-slate-500 text-sm font-semibold gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Loading CMS taxonomy data...
          </div>
        ) : (
          <>
            {activeTab === 'courses' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <CourseRegistrySidebar
                  courses={courses}
                  subjects={subjects}
                  selectedCourse={selectedCourse}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  showCourseForm={showCourseForm}
                  setShowCourseForm={setShowCourseForm}
                  courseForm={courseForm}
                  setCourseForm={setCourseForm}
                  handleCreateCourse={handleCreateCourse}
                  handleSelectCourse={handleSelectCourse}
                  handleDuplicateCourse={handleDuplicateCourse}
                />

                <SyllabusTimelineCanvas
                  selectedCourse={selectedCourse}
                  courseModules={courseModules}
                  showModuleForm={showModuleForm}
                  setShowModuleForm={setShowModuleForm}
                  moduleForm={moduleForm}
                  setModuleForm={setModuleForm}
                  handleAddModule={handleAddModule}
                  showLessonForm={showLessonForm}
                  setShowLessonForm={setShowLessonForm}
                  lessonForm={lessonForm}
                  setLessonForm={setLessonForm}
                  handleAddLesson={handleAddLesson}
                  handleMoveModule={handleMoveModule}
                  handleMoveLesson={handleMoveLesson}
                  redirectToEditor={redirectToEditor}
                  setRedirectToEditor={setRedirectToEditor}
                  router={router}
                  onSaveSyllabusStructure={handleSaveSyllabusStructure}
                  onRefreshCourse={() => handleSelectCourse(selectedCourse!)}
                />
              </div>
            )}

            {activeTab === 'subjects' && (
              <SubjectsTaxonomyBento
                subjects={subjects}
                courses={courses}
                showSubjectForm={showSubjectForm}
                setShowSubjectForm={setShowSubjectForm}
                subjectForm={subjectForm}
                setSubjectForm={setSubjectForm}
                handleCreateSubject={handleCreateSubject}
              />
            )}

            {activeTab === 'knowledge' && (
              <RefinedKnowledgeTab />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminLibrary() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20 text-slate-500 text-sm font-semibold">
        Loading CMS Library...
      </div>
    }>
      <AdminLibraryContent />
    </Suspense>
  )
}
