'use server'

import { getSupabaseServer } from '@/lib/supabase'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function verifyCertificateAction(certificateId: string) {
  if (!UUID_PATTERN.test(certificateId)) {
    return { success: true as const, certificate: null }
  }

  try {
    const supabase = getSupabaseServer(true)
    const { data, error } = await supabase
      .from('certificates')
      .select('id, student_email, grade_average, issued_at, classes(name, class_code)')
      .eq('id', certificateId)
      .maybeSingle()

    if (error) throw error
    return { success: true as const, certificate: data }
  } catch (error) {
    console.error('Certificate verification failed:', error)
    return { success: false as const, error: 'Credential verification is temporarily unavailable' }
  }
}
