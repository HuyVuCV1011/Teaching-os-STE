'use client'

import React, { useState } from 'react'
import { Search, X, Pin, PinOff, Clipboard, Check, Sparkles } from 'lucide-react'
import { searchKnowledgeAction } from '@/app/admin/library/actions/knowledge'
import { toast } from 'react-hot-toast'

interface SemanticSearchDrawerProps {
  isOpen: boolean
  onClose: () => void
  onPinChunk?: (chunk: KnowledgeSearchChunk) => void
  pinnedChunks?: KnowledgeSearchChunk[]
  onUnpinChunk?: (chunkId: string) => void
}

interface KnowledgeSearchChunk {
  chunk_id: string
  content: string
  score?: number | string | null
  citation?: {
    knowledge_source_title?: string | null
  } | null
}

export function SemanticSearchDrawer({
  isOpen,
  onClose,
  onPinChunk,
  pinnedChunks = [],
  onUnpinChunk
}: SemanticSearchDrawerProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<KnowledgeSearchChunk[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    try {
      const res = await searchKnowledgeAction(query)
      if (res.success) {
        setResults(res.results || [])
      } else {
        throw new Error(res.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vui lòng thử lại.'
      toast.error(`Tìm kiếm thất bại: ${message}`)
    } finally {
      setSearching(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-950 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all duration-300 animate-slide-in text-slate-100">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
              Pedagogical RAG Reference Drawer
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Search and pin teaching notes to guide generation
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-5 border-b border-slate-900 bg-slate-950">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search active synapses..."
            className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-2.5 top-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all"
          >
            {searching ? (
              <span className="w-3.5 h-3.5 block rounded-full border border-t-transparent border-white animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Pinned Section */}
        {pinnedChunks.length > 0 && (
          <div className="space-y-2 border-b border-slate-900 pb-4">
            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <Pin className="w-3 h-3 rotate-45 text-blue-600" /> Pinned Chunks Context ({pinnedChunks.length})
            </h4>
            <div className="space-y-2">
              {pinnedChunks.map((chunk) => (
                <div key={chunk.chunk_id} className="p-3 bg-blue-500/5 border border-blue-500/30 rounded-xl flex justify-between items-start gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                      {chunk.content}
                    </p>
                    <span className="text-[9px] text-slate-500 font-bold block">
                      {chunk.citation?.knowledge_source_title || 'Direct Note'}
                    </span>
                  </div>
                  {onUnpinChunk && (
                    <button
                      onClick={() => onUnpinChunk(chunk.chunk_id)}
                      className="p-1 rounded bg-slate-900 text-slate-500 hover:text-red-500 transition-colors"
                      title="Unpin Note"
                    >
                      <PinOff className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {searching ? (
          <div className="flex justify-center items-center py-20 text-slate-500 text-xs font-semibold gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" /> Querying RRF similarity engines...
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Synaptic Search Results ({results.length})
            </h4>
            {results.map((res, idx) => {
              const isPinned = pinnedChunks.some(pc => pc.chunk_id === res.chunk_id)
              return (
                <div key={res.chunk_id} className="p-4 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-xl space-y-3 relative group transition-colors shadow-inner">
                  
                  {/* Top Bar */}
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase">
                      Rank {idx + 1}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Score: {typeof res.score === 'number' ? res.score.toFixed(4) : res.score}
                    </span>
                  </div>

                  {/* Body Text */}
                  <div className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-850/80 max-h-[140px] overflow-y-auto">
                    {res.content}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[9px] text-slate-500 font-bold block line-clamp-1 max-w-[200px]">
                      Source: {res.citation?.knowledge_source_title || 'Pedagogical Guide'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(res.content, res.chunk_id)}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
                        title="Copy to Clipboard"
                      >
                        {copiedId === res.chunk_id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Clipboard className="w-3 h-3" />
                        )}
                      </button>
                      {onPinChunk && (
                        <button
                          onClick={() => isPinned ? onUnpinChunk?.(res.chunk_id) : onPinChunk(res)}
                          className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center ${
                            isPinned
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-200'
                          }`}
                          title={isPinned ? "Pinned" : "Pin context to prompt"}
                        >
                          <Pin className="w-3 h-3 rotate-45" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : query ? (
          <div className="text-center py-20 text-slate-500 text-xs font-semibold">
            No matching vector synaptic chunks found.
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs font-medium border border-dashed border-slate-850 rounded-2xl bg-slate-900/10">
            Playground empty. Run a search above to discover knowledge library guides.
          </div>
        )}
      </div>

    </div>
  )
}
