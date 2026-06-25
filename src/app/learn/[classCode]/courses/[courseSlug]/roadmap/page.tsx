'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Lock, Loader2, ArrowLeft, CheckCircle2, Clock, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

interface LessonStatus {
  id: string
  title: string
  order_index: number
  isLocked: boolean
  isCompleted: boolean
  hasAssignment: boolean
  assignmentId?: string
  visibleAfter: string | null
}

interface ModuleWithLessons {
  id: string
  title: string
  order_index: number
  lessons: LessonStatus[]
}

interface RoadmapProps {
  params: Promise<{
    classCode: string
    courseSlug: string
  }>
}

export default function CourseRoadmap({ params }: RoadmapProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const courseSlug = resolvedParams.courseSlug
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [courseTitle, setCourseTitle] = useState('')
  const [modules, setModules] = useState<ModuleWithLessons[]>([])
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)

  useEffect(() => {
    async function loadRoadmap() {
      try {
        // 1. Fetch Class ID matching code
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classError || !classData) throw classError

        // 2. Fetch Course matching slug
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('slug', courseSlug.toLowerCase())
          .single()

        if (courseError || !courseData) throw courseError
        setCourseTitle(courseData.title)

        // 3. Fetch Syllabus (Modules and Lessons) for this course
        const { data: modulesData } = await supabase
          .from('modules')
          .select('*, lessons(*)')
          .eq('course_id', courseData.id)
          .order('order_index')

        // Filter out draft lessons
        modulesData?.forEach((mod: any) => {
          mod.lessons = (mod.lessons || []).filter((l: any) => l.metadata?.status !== 'draft')
        })

        // 4. Fetch Class Schedules release times
        const { data: schedulesData } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('class_id', classData.id)

        const scheduleMap = new Map<string, any>()
        schedulesData?.forEach((sched) => {
          scheduleMap.set(sched.lesson_id, sched)
        })

        // Fetch lesson progress for checkmark nodes
        const savedEmail = getCookie(`student_email_${classCode}`)
        const completedLessonIds = new Set<string>()
        if (savedEmail) {
          const { data: progressData } = await supabase
            .from('student_lesson_progress')
            .select('lesson_id')
            .eq('class_id', classData.id)
            .eq('student_email', savedEmail.trim().toLowerCase())
          
          progressData?.forEach(p => completedLessonIds.add(p.lesson_id))
        }

        // Fetch assignments indicators and map them by lesson ID
        const allLessonIds: string[] = []
        modulesData?.forEach((mod: any) => {
          mod.lessons?.forEach((l: any) => allLessonIds.push(l.id))
        })

        const lessonAssignmentMap = new Map<string, string>()
        if (allLessonIds.length > 0) {
          const { data: assignmentsData } = await supabase
            .from('assignments')
            .select('id, lesson_id')
            .in('lesson_id', allLessonIds)

          assignmentsData?.forEach(a => lessonAssignmentMap.set(a.lesson_id, a.id))
        }

        const processedModules: ModuleWithLessons[] = []
        const now = new Date()
        let tCount = 0
        let cCount = 0

        modulesData?.forEach((mod: any) => {
          const lessons = mod.lessons || []
          lessons.sort((a: any, b: any) => a.order_index - b.order_index)

          const processedLessons: LessonStatus[] = lessons.map((lesson: any) => {
            const schedule = scheduleMap.get(lesson.id)
            const visibleAfterStr = schedule?.visible_after
            
            // Release Gate: Lock if visible_after is in future OR is NULL
            let isLocked = true
            if (visibleAfterStr) {
              const unlockTime = new Date(visibleAfterStr)
              if (unlockTime <= now) {
                isLocked = false
              }
            }

            const isCompleted = completedLessonIds.has(lesson.id)
            const assignmentId = lessonAssignmentMap.get(lesson.id)
            const hasAssignment = !!assignmentId

            tCount++
            if (isCompleted) {
              cCount++
            }

            return {
              id: lesson.id,
              title: lesson.title,
              order_index: lesson.order_index,
              isLocked,
              isCompleted,
              hasAssignment,
              assignmentId,
              visibleAfter: visibleAfterStr,
            }
          })

          processedModules.push({
            id: mod.id,
            title: mod.title,
            order_index: mod.order_index,
            lessons: processedLessons,
          })
        })

        // Sort modules by order_index
        processedModules.sort((a, b) => a.order_index - b.order_index)
        setModules(processedModules)
        setTotalLessons(tCount)
        setCompletedCount(cCount)

        // Find active lesson (first unlocked & uncompleted)
        let activeId: string | null = null
        for (const mod of processedModules) {
          const active = mod.lessons.find(l => !l.isLocked && !l.isCompleted)
          if (active) {
            activeId = active.id
            break
          }
        }
        setActiveLessonId(activeId)

        // Determine default expanded modules (completed -> collapsed, in-progress/future -> expanded)
        const initialExpanded: Record<string, boolean> = {}
        let firstUncompletedFound = false
        processedModules.forEach((mod) => {
          const isCompleted = mod.lessons.length > 0 && mod.lessons.every(l => l.isCompleted)
          if (!isCompleted) {
            initialExpanded[mod.id] = true
            firstUncompletedFound = true
          } else {
            initialExpanded[mod.id] = false
          }
        })
        // If all are completed, expand the last one
        if (!firstUncompletedFound && processedModules.length > 0) {
          initialExpanded[processedModules[processedModules.length - 1].id] = true
        }
        setExpandedModules(initialExpanded)
      } catch (err) {
        console.error('Failed to parse syllabus tree:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRoadmap()
  }, [classCode, courseSlug, router])

  const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col space-y-6 max-w-4xl mx-auto px-4 py-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href={`/learn/${classCode}/dashboard`}
          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-600 transition-all shadow-sm"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold">Course Roadmap</span>
          <h2 className="text-sm font-bold text-slate-100 mt-0.5">{courseTitle || 'Loading...'}</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-4 py-32 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm">Synthesizing learning path...</span>
        </div>
      ) : modules.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-32 text-slate-500 text-sm">
          Syllabus is empty. No lessons mapped to this course yet.
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col space-y-8 pb-16"
        >
          {/* Course Progress Card */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Course Syllabus</span>
              <h1 className="text-2xl font-bold text-slate-100">{courseTitle}</h1>
              <p className="text-xs text-slate-400">Class Cohort: {classCode.toUpperCase()}</p>
            </div>
            {totalLessons > 0 && (
              <div className="w-full md:w-64 space-y-2 shrink-0">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Syllabus Progress</span>
                  <span className="text-slate-100">{completedCount}/{totalLessons} Completed</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modules timeline list */}
          <div className="space-y-12">
            {modules.map((mod, modIdx) => (
              <div key={mod.id} className="space-y-6">
                {/* Module Header Card - Toggle Expand/Collapse */}
                <button
                  onClick={() => {
                    setExpandedModules(prev => ({
                      ...prev,
                      [mod.id]: !prev[mod.id]
                    }))
                  }}
                  aria-expanded={expandedModules[mod.id] || false}
                  aria-label={mod.title}
                  className="w-full flex items-center justify-between gap-3 border-b border-slate-800 pb-3 text-left hover:border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-600/10 border border-blue-500/25 flex items-center justify-center font-bold text-blue-600 text-sm transition-colors group-hover:bg-blue-600/20">
                      {modIdx + 1}
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Module {modIdx + 1}</span>
                      <h3 className="text-base font-bold text-slate-100 leading-snug group-hover:text-blue-500 transition-colors">{mod.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {mod.lessons.length > 0 && mod.lessons.every(l => l.isCompleted) && (
                      <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block">
                        Completed
                      </span>
                    )}
                    {expandedModules[mod.id] ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    )}
                  </div>
                </button>

                {/* Module Lessons list with smooth height transition */}
                <AnimatePresence initial={false}>
                  {expandedModules[mod.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="relative pl-6 space-y-6 pt-3">
                        {/* Timeline vertical line */}
                        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 border-l-2 border-dashed border-slate-800 pointer-events-none" />

                        {mod.lessons.map((lesson, lessonIdx) => {
                          const isLocked = lesson.isLocked
                          const isCompleted = lesson.isCompleted
                          const isActiveNode = lesson.id === activeLessonId

                          return (
                            <div key={lesson.id} className="relative group">
                              {/* Timeline status dot with active glowing pulse */}
                              <div className="absolute -left-[19px] top-6 w-3 h-3 z-10">
                                {isActiveNode && (
                                  <div className="absolute -inset-1 rounded-full bg-blue-500/35 ring-4 ring-blue-500/20 animate-pulse" />
                                )}
                                <div className={`w-3 h-3 rounded-full border-2 transition-all duration-300 relative z-10 ${
                                  isLocked 
                                    ? 'bg-slate-900 border-slate-800' 
                                    : isCompleted 
                                    ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                                    : 'bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                }`} />
                              </div>

                              {/* Lesson Card */}
                              <div className={`rounded-xl border p-5 transition-all duration-300 ${
                                isLocked
                                  ? 'bg-slate-900/50 border-slate-800/60 text-slate-500 opacity-60'
                                  : isCompleted
                                  ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/50 shadow-sm'
                                  : isActiveNode
                                  ? 'bg-slate-950 border-blue-500/40 hover:border-blue-500 shadow-md ring-1 ring-blue-500/10'
                                  : 'bg-slate-950 border-slate-800 hover:border-blue-500/50 shadow-sm'
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <span className="block text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest">
                                      Lesson {mod.order_index}.{lesson.order_index}
                                    </span>
                                    <h4 className={`text-sm font-bold leading-relaxed ${isLocked ? 'text-slate-500' : 'text-slate-100 group-hover:text-blue-500 transition-colors'}`}>
                                      {lesson.title}
                                    </h4>
                                    {isLocked && lesson.visibleAfter && (
                                      <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mt-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        Unlocks: {new Date(lesson.visibleAfter).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    {/* Submit Assignment button */}
                                    {!isLocked && lesson.hasAssignment && (
                                      <button
                                        onClick={() => {
                                          if (lesson.assignmentId) {
                                            router.push(`/learn/${classCode}/assignments/${lesson.assignmentId}`)
                                          }
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        Submit Task
                                      </button>
                                    )}

                                    {/* Action Link button */}
                                    {isLocked ? (
                                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center">
                                        <Lock className="w-4 h-4" />
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          router.push(`/learn/${classCode}/courses/${courseSlug}/lessons/${lesson.id}`)
                                        }}
                                        className={`inline-flex items-center gap-1 text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                          isCompleted 
                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10'
                                        }`}
                                      >
                                        <span>{isCompleted ? 'Review' : 'Start'}</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
