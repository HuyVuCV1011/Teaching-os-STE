'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DocumentViewer from '@/components/DocumentViewer'
import MarkdownSlidePlayer from '@/components/MarkdownSlidePlayer'
import CodeFileViewer from '@/components/CodeFileViewer'
import TheoryRenderer from '@/components/TheoryRenderer'
import { 
  ArrowLeft, 
  Presentation, 
  BookOpen, 
  Code, 
  FileCheck, 
  FolderOpen, 
  CheckCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  Maximize2
} from 'lucide-react'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'
import { parseAssignmentInstructions } from '@/lib/assignment'

interface PresentationViewClientProps {
  lesson: any
  materials: any[]
  assignments: any[]
}

export default function PresentationViewClient({
  lesson,
  materials,
  assignments
}: PresentationViewClientProps) {
  const [activeTab, setActiveTab] = useState<'slides' | 'theory' | 'practice' | 'assignments'>('slides')
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)

  // Find default slide material (first pdf or markdown slide)
  const slidesList = materials.filter(m => 
    (m.type === 'pdf' && (m.title.toLowerCase().includes('slide') || m.title.toLowerCase().includes('ver'))) || 
    m.type === 'markdown'
  )
  const otherPdfs = materials.filter(m => m.type === 'pdf' && !slidesList.some(s => s.id === m.id))
  const notebooks = materials.filter(m => m.type === 'code_repo' || m.storage_url?.endsWith('.ipynb'))
  const datasets = materials.filter(m => ['csv', 'xlsx'].includes(m.type))
  const otherMarkdowns = materials.filter(m => m.type === 'markdown' && !slidesList.some(s => s.id === m.id))

  useEffect(() => {
    if (slidesList.length > 0 && !selectedMaterial) {
      setSelectedMaterial(slidesList[0])
    } else if (materials.length > 0 && !selectedMaterial) {
      setSelectedMaterial(materials[0])
    }
  }, [materials, slidesList, selectedMaterial])

  const toggleFullscreenMode = () => {
    const docEl = document.documentElement
    if (!document.fullscreenElement) {
      docEl.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Error enabling full screen:', err))
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Load and initialize Mermaid dynamically for diagram rendering
  useEffect(() => {
    if (activeTab !== 'theory') return

    const renderMermaid = () => {
      const mermaidElements = document.querySelectorAll('.mermaid')
      if (mermaidElements.length === 0) return

      if (!(window as any).mermaid) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
        script.async = true
        script.onload = () => {
          const mermaid = (window as any).mermaid
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true, htmlLabels: true }
          })
          mermaid.run()
        }
        document.body.appendChild(script)
      } else {
        // Clear processed flags to allow re-rendering
        mermaidElements.forEach(el => {
          el.removeAttribute('data-processed')
          // If the element has been mutated, we should restore its original text if saved
          const originalText = (el as any)._originalText || el.textContent
          if (originalText) {
            (el as any)._originalText = originalText
            el.textContent = originalText
          }
        })
        ;(window as any).mermaid.run()
      }
    }

    const timer = setTimeout(renderMermaid, 150)
    return () => clearTimeout(timer)
  }, [activeTab, lesson.content])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/library"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-100 hover:border-slate-600 text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Library
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div>
            <span className="text-xs text-slate-500 font-medium">
              {lesson.modules?.courses?.title} / {lesson.modules?.title}
            </span>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Bài {lesson.order_index}: {lesson.title}
              <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md font-medium">
                Bản cho Giáo viên
              </span>
            </h1>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('slides')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'slides'
                ? 'bg-slate-900 text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-800'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            Slides Bài Giảng
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'theory'
                ? 'bg-slate-900 text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-800'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Giáo Trình Lý Thuyết
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'practice'
                ? 'bg-slate-900 text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-800'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Thực Hành & Data
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'assignments'
                ? 'bg-slate-900 text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-800'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Bài Tập & Rubric ({assignments.length})
          </button>
        </div>

        <button
          onClick={toggleFullscreenMode}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100 hover:border-slate-600 text-xs font-bold transition-all shadow-sm"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </header>

      {/* Main Split Screen Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Presentation Pane */}
        <section className="flex-1 flex flex-col overflow-hidden bg-slate-950 border-r border-slate-800">
          {activeTab === 'slides' && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {selectedMaterial && (selectedMaterial.type === 'pdf' || selectedMaterial.type === 'markdown') ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <Presentation className="w-4 h-4 text-blue-600" />
                      Slide đang chiếu: {selectedMaterial.title}
                      {selectedMaterial.visibility === 'teacher' && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          Bản cho Giáo viên
                        </span>
                      )}
                    </h2>
                    <span className="text-[10px] text-slate-500 font-semibold italic">
                      Tip: Bấm Fullscreen trong bộ đọc để chiếu lên màn hình đầy đủ. Dùng ← / → để chuyển slide.
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    {selectedMaterial.type === 'markdown' ? (
                      <MarkdownSlidePlayer 
                        markdown={selectedMaterial.metadata?.viewer_artifact?.viewer_markdown || selectedMaterial.metadata?.extracted_text || ''} 
                        title={selectedMaterial.title} 
                      />
                    ) : (
                      <DocumentViewer url={selectedMaterial.signedUrl} title={selectedMaterial.title} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-slate-500 gap-4">
                  <Presentation className="w-12 h-12 text-slate-650 animate-pulse" />
                  <div className="text-center">
                    <h3 className="font-bold text-slate-200 text-sm">Chưa chọn Slide trình chiếu</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                      Vui lòng chọn một tài liệu PDF từ thanh bên phải để mở slide bài giảng.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'theory' && (
            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-slate-950">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="pb-6 border-b border-slate-850">
                  <span className="text-xs text-blue-600 font-semibold">Giáo trình lý thuyết</span>
                  <h2 className="text-2xl font-bold text-slate-100 mt-1">{lesson.title}</h2>
                </div>
                <TheoryRenderer content={lesson.content || '<p class="italic text-slate-450">Chưa có nội dung lý thuyết cho bài học này.</p>'} />
              </div>
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {selectedMaterial && (selectedMaterial.type === 'code_repo' || selectedMaterial.storage_url?.endsWith('.ipynb') || selectedMaterial.storage_url?.endsWith('.py') || selectedMaterial.storage_url?.endsWith('.sql')) ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <CodeFileViewer 
                    url={selectedMaterial.signedUrl || `${supabaseAdminUrl()}/storage/v1/object/public/teaching-materials/${selectedMaterial.storage_url}`} 
                    title={selectedMaterial.title}
                  />
                </div>
              ) : selectedMaterial && ['csv', 'xlsx'].includes(selectedMaterial.type) ? (() => {
                const artifact = selectedMaterial.metadata?.viewer_artifact
                const headers = artifact?.headers || []
                const rows = artifact?.rows || []
                const rowCount = artifact?.row_count || 0
                const colCount = artifact?.col_count || 0

                return (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h2 className="text-xs font-bold text-slate-550 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-emerald-600" />
                        Tệp dữ liệu: {selectedMaterial.title}
                      </h2>
                      <a
                        href={selectedMaterial.signedUrl || `${supabaseAdminUrl()}/storage/v1/object/public/teaching-materials/${selectedMaterial.storage_url}`}
                        download
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        Tải Tệp Dữ Liệu
                      </a>
                    </div>
                    
                    <div className="flex-1 min-h-0 border border-slate-800 bg-slate-900 rounded-2xl p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
                      {rows.length > 0 ? (
                        <div className="overflow-auto border border-slate-850 rounded-xl flex-1 bg-slate-950 shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]">
                          <table className="min-w-full divide-y divide-slate-800 text-xs">
                            <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
                              <tr>
                                {headers.map((hdr: string, i: number) => (
                                  <th key={i} className="px-3.5 py-2.5 text-left font-bold text-slate-100 border-r border-slate-800 last:border-0 bg-slate-900 tracking-wider">
                                    {hdr}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 bg-slate-950">
                              {rows.slice(0, 5).map((row: any[], i: number) => (
                                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                                  {row.map((cell: any, j: number) => (
                                    <td key={j} className="px-3.5 py-2.5 text-slate-650 border-r border-slate-850 last:border-0 truncate max-w-[120px]">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950 border border-slate-850 rounded-xl">
                          <p className="text-xs text-slate-500 italic">Không có dữ liệu xem trước cho bảng này.</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold tracking-wide shrink-0">
                        <span>Đang hiển thị 5 dòng đầu tiên</span>
                        <span>Tổng số: {rowCount} dòng × {colCount} cột</span>
                      </div>
                    </div>
                  </div>
                )
              })() : (
                <div className="flex-1 flex flex-col justify-center items-center text-slate-500 gap-4">
                  <Code className="w-12 h-12 text-slate-650 animate-pulse" />
                  <div className="text-center">
                    <h3 className="font-bold text-slate-200 text-sm">Chưa có tệp code thực hành</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                      Tải lên các file Python `.py`, `.ipynb` hoặc bảng tính dữ liệu Excel để bắt đầu buổi học thực hành.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-950">
              <div className="max-w-3xl mx-auto space-y-8">
                <div>
                  <span className="text-xs text-blue-600 font-semibold">Bài tập buổi học</span>
                  <h2 className="text-xl font-bold text-slate-100 mt-1">Giao Bài & Tiêu Chí Đánh Giá</h2>
                </div>

                {assignments.length === 0 ? (
                  <div className="border border-dashed border-slate-800 bg-slate-900/50 rounded-2xl p-10 text-center text-slate-500 space-y-3">
                    <FileCheck className="w-8 h-8 mx-auto text-slate-600" />
                    <h4 className="font-bold text-slate-350 text-xs">Chưa có bài tập nào được giao</h4>
                    <p className="text-[10px] text-slate-550 max-w-xs mx-auto leading-relaxed">
                      Hệ thống tự học không có bài tập được gán cho buổi học này. Anh có thể tạo bài tập mới từ CMS Admin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {assignments.map((assign, index) => (
                      <div key={assign.id} className="border border-slate-800 bg-slate-900 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[10px] flex items-center justify-center">
                              {index + 1}
                            </span>
                            {assign.title}
                          </h3>
                          {assign.max_score && (
                            <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg font-bold font-mono">
                              Max Score: {assign.max_score} pts
                            </span>
                          )}
                        </div>

                        {(() => {
                          const parsedObj = parseAssignmentInstructions(assign.instructions)
                          if (parsedObj) {
                            const questionsList = (parsedObj.questions || []).filter((q: any) => !q.status || q.status === 'approved')
                            if (questionsList.length > 0) {
                              return (
                                <div className="space-y-4">
                                  {questionsList.map((q: any, qIdx: number) => (
                                    <div key={q.id || qIdx} className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl space-y-3.5 text-left shadow-sm">
                                      <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                                        <span className="text-xs font-semibold text-slate-500">
                                          Câu hỏi {qIdx + 1}
                                        </span>
                                        {q.points && (
                                          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold font-mono">
                                            {q.points} pts
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                        {q.content}
                                      </p>
                                      {q.options && q.options.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                                          {q.options.map((opt: string, optIdx: number) => (
                                            <div key={optIdx} className="p-3 rounded-lg border border-slate-850 bg-slate-900/40 text-[11px] text-slate-400 flex items-start gap-2 hover:border-slate-805 transition-all">
                                              <span className="font-bold text-blue-500 uppercase font-mono shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                              <span>{opt}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {q.answer && (
                                        <div className="mt-3.5 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <strong className="text-emerald-600 text-xs font-bold">Đáp án & Hướng dẫn chấm:</strong>
                                          </div>
                                          <p className="pl-3 border-l border-emerald-500/20 text-slate-400 font-mono text-[10px] whitespace-pre-wrap">{q.answer}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )
                            }
                          }
                          return (
                            <div 
                              className="text-xs text-slate-450 leading-relaxed prose prose-invert max-w-none"
                              dangerouslySetInnerHTML={{ __html: assign.instructions || '' }}
                            />
                          )
                        })()}

                        {/* Rubrics Matrix Section */}
                        {assign.rubrics && (
                          <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 text-left">
                            <div>
                              <span className="text-xs text-emerald-600 font-semibold">Tiêu chí đánh giá (Rubric)</span>
                              <h4 className="text-sm font-bold text-slate-100 mt-0.5">{assign.rubrics.title}</h4>
                              {assign.rubrics.description && (
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{assign.rubrics.description}</p>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              {(assign.rubrics.rubric_criteria || []).map((crit: any) => {
                                const weightVal = parseFloat(crit.weight || '1');
                                return (
                                  <div key={crit.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-800 transition-all">
                                    <div className="space-y-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="text-xs font-bold text-slate-200">{crit.name}</h5>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                            w: {weightVal.toFixed(1)}x
                                          </span>
                                          <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                            {crit.max_points} pts
                                          </span>
                                        </div>
                                      </div>
                                      {crit.description && (
                                        <p className="text-[11px] text-slate-500 leading-relaxed">{crit.description}</p>
                                      )}
                                    </div>
                                    
                                      <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-550 font-medium">
                                        <span>Tỷ trọng điểm</span>
                                        <span>{(weightVal * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-emerald-500 rounded-full transition-all" 
                                          style={{ width: `${Math.min(weightVal * 50, 100)}%` }} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar Pane: Materials Directory & Teaching Notes */}
        <aside className="w-80 bg-slate-900 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          {/* Section 1: Lecture Assets & Directory */}
          <div className="p-5 border-b border-slate-800 space-y-4 shrink-0">
            <h3 className="text-xs font-semibold text-slate-550 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              Thư mục học liệu ({materials.length})
            </h3>
            
            {/* Slides List */}
            {slidesList.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-500">Slide bài giảng (PDF)</span>
                <div className="space-y-1.5">
                  {slidesList.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMaterial(m)
                        setActiveTab('slides')
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between ${
                        selectedMaterial?.id === m.id
                          ? 'bg-slate-950 text-slate-100 border-slate-800 shadow-sm'
                          : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-950/40 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Presentation className={`w-3.5 h-3.5 ${selectedMaterial?.id === m.id ? 'text-blue-600' : 'text-slate-600'}`} />
                        <span className="truncate">{m.title}</span>
                      </span>
                      {m.visibility === 'teacher' && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md font-medium">
                          Nội bộ
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notebooks List */}
            {notebooks.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-slate-500">Jupyter Notebooks (.ipynb)</span>
                <div className="space-y-1.5">
                  {notebooks.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMaterial(m)
                        setActiveTab('practice')
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between ${
                        selectedMaterial?.id === m.id
                          ? 'bg-slate-950 text-slate-100 border-slate-800 shadow-sm'
                          : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-950/40 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Code className={`w-3.5 h-3.5 ${selectedMaterial?.id === m.id ? 'text-emerald-600' : 'text-slate-600'}`} />
                        <span className="truncate">{m.title}</span>
                      </span>
                      {m.visibility === 'teacher' && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md font-medium">
                          Nội bộ
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Datasets / Spreadsheets List */}
            {datasets.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-slate-500">Bảng dữ liệu thực hành</span>
                <div className="space-y-1.5">
                  {datasets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMaterial(m)
                        setActiveTab('practice')
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between ${
                        selectedMaterial?.id === m.id
                          ? 'bg-slate-950 text-slate-100 border-slate-800 shadow-sm'
                          : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-950/40 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderOpen className={`w-3.5 h-3.5 ${selectedMaterial?.id === m.id ? 'text-emerald-600' : 'text-slate-600'}`} />
                        <span className="truncate">{m.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Additional PDFs / Materials */}
            {otherPdfs.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-slate-500">Tài liệu bổ sung / Bài tập</span>
                <div className="space-y-1.5">
                  {otherPdfs.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMaterial(m)
                        setActiveTab('slides')
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between ${
                        selectedMaterial?.id === m.id
                          ? 'bg-slate-950 text-slate-100 border-slate-800 shadow-sm'
                          : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-950/40 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderOpen className={`w-3.5 h-3.5 ${selectedMaterial?.id === m.id ? 'text-blue-600' : 'text-slate-600'}`} />
                        <span className="truncate">{m.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {otherMarkdowns.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-slate-500">Tài liệu tham khảo đọc thêm</span>
                <div className="space-y-1.5">
                  {otherMarkdowns.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMaterial(m)
                        setActiveTab('slides')
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between ${
                        selectedMaterial?.id === m.id
                          ? 'bg-slate-950 text-slate-100 border-slate-800 shadow-sm'
                          : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-950/40 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderOpen className={`w-3.5 h-3.5 ${selectedMaterial?.id === m.id ? 'text-emerald-600' : 'text-slate-650'}`} />
                        <span className="truncate">{m.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Teacher Lecture Guide & Notes */}
          <div className="p-5 flex-1 flex flex-col space-y-4">
            <h3 className="text-xs font-semibold text-slate-550 flex items-center gap-1.5 shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              Hướng dẫn giảng dạy (Notes)
            </h3>
            
            <div className="flex-1 bg-slate-955 border border-slate-850 rounded-xl p-4 text-[11px] text-slate-450 leading-relaxed overflow-y-auto custom-scrollbar shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] font-sans space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-250 border-b border-slate-800 pb-1">💡 Kế hoạch buổi học #{lesson.order_index}:</h4>
                <ul className="list-decimal pl-4 space-y-1 text-slate-500">
                  <li>Trình chiếu slide lý thuyết chính (15-20p).</li>
                  <li>Hướng dẫn học viên tải file thực hành `.ipynb` từ Dashboard học viên.</li>
                  <li>Mở file Notebook Teacher tương ứng để lấy code mẫu thực hành.</li>
                  <li>Giao bài tập cuối giờ (Assignments) và giải đáp thắc mắc.</li>
                </ul>
              </div>

              {selectedMaterial?.visibility === 'teacher' && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-amber-600/90 space-y-1 animate-pulse">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Tài liệu nội bộ
                  </span>
                  <p className="text-[10.5px]">
                    Học liệu đang chọn chỉ hiển thị ở giao diện giáo viên. Học viên sẽ không tìm thấy file này trên tài khoản học viên.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

// Client helper: Extract basename
function os_basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

// Client helper: Get Supabase public URL
function supabaseAdminUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zuwsvvpzivukrfegqgsp.supabase.co'
}
