'use client'

import React, { useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  MarkerType,
  Controls,
  Background,
  Handle,
  Position
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import { X, Award } from 'lucide-react'

// Custom Nodes - Light Theme Clean Style
type CourseNodeData = {
  title: string
}

type ModuleNodeData = {
  title: string
  orderIndex: number
}

type LessonNodeData = {
  title: string
  orderIndex: string
  status: 'draft' | 'published'
}

interface LessonRow {
  id: string
  title: string
  order_index: number
  metadata?: {
    status?: 'draft' | 'published'
  } | null
}

interface ModuleRow {
  id: string
  title: string
  order_index: number
  lessons?: LessonRow[] | null
}

function CourseNode({ data }: { data: CourseNodeData }) {
  return (
    <div className="px-5 py-3 rounded-2xl border-2 border-blue-600 bg-white shadow-md text-center min-w-[200px]">
      <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest font-mono">Course</span>
      <span className="block text-sm font-extrabold text-slate-800 mt-1 leading-tight">{data.title}</span>
    </div>
  )
}

function ModuleNode({ data }: { data: ModuleNodeData }) {
  return (
    <div className="px-4 py-3 rounded-xl border border-indigo-500 bg-indigo-50/10 shadow-sm text-left min-w-[180px]">
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-widest font-mono">Module {data.orderIndex}</span>
      <span className="block text-xs font-bold text-slate-800 mt-0.5 truncate max-w-[150px]">{data.title}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

function LessonNode({ data }: { data: LessonNodeData }) {
  const isDraft = data.status === 'draft'
  return (
    <div className={`px-4 py-3 rounded-lg border shadow-sm text-left min-w-[160px] transition-all ${
      isDraft 
        ? 'border-amber-300 bg-amber-50/20 text-slate-500 opacity-80' 
        : 'border-slate-250 bg-white text-slate-700 hover:border-blue-500/50'
    }`}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-0.5">
          <span className="block text-[8px] font-bold text-slate-400 font-mono">LESSON {data.orderIndex}</span>
          <span className="block text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]" title={data.title}>
            {data.title}
          </span>
        </div>
        <span className={`text-[7px] font-bold uppercase px-1 py-0.5 rounded border leading-none ${
          isDraft ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-emerald-100 border-emerald-200 text-emerald-750'
        }`}>
          {isDraft ? 'Draft' : 'Live'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = {
  courseNode: CourseNode,
  moduleNode: ModuleNode,
  lessonNode: LessonNode
}

const nodeWidth = 220
const nodeHeight = 80

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

interface SyllabusRoadmapVisualizerProps {
  courseTitle: string
  courseModules: ModuleRow[]
  onClose: () => void
}

export function SyllabusRoadmapVisualizer({
  courseTitle,
  courseModules,
  onClose
}: SyllabusRoadmapVisualizerProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    // 1. Build initial flat nodes and edges
    const tempNodes: Node[] = [
      {
        id: 'course-root',
        type: 'courseNode',
        data: { title: courseTitle },
        position: { x: 0, y: 0 }
      }
    ]
    const tempEdges: Edge[] = []

    courseModules.forEach((mod) => {
      const modNodeId = `mod-${mod.id}`
      // Add Module Node
      tempNodes.push({
        id: modNodeId,
        type: 'moduleNode',
        data: { title: mod.title, orderIndex: mod.order_index },
        position: { x: 0, y: 0 }
      })

      // Link Course -> Module
      tempEdges.push({
        id: `edge-c-m-${mod.id}`,
        source: 'course-root',
        target: modNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
      })

      const lessons = mod.lessons || []
      lessons.forEach((lesson) => {
        const lesNodeId = `les-${lesson.id}`
        const isDraft = lesson.metadata?.status === 'draft'
        // Add Lesson Node
        tempNodes.push({
          id: lesNodeId,
          type: 'lessonNode',
          data: { 
            title: lesson.title, 
            orderIndex: `${mod.order_index}.${lesson.order_index}`,
            status: isDraft ? 'draft' : 'published' 
          },
          position: { x: 0, y: 0 }
        })

        // Link Module -> Lesson
        tempEdges.push({
          id: `edge-m-l-${lesson.id}`,
          source: modNodeId,
          target: lesNodeId,
          type: 'smoothstep',
          style: { stroke: isDraft ? '#cbd5e1' : '#6366f1', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: isDraft ? '#cbd5e1' : '#6366f1' }
        })
      })
    })

    // 2. Perform Dagre Layout
    const layout = getLayoutedElements(tempNodes, tempEdges)
    setNodes(layout.nodes)
    setEdges(layout.edges)
  }, [courseTitle, courseModules])

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-6xl h-[85vh] flex flex-col justify-between rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Syllabus Roadmap Visualizer
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 font-mono uppercase tracking-wider">
                Course: {courseTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center shadow-sm"
            title="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Map Canvas body */}
        <div className="flex-1 bg-slate-50 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Controls className="!bg-white !border-slate-200 !shadow-md !rounded-lg" />
            <Background color="#cbd5e1" gap={16} size={1} />
          </ReactFlow>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50 text-xs text-slate-500 font-medium">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-white" /> Root Course
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-indigo-500 bg-indigo-50/15" /> Modules
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-slate-200 bg-white" /> Published Lessons
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border border-amber-300 bg-amber-50/15" /> Draft Lessons (Hidden from Students)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  )
}
