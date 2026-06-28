import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/logout', () => {
  it('returns 400 if classCode is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('valid class code')
  })

  it('rejects class codes that cannot be used safely in cookie names', async () => {
    const res = await POST(makeRequest({ classCode: '../../admin' }))

    expect(res.status).toBe(400)
  })

  it('expires both session and email cookies with correct settings', async () => {
    const res = await POST(makeRequest({ classCode: 'STE2024' }))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)

    // Check Set-Cookie headers
    const setCookieHeaders = res.headers.getSetCookie()
    expect(setCookieHeaders.length).toBe(2)

    // Check session cookie
    const sessionCookie = setCookieHeaders.find(c => c.includes('class_session_STE2024'))
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie).toContain('Max-Age=0')
    expect(sessionCookie).toContain('Path=/')
    expect(sessionCookie).toContain('HttpOnly')

    // Check email cookie
    const emailCookie = setCookieHeaders.find(c => c.includes('student_email_STE2024'))
    expect(emailCookie).toBeDefined()
    expect(emailCookie).toContain('Max-Age=0')
    expect(emailCookie).toContain('Path=/')
    expect(emailCookie).not.toContain('HttpOnly')
  })
})
