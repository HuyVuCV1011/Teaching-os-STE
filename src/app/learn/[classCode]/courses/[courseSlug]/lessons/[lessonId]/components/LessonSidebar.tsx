'use client'

import React from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'

interface LessonSidebarProps {
  classCode: string
  assignmentsData: any[] | null
  links: any[]
}

export function LessonSidebar({
  classCode,
  assignmentsData,
  links,
}: LessonSidebarProps) {
  return (
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
                  {(() => {
                    const instr = assign.instructions || ''
                    const trimmed = instr.trim()
                    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                      try {
                        const parsedObj = JSON.parse(trimmed)
                        const qCount = parsedObj.questions?.length || 0
                        const dfCount = parsedObj.data_files?.length || 0
                        const rfCount = parsedObj.reference_files?.length || 0
                        const parts = []
                        if (qCount > 0) parts.push(`${qCount} Questions`)
                        if (dfCount > 0) parts.push(`${dfCount} Data Files`)
                        if (rfCount > 0) parts.push(`${rfCount} Reference Files`)
                        return parts.length > 0 ? parts.join(', ') : 'Assignment details included'
                      } catch {
                        // Fallback
                      }
                    }
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                      try {
                        const parsed = JSON.parse(trimmed)
                        if (Array.isArray(parsed)) {
                          return `${parsed.length} Questions: ` + parsed.map((q: any, idx: number) => `Q${idx + 1}: ${q.content}`).join('; ')
                        }
                      } catch {
                        // Fallback
                      }
                    }
                    return instr.replace(/<[^>]*>/g, '')
                  })()}
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

      {/* External Resources Card */}
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
  )
}
