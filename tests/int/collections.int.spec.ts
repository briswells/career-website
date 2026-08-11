import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'
import type { RequiredDataFromCollectionSlug } from 'payload'

// The experience/education `afterChange`/`afterDelete` hooks call
// `revalidatePath`, which requires an active Next.js request context. The
// local API in these tests runs outside that lifecycle, so revalidation is
// disabled the same way `context.disableRevalidate` is designed to be used
// (see src/lib/revalidate.ts and tests/unit/revalidate.test.ts).
const disableRevalidate = { disableRevalidate: true }

describe('experience collection', () => {
  it('round-trips every field through the local API, preserving bullet order', async () => {
    const payload = await getPayload({ config })

    const data: RequiredDataFromCollectionSlug<'experience'> = {
      company: 'Acme Corp',
      role: 'Senior Engineer',
      location: 'Remote',
      startDate: '2020-01-01T00:00:00.000Z',
      current: false,
      endDate: '2022-06-01T00:00:00.000Z',
      bullets: [{ text: 'Shipped the thing' }, { text: 'Fixed the other thing' }],
      order: 3,
    }

    const doc = await payload.create({ collection: 'experience', data, context: disableRevalidate })

    try {
      const found = await payload.findByID({ collection: 'experience', id: doc.id })

      expect(found.company).toBe('Acme Corp')
      expect(found.role).toBe('Senior Engineer')
      expect(found.location).toBe('Remote')
      expect(found.startDate).toBe('2020-01-01T00:00:00.000Z')
      expect(found.current).toBe(false)
      expect(found.endDate).toBe('2022-06-01T00:00:00.000Z')
      expect(found.bullets?.map((bullet) => bullet.text)).toEqual([
        'Shipped the thing',
        'Fixed the other thing',
      ])
      expect(found.order).toBe(3)
    } finally {
      await payload.delete({ collection: 'experience', id: doc.id, context: disableRevalidate })
    }
  })

  it('nulls a stale endDate when current is true, so it cannot resurface later', async () => {
    const payload = await getPayload({ config })

    const doc = await payload.create({
      collection: 'experience',
      data: {
        company: 'Acme Corp',
        role: 'Staff Engineer',
        startDate: '2023-01-01T00:00:00.000Z',
        current: true,
        endDate: '2024-01-01T00:00:00.000Z',
      },
      context: disableRevalidate,
    })

    try {
      const found = await payload.findByID({ collection: 'experience', id: doc.id })
      expect(found.current).toBe(true)
      expect(found.endDate).toBeNull()
    } finally {
      await payload.delete({ collection: 'experience', id: doc.id, context: disableRevalidate })
    }
  })
})

describe('education collection', () => {
  it('round-trips every field through the local API', async () => {
    const payload = await getPayload({ config })

    const data: RequiredDataFromCollectionSlug<'education'> = {
      school: 'State University',
      degree: 'B.S. Computer Science',
      date: '2015-05-01T00:00:00.000Z',
      order: 1,
    }

    const doc = await payload.create({ collection: 'education', data, context: disableRevalidate })

    try {
      const found = await payload.findByID({ collection: 'education', id: doc.id })

      expect(found.school).toBe('State University')
      expect(found.degree).toBe('B.S. Computer Science')
      expect(found.date).toBe('2015-05-01T00:00:00.000Z')
      expect(found.order).toBe(1)
    } finally {
      await payload.delete({ collection: 'education', id: doc.id, context: disableRevalidate })
    }
  })
})
