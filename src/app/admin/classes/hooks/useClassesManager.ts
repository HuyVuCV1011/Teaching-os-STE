'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import {
  addClassScheduleAdminAction,
  assignCourseAdminAction,
  createClassAnnouncementAdminAction,
  deleteClassAdminAction,
  deleteClassAnnouncementAdminAction,
  deleteClassScheduleAdminAction,
  enrollStudentsAdminAction,
  getClassAnalyticsAdminAction,
  getClassWorkspaceAdminAction,
  listClassAnnouncementsAdminAction,
  listClassesAdminAction,
  removeEnrollmentAdminAction,
  replaceClassSchedulesAdminAction,
  saveClassAdminAction,
  unassignCourseAdminAction,
} from '../actions'

type WorkspaceTab = 'syllabus' | 'notices' | 'analytics'

interface SubjectRow {
  id?: string
  name?: string | null
}

interface CourseRow {
  id: string
  title?: string | null
  slug?: string | null
  subject_id?: string | null
  status?: string | null
  subjects?: SubjectRow | null
}

interface ClassRow {
  id: string
  name?: string | null
  class_code?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  course_id?: string | null
  courses?: CourseRow | null
}

interface ClassCourseMapping {
  id: string
  class_id?: string | null
  course_id?: string | null
  courses?: CourseRow | null
}

interface LessonModuleRow {
  title?: string | null
  order_index?: number | null
  course_id?: string | null
}

interface LessonRow {
  id: string
  title?: string | null
  order_index?: number | null
  modules?: LessonModuleRow | null
}

interface ScheduleRow {
  id: string
  lesson_id?: string | null
  visible_after?: string | null
  due_date?: string | null
  lessons?: LessonRow | null
}

interface EnrollmentRow {
  id: string
  student_email?: string | null
}

interface AnnouncementRow {
  id: string
  title?: string | null
  content?: string | null
  created_at?: string | null
}

interface AnalyticsAssignment {
  id: string
  title?: string | null
  lesson_id?: string | null
}

interface AnalyticsSubmission {
  id: string
  assignment_id?: string | null
  student_identifier?: string | null
  created_at?: string | null
  status?: string | null
  is_late?: boolean | null
  grading_results?: {
    status?: string | null
    total_score?: string | number | null
    rubric_scores?: {
      score?: string | number | null
      rubric_criteria?: {
        name?: string | null
        max_points?: number | null
      } | null
    }[] | null
  } | null
  assignments?: {
    title?: string | null
  } | null
}

interface ClassFormState {
  name: string
  class_code: string
  status: string
  start_date: string
  end_date: string
  course_id: string
}

interface ScheduleFormState {
  lesson_id: string
  visible_after: string
  due_date: string
}

interface BulkFormState {
  start_date: string
  interval_days: string
  due_offset_days: string
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function useClassesManager(initialAction: string | null) {
  const router = useRouter()

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)

  // Class Form State
  const [classForm, setClassForm] = useState<ClassFormState>({
    name: '',
    class_code: '',
    status: 'upcoming',
    start_date: '',
    end_date: '',
    course_id: '', // Added primary course selection
  })
  const [showClassForm, setShowClassForm] = useState(initialAction === 'new')
  const [editingClassId, setEditingClassId] = useState<string | null>(null)

  // Cohort Mapping / Course Mapping State
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [classCourses, setClassCourses] = useState<ClassCourseMapping[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  
  // Schedules State
  const [lessons, setLessons] = useState<LessonRow[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>({
    lesson_id: '',
    visible_after: '',
    due_date: '',
  })
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  // Bulk Scheduling State
  const [bulkForm, setBulkForm] = useState<BulkFormState>({
    start_date: '',
    interval_days: '7',
    due_offset_days: '5',
  })
  const [showBulkForm, setShowBulkForm] = useState(false)

  // Whitelist State
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [emailFilter, setEmailFilter] = useState('')

  // Workspace Active Tab
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('syllabus')

  // Notices State
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticeSubmitting, setNoticeSubmitting] = useState(false)
  const [noticeLoading, setNoticeLoading] = useState(false)

  // Analytics State
  const [analyticsSubmissions, setAnalyticsSubmissions] = useState<AnalyticsSubmission[]>([])
  const [analyticsAssignments, setAnalyticsAssignments] = useState<AnalyticsAssignment[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    if (!selectedClass) return
    setNoticeLoading(true)
    try {
      const result = await listClassAnnouncementsAdminAction(selectedClass.id)
      if (!result.success) throw new Error(result.error)
      setAnnouncements(result.data as AnnouncementRow[])
    } catch (err) {
      console.error('Error fetching announcements:', err)
      toast.error('Không thể tải bảng thông báo của lớp.')
    } finally {
      setNoticeLoading(false)
    }
  }, [selectedClass])

