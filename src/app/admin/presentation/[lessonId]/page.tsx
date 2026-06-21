import React from 'react'
import { notFound } from 'next/navigation'
import { supabase, getSupabaseServer } from '@/lib/supabase'
import PresentationViewClient from './components/PresentationViewClient'

interface PageProps {
  params: Promise<{
    lessonId: string
  }>
}

export default async function PresentationPage({ params }: PageProps) {
  const resolvedParams = await params
  const lessonId = resolvedParams.lessonId

  // 1. Fetch Lesson details
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('*, modules(title, courses(title, slug))')
    .eq('id', lessonId)
    .single()

  if (!lessonData) {
    return notFound()
  }

  // 2. Fetch all materials linked to this lesson (no visibility filter for Teacher)
  const { data: materialsData } = await supabase
    .from('canonical_materials')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })

  // 3. Fetch assignments linked to this lesson
  const { data: assignmentsData } = await supabase
    .from('assignments')
    .select('id, title, instructions, max_score, rubrics(id, title, description, rubric_criteria(*))')
    .eq('lesson_id', lessonId)

  // 4. Generate signed URLs for private assets (valid for 1 hour for teaching)
  const supabaseAdmin = getSupabaseServer(true)
  const preparedMaterials = await Promise.all(
    (materialsData || []).map(async (m) => {
      const isCodeFile = ['code_repo', 'json', 'markdown'].includes(m.type) || 
        m.storage_url?.endsWith('.ipynb') || 
        m.storage_url?.endsWith('.py') || 
        m.storage_url?.endsWith('.sql')

      if (['pdf', 'docx', 'csv', 'xlsx'].includes(m.type) || isCodeFile) {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('teaching-materials')
            .createSignedUrl(m.storage_url, 3600)

          if (error) throw error

          return {
            ...m,
            signedUrl: data?.signedUrl || (data as any)?.signedURL || (data as any)?.publicUrl || m.storage_url,
          }
        } catch (err) {
          console.error(`Failed to generate signed URL for material ${m.id}:`, err)
          return {
            ...m,
            signedUrl: m.storage_url,
          }
        }
      }
      return m
    })
  )

  return (
    <PresentationViewClient
      lesson={lessonData}
      materials={preparedMaterials}
      assignments={assignmentsData || []}
    />
  )
}
