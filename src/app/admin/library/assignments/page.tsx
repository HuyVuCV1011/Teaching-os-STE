'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ClipboardList,
  Plus,
  Trash2,
  Edit,
  BookOpen,
  HelpCircle,
  Loader2,
  FileText,
  Save,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

function AdminAssignmentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialAction = searchParams.get('action')

  const [assignments, setAssignments] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [rubrics, setRubrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Assignment form state
  const [form, setForm] = useState({
    id: '',
    lesson_id: '',
    title: '',
    instructions: '',
    rubric_id: '',
    max_score: 100
  })

  const [showForm, setShowForm] = useState(initialAction === 'new')
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [
        { data: assignmentsData },
        { data: coursesData },
        { data: rubricsData }
      ] = await Promise.all([
        supabase
          .from('assignments')
          .select('*, lessons(id, title, modules(id, title, courses(id, title))), rubrics(id, title)')
          .order('created_at', { ascending: false }),
        supabase
          .from('courses')
          .select('*, modules(*, lessons(*))')
          .neq('status', 'archived')
          .order('title'),
        supabase
          .from('rubrics')
          .select('*')
          .order('created_at', { ascending: false })
      ])

      setAssignments(assignmentsData || [])
      setCourses(coursesData || [])
      setRubrics(rubricsData || [])
    } catch (error) {
      console.error('Error fetching assignments data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle Form Submission (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.lesson_id || !form.instructions) {
      alert('Please fill in all required fields.')
      return
    }

    try {
      const payload: any = {
        lesson_id: form.lesson_id,
        title: form.title,
        instructions: form.instructions,
        max_score: form.max_score,
        rubric_id: form.rubric_id || null
      }

      if (form.id) {
        // Update
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', form.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('assignments')
          .insert([payload])

        if (error) throw error
      }

      // Reset Form
      setForm({
        id: '',
        lesson_id: '',
        title: '',
        instructions: '',
        rubric_id: '',
        max_score: 100
      })
      setShowForm(false)
      setSelectedAssignment(null)
      fetchData()
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`)
    }
  }

  // Edit Assignment
  const handleEdit = (assignment: any) => {
    setForm({
      id: assignment.id,
      lesson_id: assignment.lesson_id,
      title: assignment.title,
      instructions: assignment.instructions,
      rubric_id: assignment.rubric_id || '',
      max_score: assignment.max_score
    })
    setShowForm(true)
    setSelectedAssignment(assignment)
  }

  // Delete Assignment
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment? Student submissions for this assignment will be affected.')) return
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)

      if (error) throw error
      if (selectedAssignment?.id === id) {
        setSelectedAssignment(null)
      }
      fetchData()
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/library"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <ClipboardList className="w-8 h-8 text-blue-500" />
              Lesson Assignments Manager
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Create student assignments, specify guidelines, set points, and link rubric matrices.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({ id: '', lesson_id: '', title: '', instructions: '', rubric_id: '', max_score: 100 })
            setSelectedAssignment(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignments List Panel */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Registry
          </h2>

          {loading && assignments.length === 0 ? (
            <div className="flex justify-center items-center py-20 text-slate-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Fetching assignments...</span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No assignments found in the library database.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((as) => (
                <div
                  key={as.id}
                  onClick={() => setSelectedAssignment(as)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedAssignment?.id === as.id
                      ? 'border-blue-500 bg-slate-900/60'
                      : 'border-slate-800 bg-slate-900/10 hover:bg-slate-900/20'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate max-w-[150px]">
                        {as.lessons?.modules?.courses?.title || 'Standalone'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(as)
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(as.id)
                          }}
                          className="p-1 rounded hover:bg-rose-500/10 text-slate-550 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-white mt-1.5 text-sm">{as.title}</h4>
                    <span className="block text-[10px] text-slate-500 mt-1 truncate">
                      Lesson: {as.lessons?.title || 'Unknown lesson'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-850/60 text-[10px]">
                    <span className="text-slate-400 bg-slate-950/60 border border-slate-850 px-2 py-0.5 rounded font-mono">
                      Max: {as.max_score} pts
                    </span>
                    {as.rubrics ? (
                      <span className="text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                        Rubric Linked
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No rubric</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Form or Visualizer Panel */}
        <div className="lg:col-span-2 space-y-6">
          {showForm ? (
            <form onSubmit={handleSubmit} className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-6 shadow-xl">
              <h3 className="text-lg font-bold text-white pb-3 border-b border-slate-800">
                {form.id ? 'Edit Assignment Parameters' : 'Register New Assignment'}
              </h3>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pipeline ETL Orchestration Submission"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Course/Lesson Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Bind to Syllabus Lesson *
                  </label>
                  <select
                    required
                    value={form.lesson_id}
                    onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Choose Target Lesson</option>
                    {courses.map((course) => (
                      <optgroup key={course.id} label={course.title} className="bg-slate-950 font-bold">
                        {course.modules?.map((mod: any) => (
                          <optgroup key={mod.id} label={`  ↳ Module: ${mod.title}`} className="bg-slate-950/80 font-semibold italic text-slate-400">
                            {mod.lessons?.map((les: any) => (
                              <option key={les.id} value={les.id} className="bg-slate-900 font-sans normal-case text-white not-italic font-normal">
                                {les.title}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Score & Rubric */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Maximum Points *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.max_score}
                      onChange={(e) => setForm({ ...form, max_score: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Link Rubric Matrix
                    </label>
                    <select
                      value={form.rubric_id}
                      onChange={(e) => setForm({ ...form, rubric_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">No Rubric Linked (Manual Grade)</option>
                      {rubrics.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Instructions & Submissions Guidelines *
                  </label>
                  <textarea
                    required
                    placeholder="Enter instructions, requirements, deliverables expected, and learning resource pointers..."
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 h-44 font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setSelectedAssignment(null)
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Assignment
                </button>
              </div>
            </form>
          ) : selectedAssignment ? (
            <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Detail Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Assignment Workspace
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedAssignment.title}</h3>
                </div>
                <div className="text-right text-xs">
                  <span className="block font-bold text-slate-350">Max Points: {selectedAssignment.max_score} pts</span>
                  <span className="block text-[10px] text-slate-500 mt-1">
                    Lesson: {selectedAssignment.lessons?.title}
                  </span>
                </div>
              </div>

              {/* Guidelines */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Instructions & Guidelines
                </h4>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850/60 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedAssignment.instructions}
                </div>
              </div>

              {/* Rubric Link details */}
              {selectedAssignment.rubrics && (
                <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-xs text-slate-300 space-y-2">
                  <h5 className="font-bold text-blue-400 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    Rubric Scoring Matrix Linkage
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Scoring matrix: <span className="font-semibold text-slate-200">{selectedAssignment.rubrics.title}</span>. Evaluators will use the rubric criteria grid when grading student deliverables.
                  </p>
                </div>
              )}

              {/* Edit button trigger */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleEdit(selectedAssignment)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Modify Assignment
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center py-28 text-slate-500 text-sm gap-2">
              <HelpCircle className="w-8 h-8 text-slate-600" />
              <span>Select an assignment from the registry to view guidelines or register a new lesson deliverable.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminAssignments() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <AdminAssignmentsContent />
    </Suspense>
  )
}
