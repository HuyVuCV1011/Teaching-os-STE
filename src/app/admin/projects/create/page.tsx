'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ReactFlowProvider, useNodesState, useEdgesState } from 'reactflow'
import { Plus, ArrowLeft } from 'lucide-react'

// Import shared helpers and components
import { hasCycle } from '../utils/projectUtils'
import { ProjectDetailsForm } from '../components/ProjectDetailsForm'
import { ProcessDiagramWorkspace, nodeIconOptions } from '../components/ProcessDiagramWorkspace'
import { MediaAttachments } from '../components/MediaAttachments'
import { LinksTaxonomy } from '../components/LinksTaxonomy'

function CreateProjectPageContent() {
  const router = useRouter()
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [thumbnails, setThumbnails] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [icons, setIcons] = useState<string[]>([])
  const [productOption, setProductOption] = useState<string | null>(null)
  const [iframeLink, setIframeLink] = useState<string | null>(null)
  const [youtubeLink, setYoutubeLink] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const uploadFilesToStorage = async (
    filesList: File[],
    projectId: string,
    bucket: string
  ): Promise<string[]> => {
    const urls: string[] = []
    for (const file of filesList) {
      const fileName = `${projectId}/${Date.now()}-${file.name}`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasCycle(nodes, edges)) {
      if (!confirm('Warning: The process diagram contains circular loops (cycles). Save anyway?')) {
        return
      }
    }

    setIsSubmitting(true)
    const projectId = crypto.randomUUID()

    try {
      const thumbnailUrls = thumbnails.length > 0
        ? await uploadFilesToStorage(thumbnails, projectId, 'thumbnails')
        : []

      const fileUrls = files.length > 0
        ? await uploadFilesToStorage(files, projectId, 'files')
        : []

      const simplifiedNodes = nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        description: node.data.description,
        icon: nodeIconOptions.find((opt) => opt.icon === node.data.icon)?.value,
        position: node.position,
      }))

      const { error } = await supabase.from('projects').insert([
        {
          id: projectId,
          title,
          description,
          thumbnails: thumbnailUrls,
          files: fileUrls,
          icons,
          flow_diagram: { nodes: simplifiedNodes, edges },
          product_option: productOption,
          iframe_link: iframeLink,
          youtube_link: youtubeLink,
        },
      ])

      if (error) throw error

      alert('Showcase project published successfully!')
      router.push('/admin/projects')
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-slate-350">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/projects')}
          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Write New Showcase Project
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
            submitButtonText="Publish Project"
          />
        </div>
      </form>
    </div>
  )
}

export default function CreateProjectPage() {
  return (
    <ReactFlowProvider>
      <CreateProjectPageContent />
    </ReactFlowProvider>
  )
}
