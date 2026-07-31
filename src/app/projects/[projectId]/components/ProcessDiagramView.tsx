'use client'

import React from 'react'
import ReactFlow, {
  Controls,
  Edge,
  Node,
  type OnEdgesChange,
  type OnNodesChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { CustomNode } from '@/components/ui/FlowDiagram'

interface ProcessDiagramViewProps {
  nodes: Node[]
  onNodesChange: OnNodesChange
  edges: Edge[]
  onEdgesChange: OnEdgesChange
}

const nodeTypes = { customNode: CustomNode }

export function ProcessDiagramView({
  nodes,
  onNodesChange,
  edges,
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
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
      </ReactFlow>
    </div>
  )
}
