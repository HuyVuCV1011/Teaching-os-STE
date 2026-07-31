'use client'

import React from 'react'
import { Shield, Plus, Trash2, Calendar, Edit, BookOpen } from 'lucide-react'

interface CohortSidebarProps {
  classes: ClassRow[]
  courses: CourseRow[]
  selectedClass: ClassRow | null
  showClassForm: boolean
  setShowClassForm: (val: boolean) => void
  classForm: { name: string; class_code: string; status: string; start_date: string; end_date: string; course_id: string }
  setClassForm: React.Dispatch<React.SetStateAction<CohortFormState>>
  handleCreateClass: (e: React.FormEvent) => void
  handleDeleteClass: (classId: string) => void
  handleSelectClass: (cohort: ClassRow) => void
  editingClassId: string | null
  triggerEditClass: (cohort: ClassRow) => void
  cancelEditClass: () => void
}

interface CohortFormState {
  name: string
  class_code: string
  status: string
  start_date: string
  end_date: string
  course_id: string
}

interface CourseRow {
  id: string
  title?: string | null
  subjects?: {
    name?: string | null
  } | null
}

interface ClassRow {
  id: string
  name?: string | null
  class_code?: string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  courses?: CourseRow | null
}

export function CohortSidebar({
  classes,
  courses,
  selectedClass,
  showClassForm,
  setShowClassForm,
  classForm,
  setClassForm,
  handleCreateClass,
  handleDeleteClass,
  handleSelectClass,
  editingClassId,
  triggerEditClass,
  cancelEditClass,
}: CohortSidebarProps) {
  // Group courses by subject taxonomy
  const coursesBySubject: Record<string, CourseRow[]> = {}
  courses.forEach((course) => {
    const subjectName = course.subjects?.name || 'General Courses'
    if (!coursesBySubject[subjectName]) {
      coursesBySubject[subjectName] = []
    }
    coursesBySubject[subjectName].push(course)
  })

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          Active Cohorts
        </h2>
        <button
          onClick={() => {
            if (showClassForm && editingClassId) {
              cancelEditClass()
            } else {
              setShowClassForm(!showClassForm)
            }
          }}
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          title={showClassForm ? 'Close form' : 'Register new cohort'}
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${showClassForm ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {showClassForm && (
        <form onSubmit={handleCreateClass} className="p-5 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {editingClassId ? 'Edit Cohort Details' : 'Register Cohort'}
            </h3>
            {editingClassId && (
              <button
                type="button"
                onClick={cancelEditClass}
                className="text-[10px] text-slate-500 hover:text-slate-200 transition-colors uppercase font-bold"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Cohort Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Analytics Cohort A"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Class Access Code (Lock Screen Key)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DATA-A-2026"
              value={classForm.class_code}
              disabled={!!editingClassId}
              onChange={(e) => setClassForm({ ...classForm, class_code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={classForm.start_date}
                onChange={(e) => setClassForm({ ...classForm, start_date: e.target.value })}
                className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                required
                value={classForm.end_date}
                onChange={(e) => setClassForm({ ...classForm, end_date: e.target.value })}
                className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Cohort Status
            </label>
            <select
              value={classForm.status}
              onChange={(e) => setClassForm({ ...classForm, status: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="upcoming">Upcoming</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Primary Course (Syllabus Setup)
            </label>
            <select
              value={classForm.course_id || ''}
              onChange={(e) => setClassForm({ ...classForm, course_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">No Primary Course (Choose later)</option>
              {Object.entries(coursesBySubject).map(([subjectName, list]) => (
                <optgroup key={subjectName} label={subjectName} className="bg-slate-950 text-slate-400 text-xs font-semibold">
                  {list.map((course) => (
                    <option key={course.id} value={course.id} className="text-white bg-slate-950 text-xs">
                      {course.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg active:scale-[0.99]"
          >
            {editingClassId ? 'Save Cohort Updates' : 'Register Cohort'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {classes.map((c) => (
          <div
            key={c.id}
            onClick={() => handleSelectClass(c)}
            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
              selectedClass?.id === c.id
                ? 'border-blue-500 bg-slate-900/60 shadow-blue-500/5'
                : 'border-slate-700 bg-slate-900/10 hover:bg-slate-900/20'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                {c.class_code}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                    c.status === 'running'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                      : 'bg-slate-850 border-slate-700 text-slate-400'
                  }`}
                >
                  {c.status}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerEditClass(c)
                  }}
                  className="p-1 rounded hover:bg-blue-500/10 text-slate-500 hover:text-blue-450 transition-colors"
                  title="Edit cohort details"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClass(c.id)
                  }}
                  className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 transition-colors"
                  title="Delete cohort"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h4 className="font-bold text-white mt-3 text-sm leading-snug">{c.name}</h4>

            {/* Display Primary Course and Subject */}
            {c.courses && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex flex-col gap-0.5">
                <span className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate pr-1">{c.courses.title}</span>
                </span>
                {c.courses.subjects && (
                  <span className="text-[10px] text-slate-500 ml-4.5">
                    Subject: {c.courses.subjects.name}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-4 text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/20">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3 text-slate-600" /> {c.start_date}
              </span>
              <span className="text-slate-700">to</span>
              <span className="font-medium">{c.end_date}</span>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
            No active cohorts found. Click the + icon to register your first cohort.
          </div>
        )}
      </div>
    </div>
  )
}
