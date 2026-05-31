'use client'

import React from 'react'
import { FileText, Loader2 } from 'lucide-react'
import DocumentViewer from '@/components/DocumentViewer'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'
import { renderSimpleMarkdown } from '@/lib/markdown'

interface DocumentPreviewPaneProps {
  material: any
  downloadAllowed: boolean
  previewUrlStatus: any
  previewSignedUrls: Record<string, string>
  previewErrors: Record<string, string>
  markdownTemplates: Record<string, 'default' | 'dark' | 'accent'>
  setMarkdownTemplates: React.Dispatch<React.SetStateAction<Record<string, 'default' | 'dark' | 'accent'>>>
}

export function DocumentPreviewPane({
  material,
  downloadAllowed,
  previewUrlStatus,
  previewSignedUrls,
  previewErrors,
  markdownTemplates,
  setMarkdownTemplates
}: DocumentPreviewPaneProps) {
  if (!material) return null

  const styles = getMaterialTypeStyles(material.type)
  const Icon = getMaterialIcon(material.type)

  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
        {material.type.toUpperCase()} Document
      </h2>

      {/* PDF Preview */}
      {material.type === 'pdf' && (
        <div className="h-[450px] overflow-y-auto flex flex-col space-y-3">
          {previewUrlStatus.loading ? (
            <div className="flex-1 border border-slate-800 bg-slate-950/10 rounded-2xl text-center text-slate-400 text-xs flex items-center justify-center gap-2 min-h-[400px]">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Generating secure PDF URL... ({previewUrlStatus.elapsed})</span>
            </div>
          ) : previewSignedUrls[material.id] ? (
            <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-sm flex-1 min-h-[400px]">
              <DocumentViewer url={previewSignedUrls[material.id]} title={material.title} />
            </div>
          ) : (
            <div className="flex-1 border border-slate-800 bg-slate-950/10 rounded-2xl text-center text-slate-400 text-xs flex flex-col items-center justify-center p-6 gap-2 min-h-[400px]">
              <span className="font-semibold text-slate-200">Failed to load PDF secure preview URL.</span>
              {previewErrors[material.id] && (
                <span className="text-[10px] text-rose-500 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded max-w-xs break-words">
                  {previewErrors[material.id]}
                </span>
              )}
              <span className="text-slate-400 text-[10px] mt-1">Close and re-open preview to retry.</span>
            </div>
          )}
        </div>
      )}

      {/* DOCX Preview */}
      {material.type === 'docx' && (
        <div className="border border-slate-805 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileText className={`w-4 h-4 ${styles.iconColor}`} />
              {material.title}
            </h3>
            {downloadAllowed && (
              <a
                href={previewSignedUrls[material.id] || '#'}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-[10px] border border-blue-100 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          <div 
            className="prose max-w-none text-slate-705 leading-relaxed text-xs flex-1 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: material.metadata?.viewer_artifact?.viewer_html || '<p class="text-slate-400 italic">No HTML preview available.</p>' }}
          />
        </div>
      )}

      {/* CSV / XLSX tabular preview */}
      {['csv', 'xlsx'].includes(material.type) && (
        <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileText className={`w-4 h-4 ${styles.iconColor}`} />
              {material.title}
            </h3>
            {downloadAllowed && (
              <a
                href={previewSignedUrls[material.id] || '#'}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-600 font-semibold text-[10px] border border-emerald-100 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          {material.metadata?.viewer_artifact?.rows && material.metadata?.viewer_artifact?.rows.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-900 sticky top-0 z-10">
                  <tr>
                    {(material.metadata.viewer_artifact.headers || []).map((hdr: string, i: number) => (
                      <th key={i} className="px-3 py-2 text-left font-bold text-slate-100 border-r border-slate-200 last:border-0 whitespace-nowrap bg-slate-900">
                        {hdr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white">
                  {(material.metadata.viewer_artifact.rows || []).map((row: any[], i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-3 py-2 text-slate-800 border-r border-slate-200 last:border-0 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No table data available.</p>
          )}
          {material.metadata?.viewer_artifact?.row_count > 5 && (
            <span className="block text-[10px] text-slate-400 italic shrink-0">
              Showing first 5 of {material.metadata.viewer_artifact.row_count} rows.
            </span>
          )}
        </div>
      )}

      {/* Markdown Preview */}
      {material.type === 'markdown' && (() => {
        const template = markdownTemplates[material.id] || 'default'
        
        let cardClasses = "border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
        let titleColor = "text-slate-800 font-bold"
        let textColor = "text-slate-700"
        
        if (template === 'dark') {
          cardClasses = "border border-slate-950 bg-slate-900 rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
          titleColor = "text-slate-100 font-bold"
          textColor = "text-slate-350"
        } else if (template === 'accent') {
          cardClasses = "border border-indigo-250 bg-indigo-50/40 rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
          titleColor = "text-indigo-900 font-bold"
          textColor = "text-indigo-950"
        } else {
          cardClasses = "border border-slate-200 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col transition-all duration-300"
        }
        
        return (
          <div className={cardClasses}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                <h3 className={`font-bold text-sm ${titleColor}`}>
                  {material.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={template}
                  onChange={(e) => setMarkdownTemplates(prev => ({
                    ...prev,
                    [material.id]: e.target.value as 'default' | 'dark' | 'accent'
                  }))}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-850 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="dark">Dark</option>
                  <option value="accent">Accent</option>
                </select>

                {downloadAllowed && (
                  <a
                    href={`data:text/markdown;charset=utf-8,${encodeURIComponent(material.metadata?.viewer_artifact?.viewer_markdown || '')}`}
                    download={`${material.title}.md`}
                    className="px-2.5 py-1 rounded bg-violet-50 text-violet-600 font-semibold text-[10px] border border-violet-100 hover:bg-violet-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
            <div 
              className={`prose max-w-none text-xs flex-1 overflow-y-auto ${textColor}`}
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(material.metadata?.viewer_artifact?.viewer_markdown || '') }}
            />
          </div>
        )
      })()}

      {/* JSON Preview */}
      {material.type === 'json' && (
        <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileText className={`w-4 h-4 ${styles.iconColor}`} />
              {material.title}
            </h3>
            {downloadAllowed && (
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(material.metadata?.viewer_artifact?.viewer_json || material.metadata?.viewer_artifact?.raw_text || {}, null, 2))}`}
                download={`${material.title}.json`}
                className="px-2.5 py-1 rounded bg-amber-50 text-amber-600 font-semibold text-[10px] border border-amber-100 hover:bg-amber-150 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          <pre className="overflow-x-auto p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-350 font-mono text-xs whitespace-pre-wrap flex-1 overflow-y-auto">
            {JSON.stringify(material.metadata?.viewer_artifact?.viewer_json || material.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
