'use client'

import React, { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BookOpen, ArrowRight, Loader2, Award } from 'lucide-react'

interface DashboardProps {
  params: Promise<{ classCode: string }>
}

export default function LearnerDashboard({ params }: DashboardProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode

  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<any[]>([])
  const [classInfo, setClassInfo] = useState<any>(null)

  useEffect(() => {
    async function loadCohortDashboard() {
      try {
        // 1. Fetch Class
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classError || !classData) throw classError
        setClassInfo(classData)

        // 2. Fetch assigned courses through many-to-many junction
        const { data: junctionData, error: juncError } = await supabase
          .from('class_courses')
          .select('*, courses(*)')
          .eq('class_id', classData.id)

        if (juncError) throw juncError

        const mappedCourses = (junctionData || [])
          .map((item: any) => item.courses)
          .filter((course: any) => course && course.status !== 'archived')

        setCourses(mappedCourses)
      } catch (err) {
        console.error('Failed to load student courses:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classCode) {
      loadCohortDashboard()
    }
  }, [classCode])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-8 shadow-xl">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">
            Cohort: {classInfo?.class_code || classCode.toUpperCase()}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            My Learning Desk
          </h1>
          <p className="text-slate-405 max-w-xl text-sm leading-relaxed">
            Welcome to your student workspace. Select any of the courses assigned to your cohort below to launch your learning path.
          </p>
        </div>
      </div>

      {/* Courses Catalog Grid */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          Assigned Programs
        </h2>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-widest">Retrieving syllabus...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl text-slate-550 text-sm flex flex-col items-center justify-center gap-2">
            <Award className="w-8 h-8 text-slate-600 animate-bounce" />
            <span>No courses currently assigned to this cohort. Contact your coordinator.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-[10px] font-mono text-slate-400">
                      v{course.version || 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {course.description || 'No course description specified.'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-850/60 flex justify-end">
                  <Link
                    href={`/learn/${classCode}/courses/${course.slug}/roadmap`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-355 transition-colors group"
                  >
                    <span>Launch Course</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
