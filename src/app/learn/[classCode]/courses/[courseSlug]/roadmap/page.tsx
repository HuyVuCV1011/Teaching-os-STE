'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactFlow, {
  Handle,
  Position,
  Node,
  Edge,
  MarkerType,
} from 'reactflow'
import dagre from 'dagre'
import { supabase } from '@/lib/supabase'
import { Lock, Unlock, Loader2, ArrowLeft } from 'lucide-react'
import 'reactflow/dist/style.css'

interface LessonNodeData {
  title: string
  isLocked: boolean
  onClick: () => void
  orderIndex: string
  visibleAfter: string | null
}

// Custom Lesson Node Component for ReactFlow
function CustomLessonNode({ data }: { data: LessonNodeData }) {
  return (
    <div
      onClick={data.isLocked ? undefined : data.onClick}
      className={`px-4 py-3.5 rounded-xl border backdrop-blur-md transition-all duration-200 text-left min-w-[200px] shadow-lg ${
        data.isLocked
          ? 'bg-slate-900/40 border-slate-900/60 text-slate-500 cursor-not-allowed opacity-60'
          : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-blue-500 cursor-pointer hover:shadow-blue-500/5'
      }`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <span className="block text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest">
            Lesson {data.orderIndex}
          </span>
          <span className="block text-xs font-bold leading-relaxed pr-2 truncate max-w-[150px]">
            {data.title}
          </span>
          {data.isLocked && data.visibleAfter && (
            <span className="block text-[8px] text-amber-500 font-medium mt-1">
              Unlocks: {new Date(data.visibleAfter).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="shrink-0 mt-0.5">
          {data.isLocked ? (
            <Lock className="w-3.5 h-3.5 text-slate-600" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
}

const nodeTypes = {
  lessonNode: CustomLessonNode,
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 70, ranksep: 100 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 70 })
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
        x: nodeWithPosition.x - 110,
        y: nodeWithPosition.y - 35,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

interface RoadmapProps {
  params: Promise<{
    classCode: string
    courseSlug: string
  }>
}

export default function CourseRoadmap({ params }: RoadmapProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const courseSlug = resolvedParams.courseSlug
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [courseTitle, setCourseTitle] = useState('')
  const [syllabusNodes, setSyllabusNodes] = useState<Node[]>([])
  const [syllabusEdges, setSyllabusEdges] = useState<Edge[]>([])

  useEffect(() => {
    async function loadRoadmap() {
      try {
        // 1. Fetch Class ID matching code
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('class_code', classCode.toUpperCase())
          .single()

        if (classError || !classData) throw classError

        // 2. Fetch Course matching slug
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title')
          .eq('slug', courseSlug.toLowerCase())
          .single()

        if (courseError || !courseData) throw courseError
        setCourseTitle(courseData.title)

        // 3. Fetch Syllabus (Modules and Lessons) for this course
        const { data: modulesData } = await supabase
          .from('modules')
          .select('*, lessons(*)')
          .eq('course_id', courseData.id)
          .order('order_index')

        // 4. Fetch Class Schedules release times
        const { data: schedulesData } = await supabase
          .from('class_schedules')
          .select('*')
          .eq('class_id', classData.id)

        const scheduleMap = new Map<string, any>()
        schedulesData?.forEach((sched) => {
          scheduleMap.set(sched.lesson_id, sched)
        })

        const rawNodes: Node[] = []
        const rawEdges: Edge[] = []
        const now = new Date()

        let prevNodeId: string | null = null

        // 5. Map modules and lessons to visual flow nodes
        modulesData?.forEach((mod: any) => {
          const lessons = mod.lessons || []
          lessons.sort((a: any, b: any) => a.order_index - b.order_index)

          lessons.forEach((lesson: any) => {
            const schedule = scheduleMap.get(lesson.id)
            const visibleAfterStr = schedule?.visible_after
            
            // Release Gate: Lock if visible_after is in future OR is NULL
            let isLocked = true
            if (visibleAfterStr) {
              const unlockTime = new Date(visibleAfterStr)
              if (unlockTime <= now) {
                isLocked = false
              }
            }

            const nodeId = `lesson-${lesson.id}`
            rawNodes.push({
              id: nodeId,
              type: 'lessonNode',
              data: {
                title: lesson.title,
                isLocked,
                visibleAfter: visibleAfterStr,
                orderIndex: `${mod.order_index}.${lesson.order_index}`,
                onClick: () => {
                  router.push(`/learn/${classCode}/courses/${courseSlug}/lessons/${lesson.id}`)
                },
              },
              position: { x: 0, y: 0 },
            })

            // Draw directional connection edges
            if (prevNodeId) {
              rawEdges.push({
                id: `edge-${prevNodeId}-${nodeId}`,
                source: prevNodeId,
                target: nodeId,
                animated: !isLocked,
                style: { stroke: isLocked ? '#334155' : '#3b82f6', strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: isLocked ? '#334155' : '#3b82f6',
                },
              })
            }

            prevNodeId = nodeId
          })
        })

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          rawNodes,
          rawEdges
        )

        setSyllabusNodes(layoutedNodes)
        setSyllabusEdges(layoutedEdges)
      } catch (err) {
        console.error('Failed to parse syllabus tree:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRoadmap()
  }, [classCode, courseSlug, router])

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/learn/${classCode}/dashboard`}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold">Course Roadmap</span>
          <h1 className="text-2xl font-bold text-white mt-0.5">{courseTitle || 'Loading...'}</h1>
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/50 backdrop-blur-xl overflow-hidden relative shadow-2xl">
        {loading ? (
          <div className="absolute inset-0 flex flex-col justify-center items-center gap-4 text-slate-400 bg-slate-950/80 z-30">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm">Synthesizing learning path...</span>
          </div>
        ) : syllabusNodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            Roadmap is empty. No lessons mapped to this course yet.
          </div>
        ) : (
          <ReactFlow
            nodes={syllabusNodes}
            edges={syllabusEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesConnectable={false}
            nodesDraggable={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            panOnDrag={true}
          />
        )}
      </div>
    </div>
  )
}
