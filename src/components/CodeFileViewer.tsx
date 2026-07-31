'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Download, Copy, Check, Loader2, Play, Database, FileCode, X } from 'lucide-react'
import { renderSimpleMarkdown } from '@/lib/markdown'

interface CodeFileViewerProps {
  url: string
  title: string
  downloadAllowed?: boolean
  isSplit?: boolean
}

interface NotebookCell {
  cell_type?: string
  source?: string | string[]
  execution_count?: number | null
  outputs?: NotebookOutput[]
}

interface NotebookOutput {
  output_type?: string
  text?: string | string[]
  data?: {
    'image/png'?: string | string[]
    'text/plain'?: string | string[]
  }
  ename?: string
  evalue?: string
  traceback?: string[]
}

// Inline SVG for the STE Wise company logo, with clean dark text for light headers
export function CompanyLogo({ className = "h-5 w-auto shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 419 112" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M124 0L118.211 11.5777C116.856 14.288 114.086 16 111.056 16H22.4721C20.957 16 19.572 16.856 18.8944 18.2111L8 40L1.78885 27.5777C0.662745 25.3255 0.662744 22.6745 1.78885 20.4223L9.78885 4.42229C11.144 1.71202 13.9141 0 16.9443 0H124Z" fill="#7B0000"/>
      <path d="M112 24L106.211 35.5777C104.856 38.288 102.086 40 99.0557 40H34.4721C32.957 40 31.572 40.856 30.8944 42.2111L20 64L13.7889 51.5777C12.6627 49.3255 12.6627 46.6745 13.7889 44.4223L21.7889 28.4223C23.144 25.712 25.9141 24 28.9443 24H112Z" fill="#7B0000"/>
      <path d="M0 112L5.78886 100.422C7.14399 97.712 9.9141 96 12.9443 96L101.528 96C103.043 96 104.428 95.144 105.106 93.7889L116 72L122.211 84.4223C123.337 86.6745 123.337 89.3255 122.211 91.5777L114.211 107.578C112.856 110.288 110.086 112 107.056 112L0 112Z" fill="#7B0000"/>
      <path d="M12 88L17.7889 76.4223C19.144 73.712 21.9141 72 24.9443 72L89.5279 72C91.043 72 92.428 71.144 93.1056 69.7889L104 48L110.211 60.4223C111.337 62.6745 111.337 65.3255 110.211 67.5777L102.211 83.5777C100.856 86.288 98.0859 88 95.0557 88L12 88Z" fill="#7B0000"/>
      <path d="M33.7889 52.4223C35.144 49.712 37.9141 48 40.9443 48H96L90.2112 59.5777C88.8561 62.288 86.0859 64 83.0558 64H28L33.7889 52.4223Z" fill="#7B0000"/>
      <path d="M177.295 46.3409C177.114 44.5076 176.333 43.0833 174.955 42.0682C173.576 41.053 171.705 40.5455 169.341 40.5455C167.735 40.5455 166.379 40.7727 165.273 41.2273C164.167 41.6667 163.318 42.2803 162.727 43.0682C162.152 43.8561 161.864 44.75 161.864 45.75C161.833 46.5833 162.008 47.3106 162.386 47.9318C162.78 48.553 163.318 49.0909 164 49.5455C164.682 49.9848 165.47 50.3712 166.364 50.7045C167.258 51.0227 168.212 51.2955 169.227 51.5227L173.409 52.5227C175.439 52.9773 177.303 53.5833 179 54.3409C180.697 55.0985 182.167 56.0303 183.409 57.1364C184.652 58.2424 185.614 59.5455 186.295 61.0455C186.992 62.5455 187.348 64.2652 187.364 66.2045C187.348 69.053 186.621 71.5227 185.182 73.6136C183.758 75.6894 181.697 77.303 179 78.4545C176.318 79.5909 173.083 80.1591 169.295 80.1591C165.538 80.1591 162.265 79.5833 159.477 78.4318C156.705 77.2803 154.538 75.5758 152.977 73.3182C151.432 71.0455 150.621 68.2348 150.545 64.8864H160.068C160.174 66.447 160.621 67.75 161.409 68.7955C162.212 69.8258 163.28 70.6061 164.614 71.1364C165.962 71.6515 167.485 71.9091 169.182 71.9091C170.848 71.9091 172.295 71.6667 173.523 71.1818C174.765 70.697 175.727 70.0227 176.409 69.1591C177.091 68.2955 177.432 67.303 177.432 66.1818C177.432 65.1364 177.121 64.2576 176.5 63.5455C175.894 62.8333 175 62.2273 173.818 61.7273C172.652 61.2273 171.22 60.7727 169.523 60.3636L164.455 59.0909C160.53 58.1364 157.432 56.6439 155.159 54.6136C152.886 52.5833 151.758 49.8485 151.773 46.4091C151.758 43.5909 152.508 41.1288 154.023 39.0227C155.553 36.9167 157.652 35.2727 160.318 34.0909C162.985 32.9091 166.015 32.3182 169.409 32.3182C172.864 32.3182 175.879 32.9091 178.455 34.0909C181.045 35.2727 183.061 36.9167 184.5 39.0227C185.939 41.1288 186.682 43.5682 186.727 46.3409H177.295ZM192.21 41.0682V32.9545H230.438V41.0682H216.188V79.5H206.46V41.0682H192.21ZM236.733 79.5V32.9545H268.097V41.0682H246.574V52.1591H266.483V60.2727H246.574V71.3864H268.188V79.5H236.733Z" fill="#7B0000"/>
      <path d="M284.33 32.9545L295.58 68.3182H296.011L307.284 32.9545H318.193L302.148 79.5H289.466L273.398 32.9545H284.33ZM333.636 32.9545V79.5H323.795V32.9545H333.636ZM366.983 46.3409C366.801 44.5076 366.021 43.0833 364.642 42.0682C363.263 41.053 361.392 40.5455 359.028 40.5455C357.422 40.5455 356.066 40.7727 354.96 41.2273C353.854 41.6667 353.006 42.2803 352.415 43.0682C351.839 43.8561 351.551 44.75 351.551 45.75C351.521 46.5833 351.695 47.3106 352.074 47.9318C352.468 48.553 353.006 49.0909 353.688 49.5455C354.369 49.9848 355.157 50.3712 356.051 50.7045C356.945 51.0227 357.9 51.2955 358.915 51.5227L363.097 52.5227C365.127 52.9773 366.991 53.5833 368.688 54.3409C370.384 55.0985 371.854 56.0303 373.097 57.1364C374.339 58.2424 375.301 59.5455 375.983 61.0455C376.68 62.5455 377.036 64.2652 377.051 66.2045C377.036 69.053 376.309 71.5227 374.869 73.6136C373.445 75.6894 371.384 77.303 368.688 78.4545C366.006 79.5909 362.771 80.1591 358.983 80.1591C355.225 80.1591 351.953 79.5833 349.165 78.4318C346.392 77.2803 344.225 75.5758 342.665 73.3182C341.119 71.0455 340.309 68.2348 340.233 64.8864H349.756C349.862 66.447 350.309 67.75 351.097 68.7955C351.9 69.8258 352.968 70.6061 354.301 71.1364C355.65 71.6515 357.172 71.9091 358.869 71.9091C360.536 71.9091 361.983 71.6667 363.21 71.1818C364.453 70.697 365.415 70.0227 366.097 69.1591C366.778 68.2955 367.119 67.303 367.119 66.1818C367.119 65.1364 366.809 64.2576 366.188 63.5455C365.581 62.8333 364.688 62.2273 363.506 61.7273C362.339 61.2273 360.907 60.7727 359.21 60.3636L354.142 59.0909C350.218 58.1364 347.119 56.6439 344.847 54.6136C342.574 52.5833 341.445 49.8485 341.46 46.4091C341.445 43.5909 342.195 41.1288 343.71 39.0227C345.241 36.9167 347.339 35.2727 350.006 34.0909C352.672 32.9091 355.703 32.3182 359.097 32.3182C362.551 32.3182 365.566 32.9091 368.142 34.0909C370.733 35.2727 372.748 36.9167 374.188 39.0227C375.627 41.1288 376.369 43.5682 376.415 46.3409H366.983ZM383.67 79.5V32.9545H415.034V41.0682H393.511V52.1591H413.42V60.2727H393.511V71.3864H415.125V79.5H383.67Z" fill="#000000"/>
    </svg>
  )
}

