'use client'

import { usePathname } from 'next/navigation'
import { FloatingNav } from '@/components/FloatingNavbar'
import { navItems } from '@/data'

export function ConditionalFloatingNav() {
  const pathname = usePathname()

  // Public pages already provide their own chrome; product workspaces stay distraction-free.
  if (
    pathname === '/' ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/learn') ||
    pathname?.startsWith('/projects')
  ) {
    return null
  }

  return <FloatingNav navItems={navItems} />
}
