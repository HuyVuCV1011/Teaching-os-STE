'use client'

import React from 'react'
import { Shield, Plus, Trash2, Calendar } from 'lucide-react'

interface CohortSidebarProps {
  classes: any[]
  selectedClass: any | null
  showClassForm: boolean
  setShowClassForm: (val: boolean) => void
  classForm: { name: string; class_code: string; status: string; start_date: string; end_date: string }
  setClassForm: React.Dispatch<React.SetStateAction<any>>
  handleCreateClass: (e: React.FormEvent) => void
  handleDeleteClass: (classId: string) => void
  handleSelectClass: (cohort: any) => void
}

export function CohortSidebar({
  classes,
  selectedClass,
  showClassForm,
  setShowClassForm,
  classForm,
  setClassForm,
  handleCreateClass,
  handleDeleteClass,
  handleSelectClass,
}: CohortSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          Active Cohorts
        </h2>
        <button
          onClick={() => setShowClassForm(!showClassForm)}
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showClassForm && (
        <form onSubmit={handleCreateClass} className="p-5 rounded-xl border border-slate-700 bg-slate-900/30 space-y-4">
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
              onChange={(e) => setClassForm({ ...classForm, class_code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
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

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
          >
            Register Cohort
          </button>
        </form>
      )}

      <div className="space-y-3">
        {classes.map((c) => (
          <div
            key={c.id}
            onClick={() => handleSelectClass(c)}
            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedClass?.id === c.id
                ? 'border-blue-500 bg-slate-900/60'
                : 'border-slate-700 bg-slate-900/10 hover:bg-slate-900/20'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                {c.class_code}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    c.status === 'running'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-850 border-slate-700 text-slate-400'
                  }`}
                >
                  {c.status}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClass(c.id)
                  }}
                  className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h4 className="font-bold text-white mt-3 text-sm">{c.name}</h4>
            <div className="flex gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {c.start_date}
              </span>
              <span>to</span>
              <span>{c.end_date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
