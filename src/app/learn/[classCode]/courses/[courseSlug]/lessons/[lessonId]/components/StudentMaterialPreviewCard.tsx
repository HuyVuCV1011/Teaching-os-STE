'use client'

import React from 'react'
import DocumentViewer from '@/components/DocumentViewer'
import { getMaterialIcon, getMaterialTypeStyles } from '@/lib/material'
import { FileText, Code } from 'lucide-react'
import { renderSimpleMarkdown } from '@/lib/markdown'

interface StudentMaterialPreviewCardProps {
  m: any
  downloadAllowed: boolean
}

export function StudentMaterialPreviewCard({
  m,
  downloadAllowed,
}: StudentMaterialPreviewCardProps) {
  const styles = getMaterialTypeStyles(m.type)
  const Icon = getMaterialIcon(m.type)

  return (
    <div className="space-y-3 w-full">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
        {m.type.toUpperCase()} Document
      </h2>

      {/* PDF Preview */}
      {m.type === 'pdf' && (() => {
        const displayMode = m.metadata?.display_mode || 'both';
        return (
          <div className="space-y-3">
            {displayMode !== 'original' ? (
              <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-sm h-[450px]">
                <DocumentViewer url={m.signedUrl} title={m.title} />
              </div>
            ) : (
              <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm text-slate-800 flex justify-between items-center h-[100px]">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${getMaterialTypeStyles('pdf').iconColor}`} />
                  {m.title}
                </h3>
                {downloadAllowed ? (
                  <a
                    href={m.signedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    Download PDF
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Downloads disabled</span>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* DOCX Preview */}
      {m.type === 'docx' && (() => {
        const displayMode = m.metadata?.display_mode || 'both';
        return (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm text-slate-800 space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={m.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-[10px] border border-blue-100 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>
            {displayMode !== 'original' && (
              <div
                className="prose max-w-none text-slate-700 leading-relaxed text-xs flex-1 overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: m.metadata?.viewer_artifact?.viewer_html || '<p class="text-slate-450 italic">No HTML preview available.</p>'
                }}
              />
            )}
          </div>
        )
      })()}

      {/* CSV / XLSX tabular preview */}
      {['csv', 'xlsx'].includes(m.type) && (() => {
        const artifact = m.metadata?.viewer_artifact
        const headers = artifact?.headers || []
        const rows = artifact?.rows || []
        const rowCount = artifact?.row_count || 0
        const colCount = artifact?.col_count || 0
        const displayMode = m.metadata?.display_mode || 'both'

        return (
          <div className="border border-slate-800 bg-white rounded-2xl p-6 shadow-sm text-slate-800 space-y-4 h-[450px] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className={`w-4 h-4 ${styles.iconColor}`} />
                {m.title}
              </h3>
              {downloadAllowed && (
                <a
                  href={m.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-650 font-semibold text-[10px] border border-emerald-100 hover:border-emerald-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Download
                </a>
              )}
            </div>

            {displayMode !== 'original' && (
              <>
                {rows.length > 0 ? (
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
                        {rows.slice(0, 5).map((row: any[], i: number) => (
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
                ) : (
                  <p className="text-xs text-slate-400 italic">No table data available.</p>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium shrink-0">
                  <span>Showing first 5 rows</span>
                  <span>Total: {rowCount} rows × {colCount} cols</span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Markdown Preview */}
      {m.type === 'markdown' && (
        <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 shadow-sm text-slate-100 space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <FileText className={`w-4 h-4 ${styles.iconColor}`} />
              {m.title}
            </h3>
            {downloadAllowed && (
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(m.metadata?.viewer_artifact?.viewer_markdown || '')}`}
                download={`${m.title}.md`}
                className="px-2.5 py-1 rounded bg-violet-50 hover:bg-violet-100 text-violet-650 font-semibold text-[10px] border border-violet-100 hover:bg-violet-100 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          <div
            className="prose max-w-none text-slate-700 leading-relaxed text-xs flex-1 overflow-y-auto"
            dangerouslySetInnerHTML={{
              __html: renderSimpleMarkdown(m.metadata?.viewer_artifact?.viewer_markdown || '')
            }}
          />
        </div>
      )}

      {/* JSON Preview */}
      {m.type === 'json' && (
        <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 shadow-sm text-slate-100 space-y-4 h-[450px] overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Code className={`w-4 h-4 ${styles.iconColor}`} />
              {m.title}
            </h3>
            {downloadAllowed && (
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(
                  JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2)
                )}`}
                download={`${m.title}.json`}
                className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-600 font-semibold text-[10px] border border-amber-100 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
              >
                Download
              </a>
            )}
          </div>
          <pre className="overflow-x-auto p-4 bg-slate-955/10 border border-slate-800 rounded-xl text-slate-350 font-mono text-xs whitespace-pre-wrap flex-1 overflow-y-auto">
            {JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
