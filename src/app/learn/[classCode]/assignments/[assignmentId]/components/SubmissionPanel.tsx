'use client'

import React from 'react'
import { Upload, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'

interface SubmissionPanelProps {
  email: string
  text: string
  setText: (val: string) => void
  files: File[]
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveFile: (idx: number) => void
  handleSubmit: (e: React.FormEvent) => void
  submitting: boolean
  error: string | null
  existingSubmission: any
  polling: boolean
  pollingMessage: string
  gradingRun: any
  assignment: any
}

export function SubmissionPanel({
  email,
  text,
  setText,
  files,
  handleFileChange,
  handleRemoveFile,
  handleSubmit,
  submitting,
  error,
  existingSubmission,
  polling,
  pollingMessage,
  gradingRun,
  assignment
}: SubmissionPanelProps) {
  return (
    <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-6 shadow-xl">
      <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
        Submit Deliverables
      </h3>

      {/* Email Check Row */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Student Email Identifier
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            required
            placeholder="name@university.edu"
            value={email}
            readOnly
            disabled
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none cursor-not-allowed"
          />
        </div>
      </div>

      {existingSubmission ? (
        <div className="space-y-4">
          {polling ? (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50/5 text-amber-400 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span className="font-bold">{pollingMessage}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                The automated grading system is currently parsing and scoring your deliverables. This page will update automatically.
              </p>
            </div>
          ) : gradingRun?.status === 'failed' ? (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-550/5 text-rose-455 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-bold text-rose-400">Automated Ingestion Alert</span>
              </div>
              <p className="text-[10px] text-slate-400">
                The system could not parse the uploaded documents automatically (e.g. empty scan or unsupported format). A teacher has been notified for manual review.
              </p>
              {gradingRun.error_message && (
                <pre className="text-[9px] font-mono p-2 bg-slate-950 border border-slate-850 text-slate-500 rounded overflow-x-auto whitespace-pre-wrap max-h-24">
                  {gradingRun.error_message}
                </pre>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-bold">Task successfully submitted!</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Submitted at: {new Date(existingSubmission.submitted_at).toLocaleString()}
              </p>
              <div className="mt-2 space-y-1">
                <span className="block font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-1">
                  Uploaded Files
                </span>
                {existingSubmission.submitted_files.map((file: string, i: number) => (
                  <span key={i} className="block text-[10px] text-slate-350 truncate">
                    - {file.split('/').pop()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        email.trim() && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text comments */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Submission Notes
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Input comments or links here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 h-20 placeholder-slate-600"
              />
            </div>

            {/* Drag-and-Drop files */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Upload Files (Max {assignment?.max_files ?? 3}, Total {assignment?.max_total_size_mb ?? 50}MB)
              </label>
              <label className="border border-dashed border-slate-500 hover:border-slate-400 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
                <Upload className="w-6 h-6 text-slate-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Choose deliverables
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Files selection list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-850 text-xs">
                    <span className="text-slate-300 truncate max-w-[150px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="text-rose-500 hover:bg-rose-500/10 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || files.length === 0}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Finalize Submission</span>
              )}
            </button>
          </form>
        )
      )}
    </div>
  )
}
