import { describe, expect, it } from 'vitest'

import { renderSimpleMarkdown } from '@/lib/markdown'
import { sanitizeHtml } from '@/lib/sanitize'

describe('sanitizeHtml', () => {
  it('removes executable tags and inline handlers', () => {
    const result = sanitizeHtml(
      '<p onclick="alert(1)">Safe</p><script>alert(1)</script><svg onload="alert(2)"></svg>',
    )

    expect(result).toBe('<p>Safe</p>')
  })

  it('blocks encoded and plain javascript URLs', () => {
    const result = sanitizeHtml(
      '<a href="javascript:alert(1)">One</a><a href="java&#x73;cript:alert(2)">Two</a>',
    )

    expect(result).toBe('<a>One</a><a>Two</a>')
  })

  it('preserves safe relative, HTTPS and image data URLs', () => {
    const result = sanitizeHtml(
      '<a href="/learn">Learn</a><a href="https://example.com">Docs</a><img src="data:image/png;base64,AAAA">',
    )

    expect(result).toContain('href="/learn"')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('src="data:image/png;base64,AAAA"')
  })
})

describe('renderSimpleMarkdown', () => {
  it('does not emit inline JavaScript for code blocks', () => {
    const result = renderSimpleMarkdown('```js\nconsole.log(1)\n```')

    expect(result).not.toContain('onclick=')
    expect(result).not.toContain('navigator.clipboard')
  })

  it('neutralizes unsafe markdown links and attribute injection', () => {
    const result = renderSimpleMarkdown('[Bad](javascript:alert(1)) [Quoted](https://example.com/\" onmouseover=\"alert(1))')

    expect(result).toContain('href="#"')
    expect(result).not.toContain('onmouseover=')
  })
})
