import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabase, getSupabaseServer } from '@/lib/supabase'
import DocumentViewer from '@/components/DocumentViewer'
import LessonCompletionButton from '@/components/LessonCompletionButton'
import LessonDiscussion from '@/components/LessonDiscussion'
import { ArrowLeft, Lock, Calendar, FileText, Globe, Code } from 'lucide-react'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'

function renderSimpleMarkdown(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^# (.*?)$/gm, '<h1 class="text-lg font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-200/30">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-slate-100 mt-3 mb-2 pb-0.5 border-b border-slate-200/20">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-slate-100 mt-2 mb-1">$1</h3>')
    // Bold & Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-slate-900/10 px-1 py-0.5 rounded text-rose-600 font-mono text-[11px]">$1</code>')
    // Blockquotes
    .replace(/^&gt;\s*(.*?)$/gm, '<blockquote class="border-l-4 border-indigo-400 bg-indigo-50/50 pl-3 py-1.5 my-2 rounded-r text-slate-400 italic">$1</blockquote>')
    // Links [Text](URL)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 underline transition-colors">$1</a>')
    // Bullet lists - or *
    .replace(/^[-*]\s+(.*?)$/gm, '<div class="flex items-start gap-1.5 my-1 text-slate-350"><span class="text-blue-500 font-bold shrink-0">•</span><span class="flex-1">$1</span></div>')
    // Line breaks
    .replace(/\n/g, '<br />')
  return html
}

const getGridColsClass = (layout: string) => {
  switch (layout) {
    case '1-col': return 'grid-cols-1'
    case '2-cols': return 'grid-cols-1 sm:grid-cols-2'
    case '3-cols': return 'grid-cols-1 md:grid-cols-3'
    default: return 'grid-cols-1'
  }
}


