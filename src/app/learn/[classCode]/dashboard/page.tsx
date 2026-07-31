'use client'

import React, { useEffect, useState, use, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/date'
import {
  BookOpen,
  ArrowRight,
  Loader2,
  Award,
  Megaphone,
  Printer
} from 'lucide-react'

// Import extracted components
import { CertificateModal } from './components/CertificateModal'

import { useLearner } from '../LearnerContext'
import { checkCertificateEligibility } from '@/lib/certificate'
import {
  fetchStudentGradesAction,
  upsertStudentCertificateAction,
} from '@/app/learn/[classCode]/assignments/[assignmentId]/actions'

interface DashboardProps {
  params: Promise<{ classCode: string }>
}

interface CourseRow {
  id: string
  title: string
  slug: string
  description?: string | null
  status?: string | null
  version?: number | null
}

interface ClassRow {
  id: string
  class_code: string
  course_id?: string | null
  name?: string | null
}

interface AnnouncementRow {
  id: string
  title: string
  content?: string | null
  created_at: string
}

interface LessonRow {
  id: string
  title: string
  order_index?: number | null
  metadata?: {
    status?: string | null
  } | null
  modules?: LessonModule | LessonModule[] | null
}

interface LessonModule {
  id?: string
  title?: string | null
  order_index?: number | null
  course_id?: string | null
  courses?: CourseRow | CourseRow[] | null
}

interface ScheduleRow {
  lesson_id: string
  visible_after?: string | null
  due_date?: string | null
}

interface AssignmentRow {
  id: string
  title: string
  lesson_id: string
  max_score?: number | null
}

interface SubmissionRow {
  id: string
  assignment_id: string
  status?: string | null
  grading_results?: GradingResultRow | null
}

interface GradingResultRow {
  id: string
  status?: string | null
  total_score?: string | number | null
}

interface SuggestedLesson {
  id: string
  title: string
  courseName: string
  courseSlug: string
}

interface DueAssignment {
  id: string
  title: string
  dueDate: Date
  daysRemaining: number
}

export default function LearnerDashboard({ params }: DashboardProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode

  const { studentEmail, isAdminPreview, identityVerified } = useLearner()

  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [classInfo, setClassInfo] = useState<ClassRow | null>(null)
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])

  // Progress & Grades State
  const [courseProgress, setCourseProgress] = useState<Record<string, { completed: number; total: number }>>({})
  const [isEligibleForCertificate, setIsEligibleForCertificate] = useState(false)
  const [hasIssuedCertificate, setHasIssuedCertificate] = useState(false)
  const [certificateGrade, setCertificateGrade] = useState(0)
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const [suggestedLesson, setSuggestedLesson] = useState<SuggestedLesson | null>(null)
  const [dueAssignments, setDueAssignments] = useState<DueAssignment[]>([])

  const loadCohortDashboard = useCallback(async () => {
    if (!identityVerified) return
    setLoading(true)
    setErrorState(null)
    try {
      // 1. Fetch Class Details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('class_code', classCode.toUpperCase())
        .single()

      if (classError || !classData) {
        throw classError || new Error('Class not found')
      }
      setClassInfo(classData)

      // 2. Fetch Announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('class_announcements')
        .select('*')
        .eq('class_id', classData.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (announcementsError) throw announcementsError
      setAnnouncements(announcementsData || [])

      // 3. Fetch Assigned Courses
      const { data: junctionData, error: juncError } = await supabase
        .from('class_courses')
        .select('*, courses(*)')
        .eq('class_id', classData.id)

      if (juncError) throw juncError

      const mappedCourses = (junctionData || [])
        .map((item: { courses?: CourseRow | null }) => item.courses)
        .filter((course): course is CourseRow => Boolean(course && course.status !== 'archived'))

      if (classData.course_id && !mappedCourses.some((course) => course.id === classData.course_id)) {
        const { data: primaryCourse, error: primaryCourseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', classData.course_id)
          .single()

        if (primaryCourseError) throw primaryCourseError
        if (primaryCourse && primaryCourse.status !== 'archived') {
          mappedCourses.unshift(primaryCourse)
        }
      }

      setCourses(mappedCourses)

      if (mappedCourses.length > 0) {
        const courseIds = mappedCourses.map(c => c.id)

        // 4. Fetch All Lessons for assigned courses
        const { data: lessonsList, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, order_index, module_id, metadata, modules(id, title, order_index, course_id, courses(id, title, slug))')
          .in('modules.course_id', courseIds)

        if (lessonsError) throw lessonsError

        const activeLessons = ((lessonsList || []) as LessonRow[]).filter((l) => l.modules && l.metadata?.status !== 'draft')
        const activeLessonIds = activeLessons.map(l => l.id)

        // Fetch all schedules for this class
        const { data: schedulesList, error: schedulesError } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('class_id', classData.id)

        if (schedulesError) throw schedulesError
        const scheduleMap = new Map(((schedulesList || []) as ScheduleRow[]).map(s => [s.lesson_id, s]))

        // Fetch assignments for the active lessons
        let assignmentsList: AssignmentRow[] = []
        if (activeLessonIds.length > 0) {
          const { data: assignData, error: assignError } = await supabase
            .from('assignments')
            .select('id, title, lesson_id, max_score')
            .in('lesson_id', activeLessonIds)
          if (assignError) throw assignError
          assignmentsList = (assignData || []) as AssignmentRow[]
        }

        // If it is an Admin/Teacher Preview, we stop here and set default empty student data
        if (isAdminPreview) {
          setCourseProgress({})
          setIsEligibleForCertificate(false)
          setHasIssuedCertificate(false)
          setCertificateGrade(0)
          setCertificateId(null)
          setSuggestedLesson(null)
          setDueAssignments([])
          setLoading(false)
          return
        }

        // 5. Fetch student-private progress, submissions and certificate state through
        // a verified server action. This keeps RLS closed to direct anon writes/reads.
        const studentGradesResult = await fetchStudentGradesAction(classCode)
        if (!studentGradesResult.success) {
          throw new Error(studentGradesResult.error || 'Failed to load private student progress')
        }

        const completedSet = new Set(studentGradesResult.completedLessonIds || [])

        // Compute course progress mapping
        const progressMap: Record<string, { completed: number; total: number }> = {}
        mappedCourses.forEach(course => {
          const courseLessons = activeLessons.filter((l) => {
            const m = Array.isArray(l.modules) ? l.modules[0] : l.modules
            return m?.course_id === course.id
          })
          const completedCount = courseLessons.filter((l) => completedSet.has(l.id)).length
          progressMap[course.id] = {
            completed: completedCount,
            total: courseLessons.length
          }
        })
        setCourseProgress(progressMap)

        // 6. Map published grades into the certificate eligibility helper format.
        const formattedSubmissions = (studentGradesResult.grades || [])
          .filter((grade) => grade.submission)
          .map((grade) => {
          const sub = grade.submission as SubmissionRow
          const gradingResult = grade.grade
            ? {
                id: grade.grade.id,
                status: grade.grade.status || 'published',
                client_total_score: parseFloat(String(grade.grade.total_score || '0')),
              }
            : null

          return {
            id: sub.id,
            assignment_id: sub.assignment_id,
            status: sub.status || 'submitted',
            grading_results: gradingResult
          }
        })

        const completedLessonIds = Array.from(completedSet)
        const certificateAssignments = assignmentsList.map((assignment) => ({
          ...assignment,
          max_score: assignment.max_score ?? 0,
        }))
        const certResult = checkCertificateEligibility(
          activeLessonIds,
          completedLessonIds,
          certificateAssignments,
          formattedSubmissions
        )

        if (certResult.eligible) {
          setIsEligibleForCertificate(true)
          setHasIssuedCertificate(true)
          setCertificateGrade(certResult.averageGrade)

          // Register certificate in database and retrieve unique UUID ID via server action.
          const certPersistResult = await upsertStudentCertificateAction(classCode)
          if (!certPersistResult.success) {
            console.error('Failed to persist certificate record:', certPersistResult.error)
          } else if (certPersistResult.certificate) {
            setCertificateId(certPersistResult.certificate.id)
          }
        } else {
          setIsEligibleForCertificate(false)
          setCertificateGrade(0)

          if (studentGradesResult.issuedCertificate) {
            setCertificateId(studentGradesResult.issuedCertificate.id)
            setHasIssuedCertificate(true)
            setCertificateGrade(Number(studentGradesResult.issuedCertificate.grade_average) || 0)
          } else {
            setCertificateId(null)
            setHasIssuedCertificate(false)
          }
        }

        // Calculate suggested lesson (first unlocked, uncompleted)
        const sortedLessons = [...activeLessons]
          .sort((a, b) => {
            const aModule = Array.isArray(a.modules) ? a.modules[0] : a.modules
            const bModule = Array.isArray(b.modules) ? b.modules[0] : b.modules
            const modDiff = (aModule?.order_index || 0) - (bModule?.order_index || 0)
            if (modDiff !== 0) return modDiff
            return (a.order_index || 0) - (b.order_index || 0)
          })

        const now = new Date()
        let foundSuggested: SuggestedLesson | null = null
        for (const l of sortedLessons) {
          if (completedSet.has(l.id)) continue
          const sched = scheduleMap.get(l.id)
          const visibleAfterStr = sched?.visible_after
          let isLocked = true
          if (visibleAfterStr) {
            const unlockTime = new Date(visibleAfterStr)
            if (unlockTime <= now) {
              isLocked = false
            }
          }
          if (!isLocked) {
            const modObj = Array.isArray(l.modules) ? l.modules[0] : l.modules
            const courseObj = Array.isArray(modObj?.courses) ? modObj.courses[0] : modObj?.courses
            foundSuggested = {
              id: l.id,
              title: l.title,
              courseName: courseObj?.title || 'Unknown Course',
              courseSlug: courseObj?.slug || '',
            }
            break
          }
        }
        setSuggestedLesson(foundSuggested)

        // Calculate due assignments
        const submittedAssignmentIds = new Set(
          (studentGradesResult.grades || [])
            .filter((grade) => grade.submission)
            .map((grade) => grade.id)
        )
        const dueSoonList: DueAssignment[] = []
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

        schedulesList?.forEach(sched => {
          if (sched.due_date) {
            const dueDate = new Date(sched.due_date)
            if (dueDate > now && dueDate <= sevenDaysFromNow) {
              const assocAssignment = assignmentsList.find(a => a.lesson_id === sched.lesson_id)
              if (assocAssignment && !submittedAssignmentIds.has(assocAssignment.id)) {
                const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                dueSoonList.push({
                  id: assocAssignment.id,
                  title: assocAssignment.title,
                  dueDate,
                  daysRemaining,
                })
              }
            }
          }
        })
        dueSoonList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        setDueAssignments(dueSoonList.slice(0, 3))
      }
    } catch (err) {
      console.error('Failed to load student courses:', err)
      const message = err instanceof Error ? err.message : 'Unknown database retrieval error'
      setErrorState(message)
    } finally {
      setLoading(false)
    }
  }, [classCode, identityVerified, isAdminPreview])

  useEffect(() => {
    loadCohortDashboard()
  }, [loadCohortDashboard])

  const handlePrintCertificate = () => {
    const printContent = printRef.current?.innerHTML
    if (printContent) {
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Certificate of Completion</title>
              <style>
                body { margin: 0; padding: 40px; font-family: sans-serif; display: flex; justify-content: center; background: #fafafa; }
                .cert-container { border: 15px double #1e3a8a; padding: 50px; text-align: center; background: white; max-width: 800px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                h1 { color: #1e3a8a; font-size: 40px; margin: 0 0 10px; }
                h2 { color: #5f6368; font-size: 20px; font-weight: normal; margin: 0 0 40px; }
                .name { font-size: 32px; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin: 30px 0; color: #0f172a; }
                p { font-size: 16px; color: #475569; line-height: 1.6; margin: 10px 0; }
                .grade { font-weight: bold; color: #0f766e; }
                .footer { margin-top: 50px; display: flex; justify-content: space-around; border-top: 1px solid #e2e8f0; pt: 20px; }
                .sig { font-style: italic; color: #64748b; font-size: 14px; }
              </style>
            </head>
            <body>
              ${printContent}
              <script>window.print();</script>
            </body>
          </html>
        `)
        win.document.close()
      }
    }
  }

  if (errorState) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400 max-w-7xl mx-auto">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-200">Không thể tải thông tin lớp học</span>
        <span className="text-xs text-slate-500">{errorState}</span>
        <button
          onClick={loadCohortDashboard}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer border-0"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
        {/* Hero Banner Skeleton */}
        <div className="h-44 bg-slate-950 border border-slate-800 rounded-2xl p-8 space-y-4">
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="h-7 w-64 bg-slate-800 rounded" />
          <div className="h-3.5 w-96 bg-slate-800 rounded" />
        </div>
        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-6 w-40 bg-slate-800 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-56 bg-slate-950 border border-slate-800 rounded-2xl p-6" />
              <div className="h-56 bg-slate-950 border border-slate-800 rounded-2xl p-6" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-6 w-48 bg-slate-800 rounded" />
            <div className="h-64 bg-slate-950 border border-slate-800 rounded-2xl p-6" />
          </div>
        </div>
      </div>
    )
  }

  // Staggered variants for Framer Motion container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* Welcome Hero Banner: Editorial layout with clean visual accents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-sm"
      >
        {/* Ambient radial accent in background */}
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-blue-500/[0.04] to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-600 uppercase tracking-widest">
            Cohort: {classInfo?.class_code || classCode.toUpperCase()}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            My Learning Desk
          </h1>
          <p className="text-slate-400 max-w-xl text-xs leading-relaxed">
            Welcome to your student workspace. Select any of the courses assigned to your cohort below to launch your roadmap and check materials.
          </p>
        </div>
      </motion.div>

      {/* Continue Learning card */}
      {suggestedLesson && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-5 border-l-4 border-l-blue-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
        >
          <div>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Continue Learning</span>
            <h3 className="text-sm font-bold text-slate-100 mt-1">{suggestedLesson.title}</h3>
            <span className="text-xs text-slate-500 mt-0.5 block">{suggestedLesson.courseName}</span>
          </div>
          <Link
            href={`/learn/${classCode}/courses/${suggestedLesson.courseSlug}/lessons/${suggestedLesson.id}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 shrink-0 border-0"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Main Workspace Layout (2-Column Asymmetric Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left Column (2/3 width): Assigned Programs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-100">
              Assigned Programs
            </h2>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-800 bg-slate-950 rounded-2xl text-slate-500 text-sm flex flex-col items-center justify-center gap-2 shadow-sm">
              <Award className="w-8 h-8 text-slate-400" />
              <span>No courses currently assigned to this cohort. Contact your coordinator.</span>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {courses.map((course) => {
                const progress = courseProgress[course.id] || { completed: 0, total: 0 }
                const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

                return (
                  <motion.div
                    key={course.id}
                    variants={itemVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="border border-slate-800 bg-slate-950 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group relative overflow-hidden shadow-sm"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold text-slate-400">
                          v{course.version || 1}
                        </span>
                        {percent === 100 && (
                          <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Finished
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 group-hover:text-blue-600 transition-colors text-sm">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                          {course.description || 'No course description specified.'}
                        </p>
                      </div>
                    </div>

                    {/* Syllabus completion progress bars */}
                    <div className="space-y-2 mt-6">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                        <span>Progress: {progress.completed} / {progress.total} Lessons</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                      <Link
                        href={`/learn/${classCode}/courses/${course.slug}/roadmap`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors group"
                      >
                        <span>Launch Course</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Right Column (1/3 width): Certificate & Announcements Notice Board */}
        <div className="space-y-6">

          {/* Certificate Panel (Unlock when eligible) */}
          {(isEligibleForCertificate || hasIssuedCertificate) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {isEligibleForCertificate ? 'Đủ điều kiện nhận chứng chỉ' : 'Chứng chỉ đã được cấp'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {isEligibleForCertificate
                      ? 'Bạn đã hoàn thành các điều kiện hiện tại của khóa học'
                      : 'Chứng chỉ đã cấp vẫn được lưu, dù điều kiện hiện tại của khóa học đã thay đổi'}
                    {' '}với điểm trung bình <span className="font-bold text-emerald-600">{certificateGrade.toFixed(1)}%</span>.
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCertificateModal(true)}
                aria-haspopup="dialog"
                aria-expanded={showCertificateModal}
                aria-controls="certificate-dialog"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                <Printer className="w-4 h-4" />
                <span>{certificateId ? 'Xem chứng chỉ' : 'Tạo chứng chỉ'}</span>
              </motion.button>
            </motion.div>
          )}

          {/* Due Soon Widget */}
          {dueAssignments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-amber-500/20 bg-amber-500/[0.02] rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <h3 className="text-xs font-bold text-amber-600 flex items-center gap-2 uppercase tracking-wider">
                Due Soon
              </h3>
              <div className="space-y-3">
                {dueAssignments.map((due) => {
                  let badgeColor = 'bg-slate-800 text-slate-400'
                  if (due.daysRemaining < 2) {
                    badgeColor = 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  } else if (due.daysRemaining <= 5) {
                    badgeColor = 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }

                  return (
                    <div key={due.id} className="flex justify-between items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/learn/${classCode}/assignments/${due.id}`}
                          className="text-xs font-bold text-slate-100 hover:text-blue-500 transition-colors block leading-snug truncate"
                        >
                          {due.title}
                        </Link>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Hạn nộp: {formatDate(due.dueDate)}
                        </span>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${badgeColor} shrink-0`}>
                        {due.daysRemaining < 1 ? 'Due today' : due.daysRemaining === 1 ? '1 day left' : `${due.daysRemaining} days left`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Announcements Notice Board */}
          {announcements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border border-slate-800 bg-slate-950 rounded-2xl p-6 space-y-4 shadow-sm"
            >
              <h3 className="text-xs font-bold text-amber-600 flex items-center gap-2 uppercase tracking-wider">
                <Megaphone className="w-4 h-4" />
                Class Announcements
              </h3>
              <div className="divide-y divide-slate-800">
                {announcements.map((ann) => (
                  <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="text-xs font-bold text-slate-100">{ann.title}</h4>
                      <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                        {formatDate(ann.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <CertificateModal
        showCertificateModal={showCertificateModal}
        setShowCertificateModal={setShowCertificateModal}
        studentEmail={studentEmail || ''}
        classInfo={classInfo}
        certificateGrade={certificateGrade}
        handlePrintCertificate={handlePrintCertificate}
        printRef={printRef}
        certificateId={certificateId}
      />
    </div>
  )
}
