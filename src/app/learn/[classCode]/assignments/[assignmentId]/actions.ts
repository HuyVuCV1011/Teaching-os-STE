'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_1234567890'

export async function getVerifiedStudentSession(classCode: string) {
  const cookieStore = await cookies()
  const cookieName = `class_session_${classCode}`
  const cookieVal = cookieStore.get(cookieName)?.value
  if (!cookieVal) {
    return { success: false, error: 'Session not found' }
  }

  const payload = await verifyJWT(cookieVal, JWT_SECRET)
  if (payload && payload.class_code.toUpperCase() === classCode.toUpperCase()) {
    return { success: true, email: payload.student_email, classId: payload.class_id }
  }

  return { success: false, error: 'Invalid session' }
}

export async function fetchStudentSubmissionAction(classCode: string, assignmentId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const { data: subData, error } = await supabase
      .from('submissions')
      .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*)))')
      .eq('class_id', session.classId)
      .eq('assignment_id', assignmentId)
      .eq('student_identifier', session.email)
      .order('attempt_number', { ascending: false })
      .limit(1)

    if (error) throw error

    return { 
      success: true, 
      submission: subData && subData.length > 0 ? subData[0] : null,
      email: session.email,
      classId: session.classId
    }
  } catch (err: any) {
    console.error('Error fetching student submission:', err)
    return { success: false, error: err.message }
  }
}

export interface SubmitAssignmentInput {
  classCode: string
  assignmentId: string
  text: string
  files: Array<{ name: string; size: number; type: string }>
  uploadedUrls: string[]
}

