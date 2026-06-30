'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { KeyRound, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

function LearnGatewayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect')
  const shouldReduceMotion = useReducedMotion()

  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason === 'expired') {
      setError('Phiên học đã hết hạn. Vui lòng nhập lại email và mã lớp.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !email.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Không thể xác minh thông tin lớp học.')
      }

      // Successful verification
      router.push(redirectPath || data.redirectUrl)
    } catch (err: any) {
      setError(err.message || 'Xác minh thất bại. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden text-slate-100 px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
        className="w-full max-w-md"
      >
        <div className="relative backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
              Vào lớp học
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Nhập email đã đăng ký và mã lớp do giảng viên cung cấp.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="student-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email học viên
              </label>
              <div className="relative">
                <input
                  id="student-email"
                  name="email"
                  type="email"
                  placeholder="ten@truong.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 px-4 text-left text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-200 disabled:opacity-50"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="class-code" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mã lớp
              </label>
              <div className="relative">
                <input
                  id="class-code"
                  name="classCode"
                  type="text"
                  placeholder="Ví dụ: DATA-2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 px-4 text-center text-lg font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition duration-200 disabled:opacity-50"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !code.trim() || !email.trim()}
              className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Vào lớp học</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 motion-reduce:transform-none transition-transform" />
                </>
              )}
            </button>

            {/* Trạng thái xác minh */}
            {loading && (
              <motion.div
                initial={shouldReduceMotion ? false : 'hidden'}
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.35 } }
                }}
                className="space-y-2 p-4 rounded-xl bg-slate-950/90 border border-slate-800/40 text-xs text-slate-400 text-left"
                aria-live="polite"
              >
                {[
                  'Đang xác minh thông tin học viên…',
                  'Đang tải lịch học và nội dung lớp…',
                  'Đang mở không gian học tập…'
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    variants={{
                      hidden: { opacity: 0, x: -4 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    className="flex gap-2 items-center"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
                    <span>{step}</span>
                    {idx === 2 && (
                      <Loader2 className="w-3 h-3 animate-spin ml-auto text-blue-500" />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            <p className="text-center text-xs leading-relaxed text-slate-500">
              Không chia sẻ mã lớp. Nếu chưa được cấp quyền, hãy liên hệ giảng viên phụ trách.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default function LearnGateway() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <LearnGatewayContent />
    </Suspense>
  )
}
