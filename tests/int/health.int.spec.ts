import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns 200 with status ok when the database is reachable', async () => {
    await getPayload({ config })
    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
