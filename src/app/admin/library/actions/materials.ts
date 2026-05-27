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
  type: 'pdf' | 'docx' | 'csv' | 'xlsx' | 'code_repo' | 'flow_diagram' | 'link'
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

    // Trigger python parser if type is docx, csv, or xlsx
    if (['docx', 'csv', 'xlsx'].includes(input.type)) {
      try {
        console.log(`Processing file parsing for ${input.type}: ${input.storageUrl}`)
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
        console.log(`Successfully parsed file ${input.storageUrl} and updated metadata.`)

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

