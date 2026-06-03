'use server'

import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase'
import { verifyJWT } from '@/lib/jwt'

const RUBICORE_API_URL = process.env.RUBICORE_API_URL || 'http://localhost:8080'

interface JWTPayload {
  sub: string
  role?: string
  app_metadata?: {
    role?: string
  }
}

interface TiptapNode {
  type: string
  text?: string
  attrs?: {
    level?: number
  }
  content?: TiptapNode[]
}

interface QuestionItem {
  content: string
  answer?: string
}

export interface DiscoveredSource {
  id: string
  title: string
  type: string
  summary: string
  linkedConcepts: { entryId: string; title: string }[]
  isProcessed: boolean
}

export interface RefinedEntryProposal {
  id?: string
  action?: 'create' | 'update' | 'supersede'
  existing_entry_id?: string
  title: string
  summary: string
  content: string
  knowledge_type: string
  chapter_topic?: string
  topic_id?: string | null
  subject_id?: string | null
  tags?: string[]
  prerequisites?: string[]
  version?: number
  embedding?: number[] | null
  source_type?: string
  domain_name?: string
  subject_name?: string
}

interface RefinedKnowledgeLinkRecord {
  entry_id: string
  source_id: string
  refined_knowledge_entries: {
    title: string
    status: string
  }
}

// Helper functions for Auth & Org boundary resolution
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
  let payload: JWTPayload | null = null

  if (secret) {
    payload = await verifyJWT(sbToken.value, secret) as JWTPayload
  } else {
    const parts = sbToken.value.split('.')
    if (parts.length === 3) {
      payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload
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
  ].includes(role || '')

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

  return org.id as string
}

// Convert Tiptap JSON to clean Markdown/text
function tiptapToMarkdown(jsonStr: string): string {
  try {
    const doc = JSON.parse(jsonStr) as TiptapNode
    return parseNode(doc)
  } catch {
    return jsonStr || ''
  }

  function parseNode(node: TiptapNode): string {
    if (!node) return ''
    if (node.type === 'text') return node.text || ''
    if (node.type === 'paragraph') return (node.content || []).map(parseNode).join('') + '\n\n'
    if (node.type === 'heading') {
      const level = node.attrs?.level || 1
      const prefix = '#'.repeat(level) + ' '
      return prefix + (node.content || []).map(parseNode).join('') + '\n\n'
    }
    if (node.type === 'listItem') {
      return '- ' + (node.content || []).map(parseNode).join('') + '\n'
    }
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(parseNode).join('')
    }
    return ''
  }
}

/**
 * Discovers raw knowledge sources in the subject, cross-referencing links to compute processed state.
 */
