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
  EyeOff
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
}

export default function DocumentViewer({ url, title }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [isLandscape, setIsLandscape] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
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

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col border border-slate-800 bg-slate-950 overflow-hidden relative shadow-2xl transition-all duration-300 rounded-2xl ${
        isFullscreen ? 'h-screen w-screen z-50 rounded-none' : 'h-[720px]'
      }`}
    >
      {/* Protect Watermark overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-[0.02]">
        <div className="text-slate-400 font-extrabold text-4xl sm:text-6xl uppercase tracking-widest rotate-12">
          STE CANONICAL LIBRARY - COPY PROTECTED
        </div>
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest truncate max-w-xs sm:max-w-md">
            {title || 'Course Material'}
          </h4>
          {isLandscape && (
            <span className="ml-2 text-[9px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
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

        {url ? (
          <div className="shadow-2xl border border-slate-900 rounded bg-slate-900 overflow-hidden max-w-full">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              className="flex justify-center"
            >
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
            </Document>
          </div>
        ) : null}
      </div>

      {/* Footer Navigation Bar */}
      {numPages && (
        <div className="flex items-center justify-center gap-4 py-4 px-6 bg-slate-900/60 backdrop-blur-md border-t border-slate-800/80 z-20">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-2 rounded-xl bg-slate-950/60 border border-slate-500 text-slate-450 hover:text-white hover:border-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="text-xs font-mono font-bold text-slate-300 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-xl">
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
