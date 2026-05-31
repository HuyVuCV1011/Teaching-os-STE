'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BookOpen, ClipboardList, Sparkles, FolderOpen } from 'lucide-react'

// Import extracted subcomponents
import { CourseRegistrySidebar } from './components/CourseRegistrySidebar'
import { SyllabusTimelineCanvas } from './components/SyllabusTimelineCanvas'
import { SubjectsTaxonomyBento } from './components/SubjectsTaxonomyBento'

function AdminLibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTabParam = searchParams.get('tab') || 'courses'

  const [activeTab, setActiveTab] = useState(activeTabParam)
  const [loading, setLoading] = useState(true)

  // Database lists
  const [subjects, setSubjects] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [rubrics, setRubrics] = useState<any[]>([])

  // Form states
  const [subjectForm, setSubjectForm] = useState({ name: '', slug: '', description: '' })
  const [courseForm, setCourseForm] = useState({ title: '', slug: '', subject_id: '', description: '', status: 'draft' })
  
  // Rubrics & criteria form states (preserved from original database mappings)
  const [rubricForm, setRubricForm] = useState({ title: '', description: '' })
  const [criteria, setCriteria] = useState<any[]>([{ name: '', max_points: 10, weight: 1.0 }])

  // UI state
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)

  // Syllabus configuration state
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [courseModules, setCourseModules] = useState<any[]>([])
  const [moduleForm, setModuleForm] = useState({ title: '', order_index: 1 })
  const [lessonForm, setLessonForm] = useState({ title: '', order_index: 1, moduleId: '' })
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [redirectToEditor, setRedirectToEditor] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [
        { data: subjectsData },
        { data: coursesData },
        { data: rubricsData },
      ] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('courses').select('*, subjects(name)').neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('rubrics').select('*, rubric_criteria(*)').order('created_at', { ascending: false }),
      ])

      setSubjects(subjectsData || [])
      setCourses(coursesData || [])
      setRubrics(rubricsData || [])
    } catch (error) {
      console.error('Error fetching CMS data:', error)
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
      const { error } = await supabase.from('subjects').insert([subjectForm])
      if (error) throw error

      setSubjectForm({ name: '', slug: '', description: '' })
      setShowSubjectForm(false)
      fetchData()
    } catch (err: any) {
      alert(`Failed to create subject: ${err.message}`)
    }
  }

  // Course actions
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseForm.title || !courseForm.slug || !courseForm.subject_id) return

    try {
      const { error } = await supabase.from('courses').insert([courseForm])
      if (error) throw error

      setCourseForm({ title: '', slug: '', subject_id: '', description: '', status: 'draft' })
      setShowCourseForm(false)
      fetchData()
    } catch (err: any) {
      alert(`Failed to create course: ${err.message}`)
    }
  }

  // Fetch course modules and lessons for syllabus mapper
  const handleSelectCourse = async (course: any) => {
    setSelectedCourse(course)
    setLoading(true)
    try {
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', course.id)
        .order('order_index')
        .order('order_index', { foreignTable: 'lessons', ascending: true })

      setCourseModules(modulesData || [])
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
      const { error } = await supabase.from('modules').insert([
        {
          course_id: selectedCourse.id,
          title: moduleForm.title,
          order_index: moduleForm.order_index,
        },
      ])

      if (error) throw error
      setModuleForm({ title: '', order_index: courseModules.length + 2 })
      setShowModuleForm(false)
      handleSelectCourse(selectedCourse)
    } catch (err: any) {
      alert(`Failed to add module: ${err.message}`)
    }
  }

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonForm.title || !lessonForm.moduleId) return

    try {
      const { data: lessonData, error } = await supabase
        .from('lessons')
        .insert([
          {
            module_id: lessonForm.moduleId,
            title: lessonForm.title,
            order_index: lessonForm.order_index,
            content: '{"type":"doc","content":[]}', // default empty TipTap content
          },
        ])
        .select()
        .single()

      if (error) throw error
      const newLessonId = lessonData?.id

      setLessonForm({ title: '', order_index: 1, moduleId: '' })
      setShowLessonForm(false)

      if (redirectToEditor && newLessonId) {
        router.push(`/admin/library/lesson-editor?lessonId=${newLessonId}`)
      } else {
        handleSelectCourse(selectedCourse)
      }
    } catch (err: any) {
      alert(`Failed to add lesson: ${err.message}`)
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

    // Swap order indices
    const currentOrder = currentMod.order_index
    const targetOrder = targetMod.order_index

    setLoading(true)
    try {
      const { error: err1 } = await supabase
        .from('modules')
        .update({ order_index: targetOrder })
        .eq('id', currentMod.id)
      if (err1) throw err1

      const { error: err2 } = await supabase
        .from('modules')
        .update({ order_index: currentOrder })
        .eq('id', targetMod.id)
      if (err2) throw err2

      await handleSelectCourse(selectedCourse)
    } catch (err: any) {
      alert(`Failed to move module: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Move Lesson (Up / Down)
  const handleMoveLesson = async (lessonId: string, direction: 'up' | 'down') => {
    let targetModule: any = null
    let currentIdx = -1
    for (const mod of courseModules) {
      currentIdx = mod.lessons?.findIndex((l: any) => l.id === lessonId) ?? -1
      if (currentIdx !== -1) {
        targetModule = mod
        break
      }
    }

    if (!targetModule || currentIdx === -1) return

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (targetIdx < 0 || targetIdx >= targetModule.lessons.length) return

    const currentLess = targetModule.lessons[currentIdx]
    const targetLess = targetModule.lessons[targetIdx]

    // Swap order indices
    const currentOrder = currentLess.order_index
    const targetOrder = targetLess.order_index

    setLoading(true)
    try {
      const { error: err1 } = await supabase
        .from('lessons')
        .update({ order_index: targetOrder })
        .eq('id', currentLess.id)
      if (err1) throw err1

      const { error: err2 } = await supabase
        .from('lessons')
        .update({ order_index: currentOrder })
        .eq('id', targetLess.id)
      if (err2) throw err2

      await handleSelectCourse(selectedCourse)
    } catch (err: any) {
      alert(`Failed to move lesson: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-8">
      {/* Page Title & Navigation Header (Double-Bezel Outer Shell) */}
      <div className="p-1 rounded-[2rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 border border-slate-800/30 p-8 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-indigo-500/5 pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-blue-600 animate-pulse shrink-0" /> Educational CMS Workspace
            </h1>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Configure course syllabus mapping, subjects taxonomy, and reusable lesson structures.
            </p>
          </div>
          <Link
            href="/admin/library/assignments"
            className="group px-5 py-3 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-slate-100 font-semibold text-sm transition-all duration-300 flex items-center gap-2.5 shadow-sm active:scale-[0.98] z-10 shrink-0"
          >
            <ClipboardList className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" /> 
            <span>Manage Assignments</span>
            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-[10px] text-blue-600 flex items-center justify-center font-bold">→</span>
          </Link>
        </div>
      </div>

      {/* Modern Tab Capsule Navigation */}
      <div className="flex bg-slate-900/10 p-1.5 rounded-full border border-slate-800/20 backdrop-blur-md w-fit gap-2 shadow-sm">
        <button
          onClick={() => handleTabChange('courses')}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,_0.72,_0,_1)] ${
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
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,_0.72,_0,_1)] ${
            activeTab === 'subjects'
              ? 'bg-slate-955 border border-slate-800/40 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-100 hover:bg-slate-900/10'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Subjects Taxonomy</span>
        </button>
      </div>

      {/* Tab Content Workspace */}
      <div className="min-h-[400px]">
        {loading && !selectedCourse ? (
          <div className="flex justify-center items-center py-20 text-slate-500 text-sm font-semibold gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Loading CMS taxonomy data...
          </div>
        ) : (
          <>
            {activeTab === 'courses' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
