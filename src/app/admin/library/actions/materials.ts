'use server'

import { supabase, getSupabaseServer } from '@/lib/supabase'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

export interface MaterialInput {
  lessonId: string
  title: string
  type: 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link' | 'markdown' | 'json'
  storageUrl: string
  fileHash?: string
  metadata?: Record<string, any>
}

/**
 * Checks if a file with the given hash has already been uploaded as a canonical material.
 */
export async function checkMaterialDeduplication(fileHash: string) {
  try {
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
    let dbMetadata = {
      ...(input.metadata || {}),
      file_hash: input.fileHash,
    }

    // Trigger python parser or native reader if type is docx, csv, xlsx, markdown, or json
    if (['docx', 'csv', 'xlsx', 'markdown', 'json'].includes(input.type)) {
      try {
        console.log(`Processing file parsing/reading for ${input.type}: ${input.storageUrl}`)
        const client = getSupabaseServer(true)
        const { data, error: downloadError } = await client.storage
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
              const parsedJson = JSON.parse(text)
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
          const pythonPath = path.join(process.cwd(), 'rubricore-engine/.venv/bin/python')
          const scriptPath = path.join(process.cwd(), 'rubricore-engine/scripts/parse_material.py')
          
          console.log(`Running python script: "${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
          const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${tempFilePath}"`)
          
          if (stderr.trim()) {
            console.warn(`Python parsing warnings/stderr: ${stderr}`)
          }
 
          const parsedOutput = JSON.parse(stdout)
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

      } catch (err: any) {
        console.error(`Error in material extraction pipeline for type ${input.type}:`, err)
        throw new Error(`Material extraction pipeline failed: ${err.message}`)
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
  } catch (error: any) {
    console.error('Failed to register material:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Uploads a file to a Supabase storage bucket using the service-role client to bypass client RLS rules.
 */
export async function uploadFileToStorageAction(formData: FormData) {
  try {
    const bucket = formData.get('bucket') as string
    const filePath = formData.get('path') as string
    const file = formData.get('file') as File
    const upsertStr = formData.get('upsert') as string
    const upsert = upsertStr === 'true'

    if (!bucket || !filePath || !file) {
      return { success: false, error: 'Missing bucket, path, or file in upload request' }
    }

    const supabaseAdmin = getSupabaseServer(true)
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
  } catch (error: any) {
    console.error(`Server storage upload to bucket failed:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Deletes files from a Supabase storage bucket using the service-role client to bypass client RLS rules.
 */
export async function deleteFileFromStorageAction(bucket: string, paths: string[]) {
  try {
    const supabaseAdmin = getSupabaseServer(true)
    const { data, error } = await supabaseAdmin.storage.from(bucket).remove(paths)
    if (error) {
      throw error
    }
    return { success: true, data }
  } catch (error: any) {
    console.error('Server storage deletion failed:', error)
    return { success: false, error: error.message }
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
    const supabaseAdmin = getSupabaseServer(true)
    
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
  } catch (error: any) {
    console.error('Failed to update material display mode:', error)
    return { success: false, error: error.message }
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
    const supabaseAdmin = getSupabaseServer(true)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(storageUrl, expiresIn)

    if (error) {
      throw error
    }

    return { success: true, signedUrl: data?.signedURL || data?.publicUrl }
  } catch (error: any) {
    console.error('Failed to generate signed URL:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reorders materials in a single database transaction.
 */
export async function reorderMaterialsAction(
  updates: { id: string; display_order: number }[]
) {
  try {
    const supabaseAdmin = getSupabaseServer(true)
    const { error } = await supabaseAdmin.rpc('reorder_canonical_materials', {
      updates
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to reorder materials:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Saves the selected grid layout and cell materials mapping for a lesson.
 */
export async function updateLessonLayoutAction(
  lessonId: string,
  layout: string,
  mapping: Record<number, any>
) {
  try {
    const supabaseAdmin = getSupabaseServer(true)
    
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
  } catch (error: any) {
    console.error('Failed to update lesson grid layout:', error)
    return { success: false, error: error.message }
  }
}
