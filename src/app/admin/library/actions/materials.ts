'use server'

import { getSupabaseServer } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/admin-auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)
const ALLOWED_ADMIN_BUCKETS = new Set([
  'teaching-materials',
  'assignment-prompts',
  'assignment-solutions',
])
const MAX_ADMIN_UPLOAD_BYTES = 100 * 1024 * 1024

export interface MaterialInput {
  lessonId: string
  title: string
  type: 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link' | 'markdown' | 'json'
  storageUrl: string
  fileHash?: string
  metadata?: Record<string, unknown>
}

type MaterialMetadata = Record<string, unknown> & {
  file_hash?: string
  viewer_artifact?: unknown
  extracted_text?: string
}

type ParserOutput = {
  error?: string
  viewer_artifact?: unknown
  extracted_text?: string
}

type SignedUrlResponse = {
  signedUrl?: string
  signedURL?: string
  publicUrl?: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Unknown error'
}

function getSafeAdminBucket(bucket: string): string {
  if (!ALLOWED_ADMIN_BUCKETS.has(bucket)) {
    throw new Error('Unsupported storage bucket')
  }
  return bucket
}

function getSafeStoragePath(storagePath: string): string {
  const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('../') || normalized.includes('/..')) {
    throw new Error('Invalid storage path')
  }
  return normalized
}

async function getAdminClient() {
  await requireAdminUser()
  return getSupabaseServer(true)
}

/**
 * Checks if a file with the given hash has already been uploaded as a canonical material.
 */
export async function checkMaterialDeduplication(fileHash: string) {
  try {
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('canonical_materials')
      .select('storage_url, title, type')
      .eq('metadata->>file_hash', fileHash)
      .limit(1)

    if (error) {
      console.error('Error querying deduplication database:', error)
      return null
    }

    if (data && data.length > 0) {
      return data[0]
    }
    return null
  } catch (error) {
    console.error('Deduplication action failure:', error)
    return null
  }
}

/**
 * Registers a canonical material entry in the database.
 */
