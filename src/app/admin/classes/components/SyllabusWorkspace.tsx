'use client'

import React from 'react'
import { BookOpen, Plus, Trash2, Calendar, Clock, HelpCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  // Group courses by subject taxonomy
  const availableCourses = courses.filter((co) => !classCourses.some((cc) => cc.course_id === co.id))
  const coursesBySubject: Record<string, any[]> = {}
  availableCourses.forEach((course) => {
    const subjectName = course.subjects?.name || 'General Courses'
    if (!coursesBySubject[subjectName]) {
      coursesBySubject[subjectName] = []
    }
    coursesBySubject[subjectName].push(course)
  })

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
            {Object.entries(coursesBySubject).map(([subjectName, list]) => (
              <optgroup key={subjectName} label={subjectName} className="bg-slate-950 text-slate-400 text-xs font-semibold">
                {list.map((co) => (
                  <option key={co.id} value={co.id} className="text-white bg-slate-950 text-xs">
                    {co.title}
                  </option>
                ))}
              </optgroup>
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
            {classCourses.map((cc) => {
              const isPrimary = selectedClass?.course_id === cc.course_id
              return (
                <div
                  key={cc.id}
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                    isPrimary
                      ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/5'
                      : 'bg-slate-955/40 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-205 truncate">
                        {cc.courses?.title}
                      </span>
                      {isPrimary && (
                        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                      {cc.courses?.subjects && (
                        <span>Subject: {cc.courses.subjects.name}</span>
                      )}
                      {cc.courses?.subjects && <span>•</span>}
                      <span className="font-mono">slug: {cc.courses?.slug}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnassignCourse(cc.id)}
                    className="p-1.5 rounded hover:bg-rose-500/10 text-slate-505 hover:text-rose-450 transition-colors ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
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
        {/* Interactive Timeline & Cascade Shift */}
        {schedules.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-750 rounded-xl text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <HelpCircle className="w-7 h-7 text-slate-700" />
            <span>Syllabus scheduling is blank. Setup a date or run bulk offsets generators.</span>
          </div>
        ) : (
          <TimelineEditor
            schedules={schedules}
            handleDeleteSchedule={handleDeleteSchedule}
          />
        )}
      </div>
    </div>
  )
}

// Utility to format ISO string to local YYYY-MM-DDTHH:mm for datetime-local input
function formatForDateTimeLocal(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const tzOffset = date.getTimezoneOffset() * 60000
  const localTime = new Date(date.getTime() - tzOffset)
  return localTime.toISOString().slice(0, 16)
}

interface TimelineEditorProps {
  schedules: any[]
  handleDeleteSchedule: (id: string) => void
}

function TimelineEditor({ schedules, handleDeleteSchedule }: TimelineEditorProps) {
  const [cascadeShift, setCascadeShift] = React.useState(true)
  const [localSchedules, setLocalSchedules] = React.useState<any[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const sorted = [...schedules].sort((a, b) => {
      const aModuleOrder = a.lessons?.modules?.order_index ?? 0
      const bModuleOrder = b.lessons?.modules?.order_index ?? 0
      if (aModuleOrder !== bModuleOrder) return aModuleOrder - bModuleOrder
      return (a.lessons?.order_index ?? 0) - (b.lessons?.order_index ?? 0)
    })
    setLocalSchedules(sorted)
  }, [schedules])

  const handleDateChange = (idx: number, field: 'visible_after' | 'due_date', newValue: string) => {
    const updated = [...localSchedules]
    const item = { ...updated[idx] }
    const oldValue = item[field]

    const newDate = newValue ? new Date(newValue) : null
    const oldDate = oldValue ? new Date(oldValue) : null

    item[field] = newDate ? newDate.toISOString() : null
    updated[idx] = item

    if (cascadeShift && oldDate && newDate) {
      const deltaMs = newDate.getTime() - oldDate.getTime()
      for (let i = idx + 1; i < updated.length; i++) {
        const nextItem = { ...updated[i] }
        if (nextItem.visible_after) {
          const d = new Date(nextItem.visible_after)
          nextItem.visible_after = new Date(d.getTime() + deltaMs).toISOString()
        }
        if (nextItem.due_date) {
          const d = new Date(nextItem.due_date)
          nextItem.due_date = new Date(d.getTime() + deltaMs).toISOString()
        }
        updated[i] = nextItem
      }
    }
    setLocalSchedules(updated)
  }

  const handleSaveTimeline = async () => {
    setSaving(true)
    try {
      const promises = localSchedules.map((item) =>
        supabase
          .from('class_schedules')
          .update({
            visible_after: item.visible_after,
            due_date: item.due_date,
          })
          .eq('id', item.id)
      )

      const results = await Promise.all(promises)
      const firstError = results.find((r) => r.error)
      if (firstError) throw firstError.error

      alert('Course timeline successfully updated!')
      window.location.reload()
    } catch (err: any) {
      alert(`Failed to save timeline: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cascade shift control toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-700 bg-slate-955/40 text-xs">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cascadeShift}
              onChange={(e) => setCascadeShift(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 font-bold text-white uppercase tracking-wider text-[10px]">
              Cascade Shift {cascadeShift ? 'ON' : 'OFF'}
            </span>
          </label>
          <span className="text-[10px] text-slate-505 hidden sm:inline">
            When ON, shifting one date automatically shifts all subsequent dates.
          </span>
        </div>

        <button
          onClick={handleSaveTimeline}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow shadow-emerald-600/10 hover:shadow-emerald-500/20 active:scale-[0.98]"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Timeline Changes</span>
        </button>
      </div>

      {/* Vertical Timeline Tree */}
      <div className="relative pl-6 space-y-6 border-l border-slate-700 ml-3">
        {localSchedules.map((item, idx) => {
          return (
            <div key={item.id} className="relative group">
              {/* Timeline Bullet Node */}
              <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-slate-950 border-2 border-blue-500 flex items-center justify-center z-10">
                <span className="text-[8px] font-bold text-blue-500">{idx + 1}</span>
              </div>

              {/* Timeline Card */}
              <div className="p-4 rounded-xl border border-slate-700 bg-slate-955/20 hover:border-slate-650 transition-all space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                      {item.lessons?.modules?.title || 'General Module'}
                    </span>
                    <h5 className="font-bold text-white text-sm mt-0.5 leading-snug">
                      {item.lessons?.title}
                    </h5>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(item.id)}
                    className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 transition-colors shrink-0"
                    title="Remove date schedule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Editable Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/40">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Visible After (Unlock Date)
                    </label>
                    <input
                      type="datetime-local"
                      value={formatForDateTimeLocal(item.visible_after)}
                      onChange={(e) => handleDateChange(idx, 'visible_after', e.target.value)}
                      className="w-full bg-slate-955 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Submission Deadline (Due Date)
                    </label>
                    <input
                      type="datetime-local"
                      value={formatForDateTimeLocal(item.due_date)}
                      onChange={(e) => handleDateChange(idx, 'due_date', e.target.value)}
                      className="w-full bg-slate-955 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