  const fetchAnalytics = useCallback(async () => {
    if (!selectedClass) return
    setAnalyticsLoading(true)
    try {
      const result = await getClassAnalyticsAdminAction(
        selectedClass.id,
        lessons.map((lesson) => lesson.id),
      )
      if (!result.success) throw new Error(result.error)
      setAnalyticsSubmissions(result.data.submissions as AnalyticsSubmission[])
      setAnalyticsAssignments(result.data.assignments as AnalyticsAssignment[])
    } catch (err) {
      console.error('Error fetching analytics:', err)
      toast.error('Không thể tải dữ liệu phân tích của lớp.')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [lessons, selectedClass])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorState(null)

    try {
      const result = await listClassesAdminAction()
      if (!result.success) throw new Error(result.error)
      setClasses(result.data.classes as ClassRow[])
      setCourses(result.data.courses as CourseRow[])
    } catch (error) {
      console.error('Error fetching classes metadata:', error)
      setErrorState(getErrorMessage(error, 'Không thể tải dữ liệu lớp học.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-fetch notices/analytics on tab switch
  useEffect(() => {
    if (selectedClass) {
      if (activeWorkspaceTab === 'notices') {
        fetchAnnouncements()
      } else if (activeWorkspaceTab === 'analytics') {
        fetchAnalytics()
      }
    }
  }, [activeWorkspaceTab, fetchAnalytics, fetchAnnouncements, selectedClass])

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !noticeTitle.trim() || !noticeContent.trim() || noticeSubmitting) return
    setNoticeSubmitting(true)
    try {
      const result = await createClassAnnouncementAdminAction(
        selectedClass.id,
        noticeTitle,
        noticeContent,
      )
      if (!result.success) throw new Error(result.error)
      setNoticeTitle('')
      setNoticeContent('')
      await fetchAnnouncements()
    } catch (err) {
      toast.error(`Failed to create announcement: ${getErrorMessage(err, 'Unknown announcement error')}`)
    } finally {
      setNoticeSubmitting(false)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      const result = await deleteClassAnnouncementAdminAction(id)
      if (!result.success) throw new Error(result.error)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      toast.error(`Failed to delete announcement: ${getErrorMessage(err, 'Unknown delete error')}`)
    }
  }

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classForm.name || !classForm.class_code || !classForm.start_date || !classForm.end_date) return

    try {
      const cohortPayload = {
        name: classForm.name,
        class_code: classForm.class_code,
        status: classForm.status,
        start_date: classForm.start_date,
        end_date: classForm.end_date,
        course_id: classForm.course_id || null,
      }
      const result = await saveClassAdminAction(editingClassId, cohortPayload)
      if (!result.success) throw new Error(result.error)
      const classId = result.data.id

      setClassForm({
        name: '',
        class_code: '',
        status: 'upcoming',
        start_date: '',
        end_date: '',
        course_id: '',
      })
      setEditingClassId(null)
      setShowClassForm(false)
      
      // Refresh list
      await fetchData()

      // Refresh selected class view if we edited it
      if (classId && selectedClass?.id === classId) {
        const updatedClass = result.data as ClassRow
        setSelectedClass(updatedClass)
        await handleSelectClass(updatedClass)
      }

      router.replace('/admin/classes')
    } catch (err) {
      toast.error(`Failed to save class cohort: ${getErrorMessage(err, 'Unknown cohort save error')}`)
    }
  }

  const triggerEditClass = (cohort: ClassRow) => {
    setEditingClassId(cohort.id)
    setClassForm({
      name: cohort.name || '',
      class_code: cohort.class_code || '',
      status: cohort.status || 'upcoming',
      start_date: cohort.start_date || '',
      end_date: cohort.end_date || '',
      course_id: cohort.course_id || '',
    })
    setShowClassForm(true)
  }

  const cancelEditClass = () => {
    setEditingClassId(null)
    setClassForm({
      name: '',
      class_code: '',
      status: 'upcoming',
      start_date: '',
      end_date: '',
      course_id: '',
    })
    setShowClassForm(false)
  }

  // Alias to preserve component references
  const handleCreateClass = handleSaveClass;

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this cohort? All student submissions and scheduling will be removed.')) return
    try {
      const result = await deleteClassAdminAction(classId)
      if (!result.success) throw new Error(result.error)
      if (selectedClass?.id === classId) {
        setSelectedClass(null)
      }
      await fetchData()
    } catch (err) {
      toast.error(`Deletion failed: ${getErrorMessage(err, 'Unknown deletion error')}`)
    }
  }

