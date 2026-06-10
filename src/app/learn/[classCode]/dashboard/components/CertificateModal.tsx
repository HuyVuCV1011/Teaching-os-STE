'use client'

import React from 'react'
import { Printer, ExternalLink } from 'lucide-react'

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
  if (!showCertificateModal) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-2xl shadow-2xl p-6 space-y-6 relative">
        <h3 className="text-lg font-bold text-white">Generate Your Credential</h3>

        {/* Print Area Preview */}
        <div className="border border-slate-800 bg-slate-955 p-6 rounded-xl flex justify-center">
          <div ref={printRef} className="border-8 border-double border-blue-900 p-8 text-center bg-white text-slate-100 max-w-md w-full shadow-lg">
            <h1 className="text-2xl font-serif text-blue-900 font-extrabold uppercase tracking-wide">
              Certificate
            </h1>
            <h2 className="text-[10px] font-sans text-slate-500 font-bold uppercase tracking-widest mt-1">
              of Completion
            </h2>

            <p className="text-[11px] text-slate-500 mt-6">
              This record confirms that whitelisted student email identifier
            </p>
            <div className="text-lg font-bold text-slate-900 font-sans border-b border-slate-200 py-1.5 my-3 break-all">
              {studentEmail}
            </div>

            <p className="text-[11px] text-slate-500">
              has completed all required course modules and tasks scheduled for class cohort
              <span className="font-bold text-slate-800"> {classInfo?.name}</span>.
            </p>

            <div className="text-[10px] text-emerald-600 font-bold mt-4">
              Final Evaluated Average: {certificateGrade.toFixed(1)}%
            </div>

            <div className="flex justify-around items-center mt-8 pt-4 border-t border-slate-100 text-[9px] text-slate-400">
              <div>
                <span className="block font-semibold text-slate-600">STE OS Platform</span>
                <span className="block text-[7px] text-slate-400 mt-0.5">LMS Credential Engine</span>
              </div>
              <div>
                <span className="block font-mono text-slate-500">{new Date().toLocaleDateString()}</span>
                <span className="block text-[7px] text-slate-400 mt-0.5">Issue Date</span>
              </div>
            </div>

            {certificateId && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center gap-1">
                <span className="text-[7px] text-slate-450 font-bold uppercase tracking-wider">
                  Verifiable Credential Hash
                </span>
                <a
                  href={`/verify/${certificateId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8px] font-mono text-blue-600 hover:text-blue-500 hover:underline flex items-center gap-0.5"
                >
                  <span>verify.ste-os.edu/verify/{certificateId}</span>
                  <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => setShowCertificateModal(false)}
            className="px-4 py-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrintCertificate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>
    </div>
  )
}
