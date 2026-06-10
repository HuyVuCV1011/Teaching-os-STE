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
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
        {m.type.toUpperCase()} DOCUMENT
      </h2>

      {/* PDF Preview: OS-style Viewport Frame */}
      {m.type === 'pdf' && (() => {
        const displayMode = m.metadata?.display_mode || 'both';
        const hasValidUrl = m.signedUrl && (
          m.signedUrl.startsWith('http://') || 
          m.signedUrl.startsWith('https://') || 
          m.signedUrl.startsWith('blob:') || 
          m.signedUrl.startsWith('data:')
        );

        return (
          <div className="space-y-3 w-full">
            {displayMode !== 'original' ? (
              hasValidUrl ? (
                <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] h-[500px] flex flex-col">
                  {/* Viewport Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 shrink-0 mr-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                      </div>
                      <h3 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
                        {m.title}
                      </h3>
                    </div>
                    {downloadAllowed && (
                      <a
                        href={m.signedUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-[10px] transition-colors"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 bg-slate-900">
                    <DocumentViewer url={m.signedUrl} title={m.title} />
                  </div>
                </div>
              ) : (
                <div className="border border-slate-800 bg-slate-950 rounded-2xl p-8 shadow-[0_4px_30px_rgba(0,0,0,0.01)] text-slate-500 flex flex-col justify-center items-center gap-3 h-[450px] text-center">
                  <FileText className="w-10 h-10 text-slate-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-100">Inline Preview Unavailable</span>
                  <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                    Could not resolve the secure temporary link for this document. Please check if the file has been correctly uploaded to the Supabase storage bucket.
                  </span>
                </div>
              )
            ) : (
              <div className="border border-slate-800 bg-slate-950 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] text-slate-100 flex justify-between items-center h-[90px]">
                <h3 className="font-bold text-slate-100 text-xs flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${getMaterialTypeStyles('pdf').iconColor}`} />
                  {m.title}
                </h3>
                {downloadAllowed && hasValidUrl ? (
                  <a
                    href={m.signedUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-xs transition-colors"
                  >
                    Download PDF
                  </a>
                ) : downloadAllowed ? (
                  <span className="text-xs text-slate-400 italic">File not found in storage</span>
                ) : (
                  <span className="text-xs text-slate-450 italic">Downloads disabled</span>
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
          <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] h-[500px] flex flex-col">
            {/* Viewport Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 shrink-0 mr-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                  <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <h3 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
                  {m.title}
                </h3>
              </div>
              {downloadAllowed && (
                <a
                  href={m.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-[10px] transition-colors"
                >
                  Download DOCX
                </a>
              )}
            </div>
            
            {displayMode !== 'original' ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 bg-slate-950">
                <div
                  className="prose max-w-none text-slate-600 leading-relaxed text-xs"
                  dangerouslySetInnerHTML={{
                    __html: m.metadata?.viewer_artifact?.viewer_html || '<p class="text-slate-450 italic">No HTML preview available.</p>'
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 text-xs italic">
                Inline preview disabled for original file download mode.
              </div>
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
          <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] h-[500px] flex flex-col">
            {/* Viewport Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 shrink-0 mr-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                  <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                </div>
                <h3 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
                  {m.title}
                </h3>
              </div>
              {downloadAllowed && (
                <a
                  href={m.signedUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 font-bold text-[10px] transition-colors"
                >
                  Download Spreadsheet
                </a>
              )}
            </div>

            {displayMode !== 'original' ? (
              <div className="flex-1 min-h-0 flex flex-col bg-slate-950 p-6 space-y-4">
                {rows.length > 0 ? (
                  <div className="overflow-auto border border-slate-800 rounded-xl flex-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]">
                    <table className="min-w-full divide-y divide-slate-800 text-xs">
                      <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          {headers.map((hdr: string, i: number) => (
                            <th key={i} className="px-3.5 py-2.5 text-left font-bold text-slate-100 border-r border-slate-800 last:border-0 bg-slate-900 tracking-wider">
                              {hdr}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-950">
                        {rows.slice(0, 5).map((row: any[], i: number) => (
                          <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                            {row.map((cell: any, j: number) => (
                              <td key={j} className="px-3.5 py-2.5 text-slate-600 border-r border-slate-850 last:border-0 truncate max-w-[120px]">
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

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold tracking-wide shrink-0">
                  <span>Showing first 5 rows</span>
                  <span>Total: {rowCount} rows × {colCount} cols</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 text-xs italic">
                Inline preview disabled for original file download mode.
              </div>
            )}
          </div>
        )
      })()}

      {/* Markdown Preview */}
      {m.type === 'markdown' && (
        <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] h-[500px] flex flex-col">
          {/* Viewport Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 shrink-0 mr-2">
                <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
              <h3 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
                {m.title}
              </h3>
            </div>
            {downloadAllowed && (
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(m.metadata?.viewer_artifact?.viewer_markdown || '')}`}
                download={`${m.title}.md`}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-[10px] transition-colors"
              >
                Download Markdown
              </a>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 bg-slate-950">
            <div
              className="prose max-w-none text-slate-600 leading-relaxed text-xs"
              dangerouslySetInnerHTML={{
                __html: renderSimpleMarkdown(m.metadata?.viewer_artifact?.viewer_markdown || '')
              }}
            />
          </div>
        </div>
      )}

      {/* JSON Preview */}
      {m.type === 'json' && (
        <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] h-[500px] flex flex-col">
          {/* Viewport Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 shrink-0 mr-2">
                <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
              <h3 className="font-bold text-slate-100 text-xs flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
                {m.title}
              </h3>
            </div>
            {downloadAllowed && (
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(
                  JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2)
                )}`}
                download={`${m.title}.json`}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold text-[10px] transition-colors"
              >
                Download JSON
              </a>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-900">
            <pre className="font-mono text-xs text-slate-400 p-2 leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(m.metadata?.viewer_artifact?.viewer_json || m.metadata?.viewer_artifact?.raw_text || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
