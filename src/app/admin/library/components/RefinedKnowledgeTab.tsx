'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  discoverKnowledgeSourcesAction,
  generateRefinedKnowledgeAction,
  commitRefinedKnowledgeAction,
  fetchRefinedTopicsAndEntriesAction,
  updateRefinedEntryAction,
  deleteRefinedEntryAction,
  RefinedEntryProposal,
  DiscoveredSource
} from '../actions/refined_knowledge'
import {
  Sparkles,
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Edit3,
  Compass,
  Link as LinkIcon,
  Tag,
  Folder,
  Layers,
  ChevronDown
} from 'lucide-react'

interface Subject {
  id: string
  name: string
  domain_id: string | null
}

interface Domain {
  id: string
  name: string
  description?: string
}

interface ConceptLink {
  source_type: string
  source_id: string
}

interface ConceptEntry {
  id: string
  subject_id: string | null
  topic_id: string | null
  title: string
  summary: string
  content: string
  knowledge_type: string
  version: number
  tags: string[]
  prerequisites: string[]
  links?: ConceptLink[]
}

const AI_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Google)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Google)' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq)' },
  { value: 'openrouter/deepseek/deepseek-chat', label: 'DeepSeek V3 (OpenRouter)' },
  { value: 'openrouter/google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (OpenRouter)' },
  { value: 'ollama', label: 'Ollama (Local Llama)' },
]

