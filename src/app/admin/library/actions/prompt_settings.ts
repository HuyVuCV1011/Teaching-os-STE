'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { getSupabaseFetchErrorMessage } from '@/lib/error-messages'
import { requireAdminUser } from '@/lib/admin-auth'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

type ApiErrorResponse = {
  detail?: string
}

type PromptResponse = {
  prompt_text?: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

async function checkAdminAuth() {
  return requireAdminUser()
}

async function resolveOrganizationId() {
  const supabase = getSupabaseServer(true)
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single()

  if (error || !org) {
    throw new Error(getSupabaseFetchErrorMessage(error, 'Không thể xác định organization mặc định.'))
  }

  return org.id as string
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
      const errData = await res.json().catch(() => ({})) as ApiErrorResponse
      throw new Error(errData.detail || 'Failed to get prompt configuration')
    }

    const data = await res.json() as PromptResponse
    return { success: true, promptText: data.prompt_text }
  } catch (error) {
    console.error('Failed to get prompt configuration:', error)
    return { success: false, error: getErrorMessage(error) }
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
      const errData = await res.json().catch(() => ({})) as ApiErrorResponse
      throw new Error(errData.detail || 'Failed to save prompt configuration')
    }

    const data = await res.json() as PromptResponse
    return { success: true, promptText: data.prompt_text }
  } catch (error) {
    console.error('Failed to save prompt configuration:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
