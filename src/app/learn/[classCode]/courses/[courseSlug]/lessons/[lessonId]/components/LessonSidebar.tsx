'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Link2, ExternalLink } from 'lucide-react'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'
import { motion } from 'motion/react'
import { parseAssignmentInstructions } from '@/lib/assignment'

interface LessonSidebarProps {
  classCode: string
  assignmentsData: LessonAssignment[] | null
  links: LessonResourceLink[]
}

interface LessonAssignment {
  id: string
  title: string
  instructions?: string | null
}

interface LessonResourceLink {
  id: string
  title: string
  type: string
  storage_url: string
}

interface ParsedInstructionQuestion {
  content?: string
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
        <div className="border border-slate-800 bg-slate-950 rounded-2xl p-5 space-y-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <h3 className="font-bold text-slate-100 text-xs pb-1.5 border-b border-slate-800 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Lesson Deliverables
          </h3>
          <div className="space-y-3">
            {assignmentsData.map((assign) => (
              <div key={assign.id} className="space-y-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                <h4 className="text-[11px] font-bold text-slate-100 leading-snug">{assign.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">
                  {(() => {
                    const instr = assign.instructions || ''
                    const parsedObj = parseAssignmentInstructions(instr)
                    if (parsedObj) {
                      if (Array.isArray(parsedObj)) {
                        return `${parsedObj.length} Questions: ` + parsedObj.map((q: ParsedInstructionQuestion, idx: number) => `Q${idx + 1}: ${typeof q.content === 'string' ? q.content : ''}`).join('; ')
                      } else {
                        const qCount = parsedObj.questions?.length || 0
                        const dfCount = parsedObj.data_files?.length || 0
                        const rfCount = parsedObj.reference_files?.length || 0
                        const parts = []
                        if (qCount > 0) parts.push(`${qCount} Questions`)
                        if (dfCount > 0) parts.push(`${dfCount} Data Files`)
                        if (rfCount > 0) parts.push(`${rfCount} Reference Files`)
                        return parts.length > 0 ? parts.join(', ') : 'Assignment details included'
                      }
                    }
                    return instr.replace(/<[^>]*>/g, '')
                  })()}
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href={`/learn/${classCode}/assignments/${assign.id}`}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-0"
                  >
                    Submit Deliverables
                  </Link>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Resources Card */}
      <div className="border border-slate-800 bg-slate-950 rounded-2xl p-5 space-y-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        <h3 className="font-bold text-slate-100 text-xs pb-1.5 border-b border-slate-800 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-blue-600" />
          Resources & Repos
        </h3>
        {links.length === 0 ? (
          <p className="text-[10px] text-slate-500 italic py-1">No additional links mapped to this lesson.</p>
        ) : (
          <div className="space-y-2.5">
            {links.map((link) => {
              const isRepo = link.type === 'code_repo'
              const styles = getMaterialTypeStyles(link.type)
              const Icon = getMaterialIcon(link.type)
              return (
                <motion.a
                  key={link.id}
                  href={link.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -1, shadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group shadow-sm"
                >
                  <div className={`w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center ${styles.iconColor} transition-colors`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-slate-100 truncate group-hover:text-blue-600 transition-colors leading-snug">
                      {link.title}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-bold mt-1 ${styles.bg} border-slate-800`}>
                      {isRepo ? 'Git Repository' : 'External Link'}
                      <ExternalLink className="w-2 h-2 ml-0.5" />
                    </span>
                  </div>
                </motion.a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
