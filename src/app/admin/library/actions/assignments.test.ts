import { expect, test } from 'vitest'
import { generateAssignmentQuestionsAction } from './assignments'

test('test generateAssignmentQuestionsAction', async () => {
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
})
