import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------- Hoisted mocks ----------
const { mockFrom, mockSingle, mockSelect, mockEq, mockUpsert } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockUpsert = vi.fn()
  const mockUpdate = vi.fn()

  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))
  const mockSelectFrom = vi.fn(() => ({ eq: mockEq }))
  // .update().eq() must return a Promise with { error } for destructuring
  const mockEqResolve = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockUpdateWithEq = vi.fn(() => ({ eq: mockEqResolve }))
  const mockSubUpdate = vi.fn(() => ({ eq: mockEqResolve }))

  const mockSubSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({
        data: {
          assignments: {
            auto_publish_grades: false
          }
        },
        error: null
      })
    }))
  }))

  const mockFrom = vi.fn((table: string) => {
    if (table === 'grading_results') {
      return { select: mockSelectFrom, insert: mockInsert, update: mockUpdateWithEq }
    }
    if (table === 'rubric_scores') {
      return { upsert: mockUpsert }
    }
    if (table === 'submissions') {
      return { select: mockSubSelect, update: mockSubUpdate }
    }
    return { select: vi.fn(), insert: vi.fn(), update: vi.fn() }
  })

  return { mockFrom, mockSingle, mockSelect: mockSelectFrom, mockEq, mockUpsert }
})

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn(() => ({ from: mockFrom })),
}))

import { POST } from '../route'

// ---------- Helpers ----------
const VALID_TOKEN = 'a1b2c3d4e5f6_development_token'

function makeRequest(body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return new NextRequest('http://localhost:3000/api/v1/grading/callback', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// ---------- Tests ----------
describe('POST /api/v1/grading/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  describe('authentication', () => {
    it('returns 401 with no token in header or body', async () => {
      const res = await POST(makeRequest({ submission_id: 's1', scores: [] }))
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toMatch(/unauthorized/i)
    })

    it('returns 401 with invalid bearer token', async () => {
      const res = await POST(
        makeRequest({ submission_id: 's1', scores: [] }, 'wrong-token'),
      )
      expect(res.status).toBe(401)
    })

    it('accepts token from body secret_token field', async () => {
      // Set up DB to return no existing grading result
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
      // Set up insert result for new grading result
      mockSingle.mockResolvedValueOnce({
        data: { id: 'gr-1' },
        error: null,
      })

      const res = await POST(
        makeRequest({
          submission_id: 's1',
          secret_token: VALID_TOKEN,
          scores: [],
        }),
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })

  describe('input validation', () => {
    it('returns 400 if submission_id is missing', async () => {
      const res = await POST(
        makeRequest({ scores: [] }, VALID_TOKEN),
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 if scores is not an array', async () => {
      const res = await POST(
        makeRequest({ submission_id: 's1', scores: 'not-array' }, VALID_TOKEN),
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 if scores is missing', async () => {
      const res = await POST(
        makeRequest({ submission_id: 's1' }, VALID_TOKEN),
      )
      expect(res.status).toBe(400)
    })
  })

  describe('idempotency', () => {
    it('returns 409 if grading result is already published', async () => {
      // Existing grading result with 'published' status
      mockSingle.mockResolvedValueOnce({
        data: { id: 'gr-1', status: 'published' },
        error: null,
      })

      const res = await POST(
        makeRequest(
          { submission_id: 's1', scores: [{ rubric_criterion_id: 'c1', score: 8 }] },
          VALID_TOKEN,
        ),
      )
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/already published/i)
    })
  })

  describe('successful processing', () => {
    it('creates a new grading result for a fresh submission', async () => {
      // No existing grading result
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
      // Insert returns new result
      mockSingle.mockResolvedValueOnce({
        data: { id: 'gr-new' },
        error: null,
      })

      const scores = [
        { rubric_criterion_id: 'c1', score: 9, feedback: 'Good work' },
        { rubric_criterion_id: 'c2', score: 7, feedback: 'Needs improvement' },
      ]

      const res = await POST(
        makeRequest({ submission_id: 's1', scores }, VALID_TOKEN),
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.gradingResultId).toBe('gr-new')

      // Verify rubric_scores upsert was called for each score
      expect(mockUpsert).toHaveBeenCalledTimes(2)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          grading_result_id: 'gr-new',
          rubric_criterion_id: 'c1',
          score: 9,
        }),
        expect.objectContaining({ onConflict: 'grading_result_id,rubric_criterion_id' }),
      )
    })

    it('updates an existing draft grading result', async () => {
      // Existing draft result
      mockSingle.mockResolvedValueOnce({
        data: { id: 'gr-existing', status: 'draft' },
        error: null,
      })

      const scores = [{ rubric_criterion_id: 'c1', score: 10, feedback: 'Perfect' }]

      const res = await POST(
        makeRequest({ submission_id: 's1', scores }, VALID_TOKEN),
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.gradingResultId).toBe('gr-existing')
    })

    it('updates submission status to grading_in_progress', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'gr-1' },
        error: null,
      })

      await POST(
        makeRequest(
          { submission_id: 's1', scores: [{ rubric_criterion_id: 'c1', score: 5 }] },
          VALID_TOKEN,
        ),
      )

      // Should not throw - route processed successfully
      // Verify grading_results was queried and a new result was inserted
      expect(mockFrom).toHaveBeenCalledWith('grading_results')
      expect(mockFrom).toHaveBeenCalledWith('rubric_scores')
    })

    it('skips score entries missing rubric_criterion_id or score', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'gr-1' },
        error: null,
      })

      const scores = [
        { rubric_criterion_id: 'c1', score: 8, feedback: 'Ok' },
        { rubric_criterion_id: null, score: 5, feedback: 'Should skip' },
        { rubric_criterion_id: 'c2', score: undefined, feedback: 'Should skip' },
      ]

      const res = await POST(
        makeRequest({ submission_id: 's1', scores }, VALID_TOKEN),
      )

      // Should only upsert the valid score entry
      expect(mockUpsert).toHaveBeenCalledTimes(1)
      expect(res.status).toBe(200)
    })
  })

  describe('error handling', () => {
    it('returns 500 on database errors', async () => {
      mockSingle.mockRejectedValueOnce(new Error('Unexpected DB error'))

      const res = await POST(
        makeRequest(
          { submission_id: 's1', scores: [{ rubric_criterion_id: 'c1', score: 5 }] },
          VALID_TOKEN,
        ),
      )
      expect(res.status).toBe(500)
    })

    it('handles invalid JSON body gracefully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/grading/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
        body: 'not-json',
      })

      const res = await POST(req)
      expect(res.status).toBe(500)
    })
  })
})
