'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'

async function checkAdminAuth() {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return { userId: '00000000-0000-0000-0000-000000000000' }
  }

  const cookieStore = await cookies()
  const sbToken = cookieStore.get('sb-access-token') || cookieStore.get('supabase-auth-token')

  if (!sbToken) {
    throw new Error('Unauthorized: No authentication token found')
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  let payload: any = null

  if (secret) {
    payload = await verifyJWT(sbToken.value, secret)
  } else {
    const parts = sbToken.value.split('.')
    if (parts.length === 3) {
      payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    }
  }

  if (!payload) {
    throw new Error('Unauthorized: Invalid token payload')
  }

  const role = payload.app_metadata?.role || payload.role
  const isAuthorized = [
    'admin',
    'teacher',
    'super-admin',
    'content-admin',
    'class-operator'
  ].includes(role || '')

  if (!isAuthorized) {
    throw new Error('Unauthorized: Insufficient privileges')
  }

  return { userId: payload.sub }
}

/**
 * Duplicates a course outline, cloning modules, lessons, assignments, and canonical materials.
 */
export async function duplicateCourseAction(courseId: string) {
  try {
    await checkAdminAuth()
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
  } catch (error: any) {
    console.error('Failed to duplicate course:', error)
    return { success: false, error: error.message }
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
    await checkAdminAuth()
    const supabase = getSupabaseServer(true)

    // Run updates sequentially
    for (const mod of structure) {
      // 1. Update module order_index
      const { error: modErr } = await supabase
        .from('modules')
        .update({ order_index: mod.orderIndex })
        .eq('id', mod.moduleId)
        .eq('course_id', courseId)
      if (modErr) throw modErr

      // 2. Update lessons order_index and module_id
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
  } catch (error: any) {
    console.error('Failed to save syllabus structure:', error)
    return { success: false, error: error.message }
  }
}

