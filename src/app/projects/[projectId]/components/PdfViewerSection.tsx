'use client'

import React, { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { Document, Page, pdfjs } from 'react-pdf'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import { Loader2 } from 'lucide-react'

import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import 'img-comparison-slider/dist/styles.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface LazyPlaceholderProps {
  pageIndex: number
  onVisible: (index: number) => void
  children: React.ReactNode
}

function LazyPlaceholder({ pageIndex, onVisible, children }: LazyPlaceholderProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(pageIndex)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [pageIndex, onVisible])

  return (
    <div
      ref={ref}
      className="w-full mb-6 min-h-[400px] flex items-center justify-center bg-slate-900/5 border border-slate-200/50 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
    >
      {children}
    </div>
  )
}

interface PdfViewerSectionProps {
  files: string[]
  containerWidth: number
  numPages: number[]
  setNumPages: React.Dispatch<React.SetStateAction<number[]>>
}

export function PdfViewerSection({
  files,
  containerWidth,
  numPages,
  setNumPages,
}: PdfViewerSectionProps) {
  const [pageImages, setPageImages] = useState<{
    first: string[]
    second: string[]
  }>({
    first: [],
    second: [],
  })
  const [visiblePages, setVisiblePages] = useState<Record<number, boolean>>({})
  const [sliderValue, setSliderValue] = useState<number>(50)

  const canvasRefs = useRef<(HTMLCanvasElement | null)[][]>([[], []])
  const sliderRefs = useRef<(HTMLElement | null)[]>([])

  // Synchronize slider value across all ImgComparisonSliders
  useEffect(() => {
    const handleSliderInput = (event: Event) => {
      const input = event.target as HTMLInputElement
      setSliderValue(Number(input.value))
    }

    sliderRefs.current.forEach((slider) => {
      if (slider) {
        const input = slider.querySelector('input[type="range"]')
        if (input) {
          input.addEventListener('input', handleSliderInput)
        }
      }
    })

    return () => {
      sliderRefs.current.forEach((slider) => {
        if (slider) {
          const input = slider.querySelector('input[type="range"]')
          if (input) {
            input.removeEventListener('input', handleSliderInput)
          }
        }
      })
    }
  }, [maxPages]) // reload listener when max pages changes

  const onDocumentLoadSuccess =
    (fileIndex: number) =>
    ({ numPages }: { numPages: number }) => {
      setNumPages((prev) => {
        const newNumPages = [...prev]
        newNumPages[fileIndex] = numPages
        return newNumPages
      })
    }

  const convertPageToImage = (fileIndex: number, pageIndex: number) => {
    const canvas = canvasRefs.current[fileIndex]?.[pageIndex]
    if (canvas) {
      const imageData = canvas.toDataURL('image/png')
      setPageImages((prev) => {
        const key = fileIndex === 0 ? 'first' : 'second'
        const newImages = [...prev[key]]
        newImages[pageIndex] = imageData
        return { ...prev, [key]: newImages }
      })
    }
  }

  const maxPages = Math.max(...numPages.filter(Boolean))
  if (maxPages === 0) return null

  return (
    <>
      {/* PDF Rendering (Hidden offscreen to rasterize canvases) */}
      {files.slice(0, 2).map((file: string, fileIndex: number) => (
        <div key={file} style={{ display: 'none' }}>
          <Document
            file={file.startsWith('http') ? file : `/files/${file}`}
            onLoadSuccess={onDocumentLoadSuccess(fileIndex)}
          >
            {numPages[fileIndex] &&
              Array.from({ length: numPages[fileIndex] }, (_, pageIndex) => {
                if (!canvasRefs.current[fileIndex]) {
                  canvasRefs.current[fileIndex] = []
                }
                return (
                  visiblePages[pageIndex] && (
                    <Page
                      key={pageIndex}
                      pageNumber={pageIndex + 1}
                      width={containerWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={() => convertPageToImage(fileIndex, pageIndex)}
                      canvasRef={(ref) => {
                        if (ref) {
                          canvasRefs.current[fileIndex][pageIndex] = ref
                        }
                      }}
                    />
                  )
                )
              })}
          </Document>
        </div>
      ))}

      {/* PDF Display (Collapsible) */}
      <details id="files-details" className="mb-4 border rounded">
        <summary
          id="files"
          className="p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 text-lg font-medium"
        >
          Tệp
        </summary>
        <div className="p-4">
          {Array.from({ length: maxPages }, (_, pageIndex) => (
            <LazyPlaceholder
              key={pageIndex}
              pageIndex={pageIndex}
              onVisible={(index) => {
                setVisiblePages((prev) => ({ ...prev, [index]: true }))
              }}
            >
              {files.length === 1 ? (
                pageImages.first[pageIndex] ? (
                  <Image
                    src={pageImages.first[pageIndex]}
                    alt={`Tệp 1 - Trang ${pageIndex + 1}`}
                    width={containerWidth}
                    height={containerWidth * 1.414}
                    className="w-full h-auto"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500 text-xs py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Đang tải trang {pageIndex + 1}...</span>
                  </div>
                )
              ) : pageImages.first[pageIndex] && pageImages.second[pageIndex] ? (
                <ImgComparisonSlider
                  value={sliderValue}
                  className="w-full"
                  ref={(el) => {
                    sliderRefs.current[pageIndex] = el
                  }}
                >
                  <Image
                    slot="first"
                    src={pageImages.first[pageIndex]}
                    alt={`Tệp 1 - Trang ${pageIndex + 1}`}
                    width={containerWidth}
                    height={containerWidth * 1.414}
                    className="w-full h-auto"
                    unoptimized
                  />
                  <Image
                    slot="second"
                    src={pageImages.second[pageIndex]}
                    alt={`Tệp 2 - Trang ${pageIndex + 1}`}
                    width={containerWidth}
                    height={containerWidth * 1.414}
                    className="w-full h-auto"
                    unoptimized
                  />
                </ImgComparisonSlider>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500 text-xs py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Đang tải trang {pageIndex + 1}...</span>
                </div>
              )}
            </LazyPlaceholder>
          ))}
        </div>
      </details>
    </>
  )
}