export async function discoverKnowledgeSourcesAction(subjectId?: string) {
  try {
    await checkAdminAuth()
    const supabase = getSupabaseServer(true)

    // 1. Fetch all lessons
    let lessonsQuery = supabase
      .from('lessons')
      .select(`
        id,
        title,
        content,
        module:modules!inner(
          course:courses!inner(
            subject_id
          )
        )
      `)
    if (subjectId) {
      lessonsQuery = lessonsQuery.eq('modules.courses.subject_id', subjectId)
    }
    const { data: lessons, error: lessonsErr } = await lessonsQuery
    if (lessonsErr) throw lessonsErr

    // 2. Fetch all canonical materials
    let materialsQuery = supabase
      .from('canonical_materials')
      .select(`
        id,
        title,
        storage_url,
        type,
        lesson:lessons!inner(
          module:modules!inner(
            course:courses!inner(
              subject_id
            )
          )
        )
      `)
    if (subjectId) {
      materialsQuery = materialsQuery.eq('lessons.modules.courses.subject_id', subjectId)
    }
    const { data: materials, error: materialsErr } = await materialsQuery
    if (materialsErr) throw materialsErr

    // 3. Fetch all assignments
    let assignmentsQuery = supabase
      .from('assignments')
      .select(`
        id,
        title,
        instructions,
        lesson:lessons!inner(
          module:modules!inner(
            course:courses!inner(
              subject_id
            )
          )
        )
      `)
    if (subjectId) {
      assignmentsQuery = assignmentsQuery.eq('lessons.modules.courses.subject_id', subjectId)
    }
    const { data: assignments, error: assignmentsErr } = await assignmentsQuery
    if (assignmentsErr) throw assignmentsErr

    // 4. Fetch all manual upload knowledge sources
    const { data: uploads, error: uploadsErr } = await supabase
      .from('knowledge_sources')
      .select('*')
      .neq('metadata_payload->>source_format', 'lesson_pedagogy')

    if (uploadsErr) throw uploadsErr

    // 5. Fetch all links in the junction table to compute processed state
    const { data: links, error: linksErr } = await supabase
      .from('refined_knowledge_links')
      .select(`
        entry_id,
        source_id,
        refined_knowledge_entries!inner(
          title,
          status
        )
      `)
      .eq('refined_knowledge_entries.status', 'active')

    if (linksErr) throw linksErr

    // Map source_id to linked concepts list
    const linksMap: Record<string, { entryId: string; title: string }[]> = {}
    const linksTyped = (links as unknown) as RefinedKnowledgeLinkRecord[]
    linksTyped?.forEach((link) => {
      const sid = link.source_id
      if (!linksMap[sid]) {
        linksMap[sid] = []
      }
      linksMap[sid].push({
        entryId: link.entry_id,
        title: link.refined_knowledge_entries.title
      })
    })

    // Format discovered sources
    const discovered: DiscoveredSource[] = []

    lessons?.forEach((lesson) => {
      discovered.push({
        id: lesson.id,
        title: lesson.title,
        type: 'lesson',
        summary: 'Lecture content created in workspace syllabus mapper',
        linkedConcepts: linksMap[lesson.id] || [],
        isProcessed: (linksMap[lesson.id] || []).length > 0
      })
    })

    materials?.forEach((material) => {
      discovered.push({
        id: material.id,
        title: material.title,
        type: 'canonical_material',
        summary: `Attached lesson file of type: ${material.type}`,
        linkedConcepts: linksMap[material.id] || [],
        isProcessed: (linksMap[material.id] || []).length > 0
      })
    })

    assignments?.forEach((assignment) => {
      discovered.push({
        id: assignment.id,
        title: assignment.title,
        type: 'assignment',
        summary: 'Syllabus assignment questions and rubric descriptors',
        linkedConcepts: linksMap[assignment.id] || [],
        isProcessed: (linksMap[assignment.id] || []).length > 0
      })
    })

    uploads?.forEach((upload) => {
      discovered.push({
        id: upload.id,
        title: upload.title,
        type: 'knowledge_source',
        summary: `Manually uploaded document: ${upload.metadata_payload?.source_format || 'text'}`,
        linkedConcepts: linksMap[upload.id] || [],
        isProcessed: (linksMap[upload.id] || []).length > 0
      })
    })

    return { success: true, sources: discovered }
  } catch (error) {
    const err = error as Error
    console.error('Failed to discover knowledge sources:', err)
    return { success: false, error: err.message, sources: [] }
  }
}

/**
 * Triggers batch refinement via FastAPI engine, fetching text content of inputs and existing entries context.
 */
