'use client'

import { usePathname } from 'next/navigation'
import { FloatingNav } from '@/components/FloatingNavbar'
import { navItems } from '@/data'

export function ConditionalFloatingNav() {
  const pathname = usePathname()

  // Hide FloatingNav on admin pages and inside the student classroom workspace
  if (pathname?.startsWith('/admin') || (pathname?.startsWith('/learn') && pathname !== '/learn')) {
    return null
  }

  return <FloatingNav navItems={navItems} />
}
