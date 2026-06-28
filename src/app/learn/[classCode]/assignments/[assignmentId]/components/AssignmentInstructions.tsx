'use client'

import React from 'react'
import { FileText, Loader2, Calendar } from 'lucide-react'
import DocumentViewer from '@/components/DocumentViewer'
import { renderSimpleMarkdown } from '@/lib/markdown'
import { sanitizeHtml } from '@/lib/sanitize'
import { getStudentMaterialSignedUrlAction } from '../actions'
import { AssignmentQuestionsForm } from './AssignmentQuestionsForm'
import { parseAssignmentInstructions } from '@/lib/assignment'
import CodeFileViewer from '@/components/CodeFileViewer'
import { toast } from 'react-hot-toast'
import { formatDateTime } from '@/lib/date'

interface AssignmentInstructionsProps {
  assignment: any
  promptDownloadUrl: string | null
  parsedPromptContent: any
  parsingPrompt: boolean
  parsingPromptError: string | null
  schedule: any
  classCode: string
  // interactive preview states
  previewingFile: any
  setPreviewingFile: (val: any) => void
  previewContent: any
  setPreviewContent: (val: any) => void
  previewSignedUrl: string | null
  setPreviewSignedUrl: (val: string | null) => void
  previewLoading: boolean
  previewError: string | null
  setPreviewError: (val: string | null) => void
  handlePreviewFile: (fileItem: any) => Promise<void>
  // questionnaire states
  answers: Record<number, string>
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>
  disabled?: boolean
}

