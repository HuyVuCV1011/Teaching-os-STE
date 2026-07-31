'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

type RubricCriterion = {
  id: string
  name?: string | null
  description?: string | null
  weight?: string | number | null
  max_points?: number | null
}

type SubmissionFileRow = {
  original_filename: string
  storage_path: string
}

type RubricSuggestionRow = {
  id: string
  suggested_score?: string | number | null
  suggested_feedback?: string | null
}

type MatchGradingFeedbackRow = {
  similarity?: number | null
  student_submission_text?: string | null
  override_score?: number | null
  override_feedback?: string | null
  override_reason?: string | null
}

type EmbeddingApiResponse = {
  status?: string
  embeddings?: number[][]
}

type StatelessGradingResponse = {
  criterion_suggestions?: {
    criterion_key: string
    score?: string | number | null
    explanation?: string | null
    confidence?: string | number | null
  }[]
}

type ApiErrorResponse = {
  detail?: string
  error?: {
    message?: string
  }
}

type SupabaseServerClient = ReturnType<typeof getSupabaseServer>

function toNumber(value: string | number | null | undefined) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

interface GradingInput {
  submissionId: string
  gradingResultId: string | null
  overallFeedback: string
  publish: boolean
  clientTotalScore: number
  scores: Array<{
    rubric_criterion_id: string
    score: number
    feedback: string
    derived_from_suggestion_id?: string | null
    override_reason?: string | null
  }>
}

