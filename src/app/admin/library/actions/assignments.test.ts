import { expect, test, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getSupabaseServer: vi.fn(),
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/jwt', () => ({
  verifyJWT: vi.fn(),
}))

import { generateAssignmentQuestionsAction } from './assignments'

test('test generateAssignmentQuestionsAction', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ questions: [] }),
  } as any)

  const res = await generateAssignmentQuestionsAction({
    modelChoice: 'ollama',
    assignmentType: 'essay',
    category: 'theory',
    questionCount: 3,
    generateSampleData: false,
    lessonContent: 'Introduction to Python',
  })
  console.log('RESULT IS:', res)
  expect(res.success).toBe(true)

  fetchSpy.mockRestore()
})
