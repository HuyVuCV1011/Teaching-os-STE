/**
 * Standard utility to render markdown subsets into beautiful HTML.
 * Used consistently across lessons, assignments, and editor screens.
 */
export function renderSimpleMarkdown(md: string): string {
  if (!md) return ''

  const lines = md.split(/\r?\n/)
  const result: string[] = []
  
  let inCodeBlock = false
  let codeLanguage = ''
  let codeLines: string[] = []
  
  let inTable = false
  let tableHeaders: string[] = []
  let tableAlignments: string[] = []
  let tableRows: string[][] = []
  
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  
  let inBlockquote = false
  let blockquoteLines: string[] = []
  
  let accumulatedParagraphLines: string[] = []

  // Helper to flush accumulated paragraph
  function flushParagraph() {
    if (accumulatedParagraphLines.length > 0) {
      result.push(`<p class="my-4 text-slate-250 leading-relaxed text-sm md:text-base">${parseInline(accumulatedParagraphLines.join(' '))}</p>`)
      accumulatedParagraphLines = []
    }
  }

  // Helper to close active block structures
  function closeActiveBlocks() {
    flushParagraph()
    if (inList) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
      listType = null
    }
    if (inBlockquote) {
      result.push(`<blockquote class="border-l-4 border-slate-350 bg-slate-50/50 pl-4 py-2.5 my-4 text-slate-550 italic rounded-r">${parseInline(blockquoteLines.join(' '))}</blockquote>`)
      inBlockquote = false
      blockquoteLines = []
    }
    if (inTable) {
      let tableHtml = '<div class="overflow-x-auto my-6 border border-slate-805 rounded-xl shadow-sm"><table class="min-w-full divide-y divide-slate-805 text-xs md:text-sm">'
      // Headers
      tableHtml += '<thead class="bg-slate-900 text-slate-100 font-bold border-b border-slate-805">'
      tableHtml += '<tr>'
      tableHeaders.forEach((h, idx) => {
        const align = tableAlignments[idx] || 'left'
        tableHtml += `<th class="px-4 py-3 text-${align} font-bold border-r last:border-0 border-slate-805 bg-slate-900 tracking-wider">${parseInline(h)}</th>`
      });
      tableHtml += '</tr></thead>'
      // Body
      tableHtml += '<tbody class="divide-y divide-slate-805 bg-slate-950 text-slate-250">'
      tableRows.forEach(row => {
        tableHtml += '<tr class="hover:bg-slate-900/30 transition-colors">'
        row.forEach((cell, idx) => {
          const align = tableAlignments[idx] || 'left'
          tableHtml += `<td class="px-4 py-3 text-${align} border-r last:border-0 border-slate-805">${parseInline(cell)}</td>`
        });
        tableHtml += '</tr>'
      });
      tableHtml += '</tbody></table></div>'
      result.push(tableHtml)
      inTable = false
      tableHeaders = []
      tableAlignments = []
      tableRows = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 1. Code block check
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        inCodeBlock = false
        const rawCode = codeLines.join('\n')
        const escapedCode = rawCode
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        if (codeLanguage === 'mermaid') {
          // Render mermaid container
          result.push(`<div class="mermaid-block my-6 flex justify-center bg-slate-900/10 border border-slate-850 p-6 rounded-2xl shadow-sm"><pre class="mermaid text-center w-full">${escapedCode}</pre></div>`)
        } else {
          // Render beautiful code editor mockup
          result.push(`
            <div class="code-block-wrapper my-6 border border-slate-805 rounded-xl bg-slate-900 overflow-hidden shadow-md font-mono">
              <div class="flex items-center justify-between px-4 py-2 bg-slate-955/20 border-b border-slate-805 text-xs text-slate-400">
                <span class="text-[10px] uppercase font-bold tracking-widest text-slate-300">${codeLanguage || 'code'}</span>
                <span class="text-[10px] text-slate-500">Code</span>
              </div>
              <pre class="p-4 overflow-x-auto text-xs text-slate-100 leading-relaxed bg-slate-900"><code>${escapedCode}</code></pre>
            </div>
          `)
        }
        codeLines = []
        codeLanguage = ''
      } else {
        closeActiveBlocks()
        inCodeBlock = true
        codeLanguage = trimmed.slice(3).trim().toLowerCase()
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // 2. Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      closeActiveBlocks()
      result.push('<hr class="my-8 border-t border-slate-805" />')
      continue
    }

    // 3. Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      closeActiveBlocks()
      const level = headingMatch[1].length
      const text = parseInline(headingMatch[2].trim())
      
      let headingClasses = ''
      if (level === 1) headingClasses = 'text-3xl font-extrabold text-slate-105 border-b border-slate-805 pb-2 mt-8 mb-4 tracking-tight'
      else if (level === 2) headingClasses = 'text-2xl font-bold text-slate-105 border-b border-slate-805 pb-1.5 mt-6 mb-3 tracking-tight'
      else if (level === 3) headingClasses = 'text-xl font-bold text-slate-105 mt-5 mb-2'
      else headingClasses = 'text-lg font-bold text-slate-200 mt-4 mb-2'

      result.push(`<h${level} class="${headingClasses}">${text}</h${level}>`)
      continue
    }

    // 4. Blockquotes
    if (line.startsWith('>')) {
      if (!inBlockquote) {
        closeActiveBlocks()
        inBlockquote = true
      }
      const quoteText = line.slice(1).trim()
      blockquoteLines.push(quoteText)
      continue
    }

    // 5. Tables
    if (line.startsWith('|')) {
      // Split cells
      const cells = line.split('|').map(c => c.trim()).slice(1, -1)
      
      if (!inTable) {
        closeActiveBlocks()
        inTable = true
        tableHeaders = cells
        // Check if next line is divider
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : ''
        if (nextLine.startsWith('|') && nextLine.includes('---')) {
          const alignCells = nextLine.split('|').map(c => c.trim()).slice(1, -1)
          tableAlignments = alignCells.map(c => {
            if (c.startsWith(':') && c.endsWith(':')) return 'center'
            if (c.endsWith(':')) return 'right'
            return 'left'
          })
          i++ // skip separator line
        } else {
          tableAlignments = cells.map(() => 'left')
        }
      } else {
        tableRows.push(cells)
      }
      continue
    }

    // 6. Lists (unordered: `-` or `*`, ordered: `1.`, `2.`)
    const ulMatch = line.match(/^([-*])\s+(.*)$/)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/)

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeActiveBlocks()
        inList = true
        listType = 'ul'
        result.push('<ul class="list-disc pl-6 my-4 space-y-2 text-slate-250">')
      }
      result.push(`<li class="leading-relaxed">${parseInline(ulMatch[2].trim())}</li>`)
      continue
    }

    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeActiveBlocks()
        inList = true
        listType = 'ol'
        result.push('<ol class="list-decimal pl-6 my-4 space-y-2 text-slate-250">')
      }
      result.push(`<li class="leading-relaxed">${parseInline(olMatch[2].trim())}</li>`)
      continue
    }

    // 7. Blank lines
    if (trimmed === '') {
      closeActiveBlocks()
      continue
    }

    // 8. Paragraph / Plain text
    accumulatedParagraphLines.push(line.trim())
  }

  closeActiveBlocks()
  return result.join('\n')
}

function parseInline(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  html = html
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-50">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-900/10 border border-slate-805 font-mono text-[11.5px] text-blue-600 font-semibold">$1</code>')
    // Links [Text](URL)
    .replace(/\[(.*?)\]\((.*?)\)/g, (_match, label: string, rawUrl: string) => {
      const url = rawUrl.trim()
      const safeUrl = /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(url) &&
        !/[\s"'<>]/.test(url)
        ? url
        : '#'
      const escapedUrl = safeUrl
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
      return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 hover:underline transition-colors font-medium">${label}</a>`
    })
  return html
}
