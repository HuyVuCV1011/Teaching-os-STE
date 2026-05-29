'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import 'img-comparison-slider/dist/styles.css'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import ReactFlow, {
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { CustomNode } from '@/components/ui/FlowDiagram'
import { Button } from '@/components/ui/button'
import {
  FileSpreadsheet,
  MailIcon,
  FolderKanban,
  Database,
  Split,
  UserRound,
  LayoutDashboard,
  ChartArea,
  FileText,
  Shuffle,
  MailCheck,
  Menu,
  X,
  Loader2,
} from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface FlowNode {
  id: string
  type?: string
  label?: string
  description?: string
  icon?: string
  position?: { x: number; y: number }
}

interface FlowEdge {
  id?: string
  source: string
  target: string
  type?: string
  label?: string
}

interface Project {
  id: string
  title: string
  description: string
  thumbnails: string[]
  files: string[]
  icons: string[]
  flow_diagram: { nodes: FlowNode[]; edges: FlowEdge[] } | null
  iframe_link: string | null
  youtube_link: string | null
}

const nodeIconMap: {
  [key: string]: React.ComponentType<{ size: number; strokeWidth: number }>
} = {
  FileSpreadsheet,
  MailIcon,
  FolderKanban,
  Database,
  Split,
  UserRound,
  LayoutDashboard,
  ChartArea,
  FileText,
  Shuffle,
  MailCheck,
}

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

