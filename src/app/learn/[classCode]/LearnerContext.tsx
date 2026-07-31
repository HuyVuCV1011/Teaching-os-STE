'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface LearnerContextType {
  studentEmail: string | null
  isAdminPreview: boolean
  identityVerified: boolean
  identityError: string | null
  classInfo: LearnerClassInfo | null
  loadingClassInfo: boolean
}

interface LearnerClassInfo {
  id: string
  class_code: string
  name?: string | null
  course_id?: string | null
  [key: string]: unknown
}

interface LearnerRouter {
  push: (href: string) => void
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined)

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

export function LearnerProvider({ 
  children, 
  classCode,
  pathname,
  router
}: { 
  children: React.ReactNode
  classCode: string
  pathname: string
  router: LearnerRouter
}) {
  const [studentEmail, setStudentEmail] = useState<string | null>(null)
  const [isAdminPreview, setIsAdminPreview] = useState(false)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [classInfo, setClassInfo] = useState<LearnerClassInfo | null>(null)
  const [loadingClassInfo, setLoadingClassInfo] = useState(true)

  useEffect(() => {
    async function checkIdentityAndFetchClass() {
      try {
        setIdentityError(null)

        // 1. Fetch Class Info first
        const { data: classData, error: classErr } = await supabase
          .from('classes')
          .select('*')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classErr || !classData) {
          throw classErr || new Error('Class not found')
        }

        setClassInfo(classData)
        setLoadingClassInfo(false)

        // 2. Check Supabase Admin Session
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const role = user.app_metadata?.role
          if (['admin', 'teacher', 'super-admin', 'content-admin', 'class-operator'].includes(role)) {
            setIsAdminPreview(true)
            setIdentityVerified(true)
            return
          }
        }

        // 3. Check Student Cookie
        const email = getCookie(`student_email_${classCode}`)
        if (email) {
          setStudentEmail(email.trim().toLowerCase())
          setIdentityVerified(true)
        } else {
          // If neither, redirect student back to gateway
          const redirectUrl = `/learn?redirect=${encodeURIComponent(pathname)}&reason=missing`
          router.push(redirectUrl)
        }
      } catch (err) {
        console.error('Error verifying identity:', err)
        const message = err instanceof Error ? err.message : 'Không thể xác minh lớp học.'
        setIdentityError(message)
        setIdentityVerified(true)
        setLoadingClassInfo(false)
      }
    }

    if (classCode) {
      checkIdentityAndFetchClass()
    }
  }, [classCode, pathname, router])

  return (
    <LearnerContext.Provider value={{
      studentEmail,
      isAdminPreview,
      identityVerified,
      identityError,
      classInfo,
      loadingClassInfo
    }}>
      {children}
    </LearnerContext.Provider>
  )
}

export function useLearner() {
  const context = useContext(LearnerContext)
  if (context === undefined) {
    throw new Error('useLearner must be used within a LearnerProvider')
  }
  return context
}
