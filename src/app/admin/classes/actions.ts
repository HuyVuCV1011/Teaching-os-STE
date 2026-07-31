'use server'

import { requireAdminUser } from '@/lib/admin-auth'
import { getSupabaseServer } from '@/lib/supabase'

type ClassPayload = {
  name: string
  class_code: string
  status: string
  start_date: string
  end_date: string
  course_id: string | null
}

type SchedulePayload = {
  lesson_id: string
  visible_after: string | null
  due_date: string | null
}

type TimelineUpdate = {
  id: string
  visible_after: string | null
  due_date: string | null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Unknown error'
}

function requireText(value: string, field: string, maxLength = 255): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`${field} is required`)
  }
  if (normalized.length > maxLength) {
    throw new Error(`${field} must be at most ${maxLength} characters`)
  }
  return normalized
}

function normalizeNullableDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value')
  }
  return date.toISOString()
}

async function getAdminClient() {
  await requireAdminUser()
  return getSupabaseServer(true)
}

export async function listClassesAdminAction() {
  try {
    const supabase = await getAdminClient()
    const [classesResult, coursesResult] = await Promise.all([
      supabase
        .from('classes')
        .select('*, courses(id, title, subjects(id, name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('courses')
        .select('*, subjects(id, name)')
        .neq('status', 'archived')
        .order('title'),
    ])

    if (classesResult.error) throw classesResult.error
    if (coursesResult.error) throw coursesResult.error

    return {
      success: true as const,
      data: {
        classes: classesResult.data || [],
        courses: coursesResult.data || [],
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function getClassWorkspaceAdminAction(classId: string) {
  try {
    const normalizedClassId = requireText(classId, 'Class id')
    const supabase = await getAdminClient()

    const [mappedCoursesResult, schedulesResult, enrollmentsResult] = await Promise.all([
      supabase
        .from('class_courses')
        .select('*, courses(id, title, slug, subject_id, subjects(id, name))')
        .eq('class_id', normalizedClassId),
      supabase
        .from('class_schedules')
        .select('*, lessons(id, title, module_id, order_index, modules(title, order_index, course_id))')
        .eq('class_id', normalizedClassId),
      supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_id', normalizedClassId)
        .order('student_email'),
    ])

    if (mappedCoursesResult.error) throw mappedCoursesResult.error
    if (schedulesResult.error) throw schedulesResult.error
    if (enrollmentsResult.error) throw enrollmentsResult.error

    const courseIds = (mappedCoursesResult.data || [])
      .map((mapping) => mapping.course_id)
      .filter((courseId): courseId is string => typeof courseId === 'string')

    let lessons: Record<string, unknown>[] = []
    if (courseIds.length > 0) {
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, order_index, course_id')
        .in('course_id', courseIds)

      if (modulesError) throw modulesError

      const moduleById = new Map((modules || []).map((module) => [module.id, module]))
      const moduleIds = Array.from(moduleById.keys())

      if (moduleIds.length > 0) {
        const { data: lessonRows, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)

        if (lessonsError) throw lessonsError
        lessons = (lessonRows || []).map((lesson) => ({
          ...lesson,
          modules: moduleById.get(lesson.module_id) || null,
        }))
      }
    }

    return {
      success: true as const,
      data: {
        classCourses: mappedCoursesResult.data || [],
        schedules: schedulesResult.data || [],
        enrollments: enrollmentsResult.data || [],
        lessons,
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function listClassAnnouncementsAdminAction(classId: string) {
  try {
    const normalizedClassId = requireText(classId, 'Class id')
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('class_announcements')
      .select('*')
      .eq('class_id', normalizedClassId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true as const, data: data || [] }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function getClassAnalyticsAdminAction(classId: string, lessonIds: string[]) {
  try {
    const normalizedClassId = requireText(classId, 'Class id')
    const supabase = await getAdminClient()
    const submissionsPromise = supabase
      .from('submissions')
      .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*))), assignments(title)')
      .eq('class_id', normalizedClassId)

    const assignmentsPromise = lessonIds.length > 0
      ? supabase
          .from('assignments')
          .select('id, title, lesson_id')
          .in('lesson_id', lessonIds)
      : Promise.resolve({ data: [], error: null })

    const [submissionsResult, assignmentsResult] = await Promise.all([
      submissionsPromise,
      assignmentsPromise,
    ])

    if (submissionsResult.error) throw submissionsResult.error
    if (assignmentsResult.error) throw assignmentsResult.error

    return {
      success: true as const,
      data: {
        submissions: submissionsResult.data || [],
        assignments: assignmentsResult.data || [],
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function saveClassAdminAction(classId: string | null, input: ClassPayload) {
  try {
    const name = requireText(input.name, 'Class name')
    const classCode = requireText(input.class_code, 'Class code', 100)
    const startDate = requireText(input.start_date, 'Start date', 50)
    const endDate = requireText(input.end_date, 'End date', 50)
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      throw new Error('End date must not be before start date')
    }

    const payload = {
      name,
      class_code: classCode,
      status: requireText(input.status, 'Status', 50),
      start_date: startDate,
      end_date: endDate,
      course_id: input.course_id || null,
    }
    const supabase = await getAdminClient()
    let savedClassId = classId

    if (classId) {
      const { error } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', classId)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('classes')
        .insert(payload)
        .select('id')
        .single()
      if (error || !data) throw error || new Error('Failed to create class')
      savedClassId = data.id
    }

    if (input.course_id && savedClassId) {
      const { error: mappingError } = await supabase
        .from('class_courses')
        .upsert(
          { class_id: savedClassId, course_id: input.course_id },
          { onConflict: 'class_id,course_id', ignoreDuplicates: true },
        )
      if (mappingError) throw mappingError
    }

    const { data: savedClass, error: savedClassError } = await supabase
      .from('classes')
      .select('*, courses(id, title, subjects(id, name))')
      .eq('id', savedClassId)
      .single()

    if (savedClassError) throw savedClassError
    return { success: true as const, data: savedClass }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function deleteClassAdminAction(classId: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', requireText(classId, 'Class id'))
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createClassAnnouncementAdminAction(
  classId: string,
  title: string,
  content: string,
) {
  try {
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('class_announcements')
      .insert({
        class_id: requireText(classId, 'Class id'),
        title: requireText(title, 'Announcement title'),
        content: requireText(content, 'Announcement content', 10_000),
      })
      .select('*')
      .single()
    if (error) throw error
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function deleteClassAnnouncementAdminAction(id: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_announcements')
      .delete()
      .eq('id', requireText(id, 'Announcement id'))
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function enrollStudentsAdminAction(classId: string, emails: string[]) {
  try {
    const normalizedClassId = requireText(classId, 'Class id')
    const normalizedEmails = Array.from(new Set(
      emails.map((email) => email.trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ))
    if (normalizedEmails.length === 0) {
      throw new Error('At least one valid student email is required')
    }
    if (normalizedEmails.length > 500) {
      throw new Error('A maximum of 500 students can be enrolled at once')
    }

    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_enrollments')
      .upsert(
        normalizedEmails.map((studentEmail) => ({
          class_id: normalizedClassId,
          student_email: studentEmail,
        })),
        { onConflict: 'class_id,student_email' },
      )
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function removeEnrollmentAdminAction(enrollmentId: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('id', requireText(enrollmentId, 'Enrollment id'))
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function assignCourseAdminAction(classId: string, courseId: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_courses')
      .upsert(
        {
          class_id: requireText(classId, 'Class id'),
          course_id: requireText(courseId, 'Course id'),
        },
        { onConflict: 'class_id,course_id', ignoreDuplicates: true },
      )
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function unassignCourseAdminAction(mappingId: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_courses')
      .delete()
      .eq('id', requireText(mappingId, 'Course mapping id'))
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function addClassScheduleAdminAction(classId: string, input: SchedulePayload) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_schedules')
      .upsert(
        {
          class_id: requireText(classId, 'Class id'),
          lesson_id: requireText(input.lesson_id, 'Lesson id'),
          visible_after: normalizeNullableDate(input.visible_after),
          due_date: normalizeNullableDate(input.due_date),
        },
        { onConflict: 'class_id,lesson_id' },
      )
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function deleteClassScheduleAdminAction(scheduleId: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
      .from('class_schedules')
      .delete()
      .eq('id', requireText(scheduleId, 'Schedule id'))
    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function replaceClassSchedulesAdminAction(
  classId: string,
  schedules: SchedulePayload[],
) {
  try {
    const normalizedClassId = requireText(classId, 'Class id')
    if (schedules.length === 0) {
      throw new Error('At least one schedule is required')
    }

    const supabase = await getAdminClient()
    const payload = schedules.map((schedule) => ({
      class_id: normalizedClassId,
      lesson_id: requireText(schedule.lesson_id, 'Lesson id'),
      visible_after: normalizeNullableDate(schedule.visible_after),
      due_date: normalizeNullableDate(schedule.due_date),
    }))
    const lessonIds = payload.map((schedule) => schedule.lesson_id)

    const { error: deleteError } = await supabase
      .from('class_schedules')
      .delete()
      .eq('class_id', normalizedClassId)
      .in('lesson_id', lessonIds)
    if (deleteError) throw deleteError

    const { error: insertError } = await supabase
      .from('class_schedules')
      .insert(payload)
    if (insertError) throw insertError

    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function updateClassTimelineAdminAction(updates: TimelineUpdate[]) {
  try {
    if (updates.length === 0) {
      return { success: true as const }
    }

    const supabase = await getAdminClient()
    for (const update of updates) {
      const { error } = await supabase
        .from('class_schedules')
        .update({
          visible_after: normalizeNullableDate(update.visible_after),
          due_date: normalizeNullableDate(update.due_date),
        })
        .eq('id', requireText(update.id, 'Schedule id'))
      if (error) throw error
    }

    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}
