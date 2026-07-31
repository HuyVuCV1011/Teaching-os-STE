'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'

const execAsync = promisify(exec)

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('Server configuration error: JWT_SECRET is required')
  }
  return secret
}

type SignedUrlResponse = {
  signedUrl?: string | null
  signedURL?: string | null
  publicUrl?: string | null
}

type ClassCourseRow = {
  course_id: string | null
}

type LessonModuleRow = {
  title?: string | null
  course_id?: string | null
}

type LessonWithModule = {
  id: string
  title?: string | null
  lesson_id?: string | null
  module_id?: string | null
  metadata?: {
    status?: string | null
  } | null
  modules?: LessonModuleRow | LessonModuleRow[] | null
}

type ClassScheduleRow = {
  lesson_id: string
  due_date?: string | null
}

type StudentProgressRow = {
  lesson_id: string
}

type DiscussionCommentRow = {
  id: string
  class_id: string
  lesson_id: string
  student_email: string
  comment_text: string
  is_instructor?: boolean | null
  created_at: string
}

type SubmissionRow = {
  id?: string | null
  status?: string | null
  assignment_id: string
  grading_results?: {
    id: string
    status?: string | null
    total_score?: string | number | null
    overall_feedback?: string | null
    rubric_scores?: {
      id: string
      score?: number | null
      feedback?: string | null
      rubric_criteria?: {
        name?: string | null
        max_points?: number | null
      } | null
    }[]
  } | null
}

type AssignmentRow = {
  id: string
  title?: string | null
  lesson_id: string
  instructions?: string | null
  prompt_file_path?: string | null
  max_files?: number | null
  max_total_size_mb?: number | null
  max_score?: number | null
}

type SubmissionFileMetadata = {
  name: string
  size: number
  type: string
}

type EmbeddingApiResponse = {
  status?: string
  embeddings?: number[][]
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export async function getVerifiedStudentSession(classCode: string) {
  const cookieStore = await cookies()
  const cookieName = `class_session_${classCode}`
  const cookieVal = cookieStore.get(cookieName)?.value
  if (!cookieVal) {
    return { success: false, error: 'Session not found' }
  }

  const payload = await verifyJWT(cookieVal, getJwtSecret())
  if (payload && payload.class_code.toUpperCase() === classCode.toUpperCase()) {
    return { success: true, email: payload.student_email, classId: payload.class_id }
  }

  return { success: false, error: 'Invalid session' }
}

async function assertLessonBelongsToClass(
  supabase: ReturnType<typeof getSupabaseServer>,
  classId: string,
  lessonId: string,
) {
  const [classResult, mappingsResult, lessonResult] = await Promise.all([
    supabase
      .from('classes')
      .select('course_id')
      .eq('id', classId)
      .single(),
    supabase
      .from('class_courses')
      .select('course_id')
      .eq('class_id', classId),
    supabase
      .from('lessons')
      .select('id, modules(course_id)')
      .eq('id', lessonId)
      .single(),
  ])

  if (classResult.error || !classResult.data) {
    throw classResult.error || new Error('Class not found')
  }
  if (mappingsResult.error) throw mappingsResult.error
  if (lessonResult.error || !lessonResult.data) {
    throw lessonResult.error || new Error('Lesson not found')
  }

  const allowedCourseIds = new Set<string>()
  if (classResult.data.course_id) allowedCourseIds.add(classResult.data.course_id)
  for (const mapping of mappingsResult.data || []) {
    if (mapping.course_id) allowedCourseIds.add(mapping.course_id)
  }

  const modules = lessonResult.data.modules as
    | { course_id?: string | null }
    | { course_id?: string | null }[]
    | null
  const lessonCourseId = Array.isArray(modules)
    ? modules[0]?.course_id
    : modules?.course_id

  if (!lessonCourseId || !allowedCourseIds.has(lessonCourseId)) {
    throw new Error('This lesson is not available in the authenticated class')
  }
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
  } catch (err) {
    console.error('Error fetching student submission:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to fetch student submission') }
  }
}

export interface SubmitAssignmentInput {
  classCode: string
  assignmentId: string
  text: string
  files: Array<{ name: string; size: number; type: string }>
  uploadedUrls: string[]
  showcaseRequested?: boolean
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
    await assertLessonBelongsToClass(supabase, session.classId, assignment.lesson_id)

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
          rubric_snapshot_id: assignment.rubric_snapshot_id,
          showcase_requested: input.showcaseRequested || false
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

