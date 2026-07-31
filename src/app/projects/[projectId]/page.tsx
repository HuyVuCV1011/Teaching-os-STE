import type { Metadata } from 'next'
import { getProjectById, stripHtml } from '@/lib/project-data'
import ProjectDetailClient from './components/ProjectDetailClient'

type ProjectPageProps = {
  params: Promise<{ projectId: string }>
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params
  const project = await getProjectById(projectId)

  if (!project) {
    return {
      title: 'Không tìm thấy dự án',
      description: 'Dự án không tồn tại hoặc chưa được xuất bản trên showcase.',
      robots: { index: false, follow: true },
    }
  }

  const description =
    stripHtml(project.description).slice(0, 155) ||
    'Case study dữ liệu, giáo dục và hệ thống vận hành của STE Workspace.'
  const image = project.thumbnails[0]

  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${projectId}` },
    openGraph: {
      title: project.title,
      description,
      type: 'article',
      images: image ? [{ url: image, alt: project.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function ProjectIdPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  const project = await getProjectById(projectId)

  return <ProjectDetailClient project={project} />
}
