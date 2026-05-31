/**
 * Standard utility to render simple markdown subsets into basic HTML.
 * Used consistently across lessons, assignments, and editor screens.
 */
export function renderSimpleMarkdown(md: string): string {
  if (!md) return ''
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^# (.*?)$/gm, '<h1 class="text-lg font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-200/30">$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-slate-100 mt-3 mb-2 pb-0.5 border-b border-slate-200/20">$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-slate-100 mt-2 mb-1">$1</h3>')
    // Bold & Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-slate-900/10 px-1 py-0.5 rounded text-rose-600 font-mono text-[11px]">$1</code>')
    // Blockquotes
    .replace(/^&gt;\s*(.*?)$/gm, '<blockquote class="border-l-4 border-indigo-400 bg-indigo-50/50 pl-3 py-1.5 my-2 rounded-r text-slate-400 italic">$1</blockquote>')
    // Links [Text](URL)
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 underline transition-colors">$1</a>')
    // Bullet lists - or *
    .replace(/^[-*]\s+(.*?)$/gm, '<div class="flex items-start gap-1.5 my-1 text-slate-350"><span class="text-blue-500 font-bold shrink-0">•</span><span class="flex-1">$1</span></div>')
    // Line breaks
    .replace(/\n/g, '<br />')
  return html
}