export async function generateRefinedKnowledgeAction(
  subjectId: string | undefined,
  sources: { id: string; type: string; title: string }[],
  modelChoice: string
) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()
    const supabase = getSupabaseServer(true)

    // 1. Fetch active entries globally
    const { data: activeEntries, error: existingErr } = await supabase
      .from('refined_knowledge_entries')
      .select('id, title, summary, knowledge_type, version, subject_id')
      .eq('status', 'active')

    if (existingErr) throw existingErr

    // 2. Fetch all subjects and domains
    const { data: dbSubjects } = await supabase.from('subjects').select('id, name, domain_id')
    const { data: dbDomains } = await supabase.from('knowledge_domains').select('id, name')

    const subjectIdToName: Record<string, string> = {}
    const subjectIdToDomainId: Record<string, string> = {}
    dbSubjects?.forEach(s => {
      subjectIdToName[s.id] = s.name
      if (s.domain_id) {
        subjectIdToDomainId[s.id] = s.domain_id
      }
    })

    const domainIdToName: Record<string, string> = {}
    dbDomains?.forEach(d => {
      domainIdToName[d.id] = d.name
    })

    const existingConcepts = activeEntries?.map(e => ({
      id: e.id,
      title: e.title,
      summary: e.summary,
      domain_name: e.subject_id && subjectIdToDomainId[e.subject_id] ? domainIdToName[subjectIdToDomainId[e.subject_id]] : '',
      subject_name: e.subject_id ? subjectIdToName[e.subject_id] : '',
      knowledge_type: e.knowledge_type,
      version: e.version
    })) || []

    // 3. Fetch full text content for each selected source
    const sourcesPayload: { id: string; type: string; title: string; content: string }[] = []

    for (const source of sources) {
      let content = ''

      if (source.type === 'lesson') {
        const { data: lesson } = await supabase
          .from('lessons')
          .select('content')
          .eq('id', source.id)
          .single()
        if (lesson?.content) {
          content = tiptapToMarkdown(lesson.content)
        }
      } else if (source.type === 'assignment') {
        const { data: asg } = await supabase
          .from('assignments')
          .select('instructions, custom_criteria')
          .eq('id', source.id)
          .single()
        if (asg) {
          let instText = ''
          try {
            const parsed = JSON.parse(asg.instructions)
            const questions = (parsed.questions || []) as QuestionItem[]
            instText = questions.map((q, i) => `Q${i+1}: ${q.content}\nExpected Answer: ${q.answer || '(none)'}`).join('\n\n')
          } catch {
            instText = asg.instructions || ''
          }
          content = `# Assignment: ${source.title}\n\n${instText}`
        }
      } else if (source.type === 'canonical_material') {
        const { data: material } = await supabase
          .from('canonical_materials')
          .select('storage_url, type')
          .eq('id', source.id)
          .single()
        content = `# Material: ${source.title}\nAttached file path: ${material?.storage_url || ''}\nType: ${material?.type || ''}`
      } else if (source.type === 'knowledge_source') {
        // Concatenate all chunks for the manual upload knowledge source
        const { data: chunks } = await supabase
          .from('knowledge_chunks')
          .select('content, position')
          .eq('knowledge_source_id', source.id)
          .order('position')
        content = (chunks || []).map(c => c.content).join('\n\n')
      }

      sourcesPayload.push({
        id: source.id,
        type: source.type,
        title: source.title,
        content: content || 'No text content available.'
      })
    }

    // 4. POST to FastAPI endpoint for refinement & batch embedding
    const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pilot-actor-user-id': userId,
        'x-pilot-organization-id': orgId,
        'x-pilot-roles': 'teacher,admin',
      },
      body: JSON.stringify({
        subject_id: subjectId || null,
        sources: sourcesPayload,
        existing_concepts: existingConcepts,
        model_choice: modelChoice,
      })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Refinement generation failed in FastAPI engine')
    }

    const resJson = await res.json()
    return { success: true, entries: (resJson.entries || []) as RefinedEntryProposal[] }
  } catch (error) {
    const err = error as Error
    console.error('Failed to generate refined knowledge concepts:', err)
    return { success: false, error: err.message, entries: [] }
  }
}

/**
 * Commits user-approved entries (inserts/updates/supersedes in DB) and sets provenance links.
 */
