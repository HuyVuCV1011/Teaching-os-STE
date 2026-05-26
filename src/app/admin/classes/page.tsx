'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Users,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Shield,
  Loader2,
} from 'lucide-react'

function AdminClassesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialAction = searchParams.get('action')

  const [classes, setClasses] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Class Form State
  const [classForm, setClassForm] = useState({
    name: '',
    class_code: '',
    status: 'upcoming',
    start_date: '',
    end_date: '',
  })
  const [showClassForm, setShowClassForm] = useState(initialAction === 'new')

  // Cohort Mapping / Course Mapping State
  const [selectedClass, setSelectedClass] = useState<any | null>(null)
  const [classCourses, setClassCourses] = useState<any[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  
  // Schedules State
  const [lessons, setLessons] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [scheduleForm, setScheduleForm] = useState({
    lesson_id: '',
    visible_after: '',
    due_date: '',
  })
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  // Whitelist State
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [emailFilter, setEmailFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [
        { data: classesData },
        { data: coursesData },
      ] = await Promise.all([
        supabase.from('classes').select('*').order('created_at', { ascending: false }),
        supabase.from('courses').select('*').neq('status', 'archived').order('title'),
      ])

      setClasses(classesData || [])
      setCourses(coursesData || [])
    } catch (error) {
      console.error('Error fetching classes metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle Class Creation
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classForm.name || !classForm.class_code || !classForm.start_date || !classForm.end_date) return

    try {
      const { error } = await supabase.from('classes').insert([classForm])
      if (error) throw error

      setClassForm({
        name: '',
        class_code: '',
        status: 'upcoming',
        start_date: '',
        end_date: '',
      })
      setShowClassForm(false)
      fetchData()
      router.replace('/admin/classes')
    } catch (err: any) {
      alert(`Failed to create class cohort: ${err.message}`)
    }
  }

  // Handle Class Deletion
  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this cohort? All student submissions and scheduling will be removed.')) return
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (error) throw error
      if (selectedClass?.id === classId) {
        setSelectedClass(null)
      }
      fetchData()
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  // Select Cohort and Fetch details
  const handleSelectClass = async (cohort: any) => {
    setSelectedClass(cohort)
    setLoading(true)
    try {
      // 1. Fetch mapped courses for this cohort
      const { data: mappedCourses } = await supabase
        .from('class_courses')
        .select('*, courses(id, title, slug)')
        .eq('class_id', cohort.id)

      setClassCourses(mappedCourses || [])

      // 2. Fetch active schedules for this cohort
      const { data: schedulesData } = await supabase
        .from('class_schedules')
        .select('*, lessons(id, title, module_id, modules(title))')
        .eq('class_id', cohort.id)

      setSchedules(schedulesData || [])

      // 3. Fetch lessons from mapped courses to enable scheduling dropdown
      if (mappedCourses && mappedCourses.length > 0) {
        const courseIds = mappedCourses.map((c: any) => c.course_id)
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*, modules(*)')
          .in('modules.course_id', courseIds)

        // Filter lessons where module is not null (meaning it belongs to mapped courses)
        setLessons((lessonsData || []).filter((l: any) => l.modules))
      } else {
        setLessons([])
      }

      // 4. Fetch whitelisted enrollments
      const { data: enrollmentsData } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', cohort.id)
        .order('student_email')

      setEnrollments(enrollmentsData || [])
    } catch (error) {
      console.error('Error fetching cohort mapping:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle Enrollment logic
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !newEmail.trim()) return

    const emails = newEmail
      .split(',')
      .map((em) => em.trim().toLowerCase())
      .filter((em) => em.includes('@'))

    if (emails.length === 0) {
      alert('Please enter one or more valid email addresses.')
      return
    }

    try {
      const insertData = emails.map((email) => ({
        class_id: selectedClass.id,
        student_email: email,
      }))

      const { error } = await supabase.from('class_enrollments').upsert(insertData, {
        onConflict: 'class_id,student_email',
      })

      if (error) throw error

      setNewEmail('')
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Enrollment failed: ${err.message}`)
    }
  }

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the whitelist?')) return
    try {
      const { error } = await supabase.from('class_enrollments').delete().eq('id', enrollmentId)
      if (error) throw error
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Failed to remove enrollment: ${err.message}`)
    }
  }

  // Assign course to cohort
  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !selectedCourseId) return

    try {
      const { error } = await supabase.from('class_courses').insert([
        {
          class_id: selectedClass.id,
          course_id: selectedCourseId,
        },
      ])

      if (error) throw error
      setSelectedCourseId('')
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Failed to map course: ${err.message}`)
    }
  }

  // Unassign course from cohort
  const handleUnassignCourse = async (mappingId: string) => {
    if (!confirm('Unmap this course from the cohort?')) return
    try {
      const { error } = await supabase.from('class_courses').delete().eq('id', mappingId)
      if (error) throw error
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Unmapping failed: ${err.message}`)
    }
  }

  // Add Release Schedule / Calendar Event for a lesson
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !scheduleForm.lesson_id) return

    try {
      const { error } = await supabase.from('class_schedules').insert([
        {
          class_id: selectedClass.id,
          lesson_id: scheduleForm.lesson_id,
          visible_after: scheduleForm.visible_after || null,
          due_date: scheduleForm.due_date || null,
        },
      ])

      if (error) throw error
      setScheduleForm({ lesson_id: '', visible_after: '', due_date: '' })
      setShowScheduleForm(false)
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Failed to set schedule: ${err.message}`)
    }
  }

  // Delete release schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Remove this schedule config?')) return
    try {
      const { error } = await supabase.from('class_schedules').delete().eq('id', scheduleId)
      if (error) throw error
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Failed to delete schedule: ${err.message}`)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-8 h-8 text-blue-600" />
            Class Cohort Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure class access codes, active courses, and release dates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cohorts Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Active Cohorts
            </h2>
            <button
              onClick={() => setShowClassForm(!showClassForm)}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showClassForm && (
            <form onSubmit={handleCreateClass} className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cohort Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Analytics Cohort A"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Class Access Code (Lock Screen Key)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DATA-A-2026"
                  value={classForm.class_code}
                  onChange={(e) => setClassForm({ ...classForm, class_code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={classForm.start_date}
                    onChange={(e) => setClassForm({ ...classForm, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={classForm.end_date}
                    onChange={(e) => setClassForm({ ...classForm, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cohort Status
                </label>
                <select
                  value={classForm.status}
                  onChange={(e) => setClassForm({ ...classForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                Register Cohort
              </button>
            </form>
          )}

          <div className="space-y-3">
            {classes.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectClass(c)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedClass?.id === c.id
                    ? 'border-blue-500 bg-slate-900/60'
                    : 'border-slate-800 bg-slate-900/10 hover:bg-slate-900/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {c.class_code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      c.status === 'running'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-850 border-slate-750 text-slate-400'
                    }`}>
                      {c.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClass(c.id)
                      }}
                      className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-white mt-3 text-sm">{c.name}</h4>
                <div className="flex gap-4 text-[10px] text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.start_date}</span>
                  <span>to</span>
                  <span>{c.end_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mapped Courses & Scheduling Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedClass ? (
            <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-8">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Cohort Workspace
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedClass.name}</h3>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  <span className="block font-semibold font-mono text-slate-200">Code: {selectedClass.class_code}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">Syllabus Configuration</span>
                </div>
              </div>

              {/* Mapped Courses section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Assigned Syllabi Courses
                </h4>

                <form onSubmit={handleAssignCourse} className="flex gap-3">
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Choose Course to Assign</option>
                    {courses
                      .filter((co) => !classCourses.some((cc) => cc.course_id === co.id))
                      .map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0"
                  >
                    Assign Course
                  </button>
                </form>

                {classCourses.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs">
                    No courses assigned to this cohort. Assign a course to allow release date setups.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {classCourses.map((cc) => (
                      <div
                        key={cc.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all"
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-200 truncate">
                            {cc.courses?.title}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                            slug: {cc.courses?.slug}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnassignCourse(cc.id)}
                          className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Whitelisted Student Enrollment */}
              <div className="space-y-4 pt-6 border-t border-slate-850">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Whitelisted Student Enrollments
                </h4>

                <form onSubmit={handleEnrollStudent} className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Enter student emails (comma separated for bulk: student1@edu, student2@edu)"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0"
                    >
                      Enroll Student(s)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Students must log in with their whitelisted email to enter the gated workspace.
                  </p>
                </form>

                {/* Filter and List */}
                {enrollments.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center gap-3">
                      <input
                        type="text"
                        placeholder="Search enrolled student..."
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
                        className="bg-slate-950/60 border border-slate-850 rounded-lg px-3 py-1 text-[11px] text-slate-350 focus:outline-none max-w-xs w-full"
                      />
                      <span className="text-[10px] text-slate-500 font-medium">
                        Total Enrolled: {enrollments.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                      {enrollments
                        .filter((e) =>
                          e.student_email.toLowerCase().includes(emailFilter.toLowerCase())
                        )
                        .map((en) => (
                          <div
                            key={en.id}
                            className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all text-xs"
                          >
                            <span className="text-slate-300 truncate" title={en.student_email}>
                              {en.student_email}
                            </span>
                            <button
                              onClick={() => handleRemoveEnrollment(en.id)}
                              className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {enrollments.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs">
                    No students whitelisted for this cohort yet.
                  </div>
                )}
              </div>

              {/* Lesson release schedules */}
              <div className="space-y-4 pt-6 border-t border-slate-850">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-400" />
                    Lesson Release Schedules
                  </h4>
                  {classCourses.length > 0 && (
                    <button
                      onClick={() => setShowScheduleForm(!showScheduleForm)}
                      className="text-xs text-blue-600 hover:text-blue-400 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Set Schedule
                    </button>
                  )}
                </div>

                {showScheduleForm && (
                  <form onSubmit={handleAddSchedule} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Choose Lesson
                      </label>
                      <select
                        required
                        value={scheduleForm.lesson_id}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, lesson_id: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="">Select Lesson</option>
                        {lessons
                          .filter((l) => !schedules.some((s) => s.lesson_id === l.id))
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.modules?.title} - {l.title}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Release Date (Visible After)
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduleForm.visible_after}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, visible_after: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Due Date (Deliverable Limit)
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduleForm.due_date}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowScheduleForm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                      >
                        Save Schedule
                      </button>
                    </div>
                  </form>
                )}

                {schedules.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs">
                    No release schedules set yet. Lessons will be visible to students instantly by default.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((sch) => (
                      <div
                        key={sch.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all gap-4"
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-200">
                            {sch.lessons?.title}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            Module: {sch.lessons?.modules?.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 justify-between">
                          <div className="flex gap-3 text-[10px] text-slate-400">
                            {sch.visible_after && (
                              <div className="bg-slate-900 border border-slate-850 px-2 py-1 rounded">
                                <span className="font-semibold text-emerald-400">Release: </span>
                                {new Date(sch.visible_after).toLocaleDateString()}
                              </div>
                            )}
                            {sch.due_date && (
                              <div className="bg-slate-900 border border-slate-850 px-2 py-1 rounded">
                                <span className="font-semibold text-rose-400">Due: </span>
                                {new Date(sch.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteSchedule(sch.id)}
                            className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 text-sm gap-2">
              <HelpCircle className="w-8 h-8 text-slate-600" />
              <span>Select a class cohort from the list to assign courses, generate lock keys, and schedule calendars.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminClasses() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AdminClassesContent />
    </Suspense>
  )
}
