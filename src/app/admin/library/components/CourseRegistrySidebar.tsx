'use client'

import React from 'react'
import { Search, Plus, BookOpen } from 'lucide-react'

interface CourseRegistrySidebarProps {
  courses: any[]
  subjects: any[]
  selectedCourse: any | null
  searchQuery: string
  setSearchQuery: (val: string) => void
  showCourseForm: boolean
  setShowCourseForm: (val: boolean) => void
  courseForm: { title: string; slug: string; subject_id: string; description: string; status: string }
  setCourseForm: React.Dispatch<React.SetStateAction<any>>
  handleCreateCourse: (e: React.FormEvent) => void
  handleSelectCourse: (course: any) => void
}

export function CourseRegistrySidebar({
  courses,
  subjects,
  selectedCourse,
  searchQuery,
  setSearchQuery,
  showCourseForm,
  setShowCourseForm,
  courseForm,
  setCourseForm,
  handleCreateCourse,
  handleSelectCourse,
}: CourseRegistrySidebarProps) {
  const filteredCourses = courses.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subjects?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="lg:col-span-1 p-1 rounded-3xl bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm h-fit">
      <div className="space-y-6 bg-slate-950 border border-slate-800/30 p-6 rounded-[calc(1.5rem-0.25rem)]">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Course Registry</h2>
            <p className="text-xs text-slate-500 font-medium">Select course to configure roadmap</p>
          </div>
          <button
            onClick={() => setShowCourseForm(!showCourseForm)}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm hover:shadow-blue-500/20 hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Add New Course"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Dynamic Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search courses or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-slate-950 transition-all font-medium shadow-inner"
          />
        </div>

        {showCourseForm && (
          <form onSubmit={handleCreateCourse} className="p-5 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-4 shadow-sm">
            <div className="text-xs font-bold text-slate-100 tracking-wide uppercase border-b border-slate-900/40 pb-2">
              Register New Course
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                required
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium placeholder-slate-500"
                placeholder="e.g. Intro to Machine Learning"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Slug Path
              </label>
              <input
                type="text"
                required
                value={courseForm.slug}
                onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value.toLowerCase() })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium font-mono placeholder-slate-500"
                placeholder="intro-to-ml"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Subject Path
              </label>
              <select
                required
                value={courseForm.subject_id}
                onChange={(e) => setCourseForm({ ...courseForm, subject_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
              >
                <option value="" className="text-slate-500 bg-slate-950">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-slate-950">
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium h-20 resize-none placeholder-slate-500"
                placeholder="Define objectives and learning targets..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCourseForm(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-500 hover:text-slate-100 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                Register Course
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredCourses.map((course) => {
            const isSelected = selectedCourse?.id === course.id
            return (
              <button
                key={course.id}
                onClick={() => handleSelectCourse(course)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-3 relative overflow-hidden group ${
                  isSelected
                    ? 'border-blue-500 bg-slate-900/40 shadow-sm translate-x-0.5'
                    : 'border-slate-800 bg-slate-950/30 hover:bg-slate-900/10 hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                {isSelected && <span className="w-1 h-full bg-blue-500 absolute left-0 top-0" />}
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/50 px-2.5 py-0.5 rounded-md border border-blue-500/20 shadow-sm">
                    {course.subjects?.name || 'Unassigned'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 shadow-sm ${
                      course.status === 'published'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        course.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    {course.status}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-base group-hover:text-blue-600 transition-colors leading-snug">
                    {course.title}
                  </h4>
                  <p className="text-sm text-slate-500/90 leading-relaxed font-normal mt-1.5 line-clamp-2">
                    {course.description || 'No description provided.'}
                  </p>
                </div>
              </button>
            )
          })}
          {filteredCourses.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs font-semibold">
              No catalog courses found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