    // Generate and save submission embedding for similarity check
    try {
      const compiledText = await compileSubmissionTextHelper(newSub.id, input.text, input.uploadedUrls, supabase)
      const embedding = await getSubmissionEmbedding(compiledText)
      if (embedding) {
        await supabase
          .from('submission_embeddings')
          .insert({
            submission_id: newSub.id,
            embedding: embedding
          })
      }
    } catch (embErr) {
      console.error('Failed to generate similarity embedding:', embErr)
    }

    // 5. Trigger grading
    try {
      await triggerRubricoreGradingAction(newSub.id)
    } catch (err) {
      console.error('Async grading trigger failed:', err)
    }

    return { success: true, submissionId: newSub.id }

  } catch (error) {
    console.error('Submission transaction failed:', error)
    return { success: false, error: getErrorMessage(error, 'Submission transaction failed') }
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
    const courseIds: string[] = []

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

    const { data: issuedCertificate, error: certificateError } = await supabase
      .from('certificates')
      .select('id, grade_average')
      .eq('class_id', classId)
      .eq('student_email', session.email)
      .maybeSingle()

    if (certificateError) throw certificateError

    // Get any other courses mapped via class_courses
    const { data: mappedCourses, error: mappedCoursesError } = await supabase
      .from('class_courses')
      .select('course_id')
      .eq('class_id', classId)

    if (mappedCoursesError) throw mappedCoursesError

    if (mappedCourses) {
      ;(mappedCourses as ClassCourseRow[]).forEach((c) => {
        if (c.course_id && !courseIds.includes(c.course_id)) {
          courseIds.push(c.course_id)
        }
      })
    }

    if (courseIds.length === 0) {
      return {
        success: true,
        grades: [],
        email: session.email,
        issuedCertificate,
        totalLessons: 0,
        completedLessons: 0,
        activeLessonIds: [],
        completedLessonIds: [],
      }
    }

    // 2. Fetch all modules and lessons
    const { data: lessonsData, error: lessonsErr } = await supabase
      .from('lessons')
      .select('id, title, module_id, metadata, modules(title, course_id)')
      .in('modules.course_id', courseIds)

    if (lessonsErr) throw lessonsErr

    const filteredLessons = (lessonsData || []).filter(
      (l: LessonWithModule) => l.modules && l.metadata?.status !== 'draft'
    )
    const lessonIds = filteredLessons.map((l: LessonWithModule) => l.id)

    if (lessonIds.length === 0) {
      return {
        success: true,
        grades: [],
        email: session.email,
        totalLessons: 0,
        completedLessons: 0,
        activeLessonIds: [],
        completedLessonIds: [],
        issuedCertificate,
      }
    }

    // 3. Fetch schedules
    const { data: schedulesData } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', classId)
      .in('lesson_id', lessonIds)

    const scheduleMap = new Map<string, ClassScheduleRow>()
    ;(schedulesData as ClassScheduleRow[] | null)?.forEach(s => scheduleMap.set(s.lesson_id, s))

    // Progress is independent of whether the course currently has assignments.
    const { data: progressList, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('lesson_id')
      .eq('class_id', classId)
      .eq('student_email', session.email)
      .in('lesson_id', lessonIds)

    if (progressError) throw progressError

    const completedLessonIds = (progressList as StudentProgressRow[] | null)?.map((p) => p.lesson_id) || []
    const completedLessons = completedLessonIds.length
    const totalLessons = filteredLessons.length

    // 4. Fetch assignments
    const { data: assignmentsData, error: assignErr } = await supabase
      .from('assignments')
      .select('*')
      .in('lesson_id', lessonIds)

    if (assignErr) throw assignErr
    if (!assignmentsData || assignmentsData.length === 0) {
      return {
        success: true,
        grades: [],
        email: session.email,
        totalLessons,
        completedLessons,
        activeLessonIds: lessonIds,
        completedLessonIds,
        issuedCertificate,
      }
    }

    // 5. Fetch student submissions
    const { data: submissionsData, error: subsErr } = await supabase
      .from('submissions')
      .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*)))')
      .eq('class_id', classId)
      .eq('student_identifier', session.email)

    if (subsErr) throw subsErr

    const submissionMap = new Map<string, SubmissionRow>()
    ;(submissionsData as SubmissionRow[] | null)?.forEach(sub => {
      submissionMap.set(sub.assignment_id, sub)
    })

    // 6. Synthesize grade list
    const grades = (assignmentsData as AssignmentRow[]).map(assign => {
      const matchingLesson = filteredLessons.find((l: LessonWithModule) => l.id === assign.lesson_id)
      const matchingModule: LessonModuleRow | null = Array.isArray(matchingLesson?.modules)
        ? matchingLesson.modules[0] || null
        : matchingLesson?.modules || null
      const matchingSchedule = scheduleMap.get(assign.lesson_id)
      const matchingSub = submissionMap.get(assign.id)

      let gradingResult = null
      if (matchingSub?.grading_results && matchingSub.grading_results.status === 'published') {
        gradingResult = matchingSub.grading_results
      }

      return {
        id: assign.id,
        title: assign.title || 'Untitled assignment',
        lessonId: assign.lesson_id,
        lessonTitle: matchingLesson?.title || 'Unknown lesson',
        moduleTitle: matchingModule?.title || 'Unknown module',
        dueDate: matchingSchedule?.due_date || null,
        maxScore: assign.max_score,
        submission: matchingSub || null,
        grade: gradingResult || null
      }
    })

    return {
      success: true,
      grades,
      email: session.email,
      totalLessons,
      completedLessons,
      activeLessonIds: lessonIds,
      completedLessonIds,
      issuedCertificate,
    }

  } catch (err) {
    console.error('Failed to load student grades:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to load student grades') }
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

