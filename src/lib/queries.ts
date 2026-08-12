import config from '@payload-config'
import { getPayload } from 'payload'
import type { Education, Experience, Project } from '@/payload-types'

export async function client() {
  return getPayload({ config })
}

export async function getSiteSettings() {
  const payload = await client()
  return payload.findGlobal({ slug: 'site-settings', depth: 1 })
}

export async function getAbout() {
  const payload = await client()
  return payload.findGlobal({ slug: 'about', depth: 1 })
}

export async function getSkills() {
  const payload = await client()
  return payload.findGlobal({ slug: 'skills', depth: 0 })
}

export async function getProjects(options?: { featured?: boolean; limit?: number }) {
  const payload = await client()
  const result = await payload.find({
    collection: 'projects',
    depth: 1,
    limit: options?.limit ?? 100,
    sort: 'order',
    where: {
      and: [
        { _status: { equals: 'published' } },
        ...(options?.featured ? [{ featured: { equals: true } }] : []),
      ],
    },
  })
  return result.docs as Project[]
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const payload = await client()
  const result = await payload.find({
    collection: 'projects',
    depth: 2,
    limit: 1,
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
  })
  return (result.docs[0] as Project | undefined) ?? null
}

export async function getExperience(): Promise<Experience[]> {
  const payload = await client()
  const result = await payload.find({ collection: 'experience', sort: 'order', limit: 100 })
  return result.docs as Experience[]
}

export async function getEducation(): Promise<Education[]> {
  const payload = await client()
  const result = await payload.find({ collection: 'education', sort: 'order', limit: 100 })
  return result.docs as Education[]
}
