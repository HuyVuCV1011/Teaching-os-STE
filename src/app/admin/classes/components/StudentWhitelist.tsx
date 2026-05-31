'use client'

import React from 'react'
import { Shield, Trash2 } from 'lucide-react'

interface StudentWhitelistProps {
  selectedClass: any
  enrollments: any[]
  newEmail: string
  setNewEmail: (val: string) => void
  handleEnrollStudent: (e: React.FormEvent) => void
  handleRemoveEnrollment: (enrollmentId: string) => void
  emailFilter: string
  setEmailFilter: (val: string) => void
}

export function StudentWhitelist({
  selectedClass,
  enrollments,
  newEmail,
  setNewEmail,
  handleEnrollStudent,
  handleRemoveEnrollment,
  emailFilter,
  setEmailFilter,
}: StudentWhitelistProps) {
  const filteredEnrollments = enrollments.filter((e) =>
    e.student_email?.toLowerCase().includes(emailFilter.toLowerCase())
  )

  return (
    <div className="space-y-4 pt-6 border-t border-slate-700">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <Shield className="w-4 h-4 text-indigo-400" />
        Whitelisted Student Enrollments
      </h4>

      <form onSubmit={handleEnrollStudent} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Enter student emails (comma separated for bulk: student1@edu, student2@edu)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0"
          >
            Enroll Student(s)
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Students must log in with their whitelisted email to enter the gated workspace.
        </p>
      </form>

      {/* Filter and List */}
      {enrollments.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center gap-3">
            <input
              type="text"
              placeholder="Search enrolled student..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-1 text-[11px] text-slate-350 focus:outline-none max-w-xs w-full"
            />
            <span className="text-xs text-slate-500 font-medium">
              Total Enrolled: {enrollments.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredEnrollments.map((en) => (
              <div
                key={en.id}
                className="flex justify-between items-center p-3 rounded-lg bg-slate-950/30 border border-slate-800"
              >
                <span className="text-xs text-slate-200 font-mono truncate pr-3">
                  {en.student_email}
                </span>
                <button
                  onClick={() => handleRemoveEnrollment(en.id)}
                  className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"
                  title="Revoke class access whitelist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {filteredEnrollments.length === 0 && (
              <div className="text-slate-500 text-xs italic py-4 col-span-2">
                No whitelisted student matched "{emailFilter}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
