'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useNodesState, useEdgesState, MarkerType } from 'reactflow'
import { FileSpreadsheet } from 'lucide-react'

// Import shared components and subcomponents
import { nodeIconOptions } from '@/app/admin/projects/components/ProcessDiagramWorkspace'
import { TableOfContents } from './components/TableOfContents'
import { ProjectMediaIframes } from './components/ProjectMediaIframes'
import { ProcessDiagramView } from './components/ProcessDiagramView'
import { ProjectDescriptionView } from './components/ProjectDescriptionView'
import { PdfViewerSection } from './components/PdfViewerSection'

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

export default function ProjectIdPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  
  // PDF state for Table of Contents height detection
  const [numPages, setNumPages] = useState<number[]>([])
  const [containerWidth, setContainerWidth] = useState<number>(800)
  
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isShrunk, setIsShrunk] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

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
              icon: nodeIconOptions.find((opt) => opt.value === node.icon)?.icon || FileSpreadsheet,
            },
            position: node.position || { x: 0, y: 0 },
          }))
          const loadedEdges = data.flow_diagram.edges.map((edge: FlowEdge) => ({
            id: edge.id || `edge-${Math.random().toString(36).substring(2, 11)}`,
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
      } catch (error: any) {
        console.error('Fetch error:', error.message)
        alert(`Lỗi: ${error.message}`)
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
    return <div className="text-center py-20 text-slate-500 font-semibold">Đang tải...</div>
  }

  const maxPages = Math.max(...numPages.filter(Boolean))

  return (
    <main className="container mt-28 w-full">
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
            <h2 className="section-title">{project.title}</h2>
          </div>
          <div className="flex flex-col gap-8">
            <ProjectMediaIframes
              iframeLink={project.iframe_link}
              youtubeLink={project.youtube_link}
            />

            {project.flow_diagram && nodes.length > 0 && (
              <ProcessDiagramView
                nodes={nodes}
                setNodes={setNodes}
                onNodesChange={onNodesChange}
                edges={edges}
                setEdges={setEdges}
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
