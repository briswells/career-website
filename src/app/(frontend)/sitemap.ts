import type { MetadataRoute } from 'next'
import { getProjects } from '@/lib/queries'

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'https://brianwells.org'

// Same reasoning as the content pages: without this, the sitemap is
// generated once at build time and a later deploy would revert it to
// whatever projects existed in the build-time database, silently dropping
// any project added via the CMS since.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects()

  const staticRoutes = ['', '/projects', '/experience', '/about', '/contact'].map((route) => ({
    url: `${BASE}${route}`,
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.7,
  }))

  const projectRoutes = projects.map((project) => ({
    url: `${BASE}/projects/${project.slug}`,
    lastModified: new Date(project.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...projectRoutes]
}
