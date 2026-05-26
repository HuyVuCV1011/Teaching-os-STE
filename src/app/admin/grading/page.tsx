'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  GraduationCap,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export default function GradingQueue() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  async function fetchSubmissions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*, classes(name, class_code), assignments(title)')
        .order('submitted_at', { ascending: false })

      setSubmissions(data || [])
    } catch (err) {
      console.error('Failed to load submissions queue:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600">
            Submitted
          </span>
        )
      case 'grading_in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            Grading
          </span>
        )
      case 'graded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Graded
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Evaluation Queue</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review, annotate, and grade student task deliverables against criteria templates.
        </p>
      </div>

      <div className="border border-slate-800 bg-slate-900/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-4 text-slate-455">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Loading submissions queue...
            </span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600" />
            <span>The grading queue is empty. No tasks submitted yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-350">
              <thead>
                <tr className="border-b border-slate-805 bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Cohort / Access Code</th>
                  <th className="px-6 py-4">Assignment Topic</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-950/20">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-6 py-4.5 font-semibold text-slate-205 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sub.student_identifier}</span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="text-slate-400">{sub.classes?.name}</span>
                      <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                        {sub.classes?.class_code}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-medium text-slate-200">
                      {sub.assignments?.title}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="text-slate-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {new Date(sub.submitted_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4.5 text-right">
                      <Link
                        href={`/admin/grading/${sub.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors text-[11px]"
                      >
                        <span>Grade Task</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
