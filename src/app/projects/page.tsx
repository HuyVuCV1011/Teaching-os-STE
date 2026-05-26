'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProjectsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/#projects')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <span>Redirecting to showcase...</span>
    </div>
  )
}