/**
 * Secures a temporary signed URL for the student to download the assignment instructions.
 */
export async function getAssignmentPromptSignedUrlAction(classCode: string, assignmentId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success) {
    return { success: false, error: 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('prompt_file_path')
      .eq('id', assignmentId)
      .single()

    if (error || !assignment?.prompt_file_path) {
      return { success: false, error: 'Assignment prompt file not found' }
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('teaching-materials')
      .createSignedUrl(assignment.prompt_file_path, 3600) // 1 hour

    if (signedError) throw signedError

    const signedUrlData = signedData as SignedUrlResponse | null
    return { success: true, signedUrl: signedUrlData?.signedUrl || signedUrlData?.signedURL || signedUrlData?.publicUrl || null }
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Failed to generate assignment prompt signed URL') }
  }
}

export async function parseAssignmentPromptAction(classCode: string, assignmentId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success) {
    return { success: false, error: 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  let tempFilePath: string | null = null

  try {
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('prompt_file_path, title')
      .eq('id', assignmentId)
      .single()

    if (error || !assignment?.prompt_file_path) {
      return { success: false, error: 'Assignment prompt file not found' }
    }

    const filePath = assignment.prompt_file_path
    const ext = filePath.split('.').pop()?.toLowerCase() || ''

    // Download file from Supabase storage
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('teaching-materials')
      .download(filePath)

    if (downloadError || !downloadData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'No data'}`)
    }

    if (['markdown', 'md', 'json', 'txt', 'js', 'ts', 'py'].includes(ext)) {
      const text = await downloadData.text()
      if (ext === 'json') {
        try {
          return { success: true, fileType: ext, content: JSON.parse(text) }
        } catch {
          return { success: true, fileType: ext, content: text }
        }
      }
      return { success: true, fileType: ext, content: text }
    }

    if (['docx', 'csv', 'xlsx', 'xls'].includes(ext)) {
      const arrayBuffer = await downloadData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const tempDir = path.join(process.cwd(), 'scratch')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      tempFilePath = path.join(tempDir, `prompt_${Date.now()}_${path.basename(filePath)}`)
      fs.writeFileSync(tempFilePath, buffer)

      const pythonPath = path.join(
        process.cwd(),
        process.platform === 'win32'
          ? 'rubricore-engine/.venv/Scripts/python.exe'
          : 'rubricore-engine/.venv/bin/python'
      )
      const scriptPath = path.join(process.cwd(), 'rubricore-engine/scripts/parse_material.py')

      const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
      if (stderr.trim()) {
        console.warn(`Python parsing stderr: ${stderr}`)
      }

      const parsedOutput = JSON.parse(stdout)
      if (parsedOutput.error) {
        throw new Error(`Python script error: ${parsedOutput.error}`)
      }

      return { success: true, fileType: ext, content: parsedOutput.viewer_artifact }
    }

    return { success: true, fileType: ext, content: null }
  } catch (err) {
    console.error('Error parsing assignment prompt file:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to parse assignment prompt file') }
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
      } catch (deleteErr) {
        console.error('Failed to delete temp file:', deleteErr)
      }
    }
  }
}

/**
 * Secures a temporary signed URL for the student to download or view a material file.
 */
export async function getStudentMaterialSignedUrlAction(classCode: string, storagePath: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success) {
    return { success: false, error: 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const { data: signedData, error: signedError } = await supabase.storage
      .from('teaching-materials')
      .createSignedUrl(storagePath, 3600) // 1 hour

    if (signedError) throw signedError

    return {
      success: true,
      signedUrl: (signedData as SignedUrlResponse | null)?.signedUrl ||
        (signedData as SignedUrlResponse | null)?.signedURL ||
        (signedData as SignedUrlResponse | null)?.publicUrl ||
        null
    }
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Failed to generate material signed URL') }
  }
}

/**
 * Downloads and parses any material file for interactive viewer rendering in the student view.
 */
export async function parseStudentMaterialAction(classCode: string, storagePath: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success) {
    return { success: false, error: 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  let tempFilePath: string | null = null

  try {
    const ext = storagePath.split('.').pop()?.toLowerCase() || ''

    // Download file from Supabase storage
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('teaching-materials')
      .download(storagePath)

    if (downloadError || !downloadData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'No data'}`)
    }

    if (['markdown', 'md', 'json', 'txt', 'js', 'ts', 'py'].includes(ext)) {
      const text = await downloadData.text()
      if (ext === 'json') {
        try {
          return { success: true, fileType: ext, content: JSON.parse(text) }
        } catch {
          return { success: true, fileType: ext, content: text }
        }
      }
      return { success: true, fileType: ext, content: text }
    }

    if (['docx', 'csv', 'xlsx', 'xls'].includes(ext)) {
      const arrayBuffer = await downloadData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const tempDir = path.join(process.cwd(), 'scratch')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      tempFilePath = path.join(tempDir, `material_${Date.now()}_${path.basename(storagePath)}`)
      fs.writeFileSync(tempFilePath, buffer)

      const pythonPath = path.join(
        process.cwd(),
        process.platform === 'win32'
          ? 'rubricore-engine/.venv/Scripts/python.exe'
          : 'rubricore-engine/.venv/bin/python'
      )
      const scriptPath = path.join(process.cwd(), 'rubricore-engine/scripts/parse_material.py')

      const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
      if (stderr.trim()) {
        console.warn(`Python parsing stderr: ${stderr}`)
      }

      const parsedOutput = JSON.parse(stdout)
      if (parsedOutput.error) {
        throw new Error(`Python script error: ${parsedOutput.error}`)
      }

      return { success: true, fileType: ext, content: parsedOutput.viewer_artifact }
    }

    return { success: true, fileType: ext, content: null }
  } catch (err) {
    console.error('Error parsing student material file:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to parse student material file') }
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}

