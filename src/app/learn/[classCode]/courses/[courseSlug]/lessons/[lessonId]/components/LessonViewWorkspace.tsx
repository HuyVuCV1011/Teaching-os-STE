'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Clock, PartyPopper } from 'lucide-react'
import TheoryRenderer from '@/components/TheoryRenderer'
import LessonCompletionButton from '@/components/LessonCompletionButton'
import LessonDiscussion from '@/components/LessonDiscussion'
import { StudentMaterialPreviewCard } from './StudentMaterialPreviewCard'
import { LessonSidebar } from './LessonSidebar'
import ZenModeToggle from '@/components/ZenModeToggle'
import { getGridColsClass } from '../utils/lessonUtils'

interface LessonViewWorkspaceProps {
  classCode: string
  courseSlug: string
  lessonId: string
  studentEmail: string
  classData: LessonClassData
  lessonData: LessonData
  preparedMaterials: LessonMaterial[]
  assignmentsData: LessonAssignment[] | null
  links: LessonResourceLink[]
}

interface LessonClassData {
  id: string
  name?: string | null
}

interface LessonData {
  id: string
  title: string
  content?: string | null
  download_allowed?: boolean | null
  grid_layout?: string | null
  metadata?: {
    grid_cell_mapping?: Record<string | number, LessonMaterial | LessonMaterial[] | null>
  } | null
  modules?: {
    title?: string | null
    courses?: {
      title?: string | null
    } | null
    lessons?: ModuleLesson[]
  } | null
}

interface ModuleLesson {
  id: string
  title: string
  order_index?: number | null
  order?: number | null
  metadata?: {
    status?: string | null
  } | null
}

interface LessonMaterial {
  id: string
  title: string
  type: string
  storage_url?: string | null
  signedUrl?: string | null
  metadata?: {
    viewer_artifact?: ViewerArtifact
    display_mode?: string
  } | null
}

interface ViewerArtifact {
  headers?: string[]
  rows?: unknown[][]
  row_count?: number
  col_count?: number
  viewer_html?: string
  viewer_markdown?: string
  viewer_json?: unknown
  raw_text?: unknown
}

interface LessonResourceLink {
  id: string
  title: string
  type: string
  storage_url: string
}

interface LessonAssignment {
  id: string
  title: string
  instructions?: string | null
}

