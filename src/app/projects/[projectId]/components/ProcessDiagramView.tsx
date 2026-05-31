'use client'

import React from 'react'
import ReactFlow, { Controls, Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { CustomNode } from '@/components/ui/FlowDiagram'

interface ProcessDiagramViewProps {
  nodes: Node[]
  setNodes: any // required by ReactFlow hooks
  onNodesChange: any
  edges: Edge[]
  setEdges: any
  onEdgesChange: any
}

export function ProcessDiagramView({
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
}: ProcessDiagramViewProps) {
  return (
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
  )
}
