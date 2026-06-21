'use client'

import React, { useEffect } from 'react'

interface TheoryRendererProps {
  content: string
}

export default function TheoryRenderer({ content }: TheoryRendererProps) {
  useEffect(() => {
    const renderMermaid = () => {
      const mermaidElements = document.querySelectorAll('.mermaid')
      if (mermaidElements.length === 0) return

      if (!(window as any).mermaid) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
        script.async = true
        script.onload = () => {
          const mermaid = (window as any).mermaid
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true, htmlLabels: true }
          })
          mermaid.run()
        }
        document.body.appendChild(script)
      } else {
        mermaidElements.forEach(el => {
          el.removeAttribute('data-processed')
          const originalText = (el as any)._originalText || el.textContent
          if (originalText) {
            (el as any)._originalText = originalText
            el.textContent = originalText
          }
        })
        ;(window as any).mermaid.run()
      }
    }

    const timer = setTimeout(renderMermaid, 150)
    return () => clearTimeout(timer)
  }, [content])

  return (
    <article
      className="prose max-w-none text-slate-250 leading-relaxed text-sm md:text-base space-y-6"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
