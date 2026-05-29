'use server'

import { getSupabaseServer } from '@/lib/supabase'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

export interface AssignmentInput {
  id?: string
  lessonId: string
  title: string
  instructions: string
  rubricId: string | null
  maxScore: number
  maxFiles: number
  maxTotalSizeMb: number
  autoPublishGrades: boolean
  gracePeriodHours: number
  penaltyPercentPerDay: number
  // Fields for solution upload and AI rubric configuration
  solutionStoragePath?: string | null
  promptFilePath?: string | null
  aiModelUsed?: string
  customCriteria?: Array<{
    key: string
    label: string
    description: string
    max_points: number
    weight: number
    evaluation_hints?: {
      rule_type: string
      expected_value: string | null
    }
  }> | null
}

export async function saveAssignmentAction(input: AssignmentInput) {
  const supabase = getSupabaseServer(true)
  if (
    input.maxScore < 0 ||
    input.maxFiles < 0 ||
    input.maxTotalSizeMb < 0 ||
    input.gracePeriodHours < 0 ||
    input.penaltyPercentPerDay < 0
  ) {
    throw new Error('Assignment parameters (Max Score, Max Files, Max Size, Grace Hours, Late Penalty) cannot be negative.')
  }
  try {
    let activeRubricId = input.rubricId

    // 1. If custom criteria are passed, we either create a new rubric or update criteria in-place
    if (input.customCriteria && input.customCriteria.length > 0) {
      if (!activeRubricId) {
        // Create new Rubric row
        const { data: newRubric, error: rubErr } = await supabase
          .from('rubrics')
          .insert([
            {
              title: `${input.title} Rubric`,
              description: `Generated rubric matrix for assignment: ${input.title}`
            }
          ])
          .select('id')
          .single()

        if (rubErr || !newRubric) {
          throw new Error(`Failed to create custom rubric: ${rubErr?.message || 'No data returned'}`)
        }
        activeRubricId = newRubric.id
      } else {
        // Clear existing criteria to prevent duplicates on overwrite
        const { error: deleteErr } = await supabase
          .from('rubric_criteria')
          .delete()
          .eq('rubric_id', activeRubricId)

        if (deleteErr) {
          throw new Error(`Failed to reset existing criteria: ${deleteErr.message}`)
        }
      }

      // Insert new criteria rows
      const criteriaRows = input.customCriteria.map((c) => ({
        rubric_id: activeRubricId,
        name: c.label,
        description: c.description || '',
        max_points: c.max_points,
        weight: c.weight,
        evaluation_hints: c.evaluation_hints || { rule_type: 'none', expected_value: null }
      }))

      const { error: insertErr } = await supabase
        .from('rubric_criteria')
        .insert(criteriaRows)

      if (insertErr) {
        throw new Error(`Failed to insert criteria: ${insertErr.message}`)
      }
    }

    // 2. Generate Rubric Snapshot
    let rubricSnapshotId: string | null = null
    if (activeRubricId) {
      const { data: criteria, error: critErr } = await supabase
        .from('rubric_criteria')
        .select('id, name, description, max_points, weight, evaluation_hints')
        .eq('rubric_id', activeRubricId)

      if (critErr) {
        throw new Error(`Failed to fetch criteria for snapshot: ${critErr.message}`)
      }

      const snapshotPayload = {
        rubric_id: activeRubricId,
        criteria: criteria || []
      }

      const { data: snapshotData, error: snapErr } = await supabase
        .from('rubric_snapshots')
        .insert([
          {
            rubric_id: activeRubricId,
            snapshot: snapshotPayload
          }
        ])
        .select('id')
        .single()

      if (snapErr || !snapshotData) {
        throw new Error(`Failed to save snapshot: ${snapErr?.message || 'No data'}`)
      }

      rubricSnapshotId = snapshotData.id
    }

    // 3. Save Assignment
    const payload: any = {
      lesson_id: input.lessonId,
      title: input.title,
      instructions: input.instructions,
      rubric_id: activeRubricId || null,
      max_score: input.maxScore,
      max_files: input.maxFiles,
      max_total_size_mb: input.maxTotalSizeMb,
      auto_publish_grades: input.autoPublishGrades,
      rubric_snapshot_id: rubricSnapshotId,
      solution_storage_path: input.solutionStoragePath || null,
      prompt_file_path: input.promptFilePath || null,
      ai_model_used: input.aiModelUsed || 'ollama',
      late_policy: {
        grace_period_hours: input.gracePeriodHours,
        penalty_percent_per_day: input.penaltyPercentPerDay
      }
    }

    if (input.id) {
      // Update
      const { data, error } = await supabase
        .from('assignments')
        .update(payload)
        .eq('id', input.id)
        .select()

      if (error) throw error
      return { success: true, data, rubricId: activeRubricId }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('assignments')
        .insert([payload])
        .select()

      if (error) throw error
      return { success: true, data, rubricId: activeRubricId }
    }
  } catch (error: any) {
    console.error('Failed to save assignment:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteAssignmentAction(id: string) {
  const supabase = getSupabaseServer(true)
  try {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete assignment:', error)
    return { success: false, error: error.message }
  }
}

// Proxies calling the Python RubriCore engine
export async function generateSolutionAction(assignmentText: str, modelChoice: string = 'ollama') {
  try {
    const res = await fetch(`${RUBICORE_API_URL}/pilot/generate-solution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_choice: modelChoice,
        assignment_text: assignmentText,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Solution generation endpoint failed')
    }

    const data = await res.json()
    return { success: true, solutionKey: data.solution_key }
  } catch (error: any) {
    console.error('Failed to generate solution:', error)
    return { success: false, error: error.message }
  }
}

export async function generateRubricAction(assignmentText: str, solutionText: str, modelChoice: string = 'ollama') {
  try {
    const res = await fetch(`${RUBICORE_API_URL}/pilot/generate-rubric`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_choice: modelChoice,
        assignment_text: assignmentText,
        solution_text: solutionText,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Rubric generation endpoint failed')
    }

    const data = await res.json()
    return { success: true, criteria: data.criteria }
  } catch (error: any) {
    console.error('Failed to generate rubric:', error)
    return { success: false, error: error.message }
  }
}