async function compileSubmissionTextHelper(
  submissionId: string,
  submittedText: string,
  uploadedUrls: string[],
  supabase: ReturnType<typeof getSupabaseServer>
): Promise<string> {
  const tempDir = path.join(process.cwd(), 'scratch')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const pythonPath = path.join(
    process.cwd(),
    process.platform === 'win32'
      ? 'rubricore-engine/.venv/Scripts/python.exe'
      : 'rubricore-engine/.venv/bin/python'
  )
  const scriptPath = path.join(process.cwd(), 'rubricore-engine/scripts/parse_material.py')

  const extractedPieces: string[] = []

  for (const f of uploadedUrls) {
    const ext = f.split('.').pop()?.toLowerCase() || ''
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('student-submissions')
      .download(f)

    if (downloadError || !downloadData) continue

    let tempFilePath: string | null = null
    try {
      if (['docx', 'csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
        const arrayBuffer = await downloadData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        tempFilePath = path.join(tempDir, `similarity_${Date.now()}_${path.basename(f)}`)
        fs.writeFileSync(tempFilePath, buffer)

        const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
        if (stderr.trim()) {
          console.warn(`Python parsing stderr for similarity file: ${stderr}`)
        }
        const parsedOutput = JSON.parse(stdout)
        if (parsedOutput.extracted_text) {
          extractedPieces.push(`--- FILE: ${f.split('/').pop()} ---\n${parsedOutput.extracted_text}\n--- END ---`)
        }
      } else if (['markdown', 'md', 'json', 'txt', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css'].includes(ext)) {
        const text = await downloadData.text()
        extractedPieces.push(`--- FILE: ${f.split('/').pop()} ---\n${text}\n--- END ---`)
      }
    } catch (err) {
      console.error(`Error parsing similarity file ${f}:`, err)
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath)
        } catch {
          // Best-effort cleanup.
        }
      }
    }
  }

  return `Student Notes:\n${submittedText || ''}\n\nDeliverable Files:\n${extractedPieces.join('\n\n')}`
}

