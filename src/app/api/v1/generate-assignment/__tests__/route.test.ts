import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { requireAdminUserMock } = vi.hoisted(() => ({
  requireAdminUserMock: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  requireAdminUser: requireAdminUserMock,
}))

import { POST } from '../route'

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/generate-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/generate-assignment', () => {
  beforeEach(() => {
    requireAdminUserMock.mockReset()
    vi.restoreAllMocks()
  })

  it('rejects unauthenticated callers before contacting the AI engine', async () => {
    requireAdminUserMock.mockRejectedValue(new Error('Unauthorized: No authentication token found'))
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(createRequest({ lessonContent: 'Lesson', questionCount: 5 }))

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('validates lesson content and question count', async () => {
    requireAdminUserMock.mockResolvedValue({ userId: 'admin-id', role: 'admin' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await POST(createRequest({ lessonContent: '', questionCount: 31 }))

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
