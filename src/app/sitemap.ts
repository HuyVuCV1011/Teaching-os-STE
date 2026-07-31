import type { MetadataRoute } from 'next'
import { projects } from '@/data'
import { getPublicProjectIds } from '@/lib/project-data'

const staticRoutes = ['', '/learn', '/projects']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const now = new Date()

  const remoteProjectIds = await getPublicProjectIds()
  const projectIds = Array.from(new Set([
    ...projects.map((project) => project.id),
    ...remoteProjectIds,
  ]))

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : 0.7,
    })),
    ...projectIds.map((projectId) => ({
      url: `${siteUrl}/projects/${projectId}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