export async function submitAssignmentAction(input: SubmitAssignmentInput) {
  const session = await getVerifiedStudentSession(input.classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    // 1. Fetch assignment and check limits
    const { data: assignment, error: assignError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', input.assignmentId)
      .single()

    if (assignError || !assignment) {
      throw new Error(`Assignment not found: ${assignError?.message || ''}`)
    }

    // Enforce file limit
    if (input.uploadedUrls.length > assignment.max_files) {
      throw new Error(`You are permitted to upload a maximum of ${assignment.max_files} files.`)
    }

    // Enforce total size limit
    const totalSize = input.files.reduce((acc, f) => acc + f.size, 0)
    if (totalSize > assignment.max_total_size_mb * 1024 * 1024) {
      throw new Error(`The total upload size exceeds the ${assignment.max_total_size_mb}MB limit.`)
    }

    // 2. Fetch class schedule to calculate due date & late status
    const { data: schedule } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', session.classId)
      .eq('lesson_id', assignment.lesson_id)
      .maybeSingle()

    const now = new Date()
    let isLate = false
    if (schedule?.due_date) {
      const dueDate = new Date(schedule.due_date)
      if (now > dueDate) {
        isLate = true
      }
    }

    // 3. Check existing submissions for attempt number
    const { data: existingSub } = await supabase
      .from('submissions')
      .select('attempt_number')
      .eq('class_id', session.classId)
      .eq('assignment_id', input.assignmentId)
      .eq('student_identifier', session.email)
      .order('attempt_number', { ascending: false })
      .limit(1)

    const nextAttempt = existingSub && existingSub.length > 0 ? (existingSub[0].attempt_number + 1) : 1

    // 4. Create transactional structure
    // Insert submission
    const { data: newSub, error: subError } = await supabase
      .from('submissions')
      .insert([
        {
          class_id: session.classId,
          assignment_id: input.assignmentId,
          student_identifier: session.email,
          submitted_text: input.text,
          submitted_files: input.uploadedUrls,
          status: 'submitted',
          attempt_number: nextAttempt,
          is_late: isLate,
          rubric_snapshot_id: assignment.rubric_snapshot_id
        },
      ])
      .select()
      .single()

    if (subError || !newSub) {
      throw subError || new Error('Failed to create submission record')
    }

    // Insert submission_files
    if (input.uploadedUrls.length > 0) {
      const filesToInsert = input.uploadedUrls.map((pathName, index) => {
        const file = input.files[index]
        const nameParts = pathName.split('/')
        const hashAndName = nameParts[nameParts.length - 1]
        const hash = hashAndName.split('_')[0] || 'hash'
        
        return {
          submission_id: newSub.id,
          storage_bucket: 'student-submissions',
          storage_path: pathName,
          original_filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
          sha256: hash,
          processing_status: 'pending'
        }
      })

      const { error: filesError } = await supabase
        .from('submission_files')
        .insert(filesToInsert)

      if (filesError) {
        // Rollback submission record
        await supabase.from('submissions').delete().eq('id', newSub.id)
        throw filesError
      }
    }

    // 5. Trigger grading
    try {
      await triggerRubricoreGradingAction(newSub.id)
    } catch (err) {
      console.error('Async grading trigger failed:', err)
    }

    return { success: true, submissionId: newSub.id }

  } catch (error: any) {
    console.error('Submission transaction failed:', error)
    return { success: false, error: error.message }
  }
}

export async function fetchStudentGradesAction(classCode: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const classId = session.classId
    const courseIds = []

    // 1. Get main course from class
    const { data: classData, error: classErr } = await supabase
      .from('classes')
      .select('id, course_id')
      .eq('id', classId)
      .single()

    if (classErr || !classData) throw classErr || new Error('Class not found')
    if (classData.course_id) {
      courseIds.push(classData.course_id)
    }

    // Get any other courses mapped via class_courses
    const { data: mappedCourses } = await supabase
      .from('class_courses')
      .select('course_id')
      .eq('class_id', classId)

    if (mappedCourses) {
      mappedCourses.forEach((c: any) => {
        if (c.course_id && !courseIds.includes(c.course_id)) {
          courseIds.push(c.course_id)
        }
      })
    }

    if (courseIds.length === 0) {
      return { success: true, grades: [], email: session.email }
    }

    // 2. Fetch all modules and lessons
    const { data: lessonsData, error: lessonsErr } = await supabase
      .from('lessons')
      .select('id, title, module_id, modules(title, course_id)')
      .in('modules.course_id', courseIds)

    if (lessonsErr) throw lessonsErr

    const filteredLessons = (lessonsData || []).filter((l: any) => l.modules)
    const lessonIds = filteredLessons.map((l: any) => l.id)

    if (lessonIds.length === 0) {
      return { success: true, grades: [], email: session.email }
    }

    // 3. Fetch schedules
    const { data: schedulesData } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', classId)
      .in('lesson_id', lessonIds)

    const scheduleMap = new Map<string, any>()
    schedulesData?.forEach(s => scheduleMap.set(s.lesson_id, s))

    // 4. Fetch assignments
    const { data: assignmentsData, error: assignErr } = await supabase
      .from('assignments')
      .select('*')
      .in('lesson_id', lessonIds)

    if (assignErr) throw assignErr
    if (!assignmentsData || assignmentsData.length === 0) {
      return { success: true, grades: [], email: session.email }
    }

    // 5. Fetch student submissions
    const { data: submissionsData, error: subsErr } = await supabase
      .from('submissions')
      .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*)))')
      .eq('class_id', classId)
      .eq('student_identifier', session.email)

    if (subsErr) throw subsErr

    const submissionMap = new Map<string, any>()
    submissionsData?.forEach(sub => {
      submissionMap.set(sub.assignment_id, sub)
    })

    // 6. Synthesize grade list
    const grades = assignmentsData.map(assign => {
      const matchingLesson = filteredLessons.find(l => l.id === assign.lesson_id)
      const matchingSchedule = scheduleMap.get(assign.lesson_id)
      const matchingSub = submissionMap.get(assign.id)
      
      let gradingResult = null
      if (matchingSub?.grading_results && matchingSub.grading_results.status === 'published') {
        gradingResult = matchingSub.grading_results
      }

      return {
        id: assign.id,
        title: assign.title,
        lessonTitle: matchingLesson?.title || 'Unknown lesson',
        moduleTitle: matchingLesson?.modules?.title || 'Unknown module',
        dueDate: matchingSchedule?.due_date || null,
        maxScore: assign.max_score,
        submission: matchingSub || null,
        grade: gradingResult || null
      }
    })

    return { success: true, grades, email: session.email }

  } catch (err: any) {
    console.error('Failed to load student grades:', err)
    return { success: false, error: err.message }
  }
}

export async function triggerRubricoreGradingAction(submissionId: string) {
  const supabase = getSupabaseServer(true)
  
  // 1. Fetch submission with assignment and rubric criteria details
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('*, assignments(*, rubrics(*, rubric_criteria(*)))')
    .eq('id', submissionId)
    .single()

  if (subError || !submission) {
    console.error("Submission not found for grading trigger:", subError)
    return { success: false, error: "Submission not found" }
  }

  // 2. Create a grading_runs entry in Supabase with status = 'queued'
  const { data: run, error: runError } = await supabase
    .from('grading_runs')
    .insert([
      {
        submission_id: submissionId,
        assignment_id: submission.assignment_id,
        engine: 'rubricore',
        engine_version: 'pilot-ollama-v1',
        status: 'queued',
        started_at: null,
      }
    ])
    .select()
    .single()

  if (runError || !run) {
    console.error("Failed to create grading_runs record:", runError)
    return { success: false, error: "Failed to initialize grading run" }
  }

  // Update submission status to grading_in_progress
  await supabase
    .from('submissions')
    .update({ status: 'grading_in_progress' })
    .eq('id', submissionId)

  return { success: true, runId: run.id }
}
