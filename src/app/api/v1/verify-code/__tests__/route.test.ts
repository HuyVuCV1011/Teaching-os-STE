import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------- Hoisted mocks (run before vi.mock factories) ----------
const { mockFrom, mockSingle, mockSignJWT } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockIlike = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ ilike: mockIlike, eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  const mockSignJWT = vi.fn()

  return { mockFrom, mockSingle, mockSignJWT }
})

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('@/lib/jwt', () => ({
  signJWT: mockSignJWT,
}))

// ---------- Import the route handler ----------
import { POST } from '../route'

// ---------- Helpers ----------
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------- Tests ----------
describe('POST /api/v1/verify-code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignJWT.mockResolvedValue('mocked.jwt.token')
  })

  describe('input validation', () => {
    it('returns 400 if code is missing', async () => {
      const res = await POST(makeRequest({ email: 'a@b.com' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('code')
    })

    it('returns 400 if code is not a string', async () => {
      const res = await POST(makeRequest({ code: 123, email: 'a@b.com' }))
      expect(res.status).toBe(400)
    })

    it('returns 400 if email is missing', async () => {
      const res = await POST(makeRequest({ code: 'ABC' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('email')
    })

    it('returns 400 if email is not a string', async () => {
      const res = await POST(makeRequest({ code: 'ABC', email: 42 }))
      expect(res.status).toBe(400)
    })

    it('returns 400 if email lacks @', async () => {
      const res = await POST(makeRequest({ code: 'ABC', email: 'notanemail' }))
      expect(res.status).toBe(400)
    })
  })

  describe('class lookup', () => {
    it('returns 404 if class code is not found in DB', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found', code: 'PGRST116' } })

      const res = await POST(makeRequest({ code: 'UNKNOWN', email: 's@t.com' }))
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toMatch(/invalid/i)
    })

    it('returns 400 if class status is not running', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: '1', class_code: 'PAST', status: 'completed' },
        error: null,
      })

      const res = await POST(makeRequest({ code: 'PAST', email: 's@t.com' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/not started|completed/i)
    })
  })

  describe('enrollment check', () => {
    it('returns 403 if email is not whitelisted', async () => {
      // First query: class lookup succeeds
      mockSingle.mockResolvedValueOnce({
        data: { id: '1', class_code: 'STE2024', status: 'running' },
        error: null,
      })
      // Second query: enrollment lookup fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      })

      const res = await POST(makeRequest({ code: 'STE2024', email: 'unknown@t.com' }))
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/whitelist/i)
    })
  })

  describe('successful verification', () => {
    it('returns 200 with redirect URL and sets JWT cookie', async () => {
      // Class lookup succeeds
      mockSingle.mockResolvedValueOnce({
        data: { id: '10', class_code: 'STE2024', status: 'running' },
        error: null,
      })
      // Enrollment lookup succeeds
      mockSingle.mockResolvedValueOnce({
        data: { id: 'e1' },
        error: null,
      })

      mockSignJWT.mockResolvedValue('signed-jwt-value')

      const res = await POST(makeRequest({ code: '  ste2024  ', email: '  Student@School.edu  ' }))

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.classCode).toBe('STE2024')
      expect(body.redirectUrl).toBe('/learn/STE2024/dashboard')

      // Verify signJWT was called with correct payload
      expect(mockSignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          class_id: '10',
          class_code: 'STE2024',
          student_email: 'student@school.edu',
          role: 'student',
        }),
        expect.any(String),
      )

      // Verify JWT cookie on the response
      const setCookie = res.headers.get('set-cookie') || ''
      expect(setCookie).toContain('class_session_STE2024')
      expect(setCookie).toContain('signed-jwt-value')
      expect(setCookie).toContain('HttpOnly')
    })

    it('also sets a non-httpOnly student_email cookie', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: '10', class_code: 'STE2024', status: 'running' },
        error: null,
      })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'e1' },
        error: null,
      })

      const res = await POST(makeRequest({ code: 'STE2024', email: 'student@school.edu' }))

      // Check cookie headers - there should be two Set-Cookie headers
      // NextResponse.json().cookies.set() sets a single cookie on the response
      const cookies = res.headers.get('set-cookie')
      expect(cookies).toContain('student_email_STE2024')
      expect(cookies).toContain('student@school.edu')
    })

    it('normalizes class code to uppercase and trims whitespace', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: '1', class_code: 'ABC123', status: 'running' },
        error: null,
      })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'e1' },
        error: null,
      })

      await POST(makeRequest({ code: '  abc123  ', email: 's@t.com' }))

      // The ilike call should receive the trimmed+uppercased code
      expect(mockIlike).toHaveBeenCalledWith('class_code', 'ABC123')
    })

    it('normalizes email to lower-case and trims', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: '1', class_code: 'STE', status: 'running' },
        error: null,
      })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'e1' },
        error: null,
      })

      await POST(makeRequest({ code: 'STE', email: '  User@Example.COM  ' }))

      // The eq call for student_email should have the normalized email
      expect(mockEq).toHaveBeenCalledWith('student_email', 'user@example.com')
    })
  })

  describe('error handling', () => {
    it('returns 500 on unexpected errors', async () => {
      mockSingle.mockRejectedValueOnce(new Error('DB connection failed'))

      const res = await POST(makeRequest({ code: 'STE', email: 's@t.com' }))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('Internal Server Error')
    })

    it('handles invalid JSON body gracefully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })

      const res = await POST(req)
      // Should still return a valid response (catch block)
      expect(res.status).toBe(500)
    })
  })
})