function StudentMaterialPreviewCard({ m, downloadAllowed }: { m: any; downloadAllowed: boolean }) {
  const styles = getMaterialTypeStyles(m.type)
  const Icon = getMaterialIcon(m.type)
  
  return (
    <div className="space-y-3 w-full">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
        {m.type.toUpperCase()} Document
      </h2>

      {/* PDF Preview */}
      {m.type === 'pdf' && (() => {
        const displayMode = m.metadata?.display_mode || 'both';
        return (
          <div className="space-y-3">
            {displayMode !== 'original' ? (
              <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-sm h-[450px]">
                <DocumentViewer url={m.signedUrl} title={m.title} />
              </div>
            ) : (
              <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm text-slate-800 flex justify-between items-center h-[100px]">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${getMaterialTypeStyles('pdf').iconColor}`} />
                  {m.title}
                </h3>
                {downloadAllowed ? (
                  <a
                    href={m.signedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    Download PDF
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Downloads disabled</span>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* DOCX Preview */}
      {m.type === 'docx' && (() => {
        const displayMode = m.metadata?.display_mode || 'both';
        return (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm text-slate-800 space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={m.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-[10px] border border-blue-100 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>
            {displayMode !== 'original' && (
              <div 
                className="prose max-w-none text-slate-700 leading-relaxed text-xs flex-1 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: m.metadata?.viewer_artifact?.viewer_html || '<p class="text-slate-450 italic">No HTML preview available.</p>' }}
              />
            )}
          </div>
        )
      })()}

      {/* CSV / XLSX tabular preview */}
      {['csv', 'xlsx'].includes(m.type) && (() => {
        const artifact = m.metadata?.viewer_artifact
        const headers = artifact?.headers || []
        const rows = artifact?.rows || []
        const rowCount = artifact?.row_count || 0
        const colCount = artifact?.col_count || 0
        const displayMode = m.metadata?.display_mode || 'both'

        return (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm text-slate-800 space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={m.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-650 font-semibold text-[10px] border border-emerald-100 hover:border-emerald-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>

            {displayMode !== 'original' && (
              <>
                {rows.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-150 rounded-xl flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-150 text-xs">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {headers.map((hdr: string, i: number) => (
                            <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 border-r border-slate-150 last:border-0 whitespace-nowrap bg-slate-50">
                              {hdr}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.slice(0, 5).map((row: any[], i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            {row.map((cell: any, j: number) => (
                              <td key={j} className="px-3 py-2 text-slate-650 border-r border-slate-100 last:border-0 whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No table data available.</p>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium shrink-0">
                  <span>Showing first 5 rows</span>
                  <span>Total: {rowCount} rows × {colCount} cols</span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Markdown Preview */}
      {m.type === 'markdown' && (
        <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 shadow-sm text-slate-100 space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <FileText className={`w-4 h-4 ${styles.iconColor}`} />
              {m.title}
            </h3>
            {downloadAllowed && (
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(m.metadata?.viewer_artifact?.viewer_markdown || '')}`}
                download={`${m.title}.md`}
                className="px-2.5 py-1 rounded bg-violet-50 hover:bg-violet-100 text-violet-600 font-semibold text-[10px] border border-violet-100 hover:bg-violet-100 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          <div 
            className="prose prose-invert max-w-none text-slate-350 leading-relaxed text-xs flex-1 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(m.metadata?.viewer_artifact?.viewer_markdown || '') }}
          />
        </div>
      )}

      {/* JSON Preview */}
      {m.type === 'json' && (
        <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 shadow-sm text-slate-100 space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Code className={`w-4 h-4 ${styles.iconColor}`} />
              {m.title}
            </h3>
            {downloadAllowed && (
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2))}`}
                download={`${m.title}.json`}
                className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-600 font-semibold text-[10px] border border-amber-100 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          <pre className="overflow-x-auto p-4 bg-slate-955/10 border border-slate-800 rounded-xl text-slate-350 font-mono text-xs whitespace-pre-wrap flex-1 overflow-y-auto">
            {JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

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
          <h1 className="text-2xl font-bold text-slate-100">Lesson is Locked</h1>
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
        const { data, error } = await supabaseAdmin.storage
          .from('teaching-materials')
          .createSignedUrl(m.storage_url, 300)

        return {
          ...m,
          signedUrl: data?.signedUrl || data?.signedURL || data?.publicUrl || m.storage_url, // fallback
        }
      }
      return m
    })
  )

  const downloadAllowed = lessonData.download_allowed !== false

  const pdfMaterial = preparedMaterials.find((m) => m.type === 'pdf')
  const docxMaterials = preparedMaterials.filter((m) => m.type === 'docx')
  const tabularMaterials = preparedMaterials.filter((m) => ['csv', 'xlsx'].includes(m.type))
  const markdownMaterials = preparedMaterials.filter((m) => m.type === 'markdown')
  const jsonMaterials = preparedMaterials.filter((m) => m.type === 'json')
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
            <span className="text-xs text-slate-500 font-semibold">
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
              className="prose prose-invert max-w-none text-slate-350 leading-relaxed text-sm"
              dangerouslySetInnerHTML={{ __html: lessonData.content || '' }}
            />
          </div>

          {/* Grid-Mapped Materials and fallback listings */}
          {(() => {
            const gridLayout = lessonData.grid_layout || '1-col'
            const rawCellMapping = lessonData.metadata?.grid_cell_mapping || {}
            
            // Reconstruct cellMaterials as Record<number, any[]> containing full materials lists
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
        <div className="space-y-6">
          {/* Assignments CTA Card */}
          {assignmentsData && assignmentsData.length > 0 && (
            <div className="border border-indigo-550/20 bg-slate-900/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-slate-100 text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Lesson Deliverables
              </h3>
              <div className="space-y-4">
                {assignmentsData.map((assign) => (
                  <div key={assign.id} className="space-y-1.5 p-3 rounded-xl bg-slate-950/30 border border-slate-850">
                    <h4 className="text-xs font-bold text-slate-200">{assign.title}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {assign.instructions?.replace(/<[^>]*>/g, '') || ''}
                    </p>
                    <Link
                      href={`/learn/${classCode}/assignments/${assign.id}`}
                      className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors mt-2"
                    >
                      Submit Deliverables
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-100 text-sm pb-2 border-b border-slate-800">Resources & Repositories</h3>
            {links.length === 0 ? (
              <p className="text-xs text-slate-550 italic">No additional links mapped to this lesson.</p>
            ) : (
              <div className="space-y-2.5">
                {links.map((link) => {
                  const isRepo = link.type === 'code_repo'
                  const styles = getMaterialTypeStyles(link.type)
                  const Icon = getMaterialIcon(link.type)
                  return (
                    <a
                      key={link.id}
                      href={link.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-500 hover:border-slate-400 transition-all group"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center ${styles.iconColor} transition-colors`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-200 truncate group-hover:text-slate-200 transition-colors">
                          {link.title}
                        </span>
                        <span className={`inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold mt-1 ${styles.bg}`}>
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