// Single-pass tokenizer to prevent regex replacements from nesting inside previously replaced HTML tags
function highlightCode(code: string, lang: 'python' | 'sql' | 'other' = 'other'): string {
  if (!code) return ''
  
  // Escape HTML tags to prevent XSS and prevent token collision with formatting symbols
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (lang === 'python') {
    // Single-pass regex tokenizer for Python
    // Group 1: Comment (starts with #)
    // Group 2: String literals (single or double quotes, handling escaped characters)
    // Group 3: Keywords
    // Group 4: Builtin functions / Types
    const pyRegex = /(#[^\n]*)|(f?(?:'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"))|(\b(?:def|class|import|from|as|return|if|elif|else|try|except|finally|for|in|while|with|lambda|assert|raise|pass|break|continue|and|or|not|is|global|nonlocal)\b)|(\b(?:print|len|range|str|int|float|list|dict|set|tuple|True|False|None|self|type)\b)/g
    
    html = html.replace(pyRegex, (match, comment, string, keyword, builtin) => {
      if (comment) return `<span class="text-slate-500 italic font-sans font-normal">${comment}</span>`
      if (string) return `<span class="text-amber-800 font-medium">${string}</span>`
      if (keyword) return `<span class="text-blue-600 font-semibold">${keyword}</span>`
      if (builtin) return `<span class="text-teal-600 font-semibold">${builtin}</span>`
      return match
    })

  } else if (lang === 'sql') {
    // Single-pass regex tokenizer for SQL
    // Group 1: Comment (starts with --)
    // Group 2: String literals (single quotes)
    // Group 3: Keywords
    // Group 4: Functions
    const sqlRegex = /(--[^\n]*)|('[^'\\]*(?:\\.[^'\\]*)*')|(\b(?:SELECT|FROM|WHERE|AND|OR|NOT|JOIN|LEFT|RIGHT|INNER|ON|GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING|AS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|CONSTRAINT|DEFAULT|NULL|IS|IN|EXISTS|WITH|UNION|ALL|CASE|WHEN|THEN|ELSE|END)\b)|(\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|CONCAT|ROUND|DATE|NOW)\b)/gi
    
    html = html.replace(sqlRegex, (match, comment, string, keyword, builtin) => {
      if (comment) return `<span class="text-slate-500 italic font-sans font-normal">${comment}</span>`
      if (string) return `<span class="text-amber-800 font-medium">${string}</span>`
      if (keyword) return `<span class="text-blue-600 font-semibold">${match}</span>`
      if (builtin) return `<span class="text-teal-600 font-semibold">${match}</span>`
      return match
    })
  }

  return html
}

export default function CodeFileViewer({ url, title, downloadAllowed = true, isSplit = false }: CodeFileViewerProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [copiedCellIdx, setCopiedCellIdx] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<boolean>(false)

  const fileExt = title.split('.').pop()?.toLowerCase() || ''
  const isNotebook = fileExt === 'ipynb'
  
  let detectedLang: 'python' | 'sql' | 'other' = 'other'
  if (fileExt === 'py' || isNotebook) detectedLang = 'python'
  else if (fileExt === 'sql') detectedLang = 'sql'

  useEffect(() => {
    let active = true

    async function fetchFileContent() {
      if (!url) {
        setError('No source URL provided.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const text = await res.text()
        if (active) {
          setContent(text)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load code file:', err)
        if (active) {
          setError('Không thể tải trực tiếp nội dung file này do giới hạn mạng hoặc CORS. Anh hãy tải file xuống máy để xem.')
          setLoading(false)
        }
      }
    }

    fetchFileContent()

    return () => {
      active = false
    }
  }, [url])

  // Programmatic client-side CORS-safe download function
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (downloading || !url) return
    try {
      setDownloading(true)
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = title
      document.body.appendChild(a)
      a.click()
      
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Programmatic download failed, trying fallback open:', err)
      window.open(url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const copyToClipboard = async (textToCopy: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      if (index !== undefined) {
        setCopiedCellIdx(index)
        setTimeout(() => setCopiedCellIdx(null), 2000)
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Loading indicator (clean light style)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 font-sans text-xs border border-slate-200 rounded-2xl bg-slate-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-red-700" />
        <span>Loading {title}...</span>
      </div>
    )
  }

  // Error fallback (clean light style)
  if (error) {
    return (
      <div className="border border-slate-800 bg-white rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-100 text-sm">{title}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{error}</p>
        </div>
        {downloadAllowed && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Tải tệp tin
          </button>
        )}
      </div>
    )
  }

  // Interactive Jupyter Notebook rendering (Google Colab Layout Clone)
  if (isNotebook) {
    try {
      const notebookData = JSON.parse(content) as { cells?: NotebookCell[] }
      const cells = notebookData.cells || []

      return (
        <div className={`space-y-4 font-sans text-left ${isSplit ? 'h-full flex flex-col' : ''}`}>
          {/* Colab Notebook Header Controls */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-slate-800 rounded-2xl shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <CompanyLogo className="h-5 w-auto" />
              <span className="text-sm font-semibold text-slate-100">{title}</span>
            </div>
            {downloadAllowed && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 font-semibold text-xs transition-all disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Download .ipynb
              </button>
            )}
          </div>

          {/* Notebook Canvas */}
          <div className={`bg-[#f8f9fa] border border-slate-800 rounded-2xl p-4 md:p-6 space-y-5 ${isSplit ? 'flex-1 min-h-0 overflow-y-auto custom-scrollbar' : ''}`}>
            {cells.map((cell, idx) => {
              const cellSource = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
              
              if (cell.cell_type === 'markdown') {
                return (
                  <div key={idx} className="flex gap-4 group pl-[48px] bg-white border border-slate-855 p-4 rounded-lg shadow-sm">
                    <div className="flex-1 text-slate-100 leading-relaxed text-[13px] font-sans prose max-w-none space-y-2 py-1 select-text">
                      <div dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(cellSource) }} />
                    </div>
                  </div>
                )
              } else if (cell.cell_type === 'code') {
                return (
                  <div key={idx} className="flex gap-4 group relative bg-white border border-slate-800 p-4 rounded-lg shadow-sm">
                    
                    {/* Left Column: Colab play button cell execution status */}
                    <div className="w-[32px] flex flex-col items-center pt-1.5 select-none shrink-0">
                      <div className="relative w-[28px] h-[28px] flex items-center justify-center">
                        {/* Static status display [1] */}
                        <span className="text-[10px] text-slate-400 font-mono font-medium absolute group-hover:opacity-0 transition-opacity">
                          [{cell.execution_count || ' '}]
                        </span>
                        {/* Hover play button */}
                        <button
                          type="button"
                          className="w-[28px] h-[28px] rounded-full border border-slate-800 bg-white text-slate-500 hover:text-orange-500 hover:border-orange-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all absolute shadow-sm"
                          title="Run cell"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Code container */}
                    <div className="flex-1 min-w-0 border border-slate-855 bg-[#f8f9fa] rounded-xl overflow-hidden hover:border-slate-300 transition-all">
                      {/* Interactive Floating Cell Toolbar */}
                      <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          onClick={() => copyToClipboard(cellSource, idx)}
                          className="p-1.5 bg-white border border-slate-800 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                          title="Copy code"
                        >
                          {copiedCellIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-650" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[10px] font-semibold px-0.5">Copy</span>
                        </button>
                      </div>

                      {/* Code Area */}
                      <div className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed whitespace-pre select-text text-slate-100">
                        <code 
                          className="text-slate-100 !text-slate-100 font-mono whitespace-pre"
                          dangerouslySetInnerHTML={{ __html: highlightCode(cellSource, 'python') }} 
                        />
                      </div>

                      {/* Outputs Panel (Colab Console style) */}
                      {cell.outputs && cell.outputs.length > 0 && (
                        <div className="border-t border-slate-800 bg-slate-900 p-4 font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-60 custom-scrollbar border-dashed flex flex-col gap-2">
                          {cell.outputs.map((out, oIdx) => {
                            // 1. Text console output stream
                            if (out.output_type === 'stream' && out.text) {
                              return <div key={oIdx} className="text-slate-200">{Array.isArray(out.text) ? out.text.join('') : out.text}</div>
                            } 
                            // 2. Execution / display results (like text/plain print statement evaluations)
                            else if ((out.output_type === 'execute_result' || out.output_type === 'display_data') && out.data) {
                              // If there is an inline Matplotlib plot / image, render it directly
                              if (out.data['image/png']) {
                                const base64Data = Array.isArray(out.data['image/png']) 
                                  ? out.data['image/png'].join('') 
                                  : out.data['image/png']
                                return (
                                  <div key={oIdx} className="my-2 bg-white p-2.5 rounded-lg border border-slate-800 inline-block self-start shadow-sm">
                                    <Image
                                      src={`data:image/png;base64,${base64Data.replace(/\n/g, '')}`}
                                      alt="Notebook Plot Output" 
                                      className="max-w-full h-auto"
                                      width={720}
                                      height={480}
                                      unoptimized
                                    />
                                  </div>
                                )
                              }
                              // Plain text outputs
                              if (out.data['text/plain']) {
                                const textPlain = Array.isArray(out.data['text/plain']) 
                                  ? out.data['text/plain'].join('') 
                                  : out.data['text/plain']
                                return <div key={oIdx} className="text-slate-100 font-semibold">{textPlain}</div>
                              }
                            } 
                            // 3. Execution Errors
                            else if (out.output_type === 'error') {
                              return (
                                <div key={oIdx} className="text-red-600">
                                  {out.ename}: {out.evalue}
                                  {out.traceback && <div className="mt-1 opacity-80 text-[10px]">{out.traceback.join('\n')}</div>}
                                </div>
                              )
                            }
                            return null
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )
    } catch (err) {
      console.error('Failed to parse notebook JSON, falling back to plain script viewer:', err)
    }
  }

  // Plain Script File Rendering (.py, .sql and Notebook fallback)
  const lines = content.split(/\r?\n/)
  
  // Theme styling based on detected language (All 3 use pure light/white themes now)
  const isPython = detectedLang === 'python'
  const isSql = detectedLang === 'sql'
  
  const headerBg = 'bg-[#f3f3f3]'
  const borderCol = 'border-slate-800'
  const editorBg = 'bg-white'
  const tabActiveBg = 'bg-white text-slate-100 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)]'
  const tabBorderActive = isPython 
    ? 'border-t-2 border-blue-500' 
    : isSql 
    ? 'border-t-2 border-emerald-500' 
    : 'border-t-2 border-slate-400'
  
  // Accent colors for download button outline
  const dlButtonClass = isPython
    ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20"
    : isSql
    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20"
    : "bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 border border-slate-500/20"

  return (
    <div className={`border ${borderCol} ${editorBg} rounded-2xl overflow-hidden shadow-sm flex flex-col w-full font-sans text-left ${isSplit ? 'h-full' : 'max-h-[1600px]'}`}>
      {/* File Header Tab Bar */}
      <div className={`flex items-center justify-between ${headerBg} border-b ${borderCol} shrink-0`}>
        {/* Active Tab */}
        <div className="flex items-center">
          <div className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold ${tabActiveBg} ${tabBorderActive} border-r ${borderCol} select-none`}>
            {isPython ? (
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
            ) : isSql ? (
              <Database className="w-3.5 h-3.5 text-emerald-650" />
            ) : (
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{title}</span>
            <X className="w-3 h-3 hover:text-slate-600 cursor-pointer ml-1 text-slate-400" />
          </div>
        </div>

        {/* Brand & Action Controls */}
        <div className="flex items-center gap-4 px-4 py-1.5">
          {/* Company Logo in Header */}
          <CompanyLogo className="h-4.5 w-auto hidden sm:block opacity-90" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(content)}
              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-100 font-semibold text-xs transition-all flex items-center gap-1.5 border border-transparent hover:border-slate-300"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {downloadAllowed && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 disabled:opacity-50 ${dlButtonClass}`}
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor Surface: Row-by-row rendering guarantees zero vertical layout drift */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar py-4 bg-white">
        {lines.map((lineHTML, idx) => (
          <div key={idx} className="flex min-w-full hover:bg-slate-100/60 group">
            {/* Line Number Gutter (pinned sticky to left during horizontal scrolling) */}
            <span className={`sticky left-0 select-none text-right pr-4 text-slate-400 !text-slate-400 border-r ${borderCol} w-12 shrink-0 font-mono text-xs leading-6 bg-[#f8f9fa] group-hover:bg-slate-100/80 transition-colors`}>
              {idx + 1}
            </span>
            {/* Code Line Container */}
            <span className="pl-4 pr-6 font-mono text-[13px] whitespace-pre leading-6 flex-1 block">
              <code 
                className="text-slate-100 !text-slate-100 font-mono whitespace-pre"
                dangerouslySetInnerHTML={{ __html: highlightCode(lineHTML, detectedLang) || ' ' }} 
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
