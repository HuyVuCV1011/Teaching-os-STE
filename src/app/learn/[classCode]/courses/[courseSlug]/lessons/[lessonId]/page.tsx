import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabase, getSupabaseServer } from '@/lib/supabase'
import LessonCompletionButton from '@/components/LessonCompletionButton'
import LessonDiscussion from '@/components/LessonDiscussion'
import { ArrowLeft } from 'lucide-react'

// Import extracted components and utilities
import { LockedLessonView } from './components/LockedLessonView'
import { StudentMaterialPreviewCard } from './components/StudentMaterialPreviewCard'
import { LessonSidebar } from './components/LessonSidebar'
import { getGridColsClass } from './utils/lessonUtils'

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
    .select('*, modules(title, courses(title))')
    .eq('id', lessonId)
    .single()

  if (!lessonData) {
    return notFound()
  }

  const { data: materialsData } = await supabase
    .from('canonical_materials')
    .select('*')
    .eq('lesson_id', lessonId)

  // Fetch assignments attached to this lesson
  const { data: assignmentsData } = await supabase
    .from('assignments')
    .select('id, title, instructions')
    .eq('lesson_id', lessonId)

  // 5. Generate signed URLs for private assets (valid for 300s)
  const supabaseAdmin = getSupabaseServer(true)
  const preparedMaterials = await Promise.all(
    (materialsData || []).map(async (m) => {
      if (['pdf', 'docx', 'csv', 'xlsx'].includes(m.type)) {
        const { data } = await supabaseAdmin.storage
          .from('teaching-materials')
          .createSignedUrl(m.storage_url, 300)

        return {
          ...m,
          signedUrl: data?.signedUrl || data?.signedURL || data?.publicUrl || m.storage_url,
        }
      }
      return m
    })
  )

  const downloadAllowed = lessonData.download_allowed !== false
  const links = preparedMaterials.filter((m) => !['pdf', 'docx', 'csv', 'xlsx', 'markdown', 'json'].includes(m.type))

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/${classCode}/courses/${courseSlug}/roadmap`}
            className="p-2 rounded-lg bg-slate-900 border border-slate-500 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-xs text-slate-550 font-semibold">
              {lessonData.modules?.courses?.title} / {lessonData.modules?.title}
            </span>
            <h1 className="text-2xl font-bold text-slate-100 mt-0.5">{lessonData.title}</h1>
          </div>
        </div>

        <LessonCompletionButton
          classId={classData.id}
          lessonId={lessonId}
          studentEmail={studentEmail}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main lesson content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Rich Text Lesson Content */}
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6 pb-2 border-b border-slate-800">
              Overview & Guide
            </h2>
            <article
              className="prose max-w-none text-slate-700 leading-relaxed text-sm"
              dangerouslySetInnerHTML={{ __html: lessonData.content || '' }}
            />
          </div>

          {/* Grid-Mapped Materials and fallback listings */}
          {(() => {
            const gridLayout = lessonData.grid_layout || '1-col'
            const rawCellMapping = lessonData.metadata?.grid_cell_mapping || {}
            
            // Reconstruct cellMaterials containing full materials lists
            const cellMaterials: Record<number, any[]> = {}
            const maxCols = gridLayout === '3-cols' ? 3 : gridLayout === '2-cols' ? 2 : 1
            for (let i = 0; i < maxCols; i++) {
              const rawList = rawCellMapping[i] || []
              const list = Array.isArray(rawList) ? rawList : (rawList && rawList.id ? [rawList] : [])
              cellMaterials[i] = list.map((rawM: any) => {
                const freshM = preparedMaterials.find((m) => m.id === rawM.id)
                return freshM || rawM
              })
            }

            const unplaced = preparedMaterials.filter((m) => 
              ['pdf', 'docx', 'csv', 'xlsx', 'markdown', 'json'].includes(m.type) &&
              !Object.values(cellMaterials).some((colList: any) => 
                Array.isArray(colList) && colList.some((item: any) => item?.id === m.id)
              )
            )

            return (
              <div className="space-y-8">
                {/* 1. Main Grid Layout */}
                {Object.values(cellMaterials).some(list => list.length > 0) && (
                  <div className={`grid gap-6 ${getGridColsClass(gridLayout)}`}>
                    {Array.from({ length: maxCols }).map((_, colIdx) => {
                      const list = cellMaterials[colIdx] || []
                      if (list.length === 0) return null
                      
                      return (
                        <div key={colIdx} className="space-y-6 flex flex-col">
                          {list.map((material: any) => (
                            <div key={material.id}>
                              <StudentMaterialPreviewCard m={material} downloadAllowed={downloadAllowed} />
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 2. Unplaced / Additional Handouts */}
                {unplaced.length > 0 && (
                  <div className="pt-8 border-t border-slate-800 space-y-6">
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Lesson Handouts & Resources
                      </h2>
                      <p className="text-xs text-slate-400">
                        Additional documents mapped to this session.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {unplaced.map((m) => (
                        <div key={m.id}>
                          <StudentMaterialPreviewCard m={m} downloadAllowed={downloadAllowed} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Discussion comments feed */}
          <LessonDiscussion
            classId={classData.id}
            lessonId={lessonId}
            studentEmail={studentEmail}
          />
        </div>

        {/* Mapped external resources */}
        <LessonSidebar
          classCode={classCode}
          assignmentsData={assignmentsData}
          links={links}
        />
      </div>
    </div>
  )
}