async function getSubmissionEmbedding(text: string): Promise<number[] | null> {
  const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'
  try {
    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pilot-actor-user-id': '00000000-0000-0000-0000-000000000000',
        'x-pilot-organization-id': '00000000-0000-0000-0000-000000000000',
        'x-pilot-roles': 'system,admin',
      },
      body: JSON.stringify({ contents: [text.slice(0, 8000)] }),
    })
    if (res.ok) {
      const data = await res.json() as EmbeddingApiResponse
      if (data.status === 'success' && data.embeddings && data.embeddings.length > 0) {
        return data.embeddings[0]
      }
    }
  } catch (err) {
    console.error('Failed to generate embedding via RubriCore:', err)
  }
  return null
}

export async function toggleLessonProgressAction(classCode: string, lessonId: string, completed: boolean) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    await assertLessonBelongsToClass(supabase, session.classId, lessonId)
    if (completed) {
      // Mark as complete
      const { error } = await supabase
        .from('student_lesson_progress')
        .upsert(
          {
            class_id: session.classId,
            lesson_id: lessonId,
            student_email: session.email,
          },
          {
            onConflict: 'class_id,lesson_id,student_email',
          }
        )

      if (error) throw error
    } else {
      // Mark as incomplete
      const { error } = await supabase
        .from('student_lesson_progress')
        .delete()
        .eq('class_id', session.classId)
        .eq('lesson_id', lessonId)
        .eq('student_email', session.email)

      if (error) throw error
    }

    return { success: true }
  } catch (err) {
    console.error('Error updating student lesson progress:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to update student lesson progress') }
  }
}

export async function fetchAssignmentWorkspaceAction(classCode: string, assignmentId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*, lessons(title), rubrics(id, title, description, rubric_criteria(*))')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      throw assignmentError || new Error('Assignment not found')
    }

    const assignmentRow = assignment as AssignmentRow
    await assertLessonBelongsToClass(supabase, session.classId, assignmentRow.lesson_id)

    const { data: schedule, error: scheduleError } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', session.classId)
      .eq('lesson_id', assignmentRow.lesson_id)
      .maybeSingle()

    if (scheduleError) {
      throw scheduleError
    }

    const { data: subData, error: submissionError } = await supabase
      .from('submissions')
      .select('*, grading_results(*, rubric_scores(*, rubric_criteria(*)))')
      .eq('class_id', session.classId)
      .eq('assignment_id', assignmentId)
      .eq('student_identifier', session.email)
      .order('attempt_number', { ascending: false })
      .limit(1)

    if (submissionError) {
      throw submissionError
    }

    const submission = subData && subData.length > 0 ? subData[0] : null
    let gradingRun = null

    if (submission?.id) {
      const { data: runData, error: runError } = await supabase
        .from('grading_runs')
        .select('*')
        .eq('submission_id', submission.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (runError) {
        throw runError
      }

      gradingRun = runData && runData.length > 0 ? runData[0] : null
    }

    return {
      success: true,
      assignment,
      schedule,
      submission,
      gradingRun,
      email: session.email,
      classId: session.classId,
    }
  } catch (err) {
    console.error('Failed to fetch assignment workspace:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to load assignment workspace') }
  }
}

