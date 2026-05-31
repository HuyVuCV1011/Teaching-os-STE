'use server'

import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase'
import { verifyJWT } from '@/lib/jwt'

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

export async function triggerAIGradingAction(submissionId: string, modelChoice: string) {
  const { userId } = await checkAdminAuth()
  const supabase = getSupabaseServer(true)

  // Fetch the submission to get its organization_id
  const { data: sub, error: subError } = await supabase
    .from('submissions')
    .select('organization_id')
    .eq('id', submissionId)
    .single()

  if (subError || !sub) {
    throw new Error(`Failed to load submission metadata: ${subError?.message || 'Not found'}`)
  }

  const res = await fetch(`${RUBICORE_API_URL}/pilot/grading-runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pilot-actor-user-id': userId,
      'x-pilot-organization-id': sub.organization_id,
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
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || errData.error?.message || `Grading run API returned HTTP ${res.status}`)
  }

  return await res.json()
}
