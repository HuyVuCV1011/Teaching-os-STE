'use server'

import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase'
import { verifyJWT } from '@/lib/jwt'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

async function checkAdminAuth() {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return { userId: '00000000-0000-0000-0000-000000000000' }
  }

  const cookieStore = await cookies()
  const sbToken = cookieStore.get('sb-access-token') || cookieStore.get('supabase-auth-token')

  if (!sbToken) {
    throw new Error('Unauthorized: No authentication token found')
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  let payload: any = null

  if (secret) {
    payload = await verifyJWT(sbToken.value, secret)
  } else {
    // Fallback parsing for development if secret is not set yet
    const parts = sbToken.value.split('.')
    if (parts.length === 3) {
      payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    }
  }

  if (!payload) {
    throw new Error('Unauthorized: Invalid token payload')
  }

  const role = payload.app_metadata?.role || payload.role
  const isAuthorized = [
    'admin',
    'teacher',
    'super-admin',
    'content-admin',
    'class-operator'
  ].includes(role)

  if (!isAuthorized) {
    throw new Error('Unauthorized: Insufficient privileges')
  }

  return { userId: payload.sub }
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

export async function saveGradingResultAction(input: GradingInput) {
  await checkAdminAuth()

  // Use service-role to write securely bypassing strict RLS
  const supabase = getSupabaseServer(true)
  let currentResultId = input.gradingResultId

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

  // 2. Upsert rubric scores for each criterion
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
  }

  // 3. Update Submission status to graded / grading_in_progress
  const submissionStatus = input.publish ? 'graded' : 'grading_in_progress'
  const { error: subError } = await supabase
    .from('submissions')
    .update({ status: submissionStatus })
    .eq('id', input.submissionId)

  if (subError) throw subError

  return { success: true, gradingResultId: currentResultId }
}

export async function suggestAIScoresAction(submissionId: string, modelChoice: string = 'gemini-2.5-flash') {
  const { userId } = await checkAdminAuth()
  const supabase = getSupabaseServer(true)

  // 1. Fetch submission with parent structures
  const { data: subData } = await supabase
    .from('submissions')
    .select('*, classes(*), assignments(*, rubrics(*, rubric_criteria(*)))')
    .eq('id', submissionId)
    .single()

  if (!subData) throw new Error('Submission not found')

  // 2. Resolve rubric criteria
  let rubricCriteria = []
  const snapshotId = subData.rubric_snapshot_id || subData.assignments?.rubric_snapshot_id
  if (snapshotId) {
    const { data: snapshotData } = await supabase
      .from('rubric_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()
    
    if (snapshotData && snapshotData.snapshot?.criteria) {
      rubricCriteria = snapshotData.snapshot.criteria
    }
  }

  if (rubricCriteria.length === 0) {
    rubricCriteria = subData.assignments?.rubrics?.rubric_criteria || []
  }

  // 3. Construct rubric_schema
  const rubricSchema = {
    schema_version: '1.0',
    criteria: rubricCriteria.map((c: any) => ({
      key: c.id,
      label: c.name,
      description: c.description || '',
      weight: String(c.weight || '1.0'),
      max_points: c.max_points,
    })),
    performance_levels: [
      { key: 'meets', label: 'Meets', score: '1.0', position: 0 }
    ],
    descriptors: []
  }

  // 4. Download and parse submitted files to get compiled evidence
  const { data: files } = await supabase
    .from('submission_files')
    .select('*')
    .eq('submission_id', submissionId)

  const tempDir = path.join(process.cwd(), 'scratch')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const pythonPath = path.join(process.cwd(), 'rubricore-engine/.venv/bin/python')
  const scriptPath = path.join(process.cwd(), 'rubricore-engine/scripts/parse_material.py')

  const extractedPieces: string[] = []

  if (files) {
    for (const f of files) {
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
          const parsedOutput = JSON.parse(stdout)
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
          } catch (e) {}
        }
      }
    }
  }

  const compiledEvidenceText = `STUDENT NOTES / COMMENTARY:\n${subData.submitted_text || ''}\n\nEXTRACTED DELIVERABLES:\n${extractedPieces.join('\n\n')}`

  const evidencePayload = [
    {
      id: 'compiled-evidence',
      raw_text: compiledEvidenceText,
      value_payload: {
        files: files?.map(f => f.storage_path) || [],
      }
    }
  ]

  // 5. Call Stateless API
  const res = await fetch(`${RUBICORE_API_URL}/pilot/grade-submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pilot-actor-user-id': userId,
      'x-pilot-organization-id': subData.organization_id,
      'x-pilot-roles': 'teacher,admin',
    },
    body: JSON.stringify({
      rubric_schema: rubricSchema,
      evidence: evidencePayload,
      ai_allowed: true,
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || errData.error?.message || `Stateless grading API returned HTTP ${res.status}`)
  }

  const result = await res.json()
  
  // Format the suggestions list to match standard structure of suggestions loaded from Supabase:
  // `{ id, suggested_score, suggested_feedback, confidence, rubric_criterion_id }`
  const suggestions = (result.criterion_suggestions || []).map((s: any, idx: number) => ({
    id: `stateless-suggestion-${idx}`,
    rubric_criterion_id: s.criterion_key,
    suggested_score: parseFloat(s.score),
    suggested_feedback: s.explanation || '',
    confidence: parseFloat(s.confidence),
    status: 'suggested'
  }))

  return { success: true, suggestions }
}
