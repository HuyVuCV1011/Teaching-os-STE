'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { formatDate, formatTime } from '@/lib/date'
import { getSupabaseFetchErrorMessage } from '@/lib/error-messages'
import React from 'react'
import {
  GraduationCap,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Cpu,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { listGradingQueueAdminAction, triggerAIGradingAction } from './actions'

export default function GradingQueue() {
  type CohortRow = {
    id: string
    name?: string | null
    class_code?: string | null
  }

  type SubmissionQueueRow = {
    id: string
    class_id?: string | null
    student_identifier?: string | null
    submitted_at?: string | null
    status?: string | null
    classes?: CohortRow | null
    assignments?: {
      title?: string | null
    } | null
  }

  const [submissions, setSubmissions] = useState<SubmissionQueueRow[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [loading, setLoading] = useState(true)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [gradingStatus, setGradingStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'failed'>>({})

  // Search, Filters & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCohort, setSelectedCohort] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [urlStateHydrated, setUrlStateHydrated] = useState(false)
  const itemsPerPage = 10

  // Read initial query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q')
      const cohort = params.get('cohort')
      const status = params.get('status')
      const page = params.get('page')

      if (q) setSearchQuery(q)
      if (cohort) setSelectedCohort(cohort)
      if (status) setSelectedStatus(status)
      if (page) {
        const parsedPage = parseInt(page, 10)
        if (parsedPage > 0) setCurrentPage(parsedPage)
      }
      setUrlStateHydrated(true)
    }
  }, [])

  // Sync state changes to URL search params
  useEffect(() => {
    if (typeof window !== 'undefined' && urlStateHydrated) {
      const params = new URLSearchParams()
      if (searchQuery.trim() !== '') params.set('q', searchQuery.trim())
      if (selectedCohort !== 'all') params.set('cohort', selectedCohort)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      if (currentPage > 1) params.set('page', currentPage.toString())

      const queryString = params.toString()
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
      window.history.replaceState(null, '', newUrl)
    }
  }, [searchQuery, selectedCohort, selectedStatus, currentPage, urlStateHydrated])

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setQueueError(null)
    try {
      const result = await listGradingQueueAdminAction()
      if (!result.success) throw new Error(result.error)
      setSubmissions(result.data.submissions as SubmissionQueueRow[])
      setCohorts(result.data.cohorts as CohortRow[])
    } catch (err) {
      const message = getSupabaseFetchErrorMessage(err, 'Không thể tải hàng đợi chấm bài.')
      console.warn('Unable to load submissions queue:', message)
      setQueueError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleSingleAIGrade = async (submissionId: string) => {
    setGradingStatus((prev) => ({ ...prev, [submissionId]: 'running' }))
    try {
      await triggerAIGradingAction(submissionId, selectedModel)
      setGradingStatus((prev) => ({ ...prev, [submissionId]: 'success' }))
      toast.success('AI grading run successfully completed!')
      fetchSubmissions()
    } catch (err) {
      console.error(err)
      setGradingStatus((prev) => ({ ...prev, [submissionId]: 'failed' }))
      toast.error(`AI grading failed: ${err instanceof Error ? err.message : 'Unknown grading error'}`)
    }
  }

  const handleBatchAIGrade = async () => {
    if (selectedSubmissions.length === 0) return
    const idsToGrade = [...selectedSubmissions]
    setSelectedSubmissions([])

    const initialStatuses = { ...gradingStatus }
    idsToGrade.forEach((id) => {
      initialStatuses[id] = 'running'
    })
    setGradingStatus(initialStatuses)

    let successCount = 0
    let failureCount = 0

    for (const submissionId of idsToGrade) {
      try {
        await triggerAIGradingAction(submissionId, selectedModel)
        setGradingStatus((prev) => ({ ...prev, [submissionId]: 'success' }))
        successCount++
      } catch (err) {
        console.error(`AI grading failed for ${submissionId}:`, err)
        setGradingStatus((prev) => ({ ...prev, [submissionId]: 'failed' }))
        failureCount++
      }
    }

    toast.success(`Batch AI grading finished. Successes: ${successCount}, Failures: ${failureCount}`)
    fetchSubmissions()
  }

  const toggleSelectSubmission = (id: string) => {
    setSelectedSubmissions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Filter Submissions
  const filteredSubmissions = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return submissions.filter((sub) => {
      const matchSearch = normalizedSearch === '' ||
        String(sub.student_identifier || '').toLowerCase().includes(normalizedSearch) ||
        String(sub.assignments?.title || '').toLowerCase().includes(normalizedSearch)

      const matchCohort = selectedCohort === 'all' || sub.class_id === selectedCohort
      const matchStatus = selectedStatus === 'all' || sub.status === selectedStatus

      return matchSearch && matchCohort && matchStatus
    })
  }, [submissions, searchQuery, selectedCohort, selectedStatus])

  // Sort Submissions: Priority to Submitted/Pending, sorted oldest first (first in first out). Graded sorted newest first.
  const sortedSubmissions = React.useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      const aWeight = a.status === 'graded' ? 1 : 0
      const bWeight = b.status === 'graded' ? 1 : 0

      if (aWeight !== bWeight) {
        return aWeight - bWeight
      }

      const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
      const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0

      if (aWeight === 0) {
        return aTime - bTime // Oldest pending first
      } else {
        return bTime - aTime // Newest graded first
      }
    })
  }, [filteredSubmissions])

  const totalPages = Math.max(1, Math.ceil(sortedSubmissions.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const siblingCount = 1

    if (totalPages <= 5) {
      for (let page = 1; page <= totalPages; page++) {
        pages.push(page)
      }
    } else {
      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)
      const shouldShowLeftDots = leftSiblingIndex > 2
      const shouldShowRightDots = rightSiblingIndex < totalPages - 1

      if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount
        pages.push(
          ...Array.from({ length: leftItemCount }, (_, index) => index + 1),
          '...',
          totalPages
        )
      } else if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount
        pages.push(
          1,
          '...',
          ...Array.from(
            { length: rightItemCount },
            (_, index) => totalPages - rightItemCount + index + 1
          )
        )
      } else {
        pages.push(
          1,
          '...',
          ...Array.from(
            { length: rightSiblingIndex - leftSiblingIndex + 1 },
            (_, index) => leftSiblingIndex + index
          ),
          '...',
          totalPages
        )
      }
    }

    return pages
  }

  // Pagination calculations
  const paginatedSubmissions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedSubmissions.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedSubmissions, currentPage])

  const toggleSelectAll = () => {
    const currentIds = paginatedSubmissions.map((sub) => sub.id)
    const allSelectedOnPage = currentIds.every((id) => selectedSubmissions.includes(id))

    if (allSelectedOnPage) {
      setSelectedSubmissions((prev) => prev.filter((id) => !currentIds.includes(id)))
    } else {
      setSelectedSubmissions((prev) => Array.from(new Set([...prev, ...currentIds])))
    }
  }

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600">
            Submitted
          </span>
        )
      case 'grading_in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            Grading
          </span>
        )
      case 'graded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Graded
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            Evaluation Queue
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review, annotate, and grade student task deliverables against criteria templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/grading/similarity"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/35 hover:bg-slate-850 text-slate-350 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            <span>Similarity Checker</span>
          </Link>

          {submissions.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/35 border border-slate-700/50 p-2.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                  aria-label="Select AI grading model"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="ollama">Ollama (Local Llama)</option>
                </select>
              </div>

              <button
                onClick={handleBatchAIGrade}
                disabled={selectedSubmissions.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-550 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 select-none shadow-md shadow-blue-600/10 cursor-pointer border-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Grade Selected ({selectedSubmissions.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/20 border border-slate-800 rounded-2xl">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search student identifier or task title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
            aria-label="Search submissions"
          />
        </div>

        <div>
          <select
            value={selectedCohort}
            onChange={(e) => {
              setSelectedCohort(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition cursor-pointer"
            aria-label="Filter by cohort class"
          >
            <option value="all">All Classes / Cohorts</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.class_code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition cursor-pointer"
            aria-label="Filter by grading status"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="grading_in_progress">Grading In Progress</option>
            <option value="graded">Graded</option>
          </select>
        </div>
      </div>

      {/* Queue Table Card */}
      <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Loading submissions queue...
            </span>
          </div>
        ) : queueError ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
            role="alert"
          >
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <span className="text-sm font-semibold text-slate-200">Không thể tải hàng đợi chấm bài</span>
            <span className="max-w-lg text-xs text-slate-500">{queueError}</span>
            <button
              type="button"
              onClick={fetchSubmissions}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
            >
              Thử lại
            </button>
          </div>
        ) : sortedSubmissions.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-650" />
            <span>No matching submissions found in the queue.</span>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-800 md:hidden">
              {paginatedSubmissions.map((sub) => {
                const isSelected = selectedSubmissions.includes(sub.id)
                const isGrading = gradingStatus[sub.id] === 'running'

                return (
                  <article
                    key={sub.id}
                    className={`space-y-4 p-4 ${isSelected ? 'bg-blue-50/60' : 'bg-slate-950'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSubmission(sub.id)}
                        className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-550"
                        aria-label={`Chọn bài nộp của ${sub.student_identifier}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-200">
                              {sub.student_identifier}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-400">
                              {sub.assignments?.title}
                            </p>
                          </div>
                          {getStatusBadge(sub.status)}
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <dt className="text-slate-500">Lớp</dt>
                            <dd className="mt-0.5 font-medium text-slate-300">
                              {sub.classes?.name || 'Chưa xác định'}
                            </dd>
                            <dd className="font-mono text-slate-500">
                              {sub.classes?.class_code}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Đã nộp</dt>
                            <dd className="mt-0.5 font-medium text-slate-300">
                              {formatDate(sub.submitted_at)}
                            </dd>
                            <dd className="text-slate-500">
                              {formatTime(sub.submitted_at)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSingleAIGrade(sub.id)}
                        disabled={isGrading}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-50"
                      >
                        {isGrading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang chấm...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                            Chấm bằng AI
                          </>
                        )}
                      </button>
                      <Link
                        href={`/admin/grading/${sub.id}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-550"
                      >
                        Chấm bài
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs text-slate-350">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedSubmissions.length > 0 && paginatedSubmissions.every((sub) => selectedSubmissions.includes(sub.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-550 bg-slate-950 cursor-pointer"
                        aria-label="Select all submissions on current page"
                      />
                    </th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Cohort / Access Code</th>
                    <th className="px-6 py-4">Assignment Topic</th>
                    <th className="px-6 py-4">Submitted At</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-955/5">
                  {paginatedSubmissions.map((sub) => {
                    const isSelected = selectedSubmissions.includes(sub.id)
                    const isGrading = gradingStatus[sub.id] === 'running'
                    return (
                      <tr key={sub.id} className={`hover:bg-slate-900/15 transition-colors ${isSelected ? 'bg-slate-950/40' : ''}`}>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectSubmission(sub.id)}
                            className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-550 bg-slate-950 cursor-pointer"
                            aria-label={`Select submission from student ${sub.student_identifier}`}
                          />
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-200 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sub.student_identifier}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400">{sub.classes?.name}</span>
                          <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                            {sub.classes?.class_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200">
                          {sub.assignments?.title}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400">{formatDate(sub.submitted_at)}</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            {formatTime(sub.submitted_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSingleAIGrade(sub.id)}
                            disabled={isGrading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white font-semibold transition-all text-[11px] disabled:opacity-50 cursor-pointer"
                          >
                            {isGrading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Grading...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                <span>AI Grade</span>
                              </>
                            )}
                          </button>

                          <Link
                            href={`/admin/grading/${sub.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-550 text-white font-semibold transition-colors text-[11px]"
                          >
                            <span>Grade Task</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing {Math.min(sortedSubmissions.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
                  {Math.min(sortedSubmissions.length, currentPage * itemsPerPage)} of {sortedSubmissions.length} submissions
                </span>

                <nav
                  aria-label="Grading queue pagination"
                  className="flex items-center justify-end gap-1.5"
                >
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="w-7 h-7 flex items-center justify-center text-xs text-slate-500 font-bold select-none"
                          aria-hidden="true"
                        >
                          ...
                        </span>
                      )
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        aria-label={`Go to page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                    aria-label="Go to next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
