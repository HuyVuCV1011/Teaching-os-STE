'use client'

import React, { useEffect, useState } from 'react'
import ReactFlow, {
  Controls,
  Handle,
  MarkerType,
  NodeMouseHandler,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'

// 🎨 Custom Node Component
export interface CustomNodeProps {
  data: {
    type: string
    id?: string
    icon?: React.ComponentType<{ size: number; strokeWidth: number }>
    label: string
    description?: string
    color?: string
    isParent?: boolean
    clickable?: boolean
    image?: string
  }
}

export const CustomNode: React.FC<CustomNodeProps> = ({ data }) => {
  const Icon = data.icon
  return (
    <div style={{ textAlign: 'center' }}>
      {data.type === 'source' ? (
        <div className="flex flex-col rounded-lg shadow-xl max-w-[240px] bg-slate-400 text-white overflow-hidden text-left">
          <div className="flex items-center gap-3 p-3 border-b border-white">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center relative flex-shrink-0 text-slate-400">
              {Icon && <Icon size={24} strokeWidth={1.5} />}
            </div>
            <h4 className="text-sm font-semibold">{data.label}</h4>
          </div>
          <div className="bg-slate-500 px-3 py-2">
            <p className="text-xs ">{data.description}</p>
          </div>
          <Handle type="target" position={Position.Left} />
          <Handle type="source" position={Position.Right} />
        </div>
      ) : data.type === 'dashboard' ? (
        <div className="flex flex-col gap-2 p-3 max-w-[360px] bg-white shadow-xl rounded-lg border-t-4 border-slate-400 text-left relative">
          <div className="flex items-center gap-3">
            {Icon && <Icon size={16} strokeWidth={1.5} />}
            <h4 className="font-semibold">{data.label}</h4>
          </div>
          <figure className="border rounded-md overflow-hidden">
            <img src={data.image} alt={data.label} />
          </figure>
          <Handle type="target" position={Position.Left} />
          <Handle type="source" position={Position.Right} />
        </div>
      ) : data.type === 'actor' ? (
        <div className="flex items-center flex-col gap-2 max-w-[220px]">
          <div className="w-24 h-24 border-4 shadow-xl border-white bg-gray-200 rounded-full flex items-center justify-center relative">
            {Icon && <Icon size={36} strokeWidth={1.5} />}
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
          </div>
          <h4 className="font-semibold">{data.label}</h4>
          <p className="text-sm text-gray-500">{data.description}</p>
        </div>
      ) : data.type === 'decision' ? (
        <div className="flex items-center flex-col gap-2 max-w-[220px]">
          <div className="relative w-32 h-32">
            <div className="absolute w-24 h-24 bg-white shadow-xl border-4 border-gray-200 transform rotate-45 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
              <div className="transform -rotate-45">
                {Icon && <Icon size={36} strokeWidth={1.5} />}
              </div>
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
          </div>
          <h4 className="font-semibold">{data.label}</h4>
          <p className="text-sm text-gray-500">{data.description}</p>
        </div>
      ) : data.type === 'action' ? (
        <div className="flex items-center flex-col gap-2 max-w-[220px]">
          <div className="w-24 h-24 border-4 shadow-xl bg-white border-gray-200 rounded-lg flex items-center justify-center relative">
            {Icon && <Icon size={36} strokeWidth={1.5} />}
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
          </div>
          <h4 className="font-semibold">{data.label}</h4>
          <p className="text-sm text-gray-500">{data.description}</p>
        </div>
      ) : (
        <div className="w-1 h-1 relative">
          <Handle
            type="target"
            position={Position.Left}
            style={{
              position: 'absolute',
              top: '2px',
              opacity: 0,
              width: 0,
              height: 0,
            }}
            className="!left-0.5"
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{
              position: 'absolute',
              top: '2x',
              opacity: 0,
              width: 0,
              height: 0,
            }}
            className="!right-0.5"
          />
        </div>
      )}
    </div>
  )
}

// ... (rest of the FlowDiagram.tsx code remains unchanged)

interface Node<
  T = {
    label: string
    description?: string
    icon?: React.ComponentType<{ size: number; strokeWidth: number }>
    color?: string
    isParent?: boolean
    clickable?: boolean
    image?: string
    type?: string
  }
> {
  id: string
  type?: string
  data: T
}

interface Edge {
  id: string
  source: string
  target: string
  type?: string
  label?: string
  markerEnd?: { type: MarkerType }
}

interface FlowData {
  [key: string]: {
    nodes: Node[]
    edges: Edge[]
  }
}

const flowData: FlowData = {
  main: {
    nodes: [
      // ... (nodes array remains unchanged)
    ],
    edges: [
      // ... (edges array remains unchanged)
    ],
  },
  'auto-mail': {
    nodes: [
      // ... (nodes array remains unchanged)
    ],
    edges: [
      // ... (edges array remains unchanged)
    ],
  },
}

// 📌 Cấu hình Dagre Layout
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
      label: edge.label,
      labelStyle: {
        fill: '#000',
        fontSize: 12,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: '#fff',
        fillOpacity: 0.7,
        padding: 5,
      },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    })),
  }
}

const FlowDiagram = () => {
  const [currentFlow, setCurrentFlow] = useState('main')
  const [nodes, setNodes] = useNodesState([])
  const [edges, setEdges] = useEdgesState([])

  useEffect(() => {
    const { nodes, edges } = flowData[currentFlow] || flowData.main
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    )
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [currentFlow])

  // 📌 Xử lý click vào Node
  const handleNodeClick: NodeMouseHandler = (
    _: React.MouseEvent,
    node: Node<CustomNodeProps['data']>
  ) => {
    if (flowData[node.id]) {
      setCurrentFlow(node.id)
    }
  }

  return (
    <section className="section" id="experience">
      <div className="">
        <div className="section-head">
          <h2 className="section-title">Story.</h2>
          <p className="section-subtitle">Câu chuyện về các dự án</p>
        </div>

        <div style={{ width: '100vw', height: '75vh' }} className="">
          {currentFlow !== 'main' && (
            <button
              onClick={() => setCurrentFlow('main')}
              style={{ marginBottom: '10px', padding: '5px 10px' }}
            >
              🔙 Quay lại
            </button>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ customNode: CustomNode }}
            onNodeClick={handleNodeClick}
          >
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </section>
  )
}

export default FlowDiagram