export async function registerCanonicalMaterial(input: MaterialInput) {
  let tempFilePath: string | null = null
  try {
    const supabase = await getAdminClient()
    let dbMetadata: MaterialMetadata = {
      ...(input.metadata || {}),
      file_hash: input.fileHash,
    }

    // Trigger python parser or native reader if type is docx, csv, xlsx, markdown, or json
    if (['docx', 'csv', 'xlsx', 'markdown', 'json'].includes(input.type)) {
      try {
        console.log(`Processing file parsing/reading for ${input.type}: ${input.storageUrl}`)
        const { data, error: downloadError } = await supabase.storage
          .from('teaching-materials')
          .download(input.storageUrl)
 
        if (downloadError) {
          throw new Error(`Failed to download file from Supabase storage: ${downloadError.message}`)
        }
 
        if (!data) {
          throw new Error(`No data returned from download for storage URL: ${input.storageUrl}`)
        }
 
        if (['markdown', 'json'].includes(input.type)) {
          const text = await data.text()
          if (input.type === 'markdown') {
            dbMetadata = {
              ...dbMetadata,
              viewer_artifact: {
                type: 'markdown',
                viewer_markdown: text,
                viewer_html: text
              },
              extracted_text: text
            }
          } else {
            try {
              const parsedJson = JSON.parse(text) as unknown
              dbMetadata = {
                ...dbMetadata,
                viewer_artifact: {
                  type: 'json',
                  viewer_json: parsedJson
                },
                extracted_text: text
              }
            } catch (jsonErr) {
              console.error('Failed to parse JSON content natively:', jsonErr)
              dbMetadata = {
                ...dbMetadata,
                viewer_artifact: {
                  type: 'json',
                  viewer_json: null,
                  raw_text: text
                },
                extracted_text: text
              }
            }
          }
        } else {
          // Save blob to a temporary file
          const arrayBuffer = await data.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const tempDir = path.join(process.cwd(), 'scratch')
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
          }
          tempFilePath = path.join(tempDir, `material_${Date.now()}_${path.basename(input.storageUrl)}`)
          fs.writeFileSync(tempFilePath, buffer)
 
          // Call the Python parser script
          const pythonPath = path.join(
            process.cwd(),
            process.platform === 'win32'
              ? 'rubricore-engine/.venv/Scripts/python.exe'
              : 'rubricore-engine/.venv/bin/python'
          )
          const scriptPath = path.join(process.cwd(), 'rubricore-engine/scripts/parse_material.py')
          
          console.log(`Running python script: "${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
          const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
          
          if (stderr.trim()) {
            console.warn(`Python parsing warnings/stderr: ${stderr}`)
          }
 
          const parsedOutput = JSON.parse(stdout) as ParserOutput
          if (parsedOutput.error) {
            throw new Error(`Python script error: ${parsedOutput.error}`)
          }
 
          // Merge parser results into metadata
          dbMetadata = {
            ...dbMetadata,
            viewer_artifact: parsedOutput.viewer_artifact,
            extracted_text: parsedOutput.extracted_text,
          }
        }
        console.log(`Successfully parsed/read file ${input.storageUrl} and updated metadata.`)

      } catch (err) {
        console.error(`Error in material extraction pipeline for type ${input.type}:`, err)
        throw new Error(`Material extraction pipeline failed: ${getErrorMessage(err)}`)
      } finally {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath)
          } catch (e) {
            console.error(`Failed to clean up temp file ${tempFilePath}:`, e)
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('canonical_materials')
      .insert([
        {
          lesson_id: input.lessonId,
          title: input.title,
          type: input.type,
          storage_url: input.storageUrl,
          metadata: dbMetadata,
        },
      ])
      .select()

    if (error) {
      throw new Error(`DB registration failed: ${error.message}`)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to register material:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Uploads a file to a Supabase storage bucket using the service-role client to bypass client RLS rules.
 */
export async function uploadFileToStorageAction(formData: FormData) {
  try {
    const bucket = getSafeAdminBucket(formData.get('bucket') as string)
    const filePath = getSafeStoragePath(formData.get('path') as string)
    const file = formData.get('file') as File
    const upsertStr = formData.get('upsert') as string
    const upsert = upsertStr === 'true'

    if (!bucket || !filePath || !file) {
      return { success: false, error: 'Missing bucket, path, or file in upload request' }
    }
    if (file.size <= 0 || file.size > MAX_ADMIN_UPLOAD_BYTES) {
      return { success: false, error: 'File must be between 1 byte and 100 MB' }
    }

    const supabaseAdmin = await getAdminClient()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        upsert,
        contentType: file.type || 'application/octet-stream'
      })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error(`Server storage upload to bucket failed:`, error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Deletes files from a Supabase storage bucket using the service-role client to bypass client RLS rules.
 */
export async function deleteFileFromStorageAction(bucket: string, paths: string[]) {
  try {
    const safeBucket = getSafeAdminBucket(bucket)
    const safePaths = paths.map(getSafeStoragePath)
    if (safePaths.length === 0 || safePaths.length > 100) {
      throw new Error('Storage deletion requires between 1 and 100 paths')
    }
    const supabaseAdmin = await getAdminClient()
    const { data, error } = await supabaseAdmin.storage.from(safeBucket).remove(safePaths)
    if (error) {
      throw error
    }
    return { success: true, data }
  } catch (error) {
    console.error('Server storage deletion failed:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Updates the student display mode preference for a canonical material inside its metadata.
 */
export async function updateMaterialDisplayModeAction(
  materialId: string,
  displayMode: 'both' | 'web' | 'original'
) {
  try {
    const supabaseAdmin = await getAdminClient()
    
    // 1. Fetch current metadata
    const { data: material, error: fetchErr } = await supabaseAdmin
      .from('canonical_materials')
      .select('metadata')
      .eq('id', materialId)
      .single()

    if (fetchErr || !material) {
      throw new Error(`Material not found: ${fetchErr?.message || 'Unknown error'}`)
    }

    const updatedMetadata = {
      ...(material.metadata || {}),
      display_mode: displayMode
    }

    // 2. Update metadata in database
    const { error: updateErr } = await supabaseAdmin
      .from('canonical_materials')
      .update({ metadata: updatedMetadata })
      .eq('id', materialId)

    if (updateErr) {
      throw updateErr
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to update material display mode:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Generates a signed URL for a private storage asset using the service role client.
 */
export async function getSignedUrlAction(
  bucket: string,
  storageUrl: string,
  expiresIn: number = 300
) {
  try {
    const supabaseAdmin = await getAdminClient()
    const { data, error } = await supabaseAdmin.storage
      .from(getSafeAdminBucket(bucket))
      .createSignedUrl(getSafeStoragePath(storageUrl), Math.min(Math.max(expiresIn, 30), 3600))

    if (error) {
      throw error
    }

    const signedData = data as SignedUrlResponse | null
    return { success: true, signedUrl: signedData?.signedUrl || signedData?.signedURL || signedData?.publicUrl || null }
  } catch (error) {
    console.error('Failed to generate signed URL:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Reorders materials in a single database transaction.
 */
export async function reorderMaterialsAction(
  updates: { id: string; display_order: number }[]
) {
  try {
    const supabaseAdmin = await getAdminClient()
    const { error } = await supabaseAdmin.rpc('reorder_canonical_materials', {
      updates
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to reorder materials:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Saves the selected grid layout and cell materials mapping for a lesson.
 */
export async function updateLessonLayoutAction(
  lessonId: string,
  layout: string,
  mapping: Record<number, unknown>
) {
  try {
    const supabaseAdmin = await getAdminClient()
    
    // 1. Fetch current metadata
    const { data: lesson, error: fetchErr } = await supabaseAdmin
      .from('lessons')
      .select('metadata')
      .eq('id', lessonId)
      .single()

    if (fetchErr || !lesson) {
      throw new Error(`Lesson not found: ${fetchErr?.message || 'Unknown error'}`)
    }

    const updatedMetadata = {
      ...(lesson.metadata || {}),
      grid_cell_mapping: mapping
    }

    // 2. Update lesson entry
    const { error: updateErr } = await supabaseAdmin
      .from('lessons')
      .update({
        grid_layout: layout,
        metadata: updatedMetadata
      })
      .eq('id', lessonId)

    if (updateErr) throw updateErr

    return { success: true }
  } catch (error) {
    console.error('Failed to update lesson grid layout:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function getLessonEditorDataAction(lessonId: string) {
  try {
    const supabaseAdmin = await getAdminClient()
    const normalizedLessonId = lessonId.trim()
    if (!normalizedLessonId) throw new Error('Lesson id is required')

    const [lessonResult, materialsResult, assignmentsResult] = await Promise.all([
      supabaseAdmin
        .from('lessons')
        .select('*, modules(*, courses(*, subjects(*)))')
        .eq('id', normalizedLessonId)
        .single(),
      supabaseAdmin
        .from('canonical_materials')
        .select('*')
        .eq('lesson_id', normalizedLessonId)
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .from('assignments')
        .select('*, rubric_snapshots(snapshot)')
        .eq('lesson_id', normalizedLessonId)
        .order('created_at'),
    ])

    if (lessonResult.error) throw lessonResult.error
    if (materialsResult.error) throw materialsResult.error
    if (assignmentsResult.error) throw assignmentsResult.error

    return {
      success: true as const,
      data: {
        lesson: lessonResult.data,
        materials: materialsResult.data || [],
        assignments: assignmentsResult.data || [],
      },
    }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function updateLessonContentAction(input: {
  lessonId: string
  title: string
  content: string
  downloadAllowed: boolean
  currentVersion: number
}) {
  try {
    const supabaseAdmin = await getAdminClient()
    const lessonId = input.lessonId.trim()
    const title = input.title.trim()
    if (!lessonId || !title) throw new Error('Lesson id and title are required')
    if (title.length > 255) throw new Error('Lesson title must be at most 255 characters')

    const { error } = await supabaseAdmin
      .from('lessons')
      .update({
        title,
        content: input.content,
        download_allowed: input.downloadAllowed,
        version: Math.max(1, input.currentVersion) + 1,
      })
      .eq('id', lessonId)

    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function deleteCanonicalMaterialAction(materialId: string) {
  try {
    const supabaseAdmin = await getAdminClient()
    const normalizedMaterialId = materialId.trim()
    if (!normalizedMaterialId) throw new Error('Material id is required')

    const { error } = await supabaseAdmin
      .from('canonical_materials')
      .delete()
      .eq('id', normalizedMaterialId)

    if (error) throw error
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function downloadAssignmentSolutionTextAction(storagePath: string) {
  try {
    const supabaseAdmin = await getAdminClient()
    const { data, error } = await supabaseAdmin.storage
      .from('assignment-solutions')
      .download(getSafeStoragePath(storagePath))

    if (error) throw error
    if (!data) throw new Error('Solution file was not found')
    if (data.size > 5 * 1024 * 1024) throw new Error('Solution text file is too large')

    return { success: true as const, data: await data.text() }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}