export async function fetchLatestGradingRunAction(classCode: string, submissionId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed', gradingRun: null }
  }

  const supabase = getSupabaseServer(true)
  try {
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', submissionId)
      .eq('class_id', session.classId)
      .eq('student_identifier', session.email)
      .maybeSingle()

    if (submissionError) {
      throw submissionError
    }

    if (!submission) {
      return { success: false, error: 'Submission not found', gradingRun: null }
    }

    const { data: runData, error: runError } = await supabase
      .from('grading_runs')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (runError) {
      throw runError
    }

    return { success: true, gradingRun: runData && runData.length > 0 ? runData[0] : null }
  } catch (err) {
    console.error('Failed to fetch latest grading run:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to fetch latest grading run'), gradingRun: null }
  }
}

function sanitizeSubmissionFileName(fileName: string) {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'submission'
}

export async function uploadStudentSubmissionFilesAction(classCode: string, assignmentId: string, formData: FormData) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed', uploadedUrls: [] as string[], files: [] as SubmissionFileMetadata[] }
  }

  const supabase = getSupabaseServer(true)
  const uploadedUrls: string[] = []
  const fileData: SubmissionFileMetadata[] = []

  try {
    const files = formData.getAll('files').filter((item): item is File => item instanceof File)

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, lesson_id, max_files, max_total_size_mb')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      throw assignmentError || new Error('Assignment not found')
    }
    await assertLessonBelongsToClass(supabase, session.classId, assignment.lesson_id)

    const maxFiles = assignment.max_files ?? 3
    const maxTotalSizeMb = assignment.max_total_size_mb ?? 50

    if (files.length > maxFiles) {
      throw new Error(`You are permitted to upload a maximum of ${maxFiles} files.`)
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > maxTotalSizeMb * 1024 * 1024) {
      throw new Error(`The total upload size exceeds the ${maxTotalSizeMb}MB limit.`)
    }

    const emailHashHex = createHash('sha256')
      .update(session.email.trim().toLowerCase())
      .digest('hex')
      .slice(0, 10)

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const hash = createHash('sha256').update(buffer).digest('hex')
      const pathName = `classes/${classCode.toUpperCase()}/${assignmentId}/${emailHashHex}/${hash}_${sanitizeSubmissionFileName(file.name)}`

      const { error: uploadError } = await supabase.storage
        .from('student-submissions')
        .upload(pathName, buffer, { upsert: false, contentType: file.type || undefined })

      if (uploadError) {
        throw uploadError
      }

      uploadedUrls.push(pathName)
      fileData.push({
        name: file.name,
        size: file.size,
        type: file.type,
      })
    }

    return { success: true, uploadedUrls, files: fileData }
  } catch (err) {
    if (uploadedUrls.length > 0) {
      await supabase.storage.from('student-submissions').remove(uploadedUrls)
    }
    console.error('Student submission file upload failed:', err)
    return { success: false, error: getErrorMessage(err, 'Student submission file upload failed'), uploadedUrls: [] as string[], files: [] as SubmissionFileMetadata[] }
  }
}

export async function rollbackStudentSubmissionFilesAction(classCode: string, uploadedUrls: string[]) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const emailHashHex = createHash('sha256')
      .update(session.email.trim().toLowerCase())
      .digest('hex')
      .slice(0, 10)
    const allowedPrefix = `classes/${classCode.toUpperCase()}/`

    const safePaths = uploadedUrls.filter((pathName) =>
      pathName.startsWith(allowedPrefix) && pathName.includes(`/${emailHashHex}/`)
    )

    if (safePaths.length === 0) {
      return { success: true }
    }

    const { error } = await supabase.storage.from('student-submissions').remove(safePaths)
    if (error) {
      throw error
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to rollback student submission files:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to rollback student submission files') }
  }
}

