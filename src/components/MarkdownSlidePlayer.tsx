'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Play, 
  RotateCcw
} from 'lucide-react'
import { renderSimpleMarkdown } from '@/lib/markdown'

interface MarkdownSlidePlayerProps {
  markdown: string
  title?: string
}

export default function MarkdownSlidePlayer({ markdown, title }: MarkdownSlidePlayerProps) {
  const [slides, setSlides] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse markdown by splitting at '---'
  useEffect(() => {
    if (!markdown) {
      setSlides([])
      return
    }
    
    // Split on '---' that is on its own line (allowing whitespace)
    const rawSlides = markdown.split(/\n\s*---\s*\n/)
    const cleanedSlides = rawSlides.map(slide => slide.trim()).filter(slide => slide.length > 0)
    setSlides(cleanedSlides)
    setCurrentSlide(0)
  }, [markdown])

  const changeSlide = (offset: number) => {
    setCurrentSlide((prev) => {
      const next = prev + offset
      return Math.min(Math.max(next, 0), slides.length - 1)
    })
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        changeSlide(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        changeSlide(-1)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slides.length, currentSlide])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error('Error enabling fullscreen:', err))
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (slides.length === 0) {
    return (
      <div className="border border-slate-800 bg-slate-950 rounded-2xl p-8 text-center text-slate-500 italic text-xs">
        No slide content available.
      </div>
    )
  }

  const activeSlideContent = slides[currentSlide]

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col border border-slate-800 bg-slate-950 overflow-hidden relative shadow-2xl transition-all duration-300 rounded-2xl ${
        isFullscreen ? 'h-screen w-screen z-50 rounded-none' : 'h-[640px]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-500" />
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest truncate max-w-xs sm:max-w-md">
            {title || 'Markdown Slides'}
          </h4>
          <span className="ml-2 text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Web-Native Slides
          </span>
        </div>

        {/* Top toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentSlide(0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Restart Slideshow"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen presentation'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Canvas */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-8 md:p-16 bg-slate-950 relative z-0 custom-scrollbar">
        <div className="w-full max-w-4xl mx-auto flex flex-col justify-center min-h-[300px]">
          {/* We render the simple markdown content with custom presentation styling */}
          <div
            className="prose max-w-none text-slate-100 leading-relaxed text-center space-y-6 md:space-y-8
              prose-headings:text-slate-100 prose-headings:font-bold prose-headings:tracking-tight 
              prose-h1:text-3xl md:prose-h1:text-5xl prose-h1:border-b-0 prose-h1:pb-0 prose-h1:mb-8
              prose-h2:text-2xl md:prose-h2:text-4xl prose-h2:border-b-0
              prose-h3:text-xl md:prose-h3:text-2xl
              prose-p:text-base md:prose-p:text-xl prose-p:text-slate-400 prose-p:mx-auto prose-p:max-w-2xl
              prose-strong:text-slate-100 prose-strong:font-bold
              prose-code:text-rose-500 prose-code:font-mono prose-code:text-sm md:prose-code:text-base prose-code:bg-slate-900/40 prose-code:px-2 prose-code:py-1 prose-code:rounded
              prose-blockquote:text-slate-500 prose-blockquote:italic prose-blockquote:text-lg md:prose-blockquote:text-xl
              flex flex-col items-center justify-center"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(activeSlideContent) }}
          />
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-center gap-4 py-4 px-6 bg-slate-900/60 backdrop-blur-md border-t border-slate-800/80 z-20 shrink-0">
        <button
          onClick={() => changeSlide(-1)}
          disabled={currentSlide <= 0}
          className="p-2 rounded-xl bg-slate-950/60 border border-slate-500 text-slate-450 hover:text-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="text-xs font-mono font-bold text-slate-350 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-xl">
          SLIDE {currentSlide + 1} OF {slides.length}
        </div>

        <button
          onClick={() => changeSlide(1)}
          disabled={currentSlide >= slides.length - 1}
          className="p-2 rounded-xl bg-slate-950/60 border border-slate-500 text-slate-450 hover:text-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
