'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ReactFlowProvider, useNodesState, useEdgesState, MarkerType } from 'reactflow'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'

// Import shared helpers and components
import { hasCycle, getLayoutedElements } from '../../utils/projectUtils'
import { ProjectDetailsForm } from '../../components/ProjectDetailsForm'
import { ProcessDiagramWorkspace, nodeIconOptions } from '../../components/ProcessDiagramWorkspace'
import { MediaAttachments } from '../../components/MediaAttachments'
import { LinksTaxonomy } from '../../components/LinksTaxonomy'

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

function EditProjectPageContent() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [thumbnails, setThumbnails] = useState<File[]>([])
  const [existingThumbnails, setExistingThumbnails] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<string[]>([])
  const [icons, setIcons] = useState<string[]>([])
  const [productOption, setProductOption] = useState<string | null>(null)
  const [iframeLink, setIframeLink] = useState<string | null>(null)
  const [youtubeLink, setYoutubeLink] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (error) {
          alert('Không thể tải dự án')
          router.push('/admin/projects')
          return
        }

        if (data) {
          setTitle(data.title || '')
          setDescription(data.description || '')
          setExistingThumbnails(Array.isArray(data.thumbnails) ? data.thumbnails : [])
          setExistingFiles(Array.isArray(data.files) ? data.files : [])
          setIcons(Array.isArray(data.icons) ? data.icons : [])
          setProductOption(data.product_option || null)
          setIframeLink(data.iframe_link || null)
          setYoutubeLink(data.youtube_link || null)

          if (data.flow_diagram) {
            const fetchedNodes = (data.flow_diagram.nodes || []).map((node: FlowNode) => ({
              id: node.id,
              type: 'customNode',
              data: {
                type: node.type,
                label: node.label,
                description: node.description,
                icon: nodeIconOptions.find((opt) => opt.value === node.icon)?.icon,
              },
              position: node.position || { x: 0, y: 0 },
            }))
            const fetchedEdges = (data.flow_diagram.edges || []).map((edge: FlowEdge) => ({
              ...edge,
              style: { strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed },
            }))
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
              fetchedNodes,
              fetchedEdges
            )
            setNodes(layoutedNodes)
            setEdges(layoutedEdges)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
        alert('Lỗi khi tải dự án')
        router.push('/admin/projects')
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  const uploadFilesToStorage = async (
    filesList: File[],
    projId: string,
    bucket: string
  ): Promise<string[]> => {
    const urls: string[] = []
    for (const file of filesList) {
      const fileName = `${projId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false })
      if (uploadError) {
        throw new Error(`Failed to upload to ${bucket}: ${uploadError.message}`)
      }
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)
      urls.push(publicUrlData.publicUrl)
    }
    return urls
  }

  const deleteFilesFromStorage = async (urls: string[], bucket: string) => {
    const paths = urls
      .map((url) => {
        try {
          const urlObj = new URL(url)
          return urlObj.pathname.split('/').slice(4).join('/')
        } catch {
          return ''
        }
      })
      .filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from(bucket).remove(paths)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasCycle(nodes, edges)) {
      if (!confirm('Warning: The process diagram contains circular loops (cycles). Save anyway?')) {
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (thumbnails.length > 0 && existingThumbnails.length > 0) {
        await deleteFilesFromStorage(existingThumbnails, 'thumbnails')
      }
      if (files.length > 0 && existingFiles.length > 0) {
        await deleteFilesFromStorage(existingFiles, 'files')
      }

      const thumbnailUrls = thumbnails.length > 0
        ? await uploadFilesToStorage(thumbnails, projectId, 'thumbnails')
        : existingThumbnails

      const fileUrls = files.length > 0
        ? await uploadFilesToStorage(files, projectId, 'files')
        : existingFiles

      const simplifiedNodes = nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        description: node.data.description,
        icon: nodeIconOptions.find((opt) => opt.icon === node.data.icon)?.value,
        position: node.position,
      }))

      const { error } = await supabase
        .from('projects')
        .update({
          title,
          description,
          thumbnails: thumbnailUrls,
          files: fileUrls,
          icons,
          flow_diagram: { nodes: simplifiedNodes, edges },
          product_option: productOption,
          iframe_link: iframeLink,
          youtube_link: youtubeLink,
        })
        .eq('id', projectId)

      if (error) throw error

      alert('Showcase project updated successfully!')
      router.push('/admin/projects')
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Retrieving project workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-slate-250">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/projects')}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" /> Edit Showcase Project
          </h1>
          <p className="text-xs text-slate-500">Configure visual diagrams, files uploads, and details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Metadata & Flow Diagrams */}
        <div className="lg:col-span-2 space-y-6">
          <ProjectDetailsForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
          />
          <ProcessDiagramWorkspace
            nodes={nodes}
            setNodes={setNodes}
            onNodesChange={onNodesChange}
            edges={edges}
            setEdges={setEdges}
            onEdgesChange={onEdgesChange}
          />
        </div>

        {/* Right Side: Media & Settings */}
        <div className="space-y-6">
          <MediaAttachments
            thumbnails={thumbnails}
            setThumbnails={setThumbnails}
            files={files}
            setFiles={setFiles}
            existingThumbnails={existingThumbnails}
            existingFiles={existingFiles}
          />
          <LinksTaxonomy
            productOption={productOption}
            setProductOption={setProductOption}
            iframeLink={iframeLink}
            setIframeLink={setIframeLink}
            youtubeLink={youtubeLink}
            setYoutubeLink={setYoutubeLink}
            icons={icons}
            setIcons={setIcons}
            isSubmitting={isSubmitting}
            submitButtonText="Update Project Showcase"
          />
        </div>
      </form>
    </div>
  )
}

export default function EditProjectPage() {
  return (
    <ReactFlowProvider>
      <EditProjectPageContent />
    </ReactFlowProvider>
  )
}
