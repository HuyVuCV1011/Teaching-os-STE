'use server'

import { supabase } from '@/lib/supabase'

export interface MaterialInput {
  lessonId: string
  title: string
  type: 'pdf' | 'code_repo' | 'flow_diagram' | 'link'
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
  try {
    const dbMetadata = {
      ...(input.metadata || {}),
      file_hash: input.fileHash,
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
