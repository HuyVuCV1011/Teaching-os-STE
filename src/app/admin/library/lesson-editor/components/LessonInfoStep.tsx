'use client'

import React from 'react'
import { Upload, Eye, GripVertical, Trash2, Edit, Loader2 } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'

const GRID_LAYOUTS = [
  { id: '1-col', name: '1 Column', cols: 'grid-cols-1', cells: 1, icon: (
    <div className="grid grid-cols-1 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: '2-cols', name: '2 Columns', cols: 'grid-cols-2', cells: 2, icon: (
    <div className="grid grid-cols-2 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: '3-cols', name: '3 Columns', cols: 'grid-cols-3', cells: 3, icon: (
    <div className="grid grid-cols-3 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: 'asymmetric-2-1', name: 'Main + Sidebar (2:1)', cols: 'grid-cols-3', cells: 2, icon: (
    <div className="grid grid-cols-3 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm col-span-2"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )},
  { id: 'asymmetric-1-2', name: 'Sidebar + Main (1:2)', cols: 'grid-cols-3', cells: 2, icon: (
    <div className="grid grid-cols-3 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm col-span-2"></div>
    </div>
  )},
  { id: 'asymmetric-2-1-1', name: 'Main + 2 Stacked', cols: 'grid-cols-4', cells: 3, icon: (
    <div className="grid grid-cols-4 gap-0.5 w-6 h-6 border border-slate-700 p-0.5 rounded bg-slate-900">
      <div className="bg-blue-600/50 rounded-sm col-span-2"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
      <div className="bg-blue-600/50 rounded-sm"></div>
    </div>
  )}
]

const getGridColsClass = (layout: string) => {
  switch (layout) {
    case '1-col': return 'grid-cols-1'
    case '2-cols': return 'grid-cols-1 sm:grid-cols-2'
    case '3-cols': return 'grid-cols-1 md:grid-cols-3'
    case 'asymmetric-2-1': return 'grid-cols-1 md:grid-cols-3'
    case 'asymmetric-1-2': return 'grid-cols-1 md:grid-cols-3'
    case 'asymmetric-2-1-1': return 'grid-cols-1 md:grid-cols-4'
    default: return 'grid-cols-1'
  }
}

const getCellSpanClass = (layout: string, colIdx: number) => {
  if (layout === 'asymmetric-2-1') {
    return colIdx === 0 ? 'md:col-span-2' : 'md:col-span-1'
  }
  if (layout === 'asymmetric-1-2') {
    return colIdx === 0 ? 'md:col-span-1' : 'md:col-span-2'
  }
  if (layout === 'asymmetric-2-1-1') {
    return colIdx === 0 ? 'md:col-span-2' : 'md:col-span-1'
  }
  return ''
}

const getLayoutCellCount = (layout: string) => {
  const lay = GRID_LAYOUTS.find(l => l.id === layout)
  return lay ? lay.cells : 1
}

interface LessonInfoStepProps {
  title: string
  setTitle: (val: string) => void
  downloadAllowed: boolean
  setDownloadAllowed: (val: boolean) => void
  materialForm: any
  setMaterialForm: (val: any) => void
  uploadFile: File | null
  setUploadFile: (val: File | null) => void
  uploading: boolean
  uploadStatus: any
  dragActive: boolean
  setDragActive: (val: boolean) => void
  materials: any[]
  gridLayout: string
  cellMaterials: Record<number, any>
  handleDrag: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleCreateMaterial: (e: React.FormEvent) => Promise<void>
  handleDeleteMaterial: (id: string) => Promise<void>
  handleOpenMaterialsPreview: () => Promise<void>
  handleLayoutChange: (newLayout: string) => Promise<void>
  handleDragStartCell: (e: React.DragEvent, mId: string, sourceColIdx: number, sourceItemIdx: number) => void
  handleDropToColumn: (e: React.DragEvent, targetColIdx: number, targetItemIdx?: number) => Promise<void>
  handleRemoveFromColumn: (colIdx: number, itemIdx: number) => Promise<void>
  setVerifyMaterial: (m: any) => void
}

