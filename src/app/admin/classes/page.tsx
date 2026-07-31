'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, Loader2, HelpCircle, AlertCircle } from 'lucide-react'

// Import state manager hook & subcomponents
import { useClassesManager } from './hooks/useClassesManager'
import { CohortSidebar } from './components/CohortSidebar'
import { SyllabusWorkspace } from './components/SyllabusWorkspace'
import { StudentWhitelist } from './components/StudentWhitelist'
import { NoticeBoardWorkspace } from './components/NoticeBoardWorkspace'
import { AnalyticsWorkspace } from './components/AnalyticsWorkspace'

const workspaceTabs = ['syllabus', 'notices', 'analytics'] as const

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
            <Users className="w-8 h-8 text-blue-600" />
            Quản lý lớp học
          </h1>
          <p className="text-slate-400 text-sm mt-1">Quản lý mã truy cập, khóa học, học viên và lịch phát hành.</p>
        </div>
      </div>

      {manager.errorState && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-slate-100">Không thể tải dữ liệu lớp học</p>
              <p className="mt-1 text-xs text-slate-500">{manager.errorState}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={manager.retryFetchData}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cohorts Left Sidebar */}
        <CohortSidebar
          classes={manager.classes}
          courses={manager.courses}
          selectedClass={manager.selectedClass}
          showClassForm={manager.showClassForm}
          setShowClassForm={manager.setShowClassForm}
          classForm={manager.classForm}
          setClassForm={manager.setClassForm}
          handleCreateClass={manager.handleCreateClass}
          handleDeleteClass={manager.handleDeleteClass}
          handleSelectClass={manager.handleSelectClass}
          editingClassId={manager.editingClassId}
          triggerEditClass={manager.triggerEditClass}
          cancelEditClass={manager.cancelEditClass}
        />

        {/* Cohorts Active Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {manager.selectedClass ? (
            <div className="border border-slate-700 bg-slate-900/10 rounded-2xl p-6 space-y-8">
              {/* Workspace Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-700">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Không gian lớp học
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{manager.selectedClass.name}</h3>
                </div>
                <div className="text-xs text-slate-400 sm:text-right">
                  <span className="block font-semibold font-mono text-slate-205">Mã lớp: {manager.selectedClass.class_code}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Vận hành lớp</span>
                </div>
              </div>

              {/* Workspace Tab Navigation */}
              <div className="flex border-b border-slate-700 gap-6">
                {workspaceTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => manager.setActiveWorkspaceTab(tab)}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                      manager.activeWorkspaceTab === tab
                        ? 'border-blue-600 text-blue-500'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'syllabus' ? 'Nội dung & học viên' : tab === 'notices' ? 'Thông báo' : 'Phân tích lớp'}
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
