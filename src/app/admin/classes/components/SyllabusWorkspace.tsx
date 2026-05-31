'use client'

import React from 'react'
import { BookOpen, Plus, Trash2, Calendar, Clock, HelpCircle, AlertTriangle } from 'lucide-react'

interface SyllabusWorkspaceProps {
  selectedClass: any
  classCourses: any[]
  courses: any[]
  selectedCourseId: string
  setSelectedCourseId: (val: string) => void
  handleAssignCourse: (e: React.FormEvent) => void
  handleUnassignCourse: (mappingId: string) => void
  lessons: any[]
  schedules: any[]
  showScheduleForm: boolean
  setShowScheduleForm: (val: boolean) => void
  scheduleForm: { lesson_id: string; visible_after: string; due_date: string }
  setScheduleForm: React.Dispatch<React.SetStateAction<any>>
  handleAddSchedule: (e: React.FormEvent) => void
  handleDeleteSchedule: (scheduleId: string) => void
  showBulkForm: boolean
  setShowBulkForm: (val: boolean) => void
  bulkForm: { start_date: string; interval_days: string; due_offset_days: string }
  setBulkForm: React.Dispatch<React.SetStateAction<any>>
  handleBulkSchedule: (e: React.FormEvent) => void
}

export function SyllabusWorkspace({
  selectedClass,
  classCourses,
  courses,
  selectedCourseId,
  setSelectedCourseId,
  handleAssignCourse,
  handleUnassignCourse,
  lessons,
  schedules,
  showScheduleForm,
  setShowScheduleForm,
  scheduleForm,
  setScheduleForm,
  handleAddSchedule,
  handleDeleteSchedule,
  showBulkForm,
  setShowBulkForm,
  bulkForm,
  setBulkForm,
  handleBulkSchedule,
}: SyllabusWorkspaceProps) {
  return (
    <div className="space-y-8">
      {/* Mapped Courses section */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Assigned Syllabi Courses
        </h4>

        <form onSubmit={handleAssignCourse} className="flex gap-3">
          <select
            required
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="">Choose Course to Assign</option>
            {courses
              .filter((co) => !classCourses.some((cc) => cc.course_id === co.id))
              .map((co) => (
                <option key={co.id} value={co.id}>
                  {co.title}
                </option>
              ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0"
          >
            Assign Course
          </button>
        </form>

        {classCourses.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl text-slate-550 text-xs">
            No courses assigned to this cohort. Assign a course to allow release date setups.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classCourses.map((cc) => (
              <div
                key={cc.id}
                className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-700 hover:border-slate-700 transition-all"
              >
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-205 truncate">
                    {cc.courses?.title}
                  </span>
                  <span className="block text-xs text-slate-500 font-mono mt-0.5">
                    slug: {cc.courses?.slug}
                  </span>
                </div>
                <button
                  onClick={() => handleUnassignCourse(cc.id)}
                  className="p-1.5 rounded hover:bg-rose-500/10 text-slate-505 hover:text-rose-450 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Release Schedules & Bulk generation */}
      <div className="space-y-4 pt-6 border-t border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-650" />
              Lesson Unlock & Deadlines Calendar
            </h4>
            <p className="text-xs text-slate-500 mt-1">Configure student visibility offsets and grading target dates.</p>
          </div>

          <div className="flex gap-2 shrink-0">
            {lessons.length > 0 && (
              <button
                onClick={() => setShowBulkForm(!showBulkForm)}
                className="px-3.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Bulk offsets</span>
              </button>
            )}

            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              disabled={lessons.length === 0}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Date</span>
            </button>
          </div>
        </div>

        {/* Bulk schedulers form */}
        {showBulkForm && (
          <form onSubmit={handleBulkSchedule} className="p-5 rounded-2xl border border-slate-700 bg-slate-900/20 space-y-4 max-w-2xl">
            <div className="text-xs font-bold text-amber-600 flex items-center gap-2 tracking-wide uppercase border-b border-slate-800/40 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Automated Timeline Generator
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Base Start Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bulkForm.start_date}
                  onChange={(e) => setBulkForm({ ...bulkForm, start_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Unlock Interval
                </label>
                <select
                  value={bulkForm.interval_days}
                  onChange={(e) => setBulkForm({ ...bulkForm, interval_days: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="1">1 Day (Daily)</option>
                  <option value="2">2 Days (Alternating)</option>
                  <option value="7">7 Days (Weekly)</option>
                  <option value="14">14 Days (Biweekly)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Due Target Offset
                </label>
                <select
                  value={bulkForm.due_offset_days}
                  onChange={(e) => setBulkForm({ ...bulkForm, due_offset_days: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="3">3 Days after visible</option>
                  <option value="5">5 Days after visible</option>
                  <option value="7">7 Days after visible</option>
                  <option value="10">10 Days after visible</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowBulkForm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow shadow-amber-500/10 active:scale-95"
              >
                Generate Offsets
              </button>
            </div>
          </form>
        )}

        {/* Calendar Event Schedule form */}
        {showScheduleForm && (
          <form onSubmit={handleAddSchedule} className="p-5 rounded-2xl border border-slate-700 bg-slate-900/20 space-y-4 max-w-xl">
            <div className="text-xs font-bold text-slate-200 tracking-wide uppercase border-b border-slate-800/40 pb-2">
              Add release schedule entry
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">
                Target Lesson Node
              </label>
              <select
                required
                value={scheduleForm.lesson_id}
                onChange={(e) => setScheduleForm({ ...scheduleForm, lesson_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">Select Lesson</option>
                {lessons
                  .filter((l) => !schedules.some((s) => s.lesson_id === l.id))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.modules?.title} / {l.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Unlock date (visible after)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleForm.visible_after}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, visible_after: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Submission deadline (due date)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleForm.due_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, due_date: e.target.value })}
                  className="w-full bg-slate-955 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95"
              >
                Save Schedule Event
              </button>
            </div>
          </form>
        )}

        {/* Schedule Listing Grid */}
        {schedules.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-750 rounded-xl text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <HelpCircle className="w-7 h-7 text-slate-700" />
            <span>Syllabus scheduling is blank. Setup a date or run bulk offsets generators.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-700 bg-slate-950/20 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold truncate">
                    {item.lessons?.modules?.title || 'General Module'}
                  </span>
                  <h5 className="font-bold text-slate-100 text-sm mt-1 leading-snug">{item.lessons?.title}</h5>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-850/60">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-550" /> Visible after:</span>
                    <span className="font-semibold text-slate-300">
                      {item.visible_after ? new Date(item.visible_after).toLocaleString() : 'Immediate'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-550" /> Due deadline:</span>
                    <span className="font-semibold text-slate-350">
                      {item.due_date ? new Date(item.due_date).toLocaleString() : 'Not Set'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleDeleteSchedule(item.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 transition-colors"
                    title="Remove date schedule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
