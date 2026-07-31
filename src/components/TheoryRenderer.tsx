'use client'

import React, { useEffect } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

interface TheoryRendererProps {
  content: string
}

interface MermaidApi {
  initialize: (config: Record<string, unknown>) => void
  run: () => Promise<void> | void
}

type MermaidWindow = Window & {
  mermaid?: MermaidApi
}

type MermaidElement = Element & {
  _originalText?: string | null
}

export default function TheoryRenderer({ content }: TheoryRendererProps) {
  useEffect(() => {
    const renderMermaid = () => {
      const mermaidElements = document.querySelectorAll('.mermaid')
      if (mermaidElements.length === 0) return

      const mermaidWindow = window as MermaidWindow

      if (!mermaidWindow.mermaid) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
        script.async = true
        script.onload = () => {
          const mermaid = mermaidWindow.mermaid
          if (!mermaid) return

          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'strict',
            flowchart: { useMaxWidth: true, htmlLabels: false }
          })
          mermaid.run()
        }
        document.body.appendChild(script)
      } else {
        mermaidElements.forEach(el => {
          el.removeAttribute('data-processed')
          const mermaidElement = el as MermaidElement
          const originalText = mermaidElement._originalText || el.textContent
          if (originalText) {
            mermaidElement._originalText = originalText
            el.textContent = originalText
          }
        })
        mermaidWindow.mermaid.run()
      }
    }

    const timer = setTimeout(renderMermaid, 150)
    return () => clearTimeout(timer)
  }, [content])

  return (
    <article
      className="prose max-w-none text-slate-250 leading-relaxed text-sm md:text-base space-y-6"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  )
}
