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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  title: {
    default: 'STE Workspace | Teaching OS & Data Portfolio',
    template: '%s | STE Workspace',
  },
  description:
    'Không gian giảng dạy, học tập và portfolio dữ liệu của Trần Huy Vũ: Teaching OS, lớp học thực chiến, dự án BI, Python, SQL và tối ưu hệ thống.',
  applicationName: 'STE Workspace',
  authors: [{ name: 'Trần Huy Vũ' }],
  creator: 'Trần Huy Vũ',
  publisher: 'STE Workspace',
  keywords: [
    'Teaching OS',
    'STE Workspace',
    'data portfolio',
    'Power BI',
    'Python',
    'SQL',
    'lớp học dữ liệu',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'STE Workspace | Teaching OS & Data Portfolio',
    description:
      'Portfolio dữ liệu và hệ thống vận hành lớp học thực chiến của Trần Huy Vũ.',
    url: '/',
    siteName: 'STE Workspace',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STE Workspace | Teaching OS & Data Portfolio',
    description:
      'Portfolio dữ liệu và hệ thống vận hành lớp học thực chiến của Trần Huy Vũ.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="light" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased relative`}
      >
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Bỏ qua điều hướng
        </a>
        <ConditionalFloatingNav />
        {children}
        <ConditionalPublicChrome />
      </body>
    </html>
  )
}
