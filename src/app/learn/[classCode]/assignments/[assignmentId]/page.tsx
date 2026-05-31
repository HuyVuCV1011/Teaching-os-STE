'use client'

import React, { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
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
          className="p-2 rounded-lg bg-slate-900 border border-slate-500 text-slate-400 hover:text-white hover:border-slate-400 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold">
            Cohort Lesson Task: {workspace.assignment?.lessons?.title}
          </span>
          <h1 className="text-2xl font-bold text-white mt-0.5">{workspace.assignment?.title}</h1>
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
          />
        </div>
      </div>
    </div>
  )
}
