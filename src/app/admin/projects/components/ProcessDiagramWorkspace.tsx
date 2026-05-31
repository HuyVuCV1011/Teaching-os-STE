'use client'

import React, { useState, useCallback } from 'react'
import ReactFlow, {
  Controls,
  Node,
  Edge,
  MarkerType,
  Connection,
  addEdge,
  useReactFlow,
} from 'reactflow'
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
} from 'lucide-react'
import { CustomNode } from '@/components/ui/FlowDiagram'
import { getLayoutedElements } from '../utils/projectUtils'

// Node Icon list matching database and UI lookup schemas
export const nodeIconOptions = [
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

const nodeTypeOptions = [
  { value: 'source', label: 'Source' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'actor', label: 'Actor' },
  { value: 'decision', label: 'Decision' },
  { value: 'action', label: 'Action' },
]

interface ProcessDiagramWorkspaceProps {
  nodes: Node[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  onNodesChange: any
  edges: Edge[]
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  onEdgesChange: any
}

export function ProcessDiagramWorkspace({
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
}: ProcessDiagramWorkspaceProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [nodeConfig, setNodeConfig] = useState({
    id: '',
    type: 'source',
    label: '',
    description: '',
    icon: 'FileSpreadsheet',
  })

  const reactFlowInstance = useReactFlow()

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const paneBounds = event.currentTarget.getBoundingClientRect()
      const position = reactFlowInstance.project({
        x: event.clientX - paneBounds.left,
        y: event.clientY - paneBounds.top,
      })
      const newNodeId = `node-${nodes.length + 1}`
      const newNode: Node = {
        id: newNodeId,
        type: 'customNode',
        data: {
          type: nodeConfig.type || 'source',
          label: nodeConfig.label || 'Nút Mới',
          description: nodeConfig.description || '',
          icon: nodeIconOptions.find((opt) => opt.value === nodeConfig.icon)?.icon || FileSpreadsheet,
        },
        position,
      }
      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, nodes.length, nodeConfig, setNodes]
  )

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

  return (
    <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-4">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Process Diagram Workspace
      </label>
      <div className="border border-slate-700 bg-slate-955 rounded-xl overflow-hidden" style={{ height: '400px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneDoubleClick={onPaneDoubleClick}
          nodeTypes={{ customNode: CustomNode }}
          fitView
        >
          <Controls className="bg-slate-900 border-slate-700 text-slate-400" />
        </ReactFlow>
      </div>

      <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-700 space-y-3.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
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
            <span className="block text-[10px] text-slate-550 mb-1">Node Type</span>
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
            <span className="block text-[10px] text-slate-550 mb-1">Node Icon</span>
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
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-500 hover:border-slate-400 text-xs font-semibold text-slate-300"
          >
            Add Node
          </button>
          {selectedNode && (
            <>
              <button
                type="button"
                onClick={updateNode}
                className="px-3 py-1.5 rounded bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-xs font-semibold text-blue-600"
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
  )
}
