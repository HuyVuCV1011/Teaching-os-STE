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

async function resolveOrganizationId() {
  const supabase = getSupabaseServer(true)
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single()

  if (error || !org) {
    throw new Error(`Failed to resolve organization boundary: ${error?.message || 'Not found'}`)
  }

  return org.id
}

/**
 * Gets a prompt configuration by key.
 */
export async function getPromptAction(key: string) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

    const res = await fetch(`${RUBICORE_API_URL}/pilot/prompts/${key}`, {
      method: 'GET',
      headers: {
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': orgId,
        'x-pilot-roles': 'teacher,admin',
      }
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Failed to get prompt configuration')
    }

    const data = await res.json()
    return { success: true, promptText: data.prompt_text }
  } catch (error: any) {
    console.error('Failed to get prompt configuration:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Saves a prompt configuration by key.
 */
export async function savePromptAction(key: string, text: string) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

    const res = await fetch(`${RUBICORE_API_URL}/pilot/prompts/${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': orgId,
        'x-pilot-roles': 'teacher,admin',
      },
      body: JSON.stringify({ prompt_text: text })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Failed to save prompt configuration')
    }

    const data = await res.json()
    return { success: true, promptText: data.prompt_text }
  } catch (error: any) {
    console.error('Failed to save prompt configuration:', error)
    return { success: false, error: error.message }
  }
}