const ProjectIdPage = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [numPages, setNumPages] = useState<number[]>([])
  const [containerWidth, setContainerWidth] = useState<number>(800)
  const [pageImages, setPageImages] = useState<{
    first: string[]
    second: string[]
  }>({
    first: [],
    second: [],
  })
  const [visiblePages, setVisiblePages] = useState<Record<number, boolean>>({})
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isShrunk, setIsShrunk] = useState(false)
  const [sliderValue, setSliderValue] = useState<number>(50)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[][]>([[], []])
  const sliderRefs = useRef<(HTMLElement | null)[]>([])

  // Fetch project data from Supabase
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()
        if (error) {
          console.error('Error fetching project:', error)
          throw new Error(`Không thể tải dự án: ${error.message}`)
        }
        setProject(data)
        if (
          data.flow_diagram &&
          Array.isArray(data.flow_diagram.nodes) &&
          Array.isArray(data.flow_diagram.edges)
        ) {
          const loadedNodes = data.flow_diagram.nodes.map((node: FlowNode) => ({
            id: node.id,
            type: 'customNode',
            data: {
              type: node.type || 'source',
              label: node.label || 'Nút',
              description: node.description || '',
              icon:
                nodeIconMap[node.icon || 'FileSpreadsheet'] || FileSpreadsheet,
            },
            position: node.position || { x: 0, y: 0 },
          }))
          const loadedEdges = data.flow_diagram.edges.map((edge: FlowEdge) => ({
            id:
              edge.id || `edge-${Math.random().toString(36).substring(2, 11)}`,
            source: edge.source,
            target: edge.target,
            type: edge.type || 'default',
            label: edge.label || '',
            labelStyle: { fill: 'inherit', fontSize: 12 },
            labelBgStyle: { fill: 'white', fillOpacity: 1, padding: 4 },
            labelBgPadding: [4, 8],
            labelBgBorderRadius: 9999,
            markerEnd: { type: MarkerType.ArrowClosed },
          }))
          setNodes(loadedNodes)
          setEdges(loadedEdges)
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Lỗi không xác định'
        console.error('Fetch error:', message)
        alert(`Lỗi: ${message}`)
      }
    }
    fetchProject()
  }, [projectId, setNodes, setEdges])

  // Update container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Handle scroll to shrink/expand TOC
  useEffect(() => {
    const handleScroll = () => {
      setIsShrunk(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
  }, [])

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
    const canvas = canvasRefs.current[fileIndex][pageIndex]
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

  // Handle TOC navigation
  const handleNavClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsSidebarOpen(false)
      // Expand the files section if navigating to it
      if (id === 'files') {
        const detailsElement = document.getElementById('files-details')
        if (detailsElement instanceof HTMLDetailsElement) {
          detailsElement.open = true
        }
      }
    }
  }

  // Handle button click to expand TOC
  const handleButtonClick = () => {
    setIsSidebarOpen(true)
    setIsShrunk(false)
  }

  if (!project) {
    return <div>Đang tải...</div>
  }

  return (
    <main className="container mt-28 w-full">
      {/* Table of Contents or Button */}
      {isShrunk && !isSidebarOpen ? (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-10 left-10 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg z-10"
          onClick={handleButtonClick}
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
      ) : (
        <div
          className={`overflow-y-auto fixed inset-y-0 left-0 w-48 bg-white/80 backdrop-blur-md p-4 shadow-lg rounded-r-lg z-10 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:top-0 md:h-auto md:rounded-lg`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-800">Mục lục</h3>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          <ul className="space-y-1 text-sm">
            {project.iframe_link && (
              <li>
                <button
                  onClick={() => handleNavClick('dashboard-iframe')}
                  className="w-full text-left text-blue-600 hover:bg-gray-100 rounded px-2 py-1"
                >
                  Dashboard
                </button>
              </li>
            )}
            {project.youtube_link && (
              <li>
                <button
                  onClick={() => handleNavClick('youtube-iframe')}
                  className="w-full text-left text-blue-600 hover:bg-gray-100 rounded px-2 py-1"
                >
                  Video
                </button>
              </li>
            )}
            {project.flow_diagram && nodes.length > 0 && (
              <li>
                <button
                  onClick={() => handleNavClick('flow-diagram')}
                  className="w-full text-left text-blue-600 hover:bg-gray-100 rounded px-2 py-1"
                >
                  Luồng xử lý
                </button>
              </li>
            )}
            {project.description && (
              <li>
                <button
                  onClick={() => handleNavClick('description')}
                  className="w-full text-left text-blue-600 hover:bg-gray-100 rounded px-2 py-1"
                >
                  Mô tả
                </button>
              </li>
            )}
            {project.files.length > 0 && maxPages > 0 && (
              <li>
                <button
                  onClick={() => handleNavClick('files')}
                  className="w-full text-left text-blue-600 hover:bg-gray-100 rounded px-2 py-1"
                >
                  Tệp
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      {/* Main Content */}
      <div className="w-full">
        <section className="section" ref={containerRef}>
          <div className="section-head">
            <h2 className="section-title">{project.title}</h2>
          </div>
          <div className="flex flex-col gap-8">
            {/* Dashboard Iframe */}
            {project.iframe_link && (
              <div
                id="dashboard-iframe"
                className="border p-4 rounded relative"
              >
                <h3 className="text-lg font-semibold mb-2 absolute top-4 left-4">
                  Dashboard
                </h3>
                <iframe
                  src={project.iframe_link}
                  width="100%"
                  height="500px"
                  title="Dashboard"
                  className="rounded mt-8"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}
            {/* YouTube Iframe */}
            {project.youtube_link && (
              <div id="youtube-iframe" className="border p-4 rounded relative">
                <h3 className="text-lg font-semibold mb-2 absolute top-4 left-4">
                  Video
                </h3>
                <iframe
                  src={project.youtube_link}
                  width="100%"
                  height="500px"
                  title="Video YouTube"
                  className="rounded mt-8"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              </div>
            )}
            {/* Flow Diagram */}
            {project.flow_diagram && nodes.length > 0 && (
              <div
                id="flow-diagram"
                className="border p-4 rounded relative"
                style={{ height: '500px' }}
              >
                <h3 className="text-lg font-semibold mb-2 absolute top-4 left-4">
                  Luồng xử lý
                </h3>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={{ customNode: CustomNode }}
                  fitView
                >
                  <Controls />
                </ReactFlow>
              </div>
            )}
            {/* Description */}
            {project.description && (
              <div id="description" className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Mô tả</h3>
                <div
                  className={`prose max-w-none relative ${
                    isDescriptionExpanded ? '' : 'max-h-[200px] overflow-hidden'
                  } transition-all duration-300`}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: project.description }}
                  />
                  {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </div>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    setIsDescriptionExpanded(!isDescriptionExpanded)
                  }
                >
                  {isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                </Button>
              </div>
            )}
            {/* PDF Rendering (Hidden) */}
            {project.files
              .slice(0, 2)
              .map((file: string, fileIndex: number) => (
                <div key={file} style={{ display: 'none' }}>
                  <Document
                    file={file.startsWith('http') ? file : `/files/${file}`}
                    onLoadSuccess={onDocumentLoadSuccess(fileIndex)}
                  >
                    {numPages[fileIndex] &&
                      Array.from(
                        { length: numPages[fileIndex] },
                        (_, pageIndex) => visiblePages[pageIndex] && (
                          <Page
                            key={pageIndex}
                            pageNumber={pageIndex + 1}
                            width={containerWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderSuccess={() =>
                              convertPageToImage(fileIndex, pageIndex)
                            }
                            canvasRef={(ref) => {
                              if (ref) {
                                canvasRefs.current[fileIndex][pageIndex] = ref
                              }
                            }}
                          />
                        )
                      )}
                  </Document>
                </div>
              ))}
            {/* PDF Display (Collapsible) */}
            {maxPages > 0 && (
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
                      {project.files.length === 1 ? (
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
                      ) : pageImages.first[pageIndex] &&
                        pageImages.second[pageIndex] ? (
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
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default ProjectIdPage