  const handleSelectClass = async (cohort: ClassRow | null) => {
    if (!cohort) return
    setSelectedClass(cohort)
    setBulkForm((prev) => ({
      ...prev,
      start_date: cohort.start_date ? `${cohort.start_date}T00:00` : '',
    }))
    setLoading(true)
    try {
      const result = await getClassWorkspaceAdminAction(cohort.id)
      if (!result.success) throw new Error(result.error)
      setClassCourses(result.data.classCourses as ClassCourseMapping[])
      setSchedules(result.data.schedules as ScheduleRow[])
      setLessons(result.data.lessons as unknown as LessonRow[])
      setEnrollments(result.data.enrollments as EnrollmentRow[])
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
      toast.error('Please enter one or more valid email addresses.')
      return
    }

    try {
      const result = await enrollStudentsAdminAction(selectedClass.id, emails)
      if (!result.success) throw new Error(result.error)
      setNewEmail('')
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Enrollment failed: ${getErrorMessage(err, 'Unknown enrollment error')}`)
    }
  }

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the whitelist?')) return
    try {
      const result = await removeEnrollmentAdminAction(enrollmentId)
      if (!result.success) throw new Error(result.error)
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Failed to remove enrollment: ${getErrorMessage(err, 'Unknown enrollment removal error')}`)
    }
  }

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !selectedCourseId) return

    try {
      const result = await assignCourseAdminAction(selectedClass.id, selectedCourseId)
      if (!result.success) throw new Error(result.error)
      setSelectedCourseId('')
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Failed to map course: ${getErrorMessage(err, 'Unknown course mapping error')}`)
    }
  }

  const handleUnassignCourse = async (mappingId: string) => {
    if (!confirm('Unmap this course from the cohort?')) return
    try {
      const result = await unassignCourseAdminAction(mappingId)
      if (!result.success) throw new Error(result.error)
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Unmapping failed: ${getErrorMessage(err, 'Unknown course unmapping error')}`)
    }
  }

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !scheduleForm.lesson_id) return

    try {
      const result = await addClassScheduleAdminAction(selectedClass.id, {
        lesson_id: scheduleForm.lesson_id,
        visible_after: scheduleForm.visible_after || null,
        due_date: scheduleForm.due_date || null,
      })
      if (!result.success) throw new Error(result.error)
      setScheduleForm({ lesson_id: '', visible_after: '', due_date: '' })
      setShowScheduleForm(false)
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Failed to set schedule: ${getErrorMessage(err, 'Unknown schedule error')}`)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Remove this schedule config?')) return
    try {
      const result = await deleteClassScheduleAdminAction(scheduleId)
      if (!result.success) throw new Error(result.error)
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Failed to delete schedule: ${getErrorMessage(err, 'Unknown schedule deletion error')}`)
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

      const baseDate = bulkForm.start_date
        ? new Date(bulkForm.start_date)
        : new Date(selectedClass.start_date || Date.now())
      const interval = parseInt(bulkForm.interval_days) || 7
      const offset = parseInt(bulkForm.due_offset_days) || 5

      const scheduleInserts = sortedLessons.map((l, index) => {
        const releaseDate = new Date(baseDate)
        releaseDate.setDate(releaseDate.getDate() + index * interval)

        const dueDate = new Date(releaseDate)
        dueDate.setDate(dueDate.getDate() + offset)

        return {
          lesson_id: l.id,
          visible_after: releaseDate.toISOString(),
          due_date: dueDate.toISOString(),
        }
      })
      const result = await replaceClassSchedulesAdminAction(selectedClass.id, scheduleInserts)
      if (!result.success) throw new Error(result.error)

      toast.success(`Successfully generated release schedule for ${sortedLessons.length} lessons!`)
      setShowBulkForm(false)
      await handleSelectClass(selectedClass)
    } catch (err) {
      toast.error(`Bulk scheduling failed: ${getErrorMessage(err, 'Unknown bulk scheduling error')}`)
    }
  }

  return {
    classes,
    courses,
    loading,
    errorState,
    retryFetchData: fetchData,
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
    handleSaveClass,
    editingClassId,
    triggerEditClass,
    cancelEditClass,
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
