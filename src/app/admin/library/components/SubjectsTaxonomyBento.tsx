'use client'

import React from 'react'
import { FolderOpen, Plus } from 'lucide-react'

interface SubjectsTaxonomyBentoProps {
  subjects: any[]
  courses: any[]
  showSubjectForm: boolean
  setShowSubjectForm: (val: boolean) => void
  subjectForm: { name: string; slug: string; description: string }
  setSubjectForm: React.Dispatch<React.SetStateAction<any>>
  handleCreateSubject: (e: React.FormEvent) => void
}

export function SubjectsTaxonomyBento({
  subjects,
  courses,
  showSubjectForm,
  setShowSubjectForm,
  subjectForm,
  setSubjectForm,
  handleCreateSubject,
}: SubjectsTaxonomyBentoProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Subjects Header (Double-Bezel Outer Shell) */}
      <div className="p-1 rounded-[2rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 border border-slate-800/30 p-6 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
          <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-violet-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <h2 className="text-lg font-bold text-slate-100">Registered Taxonomy Subjects</h2>
            <p className="text-sm text-slate-500 font-medium">Core learning pathways and system taxonomy fields.</p>
          </div>
          <button
            onClick={() => setShowSubjectForm(!showSubjectForm)}
            className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95 z-10"
          >
            <Plus className="w-4 h-4" /> <span>Add Subject</span>
          </button>
        </div>
      </div>

      {showSubjectForm && (
        <form onSubmit={handleCreateSubject} className="max-w-xl p-6 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-4 shadow-sm animate-slide-down">
          <div className="text-xs font-bold text-slate-100 tracking-wide uppercase border-b border-slate-900/40 pb-2">
            Register Learning Subject
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Subject Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Data Pipelines"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                className="w-full bg-slate-905 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Taxonomy Slug
              </label>
              <input
                type="text"
                required
                placeholder="e.g. data-pipelines"
                value={subjectForm.slug}
                onChange={(e) => setSubjectForm({ ...subjectForm, slug: e.target.value.toLowerCase() })}
                className="w-full bg-slate-905 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium font-mono placeholder-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={subjectForm.description}
              onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
              className="w-full bg-slate-905 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium h-20 resize-none placeholder-slate-500"
              placeholder="Define learning scopes, objectives, and structures..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowSubjectForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm active:scale-95"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Bento Taxonomy Board (Spaced Grid Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((sub) => {
          const subjectCoursesCount = courses.filter((c) => c.subject_id === sub.id).length
          return (
            <div key={sub.id} className="p-1 rounded-[2rem] bg-slate-900/5 ring-1 ring-slate-800/5 hover:ring-slate-700/20 transition-all duration-300 shadow-sm group animate-fade-in">
              <div className="h-full bg-slate-950 border border-slate-800/30 p-6 rounded-[calc(2rem-0.25rem)] flex flex-col justify-between gap-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-violet-500/5 to-transparent pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-violet-50/80 border border-violet-100 text-violet-600 flex items-center justify-center shadow-sm">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md shadow-sm">
                      {sub.slug}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100 group-hover:text-blue-600 transition-colors leading-tight">
                      {sub.name}
                    </h4>
                    <p className="text-sm text-slate-500/90 leading-relaxed font-normal mt-2 line-clamp-3">
                      {sub.description || 'No description written yet.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900/60 flex justify-between items-center">
                  <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Catalog mapping</span>
                  <span className="font-bold text-violet-600 bg-violet-50 text-xs px-2.5 py-1 rounded-lg border border-violet-100 transition-all group-hover:scale-105 shadow-sm">
                    {subjectCoursesCount} {subjectCoursesCount === 1 ? 'Course' : 'Courses'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
