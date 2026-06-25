'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Loader2,
  RotateCw,
  EyeOff,
  PanelLeft
} from 'lucide-react'

// CSS imports for react-pdf
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface DocumentViewerProps {
  url: string // Signed URL to load the PDF
  title?: string
  className?: string
}

export default function DocumentViewer({ url, title, className }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [isLandscape, setIsLandscape] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    setLoading(false)
    setError(null)
  }

  function onDocumentLoadError(err: Error) {
    console.error('PDF Load Error:', err)
    setError('Failed to load document resource.')
    setLoading(false)
  }

  function onPageLoadSuccess(page: any) {
    const { width, height } = page.getViewport({ scale: 1.0 })
    setIsLandscape(width > height)
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const nextPage = prevPageNumber + offset
      return Math.min(Math.max(nextPage, 1), numPages || 1)
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
        changePage(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        changePage(-1)
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [numPages, pageNumber])

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
      const activeThumb = document.getElementById(`pdf-page-thumb-${pageNumber}`)
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [pageNumber, isSidebarOpen])

  useEffect(() => {
    if (!url) {
      setError('No document source provided.')
      setLoading(false)
      return
    }
    if (
      !url.startsWith('http://') &&
      !url.startsWith('https://') &&
      !url.startsWith('/') &&
      !url.startsWith('blob:') &&
      !url.startsWith('data:')
    ) {
      setError('Unable to load document. Preview URL is unresolved.')
      setLoading(false)
      return
    }
    setError(null)
  }, [url])

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col border border-slate-800 bg-slate-950 overflow-hidden relative shadow-2xl transition-all duration-300 rounded-2xl ${
        isFullscreen ? 'h-screen w-screen z-50 rounded-none' : className || 'h-[720px]'
      }`}
    >
      {/* Protect Watermark overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-[0.02]">
        <div className="text-slate-400 font-extrabold text-4xl sm:text-6xl uppercase tracking-widest rotate-12">
          STE CANONICAL LIBRARY - COPY PROTECTED
        </div>
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 z-20 shrink-0">
        <div className="flex items-center gap-2">
          {numPages && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 mr-1 rounded-lg transition-colors ${
                isSidebarOpen ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isSidebarOpen ? 'Ẩn thanh điều hướng (T)' : 'Hiện thanh điều hướng (T)'}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest truncate max-w-xs sm:max-w-md">
            {title || 'Course Material'}
          </h4>
          {isLandscape && (
            <span className="ml-2 text-[9px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline-block">
              Presentation Deck
            </span>
          )}
        </div>

        {/* Top toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            disabled={loading || !!error}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 px-1 font-semibold">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
            disabled={loading || !!error}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
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

      {/* Middle Layout Container */}
      {url && !error ? (
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="flex-1 flex min-h-0 overflow-hidden relative"
        >
          {/* Left Sidebar */}
          {isSidebarOpen && numPages && (
            <div className="w-[190px] bg-slate-950 border-r border-slate-800/80 flex flex-col overflow-y-auto p-4 gap-3 shrink-0 custom-scrollbar select-none">
              {Array.from({ length: numPages }).map((_, idx) => {
                const pNum = idx + 1
                const isActive = pageNumber === pNum
                return (
                  <button
                    key={pNum}
                    id={`pdf-page-thumb-${pNum}`}
                    onClick={() => setPageNumber(pNum)}
                    className="flex items-start gap-2 group cursor-pointer text-left w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
                  >
                    <span className={`text-[10px] font-mono font-bold w-4 text-right pt-1.5 shrink-0 ${
                      isActive ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-350'
                    }`}>
                      {pNum}
                    </span>
                    <div className={`relative w-[130px] rounded-lg border overflow-hidden transition-all duration-200 shrink-0 flex items-center justify-center bg-slate-950 ${
                      isLandscape ? 'aspect-[16/10] h-[81px]' : 'aspect-[1/1.41] h-[183px]'
                    } ${
                      isActive 
                        ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500' 
                        : 'border-slate-800 bg-slate-900/10 group-hover:border-slate-700 group-hover:bg-slate-900/20'
                    }`}>
                      {/* Actual rendering of the PDF page as thumbnail */}
                      <div className="pointer-events-none select-none overflow-hidden max-h-full max-w-full flex items-center justify-center">
                        <Page 
                          pageNumber={pNum} 
                          width={130}
                          renderTextLayer={false} 
                          renderAnnotationLayer={false}
                          loading={
                            <div className="w-[130px] h-full bg-slate-900/40 animate-pulse flex items-center justify-center text-[9px] font-mono text-slate-650">
                              Loading...
                            </div>
                          }
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Main Canvas Scroll Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-950/90 relative z-0 custom-scrollbar">
            {loading && (
              <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 text-slate-400 bg-slate-950/80 z-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">Securing & rendering pages...</span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-slate-500 gap-2.5 z-20">
                <EyeOff className="w-10 h-10 text-slate-600" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {!error && (
              <div className="shadow-2xl border border-slate-900 rounded bg-slate-900 overflow-hidden max-w-full">
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  onLoadSuccess={onPageLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center py-20 px-32 gap-3 text-slate-500 font-mono text-xs">
                      <RotateCw className="w-6 h-6 animate-spin text-blue-600/80" />
                      <span>Rendering page {pageNumber}...</span>
                    </div>
                  }
                />
              </div>
            )}
          </div>
        </Document>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-550 text-xs italic">
          {error || 'No document source provided.'}
        </div>
      )}

      {/* Footer Navigation Bar */}
      {numPages && (
        <div className="flex items-center justify-center gap-4 py-4 px-6 bg-slate-900/60 backdrop-blur-md border-t border-slate-800/80 z-20 shrink-0">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-2 rounded-xl bg-slate-950/60 border border-slate-500 text-slate-450 hover:text-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="text-xs font-mono font-bold text-slate-350 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-xl">
            PAGE {pageNumber} OF {numPages}
          </div>

          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="p-2 rounded-xl bg-slate-950/60 border border-slate-500 text-slate-450 hover:text-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

