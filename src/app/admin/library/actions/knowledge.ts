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

async function getKnowledgeSourcesFromSupabase(organizationId: string) {
  const supabase = getSupabaseServer(true)
  const { data: sources, error } = await supabase
    .from('knowledge_sources')
    .select('id, title, version_number, access_scope, conversion_status, status, summary, metadata_payload, created_at')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const sourceIds = (sources || []).map((source) => source.id)
  if (sourceIds.length === 0) {
    return []
  }

  const { data: chunks, error: chunksError } = await supabase
    .from('knowledge_chunks')
    .select('knowledge_source_id')
    .in('knowledge_source_id', sourceIds)
    .eq('status', 'active')

  if (chunksError) {
    throw chunksError
  }

  const chunkCounts = new Map<string, number>()
  ;(chunks || []).forEach((chunk) => {
    chunkCounts.set(
      chunk.knowledge_source_id,
      (chunkCounts.get(chunk.knowledge_source_id) || 0) + 1
    )
  })

  return (sources || []).map((source) => ({
    ...source,
    original_filename:
      typeof source.metadata_payload?.original_filename === 'string'
        ? source.metadata_payload.original_filename
        : '',
    chunks_count: chunkCounts.get(source.id) || 0,
  }))
}

/**
 * Uploads a document (PDF, Word, Excel, CSV, Text, Markdown) to the FastAPI RAG engine.
 */
export async function uploadKnowledgeAction(formData: FormData) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

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
 * Gets all active knowledge sources.
 */
export async function getKnowledgeSourcesAction() {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

    try {
      const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/sources`, {
        method: 'GET',
        headers: {
          'x-pilot-actor-user-id': userId,
          'x-pilot-organization-id': orgId,
          'x-pilot-roles': 'teacher,admin',
        }
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to list knowledge sources')
      }

      const data = await res.json()
      const sources = data.sources || []
      if (sources.length > 0) {
        return { success: true, sources }
      }
    } catch (engineError) {
      console.warn('RAG engine source listing unavailable, falling back to Supabase:', engineError)
    }

    return {
      success: true,
      sources: await getKnowledgeSourcesFromSupabase(orgId),
    }
  } catch (error: any) {
    console.error('Failed to get knowledge sources:', error)
    return { success: false, error: error.message, sources: [] }
  }
}

/**
 * Deletes/archives a knowledge source.
 */
export async function deleteKnowledgeSourceAction(id: string) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()

    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/sources/${id}`, {
      method: 'DELETE',
      headers: {
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': orgId,
        'x-pilot-roles': 'teacher,admin',
      }
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Failed to delete knowledge source')
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete knowledge source:', error)
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

    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/query`, {
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
      throw new Error(errData.detail || 'Knowledge query failed in RAG engine')
    }

    const data = await res.json()
    return { success: true, results: data.results || [] }
  } catch (error: any) {
    console.error('Failed to search RAG knowledge:', error)
    return { success: false, error: error.message, results: [] }
  }
}

/**
 * Gets all parsed text chunks of a specific knowledge source.
 */
export async function getKnowledgeSourceChunksAction(sourceId: string) {
  try {
    await checkAdminAuth()
    const supabase = getSupabaseServer(true)
    const { data: chunks, error } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .eq('knowledge_source_id', sourceId)
      .order('position')

    if (error) throw error
    return { success: true, chunks: chunks || [] }
  } catch (error: any) {
    console.error('Failed to get knowledge source chunks:', error)
    return { success: false, error: error.message, chunks: [] }
  }
}
