'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useClassesManager(initialAction: string | null) {
  const router = useRouter()

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

  // Bulk Scheduling State
  const [bulkForm, setBulkForm] = useState({
    start_date: '',
    interval_days: '7',
    due_offset_days: '5',
  })
  const [showBulkForm, setShowBulkForm] = useState(false)

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
      const { data: subsData, error: subsError } = await supabase
        .from('submissions')
        .select('*, grading_results(*), assignments(title)')
        .eq('class_id', selectedClass.id)

      if (subsError) throw subsError
      setAnalyticsSubmissions(subsData || [])

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

  const handleSelectClass = async (cohort: any) => {
    setSelectedClass(cohort)
    setBulkForm((prev) => ({
      ...prev,
      start_date: cohort.start_date ? `${cohort.start_date}T00:00` : '',
    }))
    setLoading(true)
    try {
      const { data: mappedCourses } = await supabase
        .from('class_courses')
        .select('*, courses(id, title, slug)')
        .eq('class_id', cohort.id)

      setClassCourses(mappedCourses || [])

      const { data: schedulesData } = await supabase
        .from('class_schedules')
        .select('*, lessons(id, title, module_id, modules(title))')
        .eq('class_id', cohort.id)

      setSchedules(schedulesData || [])

      if (mappedCourses && mappedCourses.length > 0) {
        const courseIds = mappedCourses.map((c: any) => c.course_id)
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*, modules(*)')
          .in('modules.course_id', courseIds)

        setLessons((lessonsData || []).filter((l: any) => l.modules))
      } else {
        setLessons([])
      }

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

  const handleBulkSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || lessons.length === 0) return

    if (!confirm(`This will generate/overwrite release schedules for all ${lessons.length} lessons in the mapped course(s). Continue?`)) return

    try {
      const sortedLessons = [...lessons].sort((a, b) => {
        const aModuleOrder = a.modules?.order_index ?? 0
        const bModuleOrder = b.modules?.order_index ?? 0
        if (aModuleOrder !== bModuleOrder) {
          return aModuleOrder - bModuleOrder
        }
        return (a.order_index ?? 0) - (b.order_index ?? 0)
      })

      const baseDate = bulkForm.start_date ? new Date(bulkForm.start_date) : new Date(selectedClass.start_date)
      const interval = parseInt(bulkForm.interval_days) || 7
      const offset = parseInt(bulkForm.due_offset_days) || 5

      const scheduleInserts = sortedLessons.map((l, index) => {
        const releaseDate = new Date(baseDate)
        releaseDate.setDate(releaseDate.getDate() + index * interval)

        const dueDate = new Date(releaseDate)
        dueDate.setDate(dueDate.getDate() + offset)

        return {
          class_id: selectedClass.id,
          lesson_id: l.id,
          visible_after: releaseDate.toISOString(),
          due_date: dueDate.toISOString(),
        }
      })

      const lessonIds = sortedLessons.map((l) => l.id)
      const { error: deleteError } = await supabase
        .from('class_schedules')
        .delete()
        .eq('class_id', selectedClass.id)
        .in('lesson_id', lessonIds)

      if (deleteError) throw deleteError

      const { error: insertError } = await supabase
        .from('class_schedules')
        .insert(scheduleInserts)

      if (insertError) throw insertError

      alert(`Successfully generated release schedule for ${sortedLessons.length} lessons!`)
      setShowBulkForm(false)
      handleSelectClass(selectedClass)
    } catch (err: any) {
      alert(`Bulk scheduling failed: ${err.message}`)
    }
  }

  return {
    classes,
    courses,
    loading,
    classForm,
    setClassForm,
    showClassForm,
    setShowClassForm,
    selectedClass,
    setSelectedClass,
    classCourses,
    selectedCourseId,
    setSelectedCourseId,
    lessons,
    schedules,
    scheduleForm,
    setScheduleForm,
    showScheduleForm,
    setShowScheduleForm,
    bulkForm,
    setBulkForm,
    showBulkForm,
    setShowBulkForm,
    enrollments,
    newEmail,
    setNewEmail,
    emailFilter,
    setEmailFilter,
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    announcements,
    noticeTitle,
    setNoticeTitle,
    noticeContent,
    setNoticeContent,
    noticeSubmitting,
    noticeLoading,
    analyticsSubmissions,
    analyticsAssignments,
    analyticsLoading,
    handleCreateClass,
    handleDeleteClass,
    handleSelectClass,
    handleEnrollStudent,
    handleRemoveEnrollment,
    handleAssignCourse,
    handleUnassignCourse,
    handleAddSchedule,
    handleDeleteSchedule,
    handleBulkSchedule,
    handleCreateAnnouncement,
    handleDeleteAnnouncement,
    fetchAnnouncements,
    fetchAnalytics,
  }
}
