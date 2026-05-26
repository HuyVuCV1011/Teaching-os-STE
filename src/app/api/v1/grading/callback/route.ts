import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

const GRADING_SECRET_TOKEN = process.env.GRADING_SECRET_TOKEN || 'a1b2c3d4e5f6_development_token'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer(true)
  try {
    const body = await request.json()
    const { submission_id, secret_token, overall_feedback, scores } = body

    // 1. Authentication Check
    // Get Bearer token from header
    const authHeader = request.headers.get('Authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null

    const token = tokenFromHeader || secret_token

    if (!token || token !== GRADING_SECRET_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid callback token' },
        { status: 401 }
      )
    }

    if (!submission_id || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: 'Bad Request: Missing submission_id or scores list' },
        { status: 400 }
      )
    }

    // 2. Check existing grading results status for Idempotency
    const { data: existingResult, error: queryError } = await supabase
      .from('grading_results')
      .select('id, status')
      .eq('submission_id', submission_id)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError
    }

    // Idempotency: Reject updates if result is already finalized/published
    if (existingResult && existingResult.status === 'published') {
      return NextResponse.json(
        { error: 'Conflict: This submission grading result is already published' },
        { status: 409 }
      )
    }

    // 3. Upsert Grading Result (keep in 'draft' status)
    let resultId: string
    if (existingResult) {
      resultId = existingResult.id
      const { error: updateError } = await supabase
        .from('grading_results')
        .update({
          overall_feedback: overall_feedback || 'Automated score callback received.',
          status: 'draft',
        })
        .eq('id', resultId)

      if (updateError) throw updateError
    } else {
      const { data: newResult, error: insertError } = await supabase
        .from('grading_results')
        .insert([
          {
            submission_id,
            overall_feedback: overall_feedback || 'Automated score callback received.',
            status: 'draft',
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError
      resultId = newResult.id
    }

    // 4. Upsert individual Rubric Scores
    // The calculate_total_score DB trigger will automatically re-compute total_score in grading_results
    for (const scoreEntry of scores) {
      const { rubric_criterion_id, score, feedback } = scoreEntry
      if (!rubric_criterion_id || score === undefined) continue

      const { error: scoreUpsertError } = await supabase
        .from('rubric_scores')
        .upsert(
          {
            grading_result_id: resultId,
            rubric_criterion_id,
            score,
            feedback: feedback || '',
          },
          {
            onConflict: 'grading_result_id,rubric_criterion_id',
          }
        )

      if (scoreUpsertError) throw scoreUpsertError
    }

    // 5. Update submission status to grading_in_progress
    await supabase
      .from('submissions')
      .update({ status: 'grading_in_progress' })
      .eq('id', submission_id)

    return NextResponse.json({
      success: true,
      message: 'Grading callback processed successfully. Result saved as draft.',
      gradingResultId: resultId,
    })
  } catch (error: any) {
    console.error('Callback processor error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
