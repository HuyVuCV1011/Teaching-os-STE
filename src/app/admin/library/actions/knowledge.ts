'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { getSupabaseFetchErrorMessage } from '@/lib/error-messages'
import { requireAdminUser } from '@/lib/admin-auth'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

type ApiErrorResponse = {
  detail?: string
}

type KnowledgeSourcesResponse = {
  sources?: KnowledgeSourceResult[]
}

type KnowledgeQueryResponse = {
  results?: RetrievedChunkResult[]
}

type KnowledgeSourceResult = {
  id: string
  title: string
  version_number: number
  access_scope: string
  conversion_status: string
  status: string
  summary: string | null
  original_filename: string
  chunks_count: number
  created_at: string | null
  metadata_payload?: {
    original_filename?: unknown
  } | null
}

type RetrievedChunkResult = {
  chunk_id: string
  knowledge_source_id: string
  heading_path: string[]
  content: string
  score: number
  matched_terms: string[]
  citation: {
    knowledge_source_title?: string
    knowledge_source_version_number?: number
    access_scope?: string
  }
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
  })) as KnowledgeSourceResult[]
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
      const errData = await res.json().catch(() => ({})) as ApiErrorResponse
      throw new Error(errData.detail || 'Knowledge upload failed in RAG engine')
    }

    return { success: true, data: await res.json() }
  } catch (error) {
    console.error('Failed to upload RAG knowledge source:', error)
    return { success: false, error: getErrorMessage(error) }
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
        const errData = await res.json().catch(() => ({})) as ApiErrorResponse
        throw new Error(errData.detail || 'Failed to list knowledge sources')
      }

      const data = await res.json() as KnowledgeSourcesResponse
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
  } catch (error) {
    console.error('Failed to get knowledge sources:', error)
    return { success: false, error: getErrorMessage(error), sources: [] }
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
      const errData = await res.json().catch(() => ({})) as ApiErrorResponse
      throw new Error(errData.detail || 'Failed to delete knowledge source')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete knowledge source:', error)
    return { success: false, error: getErrorMessage(error) }
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
      const errData = await res.json().catch(() => ({})) as ApiErrorResponse
      throw new Error(errData.detail || 'Knowledge query failed in RAG engine')
    }

    const data = await res.json() as KnowledgeQueryResponse
    return { success: true, results: data.results || [] }
  } catch (error) {
    console.error('Failed to search RAG knowledge:', error)
    return { success: false, error: getErrorMessage(error), results: [] }
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
    return { success: true, chunks: (chunks || []) as RetrievedChunkResult[] }
  } catch (error) {
    console.error('Failed to get knowledge source chunks:', error)
    return { success: false, error: getErrorMessage(error), chunks: [] }
  }
}
