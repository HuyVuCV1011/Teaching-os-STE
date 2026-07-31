'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

type LessonWithModule = {
  modules?: { course_id?: string } | { course_id?: string }[] | null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Unknown error'
}

/**
 * Duplicates a course outline, cloning modules, lessons, assignments, and canonical materials.
 */
export async function duplicateCourseAction(courseId: string) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    // 1. Fetch source course
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (courseErr || !course) {
      throw new Error(`Course not found: ${courseErr?.message || 'Unknown'}`)
    }

    // Generate unique slug
    const timestamp = Math.floor(Date.now() / 1000)
    const newSlug = `${course.slug}-clone-${timestamp}`
    const newTitle = `${course.title} (Cloned)`

    // 2. Insert cloned course
    const { data: newCourse, error: newCourseErr } = await supabase
      .from('courses')
      .insert({
        subject_id: course.subject_id,
        slug: newSlug,
        title: newTitle,
        description: course.description,
        status: 'draft', // cloned course starts as draft
        version: 1
      })
      .select('id')
      .single()

    if (newCourseErr || !newCourse) {
      throw new Error(`Failed to create cloned course: ${newCourseErr?.message || 'Unknown'}`)
    }

    // 3. Fetch modules and lessons
    const { data: modules, error: modErr } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('order_index')

    if (modErr) throw modErr

    if (modules && modules.length > 0) {
      for (const mod of modules) {
        // Clone Module
        const { data: newMod, error: newModErr } = await supabase
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: mod.title,
            order_index: mod.order_index
          })
          .select('id')
          .single()

        if (newModErr || !newMod) throw newModErr

        const lessons = mod.lessons || []
        for (const lesson of lessons) {
          // Clone Lesson
          const { data: newLesson, error: newLessonErr } = await supabase
            .from('lessons')
            .insert({
              module_id: newMod.id,
              title: lesson.title,
              content: lesson.content,
              order_index: lesson.order_index,
              version: 1
            })
            .select('id')
            .single()

          if (newLessonErr || !newLesson) throw newLessonErr

          // Clone Canonical Materials for this lesson
          const { data: materials } = await supabase
            .from('canonical_materials')
            .select('*')
            .eq('lesson_id', lesson.id)

          if (materials && materials.length > 0) {
            const materialInserts = materials.map(m => ({
              lesson_id: newLesson.id,
              title: m.title,
              type: m.type,
              storage_url: m.storage_url,
              flow_diagram: m.flow_diagram,
              metadata: m.metadata
            }))
            const { error: matInsErr } = await supabase
              .from('canonical_materials')
              .insert(materialInserts)
            if (matInsErr) throw matInsErr
          }

          // Clone Assignments for this lesson
          const { data: assignments } = await supabase
            .from('assignments')
            .select('*')
            .eq('lesson_id', lesson.id)

          if (assignments && assignments.length > 0) {
            const assignmentInserts = assignments.map(a => ({
              lesson_id: newLesson.id,
              title: a.title,
              instructions: a.instructions,
              rubric_id: a.rubric_id,
              max_score: a.max_score,
              auto_publish_grades: a.auto_publish_grades,
              late_policy: a.late_policy
            }))
            const { error: asgInsErr } = await supabase
              .from('assignments')
              .insert(assignmentInserts)
            if (asgInsErr) throw asgInsErr
          }
        }
      }
    }

    return { success: true, courseId: newCourse.id }
  } catch (error) {
    console.error('Failed to duplicate course:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Saves the entire module and lesson reordering in a single transactional-like server action.
 */
export async function saveSyllabusStructureAction(
  courseId: string,
  structure: { moduleId: string; orderIndex: number; lessonIds: string[] }[]
) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    // 1. Move all affected lessons to a temporary negative order_index first 
    // to avoid unique constraint collisions (uq_module_lesson_order)
    for (let modIdx = 0; modIdx < structure.length; modIdx++) {
      const mod = structure[modIdx]
      if (mod.lessonIds && mod.lessonIds.length > 0) {
        for (let i = 0; i < mod.lessonIds.length; i++) {
          const lessonId = mod.lessonIds[i]
          const { error: tempErr } = await supabase
            .from('lessons')
            .update({
              order_index: -(i + 1 + modIdx * 100)
            })
            .eq('id', lessonId)
          if (tempErr) throw tempErr
        }
      }
    }

    // 2. Perform modules and final lesson updates sequentially
    for (const mod of structure) {
      // Update module order_index
      const { error: modErr } = await supabase
        .from('modules')
        .update({ order_index: mod.orderIndex })
        .eq('id', mod.moduleId)
        .eq('course_id', courseId)
      if (modErr) throw modErr

      // Update lessons to final module_id and positive order_index
      if (mod.lessonIds && mod.lessonIds.length > 0) {
        for (let i = 0; i < mod.lessonIds.length; i++) {
          const lessonId = mod.lessonIds[i]
          const { error: lesErr } = await supabase
            .from('lessons')
            .update({
              module_id: mod.moduleId,
              order_index: i + 1
            })
            .eq('id', lessonId)
          if (lesErr) throw lesErr
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to save syllabus structure:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Deletes a lesson and re-orders the remaining lessons in the course to prevent gaps.
 */
export async function deleteLessonAction(lessonId: string) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    // 1. Fetch lesson info to find its module and course
    const { data: lesson, error: fetchErr } = await supabase
      .from('lessons')
      .select('id, module_id, modules(course_id)')
      .eq('id', lessonId)
      .single()

    if (fetchErr || !lesson) {
      throw new Error(`Lesson not found: ${fetchErr?.message || 'Unknown'}`)
    }

    const modules = (lesson as LessonWithModule).modules
    const courseId = Array.isArray(modules)
      ? modules[0]?.course_id
      : modules?.course_id

    // 2. Delete the lesson
    const { error: delErr } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)

    if (delErr) throw delErr

    // 3. Re-order remaining lessons in this course
    if (courseId) {
      const { data: remainingLessons, error: listErr } = await supabase
        .from('lessons')
        .select('id, order_index')
        .eq('modules.course_id', courseId)
        .order('order_index', { ascending: true })

      if (!listErr && remainingLessons) {
        for (let i = 0; i < remainingLessons.length; i++) {
          await supabase
            .from('lessons')
            .update({ order_index: i + 1 })
            .eq('id', remainingLessons[i].id)
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete lesson:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Deletes a module (which deletes nested lessons via cascade) and re-orders remaining modules.
 */
export async function deleteModuleAction(moduleId: string) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    // 1. Fetch module info to find its course
    const { data: mod, error: fetchErr } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single()

    if (fetchErr || !mod) {
      throw new Error(`Module not found: ${fetchErr?.message || 'Unknown'}`)
    }

    const courseId = mod.course_id

    // 2. Delete the module
    const { error: delErr } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)

    if (delErr) throw delErr

    // 3. Re-order remaining modules in this course
    if (courseId) {
      const { data: remainingMods, error: listErr } = await supabase
        .from('modules')
        .select('id, order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (!listErr && remainingMods) {
        for (let i = 0; i < remainingMods.length; i++) {
          await supabase
            .from('modules')
            .update({ order_index: i + 1 })
            .eq('id', remainingMods[i].id)
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete module:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

type SubjectInput = {
  name: string
  slug: string
  description: string
}

type CourseInput = {
  title: string
  slug: string
  subject_id: string
  description: string
  status: string
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

export async function listLibraryAdminAction() {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const [subjectsResult, coursesResult] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase
        .from('courses')
        .select('*, subjects(name)')
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
    ])

    if (subjectsResult.error) throw subjectsResult.error
    if (coursesResult.error) throw coursesResult.error

    return {
      success: true as const,
      data: {
        subjects: subjectsResult.data || [],
        courses: coursesResult.data || [],
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function getCourseSyllabusAdminAction(courseId: string) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', requireText(courseId, 'Course id'))
      .order('order_index')
      .order('order_index', { foreignTable: 'lessons', ascending: true })

    if (error) throw error
    return { success: true as const, data: data || [] }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createSubjectAdminAction(input: SubjectInput) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: requireText(input.name, 'Subject name'),
        slug: requireText(input.slug, 'Subject slug', 150),
        description: input.description.trim(),
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createCourseAdminAction(input: CourseInput) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: requireText(input.title, 'Course title'),
        slug: requireText(input.slug, 'Course slug', 150),
        subject_id: requireText(input.subject_id, 'Subject id'),
        description: input.description.trim(),
        status: requireText(input.status, 'Course status', 50),
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createModuleAdminAction(
  courseId: string,
  title: string,
  orderIndex: number,
) {
  try {
    await requireAdminUser()
    if (!Number.isInteger(orderIndex) || orderIndex < 1) {
      throw new Error('Module order must be a positive integer')
    }

    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('modules')
      .insert({
        course_id: requireText(courseId, 'Course id'),
        title: requireText(title, 'Module title'),
        order_index: orderIndex,
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createLessonAdminAction(
  moduleId: string,
  title: string,
  orderIndex: number,
) {
  try {
    await requireAdminUser()
    if (!Number.isInteger(orderIndex) || orderIndex < 1) {
      throw new Error('Lesson order must be a positive integer')
    }

    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('lessons')
      .insert({
        module_id: requireText(moduleId, 'Module id'),
        title: requireText(title, 'Lesson title'),
        order_index: orderIndex,
        content: '{"type":"doc","content":[]}',
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function swapModuleOrderAdminAction(
  courseId: string,
  first: { id: string; orderIndex: number },
  second: { id: string; orderIndex: number },
) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const normalizedCourseId = requireText(courseId, 'Course id')
    const firstId = requireText(first.id, 'First module id')
    const secondId = requireText(second.id, 'Second module id')

    const { error: temporaryError } = await supabase
      .from('modules')
      .update({ order_index: -1 })
      .eq('id', firstId)
      .eq('course_id', normalizedCourseId)
    if (temporaryError) throw temporaryError

    const { error: secondError } = await supabase
      .from('modules')
      .update({ order_index: first.orderIndex })
      .eq('id', secondId)
      .eq('course_id', normalizedCourseId)
    if (secondError) throw secondError

    const { error: firstError } = await supabase
      .from('modules')
      .update({ order_index: second.orderIndex })
      .eq('id', firstId)
      .eq('course_id', normalizedCourseId)
    if (firstError) throw firstError

    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function swapLessonOrderAdminAction(
  moduleId: string,
  first: { id: string; orderIndex: number },
  second: { id: string; orderIndex: number },
) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const normalizedModuleId = requireText(moduleId, 'Module id')
    const firstId = requireText(first.id, 'First lesson id')
    const secondId = requireText(second.id, 'Second lesson id')

    const { error: temporaryError } = await supabase
      .from('lessons')
      .update({ order_index: -1 })
      .eq('id', firstId)
      .eq('module_id', normalizedModuleId)
    if (temporaryError) throw temporaryError

    const { error: secondError } = await supabase
      .from('lessons')
      .update({ order_index: first.orderIndex })
      .eq('id', secondId)
      .eq('module_id', normalizedModuleId)
    if (secondError) throw secondError

    const { error: firstError } = await supabase
      .from('lessons')
      .update({ order_index: second.orderIndex })
      .eq('id', firstId)
      .eq('module_id', normalizedModuleId)
    if (firstError) throw firstError

    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}
