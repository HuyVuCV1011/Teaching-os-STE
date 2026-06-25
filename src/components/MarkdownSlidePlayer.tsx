'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Play, 
  RotateCcw,
  PanelLeft
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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)
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

  // Handle keyboard navigation and shortcut for sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        changeSlide(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        changeSlide(-1)
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
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

  // Auto-collapse sidebar in fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
      if (isCurrentlyFullscreen) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto-scroll selected thumbnail into view
  useEffect(() => {
    if (!isSidebarOpen) return
    const timer = setTimeout(() => {
      const activeThumb = document.getElementById(`slide-thumb-${currentSlide}`)
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [currentSlide, isSidebarOpen])

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
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer ${
              isSidebarOpen ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title={isSidebarOpen ? 'Ẩn thanh điều hướng (T)' : 'Hiện thanh điều hướng (T)'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <Play className="w-4 h-4 text-emerald-500" />
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest truncate max-w-xs sm:max-w-md">
            {title || 'Markdown Slides'}
          </h4>
          <span className="ml-2 text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline-block">
            Web-Native Slides
          </span>
        </div>

        {/* Top toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentSlide(0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Restart Slideshow"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen presentation'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Middle Layout Container */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Sidebar */}
        {isSidebarOpen && (
          <div className="w-[190px] bg-slate-950 border-r border-slate-800/80 flex flex-col overflow-y-auto p-4 gap-3 shrink-0 custom-scrollbar select-none">
            {slides.map((slide, idx) => (
              <button
                key={idx}
                id={`slide-thumb-${idx}`}
                onClick={() => setCurrentSlide(idx)}
                className="flex items-start gap-2 group cursor-pointer text-left w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
              >
                <span className={`text-[10px] font-mono font-bold w-4 text-right pt-1.5 shrink-0 ${
                  currentSlide === idx ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-350'
                }`}>
                  {idx + 1}
                </span>
                <div className={`relative aspect-[16/9] w-[130px] rounded-lg border overflow-hidden transition-all duration-200 shrink-0 ${
                  currentSlide === idx 
                    ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500' 
                    : 'border-slate-800 bg-slate-900/30 group-hover:border-slate-700 group-hover:bg-slate-900/50'
                }`}>
                  {/* Scaled-down simplified slide content preview */}
                  <div className="absolute inset-0 w-[520px] h-[292px] scale-[0.25] origin-top-left p-6 bg-slate-950 flex flex-col justify-center items-center text-center overflow-hidden pointer-events-none select-none">
                    <div 
                      className="prose prose-invert max-w-none text-[7px] leading-tight space-y-1.5 text-center
                        prose-headings:text-slate-100 prose-headings:font-bold prose-headings:my-0.5
                        prose-h1:text-[11px] prose-h2:text-[9px] prose-h3:text-[8px]
                        prose-p:text-[6px] prose-p:text-slate-400 prose-p:my-0.5
                        prose-ul:my-0.5 prose-ul:pl-2 prose-li:my-0.2
                        prose-pre:hidden prose-blockquote:hidden prose-img:max-h-12 prose-img:mx-auto prose-img:object-contain prose-img:my-0.5"
                      dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(slide) }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

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
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-center gap-4 py-4 px-6 bg-slate-900/60 backdrop-blur-md border-t border-slate-800/80 z-20 shrink-0">
        <button
          onClick={() => changeSlide(-1)}
          disabled={currentSlide <= 0}
          className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="text-xs font-mono font-bold text-slate-350 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-xl">
          SLIDE {currentSlide + 1} OF {slides.length}
        </div>

        <button
          onClick={() => changeSlide(1)}
          disabled={currentSlide >= slides.length - 1}
          className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

