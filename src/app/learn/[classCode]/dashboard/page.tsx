'use client'

import React, { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
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

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

interface DashboardProps {
  params: Promise<{ classCode: string }>
}

export default function LearnerDashboard({ params }: DashboardProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode

  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<any[]>([])
  const [classInfo, setClassInfo] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [studentEmail, setStudentEmail] = useState('')
  
  // Progress & Grades State
  const [courseProgress, setCourseProgress] = useState<Record<string, { completed: number; total: number }>>({})
  const [isEligibleForCertificate, setIsEligibleForCertificate] = useState(false)
  const [certificateGrade, setCertificateGrade] = useState(0)
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const email = getCookie(`student_email_${classCode}`)
    if (email) {
      setStudentEmail(email.trim().toLowerCase())
    }
  }, [classCode])

  useEffect(() => {
    async function loadCohortDashboard() {
      const activeEmail = studentEmail || 'student@university.edu'
      try {
        // 1. Fetch Class Details
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classError || !classData) throw classError
        setClassInfo(classData)

        // 2. Fetch Announcements
        const { data: announcementsData } = await supabase
          .from('class_announcements')
          .select('*')
          .eq('class_id', classData.id)
          .order('created_at', { ascending: false })
          .limit(3)

        setAnnouncements(announcementsData || [])

        // 3. Fetch Assigned Courses
        const { data: junctionData, error: juncError } = await supabase
          .from('class_courses')
          .select('*, courses(*)')
          .eq('class_id', classData.id)

        if (juncError) throw juncError

        const mappedCourses = (junctionData || [])
          .map((item: any) => item.courses)
          .filter((course: any) => course && course.status !== 'archived')

        setCourses(mappedCourses)

        if (mappedCourses.length > 0) {
          const courseIds = mappedCourses.map(c => c.id)

          // 4. Fetch All Lessons for assigned courses
          const { data: lessonsList } = await supabase
            .from('lessons')
            .select('id, module_id, metadata, modules(course_id)')
            .in('modules.course_id', courseIds)

          const activeLessons = (lessonsList || []).filter((l: any) => l.modules && l.metadata?.status !== 'draft')

          // 5. Fetch Completed Lesson Progress
          const { data: progressList } = await supabase
            .from('student_lesson_progress')
            .select('lesson_id')
            .eq('class_id', classData.id)
            .eq('student_email', activeEmail)

          const completedSet = new Set(progressList?.map(p => p.lesson_id) || [])

          // Compute course progress mapping
          const progressMap: Record<string, { completed: number; total: number }> = {}
          mappedCourses.forEach(course => {
            const courseLessons = activeLessons.filter((l: any) => l.modules.course_id === course.id)
            const completedCount = courseLessons.filter((l: any) => completedSet.has(l.id)).length
            progressMap[course.id] = {
              completed: completedCount,
              total: courseLessons.length
            }
          })
          setCourseProgress(progressMap)

          // 6. Query Submissions & Published Grades for Certificate Eligibility
          const { data: subsData } = await supabase
            .from('submissions')
            .select('*, grading_results(*)')
            .eq('class_id', classData.id)
            .eq('student_identifier', activeEmail)

          const publishedResults = subsData
            ?.map(s => s.grading_results)
            .filter(g => g && g.status === 'published') || []

          // Compute global stats
          const totalLessons = activeLessons.length
          const completedLessons = progressList?.length || 0

          if (totalLessons > 0 && completedLessons === totalLessons) {
            const avgGrade = publishedResults.length > 0
              ? publishedResults.reduce((sum, g) => sum + parseFloat(g.total_score), 0) / publishedResults.length
              : 0

             // Eligible if completed 100% and avg score >= 60%
             if (avgGrade >= 60) {
                setIsEligibleForCertificate(true)
                setCertificateGrade(avgGrade)
                
                // Register certificate in database and retrieve unique UUID ID
                supabase
                  .from('certificates')
                  .upsert(
                    {
                      class_id: classData.id,
                      student_email: activeEmail,
                      grade_average: avgGrade
                    },
                    {
                      onConflict: 'class_id,student_email'
                    }
                  )
                  .select('id')
                  .single()
                  .then(({ data: certData, error: certError }) => {
                    if (certError) {
                      console.error('Failed to persist certificate record:', certError)
                    } else if (certData) {
                      setCertificateId(certData.id)
                    }
                  })
             }
          }

          // Fetch pre-existing certificate if any
          const { data: existingCert } = await supabase
            .from('certificates')
            .select('id')
            .eq('class_id', classData.id)
            .eq('student_email', activeEmail)
            .maybeSingle()
          if (existingCert) {
            setCertificateId(existingCert.id)
          }
        }
      } catch (err) {
        console.error('Failed to load student courses:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classCode) {
      loadCohortDashboard()
    }
  }, [classCode, studentEmail])

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
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-[0_2px_12px_rgba(0,0,0,0.01)]"
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
          <p className="text-slate-600 max-w-xl text-xs leading-relaxed">
            Welcome to your student workspace. Select any of the courses assigned to your cohort below to launch your roadmap and check materials.
          </p>
        </div>
      </motion.div>

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
            <div className="text-center py-20 border border-dashed border-slate-800 bg-slate-950 rounded-2xl text-slate-500 text-sm flex flex-col items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
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
                    className="border border-slate-800 bg-slate-950 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)]"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold text-slate-600">
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
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-850 flex justify-end">
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
          {isEligibleForCertificate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Certificate Unlocked!</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    You completed all lessons with a passing score average of <span className="font-bold text-emerald-600">{certificateGrade.toFixed(1)}%</span>.
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCertificateModal(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                <Printer className="w-4 h-4" />
                <span>Generate Certificate</span>
              </motion.button>
            </motion.div>
          )}

          {/* Announcements Notice Board */}
          {announcements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border border-slate-800 bg-slate-950 rounded-2xl p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)]"
            >
              <h3 className="text-xs font-bold text-amber-600 flex items-center gap-2 uppercase tracking-wider">
                <Megaphone className="w-4 h-4" />
                Class Announcements
              </h3>
              <div className="divide-y divide-slate-850">
                {announcements.map((ann) => (
                  <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="text-xs font-bold text-slate-100">{ann.title}</h4>
                      <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                        {new Date(ann.created_at).toLocaleDateString()}
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
        studentEmail={studentEmail}
        classInfo={classInfo}
        certificateGrade={certificateGrade}
        handlePrintCertificate={handlePrintCertificate}
        printRef={printRef}
        certificateId={certificateId}
      />
    </div>
  )
}
