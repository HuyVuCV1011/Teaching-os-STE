import { FileText, FileDown, Code as CodeIcon, Network, Link as LinkIcon, FileJson } from 'lucide-react'
import { ComponentType } from 'react'

export const getMaterialIcon = (type: string): ComponentType<any> => {
  switch (type) {
    case 'pdf':
    case 'docx':
    case 'markdown':
    case 'text':
      return FileText
    case 'csv':
    case 'xlsx':
      return FileDown
    case 'flow_diagram':
    case 'json':
      return FileJson
    case 'code_repo':
      return CodeIcon
    default:
      return LinkIcon
  }
}

export const getMaterialTypeStyles = (type: string) => {
  switch (type) {
    case 'pdf':
      return {
        bg: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
        iconColor: 'text-rose-500',
      }
    case 'docx':
      return {
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
        iconColor: 'text-blue-500',
      }
    case 'markdown':
    case 'text':
      return {
        bg: 'bg-violet-500/10 border-violet-500/20 text-violet-500',
        iconColor: 'text-violet-500',
      }
    case 'csv':
    case 'xlsx':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
        iconColor: 'text-emerald-500',
      }
    case 'code_repo':
      return {
        bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
        iconColor: 'text-indigo-500',
      }
    case 'flow_diagram':
    case 'json':
      return {
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
        iconColor: 'text-amber-500',
      }
    default:
      return {
        bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
        iconColor: 'text-slate-400',
      }
  }
}
