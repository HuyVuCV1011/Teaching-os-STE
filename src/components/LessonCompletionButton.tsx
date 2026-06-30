'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'react-hot-toast'
import { toggleLessonProgressAction } from '@/app/learn/[classCode]/assignments/[assignmentId]/actions'

interface LessonCompletionButtonProps {
  classId: string
  classCode: string
  lessonId: string
  studentEmail: string
  onFirstComplete?: () => void
}

export default function LessonCompletionButton({
  classId,
  classCode,
  lessonId,
  studentEmail,
  onFirstComplete,
}: LessonCompletionButtonProps) {
  const [loading, setLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    async function checkCompletion() {
      if (!studentEmail) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('student_lesson_progress')
          .select('id')
          .eq('class_id', classId)
          .eq('lesson_id', lessonId)
          .eq('student_email', studentEmail)
          .maybeSingle()

        if (data) {
          setIsCompleted(true)
        }
      } catch (err) {
        console.error('Error checking lesson progress:', err)
      } finally {
        setLoading(false)
      }
    }

    checkCompletion()
  }, [classId, lessonId, studentEmail])

  const handleToggle = async () => {
    if (!studentEmail || toggling) return
    setToggling(true)

    try {
      const res = await toggleLessonProgressAction(classCode, lessonId, !isCompleted)
      if (!res.success) {
        throw new Error(res.error || 'Failed to update progress')
      }
      setIsCompleted(!isCompleted)
      if (!isCompleted) {
        onFirstComplete?.()
      }
    } catch (err: any) {
      toast.error(`Không thể cập nhật tiến độ: ${err.message}`)
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-500 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span>Loading...</span>
      </button>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleToggle}
      disabled={toggling}
      className={`px-5 py-2.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md ${
        isCompleted
          ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-450 hover:bg-emerald-500/20'
          : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
      }`}
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isCompleted ? (
        <CheckCircle className="w-4 h-4 text-emerald-450" />
      ) : (
        <Circle className="w-4 h-4 text-slate-400" />
      )}
      <span>{isCompleted ? 'Lesson Completed' : 'Mark as Completed'}</span>
    </motion.button>
  )
}
