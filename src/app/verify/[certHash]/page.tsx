'use client'

import React, { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Award,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Mail,
  GraduationCap,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'

interface VerifyPageProps {
  params: Promise<{
    certHash: string
  }>
}

export default function VerifyPage({ params }: VerifyPageProps) {
  const resolvedParams = use(params)
  const certHash = resolvedParams.certHash

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cert, setCert] = useState<any>(null)

  useEffect(() => {
    async function verifyCredential() {
      setLoading(true)
      try {
        // Query certificate with class info
        const { data, error: queryError } = await supabase
          .from('certificates')
          .select('*, classes(name, class_code)')
          .eq('id', certHash)
          .maybeSingle()

        if (queryError) throw queryError

        if (!data) {
          setError('Credential record not found. This credential hash may be invalid or has been revoked.')
        } else {
          setCert(data)
        }
      } catch (err: any) {
        console.error('Verification query failed:', err)
        setError(err.message || 'An error occurred during credential verification.')
      } finally {
        setLoading(false)
      }
    }

    if (certHash) {
      verifyCredential()
    }
  }, [certHash])

  // Mask student email for privacy
  const getMaskedEmail = (email: string) => {
    if (!email) return ''
    const parts = email.split('@')
    if (parts.length < 2) return '***'
    const name = parts[0]
    const domain = parts[1]
    const maskedName =
      name.substring(0, 2) +
      '***' +
      (name.length > 4 ? name.substring(name.length - 2) : '')
    return `${maskedName}@${domain}`
  }

  return (
    <div className="min-h-screen bg-slate-900/5 flex flex-col justify-center items-center p-6 text-xs font-sans text-slate-350">
      <div className="max-w-md w-full bg-white border border-slate-700 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        
        {/* Logo/Brand Header */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-slate-100 text-sm tracking-wider uppercase">
              STE Credential Registry
            </span>
          </div>
          <span className="text-[9px] font-mono bg-slate-100 text-slate-505 px-2 py-0.5 rounded border border-slate-200/50">
            v1.0.0
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-650" />
            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
              Validating credential signature...
            </span>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Verification Failure</h2>
            <p className="text-xs text-slate-505 leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
            <div className="pt-4">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl font-bold transition-all text-xs"
              >
                Return to Homepage
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Verification Status Badge */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-xs">Credential Authenticated</h3>
                <p className="text-[10px] text-slate-505 mt-0.5 leading-relaxed">
                  This certificate has been verified as authentic and issued by the Teaching OS STE platform.
                </p>
              </div>
            </div>

            {/* Credential Details List */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                Student Record Details
              </h4>
              
              <div className="divide-y divide-slate-100 border-y border-slate-200">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Recipient Email
                  </span>
                  <span className="font-bold text-slate-900 text-right break-all">
                    {getMaskedEmail(cert.student_email)}
                  </span>
                </div>

                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    Course / Cohort
                  </span>
                  <span className="font-bold text-slate-900 text-right">
                    {cert.classes?.name} ({cert.classes?.class_code})
                  </span>
                </div>

                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    Evaluation Grade
                  </span>
                  <span className="font-bold text-emerald-600 text-right">
                    {parseFloat(cert.grade_average).toFixed(1)}% Avg
                  </span>
                </div>

                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Issued Date
                  </span>
                  <span className="font-bold text-slate-900 text-right">
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5 text-[10px]">
                    Credential ID (Hash)
                  </span>
                  <span className="font-mono text-slate-505 text-right font-medium break-all select-all text-[10px]">
                    {cert.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="pt-4 flex justify-between items-center text-[10px]">
              <span className="text-slate-505 font-bold uppercase tracking-wider">
                Teaching OS (STE)
              </span>
              <a
                href="/"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 hover:underline font-bold transition-all text-xs"
              >
                <span>Go to Home</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
