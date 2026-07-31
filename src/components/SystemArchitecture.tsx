'use client'

import React, { useState } from 'react'
import ReactFlow, {
  Controls,
  Background,
  Handle,
  Position,
  MarkerType,
  ReactFlowProvider,
  Node,
  Edge,
  NodeProps
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Database, Cpu, Server, TrendingUp, Sparkles, Layout, Globe, FileCode, ListFilter, type LucideIcon } from 'lucide-react'

interface PipelineNodeData {
  label: string
  details: string
  description: string
  icon: LucideIcon
}

// Custom Node Component for the Pipeline
const PipelineNode = ({ data }: NodeProps<PipelineNodeData>) => {
  const Icon = data.icon
  return (
    <div className="flex flex-col bg-slate-955 border border-slate-800/80 rounded-2xl shadow-md p-4 w-[230px] text-left relative hover:border-blue-500/50 hover:shadow-lg transition-all duration-300">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-2.5 !h-2.5 !bg-blue-600 !border !border-slate-955" 
      />
      <div className="flex items-center gap-2.5 mb-2">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <h4 className="text-[11px] font-bold text-slate-100 uppercase tracking-wider leading-tight truncate">
            {data.label}
          </h4>
          <span className="text-[8px] bg-slate-900 text-slate-400 border border-slate-800/80 px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 inline-block uppercase tracking-wider">
            {data.details}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">
        {data.description}
      </p>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-2.5 !h-2.5 !bg-blue-600 !border !border-slate-955" 
      />
    </div>
  )
}

const nodeTypes = {
  pipelineNode: PipelineNode
}

// 🌐 Siren Reads Polyglot Nodes & Edges
const sirenNodes: Node<PipelineNodeData>[] = [
  {
    id: 's-client',
    type: 'pipelineNode',
    position: { x: 40, y: 190 },
    data: {
      label: 'React Frontend',
      details: 'React 19 / Vite / TS',
      description: 'Giao diện storefront duyệt catalog, quản lý giỏ hàng, staff tools và dashboard admin.',
      icon: Layout
    }
  },
  {
    id: 's-api',
    type: 'pipelineNode',
    position: { x: 320, y: 190 },
    data: {
      label: 'Spring Boot API',
      details: 'Java 17 / Hibernate',
      description: 'Cung cấp REST API, xử lý nghiệp vụ giao dịch, gợi ý sách và điều phối các database.',
      icon: FileCode
    }
  },
  {
    id: 's-postgres',
    type: 'pipelineNode',
    position: { x: 620, y: 10 },
    data: {
      label: 'PostgreSQL DB',
      details: 'Core Transactions',
      description: 'Lưu trữ thông tin người dùng, đơn hàng, hóa đơn và các bảng dữ liệu quan hệ cốt lõi.',
      icon: Database
    }
  },
  {
    id: 's-mongo',
    type: 'pipelineNode',
    position: { x: 620, y: 100 },
    data: {
      label: 'MongoDB',
      details: 'Read Models Catalog',
      description: 'Lưu thông tin chi tiết sách (JSON), bài viết, các review và tối ưu hóa tốc độ tìm kiếm.',
      icon: Database
    }
  },
  {
    id: 's-redis',
    type: 'pipelineNode',
    position: { x: 620, y: 190 },
    data: {
      label: 'Redis',
      details: 'Session & Counters',
      description: 'Lưu trạng thái giỏ hàng của khách vãng lai, cache dữ liệu tĩnh, đếm view real-time.',
      icon: Server
    }
  },
  {
    id: 's-cassandra',
    type: 'pipelineNode',
    position: { x: 620, y: 280 },
    data: {
      label: 'Apache Cassandra',
      details: 'Interaction Logs',
      description: 'Lưu nhật ký tương tác của người dùng, phục vụ data pipeline phân tích hành vi thời gian thực.',
      icon: Database
    }
  },
  {
    id: 's-neo4j',
    type: 'pipelineNode',
    position: { x: 620, y: 370 },
    data: {
      label: 'Neo4j Graph DB',
      details: 'Recommendations Engine',
      description: 'Lưu quan hệ giữa người dùng, tác giả, thể loại để chạy thuật toán gợi ý sách liên quan.',
      icon: Cpu
    }
  }
]

