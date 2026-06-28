export interface CertificateEligibilityResult {
  eligible: boolean
  averageGrade: number
  reason: string
}

export interface AssignmentData {
  id: string
  lesson_id: string
  max_score: number
}

export interface SubmissionData {
  id: string
  assignment_id: string
  status: string
  grading_results?: {
    id: string
    status: string
    client_total_score: number
  } | null
}

/**
 * Helper to determine if a student is eligible for a course completion certificate.
 * 
 * Rules:
 * 1. Must have active lessons (lessons associated with class courses and not drafts).
 * 2. Must complete all active lessons (100% completion).
 * 3. Must have active assignments. (If 0 assignments, default to not eligible).
 * 4. Must submit all active assignments.
 * 5. All active assignments must have PUBLISHED grades.
 * 6. The average percentage grade across all assignments must be >= 60.
 */
export function checkCertificateEligibility(
  activeLessonIds: string[],
  completedLessonIds: string[],
  assignments: AssignmentData[],
  submissions: SubmissionData[]
): CertificateEligibilityResult {
  // Rule 1: Must have active lessons
  if (!activeLessonIds || activeLessonIds.length === 0) {
    return {
      eligible: false,
      averageGrade: 0,
      reason: 'Lớp học không có bài học nào đang hoạt động.',
    }
  }

  // Rule 2: Complete all active lessons
  const completedSet = new Set(completedLessonIds)
  const completedAllLessons = activeLessonIds.every((id) => completedSet.has(id))
  if (!completedAllLessons) {
    return {
      eligible: false,
      averageGrade: 0,
      reason: 'Học sinh chưa hoàn thành toàn bộ bài học yêu cầu.',
    }
  }

  // Filter assignments mapping only to active lessons
  const activeLessonSet = new Set(activeLessonIds)
  const activeAssignments = assignments.filter((a) => activeLessonSet.has(a.lesson_id))

  // Rule 3: Must have active assignments. Default to not eligible if none.
  if (activeAssignments.length === 0) {
    return {
      eligible: false,
      averageGrade: 0,
      reason: 'Lớp học không có bài tập đánh giá nào để cấp chứng chỉ.',
    }
  }

  // Map submissions by assignment_id
  const submissionMap = new Map<string, SubmissionData>()
  submissions.forEach((sub) => {
    submissionMap.set(sub.assignment_id, sub)
  })

  // Rule 4: Must submit all active assignments
  for (const assign of activeAssignments) {
    if (!submissionMap.has(assign.id)) {
      return {
        eligible: false,
        averageGrade: 0,
        reason: 'Học sinh chưa nộp đầy đủ tất cả các bài tập.',
      }
    }
  }

  let totalPercentage = 0
  let gradedCount = 0

  for (const assign of activeAssignments) {
    const sub = submissionMap.get(assign.id)!
    const grade = sub.grading_results

    // Rule 5: All active assignments must have published grades
    if (!grade || grade.status !== 'published') {
      return {
        eligible: false,
        averageGrade: 0,
        reason: 'Một hoặc nhiều bài tập chưa được công bố điểm chính thức.',
      }
    }

    const maxScore = assign.max_score || 100
    const pct = (grade.client_total_score / maxScore) * 100
    totalPercentage += pct
    gradedCount++
  }

  const averageGrade = gradedCount > 0 ? totalPercentage / gradedCount : 0

  // Rule 6: Average published grade must be >= 60
  if (averageGrade < 60) {
    return {
      eligible: false,
      averageGrade,
      reason: `Điểm trung bình học tập (${averageGrade.toFixed(1)}%) dưới mức yêu cầu (60%).`,
    }
  }

  return {
    eligible: true,
    averageGrade,
    reason: 'Đủ điều kiện nhận chứng chỉ hoàn thành khóa học!',
  }
}
