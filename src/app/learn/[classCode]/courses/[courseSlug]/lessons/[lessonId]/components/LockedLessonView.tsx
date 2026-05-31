'use client'

import React from 'react'
import Link from 'next/link'
import { Lock, Calendar, ArrowLeft } from 'lucide-react'

interface LockedLessonViewProps {
  classCode: string
  courseSlug: string
  visibleAfter?: string | null
}

export function LockedLessonView({
  classCode,
  courseSlug,
  visibleAfter,
}: LockedLessonViewProps) {
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
      {visibleAfter ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Unlocks on {new Date(visibleAfter).toLocaleDateString()}</span>
        </div>
      ) : (
        <span className="text-xs text-slate-550 italic">Unlock schedule not configured.</span>
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
