export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const blockedTags = [
    'script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'base',
    'form', 'input', 'button', 'textarea', 'select', 'option', 'svg', 'math',
  ]
  let sanitized = html
  const normalizeProtocol = (value: string) => value
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (_match, hex, decimal) =>
      String.fromCharCode(Number.parseInt(hex || decimal, hex ? 16 : 10)),
    )
    .replace(/&colon;/gi, ':')
    .trim()
    .replace(/[\u0000-\u0020]+/g, '')

  blockedTags.forEach((tag) => {
    sanitized = sanitized.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'),
      '',
    )
    sanitized = sanitized.replace(new RegExp(`<${tag}\\b[^>]*\\/?\\s*>`, 'gi'), '')
  })

  sanitized = sanitized
    .replace(/\s+on\w+\s*=\s*(?:"[\s\S]*?"|'[\s\S]*?'|[^\s>]+)/gi, '')
    .replace(/\s+(?:style|srcdoc)\s*=\s*(?:"[\s\S]*?"|'[\s\S]*?'|[^\s>]+)/gi, '')
    .replace(
      /\s+(href|src|xlink:href|formaction)\s*=\s*(['"])([\s\S]*?)\2/gi,
      (match, attribute: string, quote: string, value: string) => {
        const normalized = normalizeProtocol(value)
        const isImageSource = attribute.toLowerCase() === 'src'
        const safe = /^(https?:|mailto:|#|\/)/i.test(normalized) ||
          (isImageSource && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(normalized))
        return safe ? ` ${attribute}=${quote}${value}${quote}` : ''
      },
    )
    .replace(
      /\s+(href|src|xlink:href|formaction)\s*=\s*([^\s"'>]+)/gi,
      (match, attribute: string, value: string) => {
        const normalized = normalizeProtocol(value)
        const isImageSource = attribute.toLowerCase() === 'src'
        const safe = /^(https?:|mailto:|#|\/)/i.test(normalized) ||
          (isImageSource && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(normalized))
        return safe ? ` ${attribute}="${value}"` : ''
      },
    )

  return sanitized
}
