import { cache } from 'react'
import { projects as localProjects } from '@/data'
import { getSupabaseServer } from '@/lib/supabase'

export interface FlowNode {
  id: string
  type?: string
  label?: string
  description?: string
  icon?: string
  position?: { x: number; y: number }
}

export interface FlowEdge {
  id?: string
  source: string
  target: string
  type?: string
  label?: string
}

export interface Project {
  id: string
  title: string
  description: string
  thumbnails: string[]
  files: string[]
  icons: string[]
  flow_diagram: { nodes: FlowNode[]; edges: FlowEdge[] } | null
  iframe_link: string | null
  youtube_link: string | null
}

export interface StudentShowcaseProject {
  id: string
  title: string
  description: string
  thumbnails: string[]
  files: string[]
  icons: string[]
  isSubmission?: boolean
  student_identifier?: string
  class_code?: string
}

export type ConsultingProject = Pick<
  Project,
  'id' | 'title' | 'description' | 'thumbnails' | 'files' | 'icons'
>

interface ShowcaseSubmissionRow {
  id: string
  student_identifier?: string | null
  submitted_text?: string | null
  submitted_files?: string[] | null
  assignments?: { title?: string | null } | null
  classes?: { class_code?: string | null } | null
}

const showcaseThumbnails = [
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
]

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeProject(project: Partial<Project> & { id: string; title: string }): Project {
  return {
    id: project.id,
    title: project.title,
    description: project.description || '',
    thumbnails: Array.isArray(project.thumbnails) ? project.thumbnails : [],
    files: Array.isArray(project.files) ? project.files : [],
    icons: Array.isArray(project.icons) ? project.icons : [],
    flow_diagram: project.flow_diagram || null,
    iframe_link: project.iframe_link || null,
    youtube_link: project.youtube_link || null,
  }
}

export function getLocalProject(id: string): Project | null {
  const localProject = localProjects.find((item) => item.id === id)
  if (!localProject) return null

  return normalizeProject({
    id: localProject.id,
    title: localProject.title,
    description: localProject.desc,
    thumbnails: localProject.thumbnails || [],
    files: localProject.files || [],
    icons: localProject.icons || [],
    flow_diagram: null,
    iframe_link: null,
    youtube_link: null,
  })
}

export const getProjectById = cache(async (id: string): Promise<Project | null> => {
  const localProject = getLocalProject(id)
  if (localProject || !uuidPattern.test(id)) return localProject

  const { data, error } = await getSupabaseServer()
    .from('projects')
    .select(
      'id,title,description,thumbnails,files,icons,flow_diagram,iframe_link,youtube_link'
    )
    .eq('id', id)
    .single()

  if (error || !data) return null

  return normalizeProject(data)
})

function anonymizeStudentIdentifier(identifier: string | null | undefined) {
  if (!identifier) return 'Student'

  const [localPart, domain] = identifier.split('@')
  if (!localPart) return 'Student'

  const suffix = localPart.length > 4 ? localPart.slice(-2) : ''
  return `${localPart.slice(0, 2)}***${suffix}${domain ? `@${domain}` : ''}`
}

export const getStudentShowcaseProjects = cache(async (): Promise<{
  projects: StudentShowcaseProject[]
  errorMessage: string | null
}> => {
  const supabase = getSupabaseServer(true)
  const [curatedResult, submissionsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id,title,description,thumbnails,files,icons')
      .eq('product_option', 'student'),
    supabase
      .from('submissions')
      .select(
        'id,student_identifier,submitted_text,submitted_files,assignments(title),classes(class_code)'
      )
      .eq('showcase_approved', true),
  ])

  const projects: StudentShowcaseProject[] = (curatedResult.data || []).map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description || '',
    thumbnails: Array.isArray(project.thumbnails) ? project.thumbnails : [],
    files: Array.isArray(project.files) ? project.files : [],
    icons: Array.isArray(project.icons) ? project.icons : [],
  }))

  const submissionRows = (submissionsResult.data || []) as ShowcaseSubmissionRow[]

  await Promise.all(submissionRows.map(async (submission) => {
    const thumbnailIndex = Math.abs(submission.id.charCodeAt(0)) % showcaseThumbnails.length
    const submittedFiles = Array.isArray(submission.submitted_files)
      ? submission.submitted_files.filter((file): file is string => typeof file === 'string' && file.length > 0)
      : []
    const { data: signedFiles, error: signedFilesError } = submittedFiles.length > 0
      ? await supabase.storage
          .from('student-submissions')
          .createSignedUrls(submittedFiles, 3600, { download: true })
      : { data: [], error: null }

    projects.push({
      id: submission.id,
      title: submission.assignments?.title || 'Assignment Deliverable',
      description: submission.submitted_text || 'Student portfolio deliverable.',
      thumbnails: [showcaseThumbnails[thumbnailIndex]],
      files: signedFilesError
        ? []
        : (signedFiles || []).flatMap((file) => file.signedUrl ? [file.signedUrl] : []),
      icons: ['python'],
      isSubmission: true,
      student_identifier: anonymizeStudentIdentifier(submission.student_identifier),
      class_code: submission.classes?.class_code || 'STE',
    })
  }))

  return {
    projects,
    errorMessage:
      curatedResult.error || submissionsResult.error
        ? 'Không thể tải đầy đủ showcase học viên lúc này.'
        : null,
  }
})

export const getConsultingProjects = cache(async (): Promise<{
  projects: ConsultingProject[]
  errorMessage: string | null
}> => {
  const { data, error } = await getSupabaseServer()
    .from('projects')
    .select('id,title,description,thumbnails,files,icons')
    .eq('product_option', 'customer')

  const remoteProjects = (data || []).map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description || '',
    thumbnails: Array.isArray(project.thumbnails) ? project.thumbnails : [],
    files: Array.isArray(project.files) ? project.files : [],
    icons: Array.isArray(project.icons) ? project.icons : [],
  }))

  const fallbackProjects = localProjects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.desc,
    thumbnails: project.thumbnails || [],
    files: project.files || [],
    icons: project.icons || [],
  }))

  return {
    projects: remoteProjects.length > 0 ? remoteProjects : fallbackProjects,
    errorMessage: error
      ? 'Đang hiển thị bộ dự án mẫu vì dữ liệu live chưa tải được.'
      : null,
  }
})

export const getPublicProjectIds = cache(async (): Promise<string[]> => {
  const { data, error } = await getSupabaseServer()
    .from('projects')
    .select('id')

  if (error) return []
  return (data || []).flatMap((project) =>
    typeof project.id === 'string' && project.id.length > 0 ? [project.id] : [],
  )
})

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
