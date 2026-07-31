'use client'
import React, { JSX, useState } from 'react'
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from 'motion/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation' // Thêm để kiểm tra route hiện tại

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string
    link: string
    icon?: JSX.Element
  }[]
  className?: string
}) => {
  const { scrollYProgress } = useScroll()
  const pathname = usePathname() // Lấy route hiện tại
  const [visible, setVisible] = useState(true)

  useMotionValueEvent(scrollYProgress, 'change', (current) => {
    if (typeof current === 'number') {
      const direction = current! - scrollYProgress.getPrevious()!

      if (scrollYProgress.get() < 0.05) {
        setVisible(true)
      } else {
        if (direction < 0) {
          setVisible(true)
        } else {
          setVisible(false)
        }
      }
    }
  })

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: -100,
        }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn(
          'fixed inset-x-3 top-5 z-40 mx-auto hidden max-w-fit items-center justify-center rounded-full border border-slate-800/70 bg-white/80 px-2 py-2 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/65 sm:px-3 md:flex',
          className
        )}
      >
        {navItems.map(
          (navItem: { name: string; link: string }, idx: number) => {
            const isHashLink = navItem.link.startsWith('#')
            const isAbsolutePath = navItem.link.startsWith('/')
            const href =
              pathname === '/' || isAbsolutePath
                ? navItem.link
                : isHashLink
                  ? `/${navItem.link}`
                  : `/${navItem.link}`
            return (
              <Link
                key={`link=${idx}`}
                href={href}
                scroll={true} // Kích hoạt cuộn mượt
                className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition-colors duration-300 ease-premium hover:bg-slate-900 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-4 sm:text-sm"
              >
                {navItem.name}
              </Link>
            )
          }
        )}
      </motion.div>
    </AnimatePresence>
  )
}