export async function upsertStudentCertificateAction(classCode: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const gradeResult = await fetchStudentGradesAction(classCode)
    if (!gradeResult.success) {
      throw new Error(gradeResult.error || 'Failed to verify certificate eligibility')
    }

    const activeLessonIds = gradeResult.activeLessonIds || []
    const completedLessonIds = new Set(gradeResult.completedLessonIds || [])
    if (activeLessonIds.length === 0 || !activeLessonIds.every((id) => completedLessonIds.has(id))) {
      throw new Error('All active lessons must be completed before issuing a certificate')
    }

    const grades = gradeResult.grades || []
    if (grades.length === 0) {
      throw new Error('At least one graded assignment is required for a certificate')
    }

    let totalPercentage = 0
    for (const grade of grades) {
      if (!grade.submission || !grade.grade || grade.grade.status !== 'published') {
        throw new Error('All assignments must be submitted and have published grades')
      }
      const maxScore = Number(grade.maxScore) || 100
      totalPercentage += (Number(grade.grade.total_score) / maxScore) * 100
    }

    const gradeAverage = totalPercentage / grades.length
    if (!Number.isFinite(gradeAverage) || gradeAverage < 60 || gradeAverage > 100) {
      throw new Error('The verified average grade does not meet certificate requirements')
    }

    const { data, error } = await supabase
      .from('certificates')
      .upsert(
        {
          class_id: session.classId,
          student_email: session.email,
          grade_average: gradeAverage,
        },
        {
          onConflict: 'class_id,student_email',
        }
      )
      .select('id, grade_average')
      .single()

    if (error) throw error

    return { success: true, certificate: data }
  } catch (err) {
    console.error('Failed to persist certificate record:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to persist certificate record') }
  }
}

export async function fetchLessonProgressAction(classCode: string, lessonId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed', completed: false }
  }

  const supabase = getSupabaseServer(true)
  try {
    await assertLessonBelongsToClass(supabase, session.classId, lessonId)
    const { data, error } = await supabase
      .from('student_lesson_progress')
      .select('id')
      .eq('class_id', session.classId)
      .eq('lesson_id', lessonId)
      .eq('student_email', session.email)
      .maybeSingle()

    if (error) throw error

    return { success: true, completed: Boolean(data), email: session.email, classId: session.classId }
  } catch (err) {
    console.error('Error fetching student lesson progress:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to fetch lesson progress'), completed: false }
  }
}

export async function fetchLessonDiscussionAction(classCode: string, lessonId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed', comments: [] as DiscussionCommentRow[] }
  }

  const supabase = getSupabaseServer(true)
  try {
    await assertLessonBelongsToClass(supabase, session.classId, lessonId)
    const { data, error } = await supabase
      .from('discussion_comments')
      .select('id, class_id, lesson_id, student_email, comment_text, is_instructor, created_at')
      .eq('class_id', session.classId)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return {
      success: true,
      comments: (data || []) as DiscussionCommentRow[],
      email: session.email,
      classId: session.classId,
    }
  } catch (err) {
    console.error('Error fetching lesson discussion:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to fetch lesson discussion'), comments: [] as DiscussionCommentRow[] }
  }
}

export async function createLessonDiscussionCommentAction(classCode: string, lessonId: string, commentText: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const trimmedComment = commentText.trim()
  if (!trimmedComment) {
    return { success: false, error: 'Comment cannot be empty' }
  }

  if (trimmedComment.length > 4000) {
    return { success: false, error: 'Comment is too long' }
  }

  const supabase = getSupabaseServer(true)
  try {
    await assertLessonBelongsToClass(supabase, session.classId, lessonId)
    const { error } = await supabase.from('discussion_comments').insert([
      {
        class_id: session.classId,
        lesson_id: lessonId,
        student_email: session.email,
        comment_text: trimmedComment,
        is_instructor: false,
      },
    ])

    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('Error creating lesson discussion comment:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to create discussion comment') }
  }
}

export async function deleteLessonDiscussionCommentAction(classCode: string, commentId: string) {
  const session = await getVerifiedStudentSession(classCode)
  if (!session.success || !session.email || !session.classId) {
    return { success: false, error: session.error || 'Authentication failed' }
  }

  const supabase = getSupabaseServer(true)
  try {
    const { data: comment, error: lookupError } = await supabase
      .from('discussion_comments')
      .select('id, class_id, student_email')
      .eq('id', commentId)
      .eq('class_id', session.classId)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!comment) {
      return { success: false, error: 'Comment not found' }
    }
    if (comment.student_email !== session.email) {
      return { success: false, error: 'You can only delete your own comments' }
    }

    const { error } = await supabase
      .from('discussion_comments')
      .delete()
      .eq('id', commentId)
      .eq('class_id', session.classId)
      .eq('student_email', session.email)

    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('Error deleting lesson discussion comment:', err)
    return { success: false, error: getErrorMessage(err, 'Failed to delete discussion comment') }
  }
}
