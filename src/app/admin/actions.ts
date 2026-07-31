'use server'

import { requireAdminUser } from '@/lib/admin-auth'
import { getSupabaseServer } from '@/lib/supabase'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function getAdminDashboardStatsAction() {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)
    const [coursesResult, classesResult, submissionsResult, subjectsResult] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
    ])

    const firstError = [
      coursesResult.error,
      classesResult.error,
      submissionsResult.error,
      subjectsResult.error,
    ].find(Boolean)
    if (firstError) throw firstError

    return {
      success: true as const,
      data: {
        coursesCount: coursesResult.count || 0,
        classesCount: classesResult.count || 0,
        submissionsPending: submissionsResult.count || 0,
        subjectsCount: subjectsResult.count || 0,
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function logoutAdminAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
