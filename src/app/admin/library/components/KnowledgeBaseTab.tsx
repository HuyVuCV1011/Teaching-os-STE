'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Upload,
  Search,
  Book,
  FileText,
  Trash2,
  Cpu,
  Workflow,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Network,
  Maximize2
} from 'lucide-react'
import { uploadKnowledgeAction, searchKnowledgeAction, deleteKnowledgeAction } from '../actions/knowledge'

export function KnowledgeBaseTab() {
  // Lists
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Upload state
  const [title, setTitle] = useState('')
  const [accessScope, setAccessScope] = useState('organization')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Playground state
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    fetchSources()
  }, [])

  async function fetchSources() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select(`
          *,
          source_artifact:file_artifacts!source_file_artifact_id(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSources(data || [])
    } catch (err: any) {
      console.error('Error fetching knowledge sources:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle file select
  const handleFile = (file: File) => {
    if (!file) return
    setFileName(file.name)
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setFileContent(e.target?.result as string || '')
    }
    reader.readAsText(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName || !fileContent || !title) return

    setUploading(true)
    try {
      const result = await uploadKnowledgeAction(title, accessScope, fileName, fileContent)
      if (!result.success) {
        throw new Error(result.error)
      }

      // Reset
      setTitle('')
      setFileName('')
      setFileContent('')
      fetchSources()
      alert('Document registered, chunked, and RAG indexed successfully!')
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document from the RAG knowledge library?')) return

    try {
      const result = await deleteKnowledgeAction(id)
      if (!result.success) throw new Error(result.error)
      fetchSources()
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const result = await searchKnowledgeAction(searchQuery)
      if (!result.success) throw new Error(result.error)
      setSearchResults(result.results || [])
    } catch (err: any) {
      alert(`Search failed: ${err.message}`)
    } finally {
      setSearching(false)
    }
  }

  // Segment sources into manual uploads vs. automated pedagogy flywheel (lessons)
  const manualSources = sources.filter(s => s.metadata_payload?.source_format !== 'lesson_pedagogy')
  const flywheelSources = sources.filter(s => s.metadata_payload?.source_format === 'lesson_pedagogy')

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      
      {/* Dynamic Visual Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Active Synapses */}
        <div className="p-6 bg-slate-950 border border-slate-800/40 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Synapses</span>
            <div className="text-3xl font-extrabold text-slate-100 flex items-baseline gap-2.5">
              {sources.length} <span className="text-xs text-blue-600 font-semibold">Nodes</span>
            </div>
            <p className="text-xs text-slate-500/80 font-medium">Documents queryable by RubriCore AI</p>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600">
            <Network className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Card 2: Flywheel Pedigree */}
        <div className="p-6 bg-slate-950 border border-slate-800/40 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pedagogical Flywheel</span>
            <div className="text-3xl font-extrabold text-slate-100 flex items-baseline gap-2.5">
              {flywheelSources.length} <span className="text-xs text-emerald-600 font-semibold">Indexed</span>
            </div>
            <p className="text-xs text-slate-500/80 font-medium">Self-evolving teacher-style nodes</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
            <Workflow className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Ingestion Stream */}
        <div className="p-6 bg-slate-950 border border-slate-800/40 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">RRF Hybrid Search</span>
            <div className="text-3xl font-extrabold text-slate-100 flex items-baseline gap-2.5">
              Online <span className="text-xs text-indigo-600 font-semibold animate-pulse">●</span>
            </div>
            <p className="text-xs text-slate-500/80 font-medium">Vector similarities + full text regex</p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Register & Catalog */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Upload Document */}
          <div className="p-6 bg-slate-950 border border-slate-800/30 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Ingest Knowledge Document
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Register syllabus criteria, programming guides, slides, or sample exercises.
              </p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Source Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-medium placeholder-slate-500"
                    placeholder="e.g. Clean Code Standards for Java"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Access Scope
                  </label>
                  <select
                    value={accessScope}
                    onChange={(e) => setAccessScope(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-medium"
                  >
                    <option value="organization">Organization Internal</option>
                    <option value="public_safe">Public Safe</option>
                    <option value="private">Private (Owner Only)</option>
                  </select>
                </div>
              </div>

              {/* Drag & Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 relative ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60'
                }`}
              >
                <input
                  type="file"
                  id="knowledge-file"
                  onChange={handleFileInputChange}
                  accept=".md,.txt,.markdown"
                  className="hidden"
                />
                <label htmlFor="knowledge-file" className="cursor-pointer block space-y-2">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-xl bg-slate-800 text-slate-400 group-hover:text-slate-200">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    {fileName ? (
                      <span className="text-blue-500 flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> {fileName}
                      </span>
                    ) : (
                      <span>Drag & drop markdown file, or browse</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Supports .md, .markdown, .txt up to 5MB. Automatically chunks on load.
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                {fileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileName('')
                      setFileContent('')
                      setTitle('')
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-500 hover:text-slate-200 font-bold text-xs transition-colors"
                  >
                    Clear File
                  </button>
                )}
                <button
                  type="submit"
                  disabled={uploading || !fileName}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin" />
                      <span>RAG Indexing...</span>
                    </>
                  ) : (
                    <span>Register Node</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section: Synaptic Library Catalog */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-600 animate-pulse" /> AI Synaptic Map & Knowledge Catalog
            </h3>

            {loading ? (
              <div className="text-center py-10 text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" /> Loading active synapses...
              </div>
            ) : sources.length === 0 ? (
              <div className="p-8 text-center border border-slate-800 rounded-2xl text-slate-500 text-xs font-medium bg-slate-950/20">
                No active RAG documents in your pedagogical synapses. Use the upload panel to register your first guide!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sources.map((source) => {
                  const isFlywheel = source.metadata_payload?.source_format === 'lesson_pedagogy'
                  return (
                    <div
                      key={source.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-4 bg-slate-950 shadow-sm ${
                        isFlywheel
                          ? 'border-emerald-500/30 hover:border-emerald-500/50'
                          : 'border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start w-full">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isFlywheel
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}
                          >
                            {isFlywheel ? 'PEDAGOGICAL FLYWHEEL' : 'MANUAL INGESTION'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            V{source.version_number}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm line-clamp-1 leading-snug group-hover:text-blue-600">
                            {source.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {source.summary || ' pedagogical coordinate mapped in synaptic AI system.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-900/60 pt-3">
                        <span className="text-[10px] text-slate-500 font-medium uppercase">
                          Scope: {source.access_scope}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(source.id)}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500/20 transition-all hover:bg-red-500/5 active:scale-95"
                            title="Delete Synapse"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Semantic Query Playground */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-slate-950 border border-slate-800/30 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" /> Semantic RAG Playground
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Type queries to verify vector semantic retrieval + RRF hybrid matching.
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query RAG vector index..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40"
              >
                {searching ? (
                  <span className="w-3.5 h-3.5 block rounded-full border border-t-transparent border-white animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </form>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {searchResults.length > 0 ? (
                searchResults.map((res: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 relative overflow-hidden shadow-inner">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-mono font-bold text-blue-600 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                        RRF Rank {idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Score: {typeof res.score === 'number' ? res.score.toFixed(4) : res.score}
                      </span>
                    </div>

                    <div className="text-xs text-slate-100 font-medium leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-900 max-h-[160px] overflow-y-auto scrollbar-thin">
                      {res.content}
                    </div>

                    <div className="text-[10px] text-slate-500 font-medium flex flex-wrap gap-2 items-center">
                      <span className="font-semibold text-slate-400">Cited Path:</span>
                      {res.heading_path && res.heading_path.length > 0 ? (
                        res.heading_path.map((h: string, hIdx: number) => (
                          <span key={hIdx} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700/50">Root</span>
                      )}
                    </div>
                  </div>
                ))
              ) : searchQuery && !searching ? (
                <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                  No matching vector semantic chunks found for "{searchQuery}"
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                  Playground empty. Run a query above to see RAG retrieval responses.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