async function getCompiledEvidenceText(submissionId: string, supabase: SupabaseServerClient): Promise<string> {
  const { data: subData } = await supabase
    .from('submissions')
    .select('*, assignments(*, rubrics(*, rubric_criteria(*)))')
    .eq('id', submissionId)
    .single()

  if (!subData) throw new Error('Submission not found')

  const { data: files } = await supabase
    .from('submission_files')
    .select('*')
    .eq('submission_id', submissionId)

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

  if (files) {
    for (const f of (files || []) as SubmissionFileRow[]) {
      const ext = f.original_filename.split('.').pop()?.toLowerCase() || ''
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('student-submissions')
        .download(f.storage_path)

      if (downloadError || !downloadData) continue

      let tempFilePath: string | null = null
      try {
        if (['docx', 'csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
          const arrayBuffer = await downloadData.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          tempFilePath = path.join(tempDir, `evidence_${Date.now()}_${path.basename(f.storage_path)}`)
          fs.writeFileSync(tempFilePath, buffer)

          const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
          if (stderr.trim()) {
            console.warn(`Python parsing stderr for evidence file: ${stderr}`)
          }
          const parsedOutput = JSON.parse(stdout) as { extracted_text?: string }
          if (parsedOutput.extracted_text) {
            extractedPieces.push(`--- ATTACHED FILE CONTENT: ${f.original_filename} ---\n${parsedOutput.extracted_text}\n--- END OF FILE CONTENT ---`)
          }
        } else if (['markdown', 'md', 'json', 'txt', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css'].includes(ext)) {
          const text = await downloadData.text()
          extractedPieces.push(`--- ATTACHED FILE CONTENT: ${f.original_filename} ---\n${text}\n--- END OF FILE CONTENT ---`)
        }
      } catch (err) {
        console.error(`Error parsing evidence file ${f.original_filename}:`, err)
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
  }

  return `STUDENT NOTES / COMMENTARY:\n${subData.submitted_text || ''}\n\nEXTRACTED DELIVERABLES:\n${extractedPieces.join('\n\n')}`
}

async function getEmbeddingText(text: string, userId: string, organizationId: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': organizationId,
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function getGradingDetailAdminAction(submissionId: string) {
  try {
    await requireAdminUser()
    const normalizedSubmissionId = submissionId.trim()
    if (!normalizedSubmissionId) throw new Error('Submission id is required')

    const supabase = getSupabaseServer(true)
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*, classes(*), assignments(*, rubrics(*, rubric_criteria(*)))')
      .eq('id', normalizedSubmissionId)
      .single()

    if (submissionError || !submission) {
      throw submissionError || new Error('Submission not found')
    }

    const snapshotId = submission.rubric_snapshot_id || submission.assignments?.rubric_snapshot_id
    const schedulePromise = submission.class_id && submission.assignments?.lesson_id
      ? supabase
          .from('class_schedules')
          .select('due_date')
          .eq('class_id', submission.class_id)
          .eq('lesson_id', submission.assignments.lesson_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
    const snapshotPromise = snapshotId
      ? supabase
          .from('rubric_snapshots')
          .select('*')
          .eq('id', snapshotId)
          .single()
      : Promise.resolve({ data: null, error: null })

    const [scheduleResult, snapshotResult, gradingResult, suggestionsResult] = await Promise.all([
      schedulePromise,
      snapshotPromise,
      supabase
        .from('grading_results')
        .select('*, rubric_scores(*)')
        .eq('submission_id', normalizedSubmissionId)
        .maybeSingle(),
      supabase
        .from('rubric_score_suggestions')
        .select('*')
        .eq('submission_id', normalizedSubmissionId),
    ])

    if (scheduleResult.error) throw scheduleResult.error
    if (snapshotResult.error) throw snapshotResult.error
    if (gradingResult.error) throw gradingResult.error
    if (suggestionsResult.error) throw suggestionsResult.error

    const submittedFiles = Array.isArray(submission.submitted_files)
      ? submission.submitted_files.filter(
          (file: unknown): file is string => typeof file === 'string' && file.length > 0,
        )
      : []
    const signedFilesResult = submittedFiles.length > 0
      ? await supabase.storage
          .from('student-submissions')
          .createSignedUrls(submittedFiles, 3600, { download: true })
      : { data: [], error: null }

    if (signedFilesResult.error) throw signedFilesResult.error

    const signedFileUrls = Object.fromEntries(
      (signedFilesResult.data || []).flatMap((file) =>
        file.path && file.signedUrl ? [[file.path, file.signedUrl]] : [],
      ),
    )

    return {
      success: true as const,
      data: {
        submission,
        dueDate: scheduleResult.data?.due_date || null,
        snapshot: snapshotResult.data?.snapshot || null,
        gradingResult: gradingResult.data || null,
        suggestions: suggestionsResult.data || [],
        signedFileUrls,
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function updateSubmissionShowcaseAdminAction(
  submissionId: string,
  approved: boolean,
) {
  try {
    await requireAdminUser()
    const normalizedSubmissionId = submissionId.trim()
    if (!normalizedSubmissionId) throw new Error('Submission id is required')

    const supabase = getSupabaseServer(true)
    const { error } = await supabase
      .from('submissions')
      .update({ showcase_approved: approved })
      .eq('id', normalizedSubmissionId)
    if (error) throw error

    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function saveGradingResultAction(input: GradingInput) {
  const { userId } = await requireAdminUser()

  // Use service-role to write securely bypassing strict RLS
  const supabase = getSupabaseServer(true)
  let currentResultId = input.gradingResultId

  // Load submission metadata for embed context
  const { data: subData } = await supabase
    .from('submissions')
    .select('*, assignments(*)')
    .eq('id', input.submissionId)
    .single()

  if (!subData) throw new Error('Submission not found')

  // 1. Create or update grading result row
  if (!currentResultId) {
    const { data: resultData, error: resultError } = await supabase
      .from('grading_results')
      .insert([
        {
          submission_id: input.submissionId,
          overall_feedback: input.overallFeedback,
          status: input.publish ? 'published' : 'draft',
          total_score: input.clientTotalScore,
        },
      ])
      .select()
      .single()

    if (resultError) throw resultError
    currentResultId = resultData.id
  } else {
    const { error: resultError } = await supabase
      .from('grading_results')
      .update({
        overall_feedback: input.overallFeedback,
        status: input.publish ? 'published' : 'draft',
        total_score: input.clientTotalScore,
      })
      .eq('id', currentResultId)

    if (resultError) throw resultError
  }

  // 2. Load suggestions for historical difference mapping
  const { data: suggestions } = await supabase
    .from('rubric_score_suggestions')
    .select('*')
    .eq('submission_id', input.submissionId)

  const studentText = await getCompiledEvidenceText(input.submissionId, supabase)

  // 3. Upsert rubric scores for each criterion
  for (const scoreRow of input.scores) {
    const { error: upsertError } = await supabase
      .from('rubric_scores')
      .upsert(
        {
          grading_result_id: currentResultId,
          rubric_criterion_id: scoreRow.rubric_criterion_id,
          score: scoreRow.score,
          feedback: scoreRow.feedback,
          derived_from_suggestion_id: scoreRow.derived_from_suggestion_id,
          override_reason: scoreRow.override_reason,
        },
        {
          onConflict: 'grading_result_id,rubric_criterion_id',
        }
      )

    if (upsertError) throw upsertError

    // AI Grading Memory Loop: If teacher overrode the score, generate feedback embedding
    if (scoreRow.override_reason) {
      const textToEmbed = `Student Submission:\n${studentText}\n\nFeedback Correction:\n${scoreRow.feedback}\nOverride Reason:\n${scoreRow.override_reason}`
      const embedding = await getEmbeddingText(textToEmbed, userId, subData.assignments?.organization_id || '00000000-0000-0000-0000-000000000000')

      if (embedding) {
        // Pre-delete existing override embedding to prevent duplicates
        await supabase
          .from('grading_feedback_embeddings')
          .delete()
          .eq('submission_id', input.submissionId)
          .eq('rubric_criterion_id', scoreRow.rubric_criterion_id)

        const suggestion = ((suggestions || []) as RubricSuggestionRow[]).find(s => s.id === scoreRow.derived_from_suggestion_id)
        await supabase
          .from('grading_feedback_embeddings')
          .insert({
            submission_id: input.submissionId,
            rubric_criterion_id: scoreRow.rubric_criterion_id,
            assignment_id: subData.assignment_id,
            original_suggested_score: suggestion ? toNumber(suggestion.suggested_score) : null,
            original_suggested_feedback: suggestion ? suggestion.suggested_feedback : null,
            override_score: scoreRow.score,
            override_feedback: scoreRow.feedback,
            override_reason: scoreRow.override_reason,
            student_submission_text: studentText,
            embedding: embedding,
          })
      }
    }
  }

  // 4. Update Submission status to graded / grading_in_progress
  const submissionStatus = input.publish ? 'graded' : 'grading_in_progress'
  const { error: subError } = await supabase
    .from('submissions')
    .update({ status: submissionStatus })
    .eq('id', input.submissionId)

  if (subError) throw subError

  return { success: true, gradingResultId: currentResultId }
}

export async function suggestAIScoresAction(submissionId: string, modelChoice: string = 'gemini-2.0-flash') {
  void modelChoice
  const { userId } = await requireAdminUser()
  const supabase = getSupabaseServer(true)

  // 1. Fetch submission with parent structures
  const { data: subData } = await supabase
    .from('submissions')
    .select('*, classes(*), assignments(*, rubrics(*, rubric_criteria(*)))')
    .eq('id', submissionId)
    .single()

  if (!subData) throw new Error('Submission not found')

  // 2. Resolve rubric criteria
  let rubricCriteria: RubricCriterion[] = []
  const snapshotId = subData.rubric_snapshot_id || subData.assignments?.rubric_snapshot_id
  if (snapshotId) {
    const { data: snapshotData } = await supabase
      .from('rubric_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()
    
    if (snapshotData && snapshotData.snapshot?.criteria) {
      rubricCriteria = snapshotData.snapshot.criteria as RubricCriterion[]
    }
  }

  if (rubricCriteria.length === 0) {
    rubricCriteria = (subData.assignments?.rubrics?.rubric_criteria || []) as RubricCriterion[]
  }

  // 3. Compile student submission text
  const compiledEvidenceText = await getCompiledEvidenceText(submissionId, supabase)

  // 4. RAG Memory Loop: Retrieve similar grading overrides from teacher history
  const queryEmbedding = await getEmbeddingText(compiledEvidenceText, userId, subData.assignments?.organization_id || '00000000-0000-0000-0000-000000000000')
  const fewShotExamplesMap: Record<string, MatchGradingFeedbackRow[]> = {}

  if (queryEmbedding) {
    for (const c of rubricCriteria) {
      const { data: matches } = await supabase.rpc('match_grading_feedback', {
        query_embedding: queryEmbedding,
        match_criterion_id: c.id,
        match_count: 2
      })

      if (matches && matches.length > 0) {
        const validMatches = matches
          .filter((m: MatchGradingFeedbackRow) => (m.similarity || 0) > 0.7)
          .map((m: MatchGradingFeedbackRow) => ({
            student_submission_text: m.student_submission_text,
            override_score: m.override_score,
            override_feedback: m.override_feedback,
            override_reason: m.override_reason
          }))
        if (validMatches.length > 0) {
          fewShotExamplesMap[c.id] = validMatches
        }
      }
    }
  }

  // 5. Construct rubric_schema with few_shot_examples inside
  const rubricSchema = {
    schema_version: '1.0',
    criteria: rubricCriteria.map((c) => ({
      key: c.id,
      label: c.name,
      description: c.description || '',
      weight: String(c.weight || '1.0'),
      max_points: c.max_points,
    })),
    performance_levels: [
      { key: 'meets', label: 'Meets', score: '1.0', position: 0 }
    ],
    descriptors: [],
    few_shot_examples: fewShotExamplesMap
  }

  const evidencePayload = [
    {
      id: 'compiled-evidence',
      raw_text: compiledEvidenceText,
      value_payload: {
        files: subData.submitted_files || [],
      }
    }
  ]

  // 6. Call Stateless API
  const res = await fetch(`${RUBICORE_API_URL}/pilot/grade-submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pilot-actor-user-id': userId,
      'x-pilot-organization-id': subData.assignments?.organization_id || '00000000-0000-0000-0000-000000000000',
      'x-pilot-roles': 'teacher,admin',
    },
    body: JSON.stringify({
      rubric_schema: rubricSchema,
      evidence: evidencePayload,
      ai_allowed: true,
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({})) as ApiErrorResponse
    throw new Error(errData.detail || errData.error?.message || `Stateless grading API returned HTTP ${res.status}`)
  }

  const result = await res.json() as StatelessGradingResponse
  
  // Format suggestions list
  const suggestions = (result.criterion_suggestions || []).map((s, idx) => ({
    id: `stateless-suggestion-${idx}`,
    rubric_criterion_id: s.criterion_key,
    suggested_score: toNumber(s.score),
    suggested_feedback: s.explanation || '',
    confidence: toNumber(s.confidence),
    status: 'suggested'
  }))

  return { success: true, suggestions }
}
