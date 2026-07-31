import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'

if (!process.argv.includes('--confirm-live')) {
  throw new Error('Refusing to mutate a linked project without --confirm-live')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.QA_APP_URL || 'http://localhost:3000'

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error('Supabase URL, anon key, and service-role key are required')
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const publicClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const runId = randomUUID().replaceAll('-', '').slice(0, 12)
const prefix = `CODEX_QA_${runId}`
const classCode = `QA${runId.toUpperCase()}`
const studentEmail = `student-${runId}@example.com`
const adminEmail = `admin-${runId}@example.com`
const adminPassword = `Qa!${randomUUID()}Aa9`
const created = {}
const storageObjects = []

function check(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`)
  }
  return result.data
}

async function removeRows(table, column, value) {
  if (!value) return
  const { error } = await admin.from(table).delete().eq(column, value)
  if (error) console.warn(`Cleanup warning for ${table}: ${error.message}`)
}

async function cleanup() {
  for (const { bucket, path } of storageObjects.reverse()) {
    const { error } = await admin.storage.from(bucket).remove([path])
    if (error) console.warn(`Cleanup warning for ${bucket}/${path}: ${error.message}`)
  }

  await removeRows('grading_results', 'id', created.gradingResultId)
  await removeRows('submission_files', 'submission_id', created.submissionId)
  await removeRows('submissions', 'id', created.submissionId)
  await removeRows('class_announcements', 'id', created.announcementId)
  await removeRows('class_schedules', 'id', created.scheduleId)
  await removeRows('class_enrollments', 'id', created.enrollmentId)
  await removeRows('class_courses', 'id', created.classCourseId)
  await removeRows('classes', 'id', created.classId)
  await removeRows('assignments', 'id', created.assignmentId)
  await removeRows('lessons', 'id', created.lessonId)
  await removeRows('modules', 'id', created.moduleId)
  await removeRows('courses', 'id', created.courseId)
  await removeRows('subjects', 'id', created.subjectId)
  await removeRows('projects', 'id', created.projectId)

  if (created.authUserId) {
    const { error } = await admin.auth.admin.deleteUser(created.authUserId)
    if (error) console.warn(`Cleanup warning for auth user: ${error.message}`)
  }
}

try {
  console.log(`[${prefix}] Starting isolated live staging smoke test`)

  const anonymousWrite = await publicClient
    .from('classes')
    .insert({ name: prefix, class_code: `${classCode}DENY`, status: 'running', start_date: '2026-01-01', end_date: '2026-01-02' })
  if (!anonymousWrite.error) {
    throw new Error('RLS regression: anonymous class insert unexpectedly succeeded')
  }
  console.log('PASS anonymous writes are denied by RLS')

  const authUser = check(
    await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    }),
    'Create temporary admin auth user'
  ).user
  created.authUserId = authUser.id

  const signedIn = check(
    await publicClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword }),
    'Sign in temporary admin auth user'
  )
  if (signedIn.user?.app_metadata?.role !== 'admin') {
    throw new Error('Admin role was not present after sign-in')
  }
  await publicClient.auth.signOut()
  console.log('PASS Supabase admin authentication and app_metadata role')

  const subject = check(
    await admin.from('subjects').insert({
      name: `${prefix} Subject`,
      slug: `${prefix.toLowerCase()}-subject`,
      description: 'Disposable staging subject',
    }).select('*').single(),
    'Create subject'
  )
  created.subjectId = subject.id

  const course = check(
    await admin.from('courses').insert({
      title: `${prefix} Course`,
      slug: `${prefix.toLowerCase()}-course`,
      subject_id: subject.id,
      description: 'Disposable staging course',
      status: 'draft',
    }).select('*').single(),
    'Create course'
  )
  created.courseId = course.id

  const moduleRow = check(
    await admin.from('modules').insert({ course_id: course.id, title: `${prefix} Module`, order_index: 1 }).select('*').single(),
    'Create module'
  )
  created.moduleId = moduleRow.id

  const lesson = check(
    await admin.from('lessons').insert({
      module_id: moduleRow.id,
      title: `${prefix} Lesson`,
      order_index: 1,
      content: '{"type":"doc","content":[]}',
    }).select('*').single(),
    'Create lesson'
  )
  created.lessonId = lesson.id

  const assignment = check(
    await admin.from('assignments').insert({
      lesson_id: lesson.id,
      title: `${prefix} Assignment`,
      instructions: 'Disposable staging assignment',
      rubric_id: null,
      max_score: 10,
      max_files: 2,
      max_total_size_mb: 5,
      auto_publish_grades: false,
      rubric_snapshot_id: null,
      solution_storage_path: null,
      prompt_file_path: null,
      ai_model_used: 'staging-smoke',
      late_policy: { grace_period_hours: 0, penalty_percent_per_day: 0 },
    }).select('*').single(),
    'Create assignment'
  )
  created.assignmentId = assignment.id

  const classRow = check(
    await admin.from('classes').insert({
      name: `${prefix} Class`,
      class_code: classCode,
      status: 'running',
      start_date: '2026-08-01',
      end_date: '2026-08-02',
      course_id: course.id,
    }).select('*').single(),
    'Create class'
  )
  created.classId = classRow.id

  check(
    await admin.from('classes').update({ name: `${prefix} Class Updated` }).eq('id', classRow.id).select('id').single(),
    'Update class'
  )

  const classCourse = check(
    await admin.from('class_courses').insert({ class_id: classRow.id, course_id: course.id }).select('*').single(),
    'Map course to class'
  )
  created.classCourseId = classCourse.id

  const schedule = check(
    await admin.from('class_schedules').insert({
      class_id: classRow.id,
      lesson_id: lesson.id,
      visible_after: new Date(Date.now() - 60_000).toISOString(),
      due_date: new Date(Date.now() + 3_600_000).toISOString(),
    }).select('*').single(),
    'Create class schedule'
  )
  created.scheduleId = schedule.id

  const enrollment = check(
    await admin.from('class_enrollments').insert({ class_id: classRow.id, student_email: studentEmail }).select('*').single(),
    'Enroll staging student'
  )
  created.enrollmentId = enrollment.id

  const announcement = check(
    await admin.from('class_announcements').insert({
      class_id: classRow.id,
      title: `${prefix} Announcement`,
      content: 'Disposable staging announcement',
    }).select('*').single(),
    'Create announcement'
  )
  created.announcementId = announcement.id
  console.log('PASS subject, course, lesson, assignment, class, schedule, enrollment, announcement CRUD')

  const verifyResponse = await fetch(`${appUrl}/api/v1/verify-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: classCode, email: studentEmail }),
  })
  if (!verifyResponse.ok || !verifyResponse.headers.get('set-cookie')) {
    throw new Error(`Student gateway failed with HTTP ${verifyResponse.status}`)
  }
  const sessionCookie = verifyResponse.headers.get('set-cookie').split(',').map((part) => part.split(';')[0]).join('; ')
  const learnerResponse = await fetch(`${appUrl}/learn/${classCode}/dashboard`, {
    headers: { cookie: sessionCookie },
    redirect: 'manual',
  })
  if (learnerResponse.status !== 200) {
    throw new Error(`Authenticated learner dashboard returned HTTP ${learnerResponse.status}`)
  }
  console.log('PASS class-code gateway, JWT cookie, and authenticated learner dashboard')

  const studentPath = `classes/${classCode}/${assignment.id}/qa/${runId}_submission.txt`
  check(
    await admin.storage.from('student-submissions').upload(studentPath, Buffer.from('staging submission'), {
      contentType: 'text/plain',
      upsert: false,
    }),
    'Upload student submission file'
  )
  storageObjects.push({ bucket: 'student-submissions', path: studentPath })
  const downloaded = check(await admin.storage.from('student-submissions').download(studentPath), 'Download student submission file')
  if ((await downloaded.text()) !== 'staging submission') {
    throw new Error('Downloaded student submission content did not match')
  }

  const submission = check(
    await admin.from('submissions').insert({
      class_id: classRow.id,
      assignment_id: assignment.id,
      student_identifier: studentEmail,
      submitted_text: 'Disposable staging answer',
      submitted_files: [studentPath],
      status: 'submitted',
      attempt_number: 1,
      is_late: false,
      rubric_snapshot_id: null,
      showcase_requested: true,
      showcase_approved: false,
    }).select('*').single(),
    'Create submission'
  )
  created.submissionId = submission.id

  check(
    await admin.from('submission_files').insert({
      submission_id: submission.id,
      storage_bucket: 'student-submissions',
      storage_path: studentPath,
      original_filename: 'submission.txt',
      content_type: 'text/plain',
      size_bytes: 18,
      sha256: createHash('sha256').update('staging submission').digest('hex'),
      processing_status: 'pending',
    }).select('id').single(),
    'Create submission file metadata'
  )

  const gradingResult = check(
    await admin.from('grading_results').insert({
      submission_id: submission.id,
      overall_feedback: 'Disposable staging feedback',
      status: 'draft',
      total_score: 8,
    }).select('*').single(),
    'Create draft grade'
  )
  created.gradingResultId = gradingResult.id
  check(
    await admin.from('grading_results').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', gradingResult.id).select('id').single(),
    'Publish grade'
  )
  check(
    await admin.from('submissions').update({ status: 'graded', showcase_approved: true }).eq('id', submission.id).select('id').single(),
    'Mark submission graded and approve showcase'
  )
  console.log('PASS private upload/download, submission, grading publish, and showcase approval')

  const thumbnailPath = `${prefix}/thumbnail.png`
  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  check(
    await admin.storage.from('thumbnails').upload(thumbnailPath, onePixelPng, { contentType: 'image/png', upsert: false }),
    'Upload project thumbnail'
  )
  storageObjects.push({ bucket: 'thumbnails', path: thumbnailPath })
  const thumbnailUrl = admin.storage.from('thumbnails').getPublicUrl(thumbnailPath).data.publicUrl

  const project = check(
    await admin.from('projects').insert({
      title: `${prefix} Project`,
      description: '<p>Disposable staging portfolio project</p>',
      thumbnails: [thumbnailUrl],
      files: [],
      icons: ['database'],
      flow_diagram: { nodes: [], edges: [] },
      product_option: 'customer',
      iframe_link: null,
      youtube_link: null,
    }).select('*').single(),
    'Create portfolio project'
  )
  created.projectId = project.id
  check(
    await admin.from('projects').update({ title: `${prefix} Project Updated` }).eq('id', project.id).select('id').single(),
    'Update portfolio project'
  )
  const publicProject = check(
    await publicClient.from('projects').select('id').eq('id', project.id).single(),
    'Read portfolio project anonymously'
  )
  if (publicProject.id !== project.id) throw new Error('Public project read returned the wrong row')
  console.log('PASS portfolio project CRUD, public read, and thumbnail storage')

  console.log(`[${prefix}] All isolated live staging checks passed`)
} finally {
  await cleanup()
  console.log(`[${prefix}] Cleanup completed`)
}
