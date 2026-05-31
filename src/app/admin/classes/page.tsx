'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, Loader2, HelpCircle } from 'lucide-react'

// Import state manager hook & subcomponents
import { useClassesManager } from './hooks/useClassesManager'
import { CohortSidebar } from './components/CohortSidebar'
import { SyllabusWorkspace } from './components/SyllabusWorkspace'
import { StudentWhitelist } from './components/StudentWhitelist'
import { NoticeBoardWorkspace } from './components/NoticeBoardWorkspace'
import { AnalyticsWorkspace } from './components/AnalyticsWorkspace'

function AdminClassesContent() {
  const searchParams = useSearchParams()
  const initialAction = searchParams.get('action')

  const manager = useClassesManager(initialAction)

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-8 h-8 text-blue-600 animate-pulse" />
            Class Cohort Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure class access codes, active courses, and release dates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cohorts Left Sidebar */}
        <CohortSidebar
          classes={manager.classes}
          selectedClass={manager.selectedClass}
          showClassForm={manager.showClassForm}
          setShowClassForm={manager.setShowClassForm}
          classForm={manager.classForm}
          setClassForm={manager.setClassForm}
          handleCreateClass={manager.handleCreateClass}
          handleDeleteClass={manager.handleDeleteClass}
          handleSelectClass={manager.handleSelectClass}
        />

        {/* Cohorts Active Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {manager.selectedClass ? (
            <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-8">
              {/* Workspace Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-700">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Cohort Workspace
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{manager.selectedClass.name}</h3>
                </div>
                <div className="text-xs text-slate-400 sm:text-right">
                  <span className="block font-semibold font-mono text-slate-205">Code: {manager.selectedClass.class_code}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">LMS Command Center</span>
                </div>
              </div>

              {/* Workspace Tab Navigation */}
              <div className="flex border-b border-slate-700 gap-6">
                {['syllabus', 'notices', 'analytics'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => manager.setActiveWorkspaceTab(tab as any)}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                      manager.activeWorkspaceTab === tab
                        ? 'border-blue-600 text-blue-500'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'syllabus' ? 'Syllabus & Students' : tab === 'notices' ? 'Notice Board' : 'Cohort Analytics'}
                  </button>
                ))}
              </div>

              {/* Tab 1: Syllabus Config & Whitelists */}
              {manager.activeWorkspaceTab === 'syllabus' && (
                <div className="space-y-8">
                  <SyllabusWorkspace
                    selectedClass={manager.selectedClass}
                    classCourses={manager.classCourses}
                    courses={manager.courses}
                    selectedCourseId={manager.selectedCourseId}
                    setSelectedCourseId={manager.setSelectedCourseId}
                    handleAssignCourse={manager.handleAssignCourse}
                    handleUnassignCourse={manager.handleUnassignCourse}
                    lessons={manager.lessons}
                    schedules={manager.schedules}
                    showScheduleForm={manager.showScheduleForm}
                    setShowScheduleForm={manager.setShowScheduleForm}
                    scheduleForm={manager.scheduleForm}
                    setScheduleForm={manager.setScheduleForm}
                    handleAddSchedule={manager.handleAddSchedule}
                    handleDeleteSchedule={manager.handleDeleteSchedule}
                    showBulkForm={manager.showBulkForm}
                    setShowBulkForm={manager.setShowBulkForm}
                    bulkForm={manager.bulkForm}
                    setBulkForm={manager.setBulkForm}
                    handleBulkSchedule={manager.handleBulkSchedule}
                  />

                  <StudentWhitelist
                    selectedClass={manager.selectedClass}
                    enrollments={manager.enrollments}
                    newEmail={manager.newEmail}
                    setNewEmail={manager.setNewEmail}
                    handleEnrollStudent={manager.handleEnrollStudent}
                    handleRemoveEnrollment={manager.handleRemoveEnrollment}
                    emailFilter={manager.emailFilter}
                    setEmailFilter={manager.setEmailFilter}
                  />
                </div>
              )}

              {/* Tab 2: Notice Board Timeline Feed */}
              {manager.activeWorkspaceTab === 'notices' && (
                <NoticeBoardWorkspace
                  noticeTitle={manager.noticeTitle}
                  setNoticeTitle={manager.setNoticeTitle}
                  noticeContent={manager.noticeContent}
                  setNoticeContent={manager.setNoticeContent}
                  noticeSubmitting={manager.noticeSubmitting}
                  noticeLoading={manager.noticeLoading}
                  announcements={manager.announcements}
                  handleCreateAnnouncement={manager.handleCreateAnnouncement}
                  handleDeleteAnnouncement={manager.handleDeleteAnnouncement}
                />
              )}

              {/* Tab 3: Cohort Metrics Analytics */}
              {manager.activeWorkspaceTab === 'analytics' && (
                <AnalyticsWorkspace
                  selectedClass={manager.selectedClass}
                  enrollments={manager.enrollments}
                  analyticsAssignments={manager.analyticsAssignments}
                  analyticsSubmissions={manager.analyticsSubmissions}
                  analyticsLoading={manager.analyticsLoading}
                />
              )}
            </div>
          ) : (
            <div className="h-full border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center py-24 text-slate-500 text-sm gap-2">
              <HelpCircle className="w-8 h-8 text-slate-650" />
              <span>Select a class cohort from the list to assign courses, generate lock keys, and schedule calendars.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminClasses() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20 text-slate-400 text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AdminClassesContent />
    </Suspense>
  )
}
