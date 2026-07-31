'use client'
import { Navigation } from 'lucide-react'

import { socialMedia } from '@/data'

const Footer = () => {
  return (
    <footer className="section relative" id="contact">
      <div className="container">
        {/* background grid */}
        <div
          className="absolute bottom-0 left-0 h-full w-full bg-[url('/images/footer-grid.svg')] bg-cover bg-center opacity-70"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center">
          <h2 className="max-w-3xl text-balance text-center text-4xl font-extrabold tracking-tight text-slate-100 md:text-6xl">
            Cần một hệ thống học tập hoặc dashboard dữ liệu đáng tin cậy?
          </h2>
          <p className="my-5 max-w-[62ch] text-center text-sm leading-7 text-muted-foreground md:mt-8 md:text-base">
            Gửi brief để cùng rà quy trình, dữ liệu và cách biến bài toán thành
            sản phẩm có thể vận hành.
          </p>
          <a
            href="mailto:huyvu.antng@gmail.com"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition-colors duration-300 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Gửi email trao đổi
            <Navigation className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        <div className="flex mt-16 md:flex-row flex-col justify-between items-center">
          <p className="md:text-base text-sm md:font-normal font-light">
            {/* Copyright © 2025 */}
          </p>

          <div className="relative z-10 flex items-center gap-4 md:gap-3">
            {socialMedia.filter((info) => info.link).map((info) => (
              <a
                key={info.id}
                href={info.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={info.label}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-500 transition-colors duration-300 hover:border-slate-600 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <info.icon aria-hidden="true" size={20} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
