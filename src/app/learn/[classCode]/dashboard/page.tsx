'use client'

import React, { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BookOpen,
  ArrowRight,
  Loader2,
  Award,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer
} from 'lucide-react'
import { motion } from 'framer-motion'

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
      if (!studentEmail) {
        setLoading(false)
        return
      }
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
            .select('id, module_id, modules(course_id)')
            .in('modules.course_id', courseIds)

          const activeLessons = (lessonsList || []).filter((l: any) => l.modules)

          // 5. Fetch Completed Lesson Progress
          const { data: progressList } = await supabase
            .from('student_lesson_progress')
            .select('lesson_id')
            .eq('class_id', classData.id)
            .eq('student_email', studentEmail)

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
            .eq('student_identifier', studentEmail)

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
               
               // Register certificate in database
               supabase
                 .from('certificates')
                 .upsert(
                   {
                     class_id: classData.id,
                     student_email: studentEmail,
                     grade_average: avgGrade
                   },
                   {
                     onConflict: 'class_id,student_email'
                   }
                 )
                 .then(({ error }) => {
                   if (error) console.error('Failed to persist certificate record:', error)
                 })
             }
          }
        }
      } catch (err) {
        console.error('Failed to load student courses:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classCode && studentEmail) {
      loadCohortDashboard()
    }
  }, [classCode, studentEmail])

  const handlePrintCertificate = () => {
    const printContent = printRef.current?.innerHTML
    const originalContent = document.body.innerHTML
    
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
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Configuring your dashboard layout...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-8 shadow-xl">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-600 uppercase tracking-widest animate-pulse">
            Cohort: {classInfo?.class_code || classCode.toUpperCase()}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            My Learning Desk
          </h1>
          <p className="text-slate-405 max-w-xl text-sm leading-relaxed">
            Welcome to your student workspace. Select any of the courses assigned to your cohort below to launch your roadmap and check materials.
          </p>
        </div>
      </div>

      {/* Announcements Notice Board */}
      {announcements.length > 0 && (
        <div className="border border-amber-500/10 bg-amber-500/5 rounded-2xl p-6 space-y-4 shadow-md">
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2 uppercase tracking-wider">
            <Megaphone className="w-4 h-4 text-amber-500" />
            Class Board Announcements
          </h3>
          <div className="divide-y divide-amber-500/10">
            {announcements.map((ann) => (
              <div key={ann.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex justify-between items-baseline gap-2">
                  <h4 className="text-xs font-bold text-slate-200">{ann.title}</h4>
                  <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificate Panel (Unlock when eligible) */}
      {isEligibleForCertificate && (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-450 shadow-md shadow-emerald-500/5">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Course Certification Unlocked!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Congratulations! You completed all lessons with a passing score average of <span className="font-bold text-emerald-400">{certificateGrade.toFixed(1)}%</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCertificateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Certificate</span>
          </button>
        </div>
      )}

      {/* Courses Catalog Grid */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Assigned Programs
        </h2>

        {courses.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl text-slate-550 text-sm flex flex-col items-center justify-center gap-2">
            <Award className="w-8 h-8 text-slate-650" />
            <span>No courses currently assigned to this cohort. Contact your coordinator.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const progress = courseProgress[course.id] || { completed: 0, total: 0 }
              const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

              return (
                <div
                  key={course.id}
                  className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-[10px] font-mono text-slate-400">
                        v{course.version || 1}
                      </span>
                      {percent === 100 && (
                        <span className="flex items-center gap-1 text-[9px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-450 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          Finished
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 group-hover:text-blue-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {course.description || 'No course description specified.'}
                      </p>
                    </div>
                  </div>

                  {/* Syllabus completion progress bars */}
                  <div className="space-y-2 mt-6">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Progress: {progress.completed} / {progress.total} Lessons</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-850/60 flex justify-end">
                    <Link
                      href={`/learn/${classCode}/courses/${course.slug}/roadmap`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-400 transition-colors group"
                    >
                      <span>Launch Course</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-2xl shadow-2xl p-6 space-y-6 relative">
            <h3 className="text-lg font-bold text-white">Generate Your Credential</h3>
            
            {/* Print Area Preview */}
            <div className="border border-slate-800 bg-slate-950 p-6 rounded-xl flex justify-center">
              <div ref={printRef} className="border-8 double border-blue-900 p-8 text-center bg-white text-slate-950 max-w-md w-full shadow-lg">
                <h1 className="text-2xl font-serif text-blue-900 font-extrabold uppercase tracking-wide">
                  Certificate
                </h1>
                <h2 className="text-[10px] font-sans text-slate-500 font-bold uppercase tracking-widest mt-1">
                  of Completion
                </h2>
                
                <p className="text-[11px] text-slate-500 mt-6">
                  This record confirms that whitelisted student email identifier
                </p>
                <div className="text-lg font-bold text-slate-900 font-sans border-b border-slate-200 py-1.5 my-3 break-all">
                  {studentEmail}
                </div>
                
                <p className="text-[11px] text-slate-500">
                  has completed all required course modules and tasks scheduled for class cohort
                  <span className="font-bold text-slate-800"> {classInfo?.name}</span>.
                </p>
                
                <div className="text-[10px] text-emerald-600 font-bold mt-4">
                  Final Evaluated Average: {certificateGrade.toFixed(1)}%
                </div>
                
                <div className="flex justify-around items-center mt-8 pt-4 border-t border-slate-100 text-[9px] text-slate-405">
                  <div>
                    <span className="block font-semibold text-slate-650">STE OS Platform</span>
                    <span className="block text-[7px] text-slate-400 mt-0.5">LMS Credential Engine</span>
                  </div>
                  <div>
                    <span className="block font-mono text-slate-500">{new Date().toLocaleDateString()}</span>
                    <span className="block text-[7px] text-slate-400 mt-0.5">Issue Date</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-450 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handlePrintCertificate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-0"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
