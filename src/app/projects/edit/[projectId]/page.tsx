'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Blockquote from '@tiptap/extension-blockquote'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Select, { SingleValue } from 'react-select'
import { useRouter, useParams } from 'next/navigation'
import NextImage from 'next/image'
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
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading,
  Table2,
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
  Quote,
} from 'lucide-react'
import { CustomNode } from '@/components/ui/FlowDiagram'

interface IconOption {
  value: string
  label: string
  icon: string
}

interface HeadingOption {
  value: string
  label: string
}

interface TableOption {
  value: string
  label: string
  disabled?: boolean
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

const EditProjectPage = () => {
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
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const iconOptions: IconOption[] = [
    {
      value: 'power-bi',
      label: 'Power BI',
      icon: '/images/tools/power-bi.svg',
    },
    { value: 'excel', label: 'Excel', icon: '/images/tools/excel.svg' },
    { value: 'python', label: 'Python', icon: '/images/tools/python.svg' },
  ]

  const headingOptions: HeadingOption[] = [
    { value: 'paragraph', label: 'Văn bản' },
    { value: 'h1', label: 'Tiêu đề 1' },
    { value: 'h2', label: 'Tiêu đề 2' },
    { value: 'h3', label: 'Tiêu đề 3' },
    { value: 'h4', label: 'Tiêu đề 4' },
    { value: 'h5', label: 'Tiêu đề 5' },
    { value: 'h6', label: 'Tiêu đề 6' },
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
    { value: 'student', label: 'Học viên' },
    { value: 'customer', label: 'Khách hàng' },
  ]

  // Fetch project data
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
          console.error('Error fetching project:', error)
          alert('Không thể tải dự án')
          router.push('/projects')
          return
        }

