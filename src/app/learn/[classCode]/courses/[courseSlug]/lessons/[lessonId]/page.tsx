import React from 'react'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabase, getSupabaseServer } from '@/lib/supabase'

// Import components
import { LockedLessonView } from './components/LockedLessonView'
import { AITutorDrawer } from './components/AITutorDrawer'
import { LessonViewWorkspace } from './components/LessonViewWorkspace'

interface PageProps {
  params: Promise<{
    classCode: string
    courseSlug: string
    lessonId: string
  }>
}

export default async function LessonPage({ params }: PageProps) {
  const resolvedParams = await params
  const classCode = resolvedParams.classCode
  const courseSlug = resolvedParams.courseSlug
  const lessonId = resolvedParams.lessonId

  const cookieStore = await cookies()
  const studentEmail = cookieStore.get(`student_email_${classCode}`)?.value || ''

  // 1. Fetch Class ID matching code
  const { data: classData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('class_code', classCode.toUpperCase())
    .single()

  if (!classData) {
    return notFound()
  }

  // 2. Fetch Class Schedules release times
  const { data: scheduleData } = await supabase
    .from('class_schedules')
    .select('visible_after')
    .eq('class_id', classData.id)
    .eq('lesson_id', lessonId)
    .single()

  // 3. Enforce Release Gate
  const now = new Date()
  let isLocked = true
  if (scheduleData?.visible_after) {
    const unlockTime = new Date(scheduleData.visible_after)
    if (unlockTime <= now) {
      isLocked = false
    }
  }

  if (isLocked) {
    return (
      <LockedLessonView
        classCode={classCode}
        courseSlug={courseSlug}
        visibleAfter={scheduleData?.visible_after}
      />
    )
  }

  // 4. Fetch Lesson details & materials
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('*, modules(id, title, courses(title), lessons(id, title, order_index, metadata))')
    .eq('id', lessonId)
    .single()

  if (!lessonData) {
    return notFound()
  }

  const { data: materialsData } = await supabase
    .from('canonical_materials')
    .select('*')
    .eq('lesson_id', lessonId)
    .in('visibility', ['student', 'both'])

  // Fetch assignments attached to this lesson
  const { data: assignmentsData } = await supabase
    .from('assignments')
    .select('id, title, instructions')
    .eq('lesson_id', lessonId)

  // 5. Generate signed URLs for private assets (valid for 3600s / 1h)
  const supabaseAdmin = getSupabaseServer(true)
  const preparedMaterials = await Promise.all(
    (materialsData || []).map(async (m) => {
      const isCodeFile = ['code_repo', 'json', 'markdown'].includes(m.type) || 
        m.storage_url?.endsWith('.ipynb') || 
        m.storage_url?.endsWith('.py') || 
        m.storage_url?.endsWith('.sql')

      if (['pdf', 'docx', 'csv', 'xlsx'].includes(m.type) || isCodeFile) {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('teaching-materials')
            .createSignedUrl(m.storage_url, 3600)

          if (error) throw error

          return {
            ...m,
            signedUrl: data?.signedUrl || (data as any)?.signedURL || (data as any)?.publicUrl || m.storage_url,
          }
        } catch (err) {
          console.error(`Failed to generate signed URL for material ${m.id}:`, err)
          return {
            ...m,
            signedUrl: m.storage_url,
          }
        }
      }
      return m
    })
  )

  const downloadAllowed = lessonData.download_allowed !== false
  const previewableTypes = ['pdf', 'docx', 'csv', 'xlsx', 'markdown', 'json', 'code_repo']
  const links = preparedMaterials.filter((m) => !previewableTypes.includes(m.type))

  return (
    <>
      <LessonViewWorkspace
        classCode={classCode}
        courseSlug={courseSlug}
        lessonId={lessonId}
        studentEmail={studentEmail}
        classData={classData}
        lessonData={lessonData}
        preparedMaterials={preparedMaterials}
        assignmentsData={assignmentsData}
        links={links}
      />
      
      {/* Floating AI Tutor Drawer */}
      <AITutorDrawer classCode={classCode} lessonId={lessonId} />
    </>
  )
}
