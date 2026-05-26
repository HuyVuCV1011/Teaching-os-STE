'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import NextImage from 'next/image'
import Select, { SingleValue } from 'react-select'
import ReactFlow, {
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  MarkerType,
  Connection,
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
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
  Save,
  Briefcase,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomNode } from '@/components/ui/FlowDiagram'
import RichTextEditor from '@/components/RichTextEditor'

interface IconOption {
  value: string
  label: string
  icon: string
}

interface NodeTypeOption {
  value: string
  label: string
}

interface NodeIconOption {
  readonly value: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

interface ProductOption {
  value: string
  label: string
}

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

export default function EditProjectPage() {
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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [nodeConfig, setNodeConfig] = useState({
    id: '',
    type: 'source',
    label: '',
    description: '',
    icon: 'FileSpreadsheet',
  })
  const [loading, setLoading] = useState(true)

  const iconOptions: IconOption[] = [
    { value: 'power-bi', label: 'Power BI', icon: '/images/tools/power-bi.svg' },
    { value: 'excel', label: 'Excel', icon: '/images/tools/excel.svg' },
    { value: 'python', label: 'Python', icon: '/images/tools/python.svg' },
  ]

  const nodeTypeOptions: NodeTypeOption[] = [
    { value: 'source', label: 'Source' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'actor', label: 'Actor' },
    { value: 'decision', label: 'Decision' },
    { value: 'action', label: 'Action' },
  ]

  const nodeIconOptions: NodeIconOption[] = [
    { value: 'FileSpreadsheet', label: 'Spreadsheet', icon: FileSpreadsheet },
    { value: 'MailIcon', label: 'Mail', icon: MailIcon },
    { value: 'FolderKanban', label: 'Kanban', icon: FolderKanban },
    { value: 'Database', label: 'Database', icon: Database },
    { value: 'Split', label: 'Split', icon: Split },
    { value: 'UserRound', label: 'User', icon: UserRound },
    { value: 'LayoutDashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'ChartArea', label: 'Chart', icon: ChartArea },
    { value: 'FileText', label: 'Text', icon: FileText },
    { value: 'Shuffle', label: 'Shuffle', icon: Shuffle },
    { value: 'MailCheck', label: 'Mail Check', icon: MailCheck },
  ]

  const productOptions: ProductOption[] = [
    { value: 'student', label: 'Học viên (Student)' },
    { value: 'customer', label: 'Khách hàng (Client)' },
  ]

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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    accept: string
  ) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 2) {
      alert('Bạn chỉ có thể tải lên tối đa 2 tệp.')
      return
    }
    for (const file of selectedFiles) {
      const isImage = accept === 'image/*' && file.type.startsWith('image/')
      const isPdf = accept === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf')
      if (!(isImage || isPdf)) {
        alert(`Loại tệp không hợp lệ.`)
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('Kích thước tệp vượt quá giới hạn 100MB.')
        return
      }
    }
    setter(selectedFiles)
  }

  const uploadFilesToStorage = async (
    files: File[],
    projectId: string,
    bucket: string
  ): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
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

  const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 200, ranksep: 100 })

    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 200, height: 60 }))
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target))
    dagre.layout(dagreGraph)

    return {
      nodes: nodes.map((node) => {
        const { x, y } = dagreGraph.node(node.id)
        return { ...node, position: { x, y } }
      }),
      edges: edges.map((edge) => ({
        ...edge,
        style: { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    }
  }

  const addNode = () => {
    const newNode: Node = {
      id: `node-${nodes.length + 1}`,
      type: 'customNode',
      data: {
        type: nodeConfig.type,
        label: nodeConfig.label || 'Nút Mới',
        description: nodeConfig.description,
        icon: nodeIconOptions.find((opt) => opt.value === nodeConfig.icon)?.icon,
      },
      position: { x: 0, y: 0 },
    }
    const { nodes: layoutedNodes } = getLayoutedElements([...nodes, newNode], edges)
    setNodes(layoutedNodes)
    setNodeConfig({ id: '', type: 'source', label: '', description: '', icon: 'FileSpreadsheet' })
  }

  const updateNode = () => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  type: nodeConfig.type,
                  label: nodeConfig.label,
                  description: nodeConfig.description,
                  icon: nodeIconOptions.find((opt) => opt.value === nodeConfig.icon)?.icon,
                },
              }
            : node
        )
      )
      setSelectedNode(null)
      setNodeConfig({ id: '', type: 'source', label: '', description: '', icon: 'FileSpreadsheet' })
    }
  }

  const deleteNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id))
      setSelectedNode(null)
      setNodeConfig({ id: '', type: 'source', label: '', description: '', icon: 'FileSpreadsheet' })
    }
  }

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  )

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setNodeConfig({
      id: node.id,
      type: node.data.type || 'source',
      label: node.data.label || '',
      description: node.data.description || '',
      icon: nodeIconOptions.find((opt) => opt.icon === node.data.icon)?.value || 'FileSpreadsheet',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
            <Save className="w-5 h-5 text-blue-500" /> Edit Showcase Project
          </h1>
          <p className="text-xs text-slate-500">Configure visual diagrams, files uploads, and details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Metadata Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-850 bg-slate-900/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2">
                Project Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Data Pipeline Integration Showcase"
                className="bg-slate-950 border-slate-800 focus:border-blue-500 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2">
                Detailed Description (Rich HTML editor)
              </label>
              <RichTextEditor content={description} onChange={setDescription} />
            </div>
          </div>

          {/* Flow Diagram Workspace */}
          <div className="border border-slate-850 bg-slate-900/10 rounded-2xl p-6 space-y-4">
            <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider">
              Process Diagram Workspace
            </label>
            <div className="border border-slate-800/80 bg-slate-950 rounded-xl overflow-hidden" style={{ height: '400px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={{ customNode: CustomNode }}
                fitView
              >
                <Controls className="bg-slate-900 border-slate-850 text-slate-400" />
              </ReactFlow>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {selectedNode ? `Node Properties (${selectedNode.id})` : 'Node Configurator'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  placeholder="Label text"
                  value={nodeConfig.label}
                  onChange={(e) => setNodeConfig({ ...nodeConfig, label: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                />
                <input
                  placeholder="Subtext details"
                  value={nodeConfig.description}
                  onChange={(e) => setNodeConfig({ ...nodeConfig, description: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-555 mb-1">Node Type</span>
                  <select
                    value={nodeConfig.type}
                    onChange={(e) => setNodeConfig({ ...nodeConfig, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white"
                  >
                    {nodeTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-555 mb-1">Node Icon</span>
                  <select
                    value={nodeConfig.icon}
                    onChange={(e) => setNodeConfig({ ...nodeConfig, icon: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white"
                  >
                    {nodeIconOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={addNode}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300"
                >
                  Add Node
                </button>
                {selectedNode && (
                  <>
                    <button
                      type="button"
                      onClick={updateNode}
                      className="px-3 py-1.5 rounded bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-xs font-semibold text-blue-400"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={deleteNode}
                      className="px-3 py-1.5 rounded bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-xs font-semibold text-rose-450"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Media Asset Controls */}
        <div className="space-y-6">
          <div className="border border-slate-850 bg-slate-900/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm">Media Attachments</h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                Cover Image Thumbnail (Max 2 for comparison slider)
              </label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, setThumbnails, 'image/*')}
                className="bg-slate-950 border-slate-800 text-slate-400 file:bg-blue-600/10 file:text-blue-400 file:border-0 hover:file:bg-blue-600/20 text-xs file:py-1 file:px-2.5 file:rounded"
              />
              {existingThumbnails.length > 0 && (
                <div className="text-[10px] text-slate-500 mt-1.5">
                  Currently uploaded: {existingThumbnails.length} image(s). Uploading new images will replace them.
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                PDF Document (Max 2 for slider comparison)
              </label>
              <Input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => handleFileChange(e, setFiles, 'application/pdf')}
                className="bg-slate-950 border-slate-800 text-slate-400 file:bg-blue-600/10 file:text-blue-400 file:border-0 hover:file:bg-blue-600/20 text-xs file:py-1 file:px-2.5 file:rounded"
              />
              {existingFiles.length > 0 && (
                <div className="text-[10px] text-slate-500 mt-1.5">
                  Currently uploaded: {existingFiles.length} PDF(s). Uploading new files will replace them.
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-850 bg-slate-900/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm">Links & Taxonomy</h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                Target Category
              </label>
              <select
                required
                value={productOption || ''}
                onChange={(e) => setProductOption(e.target.value || null)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
              >
                <option value="">Select category</option>
                <option value="student">Student Project</option>
                <option value="customer">Client Showcase</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                Interactive Iframe Link
              </label>
              <Input
                value={iframeLink || ''}
                onChange={(e) => setIframeLink(e.target.value || null)}
                placeholder="https://app.powerbi.com/view..."
                className="bg-slate-950 border-slate-800 text-xs text-white"
                type="url"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                YouTube Embed URL
              </label>
              <Input
                value={youtubeLink || ''}
                onChange={(e) => setYoutubeLink(e.target.value || null)}
                placeholder="https://www.youtube.com/embed/..."
                className="bg-slate-950 border-slate-800 text-xs text-white"
                type="url"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                Technology Icons
              </label>
              <Select
                isMulti
                options={iconOptions}
                value={iconOptions.filter((opt) => icons.includes(opt.value))}
                onChange={(selected) => setIcons(selected.map((opt) => opt.value))}
                formatOptionLabel={(option) => (
                  <div className="flex items-center gap-2 text-xs">
                    <NextImage src={option.icon} alt={option.label} width={16} height={16} className="w-4 h-4" />
                    <span>{option.label}</span>
                  </div>
                )}
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: 'rgb(2, 6, 23)',
                    borderColor: 'rgb(30, 41, 59)',
                    color: 'white',
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: 'rgb(2, 6, 23)',
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? 'rgb(30, 41, 59)' : 'transparent',
                    color: 'white',
                  }),
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-500/10 animate-pulse"
            >
              Update Project Showcase
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