        if (data) {
          setTitle(data.title || '')
          setDescription(data.description || '')
          setExistingThumbnails(
            Array.isArray(data.thumbnails) ? data.thumbnails : []
          )
          setExistingFiles(Array.isArray(data.files) ? data.files : [])
          setIcons(Array.isArray(data.icons) ? data.icons : [])
          setProductOption(data.product_option || null)
          setIframeLink(data.iframe_link || null)
          setYoutubeLink(data.youtube_link || null)

          if (data.flow_diagram) {
            const fetchedNodes = (data.flow_diagram.nodes || []).map(
              (node: FlowNode) => ({
                id: node.id,
                type: 'customNode',
                data: {
                  type: node.type,
                  label: node.label,
                  description: node.description,
                  icon: nodeIconOptions.find((opt) => opt.value === node.icon)
                    ?.icon,
                },
                position: node.position || { x: 0, y: 0 },
              })
            )
            const fetchedEdges = (data.flow_diagram.edges || []).map(
              (edge: FlowEdge) => ({
                ...edge,
                style: { strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed },
              })
            )
            const { nodes: layoutedNodes, edges: layoutedEdges } =
              getLayoutedElements(fetchedNodes, fetchedEdges)
            setNodes(layoutedNodes)
            setEdges(layoutedEdges)
          }
        }
      } catch (error) {
        console.error('Fetch error:', error)
        alert('Lỗi khi tải dự án')
        router.push('/projects')
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  // TipTap editor configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: 'list-disc pl-6' },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: 'list-decimal pl-6' },
        },
        code: { HTMLAttributes: { class: 'bg-gray-100 rounded p-1' } },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: { class: 'editor-heading' },
        },
      }),
      Underline.configure({}),
      Strike.configure({}),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'max-w-full h-auto' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image', 'blockquote'],
        alignments: ['left', 'center', 'right'],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border border-gray-300 w-full max-w-full table-auto',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: { class: 'bg-gray-100 font-semibold' },
      }),
      TableCell.configure({
        HTMLAttributes: { class: 'border border-gray-300 p-2' },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 italic',
        },
      }),
    ],
    content: description,
    onUpdate: ({ editor }) => {
      setDescription(editor.getHTML())
    },
  })

  // Update editor content when description changes
  useEffect(() => {
    if (editor && description) {
      editor.commands.setContent(description)
    }
  }, [editor, description])

  // Table actions for dropdown
  const tableOptions: TableOption[] = [
    { value: 'insertTable', label: 'Chèn bảng' },
    {
      value: 'addRowBefore',
      label: 'Thêm dòng trước',
      disabled: editor ? !editor.can().addRowBefore() : true,
    },
    {
      value: 'addRowAfter',
      label: 'Thêm dòng sau',
      disabled: editor ? !editor.can().addRowAfter() : true,
    },
    {
      value: 'addColumnBefore',
      label: 'Thêm cột trước',
      disabled: editor ? !editor.can().addColumnBefore() : true,
    },
    {
      value: 'addColumnAfter',
      label: 'Thêm cột sau',
      disabled: editor ? !editor.can().addColumnAfter() : true,
    },
    {
      value: 'deleteRow',
      label: 'Xóa dòng',
      disabled: editor ? !editor.can().deleteRow() : true,
    },
    {
      value: 'deleteColumn',
      label: 'Xóa cột',
      disabled: editor ? !editor.can().deleteColumn() : true,
    },
    {
      value: 'mergeCells',
      label: 'Gộp ô',
      disabled: editor ? !editor.can().mergeCells() : true,
    },
    {
      value: 'splitCell',
      label: 'Tách ô',
      disabled: editor ? !editor.can().splitCell() : true,
    },
  ]

  // Handle table action selection
  const handleTableAction = (selected: SingleValue<TableOption>) => {
    if (editor && selected) {
      switch (selected.value) {
        case 'insertTable':
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
          break
        case 'addRowBefore':
          editor.chain().focus().addRowBefore().run()
          break
        case 'addRowAfter':
          editor.chain().focus().addRowAfter().run()
          break
        case 'addColumnBefore':
          editor.chain().focus().addColumnBefore().run()
          break
        case 'addColumnAfter':
          editor.chain().focus().addColumnAfter().run()
          break
        case 'deleteRow':
          editor.chain().focus().deleteRow().run()
          break
        case 'deleteColumn':
          editor.chain().focus().deleteColumn().run()
          break
        case 'mergeCells':
          editor.chain().focus().mergeCells().run()
          break
        case 'splitCell':
          editor.chain().focus().splitCell().run()
          break
      }
    }
  }

  // Debug editor
  useEffect(() => {
    if (editor) {
      console.log('Editor initialized:', editor)
      console.log('Initial HTML:', editor.getHTML())
      editor.on('update', () => {
        console.log('Editor updated HTML:', editor.getHTML())
      })
    }
  }, [editor])

  // Handle image upload for editor
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && editor) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          editor
            .chain()
            .focus()
            .setImage({ src: event.target.result as string })
            .run()
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle heading change
  const handleHeadingChange = (selected: SingleValue<HeadingOption>) => {
    if (editor && selected) {
      if (selected.value === 'paragraph') {
        editor.chain().focus().setParagraph().run()
      } else {
        const level = parseInt(selected.value.replace('h', '')) as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6
        editor.chain().focus().toggleHeading({ level }).run()
      }
    }
  }

  // Handle product option change
  const handleProductOptionChange = (selected: SingleValue<ProductOption>) => {
    setProductOption(selected?.value || null)
  }

  // Handle iframe link change with validation
  const handleIframeLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      try {
        new URL(value)
        setIframeLink(value)
      } catch {
        alert(
          'Link iframe không hợp lệ. Vui lòng nhập URL hợp lệ (bắt đầu bằng http:// hoặc https://).'
        )
        setIframeLink(null)
      }
    } else {
      setIframeLink(null)
    }
  }

  // Handle YouTube link change with validation
  const handleYoutubeLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      if (value.match(/^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]+$/)) {
        setYoutubeLink(value)
      } else {
        alert(
          'Link YouTube không hợp lệ. Vui lòng sử dụng định dạng https://www.youtube.com/embed/video_id'
        )
        setYoutubeLink(null)
      }
    } else {
      setYoutubeLink(null)
    }
  }

  // Handle file change with validation
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
      const isPdf =
        accept === 'application/pdf' &&
        (file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf'))
      if (!(isImage || isPdf)) {
        alert(
          `Loại tệp không hợp lệ. Vui lòng tải lên tệp ${
            accept === 'image/*' ? 'hình ảnh' : 'PDF'
          }.`
        )
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('Kích thước tệp vượt quá giới hạn 100MB.')
        return
      }
    }
    setter(selectedFiles)
  }

  // Upload multiple files to Supabase Storage and return array of URLs
  const uploadFilesToStorage = async (
    files: File[],
    projectId: string,
    bucket: string,
    accept: string
  ): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const isImage = accept === 'image/*' && file.type.startsWith('image/')
      const isPdf =
        accept === 'application/pdf' &&
        (file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf'))
      if (!(isImage || isPdf)) {
        throw new Error(
          `Invalid file type for ${bucket}. Expected ${
            accept === 'image/*' ? 'image' : 'PDF'
          }.`
        )
      }
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('File size exceeds 100MB limit.')
      }
      const fileName = `${projectId}/${Date.now()}-${file.name}`
      console.log('Attempting upload:', {
        fileName,
        bucket,
        projectId,
        fileType: file.type,
        fileSize: file.size,
      })
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false })
      if (uploadError) {
        console.error('Supabase upload error:', {
          message: uploadError.message,
          bucket,
          fileName,
          details: uploadError,
        })
        throw new Error(`Failed to upload to ${bucket}: ${uploadError.message}`)
      }
      console.log('Upload successful:', { fileName, bucket, uploadData })
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)
      console.log('Public URL:', publicUrlData.publicUrl)
      urls.push(publicUrlData.publicUrl)
    }
    return urls
  }

  // Delete files from Supabase Storage
  const deleteFilesFromStorage = async (urls: string[], bucket: string) => {
    const paths = urls
      .map((url) => {
        const urlObj = new URL(url)
        const path = urlObj.pathname.split('/').slice(4).join('/')
        return path
      })
      .filter(Boolean)
    if (paths.length > 0) {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) {
        console.error('Error deleting files:', error)
        throw new Error(
          `Failed to delete files from ${bucket}: ${error.message}`
        )
      }
    }
  }

  // FlowDiagram layout
  const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({
      rankdir: 'LR',
      nodesep: 200,
      ranksep: 100,
    })

    nodes.forEach((node) =>
      dagreGraph.setNode(node.id, { width: 200, height: 60 })
    )
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

  // Add new node
  const addNode = () => {
    const newNode: Node = {
      id: `node-${nodes.length + 1}`,
      type: 'customNode',
      data: {
        type: nodeConfig.type,
        label: nodeConfig.label || 'Nút Mới',
        description: nodeConfig.description,
        icon: nodeIconOptions.find((opt) => opt.value === nodeConfig.icon)
          ?.icon,
      },
      position: { x: 0, y: 0 },
    }
    const { nodes: layoutedNodes } = getLayoutedElements(
      [...nodes, newNode],
      edges
    )
    setNodes(layoutedNodes)
    setNodeConfig({
      id: '',
      type: 'source',
      label: '',
      description: '',
      icon: 'FileSpreadsheet',
    })
  }

  // Update node
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
                  icon: nodeIconOptions.find(
                    (opt) => opt.value === nodeConfig.icon
                  )?.icon,
                },
              }
            : node
        )
      )
      setSelectedNode(null)
      setNodeConfig({
        id: '',
        type: 'source',
        label: '',
        description: '',
        icon: 'FileSpreadsheet',
      })
    }
  }

  // Delete node
  const deleteNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      )
      setSelectedNode(null)
      setNodeConfig({
        id: '',
        type: 'source',
        label: '',
        description: '',
        icon: 'FileSpreadsheet',
      })
    }
  }

  // Connect nodes
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)
      ),
    [setEdges]
  )

  // Node click handler
  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setNodeConfig({
      id: node.id,
      type: node.data.type || 'source',
      label: node.data.label || '',
      description: node.data.description || '',
      icon:
        nodeIconOptions.find((opt) => opt.icon === node.data.icon)?.value ||
        'FileSpreadsheet',
    })
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Starting update:', {
      projectId,
      title,
      productOption,
      iframeLink,
      youtubeLink,
    })

    try {
      // Delete old files if new ones are uploaded
      if (thumbnails.length > 0 && existingThumbnails.length > 0) {
        await deleteFilesFromStorage(existingThumbnails, 'thumbnails')
      }
      if (files.length > 0 && existingFiles.length > 0) {
        await deleteFilesFromStorage(existingFiles, 'files')
      }

      // Upload new thumbnails
      const thumbnailUrls =
        thumbnails.length > 0
          ? await uploadFilesToStorage(
              thumbnails,
              projectId,
              'thumbnails',
              'image/*'
            )
          : existingThumbnails

      // Upload new PDFs
      const fileUrls =
        files.length > 0
          ? await uploadFilesToStorage(
              files,
              projectId,
              'files',
              'application/pdf'
            )
          : existingFiles

      // Simplify nodes for storage
      const simplifiedNodes = nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        description: node.data.description,
        icon: nodeIconOptions.find((opt) => opt.icon === node.data.icon)?.value,
        position: node.position,
      }))

      // Update project
      const { data, error } = await supabase
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

      if (error) {
        console.error('Supabase update error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw new Error(`Không thể cập nhật dự án: ${error.message}`)
      }

      console.log('Project updated:', data)
      router.push(`/projects/${projectId}`)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : JSON.stringify(error) || 'Lỗi không xác định'
      console.error('Submission error:', { message: errorMessage, error })
      alert(`Cập nhật thất bại: ${errorMessage}`)
    }
  }

  if (loading) {
    return <div>Đang tải dự án...</div>
  }

  if (!editor) {
    return <div>Đang tải trình chỉnh sửa...</div>
  }

  return (
    <div className="container py-10 md-py-16 mt-28">
      <h1 className="text-3xl font-bold mb-6">Chỉnh sửa Dự Án</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-lg font-medium mb-2">
            Tiêu đề
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề dự án"
            required
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-lg font-medium mb-2"
          >
            Mô tả
          </label>
          <div className="border p-2 rounded mb-2">
            <div className="flex gap-2 mb-2 flex-wrap items-center">
              <Select
                options={headingOptions}
                onChange={handleHeadingChange}
                placeholder={<Heading className="h-4 w-4 inline-block mr-2" />}
                className="w-40"
                classNamePrefix="select"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'bg-gray-200' : ''}
                title="Đậm"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'bg-gray-200' : ''}
                title="Nghiêng"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={editor.isActive('underline') ? 'bg-gray-200' : ''}
                title="Gạch chân"
                disabled={!editor.can().toggleUnderline()}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'bg-gray-200' : ''}
                title="Gạch ngang"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={editor.isActive('code') ? 'bg-gray-200' : ''}
                title="Mã"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
                title="Danh sách"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
                title="Trích dẫn"
              >
                <Quote className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  editor.chain().focus().setTextAlign('left').run()
                }
                className={
                  editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''
                }
                title="Căn trái"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  editor.chain().focus().setTextAlign('center').run()
                }
                className={
                  editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''
                }
                title="Căn giữa"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  editor.chain().focus().setTextAlign('right').run()
                }
                className={
                  editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''
                }
                title="Căn phải"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Chèn ảnh"
              >
                <label htmlFor="image-upload" className="cursor-pointer">
                  <ImageIcon className="h-4 w-4" />
                </label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </Button>
              <Select
                options={tableOptions}
                onChange={handleTableAction}
                placeholder={<Table2 className="h-4 w-4 inline-block mr-2" />}
                className="w-40"
                classNamePrefix="select"
                isOptionDisabled={(option) => !!option.disabled}
              />
            </div>
            <EditorContent editor={editor} />
          </div>
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">Luồng xử lý</label>
          <div className="border p-4 rounded mb-2" style={{ height: '500px' }}>
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
              <Controls />
            </ReactFlow>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Cấu hình nút</h3>
            <Input
              placeholder="Tên nút"
              value={nodeConfig.label}
              onChange={(e) =>
                setNodeConfig({ ...nodeConfig, label: e.target.value })
              }
            />
            <Input
              placeholder="Mô tả nút"
              value={nodeConfig.description}
              onChange={(e) =>
                setNodeConfig({ ...nodeConfig, description: e.target.value })
              }
            />
            <Select
              options={nodeTypeOptions}
              value={nodeTypeOptions.find(
                (opt) => opt.value === nodeConfig.type
              )}
              onChange={(selected) =>
                setNodeConfig({
                  ...nodeConfig,
                  type: selected?.value || 'source',
                })
              }
              placeholder="Kiểu nút"
            />
            <Select
              options={nodeIconOptions}
              value={nodeIconOptions.find(
                (opt) => opt.value === nodeConfig.icon
              )}
              onChange={(selected) =>
                setNodeConfig({
                  ...nodeConfig,
                  icon: selected?.value || 'FileSpreadsheet',
                })
              }
              formatOptionLabel={(option) => (
                <div className="flex items-center gap-2">
                  <option.icon size={16} />
                  <span>{option.label}</span>
                </div>
              )}
              placeholder="Biểu tượng nút"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={addNode}>
                Thêm Nút
              </Button>
              {selectedNode && (
                <>
                  <Button type="button" onClick={updateNode}>
                    Cập nhật Nút
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={deleteNode}
                  >
                    Xóa Nút
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">
            Hình thu nhỏ (tối đa 2)
          </label>
          {existingThumbnails.length > 0 && (
            <div className="mb-2">
              <h4 className="text-sm font-medium">Hình hiện tại:</h4>
              <ul className="mt-1 list-disc pl-5">
                {existingThumbnails.map((url, index) => (
                  <li key={index} className="text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Hình {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e, setThumbnails, 'image/*')}
          />
          {thumbnails.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {thumbnails.map((file, index) => (
                <li key={index} className="text-sm">
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">
            Tệp PDF (tối đa 2)
          </label>
          {existingFiles.length > 0 && (
            <div className="mb-2">
              <h4 className="text-sm font-medium">Tệp hiện tại:</h4>
              <ul className="mt-1 list-disc pl-5">
                {existingFiles.map((url, index) => (
                  <li key={index} className="text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Tệp PDF {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => handleFileChange(e, setFiles, 'application/pdf')}
          />
          {files.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {files.map((file, index) => (
                <li key={index} className="text-sm">
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">Công nghệ</label>
          <Select
            isMulti
            options={iconOptions}
            value={iconOptions.filter((opt) => icons.includes(opt.value))}
            onChange={(selected) => setIcons(selected.map((opt) => opt.value))}
            formatOptionLabel={(option) => (
              <div className="flex items-center gap-2">
                <NextImage
                  src={option.icon}
                  alt={option.label}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span>{option.label}</span>
              </div>
            )}
            className="basic-multi-select"
            classNamePrefix="select"
          />
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">Danh mục</label>
          <Select
            options={productOptions}
            value={productOptions.find((opt) => opt.value === productOption)}
            onChange={handleProductOptionChange}
            placeholder="Chọn danh mục"
            className="basic-single-select"
            classNamePrefix="select"
          />
        </div>

        <div>
          <label
            htmlFor="iframeLink"
            className="block text-lg font-medium mb-2"
          >
            Link Iframe Dashboard
          </label>
          <Input
            id="iframeLink"
            value={iframeLink || ''}
            onChange={handleIframeLinkChange}
            placeholder="Nhập link iframe của Dashboard"
            type="url"
          />
        </div>

        <div>
          <label
            htmlFor="youtubeLink"
            className="block text-lg font-medium mb-2"
          >
            Video YouTube
          </label>
          <Input
            id="youtubeLink"
            value={youtubeLink || ''}
            onChange={handleYoutubeLinkChange}
            placeholder="Nhập link YouTube (e.g., https://www.youtube.com/embed/video_id)"
            type="url"
          />
        </div>

        <Button type="submit" className="w-full">
          Cập nhật dự án
        </Button>
      </form>
    </div>
  )
}

export default EditProjectPage