export function LessonViewWorkspace({
  classCode,
  courseSlug,
  lessonId,
  studentEmail,
  classData,
  lessonData,
  preparedMaterials,
  assignmentsData,
  links,
}: LessonViewWorkspaceProps) {
  const [mode, setMode] = useState<'stacked' | 'split'>('stacked')
  const [splitWidth, setSplitWidth] = useState(50)
  const [showCelebration, setShowCelebration] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const isDraggingRef = useRef(false)

  // List of previewable types that can be loaded in the split viewer
  const previewableTypes = ['pdf', 'docx', 'csv', 'xlsx', 'markdown', 'json', 'code_repo']
  const previewableMaterials = preparedMaterials.filter((m) => {
    const isCodeFile = ['code_repo', 'json', 'markdown'].includes(m.type) || 
      m.storage_url?.endsWith('.ipynb') || 
      m.storage_url?.endsWith('.py') || 
      m.storage_url?.endsWith('.sql')
    return previewableTypes.includes(m.type) || isCodeFile
  })

  const [activeMaterialId, setActiveMaterialId] = useState<string>('')

  // Set the first previewable material as default active
  useEffect(() => {
    if (previewableMaterials.length > 0 && !activeMaterialId) {
      setActiveMaterialId(previewableMaterials[0].id)
    }
  }, [previewableMaterials, activeMaterialId])

  const activeMaterial = previewableMaterials.find((m) => m.id === activeMaterialId)
  const downloadAllowed = lessonData.download_allowed !== false

  // 2.H Reading time estimate: strip HTML tags, count words at 200 wpm
  const readingMinutes = React.useMemo(() => {
    if (!lessonData.content) return null
    const text = lessonData.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text.split(' ').filter(Boolean).length
    const mins = Math.ceil(words / 200)
    return mins < 1 ? null : mins
  }, [lessonData.content])

  // 2.C Progress context: lesson index within the module
  const { moduleLesson, nextLesson } = React.useMemo(() => {
    const lessons = lessonData.modules?.lessons ?? []
    // Filter out draft lessons
    const activeLessons = lessons.filter((lesson) => lesson.metadata?.status !== 'draft')
    const sorted = [...activeLessons].sort((a, b) => (a.order_index ?? a.order ?? 0) - (b.order_index ?? b.order ?? 0))
    const idx = sorted.findIndex((lesson) => lesson.id === lessonId)
    const progress = idx >= 0 ? { current: idx + 1, total: sorted.length } : null
    const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
    return { moduleLesson: progress, nextLesson: next }
  }, [lessonData.modules, lessonId])

  const handleFirstComplete = useCallback(() => {
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 5000)
  }, [])

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktopQuery = window.matchMedia('(min-width: 768px)')

    const syncPreferences = () => {
      setPrefersReducedMotion(reducedMotionQuery.matches)
      if (!desktopQuery.matches) {
        setMode('stacked')
      }
    }

    syncPreferences()
    reducedMotionQuery.addEventListener('change', syncPreferences)
    desktopQuery.addEventListener('change', syncPreferences)

    return () => {
      reducedMotionQuery.removeEventListener('change', syncPreferences)
      desktopQuery.removeEventListener('change', syncPreferences)
    }
  }, [])

  const updateSplitWidth = useCallback((clientX: number) => {
    const container = document.getElementById('lesson-workspace-split')
    if (!container) return

    const rect = container.getBoundingClientRect()
    const newWidth = ((clientX - rect.left) / rect.width) * 100
    setSplitWidth(Math.min(Math.max(newWidth, 25), 75))
  }, [])

  const startDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    isDraggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    updateSplitWidth(event.clientX)
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return
      updateSplitWidth(event.clientX)
    }

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [updateSplitWidth])

  const handleSeparatorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5
    let nextWidth = splitWidth

    if (event.key === 'ArrowLeft') nextWidth -= step
    else if (event.key === 'ArrowRight') nextWidth += step
    else if (event.key === 'Home') nextWidth = 25
    else if (event.key === 'End') nextWidth = 75
    else return

    event.preventDefault()
    setSplitWidth(Math.min(Math.max(nextWidth, 25), 75))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 2.B Lesson Completion Celebration Overlay */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          {/* Confetti dots */}
          {!prefersReducedMotion && Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce opacity-80"
              style={{
                left: `${5 + (i * 3.2) % 90}%`,
                top: `${10 + (i * 7) % 60}%`,
                background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6],
                animationDelay: `${(i * 0.08) % 0.8}s`,
                animationDuration: `${0.6 + (i % 4) * 0.15}s`,
              }}
            />
          ))}
          {/* Toast banner */}
          <div className="pointer-events-auto bg-slate-900 border border-emerald-500/30 rounded-2xl px-8 py-5 shadow-2xl flex flex-col items-center gap-2 text-center max-w-sm mx-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-1">
              <PartyPopper className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-base font-bold text-slate-100">Lesson Complete! 🎉</p>
            <p className="text-xs text-slate-400">Great work! Keep up the momentum.</p>
            {nextLesson && (
              <Link
                href={`/learn/${classCode}/courses/${courseSlug}/lessons/${nextLesson.id}`}
                className="mt-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                Next Lesson <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Navigation and Layout Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-slate-800 bg-slate-950 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/learn/${classCode}/courses/${courseSlug}/roadmap`}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-600 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
                {lessonData.modules?.courses?.title} / {lessonData.modules?.title}
              </span>
              {moduleLesson && (
                <span className="text-[10px] font-bold text-blue-500/80 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                  {moduleLesson.current} / {moduleLesson.total}
                </span>
              )}
              {readingMinutes && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                  <Clock className="w-3 h-3" />
                  {readingMinutes} min read
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-slate-100 truncate mt-0.5">{lessonData.title}</h1>
          </div>
        </div>

        {/* View Workspace Mode Selector */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1 shrink-0">
            <button
              onClick={() => setMode('stacked')}
              className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                mode === 'stacked'
                  ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              Default View
            </button>
            <button
              onClick={() => setMode('split')}
              className={`hidden md:block px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-bold transition-colors cursor-pointer ${
                mode === 'split'
                  ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              Split Screen
            </button>
          </div>
          <div className="h-5 w-px bg-slate-800 mx-1" />
          <div className="flex items-center gap-2 shrink-0">
            <ZenModeToggle />
            <LessonCompletionButton
              classId={classData.id}
              classCode={classCode}
              lessonId={lessonId}
              studentEmail={studentEmail}
              onFirstComplete={handleFirstComplete}
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Frame */}
      {mode === 'split' ? (
        /* Split-screen Layout Workspace */
        <div
          id="lesson-workspace-split"
          className="flex gap-1 h-[680px] border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl relative select-none"
        >
          {/* Left Panel: Guide/Theory Overview */}
          <div
            style={{ width: `${splitWidth}%` }}
            className="h-full overflow-y-auto p-6 md:p-8 bg-slate-950 custom-scrollbar select-text"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 pb-2 border-b border-slate-800">
              Overview & Guide
            </h2>
            {lessonData.content ? (
              <TheoryRenderer content={lessonData.content} />
            ) : (
              <p className="text-xs text-slate-500 italic">No guide instructions available for this session.</p>
            )}
          </div>

          {/* Draggable vertical divider */}
          <div
            role="separator"
            aria-label="Điều chỉnh độ rộng nội dung bài học"
            aria-orientation="vertical"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(splitWidth)}
            tabIndex={0}
            onPointerDown={startDragging}
            onKeyDown={handleSeparatorKeyDown}
            className="w-2 bg-slate-900 border-x border-slate-800 hover:bg-blue-600 hover:border-blue-700 cursor-col-resize transition-colors shrink-0 flex items-center justify-center group touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
          >
            <div className="w-0.5 h-6 bg-slate-700 group-hover:bg-white rounded transition-colors" />
          </div>

          {/* Right Panel: Active Handout previewer */}
          <div className="flex-1 h-full flex flex-col min-w-0 bg-slate-950">
            {previewableMaterials.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic text-xs p-6 bg-slate-900/10">
                No previewable documents registered for this lesson.
              </div>
            ) : (
              <>
                {/* Handouts tabs selection bar */}
                <div className="flex items-center gap-2 p-3 bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0 custom-scrollbar">
                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest px-2 shrink-0">
                    Handouts:
                  </span>
                  {previewableMaterials.map((mat) => {
                    const isActive = activeMaterialId === mat.id
                    return (
                      <button
                        key={mat.id}
                        onClick={() => setActiveMaterialId(mat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold truncate max-w-[150px] transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600 shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-100'
                        }`}
                        title={mat.title}
                      >
                        {mat.title}
                      </button>
                    )
                  })}
                </div>

                {/* Handout Viewport */}
                <div className="flex-1 min-h-0 flex flex-col p-6 bg-slate-900/10 select-text">
                  {activeMaterial ? (
                    <StudentMaterialPreviewCard m={activeMaterial} downloadAllowed={downloadAllowed} isSplit={true} />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 italic text-xs">
                      Select a handout to launch previewer.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Standard Stacked View Layout (Legacy default) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Main lesson content & Discussion */}
          <div className="lg:col-span-3 space-y-8">
            {/* Rich Text Lesson Content */}
            {lessonData.content && lessonData.content.trim() !== '' && (
              <div className="border border-slate-800 bg-slate-950 rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6 pb-2 border-b border-slate-800">
                  Overview & Guide
                </h2>
                <TheoryRenderer content={lessonData.content} />
              </div>
            )}

            {/* Grid-Mapped Materials */}
            {(() => {
              const gridLayout = lessonData.grid_layout || '1-col'
              const rawCellMapping = lessonData.metadata?.grid_cell_mapping || {}

              const cellMaterials: Record<number, LessonMaterial[]> = {}
              const maxCols = gridLayout === '3-cols' ? 3 : gridLayout === '2-cols' ? 2 : 1
              for (let i = 0; i < maxCols; i++) {
                const rawList = rawCellMapping[i] || []
                const list = Array.isArray(rawList) ? rawList : (rawList && rawList.id ? [rawList] : [])
                cellMaterials[i] = list.map((rawM) => {
                  const freshM = preparedMaterials.find((m) => m.id === rawM.id)
                  return freshM || rawM
                })
              }

              const unplaced = preparedMaterials.filter((m) =>
                previewableTypes.includes(m.type) &&
                !Object.values(cellMaterials).some((colList) =>
                  Array.isArray(colList) && colList.some((item) => item?.id === m.id)
                )
              )

              return (
                <div className="space-y-8">
                  {Object.values(cellMaterials).some(list => list.length > 0) && (
                    <div className={`grid gap-6 ${getGridColsClass(gridLayout)}`}>
                      {Array.from({ length: maxCols }).map((_, colIdx) => {
                        const list = cellMaterials[colIdx] || []
                        if (list.length === 0) return null

                        return (
                          <div key={colIdx} className="space-y-6 flex flex-col">
                            {list.map((material) => (
                              <div key={material.id}>
                                <StudentMaterialPreviewCard m={material} downloadAllowed={downloadAllowed} />
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {unplaced.length > 0 && (
                    <div className="pt-8 border-t border-slate-800/80 space-y-6">
                      <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Lesson Handouts & Resources
                        </h2>
                        <p className="text-[11px] text-slate-500">
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

            {/* Discussion */}
            <LessonDiscussion
              classCode={classCode}
              lessonId={lessonId}
              studentEmail={studentEmail}
            />
          </div>

          {/* Mapped external resources sidebar */}
          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <LessonSidebar
              classCode={classCode}
              assignmentsData={assignmentsData}
              links={links}
            />
          </div>
        </div>
      )}

      {/* Shared Footer Discussion section in split mode */}
      {mode === 'split' && (
        <div className="grid grid-cols-1 gap-8 items-start mt-6">
          <div className="lg:col-span-2">
            <LessonDiscussion
              classCode={classCode}
              lessonId={lessonId}
              studentEmail={studentEmail}
            />
          </div>
        </div>
      )}
    </div>
  )
}
