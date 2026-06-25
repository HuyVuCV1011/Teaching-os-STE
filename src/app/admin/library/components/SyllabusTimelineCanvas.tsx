'use client'

import React, { useState } from 'react'
import { Plus, HelpCircle, BookOpenText, Layers, ChevronUp, ChevronDown, Edit, Eye, Loader2, GripVertical, Trash2 } from 'lucide-react'
import { SyllabusRoadmapVisualizer } from './SyllabusRoadmapVisualizer'
import { toggleLessonPublishStatusAction } from '../actions/refined_knowledge'
import { deleteLessonAction, deleteModuleAction } from '../actions/courses'

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
  onSaveSyllabusStructure?: (updatedModules: any[]) => Promise<void>
  onRefreshCourse?: () => void
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
  onSaveSyllabusStructure,
  onRefreshCourse,
}: SyllabusTimelineCanvasProps) {
  // Roadmap Visualizer state
  const [showRoadmapMap, setShowRoadmapMap] = useState(false)

  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (confirm(`Are you sure you want to delete the lesson "${title}"? This action cannot be undone.`)) {
      try {
        const res = await deleteLessonAction(lessonId)
        if (res.success) {
          if (onRefreshCourse) onRefreshCourse()
        } else {
          alert(`Failed to delete lesson: ${res.error}`)
        }
      } catch (err: any) {
        alert(`Error deleting lesson: ${err.message}`)
      }
    }
  }

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (confirm(`Are you sure you want to delete the module "${title}" and all its lessons? This action cannot be undone.`)) {
      try {
        const res = await deleteModuleAction(moduleId)
        if (res.success) {
          if (onRefreshCourse) onRefreshCourse()
        } else {
          alert(`Failed to delete module: ${res.error}`)
        }
      } catch (err: any) {
        alert(`Error deleting module: ${err.message}`)
      }
    }
  }

  // Drag and drop state
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null)
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null)
  const [draggedLessonSourceModuleId, setDraggedLessonSourceModuleId] = useState<string | null>(null)
  const [savingReorder, setSavingReorder] = useState(false)
  const [statusTogglingLessonId, setStatusTogglingLessonId] = useState<string | null>(null)

  if (!selectedCourse) {
    return (
      <div className="lg:col-span-3 p-1 rounded-[2.5rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm h-fit">
        <div className="h-full border border-dashed border-slate-800/80 rounded-3xl flex flex-col items-center justify-center py-28 text-slate-500 text-sm font-medium gap-4 shadow-inner bg-slate-900/5 min-h-[450px]">
          <HelpCircle className="w-10 h-10 text-slate-700 animate-pulse" />
          <span>Select a course registry node from the catalog to configure roadmaps.</span>
        </div>
      </div>
    )
  }

  // --- MODULE DRAG AND DROP ---
  const handleModuleDragStart = (e: React.DragEvent, moduleId: string) => {
    if (draggedLessonId) return
    setDraggedModuleId(moduleId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', moduleId)
  }

  const handleModuleDragOver = (e: React.DragEvent, targetModuleId: string) => {
    if (draggedModuleId && draggedModuleId !== targetModuleId) {
      e.preventDefault()
    }
  }

  const handleModuleDrop = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault()
    if (!draggedModuleId || draggedModuleId === targetModuleId || !onSaveSyllabusStructure) return

    const dragIdx = courseModules.findIndex(m => m.id === draggedModuleId)
    const hoverIdx = courseModules.findIndex(m => m.id === targetModuleId)

    if (dragIdx !== -1 && hoverIdx !== -1) {
      const newModules = [...courseModules]
      const [removed] = newModules.splice(dragIdx, 1)
      newModules.splice(hoverIdx, 0, removed)

      // Re-index modules
      const updated = newModules.map((m, idx) => ({
        ...m,
        order_index: idx + 1
      }))

      setSavingReorder(true)
      await onSaveSyllabusStructure(updated)
      setSavingReorder(false)
    }
    setDraggedModuleId(null)
  }

  // --- LESSON DRAG AND DROP ---
  const handleLessonDragStart = (e: React.DragEvent, lessonId: string, sourceModuleId: string) => {
    setDraggedLessonId(lessonId)
    setDraggedLessonSourceModuleId(sourceModuleId)
    e.dataTransfer.effectAllowed = 'move'
    e.stopPropagation()
  }

  const handleLessonDragOver = (e: React.DragEvent, targetLessonId: string) => {
    if (draggedLessonId && draggedLessonId !== targetLessonId) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleLessonDropOnLesson = async (e: React.DragEvent, targetLessonId: string, targetModuleId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedLessonId || !draggedLessonSourceModuleId || !onSaveSyllabusStructure) return

    const updatedModules = courseModules.map(m => ({
      ...m,
      lessons: m.lessons ? [...m.lessons] : []
    }))

    const sourceMod = updatedModules.find(m => m.id === draggedLessonSourceModuleId)
    const targetMod = updatedModules.find(m => m.id === targetModuleId)

    if (!sourceMod || !targetMod) return

    const dragIdx = sourceMod.lessons.findIndex((l: any) => l.id === draggedLessonId)
    if (dragIdx === -1) return

    const [draggedLesson] = sourceMod.lessons.splice(dragIdx, 1)
    const hoverIdx = targetMod.lessons.findIndex((l: any) => l.id === targetLessonId)
    
    if (hoverIdx !== -1) {
      targetMod.lessons.splice(hoverIdx, 0, draggedLesson)
    } else {
      targetMod.lessons.push(draggedLesson)
    }

    // Re-index
    sourceMod.lessons.forEach((l: any, idx: number) => {
      l.order_index = idx + 1
      l.module_id = sourceMod.id
    })
    targetMod.lessons.forEach((l: any, idx: number) => {
      l.order_index = idx + 1
      l.module_id = targetMod.id
    })

    setSavingReorder(true)
    await onSaveSyllabusStructure(updatedModules)
    setSavingReorder(false)

    setDraggedLessonId(null)
    setDraggedLessonSourceModuleId(null)
  }

  const handleLessonDropOnModule = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault()
    if (!draggedLessonId || !draggedLessonSourceModuleId || !onSaveSyllabusStructure) return

    const updatedModules = courseModules.map(m => ({
      ...m,
      lessons: m.lessons ? [...m.lessons] : []
    }))

    const sourceMod = updatedModules.find(m => m.id === draggedLessonSourceModuleId)
    const targetMod = updatedModules.find(m => m.id === targetModuleId)

    if (!sourceMod || !targetMod) return

    const dragIdx = sourceMod.lessons.findIndex((l: any) => l.id === draggedLessonId)
    if (dragIdx === -1) return

    const [draggedLesson] = sourceMod.lessons.splice(dragIdx, 1)
    targetMod.lessons.push(draggedLesson)

    // Re-index
    sourceMod.lessons.forEach((l: any, idx: number) => {
      l.order_index = idx + 1
      l.module_id = sourceMod.id
    })
    targetMod.lessons.forEach((l: any, idx: number) => {
      l.order_index = idx + 1
      l.module_id = targetMod.id
    })

    setSavingReorder(true)
    await onSaveSyllabusStructure(updatedModules)
    setSavingReorder(false)

    setDraggedLessonId(null)
    setDraggedLessonSourceModuleId(null)
  }

  // --- PUBLISHING STATUS ACTION ---
  const handleToggleLessonStatus = async (lessonId: string, currentStatus: 'draft' | 'published') => {
    setStatusTogglingLessonId(lessonId)
    try {
      const res = await toggleLessonPublishStatusAction(lessonId, currentStatus)
      if (res.success && onRefreshCourse) {
        onRefreshCourse()
      } else if (!res.success) {
        alert(`Failed to change lesson status: ${res.error}`)
      }
    } catch (err: any) {
      alert(`Error toggling lesson status: ${err.message}`)
    } finally {
      setStatusTogglingLessonId(null)
    }
  }

  return (
    <div className="lg:col-span-3 p-1 rounded-[2.5rem] bg-slate-900/5 ring-1 ring-slate-800/5 shadow-sm h-fit animate-fade-in">
      <div className="bg-slate-955 border border-slate-800/30 rounded-[calc(2.5rem-0.25rem)] p-8 space-y-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/4 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-wrap justify-between items-center pb-6 border-b border-slate-800/60 gap-4">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-slate-505">
              Syllabus Planner
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-100 mt-1 leading-tight">{selectedCourse.title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRoadmapMap(true)}
              className="px-5 py-2.5 rounded-full border border-slate-800/80 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-100 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Eye className="w-4 h-4 text-indigo-500" /> Syllabus Map
            </button>
            <button
              onClick={() => setShowModuleForm(true)}
              className="px-5 py-2.5 rounded-full border border-slate-800/80 bg-slate-900 hover:bg-slate-850 text-sm font-semibold text-slate-100 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-600" /> Add Module
            </button>
          </div>
        </div>

        {/* Global Saving Order Banner */}
        {savingReorder && (
          <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Synchronizing Syllabus order with database transaction...</span>
          </div>
        )}

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
              <div 
                key={mod.id} 
                className="relative space-y-4 group/mod animate-fade-in"
                onDragOver={(e) => handleModuleDragOver(e, mod.id)}
                onDrop={(e) => {
                  if (draggedModuleId) {
                    handleModuleDrop(e, mod.id)
                  } else if (draggedLessonId) {
                    handleLessonDropOnModule(e, mod.id)
                  }
                }}
              >
                {/* Timeline Circle Node */}
                <div 
                  draggable
                  onDragStart={(e) => handleModuleDragStart(e, mod.id)}
                  onDragEnd={() => setDraggedModuleId(null)}
                  className={`absolute -left-[37px] top-1.5 w-8 h-8 rounded-full font-extrabold text-sm flex items-center justify-center shadow-sm z-10 hover:scale-105 transition-all duration-300 cursor-grab active:cursor-grabbing ring-4 ring-slate-950 ${
                    draggedModuleId === mod.id 
                      ? 'bg-blue-600 border-blue-500 text-white ring-blue-600/30'
                      : 'bg-indigo-50 border-2 border-indigo-100 text-indigo-700'
                  }`}
                  title="Drag module to reorder"
                >
                  <GripVertical className="w-3.5 h-3.5 shrink-0" />
                </div>

                {/* Module double-bezel card */}
                <div className={`p-1 rounded-[1.8rem] bg-slate-900/5 ring-1 ring-slate-800/5 hover:ring-slate-700/20 transition-all duration-300 ${
                  draggedModuleId === mod.id ? 'opacity-40 border-dashed border-2 border-indigo-500/50' : ''
                }`}>
                  <div className="bg-slate-950 border border-slate-800/30 p-6 rounded-[calc(1.8rem-0.25rem)] space-y-5 shadow-sm relative">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-100 text-xl flex items-center gap-2 group-hover/mod:text-blue-600 transition-colors leading-tight">
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
                          <button
                            type="button"
                            onClick={() => handleDeleteModule(mod.id, mod.title)}
                            className="w-7 h-7 rounded-full bg-slate-900 hover:bg-red-950 border border-slate-800 hover:border-red-900 text-slate-500 hover:text-red-500 flex items-center justify-center shadow-sm transition-all ml-1"
                            title="Delete Module"
                          >
                            <Trash2 className="w-4 h-4" />
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
                          className="text-sm text-blue-600 hover:text-blue-500 font-bold flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-2xl shadow-sm transition-all"
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
                      {mod.lessons && mod.lessons.map((lesson: any, lessonIdx: number) => {
                        const status = lesson.metadata?.status || 'published'
                        const isDraft = status === 'draft'
                        const isToggling = statusTogglingLessonId === lesson.id

                        return (
                          <div
                            key={lesson.id}
                            draggable
                            onDragStart={(e) => handleLessonDragStart(e, lesson.id, mod.id)}
                            onDragEnd={() => {
                              setDraggedLessonId(null)
                              setDraggedLessonSourceModuleId(null)
                            }}
                            onDragOver={(e) => handleLessonDragOver(e, lesson.id)}
                            onDrop={(e) => {
                              if (draggedLessonId) {
                                handleLessonDropOnLesson(e, lesson.id, mod.id)
                              }
                            }}
                            className={`flex justify-between items-center p-4 rounded-xl bg-slate-950 border transition-all duration-300 group/less relative pl-12 border-l-[3px] shadow-sm cursor-grab active:cursor-grabbing ${
                              draggedLessonId === lesson.id 
                                ? 'opacity-40 border-dashed border-blue-500 bg-slate-900/10'
                                : 'border-slate-800/40 hover:border-blue-500/30 hover:bg-slate-900/10'
                            } ${
                              isDraft 
                                ? 'border-l-amber-500/50 bg-amber-500/5' 
                                : 'border-l-transparent hover:border-l-blue-500'
                            }`}
                          >
                            <div className="absolute left-[15px] top-0 bottom-1/2 w-4 border-l-2 border-b-2 border-slate-800/40 rounded-bl-xl pointer-events-none" />
                            
                            {/* Drag Grip Icon */}
                            <GripVertical className="absolute left-[12px] top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 opacity-40 group-hover/less:opacity-100 transition-opacity" />

                            <div className="flex items-center gap-2.5 z-10 select-none">
                              <span className="text-xs text-slate-505 font-mono font-bold">
                                {mod.order_index}.{lesson.order_index}
                              </span>
                              <span className="text-base font-semibold text-slate-100 leading-tight group-hover/less:text-blue-600 transition-colors">
                                {lesson.title}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3.5 z-10">
                              {/* Draft / Published status toggle badge */}
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleLessonStatus(lesson.id, status)
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                                  isDraft
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20'
                                }`}
                              >
                                {isToggling ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <span className={`w-1.5 h-1.5 rounded-full ${isDraft ? 'bg-amber-500' : 'bg-emerald-550'}`} />
                                )}
                                <span>{isDraft ? 'Draft' : 'Live'}</span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/less:opacity-100 transition-opacity duration-300">
                                <button
                                  type="button"
                                  disabled={lessonIdx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoveLesson(lesson.id, 'up')
                                  }}
                                  className="w-6 h-6 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center transition-all"
                                  title="Move Lesson Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={lessonIdx === mod.lessons.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMoveLesson(lesson.id, 'down')
                                  }}
                                  className="w-6 h-6 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 flex items-center justify-center transition-all"
                                  title="Move Lesson Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/admin/presentation/${lesson.id}`)
                                }}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-slate-950 transition-all shadow-sm"
                                title="Present / View Lesson"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/admin/library/lesson-editor?lessonId=${lesson.id}`)
                                }}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-blue-600 hover:bg-slate-950 transition-all shadow-sm"
                                title="Open Composer Editor"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteLesson(lesson.id, lesson.title)
                                }}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-red-950 border border-slate-800 text-slate-500 hover:text-red-500 hover:bg-slate-950 transition-all shadow-sm"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {(!mod.lessons || mod.lessons.length === 0) && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium pl-10 py-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-pulse" />
                          <span className="italic">No lessons added to this module yet. Drag lessons here.</span>
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

      {/* Syllabus Roadmap Visualizer Modal */}
      {showRoadmapMap && (
        <SyllabusRoadmapVisualizer
          courseTitle={selectedCourse.title}
          courseModules={courseModules}
          onClose={() => setShowRoadmapMap(false)}
        />
      )}
    </div>
  )
}
