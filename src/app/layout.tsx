import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ConditionalFloatingNav } from '@/components/ConditionalFloatingNav'
import { ConditionalPublicChrome } from '@/components/ConditionalPublicChrome'
import { Toaster } from 'react-hot-toast'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'STE Workspace — Teaching Operating System & Portfolio',
  description: 'Next.js education platform, student learning zone, and data advisor portfolio system.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased relative`}
      >
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <ConditionalFloatingNav />
        {children}
        <ConditionalPublicChrome />
      </body>
    </html>
  )
}