export function AssignmentInstructions({
  assignment,
  promptDownloadUrl,
  parsedPromptContent,
  parsingPrompt,
  parsingPromptError,
  schedule,
  classCode,
  previewingFile,
  setPreviewingFile,
  previewContent,
  setPreviewContent,
  previewSignedUrl,
  setPreviewSignedUrl,
  previewLoading,
  previewError,
  setPreviewError,
  handlePreviewFile,
  answers,
  setAnswers,
  disabled = false
}: AssignmentInstructionsProps) {
  const instructionsStr = assignment?.instructions || ''
  const parsedObj = parseAssignmentInstructions(instructionsStr)
  
  let questionsList: any[] = []
  let dataFiles: any[] = []
  let referenceFiles: any[] = []
  let isNewJsonFormat = false
  
  if (parsedObj) {
    if (Array.isArray(parsedObj)) {
      questionsList = parsedObj.filter((q: any) => !q.status || q.status === 'approved')
    } else {
      const allQuestions = parsedObj.questions || []
      questionsList = allQuestions.filter((q: any) => !q.status || q.status === 'approved')
      dataFiles = parsedObj.data_files || []
      referenceFiles = parsedObj.reference_files || []
      isNewJsonFormat = true
    }
  }

  const renderReferenceOrDataFileList = (filesList: any[], title: string, dotColor: string) => {
    if (filesList.length === 0) return null
    return (
      <div className="space-y-3 pt-4 border-t border-slate-800/40">
        <h5 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
          {title}
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filesList.map((fileItem, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-800 transition-all"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="block text-xs font-semibold text-slate-200 truncate">
                  {fileItem.name}
                </span>
                <span className="block text-[9px] text-slate-500">
                  {(fileItem.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {fileItem.previewable && (
                  <button
                    type="button"
                    onClick={() => handlePreviewFile(fileItem)}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 text-[9px] font-bold transition-all"
                  >
                    Preview
                  </button>
                )}
                {fileItem.downloadable && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (fileItem.storage_path) {
                        const res = await getStudentMaterialSignedUrlAction(classCode, fileItem.storage_path)
                        if (res.success && res.signedUrl) {
                          window.open(res.signedUrl, '_blank')
                        } else {
                          toast.error('Could not download file.')
                        }
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[9px] font-bold border border-blue-500/20 transition-all"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPreviewContent = () => {
    if (!previewingFile) return null
    const ext = previewingFile.storage_path.split('.').pop()?.toLowerCase() || ''

    if (previewLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 font-mono text-xs border border-slate-800 rounded-xl bg-slate-950/30">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading preview artifact...</span>
        </div>
      )
    }

    if (previewError) {
      return (
        <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600">
          {previewError}
        </div>
      )
    }

    return (
      <div className="border border-slate-800 bg-slate-900/10 rounded-2xl overflow-hidden">
        {(() => {
          if (['ipynb', 'py', 'sql'].includes(ext) && previewSignedUrl) {
            return (
              <CodeFileViewer 
                url={previewSignedUrl} 
                title={previewingFile.name} 
                downloadAllowed={true} 
              />
            )
          }

          if (ext === 'pdf' && previewSignedUrl) {
            return <DocumentViewer url={previewSignedUrl} title={previewingFile.name} />
          }
          
          if (['docx', 'doc'].includes(ext) && previewContent) {
            return (
              <div 
                className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700 max-h-[500px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.viewer_html || '') }}
              />
            )
          }
          
          if (['csv', 'xlsx', 'xls'].includes(ext) && previewContent) {
            const headers = previewContent.headers || []
            const rows = previewContent.rows || []
            return (
              <div className="bg-white p-5 text-slate-800 space-y-4 h-[400px] overflow-y-auto flex flex-col shadow-sm">
                <div className="overflow-x-auto border border-slate-150 rounded-xl flex-1 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-150 text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        {headers.map((hdr: string, i: number) => (
                          <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 border-r border-slate-150 last:border-0 whitespace-nowrap bg-slate-50">
                            {hdr}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row: any[], i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          {row.map((cell: any, j: number) => (
                            <td key={j} className="px-3 py-2 text-slate-650 border-r border-slate-100 last:border-0 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
          
          if (['md', 'markdown'].includes(ext) && previewContent) {
            return (
              <div 
                className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700 max-h-[500px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(previewContent) }}
              />
            )
          }
          
          if (['json', 'txt', 'js', 'ts', 'py'].includes(ext) && previewContent) {
            const rawCode = typeof previewContent === 'object' ? JSON.stringify(previewContent, null, 2) : previewContent
            const lines = rawCode.split('\n')
            return (
              <div className="border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs max-h-[500px]">
                <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 flex">
                  <div className="text-slate-600 select-none text-right pr-4 border-r border-slate-900 min-w-[2rem]">
                    {lines.map((_: string, i: number) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre className="pl-4 overflow-x-auto whitespace-pre text-slate-200 flex-1 leading-relaxed">
                    {rawCode}
                  </pre>
                </div>
              </div>
            )
          }

          return (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl">
              No preview available. You can download the file to view its contents.
            </div>
          )
        })()}
      </div>
    )
  }

  const renderPromptContent = () => {
    if (!promptDownloadUrl) return null
    const promptExt = assignment?.prompt_file_path?.split('.').pop()?.toLowerCase()
    
    if (promptExt === 'pdf') {
      return (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <span className="block text-xs font-semibold text-slate-500">Tệp đính kèm PDF</span>
          <DocumentViewer url={promptDownloadUrl} title={assignment?.title} />
        </div>
      )
    }
    
    if (promptExt === 'zip') {
      return (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-250 text-center space-y-3">
          <FileText className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">ZIP Archive — download to view</h3>
          <p className="text-xs text-slate-650">This assignment is packaged as a ZIP archive. Please download it using the button below to extract and view the contents.</p>
          <a
            href={promptDownloadUrl}
            download
            className="inline-flex px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors items-center gap-1.5"
          >
            Download ZIP Archive
          </a>
        </div>
      )
    }

    if (parsingPrompt) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Parsing assignment attachment...</span>
        </div>
      )
    }

    if (parsingPromptError) {
      return (
        <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600">
          {parsingPromptError}
        </div>
      )
    }

    if (parsedPromptContent) {
      if (['docx', 'doc'].includes(promptExt || '')) {
        return (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <span className="block text-xs font-semibold text-slate-500">Xem tài liệu (DOCX)</span>
            <div 
              className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(parsedPromptContent.viewer_html || '') }}
            />
          </div>
        )
      }

      if (['csv', 'xlsx', 'xls'].includes(promptExt || '')) {
        const headers = parsedPromptContent.headers || []
        const rows = parsedPromptContent.rows || []
        return (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <span className="block text-xs font-semibold text-slate-500">Bảng dữ liệu ({promptExt?.toUpperCase()})</span>
            <div className="border border-slate-200 bg-white rounded-xl p-5 text-slate-800 space-y-4 h-[400px] overflow-y-auto flex flex-col shadow-sm">
              <div className="overflow-x-auto border border-slate-150 rounded-xl flex-1 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-150 text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      {headers.map((hdr: string, i: number) => (
                        <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 border-r border-slate-150 last:border-0 whitespace-nowrap bg-slate-50">
                          {hdr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row: any[], i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        {row.map((cell: any, j: number) => (
                          <td key={j} className="px-3 py-2 text-slate-650 border-r border-slate-100 last:border-0 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      if (['md', 'markdown'].includes(promptExt || '')) {
        return (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <span className="block text-xs font-semibold text-slate-500">Tài liệu hướng dẫn (Markdown)</span>
            <div 
              className="p-6 bg-white border border-slate-200 rounded-xl prose max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(parsedPromptContent) }}
            />
          </div>
        )
      }

      if (['json', 'txt', 'js', 'ts', 'py'].includes(promptExt || '')) {
        const rawCode = typeof parsedPromptContent === 'object' ? JSON.stringify(parsedPromptContent, null, 2) : parsedPromptContent
        const lines = rawCode.split('\n')
        return (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <span className="block text-xs font-semibold text-slate-500">Xem mã nguồn tệp đính kèm</span>
            <div className="border border-slate-200 bg-slate-950 rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs max-h-[500px]">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0 text-slate-400 font-semibold select-none">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{assignment.prompt_file_path.split('/').pop()}</span>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
                  {promptExt?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 flex">
                <div className="text-slate-600 select-none text-right pr-4 border-r border-slate-900 min-w-[2rem]">
                  {lines.map((_: string, i: number) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="pl-4 overflow-x-auto whitespace-pre text-slate-200 flex-1 leading-relaxed">
                  {rawCode}
                </pre>
              </div>
            </div>
          </div>
        )
      }
    }

    return (
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <div className="space-y-0.5">
            <span className="block text-xs font-bold text-slate-800">Assignment File Attachment</span>
            <span className="block text-[10px] text-slate-500">Download instructions/requirements document</span>
          </div>
        </div>
        <a
          href={promptDownloadUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
        >
          Download File
        </a>
      </div>
    )
  }

  return (
    <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
      <h2 className="text-sm font-semibold text-slate-500 pb-2 border-b border-slate-800">
        Hướng dẫn làm bài
      </h2>
      
      {isNewJsonFormat ? (
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-500">
              Mô tả bài tập
            </span>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Vui lòng xem các tài liệu tham khảo đính kèm, tải về các tệp tin dữ liệu và hoàn thành câu hỏi ở bên dưới.
            </p>
          </div>

          {renderReferenceOrDataFileList(referenceFiles, 'Tài liệu đọc tham khảo', 'bg-indigo-500')}
          {renderReferenceOrDataFileList(dataFiles, 'Tệp dữ liệu thực hành đính kèm', 'bg-blue-500')}

          {previewingFile && (
            <div className="space-y-4 pt-4 border-t border-slate-800/40">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-200 truncate">{previewingFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewingFile(null)
                    setPreviewContent(null)
                    setPreviewSignedUrl(null)
                    setPreviewError(null)
                  }}
                  className="text-slate-400 hover:text-white text-xs transition-colors p-1 bg-slate-900 hover:bg-slate-800 rounded font-medium"
                >
                  ✕ Đóng xem trước
                </button>
              </div>
              {renderPreviewContent()}
            </div>
          )}

          <AssignmentQuestionsForm
            questionsList={questionsList}
            answers={answers}
            setAnswers={setAnswers}
            disabled={disabled}
          />
        </div>
      ) : questionsList.length > 0 ? (
        <div className="space-y-6">
          <AssignmentQuestionsForm
            questionsList={questionsList}
            answers={answers}
            setAnswers={setAnswers}
            disabled={disabled}
          />
        </div>
      ) : (
        <div 
          className="text-slate-300 text-sm leading-relaxed prose max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(instructionsStr) }}
        />
      )}

      {renderPromptContent()}

      {/* Rubrics Matrix Section */}
      {assignment?.rubrics && (
        <div className="mt-8 pt-6 border-t border-slate-800/60 space-y-4">
          <div className="text-left">
            <span className="text-xs text-emerald-600 font-semibold">Tiêu chí đánh giá (Rubric)</span>
            <h4 className="text-sm font-bold text-slate-100 mt-0.5">{assignment.rubrics.title}</h4>
            {assignment.rubrics.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{assignment.rubrics.description}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {(assignment.rubrics.rubric_criteria || []).map((crit: any) => {
              const weightVal = parseFloat(crit.weight || '1');
              return (
                <div key={crit.id} className="bg-slate-950/60 border border-slate-800 p-4.5 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-800 transition-all text-left shadow-sm">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-200">{crit.name}</h5>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-450 px-2 py-0.5 rounded font-medium">
                          Hệ số: {weightVal.toFixed(1)}x
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-2 py-0.5 rounded font-semibold">
                          {crit.max_points} điểm
                        </span>
                      </div>
                    </div>
                    {crit.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed">{crit.description}</p>
                    )}
                  </div>
                  
                  {/* Visual Indicator of weight */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>Tỷ trọng điểm</span>
                      <span>{(weightVal * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all" 
                        style={{ width: `${Math.min(weightVal * 50, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-2 text-slate-400 bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>
            Due Date:{' '}
            {schedule?.due_date
              ? formatDateTime(schedule.due_date)
              : 'Not specified'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl">
          <span className="font-bold text-blue-600">Max Points:</span>
          <span>{assignment?.max_score} points</span>
        </div>
      </div>
    </div>
  )
}
