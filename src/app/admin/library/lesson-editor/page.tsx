'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react'
import { useLessonEditorState } from './hooks/useLessonEditorState'
import { LessonInfoStep } from './components/LessonInfoStep'
import { AssignmentBuilderStep } from './components/AssignmentBuilderStep'
import { ReviewAnswersStep } from './components/ReviewAnswersStep'
import { RubricGeneratorStep } from './components/RubricGeneratorStep'
import { LessonEditorModals } from './components/LessonEditorModals'

function LessonEditorInner() {
  const router = useRouter()
  const state = useLessonEditorState()

  const {
    loading,
    saving,
    currentStep,
    setCurrentStep,
    lesson,
    title,
    setTitle,
    materials,
    materialForm,
    setMaterialForm,
    uploadFile,
    setUploadFile,
    uploading,
    uploadStatus,
    dragActive,
    setDragActive,
    gridLayout,
    cellMaterials,
    hasAssignment,
    setHasAssignment,
    assignmentId,
    assignmentForm,
    setAssignmentForm,
    batches,
    dataFiles,
    setDataFiles,
    referenceFiles,
    setReferenceFiles,
    asgDragActive,
    setModalStep,
    setShowAiModal,
    handleDeleteBatch,
    setShowBatchSummaryModal,
    handleAsgDrag,
    handleAsgDrop,
    setClassifyFile,
    setClassifyType,
    setClassifyDownloadable,
    setClassifyPreviewable,
    setClassifyModalOpen,
    handleDrag,
    handleDrop,
    handleFileInputChange,
    handleCreateMaterial,
    handleDeleteMaterial,
    handleOpenMaterialsPreview,
    handleLayoutChange,
    handleDragStartCell,
    handleDropToColumn,
    handleRemoveFromColumn,
    setVerifyMaterial,
    activeReviewQsIdx,
    setActiveReviewQsIdx,
    selectedModel,
    setSelectedModel,
    suggestingAnsIdx,
    isSuggestingAll,
    simulatedAnswers,
    setSimulatedAnswers,
    handleSuggestAnswer,
    handleSuggestAllMissingAnswers,
    handleSaveComposer,
    updateQuestionInBatches,
    criteriaList,
    setCriteriaList,
    generatingRubric,
    handleGenerateAIRubric,
    sandboxCriterionIdx,
    setSandboxCriterionIdx,
    sandboxInput,
    setSandboxInput,
    getSandboxResult,
    handleNextStep,
    handlePrevStep,
    downloadAllowed,
    setDownloadAllowed,
    saveStage,
    saveStatus
  } = state

  // Loader screen
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 text-slate-400 text-xs gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Loading Session Composer Workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-700 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/library?tab=courses')}
            className="p-2 rounded-lg bg-slate-955 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-105 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600 animate-pulse" />
              Session Composer Workspace
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure curriculum outlines, materials, assessments, solutions, and rubric rules inside a single page.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Stepper Progress Bar */}
      <div className="flex border-b border-slate-750 pb-4 gap-6 text-xs justify-between items-center bg-slate-900/50 p-4 rounded-xl">
        <div className="flex gap-6 items-center">
          {[
            { id: 1, label: '1. Content & Handouts' },
            { id: 2, label: '2. Assignment Details' },
            { id: 3, label: '3. Solution Key', disabled: !hasAssignment },
            { id: 4, label: '4. Rubric Matrix', disabled: !hasAssignment }
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={s.disabled}
              onClick={() => setCurrentStep(s.id)}
              className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 rounded-sm ${
                s.disabled ? 'opacity-30 cursor-not-allowed border-transparent' : ''
              } ${
                currentStep === s.id
                  ? 'border-blue-500 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-400">
          Step {currentStep} of {hasAssignment ? 4 : 2}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Workspace Panels */}
        <div className="lg:col-span-3 space-y-6">
          {currentStep === 1 && (
            <LessonInfoStep
              title={title}
              setTitle={setTitle}
              downloadAllowed={downloadAllowed}
              setDownloadAllowed={setDownloadAllowed}
              materialForm={materialForm}
              setMaterialForm={setMaterialForm}
              uploadFile={uploadFile}
              setUploadFile={setUploadFile}
              uploading={uploading}
              uploadStatus={uploadStatus}
              dragActive={dragActive}
              setDragActive={setDragActive}
              materials={materials}
              gridLayout={gridLayout}
              cellMaterials={cellMaterials}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              handleFileInputChange={handleFileInputChange}
              handleCreateMaterial={handleCreateMaterial}
              handleDeleteMaterial={handleDeleteMaterial}
              handleOpenMaterialsPreview={handleOpenMaterialsPreview}
              handleLayoutChange={handleLayoutChange}
              handleDragStartCell={handleDragStartCell}
              handleDropToColumn={handleDropToColumn}
              handleRemoveFromColumn={handleRemoveFromColumn}
              setVerifyMaterial={setVerifyMaterial}
            />
          )}

          {currentStep === 2 && (
            <AssignmentBuilderStep
              hasAssignment={hasAssignment}
              setHasAssignment={setHasAssignment}
              assignmentForm={assignmentForm}
              setAssignmentForm={setAssignmentForm}
              title={title}
              assignmentId={assignmentId}
              batches={batches}
              dataFiles={dataFiles}
              setDataFiles={setDataFiles}
              referenceFiles={referenceFiles}
              setReferenceFiles={setReferenceFiles}
              asgDragActive={asgDragActive}
              setModalStep={setModalStep}
              setShowAiModal={setShowAiModal}
              handleDeleteBatch={handleDeleteBatch}
              setShowBatchSummaryModal={setShowBatchSummaryModal}
              handleAsgDrag={handleAsgDrag}
              handleAsgDrop={handleAsgDrop}
              setClassifyFile={setClassifyFile}
              setClassifyType={setClassifyType}
              setClassifyDownloadable={setClassifyDownloadable}
              setClassifyPreviewable={setClassifyPreviewable}
              setClassifyModalOpen={setClassifyModalOpen}
            />
          )}

          {currentStep === 3 && (
            <ReviewAnswersStep
              batches={batches}
              activeReviewQsIdx={activeReviewQsIdx}
              setActiveReviewQsIdx={setActiveReviewQsIdx}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              suggestingAnsIdx={suggestingAnsIdx}
              isSuggestingAll={isSuggestingAll}
              saving={saving}
              dataFiles={dataFiles}
              referenceFiles={referenceFiles}
              simulatedAnswers={simulatedAnswers}
              setSimulatedAnswers={setSimulatedAnswers}
              assignmentForm={assignmentForm}
              handleSuggestAnswer={handleSuggestAnswer}
              handleSuggestAllMissingAnswers={handleSuggestAllMissingAnswers}
              handleSaveComposer={handleSaveComposer}
              updateQuestionInBatches={updateQuestionInBatches}
            />
          )}

          {currentStep === 4 && (
            <RubricGeneratorStep
              criteriaList={criteriaList}
              setCriteriaList={setCriteriaList}
              generatingRubric={generatingRubric}
              handleGenerateAIRubric={handleGenerateAIRubric}
              sandboxCriterionIdx={sandboxCriterionIdx}
              setSandboxCriterionIdx={setSandboxCriterionIdx}
              sandboxInput={sandboxInput}
              setSandboxInput={setSandboxInput}
              getSandboxResult={getSandboxResult}
            />
          )}

          {/* Stepper controls footer */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-750 shrink-0">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-650 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
            >
              ← Previous Step
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveComposer('draft')}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-955 border border-slate-700 hover:border-slate-650 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{saveStage || 'Saving...'} ({saveStatus.elapsed})</span>
                  </>
                ) : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
              >
                {currentStep === 4 || (currentStep === 2 && !hasAssignment) ? 'Save & Finish' : 'Next Step →'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Right Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest pb-2.5 border-b border-slate-700">
              Syllabus Registry Context
            </h3>
            {lesson && (
              <div className="space-y-3 text-xs text-slate-400">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Course</span>
                  <span className="font-semibold text-slate-200">{lesson.modules?.courses?.title}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Module</span>
                  <span>{lesson.modules?.title}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Subject Path</span>
                  <span>{lesson.modules?.courses?.subjects?.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render all 8 overlays / modals */}
      <LessonEditorModals state={state} />
    </div>
  )
}

export default function LessonEditor() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm p-8">Loading workspace...</div>}>
      <LessonEditorInner />
    </Suspense>
  )
}
