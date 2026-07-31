'use client'

import React from 'react'
import { Upload, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/date'

interface SubmissionPanelProps {
  email: string
  text: string
  setText: (val: string) => void
  files: File[]
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveFile: (idx: number) => void
  handleSubmit: () => void | Promise<void>
  submitting: boolean
  error: string | null
  existingSubmission: ExistingSubmission | null
  polling: boolean
  pollingMessage: string
  gradingRun: GradingRun | null
  assignment: AssignmentSummary | null
  showcaseRequested: boolean
  setShowcaseRequested: (val: boolean) => void
  schedule?: AssignmentSchedule | null
}

interface ExistingSubmission {
  submitted_at: string
  submitted_files?: string[] | null
}

interface GradingRun {
  status?: string | null
  error_message?: string | null
}

interface AssignmentSummary {
  max_files?: number | null
  max_total_size_mb?: number | null
}

interface AssignmentSchedule {
  due_date?: string | null
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
  assignment,
  showcaseRequested,
  setShowcaseRequested,
  schedule,
}: SubmissionPanelProps) {
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [checkedFinal, setCheckedFinal] = React.useState(false)
  const confirmTriggerRef = React.useRef<HTMLButtonElement>(null)
  const confirmDialogRef = React.useRef<HTMLDivElement>(null)
  const finalCheckboxRef = React.useRef<HTMLInputElement>(null)
  const submittedFiles = existingSubmission?.submitted_files || []

  React.useEffect(() => {
    if (!showConfirm) {
      setCheckedFinal(false)
      return
    }

    const previousOverflow = document.body.style.overflow
    const triggerElement = confirmTriggerRef.current
    document.body.style.overflow = 'hidden'
    finalCheckboxRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowConfirm(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = Array.from(
        confirmDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        ) || []
      )
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerElement?.focus()
    }
  }, [showConfirm])

  const totalSizeBytes = files.reduce((acc, f) => acc + f.size, 0)
  const totalSizeLabel = totalSizeBytes > 1024 * 1024
    ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(totalSizeBytes / 1024).toFixed(1)} KB`

  const deadlineLabel = React.useMemo(() => {
    const dueDate = schedule?.due_date
    if (!dueDate) return 'Không có hạn nộp (No deadline)'
    return formatDateTime(dueDate)
  }, [schedule])

  const countdownLabel = React.useMemo(() => {
    const dueDate = schedule?.due_date
    if (!dueDate) return null
    const now = Date.now()
    const due = new Date(dueDate).getTime()
    const diffMs = due - now
    if (diffMs <= 0) {
      return 'Đã quá hạn nộp'
    }
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffH / 24)
    const remH = diffH % 24
    return diffD > 0 ? `${diffD} ngày ${remH} giờ còn lại` : `${diffH} giờ còn lại`
  }, [schedule])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleFinalConfirmSubmit = () => {
    setShowConfirm(false)
    void handleSubmit()
  }

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
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="font-bold">{pollingMessage}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                The automated grading system is currently parsing and scoring your deliverables. This page will update automatically.
              </p>
            </div>
          ) : gradingRun?.status === 'failed' ? (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-bold text-rose-400">Automated Ingestion Alert</span>
              </div>
              <p className="text-[10px] text-slate-400">
                The system could not parse the uploaded documents automatically (e.g. empty scan or unsupported format). A teacher has been notified for manual review.
              </p>
              {gradingRun.error_message && (
                <pre className="text-[9px] font-mono p-2 bg-slate-950 border border-slate-800 text-slate-500 rounded overflow-x-auto whitespace-pre-wrap max-h-24">
                  {gradingRun.error_message}
                </pre>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 3.B Premium Submission Success State */}
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-300">Deliverables Submitted</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatDateTime(existingSubmission.submitted_at)}
                    </p>
                  </div>
                </div>
                {submittedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-emerald-500/15">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Uploaded Files
                    </span>
                    {submittedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[11px] text-slate-300 truncate">{file.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        email.trim() && (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Text comments */}
            <div>
              <label htmlFor="submission-notes" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Ghi chú bài nộp
              </label>
              <textarea
                id="submission-notes"
                name="submissionNotes"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ghi chú hoặc đường dẫn liên quan…"
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
                  aria-label="Upload assignment files"
                />
              </label>
            </div>

            {/* Files selection list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-slate-300 truncate max-w-[150px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="text-rose-500 hover:bg-rose-500/10 p-1 rounded border-0 cursor-pointer bg-transparent"
                      aria-label={`Remove file ${f.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Showcase checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-800 bg-slate-950/40">
              <input
                type="checkbox"
                id="showcase-checkbox"
                checked={showcaseRequested}
                onChange={(e) => setShowcaseRequested(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-550 bg-slate-950 mt-0.5 cursor-pointer"
              />
              <label htmlFor="showcase-checkbox" className="text-[11px] text-slate-400 leading-normal cursor-pointer select-none">
                Đăng ký đăng dự án lên Portfolio Showcase công khai
                <span className="block text-[9px] text-slate-500 mt-0.5">
                  Allows instructors to feature your work on the public showcase homepage.
                </span>
              </label>
            </div>

            {/* Error Alert */}
            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              ref={confirmTriggerRef}
              type="submit"
              disabled={submitting || files.length === 0}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-550 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer border-0"
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

      {/* Confirmation Dialog trước khi nộp */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={confirmDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-confirm-title"
            aria-describedby="submission-confirm-description"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in duration-200 motion-reduce:animate-none"
          >
            <div className="flex items-center gap-2 text-amber-500 pb-2 border-b border-slate-800">
              <AlertCircle className="w-5 h-5" />
              <h3 id="submission-confirm-title" className="text-base font-bold text-white">Xác nhận nộp bài làm</h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p id="submission-confirm-description">Bạn chuẩn bị nộp bài làm cho tiêu chí bài tập này. Vui lòng xác nhận các thông tin dưới đây:</p>
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-200">
                Sau khi xác nhận, bài nộp sẽ bị khóa chỉnh sửa. Nếu cần nộp lại, bạn phải liên hệ giảng viên.
              </p>

              <div className="p-3 bg-slate-950 rounded-lg space-y-2 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Số lượng tệp tin:</span>
                  <span className="font-bold text-slate-200">{files.length} tệp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tổng dung lượng:</span>
                  <span className="font-bold text-slate-200">{totalSizeLabel}</span>
                </div>
                {showcaseRequested && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Showcase:</span>
                    <span className="text-blue-500 font-semibold">Có yêu cầu công khai</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-2 text-[11px]">
                  <span className="text-slate-400">Hạn nộp:</span>
                  <span className="font-semibold text-slate-350">{deadlineLabel}</span>
                </div>
                {countdownLabel && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Thời gian:</span>
                    <span className={`font-bold ${countdownLabel.includes('quá') ? 'text-rose-450' : 'text-amber-450'}`}>{countdownLabel}</span>
                  </div>
                )}
              </div>

              {/* Individual files detail list */}
              <div className="space-y-1.5 max-h-24 overflow-y-auto p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Chi tiết tệp nộp:
                </span>
                {files.map((file, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-slate-400 gap-2">
                    <span className="truncate max-w-[220px]">{file.name}</span>
                    <span className="shrink-0">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  ref={finalCheckboxRef}
                  type="checkbox"
                  id="final-check"
                  checked={checkedFinal}
                  onChange={(e) => setCheckedFinal(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-550 bg-slate-950 mt-0.5 cursor-pointer"
                />
                <label htmlFor="final-check" className="text-[11px] text-slate-400 cursor-pointer select-none leading-normal">
                  Tôi xác nhận bài nộp này là bản cuối cùng, đầy đủ và chính xác. Tôi đồng ý hệ thống sẽ khóa chỉnh sửa sau khi nộp.
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  setCheckedFinal(false)
                }}
                className="px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleFinalConfirmSubmit}
                disabled={!checkedFinal || submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-550 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border-0"
              >
                Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
