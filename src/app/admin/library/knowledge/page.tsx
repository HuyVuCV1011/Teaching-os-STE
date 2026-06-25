'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeft, 
  Database, 
  Upload, 
  Search, 
  Trash, 
  FileText, 
  BookOpen, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Loader2,
  Settings,
  Eye,
  X,
  Link2
} from 'lucide-react'
import {
  getKnowledgeSourcesAction,
  uploadKnowledgeAction,
  deleteKnowledgeSourceAction,
  searchKnowledgeAction,
  getKnowledgeSourceChunksAction
} from '../actions/knowledge'
import {
  getPromptAction,
  savePromptAction
} from '../actions/prompt_settings'

interface KnowledgeSource {
  id: string
  title: string
  version_number: number
  access_scope: string
  conversion_status: string
  status: string
  summary: string | null
  original_filename: string
  chunks_count: number
  created_at: string | null
}

interface RetrievedChunk {
  chunk_id: string
  knowledge_source_id: string
  heading_path: string[]
  content: string
  score: number
  matched_terms: string[]
  citation: {
    knowledge_source_title?: string
    knowledge_source_version_number?: number
    access_scope?: string
  }
}

export default function KnowledgeHubPage() {
  const router = useRouter()
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'sources' | 'prompts'>('sources')

  // Prompt Settings State
  const [promptText, setPromptText] = useState('')
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [savingPrompt, setSavingPrompt] = useState(false)

  const DEFAULT_RAG_RUBRIC_TEMPLATE = `You are a rubric design assistant. Build a structured grading rubric matrix based on the assignment prompt and expected solutions. Return only one valid JSON object. Do not include markdown code block syntax. The JSON must have a single root key 'criteria' which is an array of objects. Each criterion object must contain:
- key: string (a unique URL-safe slug, e.g. 'python-syntax')
- label: string (name of the metric, e.g. 'Python Syntax')
- description: string (what to grade, e.g. 'Verify code structure')
- max_points: number (e.g. 10)
- weight: number (decimal weight, e.g. 1.0)
- evaluation_hints: object containing:
    * rule_type: string ('regex', 'exact', or 'none')
    * expected_value: string (the regex pattern or exact phrase to match, or null if rule_type is 'none')

Make sure the criteria sum up logically (total max_points * weights should match the total assignment score, usually 100).`

  // Upload State
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [accessScope, setAccessScope] = useState('organization')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RetrievedChunk[]>([])
  const [searchLimit, setSearchLimit] = useState(5)
  const [searchScopes, setSearchScopes] = useState<string[]>(['organization', 'public_safe'])

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewingSource, setPreviewingSource] = useState<KnowledgeSource | null>(null)
  const [previewChunks, setPreviewChunks] = useState<any[]>([])
  const [loadingChunks, setLoadingChunks] = useState(false)
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null)

  // Scroll to target chunk when modal loads
  useEffect(() => {
    if (!loadingChunks && previewChunks.length > 0 && targetChunkId && showPreviewModal) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`chunk-${targetChunkId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950')
          }, 3000)
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [loadingChunks, previewChunks, targetChunkId, showPreviewModal])

  const handleOpenPreview = async (source: KnowledgeSource) => {
    setPreviewingSource(source)
    setShowPreviewModal(true)
    setLoadingChunks(true)
    try {
      const res = await getKnowledgeSourceChunksAction(source.id)
      if (res.success) {
        setPreviewChunks(res.chunks || [])
      } else {
        toast.error(res.error || 'Failed to fetch document contents')
        setPreviewChunks([])
      }
    } catch (err) {
      toast.error('An error occurred loading document chunks')
      setPreviewChunks([])
    } finally {
      setLoadingChunks(false)
    }
  }

  // Load knowledge sources
  const loadSources = async () => {
    setLoading(true)
    try {
      const res = await getKnowledgeSourcesAction()
      if (res.success) {
        setSources(res.sources)
      } else {
        toast.error(res.error || 'Failed to load knowledge sources')
      }
    } catch (err) {
      toast.error('An error occurred loading knowledge library')
    } finally {
      setLoading(false)
    }
  }

  // Load Prompt Configuration
  const loadPrompt = async () => {
    setLoadingPrompt(true)
    try {
      const res = await getPromptAction('rag_rubric_template')
      if (res.success) {
        setPromptText(res.promptText || '')
      } else {
        toast.error(res.error || 'Failed to load custom prompt template')
      }
    } catch (err) {
      toast.error('An error occurred loading prompt settings')
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promptText.trim()) {
      toast.error('Prompt template cannot be empty')
      return
    }
    setSavingPrompt(true)
    try {
      const res = await savePromptAction('rag_rubric_template', promptText)
      if (res.success) {
        toast.success('Custom RAG prompt saved successfully!')
      } else {
        toast.error(res.error || 'Failed to save prompt configuration')
      }
    } catch (err) {
      toast.error('An error occurred saving prompt settings')
    } finally {
      setSavingPrompt(false)
    }
  }

  useEffect(() => {
    loadSources()
    loadPrompt()
  }, [])

  // File Upload Handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a document title')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('access_scope', accessScope)
      formData.append('file', selectedFile)

      const res = await uploadKnowledgeAction(formData)
      if (res.success) {
        toast.success(`Successfully uploaded and chunked ${title}!`)
        setTitle('')
        setSelectedFile(null)
        loadSources()
      } else {
        toast.error(res.error || 'Failed to upload document')
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during file upload')
    } finally {
      setUploading(false)
    }
  }

  // File Deletion Handler
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge source and all its active chunks?')) {
      return
    }

    try {
      const res = await deleteKnowledgeSourceAction(id)
      if (res.success) {
        toast.success('Successfully archived knowledge source.')
        loadSources()
      } else {
        toast.error(res.error || 'Failed to delete knowledge source')
      }
    } catch (err) {
      toast.error('An error occurred during deletion')
    }
  }

  // RAG Search Query Handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const res = await searchKnowledgeAction(searchQuery, searchLimit, searchScopes)
      if (res.success) {
        setSearchResults(res.results)
        if (res.results.length === 0) {
          toast.success('No matching semantic chunks found')
        }
      } else {
        toast.error(res.error || 'Search failed')
      }
    } catch (err) {
      toast.error('An error occurred during semantic search')
    } finally {
      setSearching(false)
    }
  }

  const toggleSearchScope = (scope: string) => {
    if (searchScopes.includes(scope)) {
      if (searchScopes.length > 1) {
        setSearchScopes(searchScopes.filter(s => s !== scope))
      } else {
        toast.error('At least one access scope must be selected')
      }
    } else {
      setSearchScopes([...searchScopes, scope])
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Link href="/admin/library">Back to Curriculum Library</Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">RAG Knowledge Library Hub</h1>
          <p className="text-slate-600 max-w-2xl">
            Upload PDF guidelines, Word documents, Excel rubrics, or Markdown solutions. The AI engine will locally parse, chunk, and index them into semantic vector embeddings for grading RAG context.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-sm">Active Sources: {sources.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'sources'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Document Registry & Search
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'prompts'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Prompt Settings
        </button>
      </div>

      {activeTab === 'sources' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Upload Panel & Search Playground */}
        <div className="lg:col-span-1 space-y-8">
          {/* Upload Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-indigo-600" />
              Ingest Document
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Document Title
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Python PEP 8 Guidelines"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Access Scope
                  </label>
                  <select 
                    value={accessScope}
                    onChange={(e) => setAccessScope(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="organization">Organization</option>
                    <option value="public_safe">Public Safe</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Select File
                  </label>
                  <input 
                    type="file" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0])
                        if (!title) {
                          // Auto title
                          const nameWithoutExt = e.target.files[0].name.replace(/\.[^/.]+$/, "")
                          setTitle(nameWithoutExt.replace(/[-_]/g, ' '))
                        }
                      }
                    }}
                    accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.markdown"
                    className="hidden" 
                    id="rag-file-input"
                  />
                  <label 
                    htmlFor="rag-file-input" 
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    {selectedFile ? selectedFile.name : 'Choose file...'}
                  </label>
                </div>
              </div>

              {selectedFile && (
                <div className="text-[11px] text-slate-400">
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB | Format: {selectedFile.name.split('.').pop()?.toUpperCase()}
                </div>
              )}

              <button 
                type="submit" 
                disabled={uploading || !selectedFile}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing & Indexing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Upload & Build Vector RAG
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RAG Query Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-indigo-600" />
              Hybrid Semantic Search
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. exceptions handling style guidelines"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <button 
                  type="submit" 
                  disabled={searching}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>

              <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settings</div>
                <div className="flex items-center justify-between text-xs">
                  <span>Chunk Limit:</span>
                  <select 
                    value={searchLimit} 
                    onChange={(e) => setSearchLimit(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5"
                  >
                    <option value={3}>3 Chunks</option>
                    <option value={5}>5 Chunks</option>
                    <option value={10}>10 Chunks</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 text-xs pt-1 border-t border-slate-900">
                  <span className="text-slate-500">Allowed Scopes:</span>
                  <div className="flex gap-2 mt-1">
                    {['organization', 'public_safe', 'private'].map(scope => (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => toggleSearchScope(scope)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          searchScopes.includes(scope)
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {scope.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Search Results / Sources Table */}
        <div className="lg:col-span-2 space-y-8">
          {/* Search Results Area */}
          {searchResults.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-600 animate-pulse" />
                  Semantic Search Output (Hybrid RRF Rank)
                </h2>
                <button 
                  onClick={() => setSearchResults([])}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear Results
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {searchResults.map((result, index) => (
                  <div 
                    key={result.chunk_id} 
                    className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-400">#{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const sourceId = result.knowledge_source_id
                            if (!sourceId) {
                              toast.error('Source ID not available in citation metadata')
                              return
                            }
                            const source = sources.find(s => s.id === sourceId)
                            if (source) {
                              setTargetChunkId(result.chunk_id)
                              handleOpenPreview(source)
                            } else {
                              toast.error('Source document not found in registry')
                            }
                          }}
                          className="bg-slate-900 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-800 font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                          title="Click to open document preview and jump to this section"
                        >
                          <Link2 className="w-3 h-3 text-indigo-500" />
                          <span>{result.citation.knowledge_source_title || 'Untitled Source'}</span>
                        </button>
                        {result.heading_path && result.heading_path.length > 0 && (
                          <span className="text-slate-500">
                            &gt; {result.heading_path.join(' > ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                        <span>Rank Score: {result.score.toFixed(4)}</span>
                        {result.matched_terms.length > 0 && (
                          <span className="bg-slate-900 text-emerald-500 px-1 py-0.5 rounded">
                            {result.matched_terms.length} terms matched
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap font-sans bg-slate-950 p-2 rounded border border-slate-900">
                      {result.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Document Registry Directory
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span>Fetching knowledge documents...</span>
              </div>
            ) : sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950">
                <Database className="w-12 h-12 text-slate-700 mb-2" />
                <span className="font-medium text-sm">No knowledge sources registered yet</span>
                <span className="text-xs text-slate-600 mt-1">Upload files to begin mapping AI criteria.</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="min-w-full divide-y divide-slate-800 bg-slate-950">
                  <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-3">Document Title</th>
                      <th className="px-4 py-3">Format</th>
                      <th className="px-4 py-3">Access</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Chunks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {sources.map((source) => (
                      <tr key={source.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-200">{source.title}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{source.original_filename}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-900 px-2 py-0.5 rounded text-xs border border-slate-800 text-slate-400 font-mono font-medium">
                            {source.original_filename.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400 capitalize">
                            {source.access_scope.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            {source.conversion_status === 'converted' ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">Indexed</span>
                              </>
                            ) : source.conversion_status === 'unsupported' ? (
                              <>
                                <HelpCircle className="w-4 h-4 text-amber-500" />
                                <span className="text-amber-500">Unsupported</span>
                              </>
                            ) : source.conversion_status === 'failed' ? (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-red-500">Failed</span>
                              </>
                            ) : (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                <span className="text-slate-400">Processing</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-medium text-indigo-500">
                          {source.chunks_count}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {source.conversion_status === 'converted' && (
                              <button
                                onClick={() => handleOpenPreview(source)}
                                className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 p-1.5 rounded transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                                title="Preview Extracted Text"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(source.id)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-950/20 p-1.5 rounded transition-colors"
                              title="Delete Knowledge Source"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6 max-w-4xl">
          <div className="space-y-2">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100">
              <Settings className="w-5 h-5 text-indigo-500" />
              Custom RAG Rubric Prompt Template
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              This prompt template governs how the AI assistant constructs scoring criteria based on RAG knowledge chunks.
              Modify the template instructions below to change the grading criteria suggestion style, format constraints, or weight logic.
            </p>
          </div>

          <form onSubmit={handleSavePrompt} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                System Prompt Template
              </label>
              {loadingPrompt ? (
                <div className="w-full h-96 bg-slate-950 border border-slate-800 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span>Loading prompt configuration...</span>
                </div>
              ) : (
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full h-96 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                  placeholder="Enter custom RAG prompt instructions..."
                  required
                />
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs text-slate-400 leading-relaxed">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1 text-slate-200">
                <AlertCircle className="w-4 h-4 text-indigo-500" />
                Template Parameters & Injection
              </div>
              <p>
                - The prompt text above serves as the base system instructions for the LLM during rubric generation.
              </p>
              <p>
                - <strong className="text-indigo-400">pedagogical concepts and guidelines (RAG knowledge dossier)</strong> retrieved from your active documents will be appended automatically if matches are found.
              </p>
              <p>
                - <strong className="text-indigo-400">ASSIGNMENT PROMPT</strong> and <strong className="text-indigo-400">SOLUTION KEY</strong> will be passed as the user message.
              </p>
              <p>
                - <strong className="text-amber-500 font-semibold">Strict Rule:</strong> The LLM output must be valid, parseable JSON containing a <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-amber-500">criteria</code> array matching the structure shown above. Changing the structure schema can cause frontend parser failures.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingPrompt || loadingPrompt}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white text-sm font-semibold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {savingPrompt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to reset the prompt text to the default template? (You will still need to click Save to persist changes)')) {
                    setPromptText(DEFAULT_RAG_RUBRIC_TEMPLATE)
                    toast.success('Restored default prompt template. Click Save to persist changes.')
                  }
                }}
                disabled={savingPrompt || loadingPrompt}
                className="border border-slate-800 hover:bg-slate-900 hover:text-slate-200 text-slate-400 text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- PREVIEW MODAL: EXTRACTED TEXT --- */}
      {showPreviewModal && previewingSource && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-950 border border-slate-850 w-full max-w-4xl max-h-[85vh] flex flex-col justify-between rounded-3xl shadow-xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-indigo-550" />
                  Preview: {previewingSource.title}
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-mono">
                  File: {previewingSource.original_filename} | Total Chunks: {previewingSource.chunks_count}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewingSource(null)
                  setPreviewChunks([])
                  setTargetChunkId(null)
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar select-text bg-slate-950">
              {loadingChunks ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs font-semibold gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>Loading parsed chunks...</span>
                </div>
              ) : previewChunks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                  No text content found for this document.
                </div>
              ) : (
                <div className="space-y-6">
                  {previewChunks.map((chunk, idx) => (
                    <div 
                      key={chunk.id || idx} 
                      id={`chunk-${chunk.id}`}
                      className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-2 hover:border-slate-705 transition-colors scroll-mt-6"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 pb-1.5 border-b border-slate-850/50">
                        <span>CHUNK #{chunk.position || idx + 1}</span>
                        {chunk.heading_path && chunk.heading_path.length > 0 && (
                          <span className="truncate max-w-[70%]">
                            Path: {chunk.heading_path.join(' > ')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs leading-relaxed text-slate-300 font-mono whitespace-pre-wrap pt-1 select-text">
                        {chunk.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewingSource(null)
                  setPreviewChunks([])
                  setTargetChunkId(null)
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-100 font-bold text-xs transition-colors"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
