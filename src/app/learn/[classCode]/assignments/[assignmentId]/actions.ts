'use server'

import { getSupabaseServer } from '@/lib/supabase'

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
