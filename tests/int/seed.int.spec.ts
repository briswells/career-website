import { beforeAll, describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { seed } from '../../scripts/seed'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('seed', () => {
  it('creates the expected content on first run', async () => {
    await seed(payload)
    const projects = await payload.count({ collection: 'projects' })
    const experience = await payload.count({ collection: 'experience' })
    const education = await payload.count({ collection: 'education' })
    expect(projects.totalDocs).toBe(4)
    expect(experience.totalDocs).toBe(3)
    expect(education.totalDocs).toBe(2)
  })

  it('does not duplicate records when run again', async () => {
    await seed(payload)
    await seed(payload)
    const projects = await payload.count({ collection: 'projects' })
    const experience = await payload.count({ collection: 'experience' })
    const education = await payload.count({ collection: 'education' })
    expect(projects.totalDocs).toBe(4)
    expect(experience.totalDocs).toBe(3)
    expect(education.totalDocs).toBe(2)
  })

  it('populates the skills global with the five resume groupings', async () => {
    await seed(payload)
    const skills = await payload.findGlobal({ slug: 'skills' })
    expect(skills.groups?.map((g) => g.category)).toEqual([
      'Languages',
      'Datastores',
      'Web Frameworks',
      'Infrastructure & Cloud',
      'CI/CD',
    ])
  })
})
