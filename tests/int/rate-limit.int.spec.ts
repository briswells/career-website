import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { RATE_LIMIT_MAX, isRateLimited } from '@/lib/rate-limit'

let payload: Payload
const ipHash = 'a'.repeat(64)

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(async () => {
  await payload.delete({
    collection: 'contact-submissions',
    where: { ipHash: { equals: ipHash } },
  })
})

async function submit(submittedAt: Date) {
  await payload.create({
    collection: 'contact-submissions',
    data: {
      name: 'Test',
      email: 'test@example.com',
      message: 'A message long enough to pass validation.',
      ipHash,
      submittedAt: submittedAt.toISOString(),
    },
  })
}

describe('isRateLimited', () => {
  const now = new Date('2026-08-11T12:00:00.000Z')

  it('allows the first submission', async () => {
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })

  it(`allows up to ${RATE_LIMIT_MAX - 1} prior submissions in the window`, async () => {
    await submit(new Date('2026-08-11T11:50:00.000Z'))
    await submit(new Date('2026-08-11T11:55:00.000Z'))
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })

  it(`blocks once ${RATE_LIMIT_MAX} submissions are in the window`, async () => {
    await submit(new Date('2026-08-11T11:30:00.000Z'))
    await submit(new Date('2026-08-11T11:40:00.000Z'))
    await submit(new Date('2026-08-11T11:50:00.000Z'))
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(true)
  })

  it('ignores submissions older than the window', async () => {
    await submit(new Date('2026-08-11T10:00:00.000Z'))
    await submit(new Date('2026-08-11T10:10:00.000Z'))
    await submit(new Date('2026-08-11T10:20:00.000Z'))
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })

  it('does not count another IP toward this one', async () => {
    await payload.create({
      collection: 'contact-submissions',
      data: {
        name: 'Other',
        email: 'other@example.com',
        message: 'A message long enough to pass validation.',
        ipHash: 'b'.repeat(64),
        submittedAt: new Date('2026-08-11T11:50:00.000Z').toISOString(),
      },
    })
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })
})
