'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

type GradingRunErrorResponse = {
  detail?: string
  error?: {
    message?: string
  }
}

type SubmissionMetadata = {
  organization_id?: string | null
}

export async function triggerAIGradingAction(submissionId: string, modelChoice: string) {
  const { userId } = await requireAdminUser()
  const supabase = getSupabaseServer(true)

  // Fetch the submission to get its organization_id
  const { data: sub, error: subError } = await supabase
    .from('submissions')
    .select('organization_id')
    .eq('id', submissionId)
    .single()

  const submission = sub as SubmissionMetadata | null

  if (subError || !submission?.organization_id) {
    throw new Error(`Failed to load submission metadata: ${subError?.message || 'Not found'}`)
  }

  const res = await fetch(`${RUBICORE_API_URL}/pilot/grading-runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pilot-actor-user-id': userId,
      'x-pilot-organization-id': submission.organization_id,
      'x-pilot-roles': 'teacher,admin',
    },
    body: JSON.stringify({
      submission_id: submissionId,
      ai_allowed: true,
      ai_required: true,
      reason: `AI Grading triggered via UI with model: ${modelChoice}`,
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({})) as GradingRunErrorResponse
    throw new Error(errData.detail || errData.error?.message || `Grading run API returned HTTP ${res.status}`)
  }

  return await res.json()
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function listGradingQueueAdminAction() {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const [submissionsResult, cohortsResult] = await Promise.all([
      supabase
        .from('submissions')
        .select('*, classes(name, class_code), assignments(title)')
        .order('submitted_at', { ascending: false }),
      supabase
        .from('classes')
        .select('id, name, class_code')
        .order('name'),
    ])

    if (submissionsResult.error) throw submissionsResult.error
    if (cohortsResult.error) throw cohortsResult.error

    return {
      success: true as const,
      data: {
        submissions: submissionsResult.data || [],
        cohorts: cohortsResult.data || [],
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function listSimilarityAssignmentsAdminAction() {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('assignments')
      .select('*, lessons(title, modules(title))')
      .order('title')
    if (error) throw error
    return { success: true as const, data: data || [] }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function listSimilaritySubmissionsAdminAction(assignmentId: string) {
  try {
    await requireAdminUser()
    const normalizedAssignmentId = assignmentId.trim()
    if (!normalizedAssignmentId) throw new Error('Assignment id is required')

    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('submissions')
      .select('*, submission_embeddings(*)')
      .eq('assignment_id', normalizedAssignmentId)
    if (error) throw error
    return { success: true as const, data: data || [] }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}
