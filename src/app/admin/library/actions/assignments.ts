'use server'

import { getSupabaseServer } from '@/lib/supabase'

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
}

export async function saveAssignmentAction(input: AssignmentInput) {
  const supabase = getSupabaseServer(true)
  try {
    let rubricSnapshotId: string | null = null

    if (input.rubricId) {
      // 1. Fetch live rubric criteria
      const { data: criteria, error: critErr } = await supabase
        .from('rubric_criteria')
        .select('id, name, description, max_points, weight')
        .eq('rubric_id', input.rubricId)

      if (critErr) {
        throw new Error(`Failed to fetch rubric criteria: ${critErr.message}`)
      }

      // 2. Create the snapshot payload
      const snapshotPayload = {
        rubric_id: input.rubricId,
        criteria: criteria || []
      }

      // 3. Insert snapshot into rubric_snapshots
      const { data: snapshotData, error: snapErr } = await supabase
        .from('rubric_snapshots')
        .insert([
          {
            rubric_id: input.rubricId,
            snapshot: snapshotPayload
          }
        ])
        .select('id')
        .single()

      if (snapErr || !snapshotData) {
        throw new Error(`Failed to create rubric snapshot: ${snapErr?.message || 'No data returned'}`)
      }

      rubricSnapshotId = snapshotData.id
    }

    const payload: any = {
      lesson_id: input.lessonId,
      title: input.title,
      instructions: input.instructions,
      rubric_id: input.rubricId || null,
      max_score: input.maxScore,
      max_files: input.maxFiles,
      max_total_size_mb: input.maxTotalSizeMb,
      auto_publish_grades: input.autoPublishGrades,
      rubric_snapshot_id: rubricSnapshotId,
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
      return { success: true, data }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('assignments')
        .insert([payload])
        .select()

      if (error) throw error
      return { success: true, data }
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
