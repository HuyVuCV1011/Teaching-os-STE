'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useNodesState, useEdgesState, MarkerType } from 'reactflow'
import { FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

import { nodeIconOptions } from '@/app/admin/projects/components/ProcessDiagramWorkspace'
import { TableOfContents } from './TableOfContents'
import { ProjectMediaIframes } from './ProjectMediaIframes'
import { ProcessDiagramView } from './ProcessDiagramView'
import { ProjectDescriptionView } from './ProjectDescriptionView'
import { PdfViewerSection } from './PdfViewerSection'
import type { FlowEdge, FlowNode, Project } from '@/lib/project-data'

type ProjectDetailClientProps = {
  project: Project | null
}

export default function ProjectDetailClient({
  project,
}: ProjectDetailClientProps) {
  const [numPages, setNumPages] = useState<number[]>([])
  const [containerWidth, setContainerWidth] = useState<number>(800)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isShrunk, setIsShrunk] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      project?.flow_diagram &&
      Array.isArray(project.flow_diagram.nodes) &&
      Array.isArray(project.flow_diagram.edges)
    ) {
      const loadedNodes = project.flow_diagram.nodes.map((node: FlowNode) => ({
        id: node.id,
        type: 'customNode',
        data: {
          type: node.type || 'source',
          label: node.label || 'Nút',
          description: node.description || '',
          icon:
            nodeIconOptions.find((opt) => opt.value === node.icon)?.icon ||
            FileSpreadsheet,
        },
        position: node.position || { x: 0, y: 0 },
      }))
      const loadedEdges = project.flow_diagram.edges.map((edge: FlowEdge) => ({
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'default',
        label: edge.label || '',
        labelStyle: { fill: 'inherit', fontSize: 12 },
        labelBgStyle: { fill: 'white', fillOpacity: 1, padding: 4 },
        labelBgPadding: [4, 8] as [number, number],
        labelBgBorderRadius: 9999,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
      setNodes(loadedNodes)
      setEdges(loadedEdges)
      return
    }

    setNodes([])
    setEdges([])
  }, [project, setNodes, setEdges])

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

  useEffect(() => {
    const handleScroll = () => {
      setIsShrunk(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsSidebarOpen(false)
      if (id === 'files') {
        const detailsElement = document.getElementById('files-details')
        if (detailsElement instanceof HTMLDetailsElement) {
          detailsElement.open = true
        }
      }
    }
  }

  const handleButtonClick = () => {
    setIsSidebarOpen(true)
    setIsShrunk(false)
  }

  if (!project) {
    return (
      <div className="container mt-28 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-slate-100">
          Không tìm thấy dự án phù hợp.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          Dự án có thể đã được ẩn, đổi đường dẫn hoặc chưa được xuất bản trên
          showcase.
        </p>
        <Link
            href="/projects"
            className="mt-5 inline-flex rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-850"
          >
            Quay lại danh sách dự án
        </Link>
      </div>
    )
  }

  const maxPages = Math.max(0, ...numPages.filter(Boolean))

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container mt-28 w-full focus:outline-none"
    >
      <TableOfContents
        iframeLink={project.iframe_link}
        youtubeLink={project.youtube_link}
        flowDiagram={project.flow_diagram}
        nodesLength={nodes.length}
        description={project.description}
        filesLength={project.files.length}
        maxPages={maxPages}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isShrunk={isShrunk}
        handleNavClick={handleNavClick}
        handleButtonClick={handleButtonClick}
      />

      <div className="w-full">
        <section className="section" ref={containerRef}>
          <div className="section-head">
            <h1 className="section-title">{project.title}</h1>
          </div>
          <div className="flex flex-col gap-8">
            <ProjectMediaIframes
              iframeLink={project.iframe_link}
              youtubeLink={project.youtube_link}
            />

            {project.flow_diagram && nodes.length > 0 && (
              <ProcessDiagramView
                nodes={nodes}
                onNodesChange={onNodesChange}
                edges={edges}
                onEdgesChange={onEdgesChange}
              />
            )}

            {project.description && (
              <ProjectDescriptionView
                description={project.description}
                isDescriptionExpanded={isDescriptionExpanded}
                setIsDescriptionExpanded={setIsDescriptionExpanded}
              />
            )}

            {project.files.length > 0 && (
              <PdfViewerSection
                files={project.files}
                containerWidth={containerWidth}
                numPages={numPages}
                setNumPages={setNumPages}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