export function LessonInfoStep({
  title,
  setTitle,
  downloadAllowed,
  setDownloadAllowed,
  materialForm,
  setMaterialForm,
  uploadFile,
  setUploadFile,
  uploading,
  uploadStatus,
  dragActive,
  materials,
  gridLayout,
  cellMaterials,
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
  setVerifyMaterial
}: LessonInfoStepProps) {
  return (
    <div className="space-y-6">
      {/* Card A: Upload & Manage Materials */}
      <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between border-b border-slate-805 pb-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Lesson Heading / Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 transition-colors focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20"
            />
          </div>
          <div className="shrink-0 flex flex-col gap-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Allow Student Downloads
            </label>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setDownloadAllowed(true)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  downloadAllowed
                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-350'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDownloadAllowed(false)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  !downloadAllowed
                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-350'
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">
              Material Source:
            </span>
            <button
              type="button"
              onClick={() => setMaterialForm({ ...materialForm, creationMethod: 'upload' })}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                materialForm.creationMethod === 'upload'
                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                  : 'bg-slate-955/20 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              Upload File / Add Link
            </button>
            <button
              type="button"
              onClick={() => setMaterialForm({ ...materialForm, creationMethod: 'write' })}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                materialForm.creationMethod === 'write'
                  ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                  : 'bg-slate-955/20 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              Write Manually (Rich Text)
            </button>
          </div>
          
          {materialForm.creationMethod === 'upload' ? (
            <div className="space-y-4">
              {/* Upload Option selection: File vs Link */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadOption"
                    checked={materialForm.uploadOption === 'file'}
                    onChange={() => setMaterialForm({ ...materialForm, uploadOption: 'file' })}
                    className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <span>Upload Local File</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer ml-4">
                  <input
                    type="radio"
                    name="uploadOption"
                    checked={materialForm.uploadOption === 'link'}
                    onChange={() => setMaterialForm({ ...materialForm, uploadOption: 'link' })}
                    className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <span>Add External Link / Git Repo</span>
                </label>
              </div>

              {materialForm.uploadOption === 'file' ? (
                <div className="space-y-4">
                  {/* File title */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Material Heading / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lab Guide"
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Extra Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Required reading before lecture"
                      value={materialForm.note}
                      onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all min-h-[170px] ${
                      dragActive
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-950/20 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="file"
                      id="drag-file-upload"
                      multiple={false}
                      onChange={handleFileInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-350">
                      Drag and drop your file here, or click to browse
                    </p>
                    {uploadFile && (
                      <span className="block text-[10px] text-emerald-700 font-semibold mt-2">
                        Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-slate-500 text-center -mt-2">
                    Supported formats: PDF, DOCX, CSV, XLSX, MD, JSON, TXT, ZIP, JS, TS, PY
                  </p>
                  
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCreateMaterial}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {uploadStatus.step === 'hashing' && `Hashing... (${uploadStatus.elapsed})`}
                            {uploadStatus.step === 'uploading' && `Uploading... (${uploadStatus.elapsed})`}
                            {uploadStatus.step === 'parsing' && `Parsing... (${uploadStatus.elapsed})`}
                            {uploadStatus.step === 'saving' && `Saving... (${uploadStatus.elapsed})`}
                          </span>
                        </>
                      ) : (
                        <span>Map Material File</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Link URL Options */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Link Title / Heading
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Project Repository"
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      URL Address / Git Link
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://github.com/..."
                      value={materialForm.linkUrl}
                      onChange={(e) => setMaterialForm({ ...materialForm, linkUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Extra Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Link to codebase"
                      value={materialForm.note}
                      onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCreateMaterial}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {uploadStatus.step === 'hashing' && `Hashing... (${uploadStatus.elapsed})`}
                            {uploadStatus.step === 'uploading' && `Uploading... (${uploadStatus.elapsed})`}
                            {uploadStatus.step === 'parsing' && `Parsing... (${uploadStatus.elapsed})`}
                            {uploadStatus.step === 'saving' && `Saving... (${uploadStatus.elapsed})`}
                          </span>
                        </>
                      ) : (
                        <span>Map Resource URL</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Option B: Manual text composer */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Material Title / Heading
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lesson Lecture Note"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Extra Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lecture overview notes"
                  value={materialForm.note}
                  onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Write Handout Body (Rich Text Editor)
                </label>
                <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950/20">
                  <RichTextEditor
                    content={materialForm.manualContent}
                    onChange={(c) => setMaterialForm({ ...materialForm, manualContent: c })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCreateMaterial}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {uploadStatus.step === 'hashing' && `Hashing... (${uploadStatus.elapsed})`}
                        {uploadStatus.step === 'uploading' && `Uploading... (${uploadStatus.elapsed})`}
                        {uploadStatus.step === 'parsing' && `Parsing... (${uploadStatus.elapsed})`}
                        {uploadStatus.step === 'saving' && `Saving... (${uploadStatus.elapsed})`}
                      </span>
                    </>
                  ) : (
                    <span>Compose & Map Material</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card C: Currently Mapped Resources */}
      <div className="bg-slate-900/10 border border-slate-700 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Currently Mapped Resources
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Drag and drop to reorder materials. These will render in this order for students.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenMaterialsPreview}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Student View</span>
          </button>
        </div>
        
        {materials.length === 0 ? (
          <div className="text-center py-10 border border-slate-750 border-dashed rounded-xl bg-slate-950/10 text-slate-400 text-xs">
            No mapped resources. Add files or links above to populate the roadmap materials.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grid Layout Template Selector */}
            <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-xl space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Grid Layout Builder Template
              </label>
              <div className="flex flex-wrap gap-2">
                {GRID_LAYOUTS.map((lay) => (
                  <button
                    key={lay.id}
                    type="button"
                    onClick={() => handleLayoutChange(lay.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-semibold ${
                      gridLayout === lay.id
                        ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {lay.icon}
                    <span>{lay.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2-Column builder workspace inside Card C */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* Column 1: Draggable Materials List */}
              <div className="lg:col-span-1 space-y-2 border-r border-slate-800 pr-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Available handouts
                </h4>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {materials.map((m) => {
                    const styles = getMaterialTypeStyles(m.type)
                    const Icon = getMaterialIcon(m.type)
                    const isPlaced = Object.values(cellMaterials).some(
                      colList => Array.isArray(colList) && colList.some((item: any) => item?.id === m.id)
                    )
                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={(e) => handleDragStartCell(e, m.id, -1, -1)}
                        className={`flex justify-between items-center p-2.5 rounded-xl border transition-all text-xs cursor-grab active:cursor-grabbing ${
                          isPlaced
                            ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <Icon className={`w-3.5 h-3.5 ${styles.iconColor} shrink-0`} />
                          <span className="text-slate-200 truncate font-semibold">{m.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => setVerifyMaterial(m)}
                            className="text-slate-400 hover:text-blue-600 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 rounded"
                            title="Verify Handout"
                            aria-label={`Verify ${m.title}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(m.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20 rounded"
                            title="Delete"
                            aria-label={`Delete ${m.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isPlaced && (
                            <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                              Placed
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Column 2 & 3: Columns Drop Arena */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Columns Builder Arena
                </h4>
                <div className={`grid gap-4 ${getGridColsClass(gridLayout)}`}>
                  {Array.from({ length: getLayoutCellCount(gridLayout) }).map((_, colIdx) => {
                    const colMaterialsList = Array.isArray(cellMaterials[colIdx]) ? cellMaterials[colIdx] : []
                    
                    return (
                      <div
                        key={colIdx}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropToColumn(e, colIdx)}
                        className={`border border-dashed border-slate-800 bg-slate-950/10 rounded-2xl p-4 flex flex-col gap-3 min-h-[300px] transition-all relative ${getCellSpanClass(gridLayout, colIdx)}`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded w-fit">
                          Column {colIdx + 1}
                        </span>

                        <div className="flex-1 flex flex-col gap-2">
                          {colMaterialsList.length > 0 ? (
                            colMaterialsList.map((material: any, itemIdx: number) => {
                              const styles = getMaterialTypeStyles(material.type)
                              const Icon = getMaterialIcon(material.type)
                              
                              return (
                                <div
                                  key={material.id}
                                  draggable
                                  onDragStart={(e) => handleDragStartCell(e, material.id, colIdx, itemIdx)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.stopPropagation()
                                    handleDropToColumn(e, colIdx, itemIdx)
                                  }}
                                  className="w-full flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <Icon className={`w-3.5 h-3.5 ${styles.iconColor} shrink-0`} />
                                    <span className="text-xs font-semibold text-slate-200 truncate">{material.title}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromColumn(colIdx, itemIdx)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/20 rounded"
                                    title="Remove from column"
                                    aria-label={`Remove ${material.title} from column ${colIdx + 1}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            })
                          ) : (
                            <div className="flex-1 flex flex-col justify-center items-center text-center py-10">
                              <Upload className="w-4 h-4 text-slate-400 mb-1.5 animate-pulse" />
                              <span className="block text-[10px] text-slate-500">Drop handouts here</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
