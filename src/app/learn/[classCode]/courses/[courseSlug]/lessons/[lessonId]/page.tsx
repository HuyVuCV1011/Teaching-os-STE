import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DocumentViewer from '@/components/DocumentViewer'
import { ArrowLeft, Lock, Calendar, FileText, Globe, Code } from 'lucide-react'

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

  // 3. Enforce Release Gate: If visible_after is in future OR is NULL, block access
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Lesson is Locked</h1>
          <p className="text-slate-400 text-sm">
            This module node is protected until its release date specified by the instructor.
          </p>
        </div>
        {scheduleData?.visible_after ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Unlocks on {new Date(scheduleData.visible_after).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Unlock schedule not configured.</span>
        )}
        <Link
          href={`/learn/${classCode}/courses/${courseSlug}/roadmap`}
          className="text-xs text-blue-600 hover:text-blue-400 font-semibold flex items-center gap-1.5 transition-colors pt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Roadmap
        </Link>
      </div>
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

  // 5. Generate signed URLs for private PDF assets (valid for 300s)
  const preparedMaterials = await Promise.all(
    (materialsData || []).map(async (m) => {
      if (m.type === 'pdf') {
        const { data, error } = await supabase.storage
          .from('teaching-materials')
          .createSignedUrl(m.storage_url, 300)

        return {
          ...m,
          signedUrl: data?.signedURL || data?.publicUrl || m.storage_url, // fallback
        }
      }
      return m
    })
  )

  const pdfMaterial = preparedMaterials.find((m) => m.type === 'pdf')
  const links = preparedMaterials.filter((m) => m.type !== 'pdf')

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link
          href={`/learn/${classCode}/courses/${courseSlug}/roadmap`}
          className="p-2 rounded-lg bg-slate-900 border border-slate-500 text-slate-400 hover:text-white hover:border-slate-400 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold">
            {lessonData.modules?.courses?.title} / {lessonData.modules?.title}
          </span>
          <h1 className="text-2xl font-bold text-white mt-0.5">{lessonData.title}</h1>
        </div>
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
              className="prose prose-invert max-w-none text-slate-350 leading-relaxed text-sm"
              dangerouslySetInnerHTML={{ __html: lessonData.content || '' }}
            />
          </div>

          {/* Secure Document Viewer */}
          {pdfMaterial && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Lesson Guide Document
              </h2>
              <DocumentViewer url={pdfMaterial.signedUrl} title={pdfMaterial.title} />
            </div>
          )}
        </div>

        {/* Mapped external resources */}
        <div className="space-y-6">
          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800">Resources & Repositories</h3>
            {links.length === 0 ? (
              <p className="text-xs text-slate-550 italic">No additional links mapped to this lesson.</p>
            ) : (
              <div className="space-y-2.5">
                {links.map((link) => {
                  const isRepo = link.type === 'code_repo'
                  return (
                    <a
                      key={link.id}
                      href={link.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-500 hover:border-slate-400 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        {isRepo ? <Code className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                          {link.title}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                          {isRepo ? 'Git Repository' : 'External Link'}
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
