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
  Megaphone,
  BarChart3,
  Send,
  ExternalLink,
  AlertTriangle,
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

  // Workspace Active Tab
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'syllabus' | 'notices' | 'analytics'>('syllabus')

  // Notices State
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticeSubmitting, setNoticeSubmitting] = useState(false)
  const [noticeLoading, setNoticeLoading] = useState(false)

  // Analytics State
  const [analyticsSubmissions, setAnalyticsSubmissions] = useState<any[]>([])
  const [analyticsAssignments, setAnalyticsAssignments] = useState<any[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-fetch notices/analytics on tab switch
  useEffect(() => {
    if (selectedClass) {
      if (activeWorkspaceTab === 'notices') {
        fetchAnnouncements()
      } else if (activeWorkspaceTab === 'analytics') {
        fetchAnalytics()
      }
    }
  }, [selectedClass?.id, activeWorkspaceTab, lessons])

  const fetchAnnouncements = async () => {
    if (!selectedClass) return
    setNoticeLoading(true)
    try {
      const { data, error } = await supabase
        .from('class_announcements')
        .select('*')
        .eq('class_id', selectedClass.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
    } finally {
      setNoticeLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!selectedClass) return
    setAnalyticsLoading(true)
    try {
      // 1. Fetch submissions for this class
      const { data: subsData, error: subsError } = await supabase
        .from('submissions')
        .select('*, grading_results(*), assignments(title)')
        .eq('class_id', selectedClass.id)

      if (subsError) throw subsError
      setAnalyticsSubmissions(subsData || [])

      // 2. Fetch assignments for the cohort lessons
      if (lessons.length > 0) {
        const { data: assignData, error: assignError } = await supabase
          .from('assignments')
          .select('id, title, lesson_id')
          .in('lesson_id', lessons.map((l) => l.id))

        if (assignError) throw assignError
        setAnalyticsAssignments(assignData || [])
      } else {
        setAnalyticsAssignments([])
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !noticeTitle.trim() || !noticeContent.trim() || noticeSubmitting) return
    setNoticeSubmitting(true)
    try {
      const { error } = await supabase
        .from('class_announcements')
        .insert([
          {
            class_id: selectedClass.id,
            title: noticeTitle.trim(),
            content: noticeContent.trim()
          }
        ])

      if (error) throw error
      setNoticeTitle('')
      setNoticeContent('')
      fetchAnnouncements()
    } catch (err: any) {
      alert(`Failed to create announcement: ${err.message}`)
    } finally {
      setNoticeSubmitting(false)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      const { error } = await supabase
        .from('class_announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (err: any) {
      alert(`Failed to delete announcement: ${err.message}`)
    }
  }

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
            <form onSubmit={handleCreateClass} className="p-5 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
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
                    : 'border-slate-700 bg-slate-900/10 hover:bg-slate-900/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {c.class_code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      c.status === 'running'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-850 border-slate-700 text-slate-400'
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
                <div className="flex gap-4 text-xs text-slate-500 mt-2">
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
            <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-700">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Cohort Workspace
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedClass.name}</h3>
                </div>
                <div className="text-xs text-slate-400 sm:text-right">
                  <span className="block font-semibold font-mono text-slate-200">Code: {selectedClass.class_code}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">LMS Command Center</span>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-700 gap-6">
                <button
                  onClick={() => setActiveWorkspaceTab('syllabus')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeWorkspaceTab === 'syllabus'
                      ? 'border-blue-600 text-blue-500'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Syllabus & Students
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('notices')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeWorkspaceTab === 'notices'
                      ? 'border-blue-600 text-blue-500'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Notice Board
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('analytics')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeWorkspaceTab === 'analytics'
                      ? 'border-blue-600 text-blue-500'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cohort Analytics
                </button>
              </div>

              {/* Tab 1: Syllabus Config */}
              {activeWorkspaceTab === 'syllabus' && (
                <div className="space-y-8">
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
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
                      <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                        No courses assigned to this cohort. Assign a course to allow release date setups.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {classCourses.map((cc) => (
                          <div
                            key={cc.id}
                            className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-700 hover:border-slate-700 transition-all"
                          >
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-200 truncate">
                                {cc.courses?.title}
                              </span>
                              <span className="block text-xs text-slate-500 font-mono mt-0.5">
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
                  <div className="space-y-4 pt-6 border-t border-slate-700">
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
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0"
                        >
                          Enroll Student(s)
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
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
                            className="bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-1 text-[11px] text-slate-350 focus:outline-none max-w-xs w-full"
                          />
                          <span className="text-xs text-slate-500 font-medium">
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
                                className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-700 hover:border-slate-700 transition-all text-xs"
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
                      <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                        No students whitelisted for this cohort yet.
                      </div>
                    )}
                  </div>

                  {/* Lesson release schedules */}
                  <div className="space-y-4 pt-6 border-t border-slate-700">
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
                      <form onSubmit={handleAddSchedule} className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Choose Lesson
                          </label>
                          <select
                            required
                            value={scheduleForm.lesson_id}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, lesson_id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Release Date (Visible After)
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduleForm.visible_after}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, visible_after: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Due Date (Deliverable Limit)
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduleForm.due_date}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                      <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                        No release schedules set yet. Lessons will be visible to students instantly by default.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {schedules.map((sch) => (
                          <div
                            key={sch.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-700 hover:border-slate-700 transition-all gap-4"
                          >
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-200">
                                {sch.lessons?.title}
                              </span>
                              <span className="block text-xs text-slate-500 mt-0.5">
                                Module: {sch.lessons?.modules?.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 justify-between">
                              <div className="flex gap-3 text-xs text-slate-400">
                                {sch.visible_after && (
                                  <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded">
                                    <span className="font-semibold text-emerald-400">Release: </span>
                                    {new Date(sch.visible_after).toLocaleDateString()}
                                  </div>
                                )}
                                {sch.due_date && (
                                  <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded">
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
              )}

              {/* Tab 2: Notice Board */}
              {activeWorkspaceTab === 'notices' && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-emerald-400" />
                    Broadcast announcements
                  </h4>

                  {/* Broadcast Form */}
                  <form onSubmit={handleCreateAnnouncement} className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Notice Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Schedule Update, Exam Prep Guide"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Announcement Body Text
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Type the message that will display at the top of the student dashboard..."
                        value={noticeContent}
                        onChange={(e) => setNoticeContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={noticeSubmitting || !noticeTitle.trim() || !noticeContent.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                      >
                        {noticeSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Broadcast Announcement</span>
                      </button>
                    </div>
                  </form>

                  {/* Notice List */}
                  {noticeLoading ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                      No active announcements. Broadcast one above to show students immediately.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-4 rounded-xl bg-slate-950/40 border border-slate-700 flex justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-205">{ann.title}</h5>
                            <p className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                              {ann.content}
                            </p>
                            <span className="block text-[10px] text-slate-505 font-mono pt-1">
                              Posted: {new Date(ann.created_at).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors self-start shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Cohort Analytics */}
              {activeWorkspaceTab === 'analytics' && (
                <div className="space-y-8">
                  {/* Summary Metric Cards */}
                  {(() => {
                    const enrolledCount = enrollments.length
                    const assignmentCount = analyticsAssignments.length
                    const totalExpectedSubmissions = enrolledCount * assignmentCount
                    const actualSubmissionsCount = analyticsSubmissions.length
                    const submissionRate = totalExpectedSubmissions > 0 ? Math.round((actualSubmissionsCount / totalExpectedSubmissions) * 100) : 0
                    
                    const gradedSubmissions = analyticsSubmissions.filter(s => s.grading_results && s.grading_results.status === 'published')
                    const averageScore = gradedSubmissions.length > 0 
                      ? (gradedSubmissions.reduce((sum, s) => sum + parseFloat(s.grading_results.total_score), 0) / gradedSubmissions.length).toFixed(1)
                      : 'N/A'
                    
                    const backlogCount = analyticsSubmissions.filter(s => s.status === 'submitted' || s.status === 'grading_in_progress' || (s.grading_results && s.grading_results.status === 'draft')).length

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-700">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Average Grade</span>
                            <span className="text-xl font-extrabold text-blue-600 block mt-1">
                              {averageScore}{averageScore !== 'N/A' && '%'}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 block">From {gradedSubmissions.length} published marks</span>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-700">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Enrolled Students</span>
                            <span className="text-xl font-extrabold text-white block mt-1">{enrolledCount}</span>
                            <span className="text-[10px] text-slate-500 mt-1 block">Active on whitelist</span>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-700">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Submission Rate</span>
                            <span className="text-xl font-extrabold text-emerald-500 block mt-1">{submissionRate}%</span>
                            <span className="text-[10px] text-slate-500 mt-1 block">{actualSubmissionsCount} of {totalExpectedSubmissions} deliverables</span>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-700">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Grading Backlog</span>
                            <span className="text-xl font-extrabold text-amber-500 block mt-1">{backlogCount}</span>
                            <span className="text-[10px] text-slate-500 mt-1 block">Needs teacher review</span>
                          </div>
                        </div>

                        {/* Submissions Detail List */}
                        <div className="space-y-4 pt-4">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            Recent Student Submissions
                          </h4>

                          {analyticsLoading ? (
                            <div className="flex justify-center items-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                          ) : analyticsSubmissions.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                              No submissions received yet for this cohort.
                            </div>
                          ) : (
                            <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950/20">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-700 bg-slate-950/65 text-slate-400 font-bold">
                                      <th className="p-3">Student Email</th>
                                      <th className="p-3">Assignment</th>
                                      <th className="p-3">Submitted</th>
                                      <th className="p-3 text-center">Score</th>
                                      <th className="p-3 text-center">Status</th>
                                      <th className="p-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {analyticsSubmissions.map((sub) => {
                                      const grade = sub.grading_results
                                      return (
                                        <tr key={sub.id} className="border-b border-slate-700 hover:bg-slate-900/10">
                                          <td className="p-3 font-medium text-slate-205 break-all max-w-[200px]">
                                            {sub.student_identifier}
                                          </td>
                                          <td className="p-3 text-slate-350 font-semibold">{sub.assignments?.title}</td>
                                          <td className="p-3 text-slate-505">
                                            {new Date(sub.created_at).toLocaleDateString()}
                                          </td>
                                          <td className="p-3 text-center font-bold text-slate-200">
                                            {grade ? `${grade.total_score}%` : '—'}
                                          </td>
                                          <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                              sub.status === 'graded' && grade?.status === 'published'
                                                ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-450'
                                                : grade?.status === 'draft'
                                                  ? 'bg-amber-500/15 border border-amber-500/25 text-amber-450'
                                                  : 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-400'
                                            }`}>
                                              {grade?.status === 'draft' ? 'draft' : sub.status}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <a
                                              href={`/admin/grading/${sub.id}`}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
                                            >
                                              <span>Review</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* List of outstanding backlog / missing deliverables warnings */}
                        {enrolledCount > 0 && assignmentCount > 0 && (
                          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-bold text-slate-205">Instructor Insight</h5>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                Ensure grading is completed and click <strong className="text-slate-300">"Publish"</strong> on drafts in order for grades to be included in the Class Average calculation and student dashboards.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 text-sm gap-2">
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
