'use client'

import React, { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Timer, AlertTriangle } from 'lucide-react'
import { useAssignmentWorkspace } from './hooks/useAssignmentWorkspace'
import { AssignmentInstructions } from './components/AssignmentInstructions'
import { SubmissionPanel } from './components/SubmissionPanel'
import { GradingStatusPanel } from './components/GradingStatusPanel'

interface AssignmentPageProps {
  params: Promise<{
    classCode: string
    assignmentId: string
  }>
}

export default function AssignmentPage({ params }: AssignmentPageProps) {
  const resolvedParams = use(params)
  const classCode = resolvedParams.classCode
  const assignmentId = resolvedParams.assignmentId

  const workspace = useAssignmentWorkspace({ classCode, assignmentId })

  // 3.C Deadline countdown badge
  const deadlineBadge = React.useMemo(() => {
    const dueDate = workspace.schedule?.due_date
    if (!dueDate) return null
    const now = Date.now()
    const due = new Date(dueDate).getTime()
    const diffMs = due - now
    if (diffMs <= 0) return { label: 'Overdue', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25', icon: 'alert' }
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffH / 24)
    const remH = diffH % 24
    const label = diffD > 0 ? `${diffD}d ${remH}h left` : `${diffH}h left`
    const color = diffH < 48
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
    return { label, color, icon: diffH < 48 ? 'alert' : 'timer' }
  }, [workspace.schedule])

  if (workspace.loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm">Fetching assignment workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/learn/${classCode}/dashboard`}
          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-600 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold">
            Cohort Lesson Task: {workspace.assignment?.lessons?.title}
          </span>
          <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{workspace.assignment?.title}</h1>
            {deadlineBadge && (
              <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${deadlineBadge.color}`}>
                {deadlineBadge.icon === 'alert'
                  ? <AlertTriangle className="w-3.5 h-3.5" />
                  : <Timer className="w-3.5 h-3.5" />}
                {deadlineBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Instructions, Questions and Grading Results */}
        <div className="lg:col-span-2 space-y-6">
          <AssignmentInstructions
            assignment={workspace.assignment}
            promptDownloadUrl={workspace.promptDownloadUrl}
            parsedPromptContent={workspace.parsedPromptContent}
            parsingPrompt={workspace.parsingPrompt}
            parsingPromptError={workspace.parsingPromptError}
            schedule={workspace.schedule}
            classCode={classCode}
            previewingFile={workspace.previewingFile}
            setPreviewingFile={workspace.setPreviewingFile}
            previewContent={workspace.previewContent}
            setPreviewContent={workspace.setPreviewContent}
            previewSignedUrl={workspace.previewSignedUrl}
            setPreviewSignedUrl={workspace.setPreviewSignedUrl}
            previewLoading={workspace.previewLoading}
            previewError={workspace.previewError}
            setPreviewError={workspace.setPreviewError}
            handlePreviewFile={workspace.handlePreviewFile}
            answers={workspace.answers}
            setAnswers={workspace.setAnswers}
            disabled={!!workspace.existingSubmission}
          />

          <GradingStatusPanel
            gradingResult={workspace.gradingResult}
            assignment={workspace.assignment}
          />
        </div>

        {/* Right Column: Upload Terminal */}
        <div className="space-y-6">
          <SubmissionPanel
            email={workspace.email}
            text={workspace.text}
            setText={workspace.setText}
            files={workspace.files}
            handleFileChange={workspace.handleFileChange}
            handleRemoveFile={workspace.handleRemoveFile}
            handleSubmit={workspace.handleSubmit}
            submitting={workspace.submitting}
            error={workspace.error}
            existingSubmission={workspace.existingSubmission}
            polling={workspace.polling}
            pollingMessage={workspace.pollingMessage}
            gradingRun={workspace.gradingRun}
            assignment={workspace.assignment}
            showcaseRequested={workspace.showcaseRequested}
            setShowcaseRequested={workspace.setShowcaseRequested}
          />
        </div>
      </div>
    </div>
  )
}
