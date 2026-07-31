'use client'

import { usePathname } from 'next/navigation'
import Footer from '@/components/Footer'
import ScrollToTopButton from '@/components/ui/ScrollToTopButton'

export function ConditionalPublicChrome() {
  const pathname = usePathname()
  const isAdminSurface = pathname.startsWith('/admin')
  const isClassroomSurface = pathname.startsWith('/learn')

  if (isAdminSurface || isClassroomSurface) return null

  return (
    <>
      <Footer />
      <ScrollToTopButton />
    </>
  )
}
