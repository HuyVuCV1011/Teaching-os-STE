'use client'

import React from 'react'
import { Plus, HelpCircle, BookOpenText, Layers, ChevronUp, ChevronDown, Edit } from 'lucide-react'

interface SyllabusTimelineCanvasProps {
  selectedCourse: any | null
  courseModules: any[]
  showModuleForm: boolean
  setShowModuleForm: (val: boolean) => void
  moduleForm: { title: string; order_index: number }
  setModuleForm: React.Dispatch<React.SetStateAction<any>>
  handleAddModule: (e: React.FormEvent) => void
  showLessonForm: boolean
  setShowLessonForm: (val: boolean) => void
  lessonForm: { title: string; order_index: number; moduleId: string }
  setLessonForm: React.Dispatch<React.SetStateAction<any>>
  handleAddLesson: (e: React.FormEvent) => void
  handleMoveModule: (moduleId: string, direction: 'up' | 'down') => void
  handleMoveLesson: (lessonId: string, direction: 'up' | 'down') => void
  redirectToEditor: boolean
  setRedirectToEditor: (val: boolean) => void
  router: any
}

export function SyllabusTimelineCanvas({
  selectedCourse,
  courseModules,
  showModuleForm,
  setShowModuleForm,
  moduleForm,
  setModuleForm,
  handleAddModule,
  showLessonForm,
  setShowLessonForm,
  lessonForm,
  setLessonForm,
  handleAddLesson,
  handleMoveModule,
  handleMoveLesson,
  redirectToEditor,
  setRedirectToEditor,
  router,
}: SyllabusTimelineCanvasProps) {
  if (!selectedCourse) {
    return (
      <div className="lg:col-span-2 p-1 rounded-[2.5rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm h-fit">
        <div className="h-full border border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center py-28 text-slate-500 text-sm font-medium gap-4 shadow-inner bg-slate-900/5 min-h-[450px]">
          <HelpCircle className="w-10 h-10 text-slate-700 animate-pulse" />
          <span>Select a course registry node from the catalog to configure roadmaps.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="lg:col-span-2 p-1 rounded-[2.5rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm h-fit animate-fade-in">
      <div className="bg-slate-955 border border-slate-800/30 rounded-[calc(2.5rem-0.25rem)] p-8 space-y-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="flex justify-between items-center pb-6 border-b border-slate-800/60">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Syllabus Planner
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-slate-100 mt-1 leading-tight">{selectedCourse.title}</h3>
          </div>
          <button
            onClick={() => setShowModuleForm(true)}
            className="px-5 py-2.5 rounded-full border border-slate-800/80 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-100 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 text-blue-600" /> Add Module
          </button>
        </div>

        {/* Module Insert Form */}
        {showModuleForm && (
          <form onSubmit={handleAddModule} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4 shadow-sm animate-slide-down">
            <div className="text-xs font-bold text-slate-100 tracking-wide uppercase border-b border-slate-900/40 pb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> Add Syllabus Module
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Module Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Module 1: Core Mechanics"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="w-full bg-slate-905 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Order Index
                </label>
                <input
                  type="number"
                  required
                  value={moduleForm.order_index}
                  onChange={(e) => setModuleForm({ ...moduleForm, order_index: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-905 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModuleForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
              >
                Create Module
              </button>
            </div>
          </form>
        )}

        {/* Syllabus Structure */}
        {courseModules.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/80 rounded-2xl text-slate-500 text-sm font-medium flex flex-col items-center justify-center gap-4 bg-slate-900/5">
            <BookOpenText className="w-12 h-12 text-slate-700" />
            <span>Syllabus is empty. Add a module to begin mapping lessons.</span>
          </div>
        ) : (
          <div className="relative pl-8 space-y-8">
            {/* Visual connector line */}
            <div className="absolute left-[17px] top-4 bottom-8 border-l-2 border-dashed border-slate-800/40 pointer-events-none" />

            {courseModules.map((mod, modIdx) => (
              <div key={mod.id} className="relative space-y-4 group/mod animate-fade-in">
                {/* Timeline Circle Node */}
                <div className="absolute -left-[37px] top-1.5 w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-100 text-indigo-700 font-extrabold text-sm flex items-center justify-center shadow-sm z-10 hover:scale-105 transition-all duration-300 cursor-pointer ring-4 ring-slate-950">
                  {mod.order_index}
                </div>

                {/* Module double-bezel card */}
                <div className="p-1 rounded-[1.8rem] bg-slate-900/5 ring-1 ring-slate-800/5 hover:ring-slate-700/20 transition-all duration-300">
                  <div className="bg-slate-950 border border-slate-800/30 p-6 rounded-[calc(1.8rem-0.25rem)] space-y-5 shadow-sm relative">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-100 text-base flex items-center gap-2 group-hover/mod:text-blue-600 transition-colors leading-tight">
                        {mod.title}
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/mod:opacity-100 transition-opacity duration-300">
                          <button
                            type="button"
                            disabled={modIdx === 0}
                            onClick={() => handleMoveModule(mod.id, 'up')}
                            className="w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center shadow-sm transition-all"
                            title="Move Module Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={modIdx === courseModules.length - 1}
                            onClick={() => handleMoveModule(mod.id, 'down')}
                            className="w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center shadow-sm transition-all"
                            title="Move Module Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setLessonForm({
                              moduleId: mod.id,
                              title: '',
                              order_index: (mod.lessons?.length || 0) + 1,
                            })
                            setShowLessonForm(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-500 font-bold flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> <span>Add Lesson</span>
                        </button>
                      </div>
                    </div>

                    {/* Lesson Insert Form */}
                    {showLessonForm && lessonForm.moduleId === mod.id && (
                      <form onSubmit={handleAddLesson} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-4 shadow-sm animate-slide-down">
                        <div className="text-xs font-semibold text-slate-505">
                          Creating lesson under Module: <span className="font-bold text-slate-205">{mod.title}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              Lesson Title
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Lesson 1.1: Foundations"
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                              className="w-full bg-slate-905 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-medium placeholder-slate-500"
                            />
                          </div>
                          <div className="flex flex-col justify-end pb-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`redirect_toggle_${mod.id}`}
                                checked={redirectToEditor}
                                onChange={(e) => setRedirectToEditor(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-800 bg-slate-900 focus:ring-blue-500/20 cursor-pointer text-blue-600"
                              />
                              <label htmlFor={`redirect_toggle_${mod.id}`} className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                                Open composer editor immediately after creation
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowLessonForm(false)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm active:scale-95"
                          >
                            Create Lesson
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Lessons inside Module */}
                    <div className="space-y-3 pl-3 relative">
                      {mod.lessons && mod.lessons.map((lesson: any, lessonIdx: number) => (
                        <div
                          key={lesson.id}
                          className="flex justify-between items-center p-4 rounded-xl bg-slate-950 border border-slate-800/40 hover:border-blue-500/30 hover:bg-slate-900/10 transition-all duration-300 group/less relative pl-10 border-l-[3px] border-l-transparent hover:border-l-blue-500 shadow-sm"
                        >
                          <div className="absolute left-[15px] top-0 bottom-1/2 w-4 border-l-2 border-b-2 border-slate-800/40 rounded-bl-xl pointer-events-none" />

                          <div className="flex items-center gap-2.5 z-10">
                            <span className="text-[11px] text-slate-500 font-mono font-bold">
                              {mod.order_index}.{lesson.order_index}
                            </span>
                            <span className="text-sm font-semibold text-slate-100 leading-tight group-hover/less:text-blue-600 transition-colors">
                              {lesson.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 z-10">
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/less:opacity-100 transition-opacity duration-300">
                              <button
                                type="button"
                                disabled={lessonIdx === 0}
                                onClick={() => handleMoveLesson(lesson.id, 'up')}
                                className="w-6 h-6 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center transition-all"
                                title="Move Lesson Up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={lessonIdx === mod.lessons.length - 1}
                                onClick={() => handleMoveLesson(lesson.id, 'down')}
                                className="w-6 h-6 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center transition-all"
                                title="Move Lesson Down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => router.push(`/admin/library/lesson-editor?lessonId=${lesson.id}`)}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-blue-600 hover:bg-slate-950 transition-all shadow-sm"
                              title="Open Composer Editor"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!mod.lessons || mod.lessons.length === 0) && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium pl-10 py-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-pulse" />
                          <span className="italic">No lessons added to this module yet.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
