'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  FolderOpen,
  BookOpen,
  ClipboardList,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle,
  HelpCircle,
  FileText,
} from 'lucide-react'

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
  
  // Rubrics & criteria form states
  const [rubricForm, setRubricForm] = useState({ title: '', description: '' })
  const [criteria, setCriteria] = useState<any[]>([{ name: '', max_points: 10, weight: 1.0 }])

  // UI state
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showRubricForm, setShowRubricForm] = useState(false)

  // Syllabus configuration state
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [courseModules, setCourseModules] = useState<any[]>([])
  const [moduleForm, setModuleForm] = useState({ title: '', order_index: 1 })
  const [lessonForm, setLessonForm] = useState({ title: '', order_index: 1, moduleId: '' })
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [redirectToEditor, setRedirectToEditor] = useState(true)

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

  // Rubric creation with nested criteria
  const handleAddCriterionField = () => {
    setCriteria([...criteria, { name: '', max_points: 10, weight: 1.0 }])
  }

  const handleRemoveCriterionField = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx))
  }

  const handleCriterionChange = (idx: number, field: string, value: any) => {
    const updated = [...criteria]
    updated[idx][field] = value
    setCriteria(updated)
  }

  const handleCreateRubric = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rubricForm.title) return

    try {
      // 1. Insert Rubric
      const { data: rubricData, error: rubricError } = await supabase
        .from('rubrics')
        .insert([rubricForm])
        .select()
        .single()

      if (rubricError) throw rubricError

      // 2. Insert Rubric Criteria
      const criteriaToInsert = criteria.map((c) => ({
        rubric_id: rubricData.id,
        name: c.name || 'Criterion',
        max_points: c.max_points,
        weight: c.weight,
      }))

      const { error: criteriaError } = await supabase
        .from('rubric_criteria')
        .insert(criteriaToInsert)

      if (criteriaError) throw criteriaError

      setRubricForm({ title: '', description: '' })
      setCriteria([{ name: '', max_points: 10, weight: 1.0 }])
      setShowRubricForm(false)
      fetchData()
    } catch (err: any) {
      alert(`Failed to create rubric matrix: ${err.message}`)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Educational CMS Workspace</h1>
          <p className="text-slate-400 text-sm mt-1">Manage subjects taxonomy, courses syllabus mapping, and rubrics.</p>
        </div>
        <Link
          href="/admin/library/assignments"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-500 hover:border-slate-400 text-slate-350 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md"
        >
          <ClipboardList className="w-3.5 h-3.5" /> Manage Assignments
        </Link>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-700 gap-6">
        <button
          onClick={() => handleTabChange('courses')}
          className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'courses'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses & Syllabus</span>
        </button>

        <button
          onClick={() => handleTabChange('subjects')}
          className={`flex items-center gap-2 pb-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'subjects'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Subjects Taxonomy</span>
        </button>
      </div>


      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading && !selectedCourse ? (
          <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
            Loading taxonomy data...
          </div>
        ) : (
          <>
            {/* 1. COURSES & SYLLABUS TAB */}
            {activeTab === 'courses' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Courses List */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Course Registry</h2>
                    <button
                      onClick={() => setShowCourseForm(!showCourseForm)}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showCourseForm && (
                    <form onSubmit={handleCreateCourse} className="p-5 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Course Title
                        </label>
                        <input
                          type="text"
                          required
                          value={courseForm.title}
                          onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Slug Path
                        </label>
                        <input
                          type="text"
                          required
                          value={courseForm.slug}
                          onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value.toLowerCase() })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Subject Path
                        </label>
                        <select
                          required
                          value={courseForm.subject_id}
                          onChange={(e) => setCourseForm({ ...courseForm, subject_id: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select Subject</option>
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Description
                        </label>
                        <textarea
                          value={courseForm.description}
                          onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 h-20"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                      >
                        Register Course
                      </button>
                    </form>
                  )}

                  <div className="space-y-3">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedCourse?.id === course.id
                            ? 'border-blue-500 bg-slate-900/60'
                            : 'border-slate-700 bg-slate-900/10 hover:bg-slate-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-blue-600">
                            {course.subjects?.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            course.status === 'published'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                            {course.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-white mt-1.5">{course.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {course.description || 'No description provided.'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Syllabus / Module & Lesson Mapper */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedCourse ? (
                    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-6">
                      <div className="flex justify-between items-start pb-4 border-b border-slate-700">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Syllabus Planner
                          </span>
                          <h3 className="text-xl font-bold text-white mt-1">{selectedCourse.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowModuleForm(true)}
                            className="px-3 py-1.5 rounded-lg border border-slate-500 bg-slate-950/60 hover:bg-slate-950 text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Module
                          </button>
                        </div>
                      </div>

                      {/* Module Insert Form */}
                      {showModuleForm && (
                        <form onSubmit={handleAddModule} className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Module Title
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Module Heading"
                                value={moduleForm.title}
                                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Order Index
                              </label>
                              <input
                                type="number"
                                required
                                value={moduleForm.order_index}
                                onChange={(e) => setModuleForm({ ...moduleForm, order_index: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setShowModuleForm(false)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                            >
                              Add Module
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Syllabus Structure */}
                      {courseModules.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                          Syllabus is empty. Add a module to begin mapping lessons.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {courseModules.map((mod, modIdx) => (
                            <div key={mod.id} className="border border-slate-700 bg-slate-950/40 rounded-xl p-5 space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                                    {mod.order_index}
                                  </span>
                                  {mod.title}
                                </h4>
                                <div className="flex items-center gap-3">
                                  {/* Up/Down buttons for Module */}
                                  <div className="flex items-center border border-slate-700 rounded bg-slate-950 overflow-hidden shrink-0">
                                    <button
                                      type="button"
                                      disabled={modIdx === 0}
                                      onClick={() => handleMoveModule(mod.id, 'up')}
                                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white border-r border-slate-700 text-xs disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                      title="Move Module Up"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      disabled={modIdx === courseModules.length - 1}
                                      onClick={() => handleMoveModule(mod.id, 'down')}
                                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white text-xs disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                      title="Move Module Down"
                                    >
                                      ▼
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setLessonForm({ ...lessonForm, moduleId: mod.id, order_index: (mod.lessons?.length || 0) + 1 })
                                      setShowLessonForm(true)
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1 bg-slate-900 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-lg"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Lesson
                                  </button>
                                </div>
                              </div>

                              {/* Inline Lesson Insert Form for this specific module */}
                              {showLessonForm && lessonForm.moduleId === mod.id && (
                                <form onSubmit={handleAddLesson} className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-4">
                                  <div className="text-xs font-semibold text-slate-400">
                                    Creating lesson under Module: <span className="font-bold text-white">{mod.title}</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                        Lesson Title
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="Lesson Heading"
                                        value={lessonForm.title}
                                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div className="flex flex-col justify-end pb-1.5">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`redirect_toggle_${mod.id}`}
                                          checked={redirectToEditor}
                                          onChange={(e) => setRedirectToEditor(e.target.checked)}
                                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 focus:ring-blue-500/50 cursor-pointer"
                                        />
                                        <label htmlFor={`redirect_toggle_${mod.id}`} className="text-xs font-semibold text-slate-350 cursor-pointer select-none">
                                          Open composer editor immediately after creation
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setShowLessonForm(false)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                                    >
                                      Create Lesson
                                    </button>
                                  </div>
                                </form>
                              )}

                              {/* Lessons inside module */}
                              <div className="space-y-2">
                                {mod.lessons && mod.lessons.map((lesson: any, lessonIdx: number) => (
                                  <div
                                    key={lesson.id}
                                    className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-700 hover:border-slate-600 transition-all"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xs text-slate-500 font-mono">
                                        {mod.order_index}.{lesson.order_index}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-200">{lesson.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {/* Up/Down buttons for Lesson */}
                                      <div className="flex items-center border border-slate-700 rounded bg-slate-950 overflow-hidden shrink-0">
                                        <button
                                          type="button"
                                          disabled={lessonIdx === 0}
                                          onClick={() => handleMoveLesson(lesson.id, 'up')}
                                          className="p-0.5 hover:bg-slate-700 text-slate-400 hover:text-white border-r border-slate-700 text-[10px] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                          title="Move Lesson Up"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          disabled={lessonIdx === mod.lessons.length - 1}
                                          onClick={() => handleMoveLesson(lesson.id, 'down')}
                                          className="p-0.5 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                          title="Move Lesson Down"
                                        >
                                          ▼
                                        </button>
                                      </div>

                                      <button
                                        onClick={() => router.push(`/admin/library/lesson-editor?lessonId=${lesson.id}`)}
                                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Edit Lesson Content"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {(!mod.lessons || mod.lessons.length === 0) && (
                                  <span className="block text-xs text-slate-500 italic">No lessons added to this module.</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-500 text-sm gap-2">
                      <HelpCircle className="w-8 h-8 text-slate-600" />
                      <span>Select a course from registry to configure syllabus, modules, and lessons.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. SUBJECTS TAXONOMY TAB */}
            {activeTab === 'subjects' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">Registered Taxonomy Subjects</h2>
                  <button
                    onClick={() => setShowSubjectForm(!showSubjectForm)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Subject
                  </button>
                </div>

                {showSubjectForm && (
                  <form onSubmit={handleCreateSubject} className="max-w-xl p-6 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Subject Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Data Pipelines"
                          value={subjectForm.name}
                          onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Taxonomy Slug
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. data-pipelines"
                          value={subjectForm.slug}
                          onChange={(e) => setSubjectForm({ ...subjectForm, slug: e.target.value.toLowerCase() })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 h-20"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowSubjectForm(false)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm"
                      >
                        Save Subject
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((sub) => (
                    <div key={sub.id} className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-950/60 border border-slate-700 px-2 py-0.5 rounded">
                          slug: {sub.slug}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-md font-bold text-white">{sub.name}</h4>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                          {sub.description || 'No description written yet.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
      <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
        Loading CMS Library...
      </div>
    }>
      <AdminLibraryContent />
    </Suspense>
  )
}