export async function commitRefinedKnowledgeAction(
  subjectId: string, // Kept signature for compatibility, but we resolve per-concept domain/subject dynamically
  acceptedEntries: RefinedEntryProposal[],
  sourceIds: string[]
) {
  try {
    await checkAdminAuth()
    const orgId = await resolveOrganizationId()
    const supabase = getSupabaseServer(true)

    for (const entry of acceptedEntries) {
      let entryId = entry.id || crypto.randomUUID()
      const dName = entry.domain_name || 'General'
      const sName = entry.subject_name || 'General'

      // 1. Resolve Domain
      let domainId = null
      const { data: domain } = await supabase
        .from('knowledge_domains')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', dName)
        .limit(1)
        .maybeSingle()

      if (domain) {
        domainId = domain.id
      } else {
        const { data: newDomain, error: domErr } = await supabase
          .from('knowledge_domains')
          .insert({
            organization_id: orgId,
            name: dName,
            description: `AI-extracted Domain for ${dName}`
          })
          .select('id')
          .single()
        if (domErr) throw domErr
        domainId = newDomain.id
      }

      // 2. Resolve Subject under Domain
      let resolvedSubjectId = null
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', sName)
        .limit(1)
        .maybeSingle()

      if (subject) {
        resolvedSubjectId = subject.id
        // Ensure it is linked to domain
        if (domainId) {
          await supabase
            .from('subjects')
            .update({ domain_id: domainId })
            .eq('id', resolvedSubjectId)
        }
      } else {
        const slug = sName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
        const { data: newSub, error: subErr } = await supabase
          .from('subjects')
          .insert({
            name: sName,
            slug: slug,
            domain_id: domainId,
            description: `AI-created Subject under ${dName}`
          })
          .select('id')
          .single()
        if (subErr) throw subErr
        resolvedSubjectId = newSub.id
      }

      // 3. Insert/Update refined entry
      if (entry.action === 'create') {
        const { error: insErr } = await supabase
          .from('refined_knowledge_entries')
          .insert({
            id: entryId,
            organization_id: orgId,
            subject_id: resolvedSubjectId,
            title: entry.title,
            summary: entry.summary,
            content: entry.content,
            knowledge_type: entry.knowledge_type,
            tags: entry.tags || [],
            prerequisites: entry.prerequisites || [],
            version: 1,
            status: 'active',
            embedding: entry.embedding || null
          })

        if (insErr) throw insErr

        // Link provenance sources
        for (const sid of sourceIds) {
          await supabase
            .from('refined_knowledge_links')
            .insert({
              entry_id: entryId,
              source_type: entry.source_type || 'lesson',
              source_id: sid
            })
        }

      } else if (entry.action === 'update' && entry.existing_entry_id) {
        entryId = entry.existing_entry_id

        const { data: prev } = await supabase
          .from('refined_knowledge_entries')
          .select('version')
          .eq('id', entryId)
          .single()

        const nextVersion = (prev?.version || 1) + 1

        const { error: updErr } = await supabase
          .from('refined_knowledge_entries')
          .update({
            subject_id: resolvedSubjectId,
            title: entry.title,
            summary: entry.summary,
            content: entry.content,
            knowledge_type: entry.knowledge_type,
            tags: entry.tags || [],
            prerequisites: entry.prerequisites || [],
            version: nextVersion,
            embedding: entry.embedding || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', entryId)

        if (updErr) throw updErr

        // Add missing provenance links
        for (const sid of sourceIds) {
          const { data: exists } = await supabase
            .from('refined_knowledge_links')
            .select('id')
            .eq('entry_id', entryId)
            .eq('source_id', sid)
            .maybeSingle()

          if (!exists) {
            await supabase
              .from('refined_knowledge_links')
              .insert({
                entry_id: entryId,
                source_type: entry.source_type || 'lesson',
                source_id: sid
              })
          }
        }

      } else if (entry.action === 'supersede' && entry.existing_entry_id) {
        const oldId = entry.existing_entry_id

        await supabase
          .from('refined_knowledge_entries')
          .update({
            status: 'superseded',
            updated_at: new Date().toISOString()
          })
          .eq('id', oldId)

        const { data: oldEntry } = await supabase
          .from('refined_knowledge_entries')
          .select('version')
          .eq('id', oldId)
          .single()

        const newId = crypto.randomUUID()
        const { error: superInsErr } = await supabase
          .from('refined_knowledge_entries')
          .insert({
            id: newId,
            organization_id: orgId,
            subject_id: resolvedSubjectId,
            title: entry.title,
            summary: entry.summary,
            content: entry.content,
            knowledge_type: entry.knowledge_type,
            tags: entry.tags || [],
            prerequisites: entry.prerequisites || [],
            version: (oldEntry?.version || 1) + 1,
            status: 'active',
            embedding: entry.embedding || null
          })

        if (superInsErr) throw superInsErr

        for (const sid of sourceIds) {
          await supabase
            .from('refined_knowledge_links')
            .insert({
              entry_id: newId,
              source_type: entry.source_type || 'lesson',
              source_id: sid
            })
        }
        entryId = newId
      }

      // 4. Save Relational Tags
      await supabase
        .from('concept_tags')
        .delete()
        .eq('concept_id', entryId)

      if (entry.tags && entry.tags.length > 0) {
        for (const tagName of entry.tags) {
          let tagId = null
          const { data: existingTag } = await supabase
            .from('knowledge_tags')
            .select('id')
            .eq('organization_id', orgId)
            .eq('name', tagName)
            .limit(1)
            .maybeSingle()

          if (existingTag) {
            tagId = existingTag.id
          } else {
            const { data: newTag, error: tagErr } = await supabase
              .from('knowledge_tags')
              .insert({
                organization_id: orgId,
                name: tagName
              })
              .select('id')
              .single()
            if (tagErr) throw tagErr
            tagId = newTag.id
          }

          await supabase
            .from('concept_tags')
            .insert({
              concept_id: entryId,
              tag_id: tagId
            })
            .select('concept_id')
            .maybeSingle()
        }
      }
    }

    return { success: true }
  } catch (error) {
    const err = error as Error
    console.error('Failed to commit refined knowledge entries:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Fetches hierarchical topics tree and concept entries for the browsable library.
 */
export async function fetchRefinedTopicsAndEntriesAction(subjectId?: string) {
  try {
    await checkAdminAuth()
    const supabase = getSupabaseServer(true)

    // Fetch domains
    const { data: domains, error: domainsErr } = await supabase
      .from('knowledge_domains')
      .select('*')
      .order('name')

    if (domainsErr) throw domainsErr

    // Fetch subjects
    let subjectsQuery = supabase.from('subjects').select('*').order('name')
    if (subjectId) {
      subjectsQuery = subjectsQuery.eq('id', subjectId)
    }
    const { data: subjects, error: subjectsErr } = await subjectsQuery

    if (subjectsErr) throw subjectsErr

    // Fetch entries
    const { data: entries, error: entriesErr } = await supabase
      .from('refined_knowledge_entries')
      .select(`
        *,
        links:refined_knowledge_links(source_type, source_id)
      `)
      .eq('status', 'active')

    if (entriesErr) throw entriesErr

    // Fetch tag relations
    const { data: tagRelations } = await supabase
      .from('concept_tags')
      .select(`
        concept_id,
        tag:knowledge_tags(name)
      `)

    // Map tag relations to entries
    const tagMap: Record<string, string[]> = {}
    const relations = tagRelations as { concept_id: string; tag: { name: string } | null }[] | null
    relations?.forEach((r) => {
      if (r.tag?.name) {
        if (!tagMap[r.concept_id]) {
          tagMap[r.concept_id] = []
        }
        tagMap[r.concept_id].push(r.tag.name)
      }
    })

    const enrichedEntries = entries?.map(e => ({
      ...e,
      tags: tagMap[e.id] || e.tags || []
    })) || []

    return {
      success: true,
      domains: domains || [],
      subjects: subjects || [],
      entries: enrichedEntries
    }
  } catch (error) {
    const err = error as Error
    console.error('Failed to fetch refined topics and entries:', err)
    return { success: false, error: err.message, domains: [], subjects: [], entries: [] }
  }
}

export async function createDomainAction(name: string, description?: string) {
  try {
    await checkAdminAuth()
    const orgId = await resolveOrganizationId()
    const supabase = getSupabaseServer(true)

    const { data, error } = await supabase
      .from('knowledge_domains')
      .insert({
        organization_id: orgId,
        name: name,
        description: description || `Domain ${name}`
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true, domain: data }
  } catch (error) {
    const err = error as Error
    console.error('Failed to create knowledge domain:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Updates a single concept entry (manual teacher edits).
 */
export async function updateRefinedEntryAction(id: string, updates: RefinedEntryProposal) {
  try {
    const { userId } = await checkAdminAuth()
    const orgId = await resolveOrganizationId()
    const supabase = getSupabaseServer(true)

    // If title or content changed, recompute embeddings
    let embeddingVal = updates.embedding || null
    if (updates.title || updates.content) {
      try {
        const conceptText = `Title: ${updates.title || ''}\nSummary: ${updates.summary || ''}\nContent:\n${updates.content || ''}`
        const res = await fetch(`${RUBICORE_API_URL}/pilot/knowledge/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pilot-actor-user-id': userId,
            'x-pilot-organization-id': orgId,
            'x-pilot-roles': 'teacher,admin',
          },
          body: JSON.stringify({
            contents: [conceptText]
          })
        })
        if (res.ok) {
          const resJson = await res.json()
          if (resJson.embeddings && resJson.embeddings.length > 0) {
            embeddingVal = resJson.embeddings[0]
          }
        }
      } catch (embErr) {
        console.warn('Re-embedding on manual edit bypassed:', embErr)
      }
    }

    const { error } = await supabase
      .from('refined_knowledge_entries')
      .update({
        title: updates.title,
        summary: updates.summary,
        content: updates.content,
        knowledge_type: updates.knowledge_type,
        tags: updates.tags || [],
        prerequisites: updates.prerequisites || [],
        version: updates.version || 1,
        topic_id: updates.topic_id || null,
        embedding: embeddingVal,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    const err = error as Error
    console.error('Failed to update refined knowledge entry:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Archives or soft-deletes a refined concept entry.
 */
export async function deleteRefinedEntryAction(id: string) {
  try {
    await checkAdminAuth()
    const supabase = getSupabaseServer(true)

    const { error } = await supabase
      .from('refined_knowledge_entries')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    const err = error as Error
    console.error('Failed to archive refined knowledge entry:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Creates a new Topic under a Subject.
 */
export async function createTopicAction(subjectId: string, name: string, parentId?: string | null) {
  try {
    await checkAdminAuth()
    const orgId = await resolveOrganizationId()
    const supabase = getSupabaseServer(true)

    const { data, error } = await supabase
      .from('knowledge_topics')
      .insert({
        organization_id: orgId,
        subject_id: subjectId,
        parent_id: parentId || null,
        name: name,
        description: `Topic ${name} under subject`
      })
      .select('*')
      .single()

    if (error) throw error
    return { success: true, topic: data }
  } catch (error) {
    const err = error as Error
    console.error('Failed to create knowledge topic:', err)
    return { success: false, error: err.message }
  }
}
