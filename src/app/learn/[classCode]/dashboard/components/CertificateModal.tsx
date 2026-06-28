'use client'

import React, { useEffect, useRef } from 'react'
import { Printer, ExternalLink, Award, X } from 'lucide-react'
import { formatDate } from '@/lib/date'

interface CertificateModalProps {
  showCertificateModal: boolean
  setShowCertificateModal: (val: boolean) => void
  studentEmail: string
  classInfo: any
  certificateGrade: number
  handlePrintCertificate: () => void
  printRef: React.RefObject<HTMLDivElement | null>
  certificateId: string | null
}

export function CertificateModal({
  showCertificateModal,
  setShowCertificateModal,
  studentEmail,
  classInfo,
  certificateGrade,
  handlePrintCertificate,
  printRef,
  certificateId,
}: CertificateModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Escape key close support
  useEffect(() => {
    if (!showCertificateModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCertificateModal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCertificateModal, setShowCertificateModal])

  // Focus trap, restoration and body scroll lock
  useEffect(() => {
    if (!showCertificateModal) return

    previousFocusRef.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'contain'

    const focusTimer = window.setTimeout(() => {
      const closeBtn = modalRef.current?.querySelector('button')
      closeBtn?.focus()
    }, 50)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
      previousFocusRef.current?.focus()
    }
  }, [showCertificateModal])

  // Focus trap handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === last) {
        first.focus()
        e.preventDefault()
      }
    }
  }

  if (!showCertificateModal) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        id="certificate-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-dialog-title"
        aria-describedby="cert-dialog-desc"
        className="bg-slate-900 border border-slate-700/60 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 motion-reduce:transition-none"
      >
        {/* Close button */}
        <button
          onClick={() => setShowCertificateModal(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all z-10 cursor-pointer"
          aria-label="Close certificate modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-600/20 via-violet-600/15 to-emerald-600/20 border-b border-slate-700/50 px-8 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 id="cert-dialog-title" className="text-lg font-bold text-white">Course Credential</h3>
            <p id="cert-dialog-desc" className="text-xs text-slate-400">Generate and download your certificate of completion</p>
          </div>
        </div>

        {/* Print preview area */}
        <div className="p-6">
          <div className="border border-slate-700/50 bg-slate-950/50 p-4 rounded-2xl flex justify-center">
            {/* Print-safe inner certificate */}
            <div
              ref={printRef}
              className="bg-white w-full max-w-md shadow-xl"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {/* Certificate top border accent */}
              <div className="h-2 bg-gradient-to-r from-blue-700 via-blue-900 to-blue-700" />

              <div className="px-10 py-8 text-center border-x-8 border-b-8 border-double border-blue-900">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-blue-900 flex items-center justify-center">
                  <Award className="w-6 h-6 text-blue-800" style={{ strokeWidth: 2 }} />
                </div>

                <h1 className="text-2xl font-extrabold uppercase tracking-widest text-blue-900" style={{ letterSpacing: '0.15em' }}>
                  Certificate
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans mt-1">of Completion</p>

                <div className="my-6 border-t border-slate-200 pt-5">
                  <p className="text-[10px] text-slate-500 font-sans mb-2">This certifies that</p>
                  <div className="text-base font-bold text-slate-900 font-sans border-b-2 border-slate-300 pb-2 mb-3 break-all">
                    {studentEmail}
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                    has successfully completed all required modules and tasks<br />
                    for the class cohort{' '}
                    <span className="font-bold text-slate-800">{classInfo?.name}</span>
                  </p>
                </div>

                <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-1.5 mb-6">
                  <span className="text-[10px] font-sans font-bold text-emerald-700">
                    Final Average: {certificateGrade.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-[8px] text-slate-400 font-sans">
                  <div className="text-left">
                    <span className="block font-bold text-slate-600 text-[9px]">STE OS Platform</span>
                    <span className="block text-slate-400">LMS Credential Engine</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-slate-600 text-[9px]">{formatDate(new Date())}</span>
                    <span className="block text-slate-400">Issue Date</span>
                  </div>
                </div>

                {certificateId && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center gap-1">
                    <span className="text-[7px] text-slate-500 font-sans font-bold uppercase tracking-wider">
                      Verifiable Credential Hash
                    </span>
                    <a
                      href={`/verify/${certificateId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] font-mono text-blue-700 hover:text-blue-600 hover:underline flex items-center gap-0.5 font-sans"
                    >
                      <span>verify.ste-os.edu/verify/{certificateId}</span>
                      <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={() => setShowCertificateModal(false)}
            className="px-5 py-2.5 border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrintCertificate}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-0 transition-all shadow-lg shadow-emerald-900/30"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>
    </div>
  )
}
