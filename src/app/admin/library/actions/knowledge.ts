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
 * Uploads a text/markdown document to the FastAPI RAG engine.
 */
export async function uploadKnowledgeAction(title: string, accessScope: string, fileName: string, fileContent: string) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

    const formData = new FormData()
    formData.append('title', title)
    formData.append('access_scope', accessScope)
    
    const fileBlob = new Blob([fileContent], { type: 'text/markdown' })
    formData.append('file', fileBlob, fileName)

    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/upload`, {
      method: 'POST',
      headers: {
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': orgId,
        'x-pilot-roles': 'teacher,admin',
      },
      body: formData
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Knowledge upload failed in RAG engine')
    }

    return { success: true, data: await res.json() }
  } catch (error: any) {
    console.error('Failed to upload RAG knowledge source:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Searches RAG knowledge base via Reciprocal Rank Fusion (RRF) hybrid semantic search.
 */
export async function searchKnowledgeAction(
  query: string,
  limit: number = 5,
  allowedAccessScopes: string[] = ['organization', 'public_safe'],
  sourceIds?: string[]
) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': orgId,
        'x-pilot-roles': 'teacher,admin',
      },
      body: JSON.stringify({
        query,
        limit,
        allowed_access_scopes: allowedAccessScopes,
        source_ids: sourceIds || null,
      })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Knowledge search failed in RAG engine')
    }

    const data = await res.json()
    return { success: true, results: data.results || [] }
  } catch (error: any) {
    console.error('Failed to search RAG knowledge:', error)
    return { success: false, error: error.message, results: [] }
  }
}

/**
 * Deletes a RAG knowledge source and all its active chunks from the database.
 */
export async function deleteKnowledgeAction(sourceId: string) {
  try {
    await checkAdminAuth()
    const supabase = getSupabaseServer(true)

    // Direct deletion from knowledge_sources cascades to knowledge_chunks automatically via database foreign keys!
    const { error } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', sourceId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete knowledge source:', error)
    return { success: false, error: error.message }
  }
}
