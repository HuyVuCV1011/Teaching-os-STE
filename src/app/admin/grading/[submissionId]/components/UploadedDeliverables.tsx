'use client'

import React from 'react'
import { FileText, FileDown } from 'lucide-react'

interface UploadedDeliverablesProps {
  submittedFiles: string[] | null
}

export function UploadedDeliverables({
  submittedFiles,
}: UploadedDeliverablesProps) {
  return (
    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
      <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-700 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" /> Uploaded Deliverables
      </h3>

      <div className="space-y-3">
        {submittedFiles?.map((path: string, idx: number) => {
          const fileName = path.split('/').pop() || 'file'
          return (
            <div
              key={idx}
              className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-700 hover:border-slate-600 transition-all"
            >
              <span className="text-xs font-semibold text-slate-200 truncate pr-4">{fileName}</span>
              <a
                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zuwsvvpzivukrfegqgsp.supabase.co'}/storage/v1/object/sign/student-submissions/${path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1 shrink-0"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          )
        })}
        {(!submittedFiles || submittedFiles.length === 0) && (
          <p className="text-xs text-slate-500 italic">No files uploaded.</p>
        )}
      </div>
    </div>
  )
}
