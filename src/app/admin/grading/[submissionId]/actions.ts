'use server'

import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase'
import { verifyJWT } from '@/lib/jwt'

async function checkAdminAuth() {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return true
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

  return true
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
