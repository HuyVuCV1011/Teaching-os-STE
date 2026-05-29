'use client'

import { usePathname } from 'next/navigation'
import { FloatingNav } from '@/components/FloatingNavbar'
import { navItems } from '@/data'

export function ConditionalFloatingNav() {
  const pathname = usePathname()

  // Hide FloatingNav on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return <FloatingNav navItems={navItems} />
}
