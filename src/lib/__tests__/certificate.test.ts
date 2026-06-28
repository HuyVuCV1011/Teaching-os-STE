import { describe, it, expect } from 'vitest'
import { checkCertificateEligibility, AssignmentData, SubmissionData } from '../certificate'

describe('checkCertificateEligibility', () => {
  const activeLessons = ['lesson-1', 'lesson-2']

  it('returns not eligible when there are no active lessons', () => {
    const result = checkCertificateEligibility([], [], [], [])
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('không có bài học nào')
  })

  it('returns not eligible when not all active lessons are completed', () => {
    const result = checkCertificateEligibility(activeLessons, ['lesson-1'], [], [])
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('chưa hoàn thành toàn bộ bài học')
  })

  it('returns not eligible when there are 0 active assignments', () => {
    const result = checkCertificateEligibility(activeLessons, activeLessons, [], [])
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('không có bài tập đánh giá nào')
  })

  it('returns not eligible when some active assignments are not submitted', () => {
    const assignments: AssignmentData[] = [
      { id: 'assign-1', lesson_id: 'lesson-1', max_score: 10 },
      { id: 'assign-2', lesson_id: 'lesson-2', max_score: 100 },
    ]
    const submissions: SubmissionData[] = [
      { id: 'sub-1', assignment_id: 'assign-1', status: 'submitted' },
    ]
    const result = checkCertificateEligibility(activeLessons, activeLessons, assignments, submissions)
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('chưa nộp đầy đủ tất cả các bài tập')
  })

  it('returns not eligible when some submissions are not published', () => {
    const assignments: AssignmentData[] = [
      { id: 'assign-1', lesson_id: 'lesson-1', max_score: 10 },
    ]
    const submissions: SubmissionData[] = [
      { 
        id: 'sub-1', 
        assignment_id: 'assign-1', 
        status: 'submitted',
        grading_results: { id: 'gr-1', status: 'draft', client_total_score: 8 }
      },
    ]
    const result = checkCertificateEligibility(activeLessons, activeLessons, assignments, submissions)
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('chưa được công bố điểm chính thức')
  })

  it('returns not eligible when average grade is less than 60', () => {
    const assignments: AssignmentData[] = [
      { id: 'assign-1', lesson_id: 'lesson-1', max_score: 10 },
      { id: 'assign-2', lesson_id: 'lesson-2', max_score: 100 },
    ]
    const submissions: SubmissionData[] = [
      { 
        id: 'sub-1', 
        assignment_id: 'assign-1', 
        status: 'submitted',
        grading_results: { id: 'gr-1', status: 'published', client_total_score: 5 } // 50%
      },
      { 
        id: 'sub-2', 
        assignment_id: 'assign-2', 
        status: 'submitted',
        grading_results: { id: 'gr-2', status: 'published', client_total_score: 65 } // 65%
      },
    ]
    // Average = (50 + 65) / 2 = 57.5%
    const result = checkCertificateEligibility(activeLessons, activeLessons, assignments, submissions)
    expect(result.eligible).toBe(false)
    expect(result.averageGrade).toBe(57.5)
    expect(result.reason).toContain('dưới mức yêu cầu (60%)')
  })

  it('does not round a 59.5% average up to the 60% eligibility threshold', () => {
    const assignments: AssignmentData[] = [
      { id: 'assign-1', lesson_id: 'lesson-1', max_score: 100 },
      { id: 'assign-2', lesson_id: 'lesson-2', max_score: 100 },
    ]
    const submissions: SubmissionData[] = [
      {
        id: 'sub-1',
        assignment_id: 'assign-1',
        status: 'submitted',
        grading_results: { id: 'gr-1', status: 'published', client_total_score: 59 },
      },
      {
        id: 'sub-2',
        assignment_id: 'assign-2',
        status: 'submitted',
        grading_results: { id: 'gr-2', status: 'published', client_total_score: 60 },
      },
    ]

    const result = checkCertificateEligibility(activeLessons, activeLessons, assignments, submissions)

    expect(result.eligible).toBe(false)
    expect(result.averageGrade).toBe(59.5)
  })

  it('returns eligible when all conditions are met and average grade is >= 60', () => {
    const assignments: AssignmentData[] = [
      { id: 'assign-1', lesson_id: 'lesson-1', max_score: 10 },
      { id: 'assign-2', lesson_id: 'lesson-2', max_score: 100 },
    ]
    const submissions: SubmissionData[] = [
      { 
        id: 'sub-1', 
        assignment_id: 'assign-1', 
        status: 'submitted',
        grading_results: { id: 'gr-1', status: 'published', client_total_score: 7 } // 70%
      },
      { 
        id: 'sub-2', 
        assignment_id: 'assign-2', 
        status: 'submitted',
        grading_results: { id: 'gr-2', status: 'published', client_total_score: 60 } // 60%
      },
    ]
    // Average = (70 + 60) / 2 = 65%
    const result = checkCertificateEligibility(activeLessons, activeLessons, assignments, submissions)
    expect(result.eligible).toBe(true)
    expect(result.averageGrade).toBe(65)
    expect(result.reason).toContain('Đủ điều kiện nhận chứng chỉ')
  })
})