const sirenEdges: Edge[] = [
  {
    id: 's-edge-client-api',
    source: 's-client',
    target: 's-api',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
  },
  {
    id: 's-edge-api-pg',
    source: 's-api',
    target: 's-postgres',
    style: { stroke: '#336791', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#336791' }
  },
  {
    id: 's-edge-api-mongo',
    source: 's-api',
    target: 's-mongo',
    style: { stroke: '#4EA94B', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4EA94B' }
  },
  {
    id: 's-edge-api-redis',
    source: 's-api',
    target: 's-redis',
    style: { stroke: '#DC382D', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#DC382D' }
  },
  {
    id: 's-edge-api-cassandra',
    source: 's-api',
    target: 's-cassandra',
    style: { stroke: '#1287B1', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#1287B1' }
  },
  {
    id: 's-edge-api-neo',
    source: 's-api',
    target: 's-neo4j',
    style: { stroke: '#008CC1', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#008CC1' }
  },
  {
    id: 's-edge-pg-mongo',
    source: 's-postgres',
    target: 's-mongo',
    style: { stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' },
    label: 'CDC Sync',
    labelStyle: { fill: '#64748b', fontSize: 8, fontWeight: 700 }
  }
]

// 🚖 NYC Green Taxi DWH Nodes & Edges
const taxiNodes: Node<PipelineNodeData>[] = [
  {
    id: 't-src-mysql',
    type: 'pipelineNode',
    position: { x: 30, y: 20 },
    data: {
      label: 'MySQL Source',
      details: 'Driver HR System',
      description: 'Lưu thông tin hồ sơ tài xế, quản trị đội ngũ nhân sự.',
      icon: Database
    }
  },
  {
    id: 't-src-mongo',
    type: 'pipelineNode',
    position: { x: 30, y: 110 },
    data: {
      label: 'MongoDB Source',
      details: 'Fleet Collections',
      description: 'Quản lý danh sách phương tiện, lịch trình bảo dưỡng xe.',
      icon: Database
    }
  },
  {
    id: 't-src-pg',
    type: 'pipelineNode',
    position: { x: 30, y: 200 },
    data: {
      label: 'PostgreSQL Source',
      details: 'Dispatch / Shifts',
      description: 'Ghi nhận phân bổ ca làm việc, điều phối cuốc xe thực tế.',
      icon: Database
    }
  },
  {
    id: 't-src-files',
    type: 'pipelineNode',
    position: { x: 30, y: 290 },
    data: {
      label: 'TLC Trip Files',
      details: 'TLC Green Taxi Batch',
      description: 'Dữ liệu hành trình, doanh thu 19 tháng từ TLC NYC.',
      icon: Database
    }
  },
  {
    id: 't-stg',
    type: 'pipelineNode',
    position: { x: 310, y: 155 },
    data: {
      label: 'Staging Area',
      details: 'Raw Mirror Tables',
      description: 'Tải và ánh xạ nguyên bản dữ liệu từ các nguồn khác nhau.',
      icon: Server
    }
  },
  {
    id: 't-dq',
    type: 'pipelineNode',
    position: { x: 580, y: 155 },
    data: {
      label: 'Data Quality Gate',
      details: 'Audit & Quarantine',
      description: 'Tự động kiểm tra lỗi schema, trùng lặp khóa, đẩy lỗi sang Quarantine.',
      icon: ListFilter
    }
  },
  {
    id: 't-nds',
    type: 'pipelineNode',
    position: { x: 850, y: 70 },
    data: {
      label: 'NDS Normalized Schema',
      details: 'Postgres Third Normal Form',
      description: 'Tích hợp dữ liệu chuẩn hóa, áp dụng SCD Type 1 & Type 2.',
      icon: Cpu
    }
  },
  {
    id: 't-dds',
    type: 'pipelineNode',
    position: { x: 850, y: 240 },
    data: {
      label: 'DDS Star Schema',
      details: 'Driver Operations DDS',
      description: 'Bảng Fact và Dimension tối ưu hóa truy vấn phân tích.',
      icon: Cpu
    }
  },
  {
    id: 't-bi',
    type: 'pipelineNode',
    position: { x: 1120, y: 155 },
    data: {
      label: 'Apache Superset',
      details: 'BI & Presentation',
      description: 'Hiển thị 88 chỉ số metrics, 42 biểu đồ tương tác vận hành đội xe.',
      icon: TrendingUp
    }
  }
]

const taxiEdges: Edge[] = [
  { id: 't-edge-mysql-stg', source: 't-src-mysql', target: 't-stg', style: { stroke: '#94a3b8' } },
  { id: 't-edge-mongo-stg', source: 't-src-mongo', target: 't-stg', style: { stroke: '#94a3b8' } },
  { id: 't-edge-pg-stg', source: 't-src-pg', target: 't-stg', style: { stroke: '#94a3b8' } },
  { id: 't-edge-files-stg', source: 't-src-files', target: 't-stg', style: { stroke: '#94a3b8' } },
  {
    id: 't-edge-stg-dq',
    source: 't-stg',
    target: 't-dq',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
  },
  {
    id: 't-edge-dq-nds',
    source: 't-dq',
    target: 't-nds',
    animated: true,
    style: { stroke: '#4f46e5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' }
  },
  {
    id: 't-edge-nds-dds',
    source: 't-nds',
    target: 't-dds',
    style: { stroke: '#475569', strokeDasharray: '4 4' }
  },
  {
    id: 't-edge-dq-dds',
    source: 't-dq',
    target: 't-dds',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
  },
  {
    id: 't-edge-dds-bi',
    source: 't-dds',
    target: 't-bi',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }
  }
]

const SystemArchitectureContent = ({ activeTab }: { activeTab: 'siren' | 'taxi' }) => {
  const nodes = activeTab === 'siren' ? sirenNodes : taxiNodes
  const edges = activeTab === 'siren' ? sirenEdges : taxiEdges

  return (
    <div className="w-full h-[450px] border border-slate-800/80 rounded-3xl bg-slate-900/10 shadow-inner relative overflow-hidden group">
      {/* Floating Canvas Tag */}
      <div className="absolute top-4 left-4 z-10 bg-slate-955/90 border border-slate-800/80 px-3 py-1.5 rounded-xl shadow-sm text-[10px] font-bold text-slate-100 uppercase tracking-widest flex items-center gap-1.5 select-none">
        <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
        <span>
          {activeTab === 'siren' ? 'Kiến trúc Siren Reads Bookstore (SaaS)' : 'Pipeline DWH Green Taxi (Operations)'}
        </span>
      </div>

      <ReactFlow
        key={activeTab} // Force component rebuild on tab change
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        className="bg-transparent"
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Controls 
          className="!bg-slate-955 !border-slate-800/80 !shadow-sm !rounded-xl !overflow-hidden [&>button]:!border-slate-800 [&>button]:!bg-transparent [&>button]:!text-slate-400 hover:[&>button]:!text-slate-100" 
          showInteractive={false} 
        />
        <Background color="#cbd5e1" gap={16} size={1} />
      </ReactFlow>
    </div>
  )
}

const SystemArchitecture = () => {
  const [activeTab, setActiveTab] = useState<'siren' | 'taxi'>('siren')

  return (
    <section className="section bg-slate-955 py-20 border-t border-slate-850">
      <div className="container">
        
        {/* Section Header */}
        <div className="section-head text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="section-title text-3xl font-extrabold text-slate-50">
            Kiến Trúc Hệ Thống & Pipelines
          </h2>
          <p className="section-subtitle text-slate-550 text-sm font-semibold max-w-md mx-auto normal-case">
            Trực quan các mô hình dữ liệu thực tế do tôi thiết kế và triển khai: từ hệ thống Polyglot DB của ứng dụng SaaS đến kho dữ liệu (DWH) lớn.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('siren')}
            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'siren'
                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                : 'bg-slate-955 border-slate-800 text-slate-550 hover:text-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Kiến trúc Polyglot Bookstore (Siren Reads)</span>
          </button>
          <button
            onClick={() => setActiveTab('taxi')}
            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'taxi'
                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                : 'bg-slate-955 border-slate-800 text-slate-550 hover:text-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Pipeline DWH NYC Green Taxi</span>
          </button>
        </div>

        {/* ReactFlow Provider Wrapper */}
        <ReactFlowProvider>
          <SystemArchitectureContent activeTab={activeTab} />
        </ReactFlowProvider>

      </div>
    </section>
  )
}

export default SystemArchitecture
