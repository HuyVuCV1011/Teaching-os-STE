'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'

const PROJECT_MEDIA_BUCKETS = new Set(['thumbnails', 'files'])

type FlowNode = {
  id: string
  type?: string
  label?: string
  description?: string
  icon?: string
  position?: { x: number; y: number }
}

type FlowEdge = {
  id?: string
  source: string
  target: string
  type?: string
  label?: unknown
  markerEnd?: unknown
  style?: unknown
}

type ProjectPayload = {
  id?: string
  title: string
  description: string
  thumbnails: string[]
  files: string[]
  icons: string[]
  flow_diagram: {
    nodes: FlowNode[]
    edges: FlowEdge[]
  }
  product_option: string | null
  iframe_link: string | null
  youtube_link: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

function assertValidProjectMediaBucket(bucket: string) {
  if (!PROJECT_MEDIA_BUCKETS.has(bucket)) {
    throw new Error('Invalid project media bucket')
  }
}

function sanitizeStorageFileName(fileName: string) {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'upload'
}

function getProjectStoragePathFromUrl(url: string) {
  try {
    const urlObj = new URL(url)
    const marker = '/storage/v1/object/public/'
    const markerIndex = urlObj.pathname.indexOf(marker)
    if (markerIndex === -1) {
      return null
    }

    const bucketAndPath = urlObj.pathname.slice(markerIndex + marker.length)
    const slashIndex = bucketAndPath.indexOf('/')
    if (slashIndex === -1) {
      return null
    }

    return decodeURIComponent(bucketAndPath.slice(slashIndex + 1))
  } catch {
    return null
  }
}

export async function listAdminProjectsAction() {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    const { data, error } = await supabase
      .from('projects')
      .select('*')

    if (error) {
      throw error
    }

    return { success: true, projects: data || [] }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), projects: [] }
  }
}

export async function getAdminProjectAction(projectId: string) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (error) {
      throw error
    }

    return { success: true, project: data }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), project: null }
  }
}

export async function uploadProjectMediaAction(bucket: string, projectId: string, formData: FormData) {
  try {
    await requireAdminUser()
    assertValidProjectMediaBucket(bucket)

    const files = formData.getAll('files').filter((item): item is File => item instanceof File)
    if (files.length > 2) {
      throw new Error('Only up to 2 files can be uploaded at once')
    }

    const supabase = getSupabaseServer(true)
    const urls: string[] = []

    for (const file of files) {
      if (bucket === 'thumbnails' && !file.type.startsWith('image/')) {
        throw new Error('Thumbnail uploads must be images')
      }

      if (bucket === 'files' && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Project file uploads must be PDFs')
      }

      if (file.size > 100 * 1024 * 1024) {
        throw new Error('File size exceeds the 100MB limit')
      }

      const fileName = `${projectId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeStorageFileName(file.name)}`
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false, contentType: file.type || undefined })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
      urls.push(publicUrlData.publicUrl)
    }

    return { success: true, urls }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), urls: [] }
  }
}

export async function deleteProjectMediaAction(bucket: string, urls: string[]) {
  try {
    await requireAdminUser()
    assertValidProjectMediaBucket(bucket)

    const paths = urls
      .map(getProjectStoragePathFromUrl)
      .filter((path): path is string => Boolean(path))

    if (paths.length === 0) {
      return { success: true }
    }

    const supabase = getSupabaseServer(true)
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function createProjectAction(payload: ProjectPayload) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    const { error } = await supabase.from('projects').insert([payload])
    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function updateProjectAction(projectId: string, payload: ProjectPayload) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', projectId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function deleteProjectAction(projectId: string, thumbnails: string[] | null, files: string[] | null) {
  try {
    await requireAdminUser()
    const supabase = getSupabaseServer(true)

    const thumbnailPaths = (thumbnails || [])
      .map(getProjectStoragePathFromUrl)
      .filter((path): path is string => Boolean(path))
    const filePaths = (files || [])
      .map(getProjectStoragePathFromUrl)
      .filter((path): path is string => Boolean(path))

    if (thumbnailPaths.length > 0) {
      const { error } = await supabase.storage.from('thumbnails').remove(thumbnailPaths)
      if (error) {
        throw error
      }
    }

    if (filePaths.length > 0) {
      const { error } = await supabase.storage.from('files').remove(filePaths)
      if (error) {
        throw error
      }
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}