const KNOWLEDGE_TYPE_BADGES: Record<string, { label: string; style: string }> = {
  definition: { label: 'Definition', style: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  procedure: { label: 'Procedure', style: 'bg-amber-50 border-amber-200 text-amber-700' },
  rule: { label: 'Rule', style: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  formula: { label: 'Formula', style: 'bg-blue-50 border-blue-200 text-blue-700' },
  example: { label: 'Example', style: 'bg-rose-50 border-rose-200 text-rose-700' },
  code_pattern: { label: 'Code Pattern', style: 'bg-slate-100 border-slate-300 text-slate-700' },
}

export function RefinedKnowledgeTab() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [entries, setEntries] = useState<ConceptEntry[]>([])
  const [sources, setSources] = useState<DiscoveredSource[]>([])
  
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash')
  const [currentSubTab, setCurrentSubTab] = useState<'queue' | 'library'>('queue')
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)

  // Filters
  const [queueFilterType, setQueueFilterType] = useState<string>('all')
  const [queueFilterStatus, setQueueFilterStatus] = useState<string>('all')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [libraryTypeFilter, setLibraryTypeFilter] = useState('')

  // Expanded Tree Node States
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({})
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})
  const [selectedConcept, setSelectedConcept] = useState<ConceptEntry | null>(null)

  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [proposedEntries, setProposedEntries] = useState<RefinedEntryProposal[]>([])
  const [acceptedIndices, setAcceptedIndices] = useState<number[]>([])
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<RefinedEntryProposal | null>(null)
  const [committing, setCommitting] = useState(false)

  const [showEditEntryModal, setShowEditEntryModal] = useState(false)
  const [editingLibraryEntry, setEditingLibraryEntry] = useState<ConceptEntry | null>(null)

  // Fetch functions
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch Raw Sources
      const sourcesRes = await discoverKnowledgeSourcesAction()
      if (sourcesRes.success) {
        setSources((sourcesRes.sources || []) as DiscoveredSource[])
      }

      // Fetch Domains, Subjects, Entries
      const libRes = await fetchRefinedTopicsAndEntriesAction()
      if (libRes.success) {
        setDomains((libRes.domains || []) as Domain[])
        setSubjects((libRes.subjects || []) as Subject[])
        setEntries((libRes.entries || []) as ConceptEntry[])
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleSource = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllSources = () => {
    const visibleSources = sources.filter(s => {
      const typeMatches = queueFilterType === 'all' || s.type === queueFilterType
      const statusMatches = queueFilterStatus === 'all' || 
        (queueFilterStatus === 'processed' ? s.isProcessed : !s.isProcessed)
      return typeMatches && statusMatches
    })
    const visibleIds = visibleSources.map(s => s.id)
    const allSelected = visibleIds.every(id => selectedSourceIds.includes(id))
    
    if (allSelected) {
      setSelectedSourceIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedSourceIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleBatchRefine = useCallback(async () => {
    if (selectedSourceIds.length === 0) return

    setRefining(true)
    try {
      const selectedSources = sources.filter(s => selectedSourceIds.includes(s.id))
      const res = await generateRefinedKnowledgeAction(
        undefined, // subjectId resolved dynamically by AI
        selectedSources.map(s => ({ id: s.id, type: s.type, title: s.title })),
        selectedModel
      )

      if (res.success && res.entries) {
        const entriesWithActions = (res.entries || []) as RefinedEntryProposal[]
        setProposedEntries(entriesWithActions)
        setAcceptedIndices(entriesWithActions.map((_, idx) => idx))
        setShowReviewModal(true)
      } else {
        alert(`Extraction failed: ${res.error || 'Check server connection.'}`)
      }
    } catch (err) {
      const error = err as Error
      alert(`Generation failed: ${error.message}`)
    } finally {
      setRefining(false)
    }
  }, [selectedSourceIds, selectedModel, sources])

  const handleCommitRefinedEntries = async () => {
    if (acceptedIndices.length === 0) return

    setCommitting(true)
    try {
      const entriesToCommit = proposedEntries.filter((_, idx) => acceptedIndices.includes(idx))
      const res = await commitRefinedKnowledgeAction(
        '', // subjectId resolved dynamically
        entriesToCommit,
        selectedSourceIds
      )

      if (res.success) {
        alert('Refined concepts committed successfully!')
        setShowReviewModal(false)
        setProposedEntries([])
        setSelectedSourceIds([])
        fetchData()
      } else {
        alert(`Save failed: ${res.error}`)
      }
    } catch (err) {
      const error = err as Error
      alert(`Save failed: ${error.message}`)
    } finally {
      setCommitting(false)
    }
  }



  const handleSaveLibraryEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLibraryEntry) return

    try {
      const res = await updateRefinedEntryAction(editingLibraryEntry.id, {
        title: editingLibraryEntry.title,
        summary: editingLibraryEntry.summary,
        content: editingLibraryEntry.content,
        knowledge_type: editingLibraryEntry.knowledge_type,
        tags: editingLibraryEntry.tags,
        prerequisites: editingLibraryEntry.prerequisites,
        version: editingLibraryEntry.version,
        topic_id: editingLibraryEntry.topic_id,
        subject_id: editingLibraryEntry.subject_id
      } as RefinedEntryProposal)
      
      if (res.success) {
        setShowEditEntryModal(false)
        setEditingLibraryEntry(null)
        if (selectedConcept && selectedConcept.id === editingLibraryEntry.id) {
          setSelectedConcept(editingLibraryEntry)
        }
        fetchData()
      } else {
        alert(`Failed: ${res.error}`)
      }
    } catch (err) {
      const error = err as Error
      alert(`Failed to save: ${error.message}`)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to archive this concept? It will be hidden from tutor query systems.')) return

    try {
      const res = await deleteRefinedEntryAction(id)
      if (res.success) {
        if (selectedConcept && selectedConcept.id === id) {
          setSelectedConcept(null)
        }
        fetchData()
      } else {
        alert(`Failed: ${res.error}`)
      }
    } catch (err) {
      const error = err as Error
      alert(`Failed to archive: ${error.message}`)
    }
  }

  const toggleDomainExpand = (id: string) => {
    setExpandedDomains(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSubjectExpand = (id: string) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter Queue Sources
  const filteredSources = sources.filter(s => {
    const matchesType = queueFilterType === 'all' || s.type === queueFilterType
    const matchesStatus = queueFilterStatus === 'all' || 
      (queueFilterStatus === 'processed' ? s.isProcessed : !s.isProcessed)
    return matchesType && matchesStatus
  })

  // Grouping & Filtering for Concept Tree
  const domainSubjectsMap = subjects.reduce((acc, curr) => {
    const dId = curr.domain_id || 'unassigned'
    if (!acc[dId]) acc[dId] = []
    acc[dId].push(curr)
    return acc
  }, {} as Record<string, Subject[]>)

  const subjectEntriesMap = entries.reduce((acc, curr) => {
    const sId = curr.subject_id || 'unassigned'
    if (!acc[sId]) acc[sId] = []
    acc[sId].push(curr)
    return acc
  }, {} as Record<string, ConceptEntry[]>)

  // Filter Concepts
  const filterConcept = (e: ConceptEntry) => {
    const matchesType = libraryTypeFilter ? e.knowledge_type === libraryTypeFilter : true
    const matchesSearch = librarySearchQuery
      ? e.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
        e.summary.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(librarySearchQuery.toLowerCase()))
      : true
    return matchesType && matchesSearch
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-100 bg-slate-955 p-6 border border-slate-800/40 rounded-3xl shadow-sm">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-blue-650 animate-pulse" /> Self-Evolving Knowledge Engine
          </h2>
          <p className="text-xs text-slate-550 font-medium mt-0.5">
            The proactive system automatically discovers raw document outputs and extracts a structured pedagogical domain tree.
          </p>
        </div>


      </div>

      {/* Main Tab Pill Capsule Navigation */}
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-850 p-1.5 rounded-2xl w-full">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentSubTab('queue')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              currentSubTab === 'queue'
                ? 'bg-slate-950 border border-slate-800 text-blue-600 shadow-sm'
                : 'text-slate-550 hover:text-slate-350 hover:bg-slate-900/10'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Document Ingestion Queue ({sources.length})</span>
          </button>
          <button
            onClick={() => setCurrentSubTab('library')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              currentSubTab === 'library'
                ? 'bg-slate-950 border border-slate-800 text-blue-600 shadow-sm'
                : 'text-slate-550 hover:text-slate-350 hover:bg-slate-900/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Browsable Knowledge Tree</span>
          </button>
        </div>
      </div>

      {/* Workspace */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Connecting to Curricular Synapses...
        </div>
      ) : (
        <>
          {/* Sub-tab 1: Ingestion Queue */}
          {currentSubTab === 'queue' && (
            <div className="space-y-6">
              
              {/* Batch Action Bar */}
              <div className="p-5 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-inner">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Type:</label>
                    <select
                      value={queueFilterType}
                      onChange={(e) => setQueueFilterType(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="lesson">Lessons</option>
                      <option value="canonical_material">Materials</option>
                      <option value="assignment">Assignments</option>
                      <option value="knowledge_source">Uploads</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Status:</label>
                    <select
                      value={queueFilterStatus}
                      onChange={(e) => setQueueFilterStatus(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="unprocessed">Unprocessed</option>
                      <option value="processed">Processed</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={handleSelectAllSources}
                    className="px-4 py-2.5 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold transition-all text-slate-400"
                  >
                    Toggle Selection
                  </button>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400 font-bold hover:border-slate-700 focus:outline-none cursor-pointer"
                  >
                    {AI_MODEL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleBatchRefine}
                    disabled={selectedSourceIds.length === 0 || refining}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-555 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {refining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Secretary Working...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Batch Refine ({selectedSourceIds.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Source List */}
              {filteredSources.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/10 text-slate-500 text-xs font-semibold">
                  No discovered documents matching the selected filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSources.map((source) => {
                    const isSelected = selectedSourceIds.includes(source.id)
                    return (
                      <div
                        key={source.id}
                        onClick={() => handleToggleSource(source.id)}
                        className={`p-5 rounded-2xl border cursor-pointer select-none transition-all duration-300 flex flex-col justify-between gap-4 bg-slate-900/60 ${
                          isSelected
                            ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-500/5'
                            : 'border-slate-850 hover:border-slate-750 hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center w-full">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                              source.type === 'lesson'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : source.type === 'assignment'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : source.type === 'canonical_material'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                              {source.type.replace('_', ' ')}
                            </span>

                            {source.isProcessed ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                <CheckCircle className="w-3.5 h-3.5" /> Already Refined
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" /> Unprocessed
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-100 text-sm leading-snug line-clamp-1">{source.title}</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">{source.summary}</p>
                          </div>
                        </div>

                        {source.isProcessed && source.linkedConcepts && source.linkedConcepts.length > 0 && (
                          <div className="border-t border-slate-900/60 pt-3 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[8px] font-bold text-slate-500 font-mono uppercase tracking-wider">Synapses:</span>
                            {source.linkedConcepts.map((c) => (
                              <span key={c.entryId} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 text-[9px] text-slate-350 font-semibold max-w-[120px] truncate">
                                {c.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Refined Concept Library (Domain -> Subject -> Concept Tree) */}
          {currentSubTab === 'library' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Domain & Subject Tree */}
              <div className="lg:col-span-5 p-5 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col justify-start space-y-4 shadow-sm h-[580px] overflow-y-auto">
                <div className="pb-2 border-b border-slate-800/60 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Domains & Subjects taxonomy</span>
                </div>

                <div className="space-y-2">
                  
                  {/* Domains Loop */}
                  {domains.map((dom) => {
                    const domSubs = domainSubjectsMap[dom.id] || []
                    const isExpanded = expandedDomains[dom.id]
                    
                    return (
                      <div key={dom.id} className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                        {/* Domain Header Accordion */}
                        <div
                          onClick={() => toggleDomainExpand(dom.id)}
                          className="flex justify-between items-center px-4 py-3 bg-slate-900/50 hover:bg-slate-900 cursor-pointer transition-colors border-b border-slate-850/50"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="text-xs font-extrabold text-slate-200 tracking-wide">{dom.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-850">{domSubs.length} Subjects</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Subject Accordions */}
                        {isExpanded && (
                          <div className="p-2 space-y-1 bg-slate-950/40">
                            {domSubs.length === 0 ? (
                              <p className="text-[10px] text-slate-600 px-4 py-2 italic">No subjects in this domain yet.</p>
                            ) : (
                              domSubs.map((sub) => {
                                const subEnts = (subjectEntriesMap[sub.id] || []).filter(filterConcept)
                                const isSubExpanded = expandedSubjects[sub.id]
                                
                                return (
                                  <div key={sub.id} className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/30">
                                    <div
                                      onClick={() => toggleSubjectExpand(sub.id)}
                                      className="flex justify-between items-center px-3 py-2 hover:bg-slate-900/80 cursor-pointer transition-colors"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Folder className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="text-[11px] font-semibold text-slate-300 truncate">{sub.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-bold text-slate-600">({subEnts.length})</span>
                                        <ChevronDown className={`w-3 h-3 text-slate-650 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                                      </div>
                                    </div>

                                    {/* Concept Nodes */}
                                    {isSubExpanded && (
                                      <div className="px-2 py-1 space-y-0.5 border-t border-slate-900/40">
                                        {subEnts.length === 0 ? (
                                          <p className="text-[9px] text-slate-600 pl-4 py-1 italic">No active concepts found.</p>
                                        ) : (
                                          subEnts.map((ent) => {
                                            const isConceptSelected = selectedConcept?.id === ent.id
                                            return (
                                              <button
                                                key={ent.id}
                                                onClick={() => setSelectedConcept(ent)}
                                                className={`w-full text-left pl-6 pr-3 py-1.5 rounded-md text-[10px] font-medium flex items-center justify-between transition-all ${
                                                  isConceptSelected
                                                    ? 'text-blue-500 bg-blue-650/10 font-bold border border-blue-500/10'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                                                }`}
                                              >
                                                <span className="truncate">{ent.title}</span>
                                                <span className="text-[8px] text-slate-550 border border-slate-800 px-1 py-0.2 rounded font-mono uppercase">V{ent.version}</span>
                                              </button>
                                            )
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Unassigned Subjects Group */}
                  {domainSubjectsMap['unassigned'] && domainSubjectsMap['unassigned'].length > 0 && (
                    <div className="border border-dashed border-slate-800 rounded-xl overflow-hidden bg-slate-950/10">
                      <div
                        onClick={() => toggleDomainExpand('unassigned')}
                        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-900 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-500 italic">Unassigned Subjects</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expandedDomains['unassigned'] ? 'rotate-180' : ''}`} />
                      </div>
                      {expandedDomains['unassigned'] && (
                        <div className="p-2 space-y-1 bg-slate-950/20">
                          {domainSubjectsMap['unassigned'].map((sub) => {
                            const subEnts = (subjectEntriesMap[sub.id] || []).filter(filterConcept)
                            const isSubExpanded = expandedSubjects[sub.id]
                            
                            return (
                              <div key={sub.id} className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/20">
                                <div
                                  onClick={() => toggleSubjectExpand(sub.id)}
                                  className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-slate-900/80 transition-colors"
                                >
                                  <span className="text-[11px] font-semibold text-slate-400 truncate">{sub.name}</span>
                                  <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                                </div>
                                {isSubExpanded && (
                                  <div className="px-2 py-1 space-y-0.5 border-t border-slate-900/20">
                                    {subEnts.map(ent => (
                                      <button
                                        key={ent.id}
                                        onClick={() => setSelectedConcept(ent)}
                                        className={`w-full text-left pl-6 pr-3 py-1.5 rounded-md text-[10px] font-medium flex items-center justify-between transition-all ${
                                          selectedConcept?.id === ent.id ? 'text-blue-500 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        <span className="truncate">{ent.title}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Concept Detail Inspector */}
              <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                
                {/* Search Bar / Types Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="sm:col-span-2 relative">
                    <input
                      type="text"
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      placeholder="Search concepts in tree..."
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>

                  <select
                    value={libraryTypeFilter}
                    onChange={(e) => setLibraryTypeFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-400 font-medium focus:outline-none hover:border-slate-700 cursor-pointer"
                  >
                    <option value="">All Concept Types</option>
                    <option value="definition">Definition</option>
                    <option value="procedure">Procedure</option>
                    <option value="rule">Rule</option>
                    <option value="formula">Formula</option>
                    <option value="example">Example</option>
                    <option value="code_pattern">Code Pattern</option>
                  </select>
                </div>

                {/* Main Inspector Box */}
                <div className="flex-1 bg-slate-900/30 border border-slate-850 rounded-2xl p-6 h-[520px] overflow-y-auto">
                  {selectedConcept ? (
                    <div className="space-y-6 select-text">
                      <div className="flex justify-between items-start w-full border-b border-slate-800 pb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                              KNOWLEDGE_TYPE_BADGES[selectedConcept.knowledge_type]?.style || 'bg-slate-950 border-slate-850 text-slate-400'
                            }`}>
                              {KNOWLEDGE_TYPE_BADGES[selectedConcept.knowledge_type]?.label || selectedConcept.knowledge_type}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold border border-slate-800 bg-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                              Subject: {subjects.find(s => s.id === selectedConcept.subject_id)?.name || 'Unassigned'}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-100 text-lg leading-snug">{selectedConcept.title}</h3>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingLibraryEntry({ ...selectedConcept })
                              setShowEditEntryModal(true)
                            }}
                            className="p-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-500 hover:text-blue-500 transition-colors"
                            title="Edit Concept"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(selectedConcept.id)}
                            className="p-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-500 hover:text-red-500 transition-colors"
                            title="Archive Concept"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">Summary Outline</h5>
                        <p className="text-xs text-slate-350 leading-relaxed font-semibold">{selectedConcept.summary}</p>
                      </div>

                      {/* Main Detail Content */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">Detailed Content</h5>
                        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                          {selectedConcept.content}
                        </div>
                      </div>

                      {/* Prerequisites */}
                      {selectedConcept.prerequisites && selectedConcept.prerequisites.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">Prerequisite Concepts</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedConcept.prerequisites.map((prereq, pIdx) => (
                              <span key={pIdx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-[9px] text-slate-400 font-semibold">
                                {prereq}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cross-cutting Relational Tags */}
                      {selectedConcept.tags && selectedConcept.tags.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">Tags</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedConcept.tags.map((tg, tgIdx) => (
                              <span key={tgIdx} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-500 font-bold flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5" />
                                <span>#{tg}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source Provenance origins */}
                      {selectedConcept.links && selectedConcept.links.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-slate-900/60">
                          <h5 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">Provenance Traceability</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedConcept.links.map((lnk, lidx) => (
                              <span key={lidx} className="px-2 py-1 rounded bg-slate-950 border border-slate-900 text-[10px] text-slate-400 font-bold flex items-center gap-1.5" title={`Source ID: ${lnk.source_id}`}>
                                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                                <span>{lnk.source_type.replace('_', ' ')}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 space-y-2">
                      <Layers className="w-8 h-8 text-slate-650 animate-pulse" />
                      <span className="text-xs font-semibold">Select a concept from the tree taxonomy to explore details, prerequisites, and source provenance.</span>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </>
      )}

      {/* --- MODAL 1: BATCH INGESTION REVIEW --- */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-950 border border-slate-850 w-full max-w-5xl max-h-[680px] flex flex-col justify-between rounded-3xl shadow-xl overflow-hidden animate-scale-up">
            
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-blue-650 animate-pulse" /> Review Proposed Concept Synapses ({proposedEntries.length})
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Edit proposed changes, check target actions, and select which items to commit to the library.</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-550 hover:text-slate-350 text-xs font-bold font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch custom-scrollbar">
              
              {/* Left List Pane */}
              <div className="lg:col-span-5 border border-slate-850 rounded-2xl overflow-y-auto p-4 space-y-2.5 h-[420px]">
                {proposedEntries.map((entry, idx) => {
                  const isAccepted = acceptedIndices.includes(idx)
                  const isEditing = editingEntryIndex === idx
                  const actionType = entry.action || 'create'

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs transition-all flex flex-col gap-2 relative ${
                        isEditing
                          ? 'border-blue-500 bg-blue-500/5'
                          : isAccepted
                          ? 'border-slate-800 bg-slate-900/60'
                          : 'border-slate-850 opacity-40 hover:opacity-60 bg-slate-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <label className="flex items-center gap-2 font-bold text-slate-250 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAccepted}
                            onChange={() => {
                              setAcceptedIndices(prev =>
                                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                              )
                            }}
                            className="rounded border-slate-800 text-blue-600 focus:ring-blue-600/20 bg-slate-950"
                          />
                          <span className="truncate max-w-[130px]">{entry.title || 'Concept'}</span>
                        </label>

                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                          actionType === 'create'
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                            : actionType === 'update'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-amber-50 border-amber-250 text-amber-700'
                        }`}>
                          {actionType}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 text-[9px] text-slate-500">
                        <span>Domain: {entry.domain_name}</span>
                        <span>Subject: {entry.subject_name}</span>
                      </div>

                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 font-medium leading-relaxed">{entry.summary || 'Summary outline extracted.'}</p>
                      
                      <div className="flex justify-end gap-2 border-t border-slate-900/40 pt-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntryIndex(idx)
                            setEditForm({ ...entry })
                          }}
                          className="px-2.5 py-1 rounded bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        >
                          Workspace Edit
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Right Edit Workspace Pane */}
              <div className="lg:col-span-7 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between h-[420px]">
                {editingEntryIndex !== null && editForm ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono block">Edit Concept Workspace</span>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concept Title</label>
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concept Type</label>
                          <select
                            value={editForm.knowledge_type || 'definition'}
                            onChange={(e) => setEditForm({ ...editForm, knowledge_type: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none"
                          >
                            <option value="definition">Definition</option>
                            <option value="procedure">Procedure</option>
                            <option value="rule">Rule</option>
                            <option value="formula">Formula</option>
                            <option value="example">Example</option>
                            <option value="code_pattern">Code Pattern</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Domain</label>
                          <input
                            type="text"
                            value={editForm.domain_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, domain_name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Subject</label>
                          <input
                            type="text"
                            value={editForm.subject_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, subject_name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concept Summary</label>
                        <textarea
                          rows={2}
                          value={editForm.summary || ''}
                          onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 resize-none focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Content (Markdown)</label>
                        <textarea
                          rows={4}
                          value={editForm.content || ''}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-slate-255 font-mono resize-none focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-900/60 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntryIndex(null)
                          setEditForm(null)
                        }}
                        className="px-4 py-2 border border-slate-850 text-slate-505 hover:text-slate-250 font-bold text-xs rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProposedEntries(prev => {
                            const clone = [...prev]
                            if (editingEntryIndex !== null && editForm) {
                              clone[editingEntryIndex] = { ...editForm }
                            }
                            return clone
                          })
                          setEditingEntryIndex(null)
                          setEditForm(null)
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-505 text-white font-bold text-xs rounded-xl"
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 space-y-2">
                    <Compass className="w-8 h-8 text-slate-650 animate-pulse" />
                    <span className="text-xs font-semibold">Select a concept on the left to edit its details before committing.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-5 py-2.5 border border-slate-850 text-slate-505 hover:text-slate-250 font-bold text-xs rounded-xl"
              >
                Discard All
              </button>
              <button
                type="button"
                onClick={handleCommitRefinedEntries}
                disabled={acceptedIndices.length === 0 || committing}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 animate-pulse"
              >
                {committing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Commit Refined Entries ({acceptedIndices.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* --- MODAL 4: EDIT CONCEPT ENTRY --- */}
      {showEditEntryModal && editingLibraryEntry && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-center items-center p-4">
          <form onSubmit={handleSaveLibraryEdit} className="bg-slate-950 border border-slate-850 w-full max-w-2xl p-6 rounded-3xl shadow-xl space-y-4 animate-scale-up">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" /> Edit Concept Entry
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concept Title</label>
                <input
                  type="text"
                  required
                  value={editingLibraryEntry.title}
                  onChange={(e) => setEditingLibraryEntry({ ...editingLibraryEntry, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject Segment Classification</label>
                <select
                  value={editingLibraryEntry.subject_id || ''}
                  onChange={(e) => setEditingLibraryEntry({ ...editingLibraryEntry, subject_id: e.target.value || null })}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concept Type</label>
                <select
                  value={editingLibraryEntry.knowledge_type}
                  onChange={(e) => setEditingLibraryEntry({ ...editingLibraryEntry, knowledge_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 focus:outline-none"
                >
                  <option value="definition">Definition</option>
                  <option value="procedure">Procedure</option>
                  <option value="rule">Rule</option>
                  <option value="formula">Formula</option>
                  <option value="example">Example</option>
                  <option value="code_pattern">Code Pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editingLibraryEntry.tags ? editingLibraryEntry.tags.join(', ') : ''}
                  onChange={(e) => setEditingLibraryEntry({
                    ...editingLibraryEntry,
                    tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none"
                  placeholder="e.g. lists, slicing, syntax"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Summary Description</label>
              <textarea
                rows={2}
                value={editingLibraryEntry.summary || ''}
                onChange={(e) => setEditingLibraryEntry({ ...editingLibraryEntry, summary: e.target.value })}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 resize-none focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Content Detail (Markdown)</label>
              <textarea
                rows={5}
                required
                value={editingLibraryEntry.content}
                onChange={(e) => setEditingLibraryEntry({ ...editingLibraryEntry, content: e.target.value })}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-slate-255 font-mono resize-none focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditEntryModal(false)
                  setEditingLibraryEntry(null)
                }}
                className="px-4 py-2 border border-slate-850 text-slate-505 hover:text-slate-200 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-650 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
