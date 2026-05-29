export function sanitizeHtml(html: string): string {
  if (!html) return ''
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove iframe tags and their content
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  // Remove object and embed tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
  // Remove inline event handlers (onmouseover, onload, onclick, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
  // Remove javascript: protocol links
  sanitized = sanitized.replace(/href\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, '')
  return sanitized
}
