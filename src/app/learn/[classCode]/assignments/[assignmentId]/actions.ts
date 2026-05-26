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

  // 2. Create a grading_runs entry in Supabase
  const { data: run, error: runError } = await supabase
    .from('grading_runs')
    .insert([
      {
        submission_id: submissionId,
        assignment_id: submission.assignment_id,
        engine: 'rubricore',
        engine_version: 'pilot-ollama-v1',
        status: 'running',
        started_at: new Date().toISOString(),
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

  // 3. Construct rubric schema and evidence payloads
  const criteria = submission.assignments?.rubrics?.rubric_criteria || []
  const rubricSchema = {
    schema_version: "1.0",
    criteria: criteria.map((c: any) => ({
      key: c.id,
      label: c.name,
      description: c.description || "",
      weight: String(c.weight || 1.0),
      max_points: c.max_points,
    })),
    performance_levels: [
      { key: "meets", label: "Meets", score: "1.0", position: 0 }
    ],
    descriptors: []
  }

  const evidence = [
    {
      id: "raw-text-evidence",
      raw_text: submission.submitted_text || "",
      value_payload: {
        files: submission.submitted_files || []
      }
    }
  ]

  // 4. Send request to RubriCore FastAPI server
  const rubricoreUrl = process.env.RUBICORE_API_URL || 'http://localhost:8080'
  try {
    const response = await fetch(`${rubricoreUrl}/pilot/grade-submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pilot-actor-user-id': '00000000-0000-0000-0000-000000000000',
        'x-pilot-organization-id': '00000000-0000-0000-0000-000000000000',
        'x-pilot-roles': 'teacher',
      },
      body: JSON.stringify({
        rubric_schema: rubricSchema,
        evidence: evidence,
        ai_allowed: true,
      }),
      signal: AbortSignal.timeout(120000)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`FastAPI responded with ${response.status}: ${errText}`)
    }

    const result = await response.json()

    // 5. Save the suggestions to rubric_score_suggestions table in Supabase
    const suggestions = result.criterion_suggestions || []
    const suggestionsToInsert = suggestions.map((s: any) => ({
      grading_run_id: run.id,
      submission_id: submissionId,
      rubric_criterion_id: s.criterion_key,
      suggested_score: parseFloat(s.score) || 0,
      suggested_feedback: s.explanation || '',
      confidence: parseFloat(s.confidence) || null,
      evidence: { references: s.evidence_references || [] },
      status: 'suggested',
    }))

    if (suggestionsToInsert.length > 0) {
      const { error: sugInsertError } = await supabase
        .from('rubric_score_suggestions')
        .insert(suggestionsToInsert)
      if (sugInsertError) throw sugInsertError
    }

    // Upsert a draft grading result in Supabase
    const { data: existingGR } = await supabase
      .from('grading_results')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    if (existingGR) {
      await supabase
        .from('grading_results')
        .update({
          overall_feedback: result.overall_feedback_draft || 'AI suggestion received.',
          latest_grading_run_id: run.id,
        })
        .eq('id', existingGR.id)
    } else {
      await supabase
        .from('grading_results')
        .insert([
          {
            submission_id: submissionId,
            status: 'draft',
            overall_feedback: result.overall_feedback_draft || 'AI suggestion received.',
            latest_grading_run_id: run.id,
          }
        ])
    }

    // 6. Update grading_runs status to succeeded
    await supabase
      .from('grading_runs')
      .update({
        status: 'succeeded',
        completed_at: new Date().toISOString(),
        response_payload: result
      })
      .eq('id', run.id)

    return { success: true }
  } catch (error: any) {
    console.error("Grading run failed:", error)
    
    // Update grading_runs status to failed
    await supabase
      .from('grading_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message || 'Unknown error'
      })
      .eq('id', run.id)

    return { success: false, error: error.message }
  }
}
